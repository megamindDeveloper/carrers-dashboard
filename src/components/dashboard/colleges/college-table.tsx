'use client';
import React, { useEffect, useMemo, useState } from 'react';
import type { College } from '@/lib/types';
import { DataTable } from '@/components/dashboard/data-table';
import { getColumns } from './columns';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { collection, onSnapshot, doc, addDoc, updateDoc, serverTimestamp, deleteDoc, query, where, getDocs, writeBatch } from 'firebase/firestore';
import { db } from '@/app/utils/firebase/firebaseConfig';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { ConfirmationDialog } from '../confirmation-dialog';
import { AddEditCollegeSheet } from './add-edit-college-sheet';

export function CollegeTable() {
  const [data, setData] = useState<College[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCollege, setSelectedCollege] = useState<College | null>(null);
  const [isSheetOpen, setSheetOpen] = useState(false);
  const { toast } = useToast();
  const [confirmation, setConfirmation] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    description: '',
    onConfirm: () => {},
  });

  useEffect(() => {
    const colRef = collection(db, 'colleges');
    const unsub = onSnapshot(
      colRef,
      async (snapshot) => {
        const colleges = snapshot.docs.map(d => ({
          id: d.id,
          ...(d.data() as Omit<College, 'id'>),
        }));

        const collegesWithCounts = await Promise.all(
            colleges.map(async (college) => {
              const candidatesQuery = query(
                collection(db, `colleges/${college.id}/candidates`)
              );
              const candidatesSnapshot = await getDocs(candidatesQuery);
              return {
                ...college,
                candidateCount: candidatesSnapshot.size,
              };
            })
        );
        
        const sortedColleges = collegesWithCounts.sort((a, b) => (b.createdAt?.toDate() ?? 0) - (a.createdAt?.toDate() ?? 0));
        setData(sortedColleges);
        setLoading(false);
      },
      error => {
        console.error('onSnapshot error:', error);
        setLoading(false);
        toast({
            variant: 'destructive',
            title: 'Error fetching colleges',
            description: error.message,
        });
      }
    );
    return () => unsub();
  }, [toast]);

  const handleRowClick = (college: College) => {
    setSelectedCollege(college);
    setSheetOpen(true);
  };

  const handleAddNew = () => {
    setSelectedCollege(null);
    setSheetOpen(true);
  };

  const handleCloseSheet = () => {
    setSheetOpen(false);
    setSelectedCollege(null);
  };

  const handleDelete = (collegeId: string, name: string) => {
    setConfirmation({
        isOpen: true,
        title: `Delete "${name}"?`,
        description: "Are you sure you want to delete this college? All associated candidates will also be deleted. This action cannot be undone.",
        onConfirm: async () => {
            try {
                // Also delete subcollection of candidates
                const candidatesQuery = query(collection(db, `colleges/${collegeId}/candidates`));
                const candidatesSnapshot = await getDocs(candidatesQuery);
                const batch = writeBatch(db);
                candidatesSnapshot.docs.forEach(doc => {
                    batch.delete(doc.ref);
                });
                await batch.commit();

                await deleteDoc(doc(db, 'colleges', collegeId));
                
                toast({
                    title: "College Deleted",
                    description: `"${name}" has been successfully deleted.`,
                });
            } catch (error) {
                console.error("Error deleting college:", error);
                toast({
                    variant: 'destructive',
                    title: 'Deletion Failed',
                    description: 'Could not delete the college.',
                });
            } finally {
                setConfirmation({ ...confirmation, isOpen: false });
            }
        },
    });
  }

  const handleSaveCollege = async (collegeData: Omit<College, 'id' | 'createdAt'>, existingId?: string) => {
    try {
      if (existingId) {
        await updateDoc(doc(db, 'colleges', existingId), collegeData);
        toast({
          title: 'College Updated',
          description: `"${collegeData.name}" has been updated successfully.`,
        });
      } else {
        await addDoc(collection(db, 'colleges'), { ...collegeData, createdAt: serverTimestamp() });
        toast({
          title: 'College Added',
          description: `"${collegeData.name}" has been created.`,
        });
      }
      handleCloseSheet();
    } catch (error) {
      console.error('Error saving college:', error);
      toast({
        variant: 'destructive',
        title: 'Save Failed',
        description: 'An error occurred while saving the college.',
      });
      throw error;
    }
  };

  const columns = useMemo(() => getColumns({ onDelete: handleDelete }), []);

  if (loading) return <p className="p-4">Loading colleges...</p>;

  return (
    <>
      <Card>
        <CardHeader className="flex flex-col items-stretch gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>Colleges</CardTitle>
            <CardDescription>Manage partner colleges and import candidates.</CardDescription>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button onClick={handleAddNew} className="w-full sm:w-auto">
              <PlusCircle className="mr-2" />
              Add College
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable columns={columns} data={data} onRowClick={handleRowClick} />
        </CardContent>
      </Card>
      <AddEditCollegeSheet
        isOpen={isSheetOpen}
        onClose={handleCloseSheet}
        college={selectedCollege}
        onSave={handleSaveCollege}
      />
       <ConfirmationDialog
        isOpen={confirmation.isOpen}
        onOpenChange={(isOpen) => setConfirmation({ ...confirmation, isOpen })}
        title={confirmation.title}
        description={confirmation.description}
        onConfirm={confirmation.onConfirm}
        onCancel={() => setConfirmation({ ...confirmation, isOpen: false })}
      />
    </>
  );
}
