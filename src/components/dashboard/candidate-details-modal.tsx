'use client';

import { useState, useEffect } from 'react';
import type { Candidate, CandidateStatus, CandidateType } from '@/lib/types';
import { CANDIDATE_STATUSES, CANDIDATE_TYPES, CandidateUpdateSchema } from '@/lib/types';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type * as z from 'zod';
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
import { ExternalLink, FileText, Share2, Loader2, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../ui/form';
import { Input } from '../ui/input';

interface CandidateDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidate: Candidate | null;
  onSaveChanges: (candidateId: string, updates: Partial<Candidate>) => void;
  onDelete: (candidateId: string, candidateName: string) => void;
}

type CandidateUpdateForm = z.infer<typeof CandidateUpdateSchema>;

const toTitleCase = (str: string) => {
  if (!str) return '';
  return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase());
};

export function CandidateDetailsModal({
  isOpen,
  onClose,
  candidate,
  onSaveChanges,
  onDelete,
}: CandidateDetailsModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  
  const form = useForm<CandidateUpdateForm>({
    resolver: zodResolver(CandidateUpdateSchema),
  });

  useEffect(() => {
    if (candidate) {
      form.reset({
        fullName: candidate.fullName || '',
        email: candidate.email || '',
        contactNumber: candidate.contactNumber || '',
        whatsappNumber: candidate.whatsappNumber || '',
        address: candidate.address || '',
        city: candidate.city || '',
        state: candidate.state || '',
        pincode: candidate.pincode || '',
        education: candidate.education || '',
        experience: candidate.experience || candidate.workExperience || '',
        position: candidate.position || '',
        portfolio: candidate.portfolio || '',
        introductionVideoIntern: candidate.introductionVideoIntern || '',
        status: candidate.status ? toTitleCase(candidate.status as string) as CandidateStatus : 'Applied',
        type: candidate.type || 'full-time',
        rejectionReason: candidate.rejectionReason || '',
        comments: candidate.comments || '',
      });
    }
  }, [candidate, form]);

  if (!candidate) return null;

  const handleShare = () => {
    const shareUrl = `${window.location.origin}/share/candidate/${candidate.id}`;
    navigator.clipboard.writeText(shareUrl);
    toast({
      title: 'Link Copied!',
      description: "A shareable link has been copied to your clipboard.",
    });
  };

  const onSubmit = async (data: CandidateUpdateForm) => {
    setIsProcessing(true);
    if (data.status === 'Rejected' && !data.rejectionReason?.trim()) {
      toast({
        variant: "destructive",
        title: "Reason Required",
        description: "Please provide a reason for rejection.",
      });
      form.setFocus('rejectionReason');
      setIsProcessing(false);
      return;
    }

    const updates: Partial<Candidate> = { ...data };
    if (data.status !== 'Rejected') {
      updates.rejectionReason = '';
    }

    await onSaveChanges(candidate.id, updates);
    setIsProcessing(false);
    // The parent component will handle closing the modal after save.
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

  const currentStatus = form.watch('status');

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl flex flex-col max-h-[90vh]">
         <DialogHeader>
          <div className="flex justify-between items-start">
            <div>
              <DialogTitle>{candidate.fullName}</DialogTitle>
              <DialogDescription>
                Applied for {candidate.position} on {getFormattedDate(candidate.submittedAt)}
              </DialogDescription>
            </div>
            <Button variant="outline" size="sm" onClick={handleShare}>
              <Share2 className="mr-2 h-4 w-4" />
              Share
            </Button>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 overflow-y-auto pr-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField control={form.control} name="fullName" render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField control={form.control} name="contactNumber" render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact Number</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="whatsappNumber" render={({ field }) => (
                <FormItem>
                  <FormLabel>WhatsApp Number</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            
            <FormField control={form.control} name="address" render={({ field }) => (
              <FormItem>
                <FormLabel>Address</FormLabel>
                <FormControl><Input {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <FormField control={form.control} name="city" render={({ field }) => (
                  <FormItem><FormLabel>City</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="state" render={({ field }) => (
                  <FormItem><FormLabel>State</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="pincode" render={({ field }) => (
                  <FormItem><FormLabel>Pincode</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>

            <FormField control={form.control} name="education" render={({ field }) => (
              <FormItem>
                <FormLabel>Education</FormLabel>
                <FormControl><Input {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="experience" render={({ field }) => (
              <FormItem>
                <FormLabel>Experience</FormLabel>
                <FormControl><Textarea {...field} className="min-h-[100px]" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="position" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Position Applied For</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="type" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Candidate Type</FormLabel>
                     <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CANDIDATE_TYPES.map(type => (
                          <SelectItem key={type} value={type} className="capitalize">
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
            </div>

            <FormField control={form.control} name="portfolio" render={({ field }) => (
                <FormItem>
                  <FormLabel>Portfolio/Link</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
            )} />

             {candidate.type === 'internship' && (
              <FormField control={form.control} name="introductionVideoIntern" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Intro Video Link</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
             )}

            <div className="flex flex-wrap items-center gap-4 py-4">
              {candidate.resumeUrl && (
                <Button variant="outline" asChild>
                  <a href={candidate.resumeUrl} target="_blank" rel="noopener noreferrer">
                    <FileText className="mr-2 h-4 w-4" /> View Resume
                  </a>
                </Button>
              )}
            </div>
            
            <div className="space-y-4 pt-4 border-t">
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
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
                    <FormMessage />
                  </FormItem>
                )}
              />

              {currentStatus === 'Rejected' && (
                 <FormField
                  control={form.control}
                  name="rejectionReason"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rejection Reason</FormLabel>
                       <FormControl>
                         <Textarea
                          placeholder="Provide a reason for rejection... (This will be sent to the candidate)"
                          {...field}
                         />
                       </FormControl>
                       <FormMessage />
                    </FormItem>
                  )}
                 />
              )}

              <FormField
                control={form.control}
                name="comments"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Internal Comments</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Add internal notes about the candidate..."
                        className="mt-1"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
             <DialogFooter className="flex-col-reverse sm:flex-row sm:justify-between items-center pt-6">
                <Button
                    type="button"
                    variant="destructive"
                    onClick={() => onDelete(candidate.id, candidate.fullName)}
                    disabled={isProcessing}
                >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Candidate
                </Button>
                <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
                    <Button type="button" variant="outline" onClick={onClose} disabled={isProcessing}>Cancel</Button>
                    <Button type="submit" disabled={isProcessing}>
                    {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Changes
                    </Button>
                </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
