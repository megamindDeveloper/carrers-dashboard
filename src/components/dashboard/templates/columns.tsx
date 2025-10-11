
'use client';

import type { ColumnDef } from '@tanstack/react-table';
import type { EmailTemplate } from '@/lib/types';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ArrowUpDown,
  MoreHorizontal,
  Trash2,
} from 'lucide-react';
import { format } from 'date-fns';

type GetColumnsProps = {
  onEdit: (template: EmailTemplate) => void;
  onDelete: (templateId: string, name: string) => void;
};


export const getColumns = ({ onEdit, onDelete }: GetColumnsProps): ColumnDef<EmailTemplate>[] => {
  const columns: ColumnDef<EmailTemplate>[] = [
    {
      accessorKey: 'name',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Template Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => <div className="font-medium">{row.original.name}</div>,
    },
    {
      accessorKey: 'subject',
      header: 'Subject',
      cell: ({ row }) => <div className="truncate max-w-sm">{row.original.subject}</div>,
    },
    {
      accessorKey: 'createdAt',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Created At
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const { createdAt } = row.original;
        if (!createdAt) return 'N/A';
        try {
          const date = createdAt.toDate ? createdAt.toDate() : new Date(createdAt);
          if (isNaN(date.getTime())) {
            return 'Invalid Date';
          }
          return format(date, 'MMM d, yyyy');
        } catch (e) {
          return 'Invalid Date';
        }
      },
    },
    {
    id: 'actions',
    cell: ({ row }) => {
      const template = row.original;
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={e => e.stopPropagation()}>
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => onEdit(template)}>
                View/Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onDelete(template.id, template.name)}
              className="text-red-600 focus:text-red-600 focus:bg-red-50"
            >
              <Trash2 className="mr-2 h-4 w-4" />
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
