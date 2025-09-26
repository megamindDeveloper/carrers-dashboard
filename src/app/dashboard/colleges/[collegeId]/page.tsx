
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/auth-context';
import { Loader2, ArrowLeft } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/app/utils/firebase/firebaseConfig';
import type { College } from '@/lib/types';
import { CollegeCandidateTable } from '@/components/dashboard/colleges/college-candidate-table';
import { Button } from '@/components/ui/button';

export default function CollegeDetailPage({ params }: { params: { collegeId: string } }) {
  const { collegeId } = params;
  const { user, loading } = useAuth();
  const router = useRouter();

  const [college, setCollege] = useState<College | null>(null);
  const [collegeLoading, setCollegeLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (collegeId) {
      const fetchCollege = async () => {
        try {
          const docRef = doc(db, 'colleges', collegeId);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setCollege({ id: docSnap.id, ...docSnap.data() } as College);
          } else {
            console.error("No such college found!");
          }
        } catch (error) {
          console.error("Error fetching college:", error);
        } finally {
          setCollegeLoading(false);
        }
      };
      fetchCollege();
    }
  }, [collegeId]);

  if (loading || !user || collegeLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
       <div className="flex items-center gap-4">
          <Button asChild variant="outline" size="icon">
              <Link href="/dashboard/colleges">
                  <ArrowLeft className="h-4 w-4" />
              </Link>
          </Button>
          <h1 className="text-2xl font-bold">{college?.name || 'College'} Candidates</h1>
      </div>
      <CollegeCandidateTable collegeId={collegeId} />
    </main>
  );
}
