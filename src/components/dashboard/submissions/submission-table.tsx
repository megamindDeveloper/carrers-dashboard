
'use client';
import React, { useEffect, useMemo, useState } from 'react';
import type { Assessment, AssessmentSubmission, College } from '@/lib/types';
import { DataTable } from '@/components/dashboard/data-table';
import { getColumns } from './columns';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { collection, onSnapshot, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/app/utils/firebase/firebaseConfig';
import { useToast } from '@/hooks/use-toast';
import { SubmissionDetailsModal } from './submission-details-modal';
import { ExportSubmissionsDialog } from './export-submissions-dialog';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

interface SubmissionTableProps {
  assessmentId: string;
}

export function SubmissionTable({ assessmentId }: SubmissionTableProps) {
  const [data, setData] = useState<AssessmentSubmission[]>([]);
  const [colleges, setColleges] = useState<College[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubmission, setSelectedSubmission] = useState<AssessmentSubmission | null>(null);
  const [isExportDialogOpen, setExportDialogOpen] = useState(false);
  const { toast } = useToast();
  
  useEffect(() => {
    if (!assessmentId) return;

    // Fetch all submissions to cross-reference for "Position Applying For"
    const allSubmissionsQuery = query(collection(db, 'assessmentSubmissions'));

    const unsubSubmissions = onSnapshot(
      allSubmissionsQuery,
      async (allSubmissionsSnapshot) => {
        const allSubmissions = allSubmissionsSnapshot.docs.map(d => ({
          id: d.id,
          ...(d.data() as Omit<AssessmentSubmission, 'id'>),
        }));

        // Filter for the current assessment's submissions
        const currentAssessmentSubmissions = allSubmissions
          .filter(sub => sub.assessmentId === assessmentId)
          .sort((a, b) => (b.submittedAt?.toDate() ?? 0) - (a.submittedAt?.toDate() ?? 0));
        
        // Group all submissions by candidate email
        const submissionsByEmail = allSubmissions.reduce((acc, sub) => {
            if (sub.candidateEmail) {
                const email = sub.candidateEmail.toLowerCase();
                if (!acc[email]) acc[email] = [];
                acc[email].push(sub);
            }
            return acc;
        }, {} as Record<string, AssessmentSubmission[]>);

        // Enhance current assessment submissions with position from ANY of their submissions
        const enhancedSubmissions = currentAssessmentSubmissions.map(sub => {
            let positionAnswer = sub.answers.find(a => a.questionText?.toLowerCase().includes('position applying for'));
            
            // If not found in the current submission, check others
            if (!positionAnswer?.answer) {
                 const candidateEmail = sub.candidateEmail.toLowerCase();
                 const allCandidateSubmissions = submissionsByEmail[candidateEmail] || [];
                 for (const otherSub of allCandidateSubmissions) {
                     const otherPositionAnswer = otherSub.answers.find(a => a.questionText?.toLowerCase().includes('position applying for'));
                     if (otherPositionAnswer?.answer) {
                         // Create a synthetic answer object to store this info
                         positionAnswer = {
                             questionId: 'synthetic-position',
                             questionText: 'Position Applying For',
                             answer: otherPositionAnswer.answer,
                         };
                         // Add it to the current submission's answers for filtering/display
                         sub.answers.push(positionAnswer);
                         break;
                     }
                 }
            }
            return sub;
        });

        setData(enhancedSubmissions);
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

    const unsubColleges = onSnapshot(collection(db, 'colleges'), snapshot => {
        setColleges(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as College)));
    });

    return () => {
        unsubSubmissions();
        unsubColleges();
    };
  }, [assessmentId, toast]);

  const handleRowClick = (submission: AssessmentSubmission) => {
    setSelectedSubmission(submission);
  };
  
  const handleCloseModal = () => {
      setSelectedSubmission(null);
  }

  const columns = useMemo(() => getColumns(colleges), [colleges]);

  if (loading) return <p className="p-4">Loading submissions...</p>;

  return (
    <>
      <Card>
        <CardHeader className="flex flex-col items-stretch gap-4 md:flex-row md:items-center md:justify-between">
            <div>
                <CardTitle>Submissions</CardTitle>
                <CardDescription>A list of all candidate submissions for this assessment.</CardDescription>
            </div>
            <Button onClick={() => setExportDialogOpen(true)} variant="outline" disabled={data.length === 0}>
                <Download className="mr-2 h-4 w-4" />
                Export to CSV
            </Button>
        </CardHeader>
        <CardContent>
          <DataTable columns={columns} data={data} onRowClick={handleRowClick} colleges={colleges} />
        </CardContent>
      </Card>
      <SubmissionDetailsModal 
        isOpen={!!selectedSubmission}
        onClose={handleCloseModal}
        submission={selectedSubmission}
        onUpdate={(updated) => setData(prev => prev.map(s => s.id === updated.id ? updated : s))}
      />
      <ExportSubmissionsDialog
        isOpen={isExportDialogOpen}
        onClose={() => setExportDialogOpen(false)}
        submissions={data}
       />
    </>
  );
}
