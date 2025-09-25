'use client';

import type { AssessmentSubmission } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ExternalLink, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';

interface SubmissionDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  submission: AssessmentSubmission | null;
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
    try {
        new URL(str);
        return true;
    } catch (_) {
        return false;
    }
}

export function SubmissionDetailsModal({ isOpen, onClose, submission }: SubmissionDetailsModalProps) {
  if (!submission) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl flex flex-col max-h-[90vh]">
         <DialogHeader>
            <DialogTitle>{submission.candidateName}'s Submission</DialogTitle>
            <DialogDescription>
                For assessment: {submission.assessmentTitle}
                <div className="text-xs text-muted-foreground mt-1">
                    Submitted on {getFormattedDate(submission.submittedAt)} | Time Taken: {formatTime(submission.timeTaken)}
                </div>
            </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-6 space-y-6 py-4">
            {submission.answers.map((item, index) => (
                <div key={item.questionId} className="space-y-2">
                    <p className="font-semibold">{index + 1}. {item.questionText}</p>
                    {isUrl(item.answer) ? (
                         <Button variant="outline" asChild>
                            <a href={item.answer} target="_blank" rel="noopener noreferrer">
                                <FileText className="mr-2 h-4 w-4" /> View Uploaded File
                            </a>
                        </Button>
                    ) : (
                        <div className="text-sm text-muted-foreground p-3 bg-muted/50 rounded-md whitespace-pre-wrap">
                            {item.answer || <em>No answer provided.</em>}
                        </div>
                    )}
                </div>
            ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
