
'use client';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Job, JobStatus } from '@/lib/types';
import { DataTable } from '@/components/dashboard/data-table';
import { getColumns } from './columns';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { collection, onSnapshot, updateDoc, doc } from 'firebase/firestore';
import { db } from '@/app/utils/firebase/firebaseConfig';
import { useToast } from '@/hooks/use-toast';
import { AddEditJobSheet } from './add-edit-job-sheet';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import {
  createJobWithPriority,
  updateJobPriority,
  migrateExistingJobPriorities,
} from '@/lib/job-priority';


export function JobTable() {
  const [data, setData] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [isSheetOpen, setSheetOpen] = useState(false);
  const hasMigrated = useRef(false);
  const { toast } = useToast();

  useEffect(() => {
    const colRef = collection(db, 'jobs');
    const unsub = onSnapshot(
      colRef,
      async (snapshot) => {
        const jobs = snapshot.docs.map(d => ({
          id: d.id,
          ...(d.data() as Omit<Job, 'id'>),
        }));

        // One-time migration: assign priorities to jobs that don't have them
        if (!hasMigrated.current) {
          hasMigrated.current = true;
          const needsMigration = jobs.some(j => j.priority === undefined || j.priority === null);
          if (needsMigration) {
            try {
              await migrateExistingJobPriorities();
              // The onSnapshot will fire again with updated data
              return;
            } catch (error) {
              console.error('Migration failed:', error);
            }
          }
        }

        // Sort by createdAt (newest first)
        jobs.sort((a, b) => {
          const dateA = a.createdAt?.toDate?.() ?? new Date(0);
          const dateB = b.createdAt?.toDate?.() ?? new Date(0);
          return dateB.getTime() - dateA.getTime();
        });

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
        // Check if priority changed
        const priorityChanged = selectedJob.priority !== jobData.priority;

        if (priorityChanged) {
          // Use transaction-based priority update
          await updateJobPriority(selectedJob.id, jobData.priority);
        }

        // Update the rest of the fields (excluding priority if it was handled by transaction)
        const { priority, ...restData } = jobData;
        const updatePayload = priorityChanged ? restData : jobData;
        await updateDoc(doc(db, 'jobs', selectedJob.id), updatePayload);

        toast({
          title: 'Job Updated',
          description: `The job "${jobData.position}" has been updated successfully.`,
        });
      } else {
        // Create new job with priority-based insertion
        const { priority, ...restData } = jobData;
        await createJobWithPriority(restData, priority);
        toast({
          title: 'Job Added',
          description: `The job "${jobData.position}" has been created with priority ${priority}.`,
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
      throw error;
    }
  };

  const columns = useMemo(() => getColumns({ onStatusChange: handleStatusChange }), [handleStatusChange]);

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
    </>
  );
}
