'use client';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { Candidate, CandidateStatus, ApplicationType } from '@/lib/types';
import { DataTable } from './data-table';
import { getColumns } from './columns';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { collection, onSnapshot, updateDoc, doc } from 'firebase/firestore';
import { db } from '@/app/utils/firebase/firebaseConfig';
import { AddCandidateSheet } from './add-candidate-sheet';

interface CandidateTableProps {
  title: string;
  description: string;
  filterType?: ApplicationType;
}

export function CandidateTable({ title, description, filterType }: CandidateTableProps) {
  const [data, setData] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const colRef = collection(db, 'applications');
    const unsub = onSnapshot(
      colRef,
      snapshot => {
        let candidates = snapshot.docs.map(d => ({
          id: d.id,
          ...(d.data() as Omit<Candidate, 'id'>),
        }));

        if (filterType) {
          candidates = candidates.filter(c => c.applicationType === filterType);
        }

        setData(candidates);
        setLoading(false);
      },
      error => {
        console.error('onSnapshot error:', error);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [filterType]);

  const handleStatusChange = useCallback(
    async (candidateId: string, status: CandidateStatus) => {
      setData(prev => prev.map(c => (c.id === candidateId ? { ...c, status } : c)));
      try {
        await updateDoc(doc(db, 'applications', candidateId), { status });
      } catch (err) {
        console.error('Failed to update status', err);
      }
    },
    []
  );

  const columns = useMemo(
    () => getColumns({ onStatusChange: handleStatusChange }),
    [handleStatusChange]
  );

  if (loading) return <p className="p-4">Loading candidates...</p>;

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <AddCandidateSheet />
        </CardHeader>
        <CardContent>
          <DataTable columns={columns} data={data} />
        </CardContent>
      </Card>
    </>
  );
}
