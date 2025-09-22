
'use client';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { Job, JobStatus } from '@/lib/types';
import { DataTable } from '@/components/dashboard/data-table';
import { getColumns } from './columns';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { collection, onSnapshot, updateDoc, doc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/app/utils/firebase/firebaseConfig';
import { useToast } from '@/hooks/use-toast';
import { AddEditJobSheet } from './add-edit-job-sheet';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';

export function JobTable() {
  const [data, setData] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [isSheetOpen, setSheetOpen] = useState(false);
  const { toast } = useToast();

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

  const handleSaveJob = async (jobData: Omit<Job, 'id' | 'createdAt'>) => {
    try {
      if (selectedJob) {
        // Update existing job
        const response = await fetch('/api/jobs', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: selectedJob.id, ...jobData }),
        });
        if (!response.ok) throw new Error('Failed to update job');
        toast({
          title: 'Job Updated',
          description: `The job "${jobData.title}" has been updated successfully.`,
        });
      } else {
        // Add new job
        const response = await fetch('/api/jobs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(jobData),
        });
        if (!response.ok) throw new Error('Failed to create job');
        toast({
          title: 'Job Added',
          description: `The job "${jobData.title}" has been created.`,
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
    }
  };

  const columns = useMemo(() => getColumns({ onStatusChange: handleStatusChange }), [handleStatusChange]);

  if (loading) return <p className="p-4">Loading jobs...</p>;

  return (
    <>
      <Card>
        <CardHeader className="flex flex-col items-stretch gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>Job Postings</CardTitle>
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
    </>
  );
}
