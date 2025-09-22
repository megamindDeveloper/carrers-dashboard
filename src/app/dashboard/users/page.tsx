
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { Loader2 } from 'lucide-react';
import { UserManagementTable } from '@/components/dashboard/users/user-management-table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function UsersPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.replace('/login');
      } else if (user.role !== 'superAdmin') {
        router.replace('/dashboard');
      }
    }
  }, [user, loading, router]);

  if (loading || !user || user.role !== 'superAdmin') {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <main className="flex-1 space-y-4 p-4 pt-6 md:p-8">
        <Card>
            <CardHeader>
                <CardTitle>User Management</CardTitle>
                <CardDescription>
                    Create and manage user accounts and permissions.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <UserManagementTable />
            </CardContent>
        </Card>
    </main>
  );
}
