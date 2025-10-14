
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
import type { Job } from '@/lib/types';
import { JOB_STATUSES, JOB_TYPES } from '@/lib/types';
import { Loader2, PlusCircle, Trash2, X, Wand2 as MagicWand } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { parseJobDescriptionAction, suggestIconAction } from '@/app/actions';
import { Label } from '@/components/ui/label';

interface AddEditJobSheetProps {
  isOpen: boolean;
  onClose: () => void;
  job: Job | null;
  onSave: (jobData: Omit<Job, 'id' | 'createdAt'>, existingId?: string) => Promise<void>;
}

const pointSchema = z.object({ value: z.string().min(1, "Point cannot be empty") });

const sectionSchema = z.object({
  title: z.string().min(1, "Section title cannot be empty"),
  points: z.array(pointSchema),
});

const jobSchema = z.object({
  position: z.string().min(1, 'Position is required'),
  icon: z.string().min(1, 'Icon name is required'),
  openings: z.coerce.number().min(1, 'At least one opening is required'),
  experience: z.string().min(1, 'Experience is required'),
  location: z.string().min(1, 'Location is required'),
  status: z.enum(JOB_STATUSES),
  type: z.enum(JOB_TYPES),
  duration: z.string().optional(),
  highlightPoints: z.array(pointSchema).optional(),
  sections: z.array(sectionSchema).min(1, 'At least one other section is required'),
});


