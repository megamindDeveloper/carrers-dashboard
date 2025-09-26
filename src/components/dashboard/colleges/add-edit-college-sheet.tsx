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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import type { College } from '@/lib/types';
import { CollegeSchema } from '@/lib/types';
import { Loader2 } from 'lucide-react';

interface AddEditCollegeSheetProps {
  isOpen: boolean;
  onClose: () => void;
  college: College | null;
  onSave: (collegeData: Omit<College, 'id' | 'createdAt' | 'candidateCount'>, existingId?: string) => Promise<void>;
}

export function AddEditCollegeSheet({ isOpen, onClose, college, onSave }: AddEditCollegeSheetProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  
  const form = useForm<z.infer<typeof CollegeSchema>>({
    resolver: zodResolver(CollegeSchema),
    defaultValues: {
      name: '',
      location: '',
      collegeEmail: '',
      contactPerson: '',
      contactEmail: '',
    },
  });

  useEffect(() => {
    if (isOpen) {
      if (college) {
        form.reset(college);
      } else {
        form.reset({
          name: '',
          location: '',
          collegeEmail: '',
          contactPerson: '',
          contactEmail: '',
        });
      }
    }
  }, [college, isOpen, form]);

  const onSubmit = async (data: z.infer<typeof CollegeSchema>) => {
    setIsProcessing(true);
    try {
      await onSave(data, college?.id);
    } catch (error) {
       // Error toast is handled in parent
    } finally {
      setIsProcessing(false);
    }
  };
  
  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-md">
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex h-full flex-col"
          >
            <SheetHeader>
              <SheetTitle>{college ? 'Edit College' : 'Add New College'}</SheetTitle>
              <SheetDescription>
                Fill in the details for the college partner.
              </SheetDescription>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto p-1 pr-6 space-y-4 py-4">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>College Name</FormLabel>
                  <FormControl><Input placeholder="e.g., University of Technology" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
               <FormField control={form.control} name="location" render={({ field }) => (
                <FormItem>
                  <FormLabel>Location</FormLabel>
                  <FormControl><Input placeholder="e.g., City, Country" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
               <FormField control={form.control} name="collegeEmail" render={({ field }) => (
                <FormItem>
                  <FormLabel>College Email (Optional)</FormLabel>
                  <FormControl><Input type="email" placeholder="e.g., admissions@university.edu" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
               <FormField control={form.control} name="contactPerson" render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact Person</FormLabel>
                  <FormControl><Input placeholder="e.g., Dr. Jane Smith" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="contactEmail" render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact Email</FormLabel>
                  <FormControl><Input type="email" placeholder="e.g., jane.smith@university.edu" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <SheetFooter className="pt-4">
              <SheetClose asChild>
                <Button type="button" variant="outline" disabled={isProcessing}>
                  Cancel
                </Button>
              </SheetClose>
              <Button type="submit" disabled={isProcessing}>
                {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Save College
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
