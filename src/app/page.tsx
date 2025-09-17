'use client';

import { useState } from 'react';
import { initialCandidates } from '@/lib/data';
import type { Candidate } from '@/lib/types';
import { Header } from '@/components/dashboard/header';
import { CandidateTable } from '@/components/dashboard/candidate-table';

export default function DashboardPage() {
  const [candidates, setCandidates] = useState<Candidate[]>(initialCandidates);

  const addCandidate = (newCandidateData: Omit<Candidate, 'id' | 'avatar'>) => {
    const newCandidate: Candidate = {
      ...newCandidateData,
      id: `CAND-${Date.now()}`,
      avatar: `https://i.pravatar.cc/150?u=${newCandidateData.email}`,
    };
    setCandidates(prev => [newCandidate, ...prev]);
  };

  return (
    <div className="flex min-h-screen w-full flex-col">
      <Header onCandidateAdd={addCandidate} />
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <CandidateTable data={candidates} />
      </main>
    </div>
  );
}