export function AddEditJobSheet({ isOpen, onClose, job, onSave }: AddEditJobSheetProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [isSuggestingIcon, setIsSuggestingIcon] = useState(false);
  const [rawDescription, setRawDescription] = useState('');
  const { toast } = useToast();

  const form = useForm<z.infer<typeof jobSchema>>({
    resolver: zodResolver(jobSchema),
  });

  const { fields: sections, append, remove, replace } = useFieldArray({
    control: form.control,
    name: "sections",
  });
  
  const { fields: highlightPoints, append: appendHighlight, remove: removeHighlight, replace: replaceHighlights } = useFieldArray({
    control: form.control,
    name: "highlightPoints",
  });

  useEffect(() => {
    if (isOpen) {
      if (job) {
        const initialSections = (job.sections || []).map(sec => ({
            ...sec,
            points: Array.isArray(sec.points) ? sec.points.map(p => ({ value: p })) : []
        }));
        
        const initialHighlights = (job.highlightPoints || []).map(p => ({ value: p }));

        // Handle backward compatibility
        if (initialSections.length === 0) {
            if ((job as any).responsibilities) {
                initialSections.push({ title: 'Responsibilities', points: (job as any).responsibilities.map((p: string) => ({ value: p })) });
            }
            if ((job as any).skills) {
                initialSections.push({ title: 'Skills', points: (job as any).skills.map((p: string) => ({ value: p })) });
            }
        }
        
        if (initialSections.length === 0) {
             initialSections.push({ title: 'Responsibilities', points: [{ value: '' }] });
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
          highlightPoints: initialHighlights,
          sections: initialSections,
        });
      } else {
        form.reset({
          position: '',
          icon: 'Briefcase',
          openings: 1,
          experience: '',
          location: '',
          status: 'Open',
          type: 'full-time',
          duration: '',
          highlightPoints: [{ value: '' }],
          sections: [
            { title: 'Responsibilities', points: [{ value: '' }] },
            { title: 'Skills', points: [{ value: '' }] },
          ]
        });
      }
      setRawDescription('');
    }
  }, [job, isOpen, form]);

  const handleParseDescription = async () => {
    if (!rawDescription) {
      toast({
        variant: 'destructive',
        title: 'No description provided',
        description: 'Please paste the job description text into the box.',
      });
      return;
    }
    setIsParsing(true);
    try {
      const result = await parseJobDescriptionAction({ jobDescription: rawDescription });
      if (result.success && result.data) {
        if (result.data.highlightPoints && result.data.highlightPoints.length > 0) {
            const formattedHighlights = result.data.highlightPoints.map(point => ({ value: point }));
            replaceHighlights(formattedHighlights);
        }
        if (result.data.sections && result.data.sections.length > 0) {
            const formattedSections = result.data.sections.map(section => ({
              title: section.title,
              points: section.points.map(point => ({ value: point }))
            }));
            replace(formattedSections);
        }
        toast({
          title: 'Job Description Parsed!',
          description: 'The sections below have been automatically populated.',
        });
      } else {
        throw new Error(result.error || 'Failed to parse the description.');
      }
    } catch (error: any) {
       toast({
         variant: "destructive",
         title: "Parsing Failed",
         description: `AI could not parse the job description. Please fill it out manually. Error: ${error.message}`,
       });
    } finally {
      setIsParsing(false);
    }
  };

  const handleSuggestIcon = async () => {
    const jobTitle = form.getValues('position');
    if (!jobTitle) {
      toast({
        variant: 'destructive',
        title: 'No Position Name',
        description: 'Please enter a position name first to suggest an icon.',
      });
      return;
    }
    setIsSuggestingIcon(true);
    try {
      const result = await suggestIconAction({ jobTitle });
      if (result.success && result.data) {
        form.setValue('icon', result.data);
        toast({
          title: 'Icon Suggested!',
          description: `Set icon to "${result.data}". You can change it if you'd like.`,
        });
      } else {
        throw new Error(result.error || 'Failed to suggest an icon.');
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Suggestion Failed",
        description: error.message,
      });
    } finally {
      setIsSuggestingIcon(false);
    }
  };


  const onSubmit = async (data: z.infer<typeof jobSchema>) => {
    setIsProcessing(true);
    try {
      const jobData = {
          ...data,
          highlightPoints: (data.highlightPoints || []).map(p => p.value),
          sections: data.sections.map(section => ({
              ...section,
              points: section.points.map(p => p.value)
          })),
      };
      await onSave(jobData, job?.id);
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
  
  const addSection = () => append({ title: '', points: [{ value: '' }] });

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-2xl flex flex-col">
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
              {/* AI Parser */}
              <div className="space-y-2 rounded-lg border bg-muted/50 p-4">
                  <Label htmlFor="raw-description">Paste Job Description to Auto-Fill</Label>
                  <Textarea 
                    id="raw-description"
                    placeholder="Paste the full job description here and click 'Parse'..."
                    value={rawDescription}
                    onChange={(e) => setRawDescription(e.target.value)}
                    className="min-h-[120px]"
                    disabled={isParsing}
                  />
                  <Button type="button" onClick={handleParseDescription} disabled={isParsing || !rawDescription}>
                    {isParsing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MagicWand className="mr-2 h-4 w-4" />}
                    {isParsing ? 'Parsing...' : 'Parse Description'}
                  </Button>
              </div>

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
                <FormItem>
                    <FormLabel>Lucide Icon Name</FormLabel>
                    <div className="flex items-center gap-2">
                        <FormField
                            control={form.control}
                            name="icon"
                            render={({ field }) => (
                                <FormControl>
                                    <Input placeholder="e.g., Briefcase" {...field} className="flex-grow"/>
                                </FormControl>
                            )}
                        />
                        <Button type="button" variant="outline" onClick={handleSuggestIcon} disabled={isSuggestingIcon}>
                            {isSuggestingIcon ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MagicWand className="mr-2 h-4 w-4" />}
                            Suggest
                        </Button>
                    </div>
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
               <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                 <FormField control={form.control} name="location" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location</FormLabel>
                      <FormControl><Input placeholder="e.g., Remote or City, State" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                 <FormField control={form.control} name="experience" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Experience</FormLabel>
                      <FormControl><Input placeholder="e.g., 2-4 years" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
               </div>
                
                <FormField control={form.control} name="duration" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duration (for Internships)</FormLabel>
                    <FormControl><Input placeholder="e.g., 3 months" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                {/* Highlight Points */}
                <div className="space-y-2 rounded-lg border bg-blue-50 border-blue-200 p-4">
                    <PointsArrayField sectionTitle="Highlight Points" fieldName="highlightPoints" control={form.control} />
                </div>


                {/* Dynamic Sections */}
                <div className="space-y-4">
                  <h3 className="font-medium text-lg pt-4 border-t">Job Details Sections</h3>
                  {sections.map((section, index) => (
                    <div key={section.id} className="space-y-2 rounded-lg border p-4 relative">
                        <div className="flex items-center justify-between">
                            <FormField
                                control={form.control}
                                name={`sections.${index}.title`}
                                render={({ field }) => (
                                    <FormItem className="flex-grow">
                                    <FormLabel>Section Title</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g., Responsibilities" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="absolute top-2 right-2">
                                <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                        </div>
                       <PointsArrayField sectionTitle="Points" fieldName={`sections.${index}.points`} control={form.control} />
                    </div>
                  ))}
                   <Button type="button" variant="outline" onClick={addSection}>
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


function PointsArrayField({ sectionTitle, fieldName, control }: { sectionTitle: string; fieldName: string, control: any }) {
  const { fields, append, remove } = useFieldArray({ control, name: fieldName });

  return (
    <div className="space-y-2 pl-2 border-l-2">
      <FormLabel>{sectionTitle}</FormLabel>
      {fields.map((item, pointIndex) => (
        <div key={item.id} className="flex items-center gap-2">
          <FormField
            control={control}
            name={`${fieldName}.${pointIndex}.value`}
            render={({ field }) => (
              <FormItem className="flex-grow">
                <FormControl>
                  <Textarea placeholder={`Point #${pointIndex + 1}`} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="button" variant="ghost" size="icon" onClick={() => remove(pointIndex)}>
            <X className="h-4 w-4 text-muted-foreground" />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={() => append({ value: "" })}>
        <PlusCircle className="mr-2 h-4 w-4" /> Add Point
      </Button>
    </div>
  );
}
