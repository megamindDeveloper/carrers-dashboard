
'use client';
import React, { useEffect, useMemo, useState } from 'react';
import Papa from 'papaparse';
import type { Assessment, CollegeCandidate, AssessmentSubmission, AssessmentQuestion, CandidateStatus } from '@/lib/types';
import { CANDIDATE_STATUSES } from '@/lib/types';
import { DataTable } from '@/components/dashboard/data-table';
import { getCandidateColumns } from './candidate-columns';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { collection, onSnapshot, writeBatch, serverTimestamp, doc, getDocs, query, where, updateDoc, addDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/app/utils/firebase/firebaseConfig';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Upload, Send, PlusCircle, Download, FileUp } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SubmissionDetailsModal } from '../submissions/submission-details-modal';
import { SendAssessmentDialog } from './send-assessment-dialog';
import { AddCollegeCandidateSheet } from './add-college-candidate-sheet';
import { AssessmentStatsCard } from './assessment-stats-card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ExportCollegeCandidatesDialog } from './export-college-candidates-dialog';
import { ConfirmationDialog } from '../confirmation-dialog';
import { ResetAssessmentDialog } from './reset-assessment-dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';


interface CollegeCandidateTableProps {
  collegeId: string;
}

const toTitleCase = (str: string) => {
  if (!str) return '';
  return str.replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase());
};

const isAnswered = (answer: any): boolean => {
    if (!answer) return false;
    if (Array.isArray(answer) && answer.length === 0) return false;
    if (typeof answer === 'string' && answer.trim() === '') return false;
    return true;
};

