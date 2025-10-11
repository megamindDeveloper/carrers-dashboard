
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
import type { Assessment, EmailTemplate } from '@/lib/types';
import { Loader2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/app/utils/firebase/firebaseConfig';

interface SendAssessmentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSend: (data: { subject:string; body: string; buttonText: string }) => void;
  isSending: boolean;
  assessment: Assessment | undefined;
}

const emailSchema = z.object({
  subject: z.string().min(1, 'Subject is required'),
  body: z.string().min(1, 'Email body is required'),
  buttonText: z.string().min(1, 'Button text is required'),
});

const defaultEmailBody = `<p>As part of our evaluation process, we would like to invite you to complete an online assessment. This will help us better understand your skills and how they align with our requirements.</p><p>Please complete the assessment at your earliest convenience. We wish you the best of luck!</p><p>If you have any questions, please don't hesitate to contact our recruiting team.</p>`;


export function SendAssessmentDialog({ isOpen, onClose, onSend, isSending, assessment }: SendAssessmentDialogProps) {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);

  const form = useForm<z.infer<typeof emailSchema>>({
    resolver: zodResolver(emailSchema),
  });

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'emailTemplates'), (snapshot) => {
        const fetchedTemplates = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as EmailTemplate));
        setTemplates(fetchedTemplates);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (assessment && isOpen) {
      form.reset({
        subject: `Invitation to complete assessment for ${assessment.title}`,
        body: defaultEmailBody,
        buttonText: 'Start Assessment',
      });
    }
  }, [assessment, form, isOpen]);

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
  
  if (!assessment) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl">
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex h-full flex-col"
          >
            <DialogHeader>
              <DialogTitle>Customize & Send Assessment</DialogTitle>
              <DialogDescription>
                Review and edit the email before sending it to candidates for the "{assessment.title}" assessment.
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

                   <FormField control={form.control} name="buttonText" render={({ field }) => (
                      <FormItem>
                      <FormLabel>Button Text</FormLabel>
                      <FormControl><Input {...field} placeholder="e.g., Start Assessment" /></FormControl>
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
                Send Email
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
