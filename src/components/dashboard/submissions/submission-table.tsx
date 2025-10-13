
'use client';
import React, { useEffect, useMemo, useState } from 'react';
import type { Assessment, AssessmentSubmission, College, Candidate, CollegeCandidate, CandidateStatus } from '@/lib/types';
import { DataTable } from '@/components/dashboard/data-table';
import { getColumns } from './columns';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { collection, onSnapshot, query, where, getDocs, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from '@/app/utils/firebase/firebaseConfig';
import { useToast } from '@/hooks/use-toast';
import { SubmissionDetailsModal } from './submission-details-modal';
import { ExportSubmissionsDialog } from './export-submissions-dialog';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { ConfirmationDialog } from '../confirmation-dialog';

interface SubmissionTableProps {
  assessmentId: string;
}

export function SubmissionTable({ assessmentId }: SubmissionTableProps) {
  const [data, setData] = useState<AssessmentSubmission[]>([]);
  const [allSubmissions, setAllSubmissions] = useState<AssessmentSubmission[]>([]);
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [colleges, setColleges] = useState<College[]>([]);
  const [candidates, setCandidates] = useState<(Candidate | CollegeCandidate)[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubmission, setSelectedSubmission] = useState<AssessmentSubmission | null>(null);
  const [isExportDialogOpen, setExportDialogOpen] = useState(false);
  const { toast } = useToast();
   const [confirmation, setConfirmation] = useState<{ isOpen: boolean; title: string; description: string; onConfirm: () => void; }>({ isOpen: false, title: '', description: '', onConfirm: () => {} });
  
  useEffect(() => {
    if (!assessmentId) return;

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

    const unsubColleges = onSnapshot(collection(db, 'colleges'), (snapshot) => {
        setColleges(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as College)));
    });

    const fetchAllCandidates = async () => {
        const candidatePromises = [
            getDocs(collection(db, 'applications')),
            getDocs(collection(db, 'colleges')),
        ];
        const [appSnapshot, collegesSnapshot] = await Promise.all(candidatePromises);

        const appCandidates = appSnapshot.docs.map(d => ({ ...d.data(), id: d.id } as Candidate));
        
        const collegeCandidates: CollegeCandidate[] = [];
        for (const collegeDoc of collegesSnapshot.docs) {
            const candidatesSnapshot = await getDocs(collection(db, `colleges/${collegeDoc.id}/candidates`));
            candidatesSnapshot.forEach(candidateDoc => {
                collegeCandidates.push({ id: candidateDoc.id, ...candidateDoc.data() } as CollegeCandidate);
            });
        }
        
        setCandidates([...appCandidates, ...collegeCandidates]);
    };
    
    fetchAllCandidates();


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

  const selectedCandidate = useMemo(() => {
    if (!selectedSubmission) return null;
    return candidates.find(c => {
        if (selectedSubmission.candidateId && c.id === selectedSubmission.candidateId) {
            return true;
        }
        if (selectedSubmission.collegeCandidateId && c.id === selectedSubmission.collegeCandidateId) {
            return true;
        }
        return c.email.toLowerCase() === selectedSubmission.candidateEmail.toLowerCase();
    }) || null;
  }, [selectedSubmission, candidates]);
  
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

   const handleStatusChange = async (candidateId: string, status: CandidateStatus, isCollegeCandidate: boolean) => {
    const candidateToUpdate = candidates.find(c => c.id === candidateId);
    if (!candidateToUpdate) return;
    
    const proceedWithUpdate = async () => {
        try {
            const collectionPath = isCollegeCandidate ? `colleges/${selectedSubmission?.collegeId}/candidates` : 'applications';
            const docRef = doc(db, collectionPath, candidateId);
            await updateDoc(docRef, { status });
             toast({
                title: 'Status Updated',
                description: `Candidate status has been changed to ${status}.`,
            });

             const shouldSendEmail = !isCollegeCandidate && (status === 'Shortlisted' || status === 'Rejected');

            if (shouldSendEmail) {
                const apiEndpoint = status === 'Shortlisted' ? '/api/shortlisted' : '/api/rejected';
                const candidate = candidateToUpdate as Candidate;
                const response = await fetch(apiEndpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      fullName: candidate.fullName,
                      email: candidate.email,
                      position: candidate.position,
                    }),
                });
                const result = await response.json();
                if (response.ok && result.success) {
                    toast({ title: "Email Sent", description: `An email has been sent to the candidate.` });
                } else {
                    toast({ variant: "destructive", title: "Email Failed", description: result.message });
                }
            }
        } catch (error) {
            toast({ variant: 'destructive', title: 'Update Failed', description: 'Could not update candidate status.' });
        }
    };
      if (!isCollegeCandidate && (status === 'Shortlisted' || status === 'Rejected')) {
      const action = status === 'Shortlisted' ? 'shortlist' : 'reject';
      const emailType = status === 'Shortlisted' ? 'a "shortlisted"' : 'a "rejection"';
      setConfirmation({
        isOpen: true,
        title: `Are you sure you want to ${action} this candidate?`,
        description: `This will send ${emailType} email to the candidate. Do you want to proceed?`,
        onConfirm: async () => {
          await proceedWithUpdate();
          setConfirmation({ ...confirmation, isOpen: false });
        },
      });
      return;
    }

    await proceedWithUpdate();
  };

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
        candidate={selectedCandidate}
        onUpdate={(updated) => setData(prev => prev.map(s => s.id === updated.id ? updated : s))}
        onStatusChange={handleStatusChange}
      />
      <ExportSubmissionsDialog
        isOpen={isExportDialogOpen}
        onClose={() => setExportDialogOpen(false)}
        submissions={data}
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
