
'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/auth-context';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import {
  LogOut,
  PanelLeft,
  Users,
  Briefcase,
  GraduationCap,
  LayoutGrid,
  Menu,
  FileText,
  UserCog,
} from 'lucide-react';
import mmLogo from '../../../.idx/mmLogo.png';
import { usePathname } from 'next/navigation';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../ui/tooltip';
import { NAV_ITEMS } from '@/lib/types';

interface HeaderProps {
    onToggleSidebar: () => void;
}

const navIcons: { [key: string]: React.ElementType } = {
  overview: LayoutGrid,
  jobs: FileText,
  'all-candidates': Users,
  'full-time': Briefcase,
  interns: GraduationCap,
  users: UserCog,
};


export function Header({ onToggleSidebar }: HeaderProps) {
  const { logout, user } = useAuth();
  const pathname = usePathname();

  const allNavLinks = [
    { id: 'overview', href: '/dashboard', icon: navIcons['overview'], label: 'Overview' },
    { id: 'jobs', href: '/dashboard/jobs', icon: navIcons['jobs'], label: 'Jobs' },
    { id: 'all-candidates', href: '/dashboard/all', icon: navIcons['all-candidates'], label: 'All Candidates' },
    { id: 'full-time', href: '/dashboard/full-time', icon: navIcons['full-time'], label: 'Full-time' },
    { id: 'interns', href: '/dashboard/intern', icon: navIcons['interns'], label: 'Interns' },
  ];

  if (user?.role === 'superAdmin') {
    allNavLinks.push({ id: 'users', href: '/dashboard/users', icon: navIcons['users'], label: 'Users' });
  }

  const accessibleNavLinks = allNavLinks.filter(item => 
      user?.role === 'superAdmin' || item.id === 'overview' || user?.accessibleTabs?.includes(item.id as any)
  );

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
       <Button size="icon" variant="outline" className="hidden sm:flex" onClick={onToggleSidebar}>
        <Menu className="h-5 w-5" />
        <span className="sr-only">Toggle Menu</span>
      </Button>
      <Sheet>
        <SheetTrigger asChild>
          <Button size="icon" variant="outline" className="sm:hidden">
            <PanelLeft className="h-5 w-5" />
            <span className="sr-only">Toggle Menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="sm:max-w-xs">
          <nav className="grid gap-6 text-lg font-medium">
            <Link
              href="/dashboard"
              className="group flex h-10 w-10 shrink-0 items-center justify-center gap-2 rounded-full bg-primary text-lg font-semibold text-primary-foreground md:text-base"
            >
              <Image height={30} width={120} src={mmLogo} alt="MegaMind Careers Logo" />
              <span className="sr-only">MegaMind Careers</span>
            </Link>
            {accessibleNavLinks.map(item => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-4 px-2.5 ${
                  pathname === item.href
                    ? 'text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </Link>
            ))}
          </nav>
        </SheetContent>
      </Sheet>
      <div className="relative ml-auto flex-1 md:grow-0">
        {/* Can add a search bar here if needed */}
      </div>
      <div className="ml-auto flex items-center gap-4">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                onClick={logout}
                aria-label="Log out"
              >
                <LogOut className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Logout</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </header>
  );
}
