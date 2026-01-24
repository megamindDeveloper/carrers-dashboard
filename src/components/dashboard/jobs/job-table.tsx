
'use client';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { Job, JobStatus } from '@/lib/types';
import { DataTable } from '@/components/dashboard/data-table';
import { getColumns } from './columns';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { collection, onSnapshot, updateDoc, doc, addDoc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { db } from '@/app/utils/firebase/firebaseConfig';
import { useToast } from '@/hooks/use-toast';
import { AddEditJobSheet } from './add-edit-job-sheet';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { ConfirmationDialog } from '../confirmation-dialog';

export function JobTable() {
  const [data, setData] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [isSheetOpen, setSheetOpen] = useState(false);
  const { toast } = useToast();
  const [confirmation, setConfirmation] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    description: '',
    onConfirm: () => {},
  });

  useEffect(() => {
    const colRef = collection(db, 'jobs');
    const unsub = onSnapshot(
      colRef,
      snapshot => {
        const jobs = snapshot.docs.map(d => ({
          id: d.id,
          ...(d.data() as Omit<Job, 'id'>),
        })).sort((a, b) => (b.createdAt?.toDate() ?? 0) - (a.createdAt?.toDate() ?? 0));
        setData(jobs);
        setLoading(false);
      },
      error => {
        console.error('onSnapshot error:', error);
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  const handleRowClick = (job: Job) => {
    setSelectedJob(job);
    setSheetOpen(true);
  };

  const handleAddNew = () => {
    setSelectedJob(null);
    setSheetOpen(true);
  };

  const handleCloseSheet = () => {
    setSheetOpen(false);
    setSelectedJob(null);
  };

  const handleStatusChange = async (jobId: string, status: JobStatus) => {
    try {
      await updateDoc(doc(db, 'jobs', jobId), { status });
      toast({
        title: 'Status Updated',
        description: `Job status has been changed to ${status}.`,
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: 'Could not update job status.',
      });
    }
  };

  const handleDeleteJob = (jobId: string, position: string) => {
    setConfirmation({
        isOpen: true,
        title: `Delete "${position}"?`,
        description: "Are you sure you want to delete this job posting? This action cannot be undone.",
        onConfirm: async () => {
            try {
                await deleteDoc(doc(db, 'jobs', jobId));
                toast({
                    title: "Job Deleted",
                    description: `The job "${position}" has been successfully deleted.`,
                });
            } catch (error) {
                console.error("Error deleting job:", error);
                toast({
                    variant: 'destructive',
                    title: 'Deletion Failed',
                    description: 'Could not delete the job posting.',
                });
            } finally {
                setConfirmation({ ...confirmation, isOpen: false });
            }
        },
    });
  }

  const handleSaveJob = async (jobData: Omit<Job, 'id' | 'createdAt'>) => {
    try {
      if (selectedJob) {
        // Update existing job
        await updateDoc(doc(db, 'jobs', selectedJob.id), jobData);
        toast({
          title: 'Job Updated',
          description: `The job "${jobData.position}" has been updated successfully.`,
        });
      } else {
        // Add new job
        await addDoc(collection(db, 'jobs'), { ...jobData, createdAt: serverTimestamp() });
        toast({
          title: 'Job Added',
          description: `The job "${jobData.position}" has been created.`,
        });
      }
      handleCloseSheet();
    } catch (error) {
      console.error('Error saving job:', error);
      toast({
        variant: 'destructive',
        title: 'Save Failed',
        description: 'An error occurred while saving the job.',
      });
      // Re-throw to be caught in the sheet component
      throw error;
    }
  };

  const columns = useMemo(() => getColumns({ onStatusChange: handleStatusChange, onDelete: handleDeleteJob }), [handleStatusChange]);

  if (loading) return <p className="p-4">Loading jobs...</p>;

  return (
    <>
      <Card>
        <CardHeader className="flex flex-col items-stretch gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="mb-1">Job Postings</CardTitle>
            <CardDescription>Create, manage, and view job openings.</CardDescription>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button onClick={handleAddNew} className="w-full sm:w-auto">
              <PlusCircle className="mr-2" />
              Add Job
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable columns={columns} data={data} onRowClick={handleRowClick} />
        </CardContent>
      </Card>
      <AddEditJobSheet
        isOpen={isSheetOpen}
        onClose={handleCloseSheet}
        job={selectedJob}
        onSave={handleSaveJob}
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
