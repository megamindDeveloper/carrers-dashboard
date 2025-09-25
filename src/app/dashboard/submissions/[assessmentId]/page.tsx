'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { Loader2 } from 'lucide-react';
import { SubmissionTable } from '@/components/dashboard/submissions/submission-table';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/app/utils/firebase/firebaseConfig';
import type { Assessment } from '@/lib/types';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function SubmissionsPage({ params }: { params: { assessmentId: string } }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [assessmentLoading, setAssessmentLoading] = useState(true);
  const { assessmentId } = params;

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [user, loading, router]);

   useEffect(() => {
    if (!assessmentId) return;
    const fetchAssessment = async () => {
      try {
        const docRef = doc(db, 'assessments', assessmentId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setAssessment({ id: docSnap.id, ...docSnap.data() } as Assessment);
        } else {
          console.error("No such assessment!");
        }
      } catch (error) {
        console.error("Error fetching assessment:", error);
      } finally {
        setAssessmentLoading(false);
      }
    };

    fetchAssessment();
  }, [assessmentId]);

  if (loading || !user || assessmentLoading) {
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
                <Link href="/dashboard/assessments">
                    <ArrowLeft className="h-4 w-4" />
                </Link>
            </Button>
            <h1 className="text-2xl font-bold">{assessment?.title || 'Assessment'} Submissions</h1>
        </div>
        <SubmissionTable assessmentId={assessmentId} />
      </main>
  );
}
