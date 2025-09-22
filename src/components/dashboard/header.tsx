
'use client';

import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/auth-context';
import {  LogOut } from 'lucide-react';
import mmLogo from '../../../.idx/mmLogo.png'
import Image from 'next/image';
import Link from 'next/link';
import { SidebarTrigger } from '../ui/sidebar';

interface HeaderProps {
}

export function Header({}: HeaderProps) {
  const { logout } = useAuth();
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-card px-4 sm:px-6">
       <div className="flex items-center gap-4">
        <SidebarTrigger className="md:hidden" />
        <Link href="/dashboard" className="hidden items-center gap-2 md:flex">
             <Image height={50} width={200} src={mmLogo} alt="MegaMind Careers Logo" />
        </Link>
       </div>
      <div className="ml-auto flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={logout} aria-label="Log out">
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
