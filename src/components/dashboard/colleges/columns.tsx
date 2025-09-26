'use client';

import type { ColumnDef } from '@tanstack/react-table';
import type { College } from '@/lib/types';
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
  Users,
} from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';

type GetColumnsProps = {
  onDelete: (collegeId: string, name: string) => void;
};


export const getColumns = ({ onDelete }: GetColumnsProps): ColumnDef<College>[] => {
  const columns: ColumnDef<College>[] = [
    {
      accessorKey: 'name',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          College Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => <div className="font-medium">{row.original.name}</div>,
    },
    {
        accessorKey: 'location',
        header: 'Location',
        cell: ({ row }) => <div>{row.original.location}</div>,
    },
    {
        accessorKey: 'contactPerson',
        header: 'Contact Person',
        cell: ({ row }) => (
            <div>
                <p>{row.original.contactPerson}</p>
                <p className="text-sm text-muted-foreground">{row.original.contactEmail}</p>
            </div>
        ),
    },
     {
      accessorKey: 'candidateCount',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Candidates
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
            <div className="text-center">{row.original.candidateCount || 0}</div>
        ),
      sortingFn: 'basic',
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
      const college = row.original;

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
            <DropdownMenuItem onClick={() => {
                const table = row.table;
                const onRowClick = table.options.meta?.onRowClick;
                 if (onRowClick) {
                    (onRowClick as (row: any) => void)(row);
                }
            }}>
                View/Edit Details
            </DropdownMenuItem>
             <DropdownMenuItem asChild>
              <Link href={`/dashboard/colleges/${college.id}`}>
                <Users className="mr-2 h-4 w-4" />
                Manage Candidates
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onDelete(college.id, college.name)}
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
