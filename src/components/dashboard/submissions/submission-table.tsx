
'use client';
import React, { useEffect, useMemo, useState } from 'react';
import type { Assessment, AssessmentSubmission, College } from '@/lib/types';
import { DataTable } from '@/components/dashboard/data-table';
import { getColumns } from './columns';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { collection, onSnapshot, query, where, getDocs, doc } from 'firebase/firestore';
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
  const [allSubmissions, setAllSubmissions] = useState<AssessmentSubmission[]>([]);
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [colleges, setColleges] = useState<College[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubmission, setSelectedSubmission] = useState<AssessmentSubmission | null>(null);
  const [isExportDialogOpen, setExportDialogOpen] = useState(false);
  const { toast } = useToast();
  
  useEffect(() => {
    if (!assessmentId) return;

    // Fetch the current assessment to get its properties like shouldAutoGrade
    const assessmentRef = doc(db, 'assessments', assessmentId);
    const unsubAssessment = onSnapshot(assessmentRef, (doc) => {
        if (doc.exists()) {
            setAssessment({ id: doc.id, ...doc.data() } as Assessment);
        }
    });

    const allSubmissionsQuery = query(collection(db, 'assessmentSubmissions'));

    const unsubSubmissions = onSnapshot(
      allSubmissionsQuery,
      async (allSubmissionsSnapshot) => {
        const allSubmissionsData = allSubmissionsSnapshot.docs.map(d => ({
          id: d.id,
          ...(d.data() as Omit<AssessmentSubmission, 'id'>),
        }));

        setAllSubmissions(allSubmissionsData);

        const currentAssessmentSubmissions = allSubmissionsData
          .filter(sub => sub.assessmentId === assessmentId)
          .sort((a, b) => (b.submittedAt?.toDate() ?? 0) - (a.submittedAt?.toDate() ?? 0));
        
        setData(currentAssessmentSubmissions);
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
        unsubAssessment();
        unsubSubmissions();
        unsubColleges();
    };
  }, [assessmentId, toast]);

  const handleRowClick = (submission: AssessmentSubmission) => {
    setSelectedSubmission({
      ...submission,
      shouldAutoGrade: assessment?.shouldAutoGrade || false,
    });
  };
  
  const handleCloseModal = () => {
      setSelectedSubmission(null);
  }
  
  const collegeCounts = useMemo(() => {
    return allSubmissions.filter(s => s.assessmentId === assessmentId).reduce((acc, sub) => {
      const collegeId = sub.collegeId || 'Direct';
      acc[collegeId] = (acc[collegeId] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [allSubmissions, assessmentId]);

  const positionMap = useMemo(() => {
    const map: { [email: string]: string } = {};
    allSubmissions.forEach(sub => {
      if (sub.candidateEmail) {
        const email = sub.candidateEmail.toLowerCase();
        if (!map[email]) {
          const positionAnswer = sub.answers.find(a => a.questionText?.toLowerCase().includes('position applying for'))?.answer;
          if (positionAnswer && typeof positionAnswer === 'string') {
            map[email] = positionAnswer;
          }
        }
      }
    });
    return map;
  }, [allSubmissions]);
  
  const positionCounts = useMemo(() => {
    return allSubmissions.filter(s => s.assessmentId === assessmentId).reduce((acc, sub) => {
      const position = positionMap[sub.candidateEmail.toLowerCase()];
      if (position) {
        acc[position] = (acc[position] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);
  }, [allSubmissions, assessmentId, positionMap]);


  const columns = useMemo(() => getColumns(colleges, positionMap), [colleges, positionMap]);

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
          <DataTable
            columns={columns}
            data={data}
            onRowClick={handleRowClick}
            colleges={colleges}
            collegeCounts={collegeCounts}
            positionCounts={positionCounts}
            allSubmissionsForFiltering={allSubmissions}
           />
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
