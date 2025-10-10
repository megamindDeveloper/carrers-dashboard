

'use client';
import React, { useEffect, useMemo, useState } from 'react';
import Papa from 'papaparse';
import type { Assessment, CollegeCandidate, AssessmentSubmission } from '@/lib/types';
import { DataTable } from '@/components/dashboard/data-table';
import { getCandidateColumns } from './candidate-columns';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { collection, onSnapshot, writeBatch, serverTimestamp, doc, getDocs, query, where, updateDoc, addDoc } from 'firebase/firestore';
import { db } from '@/app/utils/firebase/firebaseConfig';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Upload, Send, PlusCircle, Download } from 'lucide-react';
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
  const [isAddSheetOpen, setAddSheetOpen] = useState(false);
  const [isExportDialogOpen, setExportDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'submitted' | 'not-submitted'>('all');
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
    const candidatesToSend = data.filter(c => !c.submissions?.some(s => s.assessmentId === selectedAssessmentId));
    if (candidatesToSend.length === 0) {
        toast({ title: 'All Candidates Have Submitted', description: 'There are no pending submissions for this assessment.' });
        return;
    }
    setSendAssessmentDialogOpen(true);
  }

  const handleSendAssessment = async ({ subject, body, buttonText }: { subject: string, body: string, buttonText: string }) => {
    
    const candidatesToSend = data.filter(c => !c.submissions?.some(s => s.assessmentId === selectedAssessmentId));
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
            importedAt: serverTimestamp(),
        });
        toast({ title: 'Candidate Added', description: `${candidate.name} has been added successfully.` });
        setAddSheetOpen(false);
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Save Failed', description: error.message || 'Could not save the candidate.' });
        throw error;
    }
  };


  const columns = useMemo(() => getCandidateColumns({ 
    onViewSubmission: (sub) => setSelectedSubmission(sub),
    selectedAssessmentId,
  }), [selectedAssessmentId]);

  const assessmentStats = useMemo(() => {
    if (!selectedAssessmentId) return null;
    const selectedAssessment = assessments.find(a => a.id === selectedAssessmentId);
    if (!selectedAssessment) return null;

    const allCandidateIdsWithInvitation = new Set<string>();
    data.forEach(c => {
        // Assume an invite is sent if they have a submission or are pending
        allCandidateIdsWithInvitation.add(c.id);
    });

    const submittedCount = data.filter(c => c.submissions?.some(s => s.assessmentId === selectedAssessmentId)).length;
    
    return {
        assessmentTitle: selectedAssessment.title,
        totalCandidates: data.length,
        invitationsSent: data.length, // Simplified for now, can be enhanced with invitation tracking
        submissionsReceived: submittedCount,
    };
  }, [data, selectedAssessmentId, assessments]);

  const filteredData = useMemo(() => {
    if (!selectedAssessmentId || activeTab === 'all') {
      return data;
    }
    if (activeTab === 'submitted') {
      return data.filter(c => c.submissions?.some(s => s.assessmentId === selectedAssessmentId));
    }
    if (activeTab === 'not-submitted') {
      return data.filter(c => !c.submissions?.some(s => s.assessmentId === selectedAssessmentId));
    }
    return data;
  }, [data, selectedAssessmentId, activeTab]);

  const notSubmittedCount = assessmentStats ? assessmentStats.totalCandidates - assessmentStats.submissionsReceived : data.length;


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
                 <Button onClick={() => setAddSheetOpen(true)} variant="outline" className="w-full sm:w-auto">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Candidate
                </Button>
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
                        <CardTitle>Send Assessment & View Stats</CardTitle>
                        <CardDescription>Select an assessment to view stats and send to candidates who haven't submitted it yet.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col sm:flex-row gap-4 items-center">
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
                        <Button onClick={handleOpenSendDialog} disabled={isSending || !selectedAssessmentId || (notSubmittedCount === 0)}>
                            <Send className="mr-2 h-4 w-4" />
                            {`Send to ${notSubmittedCount} Candidates`}
                        </Button>
                         <Button onClick={() => setExportDialogOpen(true)} variant="outline" disabled={filteredData.length === 0}>
                            <Download className="mr-2 h-4 w-4" />
                            Export to CSV
                        </Button>
                    </CardContent>
                </Card>
            )}

            {assessmentStats && (
                <AssessmentStatsCard stats={assessmentStats} className="mb-6" />
            )}
            
            {selectedAssessmentId ? (
                 <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="mb-4">
                    <TabsList>
                        <TabsTrigger value="all">All Candidates ({data.length})</TabsTrigger>
                        <TabsTrigger value="submitted">Submitted ({assessmentStats?.submissionsReceived || 0})</TabsTrigger>
                        <TabsTrigger value="not-submitted">Not Submitted ({notSubmittedCount})</TabsTrigger>
                    </TabsList>
                </Tabs>
            ) : (
                 <div className="p-4 text-center text-sm text-muted-foreground bg-muted/40 rounded-md mb-4">
                    Select an assessment to filter candidates by submission status.
                </div>
            )}

          <DataTable columns={columns} data={filteredData} onRowClick={() => {}} />
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
    </>
  );
}
