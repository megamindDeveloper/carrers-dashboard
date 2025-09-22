
'use client';

import type { ColumnDef } from '@tanstack/react-table';
import type { AppUser, NavItemId } from '@/lib/types';
import { NAV_ITEMS } from '@/lib/types';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/context/auth-context';

type GetColumnsProps = {
  onEdit: (user: AppUser) => void;
  onDelete: (user: AppUser) => void;
};

const getTabLabel = (id: NavItemId) => {
    return NAV_ITEMS.find(item => item.id === id)?.label || id;
};

export const getColumns = ({ onEdit, onDelete }: GetColumnsProps): ColumnDef<AppUser>[] => {
  const { user: currentUser } = useAuth();
  
  const columns: ColumnDef<AppUser>[] = [
    {
      accessorKey: 'email',
      header: 'Email',
    },
    {
      accessorKey: 'role',
      header: 'Role',
      cell: ({ row }) => {
        const { role } = row.original;
        return <Badge variant={role === 'superAdmin' ? 'default' : 'secondary'}>{role}</Badge>;
      },
    },
    {
        accessorKey: 'accessibleTabs',
        header: 'Accessible Tabs',
        cell: ({ row }) => {
          const { accessibleTabs, role } = row.original;
          if (role === 'superAdmin') {
            return <Badge variant="outline">All</Badge>
          }
          if (!accessibleTabs || accessibleTabs.length === 0) {
            return <span className="text-muted-foreground">None</span>;
          }
          return (
            <div className="flex flex-wrap gap-1">
              {accessibleTabs.map(tabId => (
                <Badge key={tabId} variant="secondary">{getTabLabel(tabId)}</Badge>
              ))}
            </div>
          );
        },
      },
    {
      id: 'actions',
      cell: ({ row }) => {
        const user = row.original;

        // A user cannot edit or delete themselves
        if (currentUser?.uid === user.uid) {
            return null;
        }

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => onEdit(user)}>
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDelete(user)} className="text-destructive">
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  return columns;
};
