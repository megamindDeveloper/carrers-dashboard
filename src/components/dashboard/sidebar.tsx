
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
  ClipboardList,
  Building2,
  Mail,
  User,
} from 'lucide-react';
import mmLogoOpen from '../../../.idx/mmLogo.png';
import mmLogoclose from '../../../public/icon.png';
import { cn } from '@/lib/utils';

interface SidebarProps {
  isSidebarOpen: boolean;
}

const navItems = [
  { href: '/dashboard', icon: LayoutGrid, label: 'Overview' },
  { href: '/dashboard/jobs', icon: FileText, label: 'Jobs' },
  { href: '/dashboard/assessments', icon: ClipboardList, label: 'Assessments' },
  { href: '/dashboard/templates', icon: Mail, label: 'Templates' },
  { href: '/dashboard/colleges', icon: Building2, label: 'Colleges'},
  { href: '/dashboard/all', icon: Users, label: 'All Candidates' },
  { href: '/dashboard/full-time', icon: Briefcase, label: 'Full-time' },
  { href: '/dashboard/intern', icon: GraduationCap, label: 'Interns' },
  { href: '/dashboard/freelance', icon: User, label: 'Freelance' },
];

export function Sidebar({ isSidebarOpen }: SidebarProps) {
  const pathname = usePathname();

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
    'group flex h-9 shrink-0 items-center justify-center gap-2 rounded-full text-lg font-semibold text-primary-foreground md:h-8',
    isSidebarOpen ? 'w-full' : 'w-9'
  )}
>
  <Image
    height={20}
    width={isSidebarOpen ? 80 : 20}
    src={isSidebarOpen ? mmLogoOpen : mmLogoclose} // ✅ switch image
    alt="Megamind Careers Logo"
    className={cn(
      'transition-all group-hover:scale-110',
      isSidebarOpen ? 'h-12 w-40' : 'h-8 w-8'
    )}
  />
</Link>

        <TooltipProvider>
          {navItems.map(item => {
            const isActive = item.href === '/dashboard' ? pathname === item.href : pathname.startsWith(item.href);
            return isSidebarOpen ? (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex w-full items-center gap-3 rounded-lg px-3 py-2 transition-all hover:text-primary',
                  isActive
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
                      isActive
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
          })}
        </TooltipProvider>
      </nav>
    </aside>
  );
}
