'use client';
import React, { useEffect, useMemo, useState } from 'react';
import Papa from 'papaparse';
import type { Assessment, CollegeCandidate } from '@/lib/types';
import { DataTable } from '@/components/dashboard/data-table';
import { getCandidateColumns } from './candidate-columns';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { collection, onSnapshot, writeBatch, serverTimestamp, doc, getDocs, query } from 'firebase/firestore';
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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';


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
  const { toast } = useToast();
  
  useEffect(() => {
    if (!collegeId) return;

    const candidatesQuery = collection(db, `colleges/${collegeId}/candidates`);
    const unsubCandidates = onSnapshot(
      candidatesQuery,
      snapshot => {
        const candidates = snapshot.docs.map(d => ({
          id: d.id,
          ...(d.data() as Omit<CollegeCandidate, 'id'>),
        }));
        setData(candidates);
        setLoading(false);
      },
      error => {
        console.error('onSnapshot error:', error);
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

  const handleSendAssessment = async () => {
    if (!selectedAssessmentId) {
        toast({ variant: 'destructive', title: 'No Assessment Selected', description: 'Please select an assessment to send.' });
        return;
    }
    if (data.length === 0) {
        toast({ variant: 'destructive', title: 'No Candidates', description: 'There are no candidates to send the assessment to.' });
        return;
    }

    const selectedAssessment = assessments.find(a => a.id === selectedAssessmentId);
    if (!selectedAssessment) {
        toast({ variant: 'destructive', title: 'Error', description: 'Selected assessment could not be found.' });
        return;
    }

    setIsSending(true);
    toast({ title: 'Sending Emails...', description: `Preparing to send '${selectedAssessment.title}' to ${data.length} candidates.` });

    try {
        const response = await fetch('/api/send-assessment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                candidates: data,
                assessmentId: selectedAssessment.id,
                assessmentTitle: selectedAssessment.title,
                passcode: selectedAssessment.passcode,
            }),
        });

        const result = await response.json();

        if (response.ok) {
            toast({ title: 'Emails Sent!', description: result.message });
        } else {
            throw new Error(result.message || 'An unknown error occurred.');
        }

    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Failed to Send Emails', description: error.message });
    } finally {
        setIsSending(false);
    }
  }


  const columns = useMemo(() => getCandidateColumns(), []);

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
                        <CardDescription>Select an assessment and send it to all imported candidates below.</CardDescription>
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
                        <Button onClick={handleSendAssessment} disabled={isSending || !selectedAssessmentId}>
                            {isSending ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <Send className="mr-2 h-4 w-4" />
                            )}
                            {isSending ? 'Sending...' : `Send to ${data.length} Candidates`}
                        </Button>
                    </CardContent>
                </Card>
            )}
          <DataTable columns={columns} data={data} onRowClick={() => {}} />
        </CardContent>
      </Card>
    </>
  );
}
