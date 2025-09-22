
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Users,
  Briefcase,
  GraduationCap,
  LayoutGrid,
  FileText,
} from 'lucide-react';
import mmLogo from '../../../.idx/mmLogo.png';
import { cn } from '@/lib/utils';

interface SidebarProps {
  isSidebarOpen: boolean;
}

export function Sidebar({ isSidebarOpen }: SidebarProps) {
  const pathname = usePathname();

  const navItems = [
    { href: '/dashboard', icon: LayoutGrid, label: 'Overview' },
    { href: '/dashboard/jobs', icon: FileText, label: 'Jobs' },
    { href: '/dashboard/all', icon: Users, label: 'All Candidates' },
    { href: '/dashboard/full-time', icon: Briefcase, label: 'Full-time' },
    { href: '/dashboard/intern', icon: GraduationCap, label: 'Interns' },
  ];

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-10 hidden flex-col border-r bg-background transition-[width] duration-300 sm:flex',
        isSidebarOpen ? 'w-52' : 'w-14'
      )}
    >
      <nav className="flex flex-col items-center gap-4 px-2 sm:py-4">
        <Link
          href="/dashboard"
          className={cn(
            'group flex h-9 shrink-0 items-center justify-center gap-2 rounded-full bg-primary text-lg font-semibold text-primary-foreground md:h-8',
            isSidebarOpen ? 'w-full' : 'w-9'
          )}
        >
          <Image
            height={20}
            width={isSidebarOpen ? 80 : 20}
            src={mmLogo}
            alt="MegaMind Careers Logo"
            className={cn(
              'transition-all group-hover:scale-110',
              isSidebarOpen ? 'h-4 w-20' : 'h-5 w-5'
            )}
          />
          <span className={cn('sr-only', isSidebarOpen && 'sm:not-sr-only')}>
            MegaMind
          </span>
        </Link>
        <TooltipProvider>
          {navItems.map(item =>
            isSidebarOpen ? (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex w-full items-center gap-3 rounded-lg px-3 py-2 transition-all hover:text-primary',
                  pathname === item.href
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground'
                )}
              >
                <item.icon className="h-5 w-5" />
                <span>{item.label}</span>
              </Link>
            ) : (
              <Tooltip key={item.href}>
                <TooltipTrigger asChild>
                  <Link
                    href={item.href}
                    className={cn(
                      'flex h-9 w-9 items-center justify-center rounded-lg transition-colors md:h-8 md:w-8',
                      pathname === item.href
                        ? 'bg-accent text-accent-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    <span className="sr-only">{item.label}</span>
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right">{item.label}</TooltipContent>
              </Tooltip>
            )
          )}
        </TooltipProvider>
      </nav>
    </aside>
  );
}
