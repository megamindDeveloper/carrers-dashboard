
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
import { CandidateDetailsModal } from './candidate-details-modal';

interface CandidateTableProps {
  title: string;
  description: string;
  filterType?: CandidateType;
}

export function CandidateTable({ title, description, filterType }: CandidateTableProps) {
  const [data, setData] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
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
  
  const handleRowClick = (candidate: Candidate) => {
    setSelectedCandidate(candidate);
  };

  const handleCloseModal = () => {
    setSelectedCandidate(null);
  };

  const handleStatusChange = useCallback(
    async (candidateId: string, status: CandidateStatus, reason?: string) => {
      const originalData = [...data];
      const candidateToUpdate = originalData.find(c => c.id === candidateId);

      if (!candidateToUpdate) return;
      
      const updateData: { status: CandidateStatus, rejectionReason?: string } = { status };
      if (status === 'Rejected' && reason) {
        updateData.rejectionReason = reason;
      }

      // Optimistically update UI
      setData(prev => prev.map(c => (c.id === candidateId ? { ...c, ...updateData } : c)));
      if (selectedCandidate && selectedCandidate.id === candidateId) {
          setSelectedCandidate(prev => prev ? {...prev, ...updateData} : null);
      }


      try {
        await updateDoc(doc(db, 'applications', candidateId), updateData);
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
        } else if (status === 'Rejected') {
           await fetch('/api/rejected', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fullName: candidateToUpdate.fullName,
              email: candidateToUpdate.email,
              position: candidateToUpdate.position,
              reason: reason || 'Not provided',
            }),
          });
           toast({
            title: "Rejection Email Sent",
            description: `An email has been sent to ${candidateToUpdate.fullName}.`,
          });
        }
      } catch (err) {
        // Revert UI on error
        setData(originalData);
        if (selectedCandidate && selectedCandidate.id === candidateId) {
          setSelectedCandidate(candidateToUpdate);
        }
        toast({
          variant: "destructive",
          title: "Update Failed",
          description: "Failed to update candidate status. Please try again.",
        });
        console.error('Failed to update status', err);
      }
    },
    [data, toast, selectedCandidate]
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
          <DataTable columns={columns} data={data} onRowClick={handleRowClick} />
        </CardContent>
      </Card>
      <CandidateDetailsModal
        isOpen={!!selectedCandidate}
        onClose={handleCloseModal}
        candidate={selectedCandidate}
        onStatusChange={handleStatusChange}
      />
    </>
  );
}