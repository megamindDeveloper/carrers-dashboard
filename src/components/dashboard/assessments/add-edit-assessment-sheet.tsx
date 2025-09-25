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
import type { Assessment, QuestionType } from '@/lib/types';
import { QUESTION_TYPES } from '@/lib/types';
import { Loader2, PlusCircle, Trash2, Wand2, X } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface AddEditAssessmentSheetProps {
  isOpen: boolean;
  onClose: () => void;
  assessment: Assessment | null;
  onSave: (assessmentData: Omit<Assessment, 'id' | 'createdAt'>, existingId?: string) => Promise<void>;
}

const questionSchema = z.object({
  id: z.string(),
  text: z.string().min(1, "Question text cannot be empty"),
  type: z.enum(QUESTION_TYPES),
  options: z.array(z.object({ value: z.string().min(1, "Option cannot be empty") })).optional(),
}).superRefine((data, ctx) => {
    if (data.type === 'multiple-choice' && (!data.options || data.options.length < 2)) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['options'],
            message: 'Multiple choice questions must have at least 2 options.',
        });
    }
});

const assessmentSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  passcode: z.string().min(4, 'Passcode must be at least 4 characters long'),
  timeLimit: z.coerce.number().min(1, 'Time limit must be at least 1 minute'),
  questions: z.array(questionSchema).min(1, "At least one question is required"),
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
      questions: [{ id: uuidv4(), text: '', type: 'text' }],
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
          ...assessment,
          questions: assessment.questions.map(q => ({
              ...q,
              options: q.options?.map(opt => ({ value: opt }))
          }))
        });
      } else {
        form.reset({
          title: '',
          passcode: generatePasscode(),
          timeLimit: 30,
          questions: [{ id: uuidv4(), text: 'Please introduce yourself and walk us through your resume.', type: 'text' }],
        });
      }
    }
  }, [assessment, isOpen, form]);

  const onSubmit = async (data: z.infer<typeof assessmentSchema>) => {
    setIsProcessing(true);
    try {
       const assessmentData = {
        ...data,
        questions: data.questions.map(q => ({
          ...q,
          options: q.type === 'multiple-choice' ? q.options?.map(opt => opt.value) : undefined,
        })),
      };
      await onSave(assessmentData, assessment?.id);
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
                    <div key={field.id} className="p-4 border rounded-lg space-y-4 bg-muted/50 relative">
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeQuestion(index)}
                            className="absolute top-2 right-2"
                        >
                            <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>

                        <FormField
                            control={form.control}
                            name={`questions.${index}.text`}
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Question {index + 1}</FormLabel>
                                <FormControl>
                                    <Textarea {...field} placeholder={`Enter question text...`} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name={`questions.${index}.type`}
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Answer Type</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger><SelectValue placeholder="Select an answer type" /></SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="text">Text Answer</SelectItem>
                                        <SelectItem value="multiple-choice">Multiple Choice</SelectItem>
                                        <SelectItem value="file-upload">File Upload</SelectItem>
                                    </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {form.watch(`questions.${index}.type`) === 'multiple-choice' && (
                            <OptionsField nestIndex={index} control={form.control} />
                        )}
                    </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => appendQuestion({ id: uuidv4(), text: '', type: 'text' })}
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

function OptionsField({ nestIndex, control }: { nestIndex: number, control: any }) {
    const { fields, remove, append } = useFieldArray({
        control,
        name: `questions.${nestIndex}.options`
    });

    return (
        <div className="space-y-2 pl-2 border-l-2">
            <FormLabel>Options</FormLabel>
            {fields.map((item, k) => (
                <div key={item.id} className="flex items-center gap-2">
                    <FormField
                        control={control}
                        name={`questions.${nestIndex}.options.${k}.value`}
                        render={({ field }) => (
                            <FormItem className="flex-grow">
                                <FormControl>
                                    <Input {...field} placeholder={`Option ${k + 1}`} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <Button type="button" variant="ghost" size="icon" onClick={() => remove(k)}>
                        <X className="h-4 w-4 text-muted-foreground" />
                    </Button>
                </div>
            ))}
             <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ value: "" })}
                >
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Option
            </Button>
             <FormMessage />
        </div>
    )
}
