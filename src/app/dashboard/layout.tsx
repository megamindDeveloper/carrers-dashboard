

'use client';

import { Header } from '@/components/dashboard/header';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
        <div className="flex min-h-screen w-full flex-col">
          <Header />
          {children}
        </div>
  );
}
