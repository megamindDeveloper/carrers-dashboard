'use client';

import { useState } from 'react';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Header } from '@/components/dashboard/header';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
      <Sidebar isSidebarOpen={isSidebarOpen} />
      <div
        className={`flex flex-col sm:gap-4 sm:py-4 transition-[padding-left] duration-300 ${
          isSidebarOpen ? 'sm:pl-52' : 'sm:pl-14'
        }`}
      >
        <Header onToggleSidebar={() => setSidebarOpen(!isSidebarOpen)} />
        <main className="flex-1 gap-4 p-4 sm:px-6 sm:py-0 md:gap-8">
            {children}
        </main>
      </div>
    </div>
  );
}