export function CollegeCandidateTable({ collegeId }: CollegeCandidateTableProps) {
  const [data, setData] = useState<CollegeCandidate[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<AssessmentSubmission | null>(null);
  const [isSendAssessmentDialogOpen, setSendAssessmentDialogOpen] = useState(false);
  const [sendDialogTrigger, setSendDialogTrigger] = useState<'selection' | 'status' | null>(null);
  const [isAddSheetOpen, setAddSheetOpen] = useState(false);
  const [isExportDialogOpen, setExportDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'submitted' | 'not-submitted' | 'completed'>('all');
  const [confirmation, setConfirmation] = useState<{ isOpen: boolean; title: string; description: string; onConfirm: () => void; }>({ isOpen: false, title: '', description: '', onConfirm: () => {} });
  const [rowSelection, setRowSelection] = useState({});
  const [resetDialogState, setResetDialogState] = useState<{
    isOpen: boolean;
    submission: AssessmentSubmission | null;
    candidate: CollegeCandidate | null;
  }>({ isOpen: false, submission: null, candidate: null });
  const [statusForUpload, setStatusForUpload] = useState<CandidateStatus>('Shortlisted');
  const [statusToSend, setStatusToSend] = useState<CandidateStatus | ''>('');
  const [assessmentToSendByStatus, setAssessmentToSendByStatus] = useState<string>('');

  const { toast } = useToast();
  
  useEffect(() => {
    if (!collegeId) return;

    const candidatesQuery = query(collection(db, `colleges/${collegeId}/candidates`));
    const unsubCandidates = onSnapshot(
      candidatesQuery,
      async (candidatesSnapshot) => {
        const candidatesData = candidatesSnapshot.docs.map(d => ({
          id: d.id,
          ...(d.data() as Omit<CollegeCandidate, 'id'>),
        }));

        // Fetch all submissions related to this college
        const submissionsQuery = query(collection(db, 'assessmentSubmissions'), where('collegeId', '==', collegeId));
        const submissionsSnapshot = await getDocs(submissionsQuery);
        const submissions = submissionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AssessmentSubmission));
        
        // Group submissions by candidate ID
        const submissionsByCandidate = submissions.reduce((acc, sub) => {
            if (sub.collegeCandidateId) {
                if (!acc[sub.collegeCandidateId]) {
                    acc[sub.collegeCandidateId] = [];
                }
                acc[sub.collegeCandidateId].push(sub);
            }
            return acc;
        }, {} as Record<string, AssessmentSubmission[]>);

        // Match submissions to candidates
        const candidatesWithSubmissions = candidatesData.map(candidate => ({
            ...candidate,
            status: candidate.status || 'Applied',
            submissions: submissionsByCandidate[candidate.id] || [],
        }));

        // Populate submission with candidate details if not already present
        for (const sub of submissions) {
            if (sub.collegeCandidateId && (sub.candidateName === 'N/A' || sub.candidateEmail === 'N/A')) {
                const matchingCandidate = candidatesWithSubmissions.find(c => c.id === sub.collegeCandidateId);
                if (matchingCandidate) {
                    const submissionDocRef = doc(db, 'assessmentSubmissions', sub.id);
                    await updateDoc(submissionDocRef, {
                        candidateName: matchingCandidate.name,
                        candidateEmail: matchingCandidate.email,
                    });
                }
            }
        }

        setData(candidatesWithSubmissions.sort((a, b) => (b.importedAt?.toDate() ?? 0) - (a.importedAt?.toDate() ?? 0)));
        setLoading(false);
      },
      error => {
        console.error('onSnapshot error fetching candidates:', error);
        setLoading(false);
         toast({
            variant: 'destructive',
            title: 'Error fetching candidates',
            description: error.message,
        });
      }
    );

    const assessmentsQuery = query(collection(db, 'assessments'));
    const unsubAssessments = onSnapshot(assessmentsQuery, (snapshot) => {
        const assessmentList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Assessment));
        setAssessments(assessmentList);
    });

    return () => {
        unsubCandidates();
        unsubAssessments();
    };
  }, [collegeId, toast]);
  
  const getColumnData = (row: Record<string, string>, keys: string[]): string | undefined => {
    for (const key of keys) {
        const lowerKey = key.toLowerCase();
        for (const rowKey in row) {
            if (rowKey.toLowerCase().trim() === lowerKey) {
                return row[rowKey];
            }
        }
    }
    return undefined;
};


  const handleStatusUpdateUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    toast({ title: 'Processing CSV for Status Updates...', description: 'Please wait.' });

    Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        transformHeader: header => header.trim().toLowerCase(),
        complete: async (results) => {
            const parsedData = results.data as Record<string, string>[];
            const emailKeys = ['email', 'email address', 'personal email', 'candidate email'];
            
            const emailsToUpdate = parsedData
                .map(row => getColumnData(row, emailKeys))
                .filter((email): email is string => !!email)
                .map(email => email.toLowerCase());

            if (emailsToUpdate.length === 0) {
                toast({ variant: 'destructive', title: 'Update Failed', description: 'No valid email addresses found in the CSV.' });
                setIsUploading(false);
                return;
            }

            const candidatesToUpdate = data.filter(c => emailsToUpdate.includes(c.email.toLowerCase()));

            if (candidatesToUpdate.length === 0) {
                 toast({ title: 'No Matches Found', description: 'No candidates in the current list matched the emails from the CSV.' });
                setIsUploading(false);
                return;
            }

            try {
                const batch = writeBatch(db);
                candidatesToUpdate.forEach(candidate => {
                    const docRef = doc(db, `colleges/${collegeId}/candidates`, candidate.id);
                    batch.update(docRef, { status: statusForUpload });
                });
                await batch.commit();

                toast({ title: 'Status Update Successful', description: `${candidatesToUpdate.length} candidates have been updated to "${statusForUpload}".` });

            } catch (error) {
                console.error("Error updating candidate statuses:", error);
                toast({ variant: 'destructive', title: 'Update Failed', description: 'Could not update candidate statuses in the database.' });
            } finally {
                setIsUploading(false);
                 if (event.target) {
                    event.target.value = '';
                }
            }
        },
        error: (error) => {
            console.error("CSV parsing error:", error);
            toast({ variant: 'destructive', title: 'CSV Parse Error', description: error.message });
            setIsUploading(false);
        }
    });
  }


  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    toast({ title: 'Processing CSV...', description: 'Please wait while we import the candidates.' });

    Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        transformHeader: header => header.trim().toLowerCase(),
        complete: async (results) => {
            const parsedData = results.data as Record<string, string>[];
            
            const nameKeys = {
                first: ['first name', 'firstname'],
                middle: ['middle name', 'middlename'],
                last: ['last name', 'lastname'],
                full: ['full name', 'name', 'candidate name'],
            };
            const emailKeys = ['email', 'email address', 'personal email', 'candidate email'];

            const validCandidates = parsedData.map(row => {
                const firstName = getColumnData(row, nameKeys.first);
                const middleName = getColumnData(row, nameKeys.middle);
                const lastName = getColumnData(row, nameKeys.last);
                let fullName = getColumnData(row, nameKeys.full);
                
                if (!fullName) {
                    fullName = [firstName, middleName, lastName].filter(Boolean).join(' ');
                }

                const email = getColumnData(row, emailKeys);

                if (fullName && email) {
                    return { name: fullName, email };
                }
                return null;
            }).filter((c): c is { name: string; email: string } => c !== null);


            if (validCandidates.length === 0) {
                toast({ variant: 'destructive', title: 'Import Failed', description: 'No valid rows with name and email information could be found in the CSV.' });
                setIsUploading(false);
                return;
            }

            try {
                const batch = writeBatch(db);
                const candidatesRef = collection(db, `colleges/${collegeId}/candidates`);

                validCandidates.forEach(candidate => {
                    const docRef = doc(candidatesRef);
                    batch.set(docRef, { 
                        name: candidate.name, 
                        email: candidate.email,
                        status: 'Applied',
                        importedAt: serverTimestamp(),
                    });
                });

                await batch.commit();

                toast({ title: 'Import Successful', description: `${validCandidates.length} candidates have been imported.` });

            } catch (error) {
                console.error("Error batch writing candidates:", error);
                toast({ variant: 'destructive', title: 'Import Failed', description: 'Could not save candidates to the database.' });
            } finally {
                setIsUploading(false);
                // Clear file input
                if (event.target) {
                    event.target.value = '';
                }
            }
        },
        error: (error) => {
            console.error("CSV parsing error:", error);
            toast({ variant: 'destructive', title: 'CSV Parse Error', description: error.message });
            setIsUploading(false);
        }
    });
  }

  const handleOpenSendDialog = (trigger: 'selection' | 'status') => {
    let assessmentId: string | null = null;
    let candidatesToSend: CollegeCandidate[] = [];

    if (trigger === 'selection') {
        assessmentId = selectedAssessmentId;
        const selectedIndices = Object.keys(rowSelection).map(Number);
        candidatesToSend = selectedIndices.length > 0
            ? selectedIndices.map(i => filteredData[i])
            : data.filter(c => !c.submissions?.some(s => s.assessmentId === assessmentId));
    } else if (trigger === 'status') {
        assessmentId = assessmentToSendByStatus;
        candidatesToSend = data.filter(c => c.status === statusToSend && !c.submissions?.some(s => s.assessmentId === assessmentId));
    }

    if (!assessmentId) {
        toast({ variant: 'destructive', title: 'No Assessment Selected', description: 'Please select an assessment to send.' });
        return;
    }
    
    if (candidatesToSend.length === 0) {
        toast({ title: 'No Candidates to Send To', description: 'All candidates in this group have already received or submitted this assessment.' });
        return;
    }

    setSendDialogTrigger(trigger);
    setSendAssessmentDialogOpen(true);
  }

  const handleSendAssessment = async ({ subject, body, buttonText }: { subject: string, body: string, buttonText: string }) => {
    let candidatesToSend: CollegeCandidate[] = [];
    let assessmentId: string | null = null;

    if (sendDialogTrigger === 'selection') {
        assessmentId = selectedAssessmentId;
        const selectedIndices = Object.keys(rowSelection).map(Number);
        candidatesToSend = selectedIndices.length > 0
            ? selectedIndices.map(i => filteredData[i])
            : data.filter(c => !c.submissions?.some(s => s.assessmentId === assessmentId));
    } else if (sendDialogTrigger === 'status') {
        assessmentId = assessmentToSendByStatus;
        candidatesToSend = data.filter(c => c.status === statusToSend && !c.submissions?.some(s => s.assessmentId === assessmentId));
    }
    
    const selectedAssessment = assessments.find(a => a.id === assessmentId);

    if (!selectedAssessment) {
        toast({ variant: 'destructive', title: 'Error', description: 'Selected assessment could not be found.' });
        return;
    }

    setIsSending(true);
    setSendAssessmentDialogOpen(false);
    toast({ title: 'Sending Emails...', description: `Preparing to send '${selectedAssessment.title}' to ${candidatesToSend.length} candidates.` });

    try {
        const response = await fetch('/api/send-assessment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                candidates: candidatesToSend.map(c => ({ id: c.id, name: c.name, email: c.email })),
                assessmentId: selectedAssessment.id,
                assessmentTitle: selectedAssessment.title,
                passcode: selectedAssessment.passcode || null,
                collegeId: collegeId,
                subject,
                body,
                buttonText,
                authentication: selectedAssessment.authentication,
            }),
        });

        const result = await response.json();

        if (response.ok || response.status === 207) {
            toast({ title: result.success ? 'Emails Sent!' : 'Partial Success', description: result.message });
        } else {
            throw new Error(result.message || 'An unknown error occurred.');
        }

    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Failed to Send Emails', description: error.message });
    } finally {
        setIsSending(false);
    }
  }

  const handleSaveIndividualCandidate = async (candidate: { name: string; email: string }) => {
    try {
        const docRef = await addDoc(collection(db, `colleges/${collegeId}/candidates`), {
            ...candidate,
            status: 'Applied',
            importedAt: serverTimestamp(),
        });
        toast({ title: 'Candidate Added', description: `${candidate.name} has been added successfully.` });
        setAddSheetOpen(false);
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Save Failed', description: error.message || 'Could not save the candidate.' });
        throw error;
    }
  };

  const handleDeleteCandidate = (candidateId: string, candidateName: string) => {
    setConfirmation({
      isOpen: true,
      title: `Delete ${candidateName}?`,
      description: `Are you sure you want to delete this candidate? This will also remove their assessment submissions for this college. This action cannot be undone.`,
      onConfirm: async () => {
        try {
          const batch = writeBatch(db);

          // Delete candidate document
          const candidateRef = doc(db, `colleges/${collegeId}/candidates`, candidateId);
          batch.delete(candidateRef);

          // Find and delete associated submissions for this college
          const submissionsQuery = query(
              collection(db, 'assessmentSubmissions'),
              where('collegeId', '==', collegeId),
              where('collegeCandidateId', '==', candidateId)
          );
          const submissionsSnapshot = await getDocs(submissionsQuery);
          submissionsSnapshot.forEach(subDoc => {
              batch.delete(subDoc.ref);
          });
          
          await batch.commit();

          toast({
            title: 'Candidate Deleted',
            description: `${candidateName} has been removed from this college.`,
          });
        } catch (error: any) {
          console.error("Error deleting college candidate:", error);
          toast({
            variant: 'destructive',
            title: 'Deletion Failed',
            description: error.message || 'Could not delete the candidate.',
          });
        } finally {
          setConfirmation({ ...confirmation, isOpen: false });
        }
      },
    });
  };
  
  const handleOpenResetDialog = (submission: AssessmentSubmission, candidate: CollegeCandidate) => {
     setResetDialogState({ isOpen: true, submission, candidate });
  };

 const handleResetSubmission = async ({ subject, body }: { subject: string; body: string }) => {
    const { submission, candidate } = resetDialogState;
    if (!submission || !candidate) return;

    setIsSending(true);
    setResetDialogState({ isOpen: false, submission: null, candidate: null });

    try {
        const assessmentLink = `${process.env.NEXT_PUBLIC_BASE_URL}/assessment/${submission.assessmentId}?candidateId=${candidate.id}&collegeId=${collegeId}`;

        const emailResponse = await fetch('/api/reset-assessment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                candidateName: candidate.name,
                candidateEmail: candidate.email,
                assessmentName: submission.assessmentTitle,
                assessmentLink: assessmentLink,
                subject,
                body,
            })
        });

        if (!emailResponse.ok) {
            const errorResult = await emailResponse.json();
            throw new Error(errorResult.message || 'Failed to send reset email.');
        }

        await deleteDoc(doc(db, 'assessmentSubmissions', submission.id));

        toast({
            title: 'Submission Reset & Email Sent',
            description: `${candidate.name}'s assessment submission has been reset.`,
        });
    } catch (error: any) {
        toast({
            variant: 'destructive',
            title: 'Reset Failed',
            description: error.message || 'Could not reset the submission.',
        });
    } finally {
        setIsSending(false);
    }
};

 const handleStatusChange = async (candidateId: string, status: CandidateStatus, isCollegeCandidate: boolean = true) => {
    if (!isCollegeCandidate) return;

    const candidateToUpdate = data.find(c => c.id === candidateId);
    if (!candidateToUpdate) return;
    
    if (status && status !== candidateToUpdate.status && (status === 'Shortlisted' || status === 'Rejected')) {
      const action = status === 'Shortlisted' ? 'shortlist' : 'reject';
      const emailType = status === 'Shortlisted' ? 'a "shortlisted"' : 'a "rejection"';
      
      setConfirmation({
        isOpen: true,
        title: `Are you sure you want to ${action} this candidate?`,
        description: `This will send ${emailType} email to ${candidateToUpdate.name}. This functionality is for main applications. Do you want to proceed?`,
        onConfirm: async () => {
          await proceedWithStatusUpdate(candidateId, status);
          setConfirmation({ ...confirmation, isOpen: false });
        },
      });
      return;
    }

    await proceedWithStatusUpdate(candidateId, status);
};

