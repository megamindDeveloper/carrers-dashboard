
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
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
import { useAuth } from '@/context/auth-context';
import { Loader2 } from 'lucide-react';
import Image from 'next/image';
import mmLogo from '../../../.idx/mmLogo.png';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

const Illustration = () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 1024 1024"
      className="h-auto w-full max-w-sm text-primary"
    >
      <path
        fill="currentColor"
        d="M512 0c282.8 0 512 229.2 512 512s-229.2 512-512 512S0 794.8 0 512 229.2 0 512 0zm0 64C264.6 64 64 264.6 64 512s200.6 448 448 448 448-200.6 448-448S759.4 64 512 64z"
        opacity=".1"
      />
      <path
        fill="currentColor"
        d="M512 128c212.1 0 384 171.9 384 384S724.1 896 512 896 128 724.1 128 512s171.9-384 384-384zm0 64c-176.7 0-320 143.3-320 320s143.3 320 320 320 320-143.3 320-320-143.3-320-320-320z"
        opacity=".2"
      />
      <path
        fill="currentColor"
        d="M512 256c141.4 0 256 114.6 256 256s-114.6 256-256 256-256-114.6-256-256 114.6-256 256-256zm0 64c-106 0-192 86-192 192s86 192 192 192 192-86 192-192-86-192-192-192z"
        opacity=".4"
      />
      <path
        fill="hsl(var(--foreground))"
        d="M608 416a96 96 0 100 192 96 96 0 000-192zm-96 32a64 64 0 110 128 64 64 0 010-128zM416 320a96 96 0 100 192 96 96 0 000-192zm-96 96a64 64 0 11128 0 64 64 0 01-128 0zM512 608a96 96 0 100 192 96 96 0 000-192zm-64 96a64 64 0 11128 0 64 64 0 01-128 0z"
      />
    </svg>
  );


export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: z.infer<typeof loginSchema>) => {
    setIsLoading(true);
    try {
      await login(data.email, data.password);
      toast({
        title: 'Login Successful',
        description: "Welcome back!",
      });
      router.push('/dashboard');
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Login Failed',
        description: error instanceof Error ? error.message : 'An unknown error occurred.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full lg:grid lg:min-h-screen lg:grid-cols-2 xl:min-h-screen">
      <div className="flex items-center justify-center p-6 py-12 sm:p-12">
        <div className="mx-auto grid w-full max-w-sm gap-6">
          <div className="grid gap-2 text-center">
            <Image height={50} width={200} src={mmLogo} alt="Megamind Careers Logo" className="mx-auto mb-4" />
            <h1 className="text-3xl font-bold">Login</h1>
            <p className="text-balance text-muted-foreground">
              Enter your credentials to access your dashboard.
            </p>
          </div>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="m@example.com"
                        {...field}
                      />
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
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Sign In
              </Button>
            </form>
          </Form>
        </div>
      </div>
      <div className="hidden lg:flex items-center justify-center bg-muted p-8">
        <div className="flex flex-col items-center justify-center text-center">
            <Illustration />
            <h2 className="mt-6 text-3xl font-bold">Streamline Your Hiring</h2>
            <p className="mt-2 text-muted-foreground">
                The ultimate platform to manage candidates and find the perfect fit.
            </p>
        </div>
      </div>
    </div>
  );
}
