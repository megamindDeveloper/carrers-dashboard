
'use client';

import { useState, useEffect } from 'react';
import type { AssessmentSubmission, Candidate, CandidateStatus, CollegeCandidate } from '@/lib/types';
import { CANDIDATE_STATUSES } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { ExternalLink, Mail, Loader2, Save } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/app/utils/firebase/firebaseConfig';
import { useToast } from '@/hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';

interface SubmissionDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  submission: AssessmentSubmission | null;
  onUpdate?: (updatedSubmission: AssessmentSubmission) => void;
  onStatusChange?: (candidateId: string, status: CandidateStatus, isCollegeCandidate: boolean) => Promise<void>;
  candidate: Candidate | CollegeCandidate | null;
}

const toTitleCase = (str: string | undefined) => {
    if (!str) return '';
    return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase());
};

const getFormattedDate = (date: any) => {
    if (!date) return 'N/A';
    try {
      if (date.toDate) {
        return format(date.toDate(), 'MMM d, yyyy, h:mm a');
      }
      return format(new Date(date), 'MMM d, yyyy, h:mm a');
    } catch (e) {
      return 'Invalid Date';
    }
};

const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds < 0) return '0m 0s';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
};

export function SubmissionDetailsModal({ isOpen, onClose, submission, onUpdate, onStatusChange, candidate }: SubmissionDetailsModalProps) {
  const [answers, setAnswers] = useState(submission?.answers || []);
  const [totalScore, setTotalScore] = useState(submission?.score || 0);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

   const form = useForm({
    defaultValues: {
      status: 'Applied' as CandidateStatus,
    },
  });

  useEffect(() => {
    if (submission) {
      const initialAnswers = Array.isArray(submission.answers) ? submission.answers : [];
      setAnswers(initialAnswers);
      const initialScore = submission.score ?? initialAnswers.reduce((sum, ans) => sum + (ans.points || 0), 0);
      setTotalScore(initialScore);
    }
    if (candidate) {
      form.setValue('status', toTitleCase(candidate.status as string) as CandidateStatus || 'Applied');
    }
  }, [submission, candidate, form]);

  const handleScoreChange = (questionId: string, newPoints: number) => {
    const updatedAnswers = answers.map(ans => 
      ans.questionId === questionId ? { ...ans, points: newPoints } : ans
    );
    setAnswers(updatedAnswers);
    
    const newTotalScore = updatedAnswers.reduce((sum, ans) => sum + (ans.points || 0), 0);
    setTotalScore(newTotalScore);
  };
  
  const handleSaveChanges = async () => {
    if (!submission) return;
    setIsSaving(true);
    
    try {
        const submissionRef = doc(db, 'assessmentSubmissions', submission.id);
        const updatedSubmissionData = {
            ...submission,
            answers,
            score: totalScore,
        };
        await updateDoc(submissionRef, {
            answers: answers,
            score: totalScore,
        });
        
        if (onUpdate) {
            onUpdate(updatedSubmissionData);
        }

        toast({
            title: "Grades Saved",
            description: "The scores have been updated successfully."
        });
        onClose();

    } catch (error) {
        console.error("Error saving grades:", error);
        toast({
            variant: "destructive",
            title: "Save Failed",
            description: "Could not update the submission scores."
        });
    } finally {
        setIsSaving(false);
    }
  };
  
  const handleStatusChange = async (newStatus: CandidateStatus) => {
    if (!candidate || !onStatusChange) return;
    const isCollegeCandidate = !!submission?.collegeId;
    await onStatusChange(candidate.id, newStatus, isCollegeCandidate);
  }

  if (!submission) return null;

  const showCandidateInfo = submission.candidateEmail !== 'N/A';
  const maxScore = submission.maxScore || 0;
  const scorePercentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;


  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl flex flex-col max-h-[90vh]">
         <DialogHeader>
            <DialogTitle>{submission.candidateName !== 'N/A' ? `${submission.candidateName}'s Submission` : 'Assessment Submission'}</DialogTitle>
            <DialogDescription>
                For assessment: {submission.assessmentTitle}
                <div className="text-xs text-muted-foreground mt-1">
                    Submitted on {getFormattedDate(submission.submittedAt)} | Time Taken: {formatTime(submission.timeTaken)}
                </div>
            </DialogDescription>
        </DialogHeader>
        
        <div className="p-4 border rounded-lg bg-muted/50">
            <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold">Score</h3>
                <span className="font-mono text-lg">{totalScore} / {maxScore}</span>
            </div>
            <Progress value={scorePercentage} />
             <p className="text-sm text-right text-muted-foreground mt-1">{scorePercentage.toFixed(0)}%</p>
          </div>

        <div className="flex-1 overflow-y-auto pr-6 space-y-6 py-4">
            {showCandidateInfo && (
              <div className="space-y-4 border-b pb-4">
                  <h3 className="font-semibold">Candidate Information</h3>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{submission.candidateEmail}</span>
                    </div>
                     {candidate && onStatusChange && (
                        <Form {...form}>
                          <form className="flex items-center gap-2">
                            <FormField
                                control={form.control}
                                name="status"
                                render={({ field }) => (
                                <FormItem className="flex items-center gap-2 space-y-0">
                                    <FormLabel className="text-sm">Status:</FormLabel>
                                    <Select onValueChange={(value) => handleStatusChange(value as CandidateStatus)} value={field.value}>
                                    <FormControl>
                                        <SelectTrigger className="h-8 w-[180px]">
                                        <SelectValue placeholder="Change status" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {CANDIDATE_STATUSES.map(status => (
                                        <SelectItem key={status} value={status}>
                                            {status}
                                        </SelectItem>
                                        ))}
                                    </SelectContent>
                                    </Select>
                                </FormItem>
                                )}
                            />
                          </form>
                        </Form>
                     )}
                  </div>
              </div>
            )}

            <div className="space-y-4">
                 <h3 className="font-semibold">Answers</h3>
                {answers.map((item, index) => {
                    const isManualGrade = submission.shouldAutoGrade && item.isCorrect === null;
                    const answerValue = Array.isArray(item.answer) ? item.answer.join(', ') : (item.answer || '');
                    
                    const isLink = typeof answerValue === 'string' && (answerValue.startsWith('http://') || answerValue.startsWith('https://'));

                    return (
                        <div key={item.questionId} className={cn(
                            "space-y-2 p-4 rounded-md border",
                            item.isCorrect === true && "bg-green-50 border-green-200",
                            item.isCorrect === false && "bg-red-50 border-red-200"
                        )}>
                            <div className="flex justify-between items-start">
                               <p className="font-medium flex-1">{index + 1}. {item.questionText}</p>
                            </div>
                            <div className="text-sm text-muted-foreground p-3 bg-background/50 rounded-md whitespace-pre-wrap">
                                {isLink ? (
                                    <a href={answerValue} target="_blank" rel="noopener noreferrer" className="text-primary underline hover:text-primary/80 flex items-center gap-1">
                                        <ExternalLink className="h-4 w-4" />
                                        Open Link
                                    </a>
                                ) : answerValue ? (
                                    answerValue
                                ) : (
                                    <em>No answer provided.</em>
                                )}
                            </div>
                             {(submission.shouldAutoGrade || item.points !== undefined) && (
                                <div className="pt-2">
                                    <Label htmlFor={`score-${item.questionId}`} className="text-xs font-semibold">Points</Label>
                                    <Input
                                        id={`score-${item.questionId}`}
                                        type="number"
                                        className="h-8 w-24 mt-1"
                                        value={item.points || ''}
                                        onChange={(e) => handleScoreChange(item.questionId, parseInt(e.target.value, 10) || 0)}
                                        placeholder="Points"
                                    />
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>
        </div>
         <DialogFooter>
             <Button type="button" variant="outline" onClick={onClose}>Close</Button>
             {(submission.shouldAutoGrade || answers.some(a => a.points !== undefined)) && (
                <Button onClick={handleSaveChanges} disabled={isSaving}>
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Save Grades
                </Button>
             )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
