
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type * as z from 'zod';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetClose,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import type { EmailTemplate } from '@/lib/types';
import { TemplateSchema } from '@/lib/types';
import { Loader2 } from 'lucide-react';
import RichTextEditor from '@/components/ui/rich-text-editor';
import { ScrollArea } from '@/components/ui/scroll-area';

interface AddEditTemplateSheetProps {
  isOpen: boolean;
  onClose: () => void;
  template: EmailTemplate | null;
  onSave: (templateData: Omit<EmailTemplate, 'id' | 'createdAt'>, existingId?: string) => Promise<void>;
}

export function AddEditTemplateSheet({ isOpen, onClose, template, onSave }: AddEditTemplateSheetProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  
  const form = useForm<z.infer<typeof TemplateSchema>>({
    resolver: zodResolver(TemplateSchema),
    defaultValues: {
      name: '',
      subject: '',
      body: '',
    },
  });

  useEffect(() => {
    if (isOpen) {
      if (template) {
        form.reset(template);
      } else {
        form.reset({
          name: '',
          subject: '',
          body: '<p>Hi [[Candidate Name]],</p><p></p><p>Warm regards,<br>Megamind Recruiting Team</p>',
        });
      }
    }
  }, [template, isOpen, form]);

  const onSubmit = async (data: z.infer<typeof TemplateSchema>) => {
    setIsProcessing(true);
    try {
      await onSave(data, template?.id);
    } catch (error) {
       // Error toast is handled in parent
    } finally {
      setIsProcessing(false);
    }
  };
  
  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-3xl flex flex-col">
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex h-full flex-col"
          >
            <SheetHeader>
              <SheetTitle>{template ? 'Edit Email Template' : 'Create New Email Template'}</SheetTitle>
              <SheetDescription>
                Design a reusable email template. Use placeholders like [[Candidate Name]] or [[Assessment Name]].
              </SheetDescription>
            </SheetHeader>
            <ScrollArea className="flex-1 pr-6">
            <div className="space-y-4 py-4">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Template Name</FormLabel>
                  <FormControl><Input placeholder="e.g., Initial Assessment Invitation" {...field} /></FormControl>
                   <FormDescription>This is for your internal reference only.</FormDescription>
                  <FormMessage />
                </FormItem>
              )} />
               <FormField control={form.control} name="subject" render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Subject</FormLabel>
                  <FormControl><Input placeholder="e.g., Invitation to Complete an Assessment" {...field} /></FormControl>
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
            <SheetFooter className="pt-4 border-t">
              <SheetClose asChild>
                <Button type="button" variant="outline" disabled={isProcessing}>
                  Cancel
                </Button>
              </SheetClose>
              <Button type="submit" disabled={isProcessing}>
                {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Save Template
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
