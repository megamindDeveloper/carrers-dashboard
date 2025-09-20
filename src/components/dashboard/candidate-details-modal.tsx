
'use client';

import { useState, useEffect } from 'react';
import type { Candidate, CandidateStatus } from '@/lib/types';
import { CANDIDATE_STATUSES } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, FileText, Video } from 'lucide-react';
import { format } from 'date-fns';
import { ScrollArea } from '../ui/scroll-area';
import { useToast } from '@/hooks/use-toast';


interface CandidateDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidate: Candidate | null;
  onSaveChanges: (candidateId: string, updates: Partial<Candidate>) => void;
}

const toTitleCase = (str: string) => {
    if (!str) return '';
    return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase());
};

export function CandidateDetailsModal({
  isOpen,
  onClose,
  candidate,
  onSaveChanges,
}: CandidateDetailsModalProps) {
  const [selectedStatus, setSelectedStatus] = useState<CandidateStatus | undefined>(undefined);
  const [rejectionReason, setRejectionReason] = useState('');
  const [comments, setComments] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    if (candidate) {
      setSelectedStatus(candidate.status ? toTitleCase(candidate.status as string) as CandidateStatus : undefined);
      setRejectionReason(candidate.rejectionReason || '');
      setComments(candidate.comments || '');
    }
  }, [candidate]);

  if (!candidate) return null;

  const handleSave = () => {
    if (selectedStatus === 'Rejected' && !rejectionReason.trim()) {
        toast({
            variant: "destructive",
            title: "Reason Required",
            description: "Please provide a reason for rejection.",
        });
        return;
    }
    
    const updates: Partial<Candidate> = { comments };

    if (selectedStatus) {
      updates.status = selectedStatus;
    }
    if (selectedStatus === 'Rejected') {
      updates.rejectionReason = rejectionReason;
    } else {
        updates.rejectionReason = '';
    }
    
    onSaveChanges(candidate.id, updates);
    onClose();
  };
  
  const getFormattedDate = (date: any) => {
    if (!date) return 'N/A';
    try {
      if (date.toDate) {
        return format(date.toDate(), 'MMM d, yyyy');
      }
      return format(new Date(date), 'MMM d, yyyy');
    } catch (e) {
      return 'Invalid Date';
    }
  };

  const displayLocation = candidate.city && candidate.state ? `${candidate.city}, ${candidate.state}` : candidate.location;


  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{candidate.fullName}</DialogTitle>
          <DialogDescription>
            {candidate.position} - <span className="capitalize">{candidate.type === 'full-time' ? 'Full-time' : 'Internship'}</span>
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-grow pr-6 -mr-6">
            <div className="grid gap-6 py-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><Label>Email</Label><p className="text-sm break-words">{candidate.email}</p></div>
                <div><Label>Contact</Label><p className="text-sm">{candidate.contactNumber}</p></div>
                <div><Label>WhatsApp</Label><p className="text-sm">{candidate.whatsappNumber}</p></div>
                <div><Label>Location</Label><p className="text-sm">{displayLocation}</p></div>
                <div><Label>Applied On</Label><p className="text-sm">{getFormattedDate(candidate.submittedAt)}</p></div>
              </div>
              <div><Label>Address</Label><p className="text-sm">{`${candidate.address}, ${candidate.city}, ${candidate.state} ${candidate.pincode}`}</p></div>
              <div><Label>Education</Label><p className="text-sm">{candidate.education || 'N/A'}</p></div>
              <div><Label>Experience</Label><p className="text-sm whitespace-pre-wrap">{candidate.experience || candidate.workExperience || 'N/A'}</p></div>
              <div className="flex flex-wrap items-center gap-4">
                {candidate.portfolio && (
                  <Button variant="outline" asChild>
                    <a href={candidate.portfolio} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="mr-2 h-4 w-4" /> View Portfolio
                    </a>
                  </Button>
                )}
                {candidate.resumeUrl && (
                  <Button variant="outline" asChild>
                    <a href={candidate.resumeUrl} target="_blank" rel="noopener noreferrer">
                      <FileText className="mr-2 h-4 w-4" /> View Resume
                    </a>
                  </Button>
                )}
                {candidate.introductionVideoIntern && (
                  <Button variant="outline" asChild>
                    <a href={candidate.introductionVideoIntern} target="_blank" rel="noopener noreferrer">
                      <Video className="mr-2 h-4 w-4" /> View Intro Video
                    </a>
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-1 gap-4 items-end">
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select value={selectedStatus} onValueChange={(value: CandidateStatus) => setSelectedStatus(value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Change status" />
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
              </div>
              {selectedStatus === 'Rejected' && (
                <div>
                  <Label htmlFor="rejectionReason">Rejection Reason</Label>
                  <Textarea
                    id="rejectionReason"
                    placeholder="Provide a reason for rejection... (This will be sent to the candidate)"
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                  />
                </div>
              )}
              {candidate.status === 'Rejected' && candidate.rejectionReason && selectedStatus !== 'Rejected' && (
                  <div>
                    <Label>Previous Rejection Reason</Label>
                    <p className="text-sm text-muted-foreground p-2 border rounded-md">{candidate.rejectionReason}</p>
                  </div>
                )
              }
               <div>
                <Label htmlFor="comments">Internal Comments</Label>
                <Textarea
                  id="comments"
                  placeholder="Add internal notes about the candidate..."
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
        </ScrollArea>
        <DialogFooter className="pt-4 flex-shrink-0">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
