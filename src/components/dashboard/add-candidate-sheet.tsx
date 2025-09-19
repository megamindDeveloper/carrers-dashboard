
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
  SheetTrigger,
  SheetFooter,
  SheetClose,
} from '@/components/ui/sheet';
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
import { useToast } from '@/hooks/use-toast';
import { parseResumeAction } from '@/app/actions';
import type { Candidate, CandidateType } from '@/lib/types';
import { Loader2, PlusCircle } from 'lucide-react';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '@/app/utils/firebase/firebaseConfig';
import { getStorage, ref, uploadString, getDownloadURL } from "firebase/storage";

interface AddCandidateSheetProps {
}

const candidateSchema = z.object({
  fullName: z.string().min(1, 'Full name is required'),
  email: z.string().email('Invalid email address'),
  contactNumber: z.string().min(1, 'Contact number is required'),
  location: z.string().min(1, 'Location is required'),
  address: z.string().min(1, 'Address is required'),
  education: z.string().min(1, 'Education is required'),
  workExperience: z.string().min(1, 'Work experience is required'),
  position: z.string().min(1, 'Position is required'),
  portfolio: z.string().url('Invalid URL').or(z.literal('')),
  resumeDataUri: z.string().min(1, 'Resume is required'),
});

export function AddCandidateSheet({}: AddCandidateSheetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof candidateSchema>>({
    resolver: zodResolver(candidateSchema),
    defaultValues: {
      fullName: '',
      email: '',
      contactNumber: '',
      location: '',
      address: '',
      education: '',
      workExperience: '',
      position: '',
      portfolio: '',
      resumeDataUri: '',
    },
  });

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    toast({
      title: 'Parsing Resume...',
      description: 'The AI is extracting information from the resume.',
    });

    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const resumeDataUri = reader.result as string;
        form.setValue('resumeDataUri', resumeDataUri);

        const result = await parseResumeAction({ resumeDataUri });

        if (result.success && result.data) {
          form.reset({
            ...form.getValues(),
            ...result.data,
            contactNumber: result.data.phone,
            resumeDataUri: resumeDataUri,
          });
          toast({
            title: 'Resume Parsed Successfully!',
            description: 'The form has been pre-filled with the extracted data.',
          });
        } else {
          throw new Error(result.error);
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
            : 'There was a problem parsing the resume.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const onSubmit = async (data: z.infer<typeof candidateSchema>) => {
    setIsProcessing(true);
    try {
      const storage = getStorage();
      const storageRef = ref(storage, `resumes/${Date.now()}-${data.email}`);
      
      const uploadResult = await uploadString(storageRef, data.resumeDataUri, 'data_url');
      const resumeUrl = await getDownloadURL(uploadResult.ref);

      const candidateType: CandidateType = data.position.toLowerCase().includes('intern')
        ? 'intern'
        : 'emp';

      const newCandidate: Omit<Candidate, 'id' | 'type'> & { type: CandidateType } = {
        fullName: data.fullName,
        email: data.email,
        contactNumber: data.contactNumber,
        location: data.location,
        address: data.address,
        education: data.education,
        workExperience: data.workExperience,
        position: data.position,
        portfolio: data.portfolio,
        resumeUrl: resumeUrl,
        avatar: `https://i.pravatar.cc/150?u=${data.email}`,
        status: 'Applied',
        type: candidateType,
        submittedAt: new Date().toISOString(),
      };

      await addDoc(collection(db, 'applications'), newCandidate);

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
        <Button>
          <PlusCircle className="mr-2" />
          Add Candidate
        </Button>
      </SheetTrigger>
      <SheetContent className="sm:max-w-2xl">
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
                    <div className="relative">
                      <Input
                        type="file"
                        accept=".pdf,.doc,.docx"
                        onChange={handleFileChange}
                        disabled={isProcessing}
                        className="pr-12"
                      />
                      {isProcessing && (
                        <Loader2 className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 animate-spin text-muted-foreground" />
                      )}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>

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
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location (City)</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., San Francisco" {...field} />
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
                          placeholder="123 Main St, Anytown, USA"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="education"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Education</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="B.S. in Computer Science, University of Example, 2024"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="workExperience"
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
                <FormField
                  control={form.control}
                  name="position"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Position Applying For</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Graphic Designer Intern"
                          {...field}
                        />
                      </FormControl>
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
