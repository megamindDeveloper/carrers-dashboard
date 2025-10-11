
'use client';
import React, { useEffect, useMemo, useState } from 'react';
import type { EmailTemplate } from '@/lib/types';
import { DataTable } from '@/components/dashboard/data-table';
import { getColumns } from './columns';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { collection, onSnapshot, doc, addDoc, updateDoc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { db } from '@/app/utils/firebase/firebaseConfig';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { ConfirmationDialog } from '../confirmation-dialog';
import { AddEditTemplateSheet } from './add-edit-template-sheet';

export function TemplateTable() {
  const [data, setData] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
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
    const colRef = collection(db, 'emailTemplates');
    const unsub = onSnapshot(
      colRef,
      (snapshot) => {
        const templates = snapshot.docs.map(d => ({
          id: d.id,
          ...(d.data() as Omit<EmailTemplate, 'id'>),
        })).sort((a, b) => (b.createdAt?.toDate() ?? 0) - (a.createdAt?.toDate() ?? 0));
        
        setData(templates);
        setLoading(false);
      },
      error => {
        console.error('onSnapshot error:', error);
        setLoading(false);
        toast({
            variant: 'destructive',
            title: 'Error fetching templates',
            description: error.message,
        });
      }
    );
    return () => unsub();
  }, [toast]);

  const handleRowClick = (template: EmailTemplate) => {
    setSelectedTemplate(template);
    setSheetOpen(true);
  };

  const handleAddNew = () => {
    setSelectedTemplate(null);
    setSheetOpen(true);
  };

  const handleCloseSheet = () => {
    setSheetOpen(false);
    setSelectedTemplate(null);
  };

  const handleDelete = (templateId: string, name: string) => {
    setConfirmation({
        isOpen: true,
        title: `Delete "${name}"?`,
        description: "Are you sure you want to delete this email template? This action cannot be undone.",
        onConfirm: async () => {
            try {
                await deleteDoc(doc(db, 'emailTemplates', templateId));
                toast({
                    title: "Template Deleted",
                    description: `"${name}" has been successfully deleted.`,
                });
            } catch (error) {
                console.error("Error deleting template:", error);
                toast({
                    variant: 'destructive',
                    title: 'Deletion Failed',
                    description: 'Could not delete the email template.',
                });
            } finally {
                setConfirmation({ ...confirmation, isOpen: false });
            }
        },
    });
  }

  const handleSaveTemplate = async (templateData: Omit<EmailTemplate, 'id' | 'createdAt'>, existingId?: string) => {
    try {
      if (existingId) {
        await updateDoc(doc(db, 'emailTemplates', existingId), templateData);
        toast({
          title: 'Template Updated',
          description: `The template "${templateData.name}" has been updated successfully.`,
        });
      } else {
        await addDoc(collection(db, 'emailTemplates'), { ...templateData, createdAt: serverTimestamp() });
        toast({
          title: 'Template Created',
          description: `The template "${templateData.name}" has been created.`,
        });
      }
      handleCloseSheet();
    } catch (error) {
      console.error('Error saving template:', error);
      toast({
        variant: 'destructive',
        title: 'Save Failed',
        description: 'An error occurred while saving the email template.',
      });
      throw error;
    }
  };

  const columns = useMemo(() => getColumns({ onEdit: handleRowClick, onDelete: handleDelete }), [handleDelete]);

  if (loading) return <p className="p-4">Loading email templates...</p>;

  return (
    <>
      <Card>
        <CardHeader className="flex flex-col items-stretch gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="mb-1">Email Templates</CardTitle>
            <CardDescription>Create and manage reusable email templates for your communications.</CardDescription>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button onClick={handleAddNew} className="w-full sm:w-auto">
              <PlusCircle className="mr-2" />
              Create Template
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable columns={columns} data={data} onRowClick={handleRowClick} />
        </CardContent>
      </Card>
      <AddEditTemplateSheet
        isOpen={isSheetOpen}
        onClose={handleCloseSheet}
        template={selectedTemplate}
        onSave={handleSaveTemplate}
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
