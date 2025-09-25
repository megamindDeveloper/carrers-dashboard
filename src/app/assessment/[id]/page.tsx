
'use client';

import { useEffect, useState, useRef } from 'react';
import { doc, getDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/app/utils/firebase/firebaseConfig';
import type { Assessment, AssessmentQuestion } from '@/lib/types';
import { Loader2, Lock, Timer } from 'lucide-react';
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

const passcodeSchema = z.object({
  passcode: z.string().min(1, 'Passcode is required'),
});

const answersSchema = z.object({
    candidateName: z.string().min(1, 'Your name is required'),
    candidateEmail: z.string().email('A valid email is required'),
    answers: z.array(z.object({
        questionId: z.string(),
        questionText: z.string(),
        answer: z.string().min(1, 'An answer is required for this question.'),
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

export default function AssessmentPage({ params }: { params: { id: string } }) {
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isStarted, setIsStarted] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);

  const { toast } = useToast();
  const startTimeRef = useRef<number | null>(null);

  const passcodeForm = useForm<z.infer<typeof passcodeSchema>>({
    resolver: zodResolver(passcodeSchema),
    defaultValues: { passcode: '' },
  });

  const answersForm = useForm<AnswersFormValues>({
    resolver: zodResolver(answersSchema),
  });

  const { fields } = useFieldArray({
      control: answersForm.control,
      name: 'answers'
  });

  useEffect(() => {
    if (params.id) {
      const getAssessment = async () => {
        try {
          const docRef = doc(db, 'assessments', params.id);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = { id: docSnap.id, ...docSnap.data() } as Assessment;
            setAssessment(data);
            setTimeLeft(data.timeLimit * 60);

            answersForm.reset({
                candidateName: '',
                candidateEmail: '',
                answers: data.questions.map(q => ({
                    questionId: q.id,
                    questionText: q.text,
                    answer: ''
                }))
            });

          } else {
            setError('Assessment not found.');
          }
        } catch (e: any) {
          setError('Failed to load assessment: ' + e.message);
        } finally {
          setLoading(false);
        }
      };
      getAssessment();
    }
  }, [params.id, answersForm]);

  useEffect(() => {
    if (!isStarted || isFinished) return;

    if (timeLeft <= 0) {
      setIsFinished(true);
      answersForm.handleSubmit(onSubmit)(); // Auto-submit when time is up
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [isStarted, isFinished, timeLeft, answersForm]);


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

  const handleStart = () => {
      setIsStarted(true);
      startTimeRef.current = Date.now();
  }

  const onSubmit = async (data: AnswersFormValues) => {
    if (!assessment) return;

    const timeTaken = startTimeRef.current ? Math.floor((Date.now() - startTimeRef.current) / 1000) : 0;

    try {
      await addDoc(collection(db, 'assessmentSubmissions'), {
        assessmentId: assessment.id,
        assessmentTitle: assessment.title,
        candidateName: data.candidateName,
        candidateEmail: data.candidateEmail,
        answers: data.answers,
        submittedAt: serverTimestamp(),
        timeTaken,
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
  };
  
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
            <CardHeader><CardTitle>Assessment Complete</CardTitle></CardHeader>
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
                    <CardTitle className="flex items-center gap-2"><Lock /> Secure Assessment</CardTitle>
                    <CardDescription>{assessment?.title}</CardDescription>
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

  if (!isStarted) {
      return (
        <div className="flex min-h-screen w-full items-center justify-center bg-muted/40 p-4">
            <Card className="w-full max-w-lg">
                <CardHeader>
                    <CardTitle>{assessment?.title}</CardTitle>
                    <CardDescription>Ready to begin?</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Alert>
                        <Timer className="h-4 w-4" />
                        <AlertTitle>Time Limit: {assessment?.timeLimit} minutes</AlertTitle>
                        <AlertDescription>
                            The timer will start as soon as you click the button below. The form will be submitted automatically when the time runs out. Make sure you are in a quiet environment before you begin. Pasting is disabled.
                        </AlertDescription>
                    </Alert>
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
                        <CardTitle>{assessment?.title}</CardTitle>
                        <div className="flex items-center gap-2 rounded-full bg-destructive px-4 py-2 text-destructive-foreground">
                            <Timer className="h-5 w-5" />
                            <span className="font-mono text-lg">{formatTime(timeLeft)}</span>
                        </div>
                    </div>
                </CardHeader>
                <Form {...answersForm}>
                <form onSubmit={answersForm.handleSubmit(onSubmit)}>
                    <CardContent className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField control={answersForm.control} name="candidateName" render={({ field }) => (
                                <FormItem><FormLabel>Your Full Name</FormLabel><FormControl><Input {...field} placeholder="e.g. Jane Doe" /></FormControl><FormMessage /></FormItem>
                            )} />
                            <FormField control={answersForm.control} name="candidateEmail" render={({ field }) => (
                                <FormItem><FormLabel>Your Email</FormLabel><FormControl><Input {...field} type="email" placeholder="e.g. jane.doe@example.com"/></FormControl><FormMessage /></FormItem>
                            )} />
                        </div>
                        <div className="space-y-8 pt-4 border-t">
                            {fields.map((field, index) => (
                                <FormField
                                    key={field.id}
                                    control={answersForm.control}
                                    name={`answers.${index}.answer`}
                                    render={({ field: answerField }) => (
                                    <FormItem>
                                        <FormLabel className="text-base">
                                            {index + 1}. {field.questionText}
                                        </FormLabel>
                                        <FormControl>
                                            <PasteDisabledTextarea
                                                {...answerField}
                                                className="min-h-[120px] text-base"
                                                placeholder="Type your answer here..."
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                    )}
                                />
                            ))}
                        </div>
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
