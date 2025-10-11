

'use client';
import React, { useEffect, useMemo, useState } from 'react';
import type { Assessment, AssessmentSubmission } from '@/lib/types';
import { DataTable } from '@/components/dashboard/data-table';
import { getColumns } from './columns';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { collection, onSnapshot, query, where, getDoc, doc, writeBatch } from 'firebase/firestore';
import { db } from '@/app/utils/firebase/firebaseConfig';
import { useToast } from '@/hooks/use-toast';
import { SubmissionDetailsModal } from './submission-details-modal';
import { Button } from '@/components/ui/button';
import { Download, RefreshCw, Loader2 } from 'lucide-react';
import { ExportSubmissionsDialog } from './export-submissions-dialog';
import { gradeSubmission } from '@/lib/utils';


interface SubmissionTableProps {
  assessmentId: string;
}

export function SubmissionTable({ assessmentId }: SubmissionTableProps) {
  const [data, setData] = useState<AssessmentSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRegrading, setIsRegrading] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<AssessmentSubmission | null>(null);
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const { toast } = useToast();
  const [isExportDialogOpen, setExportDialogOpen] = useState(false);
  
  useEffect(() => {
    if (!assessmentId) return;

    // Fetch assessment details
    const assessmentRef = doc(db, 'assessments', assessmentId);
    const unsubAssessment = onSnapshot(assessmentRef, (docSnap) => {
        if(docSnap.exists()){
            setAssessment({ id: docSnap.id, ...docSnap.data() } as Assessment);
        }
    });


    const submissionsQuery = query(
      collection(db, 'assessmentSubmissions'),
      where('assessmentId', '==', assessmentId)
    );

    const unsubSubmissions = onSnapshot(
      submissionsQuery,
      snapshot => {
        const submissions = snapshot.docs.map(d => ({
          id: d.id,
          ...(d.data() as Omit<AssessmentSubmission, 'id'>),
        })).sort((a, b) => (b.submittedAt?.toDate() ?? 0) - (a.submittedAt?.toDate() ?? 0));
        
        setData(submissions.map(s => ({ ...s, shouldAutoGrade: assessment?.shouldAutoGrade })));

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
    return () => {
      unsubAssessment();
      unsubSubmissions();
    }
  }, [assessmentId, toast, assessment?.shouldAutoGrade]);

  const handleRowClick = (submission: AssessmentSubmission) => {
    setSelectedSubmission(submission);
  };
  
  const handleCloseModal = () => {
      setSelectedSubmission(null);
  }

  const handleSubmissionUpdate = (updatedSubmission: AssessmentSubmission) => {
    setData(prevData => prevData.map(s => s.id === updatedSubmission.id ? updatedSubmission : s));
  };


  const handleRegradeSubmissions = async () => {
      setIsRegrading(true);
      toast({ title: "Re-grading started...", description: "Recalculating scores for all submissions." });
      
      try {
        const assessmentRef = doc(db, 'assessments', assessmentId);
        const assessmentSnap = await getDoc(assessmentRef);

        if (!assessmentSnap.exists() || !assessmentSnap.data().shouldAutoGrade) {
            throw new Error("Auto-grading is not enabled for this assessment.");
        }

        const currentAssessment = { id: assessmentSnap.id, ...assessmentSnap.data() } as Assessment;
        const allQuestions = currentAssessment.sections?.flatMap(s => s.questions) || [];

        if (data.length === 0) {
            toast({ title: "No submissions to re-grade." });
            setIsRegrading(false);
            return;
        }

        const batch = writeBatch(db);
        let updatedCount = 0;

        for (const submission of data) {
            const { score, maxScore, gradedAnswers } = gradeSubmission(submission.answers, allQuestions);
            
            const submissionRef = doc(db, 'assessmentSubmissions', submission.id);
            batch.update(submissionRef, { score, maxScore, answers: gradedAnswers });
            updatedCount++;
        }
        
        await batch.commit();

        toast({
            title: "Re-Grading Complete",
            description: `Successfully recalculated scores for ${updatedCount} submissions.`
        });
      } catch (error: any) {
          console.error("Re-grading error:", error);
          toast({
              variant: "destructive",
              title: "Re-Grading Failed",
              description: error.message || "An unexpected error occurred."
          });
      } finally {
          setIsRegrading(false);
      }
  };


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
          <div className="flex gap-2">
            {assessment?.shouldAutoGrade && <Button onClick={handleRegradeSubmissions} variant="outline" disabled={isRegrading || data.length === 0}>
                {isRegrading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                Re-Grade Submissions
            </Button>}
            <Button onClick={() => setExportDialogOpen(true)} variant="outline" disabled={data.length === 0}>
                <Download className="mr-2 h-4 w-4" />
                Export to CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable columns={columns} data={data} onRowClick={handleRowClick} />
        </CardContent>
      </Card>
      <SubmissionDetailsModal 
        isOpen={!!selectedSubmission}
        onClose={handleCloseModal}
        submission={selectedSubmission ? { ...selectedSubmission, shouldAutoGrade: assessment?.shouldAutoGrade } : null}
        onUpdate={handleSubmissionUpdate}
      />
       <ExportSubmissionsDialog
        isOpen={isExportDialogOpen}
        onClose={() => setExportDialogOpen(false)}
        submissions={data}
      />
    </>
  );
}
