
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { Loader2, Briefcase, Users, GraduationCap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { onSnapshot, collection } from 'firebase/firestore';
import { db } from '@/app/utils/firebase/firebaseConfig';
import type { Candidate } from '@/lib/types';
import Link from 'next/link';
import { Header } from '@/components/dashboard/header';

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      const colRef = collection(db, 'applications');
      const unsub = onSnapshot(
        colRef,
        snapshot => {
          const fetchedCandidates = snapshot.docs.map(d => ({
            id: d.id,
            ...(d.data() as Omit<Candidate, 'id'>),
          }));
          setCandidates(fetchedCandidates);
          setLoading(false);
        },
        error => {
          console.error('onSnapshot error:', error);
          setLoading(false);
        }
      );
      return () => unsub();
    }
  }, [user]);

  if (authLoading || loading || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const totalApplications = candidates.length;
  const internApplications = candidates.filter(
    c => c.type === 'intern'
  ).length;
  const fullTimeApplications = candidates.filter(
    c => c.type === 'emp'
  ).length;

  return (
    <div className="flex min-h-screen w-full flex-col">
      <Header />
      <main className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Link href="/dashboard/all">
            <Card className="hover:bg-muted/50 transition-colors">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Applications
                </CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalApplications}</div>
              </CardContent>
            </Card>
          </Link>
          <Link href="/dashboard/intern">
            <Card className="hover:bg-muted/50 transition-colors">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Intern Applications
                </CardTitle>
                <GraduationCap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{internApplications}</div>
              </CardContent>
            </Card>
          </Link>
          <Link href="/dashboard/full-time">
            <Card className="hover:bg-muted/50 transition-colors">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Full-time Applications
                </CardTitle>
                <Briefcase className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{fullTimeApplications}</div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </main>
    </div>
  );
}
