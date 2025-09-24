'use client';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { Candidate, CandidateStatus, CandidateType } from '@/lib/types';
import { CANDIDATE_STATUSES } from '@/lib/types';
import { DataTable } from './data-table';
import { getColumns } from './columns';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { collection, onSnapshot, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { db, storage } from '@/app/utils/firebase/firebaseConfig';
import { AddCandidateSheet } from './add-candidate-sheet';
import { useToast } from '@/hooks/use-toast';
import { CandidateDetailsModal } from './candidate-details-modal';
import { ConfirmationDialog } from './confirmation-dialog';
import { Button } from '../ui/button';
import { Download } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { deleteObject, ref } from 'firebase/storage';

interface CandidateTableProps {
  title: string;
  description: string;
  filterType?: CandidateType;
}

type ConfirmationState = {
  isOpen: boolean;
  title: string;
  description: string;
  onConfirm: () => void;
};

const statusOrder = CANDIDATE_STATUSES.reduce((acc, status, index) => {
  acc[status] = index;
  return acc;
}, {} as Record<CandidateStatus, number>);

const toTitleCase = (str: string) => {
  if (!str) return '';
  return str.replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase());
};

export function CandidateTable({ title, description, filterType }: CandidateTableProps) {
  const [data, setData] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const { toast } = useToast();
  const [confirmation, setConfirmation] = useState<ConfirmationState>({
    isOpen: false,
    title: '',
    description: '',
    onConfirm: () => {},
  });
  const { firebaseUser } = useAuth();


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
        
        candidates.sort((a, b) => {
          // 1. Primary Sort: Status
          const statusA = toTitleCase(a.status as string) as CandidateStatus;
          const statusB = toTitleCase(b.status as string) as CandidateStatus;
          const orderA = statusOrder[statusA] ?? 99;
          const orderB = statusOrder[statusB] ?? 99;
          if (orderA !== orderB) {
            return orderA - orderB;
          }
          
          // 2. Secondary Sort: Position (alphabetical)
          const positionCompare = a.position.localeCompare(b.position);
          if (positionCompare !== 0) {
            return positionCompare;
          }

          // 3. Tertiary Sort: Submission Date (newest first)
          const dateA = a.submittedAt?.toDate ? a.submittedAt.toDate() : new Date(0);
          const dateB = b.submittedAt?.toDate ? b.submittedAt.toDate() : new Date(0);
          return dateB.getTime() - dateA.getTime();
        });

        setData(candidates.map(c => ({
          ...c,
          type: c.type === 'intern' ? 'internship' : c.type === 'emp' ? 'full-time' : c.type,
        })));
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
  
  const handleExport = () => {
    if (data.length === 0) {
      toast({
        variant: "destructive",
        title: "No data to export",
        description: "There are no candidates in the current view.",
      });
      return;
    }
  
    const headers = [
      'ID', 'Full Name', 'Email', 'Contact Number', 'WhatsApp Number',
      'Address', 'City', 'State', 'Pincode', 'Education', 'Experience',
      'Position', 'Portfolio', 'Resume URL', 'Introduction Video', 'Status', 'Type',
      'Submitted At', 'Comments'
    ];
  
    const csvContent = [
      headers.join(','),
      ...data.map(c => [
        c.id,
        `"${c.fullName.replace(/"/g, '""')}"`,
        c.email,
        c.contactNumber,
        c.whatsappNumber,
        `"${(c.address || '').replace(/"/g, '""')}"`,
        `"${(c.city || '').trim().replace(/"/g, '""')}"`,
        `"${(c.state || '').trim().replace(/"/g, '""')}"`,
        c.pincode,
        `"${(c.education || '').replace(/"/g, '""')}"`,
        `"${(c.experience || '').replace(/"/g, '""')}"`,
        `"${c.position.replace(/"/g, '""')}"`,
        c.portfolio,
        c.resumeUrl,
        c.introductionVideoIntern,
        c.status,
        c.type,
        c.submittedAt?.toDate ? c.submittedAt.toDate().toISOString() : '',
        `"${(c.comments || '').replace(/"/g, '""')}"`
      ].join(','))
    ].join('\n');
  
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.href) {
      URL.revokeObjectURL(link.href);
    }
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.setAttribute('download', `candidates_${filterType || 'all'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  
    toast({
      title: "Export Successful",
      description: "Candidate data has been downloaded as a CSV file.",
    });
  };

  const handleDeleteCandidate = (candidateId: string, candidateName: string) => {
    const candidateToDelete = data.find(c => c.id === candidateId);
    if (!candidateToDelete) return;

    setConfirmation({
      isOpen: true,
      title: 'Are you sure?',
      description: `This will permanently delete ${candidateName}'s application. This action cannot be undone.`,
      onConfirm: async () => {
        const originalData = [...data];
        setData(prev => prev.filter(c => c.id !== candidateId));
        handleCloseModal();
        setConfirmation({ ...confirmation, isOpen: false });
  
        try {
          const idToken = await firebaseUser?.getIdToken();
          const response = await fetch('/api/candidate/delete', {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${idToken}`,
              },
              body: JSON.stringify({ id: candidateId }),
          });

          if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.message || 'Failed to delete candidate');
          }
  
          toast({
            title: 'Candidate Deleted',
            description: `${candidateName}'s application has been successfully deleted.`,
          });
        } catch (error: any) {
          setData(originalData); // revert UI
          toast({
            variant: 'destructive',
            title: 'Deletion Failed',
            description: error.message || 'An unknown error occurred.',
          });
          console.error("Error deleting candidate:", error);
        }
      },
    });
  };

  const proceedWithStatusUpdate = async (candidateId: string, updates: Partial<Candidate>) => {
      const originalData = [...data];
      const candidateToUpdate = originalData.find(c => c.id === candidateId);

      if (!candidateToUpdate) return;

      const { status, rejectionReason } = updates;
      
      // Optimistically update UI
      setData(prev => prev.map(c => (c.id === candidateId ? { ...c, ...updates } : c)));
      if (selectedCandidate && selectedCandidate.id === candidateId) {
          setSelectedCandidate(prev => prev ? {...prev, ...updates} : null);
      }

      try {
        await updateDoc(doc(db, 'applications', candidateId), updates);
        
        handleCloseModal();

        toast({
          title: "Update Successful",
          description: `${updates.fullName || candidateToUpdate.fullName}'s details have been updated.`,
        });

        if (status && status !== candidateToUpdate.status) {
            
             if (status === 'Shortlisted') {
              const response = await fetch('/api/shortlisted', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  fullName: updates.fullName || candidateToUpdate.fullName,
                  email: updates.email || candidateToUpdate.email,
                  position: updates.position || candidateToUpdate.position,
                }),
              });
              const result = await response.json();
              if (response.ok && result.success) {
                toast({
                  title: "Email Sent",
                  description: `An email has been sent to ${updates.fullName || candidateToUpdate.fullName}.`,
                });
              } else {
                 toast({
                  variant: "destructive",
                  title: "Email Failed",
                  description: result.message || `Failed to send email to ${updates.fullName || candidateToUpdate.fullName}.`,
                });
              }
            } else if (status === 'Rejected' && rejectionReason) {
               const response = await fetch('/api/rejected', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  fullName: updates.fullName || candidateToUpdate.fullName,
                  email: updates.email || candidateToUpdate.email,
                  position: updates.position || candidateToUpdate.position,
                  reason: rejectionReason,
                }),
              });
              const result = await response.json();
              if (response.ok && result.success) {
                toast({
                  title: "Rejection Email Sent",
                  description: `An email has been sent to ${updates.fullName || candidateToUpdate.fullName}.`,
                });
              } else {
                 toast({
                  variant: "destructive",
                  title: "Email Failed",
                  description: result.message || `Failed to send rejection email.`,
                });
              }
            }
             toast({
              title: "Status Updated",
              description: `${updates.fullName || candidateToUpdate.fullName}'s status is now ${status}.`,
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
          description: "Failed to update candidate details. Please try again.",
        });
        console.error('Failed to update details', err);
      }
  };


  const handleSaveChanges = useCallback(
    async (candidateId: string, updates: Partial<Candidate>) => {
      const candidateToUpdate = data.find(c => c.id === candidateId);
      if (!candidateToUpdate) return;
      
      const { status } = updates;
      
      if (status === 'Shortlisted' && status !== candidateToUpdate.status) {
        setConfirmation({
          isOpen: true,
          title: 'Are you sure you want to shortlist this candidate?',
          description: `This will send a "shortlisted" email to ${updates.fullName || candidateToUpdate.fullName}. Do you want to proceed?`,
          onConfirm: () => {
            proceedWithStatusUpdate(candidateId, updates);
            setConfirmation({ ...confirmation, isOpen: false });
          },
        });
        return;
      }

      await proceedWithStatusUpdate(candidateId, updates);
    },
    [data, toast]
  );
  
  const handleStatusChangeFromDropdown = (candidateId: string, status: CandidateStatus) => {
    const candidate = data.find(c => c.id === candidateId);
    if (!candidate) return;

    if (status === 'Rejected') {
      // If 'Rejected' is selected from dropdown, open modal to get reason
      setSelectedCandidate(candidate);
    } else {
      // For other statuses, update directly (or show confirmation)
      handleSaveChanges(candidateId, { status });
    }
  }


  const columns = useMemo(
    () => getColumns({ onStatusChange: handleStatusChangeFromDropdown, filterType, onDelete: handleDeleteCandidate }),
    [handleStatusChangeFromDropdown, filterType, handleDeleteCandidate]
  );

  if (loading) return <p className="p-4">Loading candidates...</p>;

  return (
    <>
      <Card>
        <CardHeader className="flex flex-col items-stretch gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button variant="outline" onClick={handleExport} className="w-full sm:w-auto">
              <Download className="mr-2 h-4 w-4" />
              Export to CSV
            </Button>
            <AddCandidateSheet />
          </div>
        </CardHeader>
        <CardContent>
          <DataTable columns={columns} data={data} onRowClick={handleRowClick} filterType={filterType}/>
        </CardContent>
      </Card>
      <CandidateDetailsModal
        isOpen={!!selectedCandidate}
        onClose={handleCloseModal}
        candidate={selectedCandidate}
        onSaveChanges={handleSaveChanges}
        onDelete={handleDeleteCandidate}
      />
      <ConfirmationDialog
        isOpen={confirmation.isOpen}
        onOpenChange={(isOpen) => setConfirmation({ ...confirmation, isOpen })}
        title={confirmation.title}
        description={confirmation.description}
        onConfirm={confirmation.onConfirm}
        onCancel={() => setConfirmation({ ...confirmation, isOpen: false })}
      />
    </>
  );
}
