'use client';

import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
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
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import type { Assessment } from '@/lib/types';
import { Loader2, PlusCircle, Trash2, Wand2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

interface AddEditAssessmentSheetProps {
  isOpen: boolean;
  onClose: () => void;
  assessment: Assessment | null;
  onSave: (assessmentData: Omit<Assessment, 'id' | 'createdAt'>, existingId?: string) => Promise<void>;
}

const assessmentSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  passcode: z.string().min(4, 'Passcode must be at least 4 characters long'),
  timeLimit: z.coerce.number().min(1, 'Time limit must be at least 1 minute'),
  questions: z.array(z.object({
    id: z.string(),
    text: z.string().min(1, "Question text cannot be empty"),
  })).min(1, "At least one question is required"),
});

const generatePasscode = () => Math.random().toString(36).substring(2, 8).toUpperCase();


export function AddEditAssessmentSheet({ isOpen, onClose, assessment, onSave }: AddEditAssessmentSheetProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof assessmentSchema>>({
    resolver: zodResolver(assessmentSchema),
    defaultValues: {
      title: '',
      passcode: generatePasscode(),
      timeLimit: 30,
      questions: [{ id: uuidv4(), text: '' }],
    },
  });

  const { fields: questionsFields, append: appendQuestion, remove: removeQuestion } = useFieldArray({
    control: form.control,
    name: "questions"
  });

  useEffect(() => {
    if (isOpen) {
      if (assessment) {
        form.reset({
          ...assessment
        });
      } else {
        form.reset({
          title: '',
          passcode: generatePasscode(),
          timeLimit: 30,
          questions: [{ id: uuidv4(), text: 'Please introduce yourself and walk us through your resume.' }],
        });
      }
    }
  }, [assessment, isOpen, form]);

  const onSubmit = async (data: z.infer<typeof assessmentSchema>) => {
    setIsProcessing(true);
    try {
      await onSave(data, assessment?.id);
    } catch (error) {
       // Error toast is handled in parent
    } finally {
      setIsProcessing(false);
    }
  };
  
  const handleGeneratePasscode = () => {
    form.setValue('passcode', generatePasscode());
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-3xl">
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex h-full flex-col"
          >
            <SheetHeader>
              <SheetTitle>{assessment ? 'Edit Assessment' : 'Create New Assessment'}</SheetTitle>
              <SheetDescription>
                Fill in the details for the assessment. Candidates will see these questions and settings.
              </SheetDescription>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto p-1 pr-6 space-y-4 py-4">
              <FormField control={form.control} name="title" render={({ field }) => (
                <FormItem>
                  <FormLabel>Assessment Title</FormLabel>
                  <FormControl><Input placeholder="e.g., Frontend Developer Screening" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField control={form.control} name="passcode" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Passcode</FormLabel>
                    <div className="flex items-center gap-2">
                        <FormControl><Input placeholder="e.g., FDEV24" {...field} /></FormControl>
                        <Button type="button" variant="outline" size="icon" onClick={handleGeneratePasscode}>
                            <Wand2 className="h-4 w-4" />
                        </Button>
                    </div>
                    <FormDescription>Candidates must enter this to start.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="timeLimit" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Time Limit (minutes)</FormLabel>
                    <FormControl><Input type="number" {...field} /></FormControl>
                    <FormDescription>The total time for the assessment.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <div className="space-y-4 pt-4 border-t">
                <FormLabel>Questions</FormLabel>
                {questionsFields.map((field, index) => (
                  <FormField
                    key={field.id}
                    control={form.control}
                    name={`questions.${index}.text`}
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-start gap-2">
                           <FormLabel className="pt-3 text-sm text-muted-foreground">{index + 1}.</FormLabel>
                            <FormControl>
                                <Textarea {...field} placeholder={`Enter question ${index + 1}...`} className="min-h-[60px]" />
                            </FormControl>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => removeQuestion(index)}
                                className="mt-1"
                            >
                                <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                        </div>
                         <FormMessage className="ml-6" />
                      </FormItem>
                    )}
                  />
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => appendQuestion({ id: uuidv4(), text: '' })}
                >
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add Question
                </Button>
              </div>
            </div>
            <SheetFooter className="pt-4">
              <SheetClose asChild>
                <Button type="button" variant="outline" disabled={isProcessing}>
                  Cancel
                </Button>
              </SheetClose>
              <Button type="submit" disabled={isProcessing}>
                {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Save Assessment
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}

// Add this to your project if you don't have it, e.g., in a utils file
// npm install uuid
// npm install -D @types/uuid
