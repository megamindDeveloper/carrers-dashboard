
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { Loader2 } from 'lucide-react';
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

  const getPositionSummary = (type: 'emp' | 'intern'): PositionSummary[] => {
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

  const fullTimeSummary = getPositionSummary('emp');
  const internSummary = getPositionSummary('intern');

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
        <div className="grid gap-8 md:grid-cols-2">
          <SummaryTable title="Full-time Positions" data={fullTimeSummary} />
          <SummaryTable title="Internship Positions" data={internSummary} />
        </div>
      </main>
    </div>
  );
}
