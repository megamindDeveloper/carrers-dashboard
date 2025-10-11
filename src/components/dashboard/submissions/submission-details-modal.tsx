
'use client';

import { useState, useEffect } from 'react';
import type { AssessmentSubmission } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { ExternalLink, FileText, Phone, Mail, Check, X, Loader2, Save } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/app/utils/firebase/firebaseConfig';
import { useToast } from '@/hooks/use-toast';

interface SubmissionDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  submission: AssessmentSubmission | null;
  onUpdate: (updatedSubmission: AssessmentSubmission) => void;
}

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
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
};

const isUrl = (str: string) => {
    if (!str) return false;
    try {
        new URL(str);
        return true;
    } catch (_) {
        return false;
    }
}

export function SubmissionDetailsModal({ isOpen, onClose, submission, onUpdate }: SubmissionDetailsModalProps) {
  const [answers, setAnswers] = useState(submission?.answers || []);
  const [totalScore, setTotalScore] = useState(submission?.score || 0);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (submission) {
      setAnswers(submission.answers || []);
      setTotalScore(submission.score || 0);
    }
  }, [submission]);

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
        await updateDoc(submissionRef, {
            answers: answers,
            score: totalScore,
        });

        // Notify parent component of the update
        onUpdate({
            ...submission,
            answers,
            score: totalScore,
        });

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
              <div className="space-y-4 border-b pb-6">
                  <h3 className="font-semibold">Candidate Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{submission.candidateEmail}</span>
                      </div>
                      <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{submission.candidateContact || 'N/A'}</span>
                      </div>
                  </div>
                  {submission.candidateResumeUrl && submission.candidateResumeUrl !== 'N/A' && (
                    <div>
                        <Button variant="outline" asChild size="sm">
                            <a href={submission.candidateResumeUrl} target="_blank" rel="noopener noreferrer">
                                <FileText className="mr-2 h-4 w-4" /> View Submitted Resume
                            </a>
                        </Button>
                    </div>
                  )}
              </div>
            )}

            <div className="space-y-4">
                 <h3 className="font-semibold">Answers</h3>
                {answers.map((item, index) => {
                    const isManualGrade = item.isCorrect === null && submission.shouldAutoGrade;
                    return (
                        <div key={item.questionId} className={cn(
                            "space-y-2 p-4 rounded-md border",
                            item.isCorrect === true && "bg-green-50 border-green-200",
                            item.isCorrect === false && "bg-red-50 border-red-200"
                        )}>
                            <div className="flex justify-between items-start">
                               <p className="font-medium flex-1">{index + 1}. {item.questionText}</p>
                               {item.isCorrect === true && <div className="flex items-center gap-1 text-green-600"><Check className="h-4 w-4" /> Correct (+{item.points || 0})</div>}
                               {item.isCorrect === false && <div className="flex items-center gap-1 text-red-600"><X className="h-4 w-4" /> Incorrect</div>}
                            </div>
                            {isUrl(item.answer) ? (
                                <Button variant="outline" asChild>
                                    <a href={item.answer} target="_blank" rel="noopener noreferrer">
                                        <FileText className="mr-2 h-4 w-4" /> View Uploaded File
                                    </a>
                                </Button>
                            ) : (
                                <div className="text-sm text-muted-foreground p-3 bg-background/50 rounded-md whitespace-pre-wrap">
                                    {Array.isArray(item.answer) ? item.answer.join(', ') : (item.answer || <em>No answer provided.</em>)}
                                </div>
                            )}

                             {isManualGrade && (
                                <div className="pt-2">
                                    <Label htmlFor={`score-${item.questionId}`} className="text-xs font-semibold">MANUAL SCORE</Label>
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
             {submission.shouldAutoGrade && <Button onClick={handleSaveChanges} disabled={isSaving}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save Grades
             </Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

