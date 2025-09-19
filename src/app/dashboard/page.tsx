'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { initialCandidates } from '@/lib/data';
import type { Candidate, CandidateStatus } from '@/lib/types';
import { Header } from '@/components/dashboard/header';
import { CandidateTable } from '@/components/dashboard/candidate-table';
import { useAuth } from '@/context/auth-context';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [candidates, setCandidates] = useState<Candidate[]>(initialCandidates);

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [user, loading, router]);


  const addCandidate = (newCandidateData: Omit<Candidate, 'id' | 'avatar' | 'status'>) => {
    const newCandidate: Candidate = {
      ...newCandidateData,
      id: `CAND-${Date.now()}`,
      avatar: `https://i.pravatar.cc/150?u=${newCandidateData.email}`,
      status: 'Applied',
    };
    setCandidates(prev => [newCandidate, ...prev]);
  };

  const handleStatusChange = (candidateId: string, status: CandidateStatus) => {
    setCandidates(prev =>
      prev.map(c => (c.id === candidateId ? { ...c, status } : c))
    );
  };
  
  if (loading || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full flex-col">
      <Header onCandidateAdd={addCandidate} />
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <CandidateTable />
      </main>
    </div>
  );
}
