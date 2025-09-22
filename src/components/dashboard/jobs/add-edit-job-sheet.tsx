
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
import type { Job, JobStatus } from '@/lib/types';
import { JOB_STATUSES, JOB_TYPES } from '@/lib/types';
import { Loader2, PlusCircle, Trash2, X } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface AddEditJobSheetProps {
  isOpen: boolean;
  onClose: () => void;
  job: Job | null;
  onSave: (jobData: Omit<Job, 'id' | 'createdAt'>) => void;
}

const jobSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  icon: z.string().min(1, 'Icon name is required'),
  openings: z.coerce.number().min(1, 'At least one opening is required'),
  experience: z.string().min(1, 'Experience is required'),
  location: z.string().min(1, 'Location is required'),
  highlightPoints: z.array(z.object({ value: z.string().min(1, "Highlight point cannot be empty") })).min(1, "At least one highlight point is required"),
  responsibilities: z.array(z.object({ value: z.string().min(1, "Responsibility cannot be empty") })).min(1, "At least one responsibility is required"),
  requiredSkills: z.array(z.object({ value: z.string().min(1, "Required skill cannot be empty") })).min(1, "At least one required skill is required"),
  status: z.enum(JOB_STATUSES),
  type: z.enum(JOB_TYPES),
});

export function AddEditJobSheet({ isOpen, onClose, job, onSave }: AddEditJobSheetProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof jobSchema>>({
    resolver: zodResolver(jobSchema),
    defaultValues: {
      title: '',
      icon: 'Briefcase',
      openings: 1,
      experience: '',
      location: '',
      highlightPoints: [{ value: '' }],
      responsibilities: [{ value: '' }],
      requiredSkills: [{ value: '' }],
      status: 'Open',
      type: 'full-time'
    },
  });

  const { fields: highlightPointsFields, append: appendHighlightPoint, remove: removeHighlightPoint } = useFieldArray({ control: form.control, name: "highlightPoints" });
  const { fields: respFields, append: appendResp, remove: removeResp } = useFieldArray({ control: form.control, name: "responsibilities" });
  const { fields: reqSkillsFields, append: appendReqSkill, remove: removeReqSkill } = useFieldArray({ control: form.control, name: "requiredSkills" });


  useEffect(() => {
    if (job) {
      form.reset({
        ...job,
        openings: job.openings || 1,
        highlightPoints: job.highlightPoints.map(s => ({ value: s })),
        responsibilities: job.responsibilities.map(r => ({ value: r })),
        requiredSkills: job.requiredSkills.map(s => ({ value: s })),
        type: job.type || 'full-time',
      });
    } else {
      form.reset({
        title: '',
        icon: 'Briefcase',
        openings: 1,
        experience: '',
        location: '',
        highlightPoints: [{ value: '' }],
        responsibilities: [{ value: '' }],
        requiredSkills: [{ value: '' }],
        status: 'Open',
        type: 'full-time'
      });
    }
  }, [job, form]);

  const onSubmit = async (data: z.infer<typeof jobSchema>) => {
    setIsProcessing(true);
    try {
      const jobData = {
          ...data,
          highlightPoints: data.highlightPoints.map(s => s.value),
          responsibilities: data.responsibilities.map(r => r.value),
          requiredSkills: data.requiredSkills.map(s => s.value),
      };
      onSave(jobData);
    } catch (error) {
       console.error("Error saving job:", error);
       toast({
         variant: "destructive",
         title: "Failed to save job",
         description: "An error occurred while saving the job data.",
       });
    } finally {
      setIsProcessing(false);
    }
  };

  const BulletPointInput = ({ fields, append, remove, label, placeholder }: any) => (
    <div className="space-y-2">
      <FormLabel>{label}</FormLabel>
      {fields.map((field: any, index: number) => (
        <FormField
          key={field.id}
          control={form.control}
          name={`${label.toLowerCase().replace(' ', '')}.${index}.value` as any}
          render={({ field }) => (
            <FormItem className="flex items-center gap-2">
              <FormControl>
                <Input {...field} placeholder={placeholder} />
              </FormControl>
              <Button
                type="button"
                variant="destructive"
                size="icon"
                onClick={() => remove(index)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </FormItem>
          )}
        />
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => append({ value: '' })}
      >
        <PlusCircle className="mr-2 h-4 w-4" />
        Add {label.slice(0, -1)}
      </Button>
    </div>
  );

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-2xl">
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex h-full flex-col"
          >
            <SheetHeader>
              <SheetTitle>{job ? 'Edit Job' : 'Add New Job'}</SheetTitle>
              <SheetDescription>
                Fill in the details for the job posting. Click save when you're done.
              </SheetDescription>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto p-1 pr-6 space-y-4 py-4">
               <FormField control={form.control} name="title" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Job Title</FormLabel>
                    <FormControl><Input placeholder="e.g., Software Engineer" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                 <FormField control={form.control} name="type" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Job Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {JOB_TYPES.map(type => (
                              <SelectItem key={type} value={type} className="capitalize">{type}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                  />
                  <FormField control={form.control} name="openings" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Number of Openings</FormLabel>
                      <FormControl><Input type="number" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
               <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                 <FormField control={form.control} name="icon" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Lucide Icon Name</FormLabel>
                      <FormControl><Input placeholder="e.g., Briefcase" {...field} /></FormControl>
                      <FormDescription>
                        Visit{' '}
                        <a
                          href="https://lucide.dev/icons/"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline"
                        >
                          lucide.dev/icons
                        </a>{' '}
                        and pick an icon name that matches the job, or connect with a designer/developer.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )} />
                 <FormField control={form.control} name="location" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location</FormLabel>
                      <FormControl><Input placeholder="e.g., Remote or City, State" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
               </div>

               <FormField control={form.control} name="experience" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Experience</FormLabel>
                    <FormControl><Input placeholder="e.g., 2-4 years" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

              <div className="space-y-2">
                <FormLabel>Highlight Points</FormLabel>
                 {highlightPointsFields.map((field, index) => (
                    <FormField
                      key={field.id}
                      control={form.control}
                      name={`highlightPoints.${index}.value`}
                      render={({ field }) => (
                        <FormItem className="flex items-center gap-2">
                          <FormControl>
                            <Input {...field} placeholder="e.g., Competitive salary" />
                          </FormControl>
                          <Button type="button" variant="ghost" size="icon" onClick={() => removeHighlightPoint(index)}>
                            <X className="h-4 w-4" />
                          </Button>
                        </FormItem>
                      )}
                    />
                  ))}
                  <Button type="button" variant="outline" size="sm" onClick={() => appendHighlightPoint({ value: '' })}>
                    <PlusCircle className="mr-2 h-4 w-4" />Add Highlight Point
                  </Button>
              </div>

              <BulletPointInput fields={respFields} append={appendResp} remove={removeResp} label="Responsibilities" placeholder="e.g., Develop new features" />
              <BulletPointInput fields={reqSkillsFields} append={appendReqSkill} remove={removeReqSkill} label="Required Skills" placeholder="e.g., Proficient in TypeScript" />


               <FormField control={form.control} name="status" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {JOB_STATUSES.map(status => (
                            <SelectItem key={status} value={status}>{status}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
                />

            </div>
            <SheetFooter className="pt-4">
              <SheetClose asChild>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </SheetClose>
              <Button type="submit" disabled={isProcessing}>
                {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Save Job
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
