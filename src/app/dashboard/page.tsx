
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/auth-context';
import { Loader2, Briefcase, Users, GraduationCap } from 'lucide-react';
import { onSnapshot, collection } from 'firebase/firestore';
import { db } from '@/app/utils/firebase/firebaseConfig';
import type { Candidate } from '@/lib/types';
import { Header } from '@/components/dashboard/header';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

type PositionSummary = {
  position: string;
  count: number;
};

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

  const fullTimeCount = candidates.filter(c => c.type === 'full-time').length;
  const internCount = candidates.filter(c => c.type === 'internship').length;

  const getPositionSummary = (type: 'full-time' | 'internship'): PositionSummary[] => {
    const positionCounts = candidates
      .filter(c => c.type === type)
      .reduce<Record<string, number>>((acc, candidate) => {
        acc[candidate.position] = (acc[candidate.position] || 0) + 1;
        return acc;
      }, {});

    return Object.entries(positionCounts)
      .map(([position, count]) => ({ position, count }))
      .sort((a, b) => b.count - a.count);
  };

  const fullTimeSummary = getPositionSummary('full-time');
  const internSummary = getPositionSummary('internship');

  const SummaryTable = ({
    title,
    data,
  }: {
    title: string;
    data: PositionSummary[];
  }) => (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>
          Unique positions and application counts.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">Sl.No</TableHead>
              <TableHead>Position</TableHead>
              <TableHead className="text-right">Total Applications</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length > 0 ? (
              data.map((item, index) => (
                <TableRow key={item.position}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell className="font-medium">{item.position}</TableCell>
                  <TableCell className="text-right">{item.count}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={3} className="text-center">
                  No applications found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );

  return (
    <div className="flex min-h-screen w-full flex-col">
      <Header />
      <main className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Link href="/dashboard/all">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Applications
                </CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{candidates.length}</div>
                <p className="text-xs text-muted-foreground">
                  View all candidates
                </p>
              </CardContent>
            </Card>
          </Link>
          <Link href="/dashboard/full-time">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Full-time Applications
                </CardTitle>
                <Briefcase className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{fullTimeCount}</div>
                 <p className="text-xs text-muted-foreground">
                  View full-time candidates
                </p>
              </CardContent>
            </Card>
          </Link>
          <Link href="/dashboard/intern">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Internship Applications
                </CardTitle>
                <GraduationCap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{internCount}</div>
                 <p className="text-xs text-muted-foreground">
                  View intern candidates
                </p>
              </CardContent>
            </Card>
          </Link>
        </div>
        <div className="grid gap-8 pt-4 md:grid-cols-2">
          <SummaryTable title="Full-time Positions" data={fullTimeSummary} />
          <SummaryTable title="Internship Positions" data={internSummary} />
        </div>
      </main>
    </div>
  );
}
