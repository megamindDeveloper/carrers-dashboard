
'use client';
import { useEffect, useState } from 'react';
import type { AppUser } from '@/lib/types';
import { collection, onSnapshot, doc, setDoc } from 'firebase/firestore';
import { db } from '@/app/utils/firebase/firebaseConfig';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Loader2, PlusCircle } from 'lucide-react';
import { AddEditUserSheet } from './add-edit-user-sheet';
import { DataTable } from '../data-table';
import { getColumns } from './columns';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export function UserManagementTable() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSheetOpen, setSheetOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);
  const [userToDelete, setUserToDelete] = useState<AppUser | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'users'), snapshot => {
      const fetchedUsers = snapshot.docs.map(
        d => ({ uid: d.id, ...d.data() } as AppUser)
      );
      setUsers(fetchedUsers);
      setLoading(false);
    },
    (error) => {
        console.error("Failed to fetch users:", error);
        toast({ variant: 'destructive', title: "Error", description: "Could not fetch users." });
        setLoading(false);
    });
    return () => unsub();
  }, [toast]);

  const handleAddNew = () => {
    setSelectedUser(null);
    setSheetOpen(true);
  };

  const handleEdit = (user: AppUser) => {
    setSelectedUser(user);
    setSheetOpen(true);
  };
  
  const handleDeleteRequest = (user: AppUser) => {
    setUserToDelete(user);
  };

  const confirmDelete = async () => {
    if (!userToDelete) return;

    try {
        const response = await fetch('/api/users', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ uid: userToDelete.uid }),
        });

        if (!response.ok) {
            const result = await response.json();
            throw new Error(result.error || 'Failed to delete user.');
        }

        toast({
            title: 'User Deleted',
            description: `User ${userToDelete.email} has been deleted.`,
        });
    } catch (error: any) {
        toast({
            variant: 'destructive',
            title: 'Deletion Failed',
            description: error.message,
        });
    } finally {
        setUserToDelete(null);
    }
  };


  const handleSave = async (userData: any) => {
     try {
       const response = await fetch('/api/users', {
         method: userData.uid ? 'PUT' : 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify(userData),
       });

       if (!response.ok) {
        const result = await response.json();
         throw new Error(result.error || 'An unknown error occurred.');
       }

       const result = await response.json();
       toast({
         title: userData.uid ? 'User Updated' : 'User Created',
         description: `User ${result.email} has been saved.`,
       });
       setSheetOpen(false);
     } catch (error: any) {
        console.error("Error saving user:", error);
       toast({
         variant: "destructive",
         title: "Save Failed",
         description: error.message,
       });
       // Re-throw to keep the sheet open
       throw error;
     }
  };

  const columns = getColumns({ onEdit: handleEdit, onDelete: handleDeleteRequest });
  
  if (loading) {
      return <div className="flex justify-center items-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={handleAddNew}>
          <PlusCircle className="mr-2" /> Add User
        </Button>
      </div>
      <DataTable columns={columns} data={users} onRowClick={handleEdit} />
      <AddEditUserSheet
        isOpen={isSheetOpen}
        onClose={() => setSheetOpen(false)}
        user={selectedUser}
        onSave={handleSave}
      />
       <AlertDialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the user account
              for <strong>{userToDelete?.email}</strong> and remove their data from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setUserToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
