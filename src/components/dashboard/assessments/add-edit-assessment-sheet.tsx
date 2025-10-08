
'use client';

import { useState, useEffect } from 'react';
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
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
import type { Assessment, QuestionType, AssessmentSection } from '@/lib/types';
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

const sectionSchema = z.object({
    id: z.string(),
    title: z.string().min(1, "Section title cannot be empty"),
    questions: z.array(questionSchema).min(1, "At least one question is required per section"),
});

const assessmentSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  passcode: z.string().optional(),
  timeLimit: z.coerce.number().optional(),
  sections: z.array(sectionSchema).min(1, "At least one section is required"),
});

const generatePasscode = () => Math.random().toString(36).substring(2, 8).toUpperCase();

export function AddEditAssessmentSheet({ isOpen, onClose, assessment, onSave }: AddEditAssessmentSheetProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof assessmentSchema>>({
    resolver: zodResolver(assessmentSchema),
    mode: 'onChange',
  });

  const { fields: sectionsFields, append: appendSection, remove: removeSection } = useFieldArray({
    control: form.control,
    name: "sections"
  });


  useEffect(() => {
    if (isOpen) {
      if (assessment) {
        let sections = assessment.sections;

        // Backward compatibility: If sections don't exist but questions do, create a default section.
        if (!sections && (assessment as any).questions) {
            sections = [{ id: 'default', title: 'General Questions', questions: (assessment as any).questions }];
        }

        form.reset({
          ...assessment,
          timeLimit: assessment.timeLimit || undefined,
          sections: sections?.map(s => ({
              ...s,
              questions: s.questions.map(q => ({
                  ...q,
                  options: q.options?.map(opt => ({ value: opt }))
              }))
          })) || []
        });
      } else {
        form.reset({
          title: '',
          passcode: '',
          timeLimit: 30,
          sections: [{ 
              id: uuidv4(), 
              title: 'General Questions', 
              questions: [{ id: uuidv4(), text: 'Please introduce yourself and walk us through your resume.', type: 'text' }]
          }],
        });
      }
    }
  }, [assessment, isOpen, form]);

  const onSubmit = async (data: z.infer<typeof assessmentSchema>) => {
    setIsProcessing(true);
    try {
       const assessmentData = {
        ...data,
        timeLimit: data.timeLimit || null,
        sections: data.sections.map(s => ({
            ...s,
            questions: s.questions.map(q => {
                const newQ: any = { ...q };
                if (q.type === 'multiple-choice') {
                    newQ.options = q.options?.map(opt => opt.value);
                } else {
                    delete newQ.options;
                }
                return newQ;
            }),
        }))
      };
      await onSave(assessmentData, assessment?.id);
    } catch (error) {
       // Error toast is handled in parent
    } finally {
      setIsProcessing(false);
    }
  };
  
  const handleGeneratePasscode = () => form.setValue('passcode', generatePasscode());

  const addSection = () => appendSection({ id: uuidv4(), title: `New Section ${sectionsFields.length + 1}`, questions: [{ id: uuidv4(), text: '', type: 'text' }] });

  const deleteSection = (index: number) => {
      removeSection(index);
  };


  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-4xl">
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex h-full flex-col"
          >
            <SheetHeader>
              <SheetTitle>{assessment ? 'Edit Assessment' : 'Create New Assessment'}</SheetTitle>
              <SheetDescription>
                Fill in the details below. You can add multiple sections with questions.
              </SheetDescription>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto p-1 pr-6 space-y-6 py-4">
              {/* Assessment Details */}
              <div className="space-y-4 p-4 border rounded-lg">
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
                      <FormLabel>Passcode (Optional)</FormLabel>
                      <div className="flex items-center gap-2">
                          <FormControl><Input placeholder="e.g., FDEV24" {...field} /></FormControl>
                          <Button type="button" variant="outline" size="icon" onClick={handleGeneratePasscode}>
                              <Wand2 className="h-4 w-4" />
                          </Button>
                      </div>
                      <FormDescription>Leave blank for no passcode.</FormDescription>
                      <FormMessage />
                  </FormItem>
                  )} />

                  <FormField control={form.control} name="timeLimit" render={({ field }) => (
                  <FormItem>
                      <FormLabel>Time Limit in Minutes (Optional)</FormLabel>
                      <FormControl><Input type="number" {...field} /></FormControl>
                      <FormDescription>Leave blank for no time limit.</FormDescription>
                      <FormMessage />
                  </FormItem>
                  )} />
              </div>
              </div>

              {/* Sections */}
              <div className="space-y-4">
                {sectionsFields.map((section, sectionIndex) => (
                    <div key={section.id}>
                        <div className="p-4 border rounded-lg space-y-4 bg-muted/50 relative">
                              <div className="flex justify-between items-center">
                                <FormField
                                    control={form.control}
                                    name={`sections.${sectionIndex}.title`}
                                    render={({ field }) => (
                                        <FormItem className="flex-grow">
                                            <FormLabel>Section {sectionIndex + 1} Title</FormLabel>
                                            <FormControl>
                                                <Input {...field} className="text-lg font-semibold" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                {sectionsFields.length > 1 && (
                                    <Button type="button" variant="destructive" size="sm" onClick={() => deleteSection(sectionIndex)} className="ml-4 self-end mb-1">
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>
                            <QuestionsField sectionIndex={sectionIndex} control={form.control} form={form} />
                        </div>
                    </div>
                ))}
              </div>

              <Button type="button" variant="outline" onClick={addSection}>
                  <PlusCircle className="mr-2 h-4 w-4" /> Add Another Section
              </Button>
            </div>

            <SheetFooter className="pt-4">
                <SheetClose asChild><Button type="button" variant="ghost" disabled={isProcessing}>Cancel</Button></SheetClose>
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

function QuestionsField({ sectionIndex, control, form }: { sectionIndex: number, control: any, form: any }) {
    const { fields, append, remove } = useFieldArray({
        control,
        name: `sections.${sectionIndex}.questions`
    });

    return (
        <div className="space-y-4 pt-4 border-t">
            <FormLabel>Questions</FormLabel>
            {fields.map((field, questionIndex) => (
                <div key={field.id} className="p-4 border rounded-md bg-background/50 space-y-4 relative">
                    <Button type="button" variant="ghost" size="icon" onClick={() => remove(questionIndex)} className="absolute top-2 right-2">
                        <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                    <FormField
                        control={control}
                        name={`sections.${sectionIndex}.questions.${questionIndex}.text`}
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Question {questionIndex + 1}</FormLabel>
                                <FormControl><Textarea {...field} placeholder={`Enter question text...`} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={control}
                        name={`sections.${sectionIndex}.questions.${questionIndex}.type`}
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Answer Type</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Select an answer type" /></SelectTrigger></FormControl>
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
                     {form.watch(`sections.${sectionIndex}.questions.${questionIndex}.type`) === 'multiple-choice' && (
                        <OptionsField sectionIndex={sectionIndex} questionIndex={questionIndex} control={control} />
                    )}
                </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => append({ id: uuidv4(), text: '', type: 'text' })}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add Question
            </Button>
        </div>
    );
}


function OptionsField({ sectionIndex, questionIndex, control }: { sectionIndex: number, questionIndex: number, control: any }) {
    const { fields, remove, append } = useFieldArray({
        control,
        name: `sections.${sectionIndex}.questions.${questionIndex}.options`
    });

    return (
        <div className="space-y-2 pl-2 border-l-2">
            <FormLabel>Options</FormLabel>
            {fields.map((item, k) => (
                <div key={item.id} className="flex items-center gap-2">
                    <FormField
                        control={control}
                        name={`sections.${sectionIndex}.questions.${questionIndex}.options.${k}.value`}
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
             <Button type="button" variant="outline" size="sm" onClick={() => append({ value: "" })}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add Option
            </Button>
             <FormMessage />
        </div>
    )
}

    