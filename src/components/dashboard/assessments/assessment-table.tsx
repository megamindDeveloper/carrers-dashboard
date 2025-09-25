'use client';
import React, { useEffect, useMemo, useState } from 'react';
import type { Assessment } from '@/lib/types';
import { DataTable } from '@/components/dashboard/data-table';
import { getColumns } from './columns';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { collection, onSnapshot, doc, addDoc, updateDoc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { db } from '@/app/utils/firebase/firebaseConfig';
import { useToast } from '@/hooks/use-toast';
import { AddEditAssessmentSheet } from './add-edit-assessment-sheet';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { ConfirmationDialog } from '../confirmation-dialog';

export function AssessmentTable() {
  const [data, setData] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAssessment, setSelectedAssessment] = useState<Assessment | null>(null);
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
    const colRef = collection(db, 'assessments');
    const unsub = onSnapshot(
      colRef,
      snapshot => {
        const assessments = snapshot.docs.map(d => ({
          id: d.id,
          ...(d.data() as Omit<Assessment, 'id'>),
        })).sort((a, b) => (b.createdAt?.toDate() ?? 0) - (a.createdAt?.toDate() ?? 0));
        setData(assessments);
        setLoading(false);
      },
      error => {
        console.error('onSnapshot error:', error);
        setLoading(false);
        toast({
            variant: 'destructive',
            title: 'Error fetching assessments',
            description: error.message,
        });
      }
    );
    return () => unsub();
  }, [toast]);

  const handleRowClick = (assessment: Assessment) => {
    setSelectedAssessment(assessment);
    setSheetOpen(true);
  };

  const handleAddNew = () => {
    setSelectedAssessment(null);
    setSheetOpen(true);
  };

  const handleCloseSheet = () => {
    setSheetOpen(false);
    setSelectedAssessment(null);
  };

  const handleDelete = (assessmentId: string, title: string) => {
    setConfirmation({
        isOpen: true,
        title: `Delete "${title}"?`,
        description: "Are you sure you want to delete this assessment? All associated submissions will also be lost. This action cannot be undone.",
        onConfirm: async () => {
            try {
                await deleteDoc(doc(db, 'assessments', assessmentId));
                toast({
                    title: "Assessment Deleted",
                    description: `"${title}" has been successfully deleted.`,
                });
            } catch (error) {
                console.error("Error deleting assessment:", error);
                toast({
                    variant: 'destructive',
                    title: 'Deletion Failed',
                    description: 'Could not delete the assessment.',
                });
            } finally {
                setConfirmation({ ...confirmation, isOpen: false });
            }
        },
    });
  }

  const handleSaveAssessment = async (assessmentData: Omit<Assessment, 'id' | 'createdAt'>, existingId?: string) => {
    try {
      if (existingId) {
        // Update existing assessment
        await updateDoc(doc(db, 'assessments', existingId), assessmentData);
        toast({
          title: 'Assessment Updated',
          description: `The assessment "${assessmentData.title}" has been updated successfully.`,
        });
      } else {
        // Add new assessment
        await addDoc(collection(db, 'assessments'), { ...assessmentData, createdAt: serverTimestamp() });
        toast({
          title: 'Assessment Added',
          description: `The assessment "${assessmentData.title}" has been created.`,
        });
      }
      handleCloseSheet();
    } catch (error) {
      console.error('Error saving assessment:', error);
      toast({
        variant: 'destructive',
        title: 'Save Failed',
        description: 'An error occurred while saving the assessment.',
      });
      throw error;
    }
  };

  const columns = useMemo(() => getColumns({ onDelete: handleDelete }), []);

  if (loading) return <p className="p-4">Loading assessments...</p>;

  return (
    <>
      <Card>
        <CardHeader className="flex flex-col items-stretch gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>Assessments</CardTitle>
            <CardDescription>Create, manage, and share candidate assessments.</CardDescription>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button onClick={handleAddNew} className="w-full sm:w-auto">
              <PlusCircle className="mr-2" />
              Create Assessment
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable columns={columns} data={data} onRowClick={handleRowClick} />
        </CardContent>
      </Card>
      <AddEditAssessmentSheet
        isOpen={isSheetOpen}
        onClose={handleCloseSheet}
        assessment={selectedAssessment}
        onSave={handleSaveAssessment}
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
