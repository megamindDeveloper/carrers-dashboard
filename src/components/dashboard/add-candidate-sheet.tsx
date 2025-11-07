
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
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
  SheetTrigger,
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
import { parseResumeAction } from '@/app/actions';
import type { Candidate, CandidateType, CandidateSource } from '@/lib/types';
import { CANDIDATE_SOURCES, CANDIDATE_TYPES } from '@/lib/types';
import { Loader2, PlusCircle } from 'lucide-react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, storage } from '@/app/utils/firebase/firebaseConfig';
import { ref, uploadString, getDownloadURL } from "firebase/storage";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface AddCandidateSheetProps {
    prefilledType?: CandidateType;
}

const candidateSchema = z.object({
  fullName: z.string().min(1, 'Full name is required'),
  email: z.string().email('Invalid email address'),
  contactNumber: z.string().min(1, 'Contact number is required'),
  whatsappNumber: z.string().min(1, 'WhatsApp number is required'),
  address: z.string().min(1, 'Address is required'),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  pincode: z.string().min(1, 'Pincode is required'),
  education: z.string().optional(),
  experience: z.string().min(1, 'Experience is required'),
  position: z.string().min(1, 'Position is required'),
  portfolio: z.string().url('Invalid URL').or(z.literal('')),
  resumeDataUri: z.string().min(1, 'Resume is required'),
  introductionVideoIntern: z.string().url('Invalid URL').or(z.literal('')),
  source: z.enum(CANDIDATE_SOURCES).optional(),
  type: z.enum(CANDIDATE_TYPES),
});

