
'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { doc, getDoc, collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { db, storage } from '@/app/utils/firebase/firebaseConfig';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import type { Assessment, AssessmentQuestion, CollegeCandidate } from '@/lib/types';
import { Loader2, Lock, Timer, UploadCloud, CheckCircle2, AlertCircle, UserCheck } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Progress } from '@/components/ui/progress';
import Image from 'next/image';
import mmLogo from '../../../../.idx/mmLogo.png';


const verificationSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('A valid email is required'),
});

const answersSchema = z.object({
    answers: z.array(z.object({
        questionId: z.string(),
        questionText: z.string(),
        answer: z.string().optional(),
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
  const [candidate, setCandidate] = useState<CollegeCandidate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isStarted, setIsStarted] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);

  const { toast } = useToast();
  const startTimeRef = useRef<number | null>(null);
  const searchParams = useSearchParams();
  const collegeId = searchParams.get('collegeId');
  const collegeCandidateId = searchParams.get('candidateId');


  const verificationForm = useForm<z.infer<typeof verificationSchema>>({
    resolver: zodResolver(verificationSchema),
    defaultValues: { name: '', email: '' },
  });

  const answersForm = useForm<AnswersFormValues>({
    resolver: zodResolver(answersSchema),
  });

  const { fields } = useFieldArray({
      control: answersForm.control,
      name: 'answers'
  });

  const onSubmit = useCallback(async (data: AnswersFormValues) => {
    if (!assessment) return;

    const timeTaken = startTimeRef.current ? Math.floor((Date.now() - startTimeRef.current) / 1000) : 0;

    try {
      await addDoc(collection(db, 'assessmentSubmissions'), {
        assessmentId: assessment.id,
        assessmentTitle: assessment.title,
        candidateName: candidate?.name || 'N/A',
        candidateEmail: candidate?.email || 'N/A',
        candidateContact: 'N/A',
        candidateResumeUrl: 'N/A',
        answers: data.answers,
        submittedAt: serverTimestamp(),
        timeTaken,
        collegeId: collegeId || null,
        collegeCandidateId: collegeCandidateId || null,
      });
      setIsFinished(true);
      toast({
        title: 'Submission Successful!',
        description: 'Your answers have been recorded.',
      });
    } catch (e: any) {
      toast({
        variant: 'destructive',
        title: 'Submission Failed',
        description: e.message || 'An unexpected error occurred.',
      });
    }
  }, [assessment, collegeId, collegeCandidateId, toast, candidate]);

  useEffect(() => {
    if (params.id) {
      const getAssessmentData = async () => {
        try {
          // Fetch assessment details
          const assessmentRef = doc(db, 'assessments', params.id);
          const assessmentSnap = await getDoc(assessmentRef);
          if (assessmentSnap.exists()) {
            const data = { id: assessmentSnap.id, ...assessmentSnap.data() } as Assessment;
            setAssessment(data);
            if (data.timeLimit) {
              setTimeLeft(data.timeLimit * 60);
            }

            answersForm.reset({
                answers: data.questions.map(q => ({
                    questionId: q.id,
                    questionText: q.text,
                    answer: ''
                }))
            });

            // If it's not a college assessment, bypass individual verification
            if (!collegeId || !collegeCandidateId) {
                setIsAuthenticated(true);
            }

          } else {
            setError('Assessment not found.');
            return;
          }

          // If it is a college assessment, fetch candidate details for verification
          if (collegeId && collegeCandidateId) {
            const candidateRef = doc(db, 'colleges', collegeId, 'candidates', collegeCandidateId);
            const candidateSnap = await getDoc(candidateRef);
            if (candidateSnap.exists()) {
                setCandidate({ id: candidateSnap.id, ...candidateSnap.data() } as CollegeCandidate);
            } else {
                setError('Candidate profile not found.');
            }
          }

        } catch (e: any) {
          setError('Failed to load assessment data: ' + e.message);
        } finally {
          setLoading(false);
        }
      };
      getAssessmentData();
    }
  }, [params.id, collegeId, collegeCandidateId, answersForm]);

  useEffect(() => {
    if (!isStarted || isFinished || !assessment?.timeLimit) return;

    if (timeLeft <= 0) {
      setIsFinished(true);
      answersForm.handleSubmit(onSubmit)(); // Auto-submit when time is up
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [isStarted, isFinished, timeLeft, answersForm, onSubmit, assessment?.timeLimit]);


  const handleVerificationSubmit = (values: z.infer<typeof verificationSchema>) => {
    if (
      candidate &&
      values.name.trim().toLowerCase() === candidate.name.toLowerCase() &&
      values.email.trim().toLowerCase() === candidate.email.toLowerCase()
    ) {
      setIsAuthenticated(true);
    } else {
      verificationForm.setError('email', {
        type: 'manual',
        message: 'The name or email you entered does not match our records for this assessment link.',
      });
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

  if (isFinished) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-muted/40 p-4">
        <Card className="w-full max-w-md text-center">
            <CardHeader>
                <Image height={50} width={200} src={mmLogo} alt="MegaMind Careers Logo" className="mx-auto mb-4" />
                <CardTitle>Assessment Complete</CardTitle>
            </CardHeader>
            <CardContent><p>Thank you for your submission. The hiring team will get back to you soon.</p></CardContent>
        </Card>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
        <div className="flex min-h-screen w-full items-center justify-center bg-muted/40 p-4">
            <Card className="w-full max-w-sm">
                <CardHeader>
                    <Image height={50} width={200} src={mmLogo} alt="MegaMind Careers Logo" className="mx-auto mb-4" />
                    <CardTitle className="flex items-center gap-2 justify-center"><UserCheck /> Verify Your Identity</CardTitle>
                    <CardDescription className="text-center pt-2">Please enter your name and email to access the "{assessment?.title}" assessment.</CardDescription>
                </CardHeader>
                <Form {...verificationForm}>
                    <form onSubmit={verificationForm.handleSubmit(handleVerificationSubmit)}>
                        <CardContent className="space-y-4">
                             <FormField
                                control={verificationForm.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>Full Name</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Your full name" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                    </FormItem>
                                )}
                                />
                             <FormField
                                control={verificationForm.control}
                                name="email"
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>Email Address</FormLabel>
                                    <FormControl>
                                        <Input type="email" placeholder="your.email@example.com" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                    </FormItem>
                                )}
                                />
                        </CardContent>
                        <CardFooter>
                            <Button type="submit" className="w-full">
                                Continue
                            </Button>
                        </CardFooter>
                    </form>
                </Form>
            </Card>
        </div>
    );
  }

  if (!isStarted) {
      return (
        <div className="flex min-h-screen w-full items-center justify-center bg-muted/40 p-4">
            <Card className="w-full max-w-lg">
                <CardHeader>
                    <Image height={50} width={200} src={mmLogo} alt="MegaMind Careers Logo" className="mx-auto mb-4" />
                    <CardTitle>{assessment?.title}</CardTitle>
                    <CardDescription>Ready to begin?</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {assessment?.timeLimit && (
                        <Alert>
                            <Timer className="h-4 w-4" />
                            <AlertTitle>Time Limit: {assessment?.timeLimit} minutes</AlertTitle>
                            <AlertDescription>
                                The timer will start as soon as you click the button below. The form will be submitted automatically when the time runs out. Make sure you are in a quiet environment before you begin. Pasting is disabled for text fields.
                            </AlertDescription>
                        </Alert>
                    )}
                    <p>Number of questions: {assessment?.questions.length}</p>
                </CardContent>
                <CardFooter>
                    <Button onClick={handleStart} className="w-full">Start Assessment</Button>
                </CardFooter>
            </Card>
        </div>
      );
  }


  return (
    <div className="min-h-screen bg-muted/40 p-4 sm:p-8">
        <div className="mx-auto max-w-3xl">
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <Image height={40} width={180} src={mmLogo} alt="MegaMind Careers Logo" className="mb-4" />
                            <CardTitle>{assessment?.title}</CardTitle>
                        </div>
                        {assessment?.timeLimit && (
                            <div className="flex items-center gap-2 rounded-full bg-destructive px-4 py-2 text-destructive-foreground">
                                <Timer className="h-5 w-5" />
                                <span className="font-mono text-lg">{formatTime(timeLeft)}</span>
                            </div>
                        )}
                    </div>
                </CardHeader>
                <Form {...answersForm}>
                <form onSubmit={answersForm.handleSubmit(onSubmit)}>
                    <CardContent className="space-y-8 pt-4">
                        <h3 className="text-lg font-medium">Questions</h3>
                        {assessment?.questions.map((question, index) => (
                            <FormField
                                key={question.id}
                                control={answersForm.control}
                                name={`answers.${index}.answer`}
                                render={({ field }) => (
                                <FormItem className="space-y-3">
                                    <FormLabel className="text-base font-semibold">
                                        {index + 1}. {question.text}
                                    </FormLabel>
                                    <FormControl>
                                        {question.type === 'multiple-choice' ? (
                                            <RadioGroup
                                                onValueChange={field.onChange}
                                                defaultValue={field.value}
                                                className="flex flex-col space-y-2"
                                            >
                                                {question.options?.map((option, optionIndex) => (
                                                    <FormItem key={optionIndex} className="flex items-center space-x-3 space-y-0">
                                                        <FormControl>
                                                            <RadioGroupItem value={option} />
                                                        </FormControl>
                                                        <FormLabel className="font-normal">{option}</FormLabel>
                                                    </FormItem>
                                                ))}
                                            </RadioGroup>
                                        ) : question.type === 'file-upload' ? (
                                            <FileUploadInput
                                              questionId={question.id}
                                              assessmentId={assessment.id}
                                              onUploadComplete={(url) => {
                                                field.onChange(url);
                                              }}
                                            />
                                        ) : (
                                            <PasteDisabledTextarea
                                                {...field}
                                                className="min-h-[120px] text-base"
                                                placeholder="Type your answer here..."
                                            />
                                        )}
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                        ))}
                    </CardContent>
                    <CardFooter>
                        <Button type="submit" className="w-full" disabled={answersForm.formState.isSubmitting}>
                            {answersForm.formState.isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Submit Assessment
                        </Button>
                    </CardFooter>
                </form>
                </Form>
            </Card>
        </div>
    </div>
  );
}

    
