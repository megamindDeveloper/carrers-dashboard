
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import RichTextEditor from '@/components/ui/rich-text-editor';
import type { CollegeCandidate, AssessmentSubmission, EmailTemplate } from '@/lib/types';
import { Loader2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/app/utils/firebase/firebaseConfig';


interface ResetAssessmentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSend: (data: { subject: string; body: string }) => void;
  isSending: boolean;
  candidate: CollegeCandidate | null;
  submission: AssessmentSubmission | null;
}

const emailSchema = z.object({
  subject: z.string().min(1, 'Subject is required'),
  body: z.string().min(1, 'Email body is required'),
});

const defaultEmailBody = `<p>We've received your request to retake the assessment. Your previous submission has been cleared, and you can now access the assessment again.</p><p>Please use the link below to begin. We recommend using a stable internet connection to avoid any further issues.</p>`;

export function ResetAssessmentDialog({ isOpen, onClose, onSend, isSending, candidate, submission }: ResetAssessmentDialogProps) {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);

  const form = useForm<z.infer<typeof emailSchema>>({
    resolver: zodResolver(emailSchema),
    defaultValues: {
        subject: '',
        body: '',
    }
  });
  
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'emailTemplates'), (snapshot) => {
        const fetchedTemplates = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as EmailTemplate));
        setTemplates(fetchedTemplates);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (submission && isOpen) {
      form.reset({
        subject: `Your assessment for ${submission.assessmentTitle} has been reset`,
        body: defaultEmailBody,
      });
    }
  }, [submission, form, isOpen]);

  const handleTemplateSelect = (templateId: string) => {
      const template = templates.find(t => t.id === templateId);
      if (template) {
          form.reset({
              ...form.getValues(),
              subject: template.subject,
              body: template.body,
          });
      }
  };

  const onSubmit = (data: z.infer<typeof emailSchema>) => {
    onSend(data);
  };

  if (!submission || !candidate) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl">
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex h-full flex-col"
          >
            <DialogHeader>
              <DialogTitle>Reset Assessment for {candidate.name}</DialogTitle>
              <DialogDescription>
                Customize the notification email before resetting the submission for the "{submission.assessmentTitle}" assessment.
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[60vh] p-1 pr-4">
              <div className="space-y-4 py-4">
                 <FormItem>
                      <FormLabel>Load from Template (Optional)</FormLabel>
                       <Select onValueChange={handleTemplateSelect}>
                          <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a template to use" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                              {templates.map(template => (
                                  <SelectItem key={template.id} value={template.id}>
                                      {template.name}
                                  </SelectItem>
                              ))}
                          </SelectContent>
                      </Select>
                  </FormItem>

                <FormField control={form.control} name="subject" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Subject</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="body" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Body</FormLabel>
                    <FormControl>
                      <RichTextEditor content={field.value} onChange={field.onChange} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            </ScrollArea>
            <DialogFooter className="pt-4 border-t">
              <Button type="button" variant="outline" onClick={onClose} disabled={isSending}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSending}>
                {isSending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Send Email & Reset
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