export function AddCandidateSheet({ prefilledType }: AddCandidateSheetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof candidateSchema>>({
    resolver: zodResolver(candidateSchema),
    defaultValues: {
      fullName: '',
      email: '',
      contactNumber: '',
      whatsappNumber: '',
      address: '',
      city: '',
      state: '',
      pincode: '',
      education: '',
      experience: '',
      position: '',
      portfolio: '',
      resumeDataUri: '',
      introductionVideoIntern: '',
      source: 'Website',
      type: prefilledType || 'full-time',
    },
  });

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);

    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const resumeDataUri = reader.result as string;
        form.setValue('resumeDataUri', resumeDataUri);

        const result = await parseResumeAction({ resumeDataUri });

        if (result.success && result.data) {
           const [city, state] = (result.data.location || ',').split(',');

          form.reset({
            ...form.getValues(),
            fullName: result.data.fullName,
            email: result.data.email,
            contactNumber: result.data.phone,
            whatsappNumber: result.data.phone, // Assuming same as contact
            address: result.data.address,
            city: city.trim(),
            state: state ? state.trim() : '',
            experience: result.data.experience,
            education: result.data.education,
            resumeDataUri: resumeDataUri,
          });
          toast({
            title: 'Resume Parsed Successfully!',
            description: 'The form has been pre-filled with the extracted data.',
          });
        } else {
           toast({
            variant: 'destructive',
            title: 'Uh oh! Something went wrong.',
            description: result.error || 'There was a problem parsing the resume.',
          });
        }
      };
      reader.onerror = error => {
        throw error;
      };
    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Uh oh! Something went wrong.',
        description:
          error instanceof Error
            ? error.message
            : 'There was a problem reading the file.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const onSubmit = async (data: z.infer<typeof candidateSchema>) => {
    setIsProcessing(true);
    try {
      const storageRef = ref(storage, `resumes/${Date.now()}-${data.email}`);
      
      const uploadResult = await uploadString(storageRef, data.resumeDataUri, 'data_url');
      const resumeUrl = await getDownloadURL(uploadResult.ref);
      
      const newCandidate: Omit<Candidate, 'id' | 'status' | 'submittedAt' | 'avatar'> & { submittedAt: any } = {
        fullName: data.fullName,
        email: data.email,
        contactNumber: data.contactNumber,
        whatsappNumber: data.whatsappNumber,
        address: data.address,
        city: data.city,
        state: data.state,
        pincode: data.pincode,
        education: data.education,
        experience: data.experience,
        position: data.position,
        portfolio: data.portfolio,
        resumeUrl: resumeUrl,
        type: data.type,
        source: data.source,
        introductionVideoIntern: data.introductionVideoIntern,
        submittedAt: serverTimestamp(),
      };

      await addDoc(collection(db, 'applications'), {
        ...newCandidate,
        status: 'applied',
        avatar: `https://i.pravatar.cc/150?u=${data.email}`,
      });


      form.reset();
      setIsOpen(false);
      toast({
        title: 'Candidate Added!',
        description: `${data.fullName} has been added to the list.`,
      });
    } catch (error) {
       console.error("Error adding candidate:", error);
       toast({
         variant: "destructive",
         title: "Failed to add candidate",
         description: "An error occurred while saving the candidate data.",
       });
    }
    finally {
      setIsProcessing(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button className="w-full sm:w-auto">
          <PlusCircle className="mr-2" />
          Add Candidate
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-2xl">
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex h-full flex-col"
          >
            <SheetHeader>
              <SheetTitle>Add New Candidate</SheetTitle>
              <SheetDescription>
                Upload a resume to auto-fill the form, or enter details
                manually.
              </SheetDescription>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto p-1 pr-6">
              <div className="space-y-4 py-4">
                <FormItem>
                  <FormLabel>Resume (PDF, DOC, DOCX)</FormLabel>
                  <FormControl>
                      <Input
                        type="file"
                        accept=".pdf,.doc,.docx"
                        onChange={handleFileChange}
                        disabled={isProcessing}
                      />
                  </FormControl>
                  <FormMessage />
                </FormItem>

                {isProcessing && (
                  <div className="flex items-center justify-center gap-2 rounded-md border bg-muted p-4 text-sm text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Please wait, AI is parsing the resume...</span>
                  </div>
                )}


                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="fullName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input placeholder="John Doe" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email ID</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="john.doe@example.com"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="contactNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contact Number</FormLabel>
                        <FormControl>
                          <Input placeholder="+1234567890" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                   <FormField
                    control={form.control}
                    name="whatsappNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>WhatsApp Number</FormLabel>
                        <FormControl>
                          <Input placeholder="+1234567890" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="123 Main St"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                   <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City</FormLabel>
                        <FormControl>
                          <Input placeholder="Anytown" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                   <FormField
                    control={form.control}
                    name="state"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>State</FormLabel>
                        <FormControl>
                          <Input placeholder="CA" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="pincode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Pincode</FormLabel>
                        <FormControl>
                          <Input placeholder="12345" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="education"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Education</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="B.S. in Computer Science"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="experience"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Work / Internship Experience</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe previous roles and responsibilities..."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormField
                    control={form.control}
                    name="position"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Position Applying For</FormLabel>
                        <FormControl>
                            <Input
                            placeholder="Social Media Manager"
                            {...field}
                            />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <FormField
                    control={form.control}
                    name="source"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Source</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select the source" />
                                </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                {CANDIDATE_SOURCES.map(source => (
                                    <SelectItem key={source} value={source}>
                                    {source}
                                    </SelectItem>
                                ))}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                    />
                </div>

                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                        <FormLabel>Candidate Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a type" />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                            {CANDIDATE_TYPES.map(type => (
                                <SelectItem key={type} value={type} className="capitalize">
                                {type}
                                </SelectItem>
                            ))}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="portfolio"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Portfolio / Work Samples</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="https://yourportfolio.com"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="introductionVideoIntern"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Intro Video Link (Interns)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="https://yourvideo.com"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
            <SheetFooter className="pt-4">
              <SheetClose asChild>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </SheetClose>
              <Button type="submit" disabled={isProcessing}>
                {isProcessing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Save Candidate
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