const proceedWithStatusUpdate = async (candidateId: string, status: CandidateStatus) => {
    try {
      await updateDoc(doc(db, `colleges/${collegeId}/candidates`, candidateId), { status });
      toast({
        title: 'Status Updated',
        description: `Candidate status has been changed to ${status}.`,
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: 'Could not update candidate status.',
      });
    }
}


  const statusCounts = useMemo(() => {
    return data.reduce((acc, candidate) => {
        const status = toTitleCase(candidate.status as string) as CandidateStatus || 'Applied';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);
  }, [data]);


  const columns = useMemo(() => getCandidateColumns({ 
    onViewSubmission: (sub) => setSelectedSubmission(sub),
    onDelete: handleDeleteCandidate,
    onResetSubmission: handleOpenResetDialog,
    onStatusChange: (id, status) => handleStatusChange(id, status, true),
    selectedAssessmentId,
  }), [selectedAssessmentId]);

  const assessmentStats = useMemo(() => {
    if (!selectedAssessmentId) return null;
    const selectedAssessment = assessments.find(a => a.id === selectedAssessmentId);
    if (!selectedAssessment) return null;

    const allCandidateIdsWithInvitation = new Set<string>();
    data.forEach(c => {
        allCandidateIdsWithInvitation.add(c.id);
    });

    const submittedCount = data.filter(c => c.submissions?.some(s => s.assessmentId === selectedAssessmentId)).length;
    
    return {
        assessmentTitle: selectedAssessment.title,
        totalCandidates: data.length,
        invitationsSent: data.length,
        submissionsReceived: submittedCount,
    };
  }, [data, selectedAssessmentId, assessments]);

  const filteredData = useMemo(() => {
    const selectedAssessment = assessments.find(a => a.id === selectedAssessmentId);

    if (!selectedAssessmentId || activeTab === 'all') {
      return data;
    }
    
    if (activeTab === 'submitted') {
      return data.filter(c => c.submissions?.some(s => s.assessmentId === selectedAssessmentId));
    }
    
    if (activeTab === 'not-submitted') {
      return data.filter(c => !c.submissions?.some(s => s.assessmentId === selectedAssessmentId));
    }
    
    if (activeTab === 'completed') {
        if (!selectedAssessment) return [];
        
        const requiredQuestions = selectedAssessment.sections?.flatMap(s => s.questions).filter(q => q.isRequired) || [];
        if (requiredQuestions.length === 0) {
            return data.filter(c => c.submissions?.some(s => s.assessmentId === selectedAssessmentId));
        }

        return data.filter(c => {
            const submission = c.submissions?.find(s => s.assessmentId === selectedAssessmentId);
            if (!submission) return false;

            return requiredQuestions.every(q => {
                const answer = submission.answers.find(a => a.questionId === q.id)?.answer;
                return isAnswered(answer);
            });
        });
    }
    
    return data;
  }, [data, selectedAssessmentId, activeTab, assessments]);

  const sendButtonText = Object.keys(rowSelection).length > 0 
    ? `Send to ${Object.keys(rowSelection).length} Selected` 
    : `Send to All Pending (${filteredData.filter(c => !c.submissions?.some(s => s.assessmentId === selectedAssessmentId)).length})`;

  const completedCount = useMemo(() => {
    if (!selectedAssessmentId) return 0;
    const selectedAssessment = assessments.find(a => a.id === selectedAssessmentId);
    if (!selectedAssessment) return 0;
    
    const requiredQuestions = selectedAssessment.sections?.flatMap(s => s.questions).filter(q => q.isRequired) || [];

    return data.filter(c => {
        const submission = c.submissions?.find(s => s.assessmentId === selectedAssessmentId);
        if (!submission) return false;
        
        if (requiredQuestions.length === 0) return true;

        return requiredQuestions.every(q => {
            const answer = submission.answers.find(a => a.questionId === q.id)?.answer;
            return isAnswered(answer);
        });
    }).length;
  }, [data, selectedAssessmentId, assessments]);

  const submissionCandidate = data.find(c => c.id === selectedSubmission?.collegeCandidateId);

  if (loading) return <p className="p-4">Loading candidates...</p>;

  return (
    <>
      <Card>
        <CardHeader className="flex flex-col items-stretch gap-4 md:flex-row md:items-center md:justify-between">
            <div>
                <CardTitle>Imported Candidates</CardTitle>
                <CardDescription>A list of all candidates imported for this college.</CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
                 <Button onClick={() => setAddSheetOpen(true)} variant="outline" className="w-full sm:w-auto">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Candidate
                </Button>
                <Button asChild className="w-full sm:w-auto">
                    <label htmlFor="csv-upload">
                        {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                        {isUploading ? 'Importing...' : 'Import from CSV'}
                    </label>
                </Button>
                <Input id="csv-upload" type="file" accept=".csv" className="hidden" onChange={handleFileUpload} disabled={isUploading} />
            </div>
        </CardHeader>
        <CardContent>
            {data.length > 0 && (
                 <>
                    <Card className="mb-6">
                        <CardHeader>
                            <CardTitle>Candidate Status Overview</CardTitle>
                            <CardDescription>Total counts for each status in this college drive.</CardDescription>
                        </CardHeader>
                        <CardContent className="flex flex-wrap gap-2">
                            <Badge variant="secondary" className="text-base py-1 px-3">
                                Total Candidates: <span className="font-bold ml-2">{data.length}</span>
                            </Badge>
                           {CANDIDATE_STATUSES.map(status => {
                                const count = statusCounts[status] || 0;
                                if (count > 0 && status !== 'Applied') {
                                    return (
                                        <Badge key={status} variant="secondary" className="text-base py-1 px-3">
                                            {status}: <span className="font-bold ml-2">{count}</span>
                                        </Badge>
                                    );
                                }
                                return null;
                           })}
                        </CardContent>
                    </Card>

                    <div className="grid md:grid-cols-2 gap-6 mb-6">
                        <Card className="bg-muted/40">
                            <CardHeader>
                                <CardTitle>Bulk Status Update</CardTitle>
                                <CardDescription>Update candidate statuses by uploading a CSV of emails.</CardDescription>
                            </CardHeader>
                            <CardContent className="flex flex-col sm:flex-row gap-4 items-end">
                                <div className="grid w-full max-w-sm items-center gap-1.5">
                                    <Label htmlFor="status-select">Select Status to Apply</Label>
                                    <Select value={statusForUpload} onValueChange={(value) => setStatusForUpload(value as CandidateStatus)}>
                                        <SelectTrigger id="status-select">
                                            <SelectValue placeholder="Select a status" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {CANDIDATE_STATUSES.map(status => (
                                                <SelectItem key={status} value={status}>
                                                    {status}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <Button asChild className="w-full sm:w-auto">
                                    <label htmlFor="csv-status-upload">
                                        {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileUp className="mr-2 h-4 w-4" />}
                                        {isUploading ? 'Updating...' : 'Upload & Update'}
                                    </label>
                                </Button>
                                <Input id="csv-status-upload" type="file" accept=".csv" className="hidden" onChange={handleStatusUpdateUpload} disabled={isUploading} />
                            </CardContent>
                        </Card>

                        <Card className="bg-muted/40">
                            <CardHeader>
                                <CardTitle>Send Assessment by Status</CardTitle>
                                <CardDescription>Send an assessment to all candidates with a specific status.</CardDescription>
                            </CardHeader>
                            <CardContent className="flex flex-col sm:flex-row gap-4 items-end">
                                <div className="grid w-full items-center gap-1.5">
                                    <Label>Select Status & Assessment</Label>
                                    <div className="flex gap-2">
                                        <Select value={statusToSend} onValueChange={(value) => setStatusToSend(value as CandidateStatus)}>
                                            <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                                            <SelectContent>
                                                {CANDIDATE_STATUSES.map(status => <SelectItem key={status} value={status}>{status}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                        <Select value={assessmentToSendByStatus} onValueChange={setAssessmentToSendByStatus}>
                                            <SelectTrigger><SelectValue placeholder="Select assessment" /></SelectTrigger>
                                            <SelectContent>
                                                {assessments.map(a => <SelectItem key={a.id} value={a.id}>{a.title}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <Button onClick={() => handleOpenSendDialog('status')} disabled={isSending || !statusToSend || !assessmentToSendByStatus} className="w-full sm:w-auto">
                                    <Send className="mr-2 h-4 w-4" />
                                    Send
                                </Button>
                            </CardContent>
                        </Card>
                    </div>

                    <Card className="mb-6 bg-muted/40">
                        <CardHeader>
                            <CardTitle>Send Assessment to Selected / Pending</CardTitle>
                            <CardDescription>Select an assessment to view stats and send to candidates. Select candidates in the table to send to a specific group, or send to all pending.</CardDescription>
                        </CardHeader>
                        <CardContent className="flex flex-col sm:flex-row gap-4 items-center">
                        <Select value={selectedAssessmentId} onValueChange={(value) => { setSelectedAssessmentId(value); setRowSelection({}); }}>
                            <SelectTrigger className="w-full sm:w-[280px]">
                                <SelectValue placeholder="Select an assessment..." />
                            </SelectTrigger>
                            <SelectContent>
                                {assessments.length > 0 ? (
                                    assessments.map(assessment => (
                                        <SelectItem key={assessment.id} value={assessment.id}>
                                            {assessment.title}
                                        </SelectItem>
                                    ))
                                ) : (
                                    <div className="p-4 text-sm text-muted-foreground">No assessments found.</div>
                                )}
                            </SelectContent>
                            </Select>
                            <Button onClick={() => handleOpenSendDialog('selection')} disabled={isSending || !selectedAssessmentId || (filteredData.filter(c => !c.submissions?.some(s => s.assessmentId === selectedAssessmentId)).length === 0 && Object.keys(rowSelection).length === 0)}>
                                <Send className="mr-2 h-4 w-4" />
                                {sendButtonText}
                            </Button>
                            <Button onClick={() => setExportDialogOpen(true)} variant="outline" disabled={filteredData.length === 0}>
                                <Download className="mr-2 h-4 w-4" />
                                Export to CSV
                            </Button>
                        </CardContent>
                    </Card>
                 </>
            )}

            {assessmentStats && (
                <AssessmentStatsCard stats={assessmentStats} className="mb-6" />
            )}
            
            {selectedAssessmentId ? (
                 <Tabs value={activeTab} onValueChange={(value) => {setActiveTab(value as any); setRowSelection({});}} className="mb-4">
                    <TabsList>
                        <TabsTrigger value="all">All Candidates ({data.length})</TabsTrigger>
                        <TabsTrigger value="submitted">Submitted ({assessmentStats?.submissionsReceived || 0})</TabsTrigger>
                        <TabsTrigger value="completed">Completed ({completedCount})</TabsTrigger>
                        <TabsTrigger value="not-submitted">Not Submitted ({assessmentStats?.totalCandidates ? assessmentStats.totalCandidates - assessmentStats.submissionsReceived : data.length})</TabsTrigger>
                    </TabsList>
                </Tabs>
            ) : (
                 <div className="p-4 text-center text-sm text-muted-foreground bg-muted/40 rounded-md mb-4">
                    Select an assessment to filter candidates by submission status.
                </div>
            )}

          <DataTable 
            columns={columns} 
            data={filteredData} 
            onRowClick={() => {}}
            rowSelection={rowSelection}
            setRowSelection={setRowSelection}
            />
        </CardContent>
      </Card>
      <SubmissionDetailsModal
        isOpen={!!selectedSubmission}
        onClose={() => setSelectedSubmission(null)}
        submission={selectedSubmission}
        candidate={submissionCandidate || null}
        onStatusChange={async (candidateId, status) => {
            await handleStatusChange(candidateId, status, true);
        }}
      />
      <SendAssessmentDialog
        isOpen={isSendAssessmentDialogOpen}
        onClose={() => setSendAssessmentDialogOpen(false)}
        onSend={handleSendAssessment}
        isSending={isSending}
        assessment={assessments.find(a => a.id === (sendDialogTrigger === 'selection' ? selectedAssessmentId : assessmentToSendByStatus))}
      />
       <ResetAssessmentDialog
        isOpen={resetDialogState.isOpen}
        onClose={() => setResetDialogState({ isOpen: false, submission: null, candidate: null })}
        isSending={isSending}
        onSend={handleResetSubmission}
        candidate={resetDialogState.candidate}
        submission={resetDialogState.submission}
      />
      <AddCollegeCandidateSheet
        isOpen={isAddSheetOpen}
        onClose={() => setAddSheetOpen(false)}
        onSave={handleSaveIndividualCandidate}
      />
       <ExportCollegeCandidatesDialog
        isOpen={isExportDialogOpen}
        onClose={() => setExportDialogOpen(false)}
        candidates={filteredData}
        selectedAssessment={assessments.find(a => a.id === selectedAssessmentId) || null}
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
