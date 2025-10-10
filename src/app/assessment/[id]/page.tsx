
'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { doc, getDoc, collection, addDoc, serverTimestamp, getDocs, query, where, updateDoc } from 'firebase/firestore';
import { db, storage } from '@/app/utils/firebase/firebaseConfig';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import type { Assessment, CollegeCandidate, Candidate } from '@/lib/types';
import { Loader2, Lock, Timer, UploadCloud, CheckCircle2, AlertCircle, ArrowLeft, ArrowRight, CalendarIcon } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import mmLogo from '../../../../.idx/mmLogo.png';


const passcodeSchema = z.object({
  passcode: z.string().min(1, 'Passcode is required'),
});

const verificationSchema = z.object({
    name: z.string().min(1, 'Your name is required'),
    email: z.string().email('A valid email is required'),
});

const answersSchema = z.object({
    answers: z.array(z.object({
        questionId: z.string(),
        questionText: z.string(),
        answer: z.any().optional(),
    })),
});

type AnswersFormValues = z.infer<typeof answersSchema>;

const PasteDisabledTextarea = (props: React.ComponentProps<typeof Textarea>) => {
  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    alert("Pasting content is disabled for this assessment.");
  };

  return <Textarea onPaste={handlePaste} {...props} />;
};

type UploadState = {
  progress: number;
  status: 'idle' | 'uploading' | 'success' | 'error';
  url: string | null;
  error: string | null;
};

const FileUploadInput = ({
  questionId,
  assessmentId,
  onUploadComplete,
  label = "Upload File"
}: {
  questionId: string;
  assessmentId: string;
  onUploadComplete: (url: string) => void;
  label?: string;
}) => {
  const [uploadState, setUploadState] = useState<UploadState>({
    progress: 0,
    status: 'idle',
    url: null,
    error: null,
  });
  const [fileName, setFileName] = useState<string>('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    
    setUploadState({ progress: 0, status: 'uploading', url: null, error: null });

    const storagePath = `assessment-uploads/${assessmentId}/${questionId}-${Date.now()}-${file.name}`;

    const storageRef = ref(storage, storagePath);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on('state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setUploadState(prev => ({ ...prev, progress }));
      },
      (error) => {
        console.error("Upload error:", error);
        setUploadState({ progress: 0, status: 'error', url: null, error: error.message });
      },
      () => {
        getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
          setUploadState({ progress: 100, status: 'success', url: downloadURL, error: null });
          onUploadComplete(downloadURL);
        });
      }
    );
  };

  return (
    <div className="space-y-2">
      <Input id={questionId} type="file" onChange={handleFileChange} disabled={uploadState.status === 'uploading' || uploadState.status === 'success'} className="hidden"/>
      <Button asChild variant="outline">
          <label htmlFor={questionId} className="cursor-pointer">
              <UploadCloud className="mr-2 h-4 w-4" />
              {uploadState.status === 'success' ? `Uploaded: ${fileName}` : label}
          </label>
      </Button>

      {uploadState.status === 'uploading' && (
        <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm text-muted-foreground">Uploading...</span>
            <Progress value={uploadState.progress} className="w-full" />
        </div>
      )}
      {uploadState.status === 'success' && (
        <div className="flex items-center gap-2 text-green-600">
          <CheckCircle2 className="h-5 w-5" />
          <span className="text-sm font-medium">File uploaded successfully.</span>
        </div>
      )}
      {uploadState.status === 'error' && (
        <div className="flex items-center gap-2 text-red-600">
            <AlertCircle className="h-5 w-5" />
            <span className="text-sm font-medium">Upload failed: {uploadState.error}</span>
        </div>
      )}
    </div>
  );
};


