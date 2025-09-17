'use client';

import { AddCandidateSheet } from './add-candidate-sheet';
import type { Candidate } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/auth-context';
import {  LogOut } from 'lucide-react';
import mmLogo from '../../../.idx/mmLogo.png'
import Image from 'next/image';

interface HeaderProps {
  onCandidateAdd: (candidate: Omit<Candidate, 'id' | 'avatar' | 'status'>) => void;
}

export function Header({ onCandidateAdd }: HeaderProps) {
  const { logout } = useAuth();
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-card px-4 sm:px-6">
      <div className="flex items-center gap-2">
        {/* <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-6 w-6 text-primary"
        >
          <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v1.2a1 1 0 0 0 1 1h.3a1 1 0 0 0 .7-.3l.5-.5a2.5 2.5 0 1 1 3.5 3.5l-.5.5a1 1 0 0 0-.3.7v.3a1 1 0 0 0 1 1h1.2a2.5 2.5 0 1 1-4.5 2.5v-1.2a1 1 0 0 0-1-1h-.3a1 1 0 0 0-.7.3l-.5.5a2.5 2.5 0 1 1-3.5-3.5l.5-.5a1 1 0 0 0 .3-.7v-.3a1 1 0 0 0-1-1H4.5A2.5 2.5 0 0 1 2 9.5c0-1.4 1.1-2.5 2.5-2.5h1.2a1 1 0 0 0 1-1V5.7a1 1 0 0 0-.3-.7l-.5-.5A2.5 2.5 0 0 1 9.5 2Z" />
        </svg> */}
        {/* <h1 className="text-xl font-bold tracking-tight">MegaMind Careers</h1> */}
           
           <Image height={50} width={200} src={mmLogo} />
         
      </div>
      <div className="ml-auto flex items-center gap-4">
        {/* <AddCandidateSheet onCandidateAdd={onCandidateAdd} /> */}
        <Button variant="outline" size="icon" onClick={logout} aria-label="Log out">
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
