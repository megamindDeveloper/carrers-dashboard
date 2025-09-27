
'use client';

import { useState, useEffect } from 'react';
import { useForm, useFieldArray, Control, useWatch } from 'react-hook-form';
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
    questions: z.array(questionSchema).min(1, "Each section must have at least one question"),
});

const assessmentSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  passcode: z.string().optional(),
  timeLimit: z.coerce.number().optional(),
  sections: z.array(sectionSchema).min(1, "At least one section is required"),
});

type AssessmentFormValues = z.infer<typeof assessmentSchema>;

const generatePasscode = () => Math.random().toString(36).substring(2, 8).toUpperCase();


export function AddEditAssessmentSheet({ isOpen, onClose, assessment, onSave }: AddEditAssessmentSheetProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const form = useForm<AssessmentFormValues>({
    resolver: zodResolver(assessmentSchema),
    defaultValues: {
      title: '',
      passcode: '',
      timeLimit: 30,
      sections: [{ id: uuidv4(), title: 'General Questions', questions: [{ id: uuidv4(), text: '', type: 'text' }] }],
    },
  });

  const { fields: sectionFields, append: appendSection, remove: removeSection } = useFieldArray({
    control: form.control,
    name: "sections"
  });

  useEffect(() => {
    if (isOpen) {
      if (assessment) {
        form.reset({
          ...assessment,
          timeLimit: assessment.timeLimit || undefined,
          sections: assessment.sections.map(s => ({
            ...s,
            questions: s.questions.map(q => ({
              ...q,
              options: q.options?.map(opt => ({ value: opt }))
            }))
          }))
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

  const onSubmit = async (data: AssessmentFormValues) => {
    setIsProcessing(true);
    try {
       const assessmentData = {
        ...data,
        timeLimit: data.timeLimit || null,
        sections: data.sections.map(section => ({
            ...section,
            questions: section.questions.map(q => {
                const newQ: any = { ...q };
                if (q.type === 'multiple-choice' && newQ.options) {
                    newQ.options = newQ.options.map((opt: {value: string}) => opt.value);
                } else {
                    delete newQ.options;
                }
                return newQ;
            })
        }))
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
      <SheetContent className="w-full sm:max-w-4xl">
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex h-full flex-col"
          >
            <SheetHeader>
              <SheetTitle>{assessment ? 'Edit Assessment' : 'Create New Assessment'}</SheetTitle>
              <SheetDescription>
                Fill in the details, add sections, and then add questions to each section.
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

              <div className="space-y-6 pt-4 border-t">
                <FormLabel className="text-lg font-semibold">Sections</FormLabel>
                {sectionFields.map((section, sectionIndex) => (
                    <div key={section.id} className="p-4 border rounded-lg space-y-4 bg-muted/30 relative">
                        <div className="flex items-center justify-between">
                            <FormField
                                control={form.control}
                                name={`sections.${sectionIndex}.title`}
                                render={({ field }) => (
                                    <FormItem className="flex-grow">
                                        <FormLabel>Section {sectionIndex + 1} Title</FormLabel>
                                        <FormControl>
                                            <Input {...field} placeholder={`e.g., Technical Questions`} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                             <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => removeSection(sectionIndex)}
                                className="ml-2 mt-8"
                            >
                                <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                        </div>
                        <QuestionsField sectionIndex={sectionIndex} control={form.control} />
                    </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => appendSection({ id: uuidv4(), title: '', questions: [{ id: uuidv4(), text: '', type: 'text' }] })}
                >
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add Section
                </Button>
                 <FormMessage>{form.formState.errors.sections?.root?.message}</FormMessage>
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

function QuestionsField({ sectionIndex, control }: { sectionIndex: number, control: Control<AssessmentFormValues> }) {
    const { fields, append, remove } = useFieldArray({
        control,
        name: `sections.${sectionIndex}.questions`
    });

    return (
        <div className="space-y-4 pl-2 border-l-2 ml-2">
             <FormLabel>Questions</FormLabel>
            {fields.map((question, questionIndex) => (
               <QuestionItem
                  key={question.id}
                  sectionIndex={sectionIndex}
                  questionIndex={questionIndex}
                  control={control}
                  onRemove={() => remove(questionIndex)}
                />
            ))}
             <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ id: uuidv4(), text: '', type: 'text' })}
            >
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Question
            </Button>
        </div>
    )
}

function QuestionItem({ sectionIndex, questionIndex, control, onRemove }: { sectionIndex: number, questionIndex: number, control: Control<AssessmentFormValues>, onRemove: () => void }) {
  const questionType = useWatch({
    control,
    name: `sections.${sectionIndex}.questions.${questionIndex}.type`
  });

  return (
    <div className="p-4 border rounded-lg space-y-4 bg-background relative">
        <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onRemove}
            className="absolute top-2 right-2"
        >
            <X className="h-4 w-4 text-muted-foreground" />
        </Button>
        <FormField
            control={control}
            name={`sections.${sectionIndex}.questions.${questionIndex}.text`}
            render={({ field }) => (
                <FormItem>
                <FormLabel>Question {questionIndex + 1}</FormLabel>
                <FormControl>
                    <Textarea {...field} placeholder={`Enter question text...`} />
                </FormControl>
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
        {questionType === 'multiple-choice' && (
            <OptionsField sectionIndex={sectionIndex} questionIndex={questionIndex} control={control} />
        )}
    </div>
  );
}


function OptionsField({ sectionIndex, questionIndex, control }: { sectionIndex: number, questionIndex: number, control: Control<AssessmentFormValues> }) {
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
