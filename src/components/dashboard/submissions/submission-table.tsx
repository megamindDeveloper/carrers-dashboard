
'use client';
import React, { useEffect, useMemo, useState } from 'react';
import type { AssessmentSubmission } from '@/lib/types';
import { DataTable } from '@/components/dashboard/data-table';
import { getColumns } from './columns';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '@/app/utils/firebase/firebaseConfig';
import { useToast } from '@/hooks/use-toast';
import { SubmissionDetailsModal } from './submission-details-modal';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';


interface SubmissionTableProps {
  assessmentId: string;
}

export function SubmissionTable({ assessmentId }: SubmissionTableProps) {
  const [data, setData] = useState<AssessmentSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubmission, setSelectedSubmission] = useState<AssessmentSubmission | null>(null);
  const { toast } = useToast();
  
  useEffect(() => {
    if (!assessmentId) return;

    const submissionsQuery = query(
      collection(db, 'assessmentSubmissions'),
      where('assessmentId', '==', assessmentId)
    );

    const unsub = onSnapshot(
      submissionsQuery,
      snapshot => {
        const submissions = snapshot.docs.map(d => ({
          id: d.id,
          ...(d.data() as Omit<AssessmentSubmission, 'id'>),
        })).sort((a, b) => (b.submittedAt?.toDate() ?? 0) - (a.submittedAt?.toDate() ?? 0));
        setData(submissions);
        setLoading(false);
      },
      error => {
        console.error('onSnapshot error:', error);
        setLoading(false);
         toast({
            variant: 'destructive',
            title: 'Error fetching submissions',
            description: error.message,
        });
      }
    );
    return () => unsub();
  }, [assessmentId, toast]);

  const handleRowClick = (submission: AssessmentSubmission) => {
    setSelectedSubmission(submission);
  };
  
  const handleCloseModal = () => {
      setSelectedSubmission(null);
  }

  const columns = useMemo(() => getColumns(), []);

  if (loading) return <p className="p-4">Loading submissions...</p>;

  return (
    <>
      <Card>
        <CardHeader className="flex flex-col items-stretch gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="mb-1">Submissions</CardTitle>
            <CardDescription>A list of all candidate submissions for this assessment.</CardDescription>
          </div>
          <Button onClick={() => {}} variant="outline" disabled={data.length === 0}>
              <Download className="mr-2 h-4 w-4" />
              Export to CSV
          </Button>
        </CardHeader>
        <CardContent>
          <DataTable columns={columns} data={data} onRowClick={handleRowClick} />
        </CardContent>
      </Card>
      <SubmissionDetailsModal 
        isOpen={!!selectedSubmission}
        onClose={handleCloseModal}
        submission={selectedSubmission}
      />
    </>
  );
}
