'use client';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { Candidate, CandidateStatus } from '@/lib/types';
import { DataTable } from './data-table';
import { getColumns } from './columns';
import { ViewResumeModal } from './view-resume-modal';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { collection, onSnapshot, updateDoc, doc } from 'firebase/firestore';
import { db } from '@/app/utils/firebase/firebaseConfig';

export function CandidateTable() {
  const [data, setData] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewingResume, setViewingResume] = useState<string | null>(null);

  useEffect(() => {
    console.log('Subscribing to Firestore collection: applications');
    const colRef = collection(db, 'applications');
    const unsub = onSnapshot(
      colRef,
      snapshot => {
        console.log('Snapshot size:', snapshot.size);
        const candidates = snapshot.docs.map(d => ({
          id: d.id,
          ...(d.data() as Omit<Candidate, 'id'>),
        }));
        console.log('Mapped candidates:', candidates);
        setData(candidates);
        setLoading(false);
      },
      error => {
        console.error('onSnapshot error:', error);
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  const handleStatusChange = useCallback(
    async (candidateId: string, status: CandidateStatus) => {
      // optimistic UI
      setData(prev => prev.map(c => (c.id === candidateId ? { ...c, status } : c)));
      try {
        await updateDoc(doc(db, 'applications', candidateId), { status });
      } catch (err) {
        console.error('Failed to update status', err);
        // optionally refetch / revert optimistic UI
      }
    },
    []
  );

  const columns = useMemo(
    () => getColumns({ setViewingResume, onStatusChange: handleStatusChange }),
    [setViewingResume, handleStatusChange]
  );

  if (loading) return <p className="p-4">Loading candidates...</p>;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Candidate Pipeline</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable columns={columns} data={data} />
        </CardContent>
      </Card>

      <ViewResumeModal
        isOpen={!!viewingResume}
        onClose={() => setViewingResume(null)}
        resumeUrl={viewingResume}
      />
    </>
  );
}
