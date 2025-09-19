
'use client';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { Candidate, CandidateStatus, CandidateType } from '@/lib/types';
import { DataTable } from './data-table';
import { getColumns } from './columns';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { collection, onSnapshot, updateDoc, doc } from 'firebase/firestore';
import { db } from '@/app/utils/firebase/firebaseConfig';
import { AddCandidateSheet } from './add-candidate-sheet';
import { useToast } from '@/hooks/use-toast';

interface CandidateTableProps {
  title: string;
  description: string;
  filterType?: CandidateType;
}

export function CandidateTable({ title, description, filterType }: CandidateTableProps) {
  const [data, setData] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

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
          candidates = candidates.filter(c => c.type === filterType);
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
      const originalData = [...data];
      const candidateToUpdate = originalData.find(c => c.id === candidateId);

      if (!candidateToUpdate) return;

      // Optimistically update UI
      setData(prev => prev.map(c => (c.id === candidateId ? { ...c, status } : c)));

      try {
        await updateDoc(doc(db, 'applications', candidateId), { status });
        toast({
          title: "Status Updated",
          description: `${candidateToUpdate.fullName}'s status is now ${status}.`,
        });

        if (status === 'Shortlisted') {
          await fetch('/api/shortlisted', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fullName: candidateToUpdate.fullName,
              email: candidateToUpdate.email,
              position: candidateToUpdate.position,
            }),
          });
          toast({
            title: "Email Sent",
            description: `An email has been sent to ${candidateToUpdate.fullName}.`,
          });
        }
      } catch (err) {
        // Revert UI on error
        setData(originalData);
        toast({
          variant: "destructive",
          title: "Update Failed",
          description: "Failed to update candidate status. Please try again.",
        });
        console.error('Failed to update status', err);
      }
    },
    [data, toast]
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
