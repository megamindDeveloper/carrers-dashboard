
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
import { ExternalLink, FileText } from 'lucide-react';
import { format } from 'date-fns';

interface CandidateDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidate: Candidate | null;
  onStatusChange: (candidateId: string, status: CandidateStatus, reason?: string) => void;
}

export function CandidateDetailsModal({
  isOpen,
  onClose,
  candidate,
  onStatusChange,
}: CandidateDetailsModalProps) {
  const [selectedStatus, setSelectedStatus] = useState<CandidateStatus | undefined>(candidate?.status);
  const [rejectionReason, setRejectionReason] = useState(candidate?.rejectionReason || '');

  useEffect(() => {
    if (candidate) {
      setSelectedStatus(candidate.status);
      setRejectionReason(candidate.rejectionReason || '');
    }
  }, [candidate]);

  if (!candidate) return null;

  const handleSave = () => {
    if (selectedStatus) {
      onStatusChange(candidate.id, selectedStatus, rejectionReason);
    }
    onClose();
  };
  
  const getFormattedDate = (date: any) => {
    if (!date) return 'N/A';
    try {
      // Firestore Timestamps can be converted to JS Date with toDate()
      if (date.toDate) {
        return format(date.toDate(), 'MMM d, yyyy');
      }
      // Or if it's already a string or a Date object
      return format(new Date(date), 'MMM d, yyyy');
    } catch (e) {
      return 'Invalid Date';
    }
  };


  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{candidate.fullName}</DialogTitle>
          <DialogDescription>
            {candidate.position} - <span className="capitalize">{candidate.type === 'emp' ? 'Full-time' : 'Intern'}</span>
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Email</Label><p className="text-sm">{candidate.email}</p></div>
            <div><Label>Contact</Label><p className="text-sm">{candidate.contactNumber}</p></div>
            <div><Label>Location</Label><p className="text-sm">{candidate.location}</p></div>
            <div><Label>Applied On</Label><p className="text-sm">{getFormattedDate(candidate.submittedAt)}</p></div>
          </div>
          <div><Label>Address</Label><p className="text-sm">{candidate.address}</p></div>
          <div><Label>Education</Label><p className="text-sm">{candidate.education}</p></div>
          <div><Label>Work Experience</Label><p className="text-sm whitespace-pre-wrap">{candidate.workExperience}</p></div>
          <div className="flex items-center gap-4">
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
          </div>
          <div className="grid grid-cols-2 gap-4 items-end">
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
                placeholder="Provide a reason for rejection..."
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
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
