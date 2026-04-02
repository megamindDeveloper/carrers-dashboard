
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  doc,
  runTransaction,
  writeBatch,
  serverTimestamp,
  addDoc,
} from 'firebase/firestore';
import { db } from '@/app/utils/firebase/firebaseConfig';
import type { Job, JobType } from '@/lib/types';

/**
 * Get the next available priority for a given job type.
 * Returns max(priority) + 1, or 1 if no jobs of that type exist.
 */
export async function getNextPriority(type: JobType): Promise<number> {
  const jobsRef = collection(db, 'jobs');
  const q = query(jobsRef, where('type', '==', type), orderBy('priority', 'desc'));
  const snapshot = await getDocs(q);

  if (snapshot.empty) return 1;

  const maxPriority = snapshot.docs[0].data().priority as number;
  return (maxPriority || 0) + 1;
}

/**
 * Create a new job with a specific priority.
 * Uses a Firestore transaction to shift existing jobs down if needed.
 *
 * Example: Existing internships [1,2,3], insert at priority 1
 * → New job gets 1, old 1→2, old 2→3, old 3→4
 */
export async function createJobWithPriority(
  jobData: Omit<Job, 'id' | 'createdAt' | 'priority'>,
  priority: number
): Promise<void> {
  const jobsRef = collection(db, 'jobs');

  // Query all jobs of the same type with priority >= new priority
  const q = query(
    jobsRef,
    where('type', '==', jobData.type),
    where('priority', '>=', priority),
    orderBy('priority', 'asc')
  );

  await runTransaction(db, async (transaction) => {
    const snapshot = await getDocs(q);

    // Shift all affected jobs' priorities down by +1
    snapshot.docs.forEach((docSnap) => {
      const jobDocRef = doc(db, 'jobs', docSnap.id);
      const currentPriority = docSnap.data().priority as number;
      transaction.update(jobDocRef, { priority: currentPriority + 1 });
    });

    // Create the new job with the given priority
    const newJobRef = doc(collection(db, 'jobs'));
    transaction.set(newJobRef, {
      ...jobData,
      priority,
      createdAt: serverTimestamp(),
    });
  });
}

/**
 * Update a job's priority using a Firestore transaction.
 *
 * Case 1: Moving UP (oldPriority=3 → newPriority=1)
 *   Shift jobs with priority >= 1 AND priority < 3 down (+1)
 *
 * Case 2: Moving DOWN (oldPriority=1 → newPriority=3)
 *   Shift jobs with priority > 1 AND priority <= 3 up (-1)
 */
export async function updateJobPriority(
  jobId: string,
  newPriority: number
): Promise<void> {
  const jobDocRef = doc(db, 'jobs', jobId);
  const jobsRef = collection(db, 'jobs');

  await runTransaction(db, async (transaction) => {
    const jobSnap = await transaction.get(jobDocRef);
    if (!jobSnap.exists()) {
      throw new Error('Job not found');
    }

    const jobData = jobSnap.data();
    const oldPriority = jobData.priority as number;
    const jobType = jobData.type as JobType;

    // No change needed
    if (oldPriority === newPriority) return;

    if (newPriority < oldPriority) {
      // Moving UP: shift jobs with priority >= newPriority AND < oldPriority down (+1)
      const q = query(
        jobsRef,
        where('type', '==', jobType),
        where('priority', '>=', newPriority),
        where('priority', '<', oldPriority),
        orderBy('priority', 'asc')
      );
      const snapshot = await getDocs(q);

      snapshot.docs.forEach((docSnap) => {
        const ref = doc(db, 'jobs', docSnap.id);
        const currentPriority = docSnap.data().priority as number;
        transaction.update(ref, { priority: currentPriority + 1 });
      });
    } else {
      // Moving DOWN: shift jobs with priority > oldPriority AND <= newPriority up (-1)
      const q = query(
        jobsRef,
        where('type', '==', jobType),
        where('priority', '>', oldPriority),
        where('priority', '<=', newPriority),
        orderBy('priority', 'asc')
      );
      const snapshot = await getDocs(q);

      snapshot.docs.forEach((docSnap) => {
        const ref = doc(db, 'jobs', docSnap.id);
        const currentPriority = docSnap.data().priority as number;
        transaction.update(ref, { priority: currentPriority - 1 });
      });
    }

    // Update the job itself
    transaction.update(jobDocRef, { priority: newPriority });
  });
}

/**
 * One-time migration: assigns sequential priorities to existing jobs
 * that don't have a priority field.
 * Groups by type, sorts by createdAt (oldest = priority 1).
 * Uses a batch write for performance.
 */
export async function migrateExistingJobPriorities(): Promise<boolean> {
  const jobsRef = collection(db, 'jobs');
  const snapshot = await getDocs(jobsRef);

  // Find jobs without a priority field
  const jobsWithoutPriority = snapshot.docs.filter(
    (docSnap) => docSnap.data().priority === undefined || docSnap.data().priority === null
  );

  if (jobsWithoutPriority.length === 0) return false;

  // Group by type
  const grouped: Record<string, { id: string; createdAt: any }[]> = {};
  jobsWithoutPriority.forEach((docSnap) => {
    const data = docSnap.data();
    const type = data.type || 'full-time';
    if (!grouped[type]) grouped[type] = [];
    grouped[type].push({ id: docSnap.id, createdAt: data.createdAt });
  });

  // For each type, also find the current max priority (from jobs that DO have priority)
  const existingMaxPriorities: Record<string, number> = {};
  snapshot.docs.forEach((docSnap) => {
    const data = docSnap.data();
    if (data.priority !== undefined && data.priority !== null) {
      const type = data.type || 'full-time';
      existingMaxPriorities[type] = Math.max(existingMaxPriorities[type] || 0, data.priority);
    }
  });

  const batch = writeBatch(db);

  for (const [type, jobs] of Object.entries(grouped)) {
    // Sort by createdAt ascending (oldest first)
    jobs.sort((a, b) => {
      const dateA = a.createdAt?.toDate?.() ?? new Date(0);
      const dateB = b.createdAt?.toDate?.() ?? new Date(0);
      return dateA.getTime() - dateB.getTime();
    });

    // Start from max existing priority + 1 or 1
    let nextPriority = (existingMaxPriorities[type] || 0) + 1;

    jobs.forEach((job) => {
      const jobDocRef = doc(db, 'jobs', job.id);
      batch.update(jobDocRef, { priority: nextPriority });
      nextPriority++;
    });
  }

  await batch.commit();
  return true;
}