export default function AssessmentPage({ params }: { params: { id: string } }) {
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [candidate, setCandidate] = useState<CollegeCandidate | Candidate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isStarted, setIsStarted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [viewingSectionIntro, setViewingSectionIntro] = useState(true);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);

  const { toast } = useToast();
  const startTimeRef = useRef<number | null>(null);
  const searchParams = useSearchParams();
  
  const passcodeForm = useForm<z.infer<typeof passcodeSchema>>({
    resolver: zodResolver(passcodeSchema),
    defaultValues: { passcode: '' },
  });
  
  const verificationForm = useForm<z.infer<typeof verificationSchema>>({
      resolver: zodResolver(verificationSchema),
      defaultValues: { name: '', email: '' }
  });

  const answersForm = useForm<AnswersFormValues>({
    resolver: zodResolver(answersSchema),
    defaultValues: {
      answers: [],
    },
  });

  const onSubmit = useCallback(async (data: AnswersFormValues) => {
    if (!assessment || isSubmitting || alreadySubmitted) return;

    setIsSubmitting(true);
    const timeTaken = startTimeRef.current ? Math.floor((Date.now() - startTimeRef.current) / 1000) : 0;
    const collegeId = searchParams.get('collegeId');
    const candidateIdParam = searchParams.get('candidateId'); // Can be college candidate or general candidate

    let submissionData: any = {
        assessmentId: assessment.id,
        assessmentTitle: assessment.title,
        answers: data.answers,
        submittedAt: serverTimestamp(),
        timeTaken,
        collegeId: collegeId || null,
    };
    
    if (candidate) {
        submissionData = {
            ...submissionData,
            candidateId: (candidate as Candidate).type ? candidate.id : null, // General candidate ID
            collegeCandidateId: collegeId ? candidateIdParam : null, // College candidate ID
            candidateName: 'fullName' in candidate ? (candidate as Candidate).fullName : candidate.name,
            candidateEmail: candidate.email,
        };
    } else {
        submissionData = {
            ...submissionData,
            candidateId: null,
            collegeCandidateId: null,
            candidateName: 'N/A',
            candidateEmail: 'N/A',
        }
    }

    try {
      await addDoc(collection(db, 'assessmentSubmissions'), submissionData);
      
      toast({
        title: 'Submission Successful!',
        description: 'Your answers have been recorded.',
      });
      setIsFinished(true);

    } catch (e: any) {
      console.error("Submission error:", e);
      toast({
        variant: 'destructive',
        title: 'Submission Failed',
        description: e.message || 'An unexpected error occurred.',
      });
    } finally {
        setIsSubmitting(false);
    }
  }, [assessment, candidate, isSubmitting, searchParams, toast, alreadySubmitted]);

  // Effect for fetching the assessment and candidate data
  useEffect(() => {
    if (!params.id) return;
    
    let copyListener: ((e: ClipboardEvent) => void) | null = null;
  
    const getAssessmentData = async () => {
      setLoading(true);
      setError(null);
      try {
        const docRef = doc(db, 'assessments', params.id);
        const docSnap = await getDoc(docRef);
  
        if (!docSnap.exists()) {
          setError('Assessment not found.');
          setLoading(false);
          return;
        }
  
        const data = { id: docSnap.id, ...docSnap.data() } as Assessment;
  
        // Handle assessments with old structure (questions at root) for backward compatibility
        if ((!data.sections || data.sections.length === 0) && (data as any).questions?.length > 0) {
            data.sections = [{ id: 'default', title: 'General Questions', questions: (data as any).questions }];
        } else if (!data.sections) {
            data.sections = []; // Ensure sections is an empty array if no questions exist
        }
  
        if (data.disableCopyPaste) {
          copyListener = (e: ClipboardEvent) => {
            e.preventDefault();
            alert("Copying questions is disabled for this assessment.");
          };
          document.addEventListener('copy', copyListener);
        }
  
        const candidateId = searchParams.get('candidateId');
        const collegeId = searchParams.get('collegeId');
  
        // Check for existing submissions first if we have a candidate ID
        if (candidateId) {
          const submissionsQuery = query(
            collection(db, 'assessmentSubmissions'),
            where('assessmentId', '==', params.id),
            where(collegeId ? 'collegeCandidateId' : 'candidateId', '==', candidateId)
          );
          const submissionsSnapshot = await getDocs(submissionsQuery);
          if (!submissionsSnapshot.empty) {
            setAlreadySubmitted(true);
            setLoading(false);
            return;
          }
        }
  
        setAssessment(data);
  
        // Pre-fill form answers
        const allQuestions = data.sections?.flatMap(s => s.questions) || [];
        if (allQuestions.length > 0) {
            answersForm.reset({
              answers: allQuestions.map(q => ({
                questionId: q.id,
                questionText: q.text,
                answer: q.type === 'checkbox' ? [] : ''
              }))
            });
        }
  
        if (data.timeLimit) {
          setTimeLeft(data.timeLimit * 60);
        }
  
        const authRequired = data.authentication === 'email_verification';
        const hasPasscode = !!data.passcode;
  
        // Try to find candidate from either college or general pool
        if (candidateId) {
          let candidateDoc;
          if (collegeId) { // From college link
            candidateDoc = await getDoc(doc(db, `colleges/${collegeId}/candidates/${candidateId}`));
          } else { // From general candidate pool
            candidateDoc = await getDoc(doc(db, `applications/${candidateId}`));
          }
  
          if (candidateDoc.exists()) {
            const candidateData = { id: candidateDoc.id, ...candidateDoc.data() } as (CollegeCandidate | Candidate);
            setCandidate(candidateData);
            if (!authRequired) {
              setIsAuthenticated(true);
            } else {
                verificationForm.reset({
                    name: 'fullName' in candidateData ? candidateData.fullName : candidateData.name,
                    email: candidateData.email
                });
            }
          } else {
            setError("Candidate not found for this assessment link.");
          }
        } else if (!authRequired && !hasPasscode) {
          setIsAuthenticated(true);
        }
      } catch (e: any) {
        setError('Failed to load assessment: ' + e.message);
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
  
    getAssessmentData();
    
    return () => {
        if (copyListener) {
            document.removeEventListener('copy', copyListener);
        }
    };
  }, [params.id, searchParams, answersForm, verificationForm]);


  const submitOnTimeUp = useCallback(() => {
    answersForm.handleSubmit(onSubmit)();
  }, [answersForm, onSubmit]);

  // Effect for the countdown timer
  useEffect(() => {
    if (!isStarted || isFinished || !assessment?.timeLimit) return;
    
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          toast({
            title: "Time's up!",
            description: "Submitting your assessment now.",
            variant: "destructive"
          });
          submitOnTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isStarted, isFinished, assessment?.timeLimit, submitOnTimeUp, toast]);
  
  // Effect for tab switching
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && isStarted && !isFinished) {
        toast({
          title: "Tab Switched",
          description: "Assessment submitted automatically due to tab switching.",
          variant: "destructive"
        });
        submitOnTimeUp();
      }
    };

    if (assessment?.disableCopyPaste) {
      document.addEventListener("visibilitychange", handleVisibilityChange);
    }
    
    return () => {
      if (assessment?.disableCopyPaste) {
        document.removeEventListener("visibilitychange", handleVisibilityChange);
      }
    };
  }, [isStarted, isFinished, assessment?.disableCopyPaste, submitOnTimeUp, toast]);


  const handlePasscodeSubmit = (values: z.infer<typeof passcodeSchema>) => {
    if (values.passcode === assessment?.passcode) {
      setIsAuthenticated(true);
    } else {
      passcodeForm.setError('passcode', {
        type: 'manual',
        message: 'Invalid passcode.',
      });
    }
  };

  const handleVerificationSubmit = (values: z.infer<typeof verificationSchema>) => {
      if (!candidate) {
          verificationForm.setError('email', { type: 'manual', message: 'Candidate record not found.' });
          return;
      }
      const candidateName = 'fullName' in candidate ? (candidate as Candidate).fullName : (candidate as CollegeCandidate).name;
      
      const isNameMatch = values.name.toLowerCase() === candidateName.toLowerCase();
      const isEmailMatch = values.email.toLowerCase() === candidate.email.toLowerCase();

      if (isNameMatch && isEmailMatch) {
          setIsAuthenticated(true);
      } else {
          verificationForm.setError('email', { type: 'manual', message: 'The name or email does not match our records for this link.' });
      }
  };

  const handleStart = () => {
      setIsStarted(true);
      startTimeRef.current = Date.now();
  }
  
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const handleNextQuestion = () => {
    const currentSection = assessment!.sections![currentSectionIndex];
    const isLastQuestionInSection = currentQuestionIndex === currentSection.questions.length - 1;
    const isLastSectionOfAll = currentSectionIndex === assessment!.sections!.length - 1;

    if (isLastQuestionInSection) {
        if (!isLastSectionOfAll) {
            // Move to next section intro
            setCurrentSectionIndex(prev => prev + 1);
            setCurrentQuestionIndex(0);
            setViewingSectionIntro(true);
        }
    } else {
        setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const handlePrevQuestion = () => {
    if (currentQuestionIndex > 0) {
        setCurrentQuestionIndex(prev => prev - 1);
    } else {
        if (currentSectionIndex > 0) {
            const prevSectionIndex = currentSectionIndex - 1;
            const prevSection = assessment!.sections![prevSectionIndex];
            setCurrentSectionIndex(prevSectionIndex);
            setCurrentQuestionIndex(prevSection.questions.length -1);
            setViewingSectionIntro(false);
        }
    }
  };

  const allQuestions = assessment?.sections?.flatMap(section => section.questions || []) || [];
  const totalQuestions = allQuestions.length;
  const answeredAnswers = answersForm.watch('answers')?.filter(a => {
      if (Array.isArray(a.answer)) return a.answer.length > 0;
      return !!a.answer;
  });
  const answeredCount = answeredAnswers?.length || 0;
  const progressPercentage = totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0;

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-muted/40">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-muted/40 p-4">
        <Card className="w-full max-w-md">
            <CardHeader><CardTitle>Error</CardTitle></CardHeader>
            <CardContent><p>{error}</p></CardContent>
        </Card>
      </div>
    );
  }

    if (alreadySubmitted) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-muted/40 p-4">
        <Card className="w-full max-w-md text-center">
            <CardHeader>
                <Image height={50} width={200} src={mmLogo} alt="Megamind Careers Logo" className="mx-auto mb-4" />
                <CardTitle>Submission Received</CardTitle>
            </CardHeader>
            <CardContent><p>Thank you. We have already received your submission for this assessment.</p></CardContent>
        </Card>
      </div>
    );
  }

  if (isFinished) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-muted/40 p-4">
        <Card className="w-full max-w-md text-center">
            <CardHeader>
                <Image height={50} width={200} src={mmLogo} alt="Megamind Careers Logo" className="mx-auto mb-4" />
                <CardTitle className="mb-1">{assessment?.successTitle || 'Assessment Complete'}</CardTitle>
                <CardDescription className="pt-2">{assessment?.successMessage || 'Thank you for your submission. The hiring team will get back to you soon.'}</CardDescription>
            </CardHeader>
            <CardContent></CardContent>
        </Card>
      </div>
    );
  }

  if (!isAuthenticated) {
     if (assessment?.authentication === 'email_verification') {
        return (
             <div className="flex min-h-screen w-full items-center justify-center bg-muted/40 p-4">
                <Card className="w-full max-w-sm">
                    <CardHeader>
                        <Image height={50} width={200} src={mmLogo} alt="Megamind Careers Logo" className="mx-auto mb-4" />
                        <CardTitle className="flex items-center gap-2 justify-center"><Lock /> Candidate Verification</CardTitle>
                        <CardDescription className="text-center pt-2">Please verify your identity to access the assessment.</CardDescription>
                    </CardHeader>
                    <Form {...verificationForm}>
                        <form onSubmit={verificationForm.handleSubmit(handleVerificationSubmit)}>
                            <CardContent className="space-y-4">
                                <FormField control={verificationForm.control} name="name" render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Full Name</FormLabel>
                                      <FormControl><Input {...field} defaultValue={candidate ? ('fullName' in candidate ? candidate.fullName : candidate.name) : ''} /></FormControl>
                                      <FormMessage />
                                    </FormItem>
                                )} />
                                <FormField control={verificationForm.control} name="email" render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Email Address</FormLabel>
                                      <FormControl><Input type="email" {...field} defaultValue={candidate?.email || ''}/></FormControl>
                                      <FormMessage />
                                    </FormItem>
                                )} />
                            </CardContent>
                            <CardFooter>
                                <Button type="submit" className="w-full">
                                    Proceed to Assessment
                                </Button>
                            </CardFooter>
                        </form>
                    </Form>
                </Card>
            </div>
        )
    }

    if(assessment?.passcode) {
      return (
          <div className="flex min-h-screen w-full items-center justify-center bg-muted/40 p-4">
              <Card className="w-full max-w-sm">
                  <CardHeader>
                      <Image height={50} width={200} src={mmLogo} alt="Megamind Careers Logo" className="mx-auto mb-4" />
                      <CardTitle className="flex items-center gap-2 justify-center"><Lock /> Secure Assessment</CardTitle>
                      <CardDescription className="text-center pt-2">{assessment?.title}</CardDescription>
                  </CardHeader>
                  <Form {...passcodeForm}>
                      <form onSubmit={passcodeForm.handleSubmit(handlePasscodeSubmit)}>
                          <CardContent className="space-y-4">
                              <FormField
                                  control={passcodeForm.control}
                                  name="passcode"
                                  render={({ field }) => (
                                      <FormItem>
                                      <FormLabel>Enter Passcode</FormLabel>
                                      <FormControl>
                                          <Input type="password" {...field} />
                                      </FormControl>
                                      <FormMessage />
                                      </FormItem>
                                  )}
                                  />
                          </CardContent>
                          <CardFooter>
                              <Button type="submit" className="w-full">
                                  Unlock Assessment
                              </Button>
                          </CardFooter>
                      </form>
                  </Form>
              </Card>
          </div>
      );
    }
  }

  if (!isStarted) {
      return (
        <div className="flex min-h-screen w-full items-center justify-center bg-muted/40 p-4">
            <Card className="w-full max-w-lg text-center shadow-lg">
                <CardHeader className="p-8 text-center">
                    <Image height={50} width={200} src={mmLogo} alt="Megamind Careers Logo" className="mx-auto mb-6" />
                    <CardTitle className="text-3xl font-bold mb-1">{assessment?.startPageTitle || assessment?.title}</CardTitle>
                    <CardDescription className="text-lg pt-2 whitespace-pre-wrap">{assessment?.startPageInstructions || 'Ready to begin?'}</CardDescription>
                </CardHeader>
                <CardContent className="px-8 pb-4">
                    {assessment && (assessment.startPageImportantInstructions) && (
                        <Alert className="text-left">
                            <Timer className="h-4 w-4" />
                            <AlertTitle>Important Instructions</AlertTitle>
                            <AlertDescription className="whitespace-pre-wrap">
                                {assessment.startPageImportantInstructions}
                            </AlertDescription>
                        </Alert>
                    )}
                </CardContent>
                <CardFooter className="p-8 pt-4">
                    <Button onClick={handleStart} className="w-full" size="lg">{assessment?.startButtonText || 'Start Assessment'}</Button>
                </CardFooter>
            </Card>
        </div>
      );
  }

  if (!assessment || !assessment.sections || assessment.sections.length === 0 || allQuestions.length === 0) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-muted/40">
        <p>This assessment has no questions.</p>
      </div>
    );
  }
  
  const currentSection = assessment.sections[currentSectionIndex];
  if (!currentSection || !currentSection.questions || currentSection.questions.length === 0) {
    if (currentSectionIndex < assessment.sections.length -1) {
      setCurrentSectionIndex(i => i + 1);
      return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
    }
     return (
        <div className="flex h-screen w-full items-center justify-center">
            <Card className="w-full max-w-md text-center">
                <CardHeader>
                    <CardTitle>End of Assessment</CardTitle>
                    <CardDescription className="pt-2">You have reached the end. Please submit your answers.</CardDescription>
                </CardHeader>
                <CardFooter>
                    <Button onClick={() => answersForm.handleSubmit(onSubmit)()} disabled={isSubmitting} className="w-full">
                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Submit Assessment
                    </Button>
                </CardFooter>
            </Card>
        </div>
     );
  }

  const overallQuestionIndex = assessment.sections.slice(0, currentSectionIndex).reduce((acc, sec) => acc + (sec.questions?.length || 0), 0) + currentQuestionIndex;
  const currentQuestion = currentSection.questions[currentQuestionIndex];
  const AnswerComponent = assessment.disableCopyPaste ? PasteDisabledTextarea : Textarea;
  const isLastQuestionOfAll = overallQuestionIndex === totalQuestions - 1;


  if (viewingSectionIntro) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-muted/40 p-4">
        <Card className="w-full max-w-lg text-center shadow-lg">
          <CardHeader className="p-8 text-center">
            <Image height={50} width={200} src={mmLogo} alt="Megamind Careers Logo" className="mx-auto mb-6" />
            <CardDescription>Section {currentSectionIndex + 1} of {assessment.sections.length}</CardDescription>
            <CardTitle className="text-3xl font-bold mb-1">{currentSection.title}</CardTitle>
          </CardHeader>
          <CardContent className="px-8 pb-4">
             <Alert className="text-center">
                  <AlertCircle className="mx-auto h-4 w-4" />
                  <AlertTitle>Questions in this section: {currentSection.questions?.length || 0}</AlertTitle>
                  <AlertDescription>
                      Click the button below to start this section.
                  </AlertDescription>
              </Alert>
          </CardContent>
          <CardFooter className="p-8 pt-4">
            <Button onClick={() => { setViewingSectionIntro(false); setCurrentQuestionIndex(0); }} className="w-full" size="lg">
              Start Section
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/40 p-4 sm:p-8 flex items-center justify-center">
        <div className="mx-auto max-w-3xl w-full">
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-start mb-4">
                        <div className="flex-grow">
                            <CardTitle className="mb-1">{assessment?.title}</CardTitle>
                            <CardDescription>Question {overallQuestionIndex + 1} of {totalQuestions}</CardDescription>
                        </div>
                         <Image height={25} width={120} src={mmLogo} alt="Megamind Careers Logo" className="hidden sm:block" />
                        {assessment?.timeLimit && (
                            <div className="flex items-center gap-2 rounded-full bg-destructive px-4 py-2 text-destructive-foreground ml-auto">
                                <Timer className="h-5 w-5" />
                                <span className="font-mono text-lg">{formatTime(timeLeft)}</span>
                            </div>
                        )}
                    </div>
                     <div className="space-y-2">
                        <div className="flex justify-between text-sm text-muted-foreground">
                            <span>Progress</span>
                            <span>{answeredCount} of {totalQuestions} answered</span>
                        </div>
                        <Progress value={progressPercentage} />
                    </div>
                </CardHeader>
                <Form {...answersForm}>
                <form onSubmit={answersForm.handleSubmit(onSubmit)}>
                    <CardContent className="space-y-8 pt-4">
                       {currentQuestion && <FormField
                          key={currentQuestion.id}
                          control={answersForm.control}
                          name={`answers.${overallQuestionIndex}.answer`}
                          render={({ field }) => (
                          <FormItem className="space-y-3">
                              <FormLabel className="text-base font-semibold">
                                  {currentQuestionIndex + 1}. {currentQuestion.text}
                              </FormLabel>
                              <FormControl>
                                  <div className="w-full">
                                      {(() => {
                                          switch (currentQuestion.type) {
                                              case 'multiple-choice':
                                                  return (
                                                      <RadioGroup
                                                          onValueChange={field.onChange}
                                                          defaultValue={field.value as string}
                                                          className="flex flex-col space-y-2"
                                                      >
                                                          {currentQuestion.options?.map((option, optionIndex) => (
                                                              <FormItem key={optionIndex} className="flex items-center space-x-3 space-y-0">
                                                                  <FormControl>
                                                                      <RadioGroupItem value={option} />
                                                                  </FormControl>
                                                                  <FormLabel className="font-normal">{option}</FormLabel>
                                                              </FormItem>
                                                          ))}
                                                      </RadioGroup>
                                                  );
                                              case 'checkbox':
                                                  return (
                                                      <div>
                                                          {currentQuestion.options?.map((option, optionIndex) => (
                                                              <FormField
                                                                  key={optionIndex}
                                                                  control={answersForm.control}
                                                                  name={`answers.${overallQuestionIndex}.answer`}
                                                                  render={({ field }) => {
                                                                      return (
                                                                      <FormItem
                                                                          key={optionIndex}
                                                                          className="flex flex-row items-start space-x-3 space-y-0"
                                                                      >
                                                                          <FormControl>
                                                                          <Checkbox
                                                                              checked={(field.value as string[])?.includes(option)}
                                                                              onCheckedChange={(checked) => {
                                                                                  const currentValue = Array.isArray(field.value) ? field.value : [];
                                                                                  return checked
                                                                                  ? field.onChange([...currentValue, option])
                                                                                  : field.onChange(
                                                                                      currentValue?.filter(
                                                                                          (value) => value !== option
                                                                                      )
                                                                                      )
                                                                              }}
                                                                          />
                                                                          </FormControl>
                                                                          <FormLabel className="font-normal">
                                                                              {option}
                                                                          </FormLabel>
                                                                      </FormItem>
                                                                      )
                                                                  }}
                                                              />
                                                          ))}
                                                          <FormMessage />
                                                      </div>
                                                  );
                                              case 'file-upload':
                                                  return (
                                                      <FileUploadInput
                                                        questionId={currentQuestion.id}
                                                        assessmentId={assessment.id}
                                                        onUploadComplete={(url) => {
                                                          field.onChange(url);
                                                        }}
                                                      />
                                                  );
                                              case 'date':
                                                  return (
                                                      <Popover>
                                                          <PopoverTrigger asChild>
                                                          <FormControl>
                                                              <Button
                                                              variant={"outline"}
                                                              className={cn(
                                                                  "w-[240px] pl-3 text-left font-normal",
                                                                  !field.value && "text-muted-foreground"
                                                              )}
                                                              >
                                                              {field.value ? (
                                                                  format(new Date(field.value as string), "PPP")
                                                              ) : (
                                                                  <span>Pick a date</span>
                                                              )}
                                                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                              </Button>
                                                          </FormControl>
                                                          </PopoverTrigger>
                                                          <PopoverContent className="w-auto p-0" align="start">
                                                          <Calendar
                                                              mode="single"
                                                              selected={field.value ? new Date(field.value as string) : undefined}
                                                              onSelect={(date) => field.onChange(date?.toISOString())}
                                                              initialFocus
                                                          />
                                                          </PopoverContent>
                                                      </Popover>
                                                  );
                                              case 'textarea':
                                                  return (
                                                      <AnswerComponent
                                                          {...field}
                                                          value={field.value as string || ''}
                                                          className="min-h-[120px] text-base"
                                                          placeholder="Type your answer here..."
                                                      />
                                                  );
                                              default:
                                                  return (
                                                      <Input
                                                          {...field}
                                                          type={currentQuestion.type}
                                                          value={field.value as string || ''}
                                                          placeholder="Type your answer here..."
                                                      />
                                                  );
                                          }
                                      })()}
                                  </div>
                              </FormControl>
                              <FormMessage />
                          </FormItem>
                          )}
                      />}
                    </CardContent>
                    <CardFooter className="flex justify-between">
                       <div>
                         {(currentQuestionIndex > 0 || currentSectionIndex > 0) && (
                            <Button 
                              type="button" 
                              variant="outline" 
                              onClick={handlePrevQuestion}
                            >
                                <ArrowLeft className="mr-2 h-4 w-4" /> Previous
                           </Button>
                         )}
                       </div>

                       <div className="flex items-center gap-4">
                           {!isLastQuestionOfAll && (
                               <Button 
                                type="button" 
                                onClick={handleNextQuestion}
                               >
                                  Next <ArrowRight className="ml-2 h-4 w-4" />
                               </Button>
                           )}
                           {isLastQuestionOfAll && (
                                <Button type="submit" className="w-auto" disabled={isSubmitting}>
                                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                    Submit Assessment
                                </Button>
                           )}
                       </div>
                    </CardFooter>
                </form>
                </Form>
            </Card>
        </div>
    </div>
  );
}
