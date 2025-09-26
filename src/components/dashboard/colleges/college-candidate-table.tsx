
'use client';
import React, { useEffect, useMemo, useState } from 'react';
import Papa from 'papaparse';
import type { Assessment, CollegeCandidate, AssessmentSubmission } from '@/lib/types';
import { DataTable } from '@/components/dashboard/data-table';
import { getCandidateColumns } from './candidate-columns';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { collection, onSnapshot, writeBatch, serverTimestamp, doc, getDocs, query, where, updateDoc } from 'firebase/firestore';
import { db } from '@/app/utils/firebase/firebaseConfig';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Upload, Send } from 'lucide-react';
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


interface CollegeCandidateTableProps {
  collegeId: string;
}

export function CollegeCandidateTable({ collegeId }: CollegeCandidateTableProps) {
  const [data, setData] = useState<CollegeCandidate[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<AssessmentSubmission | null>(null);
  const [isSendAssessmentDialogOpen, setSendAssessmentDialogOpen] = useState(false);
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
        const submissionsMap = new Map(submissions.map(s => [s.collegeCandidateId, s]));
        
        // Match submissions to candidates
        const candidatesWithSubmissions = candidatesData.map(candidate => ({
            ...candidate,
            submission: submissionsMap.get(candidate.id) || null
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
      if (row[key]) {
        return row[key];
      }
    }
    return undefined;
  };


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
                full: ['full name', 'name'],
            };
            const emailKeys = ['email', 'email address', 'personal email'];

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

  const handleOpenSendDialog = () => {
    if (!selectedAssessmentId) {
        toast({ variant: 'destructive', title: 'No Assessment Selected', description: 'Please select an assessment to send.' });
        return;
    }
    const candidatesToSend = data.filter(c => !c.submission);
    if (candidatesToSend.length === 0) {
        toast({ title: 'All Candidates Have Submitted', description: 'There are no pending submissions for this assessment.' });
        return;
    }
    setSendAssessmentDialogOpen(true);
  }

  const handleSendAssessment = async ({ subject, body }: { subject: string, body: string }) => {
    
    const candidatesToSend = data.filter(c => !c.submission);
    const selectedAssessment = assessments.find(a => a.id === selectedAssessmentId);
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


  const columns = useMemo(() => getCandidateColumns({ onViewSubmission: (sub) => setSelectedSubmission(sub) }), []);
  const candidatesToReceive = useMemo(() => data.filter(c => !c.submission).length, [data]);

  if (loading) return <p className="p-4">Loading candidates...</p>;

  return (
    <>
      <Card>
        <CardHeader className="flex flex-col items-stretch gap-4 md:flex-row md:items-center md:justify-between">
            <div>
                <CardTitle>Imported Candidates</CardTitle>
                <CardDescription>A list of all candidates imported for this college.</CardDescription>
            </div>
            <div className="flex gap-2">
                <Button asChild className="w-full sm:w-auto">
                    <label htmlFor="csv-upload">
                        {isUploading ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <Upload className="mr-2 h-4 w-4" />
                        )}
                        {isUploading ? 'Importing...' : 'Import from CSV'}
                    </label>
                </Button>
                <Input 
                    id="csv-upload" 
                    type="file" 
                    accept=".csv" 
                    className="hidden"
                    onChange={handleFileUpload}
                    disabled={isUploading}
                />
            </div>
        </CardHeader>
        <CardContent>
            {data.length > 0 && (
                 <Card className="mb-6 bg-muted/40">
                    <CardHeader>
                        <CardTitle>Send Assessment</CardTitle>
                        <CardDescription>Select an assessment and send it to all candidates who haven't submitted yet.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col sm:flex-row gap-4">
                       <Select value={selectedAssessmentId} onValueChange={setSelectedAssessmentId}>
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
                        <Button onClick={handleOpenSendDialog} disabled={isSending || !selectedAssessmentId || candidatesToReceive === 0}>
                            <Send className="mr-2 h-4 w-4" />
                            {`Send to ${candidatesToReceive} Candidates`}
                        </Button>
                    </CardContent>
                </Card>
            )}
          <DataTable columns={columns} data={data} onRowClick={() => {}} />
        </CardContent>
      </Card>
      <SubmissionDetailsModal
        isOpen={!!selectedSubmission}
        onClose={() => setSelectedSubmission(null)}
        submission={selectedSubmission}
      />
      <SendAssessmentDialog
        isOpen={isSendAssessmentDialogOpen}
        onClose={() => setSendAssessmentDialogOpen(false)}
        onSend={handleSendAssessment}
        isSending={isSending}
        assessment={assessments.find(a => a.id === selectedAssessmentId)}
      />
    </>
  );
}
