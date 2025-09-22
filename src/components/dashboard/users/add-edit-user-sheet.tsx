
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Sheet,
  SheetContent,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import type { UserRole, NavItemId } from '@/lib/types';
import { USER_ROLES, NAV_ITEMS } from '@/lib/types';
import { Loader2 } from 'lucide-react';

interface AddEditUserSheetProps {
  isOpen: boolean;
  onClose: () => void;
  user: { uid: string; email: string | null; role: UserRole; accessibleTabs: NavItemId[] } | null;
  onSave: (data: any) => Promise<void>;
}

const userSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters').optional().or(z.literal('')),
    role: z.enum(USER_ROLES),
    accessibleTabs: z.array(z.string()).optional(),
}).refine(data => data.role !== 'user' || (data.accessibleTabs && data.accessibleTabs.length > 0), {
    message: "At least one tab must be selected for the 'user' role.",
    path: ["accessibleTabs"],
});

export function AddEditUserSheet({ isOpen, onClose, user, onSave }: AddEditUserSheetProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const isEditMode = !!user;

  const form = useForm<z.infer<typeof userSchema>>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      email: '',
      password: '',
      role: 'user',
      accessibleTabs: [],
    },
  });

  useEffect(() => {
    if (isOpen) {
        if (isEditMode) {
            form.reset({
                email: user.email || '',
                password: '',
                role: user.role,
                accessibleTabs: user.accessibleTabs || [],
            });
        } else {
            form.reset({
                email: '',
                password: '',
                role: 'user',
                accessibleTabs: [],
            });
        }
    }
  }, [user, isOpen, form, isEditMode]);

  const onSubmit = async (data: z.infer<typeof userSchema>) => {
    setIsProcessing(true);
    const submissionData: any = {
        ...data,
        accessibleTabs: data.role === 'superAdmin' ? [] : data.accessibleTabs,
    };
    if (isEditMode) {
        submissionData.uid = user.uid;
    }
    // Only include password if it's not empty
    if (!data.password) {
        delete submissionData.password;
    }

    try {
        await onSave(submissionData);
    } catch (error) {
        // Error is handled in the parent, but we stop processing here
    } finally {
        setIsProcessing(false);
    }
  };

  const role = form.watch("role");

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-lg">
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex h-full flex-col"
          >
            <SheetHeader>
              <SheetTitle>{isEditMode ? 'Edit User' : 'Add New User'}</SheetTitle>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto p-1 pr-6 space-y-4 py-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="user@example.com" {...field} disabled={isEditMode} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder={isEditMode ? "Leave blank to keep current password" : "••••••••"} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {USER_ROLES.map(role => (
                          <SelectItem key={role} value={role} className="capitalize">
                            {role === 'superAdmin' ? 'Super Admin' : 'User'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {role === 'user' && (
                <FormField
                  control={form.control}
                  name="accessibleTabs"
                  render={() => (
                    <FormItem>
                        <div className="mb-4">
                            <FormLabel className="text-base">Accessible Tabs</FormLabel>
                        </div>
                        {NAV_ITEMS.map((item) => (
                            <FormField
                            key={item.id}
                            control={form.control}
                            name="accessibleTabs"
                            render={({ field }) => {
                                return (
                                <FormItem
                                    key={item.id}
                                    className="flex flex-row items-start space-x-3 space-y-0"
                                >
                                    <FormControl>
                                    <Checkbox
                                        checked={field.value?.includes(item.id)}
                                        onCheckedChange={(checked) => {
                                        return checked
                                            ? field.onChange([...(field.value || []), item.id])
                                            : field.onChange(
                                                field.value?.filter(
                                                (value) => value !== item.id
                                                )
                                            )
                                        }}
                                    />
                                    </FormControl>
                                    <FormLabel className="font-normal">
                                        {item.label}
                                    </FormLabel>
                                </FormItem>
                                )
                            }}
                            />
                        ))}
                        <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>
            <SheetFooter className="pt-4">
              <SheetClose asChild>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </SheetClose>
              <Button type="submit" disabled={isProcessing}>
                {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
