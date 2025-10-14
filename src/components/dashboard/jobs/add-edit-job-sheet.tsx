
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
import { useToast } from '@/hooks/use-toast';
import type { Job } from '@/lib/types';
import { JOB_STATUSES, JOB_TYPES } from '@/lib/types';
import { Loader2, PlusCircle, Trash2, X } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import RichTextEditor from '@/components/ui/rich-text-editor';

interface AddEditJobSheetProps {
  isOpen: boolean;
  onClose: () => void;
  job: Job | null;
  onSave: (jobData: Omit<Job, 'id' | 'createdAt'>) => Promise<void>;
}

const jobSchema = z.object({
  position: z.string().min(1, 'Position is required'),
  icon: z.string().min(1, 'Icon name is required'),
  openings: z.coerce.number().min(1, 'At least one opening is required'),
  experience: z.string().min(1, 'Experience is required'),
  location: z.string().min(1, 'Location is required'),
  sections: z.array(z.object({
    title: z.string().min(1, "Section title cannot be empty"),
    points: z.array(z.object({ value: z.string().min(1, "Point cannot be empty") }))
  })).min(1, "At least one section is required"),
  status: z.enum(JOB_STATUSES),
  type: z.enum(JOB_TYPES),
  duration: z.string().optional(),
});


export function AddEditJobSheet({ isOpen, onClose, job, onSave }: AddEditJobSheetProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof jobSchema>>({
    resolver: zodResolver(jobSchema),
  });

  const { fields: sectionsFields, append: appendSection, remove: removeSection } = useFieldArray({ control: form.control, name: "sections" });

  useEffect(() => {
    if (isOpen) {
      if (job) {
        // This is an existing job, potentially in the old format.
        let sections = [];
        if (job.sections && Array.isArray(job.sections)) {
            // New format already exists
            sections = job.sections.map(sec => ({
                title: sec.title,
                points: sec.points.map(p => ({ value: p }))
            }));
        } else {
            // Old format, perform migration
            if (job.highlightPoints && job.highlightPoints.length > 0) {
                sections.push({ title: 'Highlights', points: job.highlightPoints.map(p => ({ value: p })) });
            }
            if (job.responsibilities && job.responsibilities.length > 0) {
                sections.push({ title: 'Responsibilities', points: job.responsibilities.map(p => ({ value: p })) });
            }
            if (job.skills && job.skills.length > 0) {
                sections.push({ title: 'Skills', points: job.skills.map(p => ({ value: p })) });
            }
        }

        form.reset({
          position: job.position || '',
          icon: job.icon || 'Briefcase',
          openings: job.openings || 1,
          experience: job.experience || '',
          location: job.location || '',
          status: job.status || 'Open',
          type: job.type || 'full-time',
          duration: job.duration || '',
          sections: sections,
        });
      } else {
        // This is a new job
        form.reset({
          position: '',
          icon: 'Briefcase',
          openings: 1,
          experience: '',
          location: '',
          sections: [
            { title: 'Highlights', points: [{value: ''}] },
            { title: 'Responsibilities', points: [{value: ''}] },
            { title: 'Skills', points: [{value: ''}] }
          ],
          status: 'Open',
          type: 'full-time',
          duration: '',
        });
      }
    }
  }, [job, isOpen, form]);

  const onSubmit = async (data: z.infer<typeof jobSchema>) => {
    setIsProcessing(true);
    try {
      const jobData = {
          ...data,
          sections: data.sections.map(sec => ({
            ...sec,
            points: sec.points.map(p => p.value)
          })),
          // Ensure old fields are removed on save
          highlightPoints: undefined,
          responsibilities: undefined,
          skills: undefined,
      };
      await onSave(jobData as any);
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

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-3xl flex flex-col">
        <SheetHeader>
          <SheetTitle>{job ? 'Edit Job' : 'Add New Job'}</SheetTitle>
          <SheetDescription>
            Fill in the details for the job posting. Click save when you're done.
          </SheetDescription>
        </SheetHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex-1 flex flex-col overflow-hidden"
          >
           <ScrollArea className="flex-1 pr-6">
            <div className="space-y-4 py-4">
               <FormField control={form.control} name="position" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Job Position</FormLabel>
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
                        and pick an icon name.
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
                
                <FormField control={form.control} name="duration" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duration (for Internships)</FormLabel>
                    <FormControl><Input placeholder="e.g., 3 months" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              
                <div className="space-y-4 border-t pt-4">
                  {sectionsFields.map((sectionField, sectionIndex) => (
                    <div key={sectionField.id} className="space-y-4 rounded-lg border p-4">
                       <div className="flex items-end justify-between">
                         <FormField
                          control={form.control}
                          name={`sections.${sectionIndex}.title`}
                          render={({ field }) => (
                            <FormItem className="flex-grow">
                              <FormLabel>Section Title</FormLabel>
                              <FormControl><Input placeholder="e.g., Responsibilities" {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <Button type="button" variant="destructive" size="sm" onClick={() => removeSection(sectionIndex)} className="ml-4">
                            <Trash2 className="mr-2 h-4 w-4" /> Delete Section
                        </Button>
                       </div>
                       <PointsArrayField sectionIndex={sectionIndex} form={form} />
                    </div>
                  ))}
                  <Button type="button" variant="outline" onClick={() => appendSection({ title: '', points: [{ value: '' }]})}>
                      <PlusCircle className="mr-2 h-4 w-4" /> Add Section
                  </Button>
                </div>


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
           </ScrollArea>
            <SheetFooter className="pt-4 border-t">
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

function PointsArrayField({ sectionIndex, form }: { sectionIndex: number, form: any }) {
    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: `sections.${sectionIndex}.points`
    });

    return (
      <div className="space-y-2 pl-2 border-l-2">
        <FormLabel>Points</FormLabel>
        {fields.map((field, pointIndex) => (
          <div key={field.id} className="flex items-start gap-2">
             <FormField
                control={form.control}
                name={`sections.${sectionIndex}.points.${pointIndex}.value`}
                render={({ field }) => (
                    <FormItem className="flex-grow">
                    <FormControl>
                        <RichTextEditor content={field.value} onChange={field.onChange} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => remove(pointIndex)}
              className="mt-1"
            >
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
            <PlusCircle className="mr-2 h-4 w-4" /> Add Point
        </Button>
      </div>
    )
}
