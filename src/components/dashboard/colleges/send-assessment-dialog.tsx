
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
import { Textarea } from '@/components/ui/textarea';
import type { Assessment } from '@/lib/types';
import { Loader2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface SendAssessmentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSend: (data: { subject: string; htmlBody: string }) => void;
  isSending: boolean;
  assessment: Assessment | undefined;
}

const emailSchema = z.object({
  subject: z.string().min(1, 'Subject is required'),
  htmlBody: z.string().min(1, 'Email body is required'),
});

const defaultEmailTemplate = `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html dir="ltr" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns="http://www.w3.org/1999/xhtml" lang="en">
 <head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="x-apple-disable-message-reformatting">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="format-detection" content="telephone=no">
  <title>Assessment Invitation</title>
  <style type="text/css">
    body { margin: 0; padding: 0; background-color: #F6F6F6; font-family: verdana, geneva, sans-serif; }
    table { border-collapse: collapse; }
    p { margin: 0; line-height: 21px; color: #333333; font-size: 14px; }
    a { color: #3C3C3C; text-decoration: none; }
    .es-wrapper { width: 100%; background-color: #F6F6F6; }
    .es-content { width: 100%; max-width: 600px; background-color: #FFFFFF; }
    .es-header-img { display: block; width: 100%; height: auto; }
    .es-button { mso-style-priority: 100 !important; text-decoration: none !important; color: #FFFFFF; font-size: 18px; display: inline-block; background: #3C3C3C; border-radius: 5px; font-weight: bold; line-height: 22px; text-align: center; padding: 10px 20px; }
    .es-footer { background-color: #1b1510; color: #ffffff; }
  </style>
 </head>
 <body>
  <div class="es-wrapper">
   <table width="100%" cellspacing="0" cellpadding="0" align="center">
     <tr>
      <td align="center">
       <table class="es-content" align="center" cellpadding="0" cellspacing="0">
         <tr>
          <td align="left" style="padding: 30px;">
           <p>Hi &lt;&lt;Candidate Name&gt;&gt;,</p>
           <br>
           <p>As part of our evaluation process, we would like to invite you to complete an online assessment. This will help us better understand your skills and how they align with our requirements.</p>
           <br>
           <p>
             <strong>Assessment:</strong> &lt;&lt;Assessment Name&gt;&gt; <br>
             <!-- IF passcode --><strong>Passcode:</strong> &lt;&lt;Passcode&gt;&gt;<!-- ENDIF passcode -->
           </p>
           <br>
           <table width="100%" cellspacing="0" cellpadding="0">
             <tr>
               <td align="center" style="padding-top:15px; padding-bottom:15px;">
                 <a href="&lt;&lt;Assessment Link&gt;&gt;&amp;candidateId=&lt;&lt;Candidate ID&gt;&gt;" class="es-button" target="_blank">Start Assessment</a>
               </td>
             </tr>
           </table>
           <br>
           <p>Please complete the assessment at your earliest convenience. If you have any questions, please don't hesitate to contact our recruiting team.</p>
           <br>
           <p>Warm regards,<br><strong>MegaMind Recruiting Team</strong></p>
          </td>
         </tr>
       </table>
      </td>
     </tr>
   </table>
  </div>
 </body>
</html>
`;

export function SendAssessmentDialog({ isOpen, onClose, onSend, isSending, assessment }: SendAssessmentDialogProps) {
  
  const form = useForm<z.infer<typeof emailSchema>>({
    resolver: zodResolver(emailSchema),
  });

  useEffect(() => {
    if (assessment) {
      form.reset({
        subject: `Invitation to complete assessment for ${assessment.title}`,
        htmlBody: defaultEmailTemplate,
      });
    }
  }, [assessment, form, isOpen]);

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
                  <FormField control={form.control} name="subject" render={({ field }) => (
                      <FormItem>
                      <FormLabel>Email Subject</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                      </FormItem>
                  )} />

                  <FormField control={form.control} name="htmlBody" render={({ field }) => (
                      <FormItem>
                      <FormLabel>Email Body (HTML)</FormLabel>
                      <FormControl><Textarea {...field} className="min-h-[300px] font-mono text-xs" /></FormControl>
                      <FormMessage />
                      </FormItem>
                  )} />
              </div>
            </ScrollArea>
            <DialogFooter className="pt-4">
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
