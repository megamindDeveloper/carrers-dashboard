'use client';

import type { ColumnDef } from '@tanstack/react-table';
import type { AssessmentSubmission } from '@/lib/types';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ArrowUpDown,
  MoreHorizontal,
} from 'lucide-react';
import { format } from 'date-fns';

const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds < 0) return '0m 0s';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
};


export const getColumns = (): ColumnDef<AssessmentSubmission>[] => {
  const columns: ColumnDef<AssessmentSubmission>[] = [
    {
      accessorKey: 'candidateName',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Candidate Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
       cell: ({ row }) => {
        const submission = row.original;
        return (
          <div className="flex flex-col">
            <span className="font-medium">{submission.candidateName}</span>
            <span className="text-sm text-muted-foreground">
              {submission.candidateEmail}
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: 'submittedAt',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Submitted At
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const { submittedAt } = row.original;
        if (!submittedAt) return 'N/A';
        try {
          const date = submittedAt.toDate ? submittedAt.toDate() : new Date(submittedAt);
          if (isNaN(date.getTime())) {
            return 'Invalid Date';
          }
          return format(date, 'MMM d, yyyy, h:mm a');
        } catch (e) {
          return 'Invalid Date';
        }
      },
    },
    {
        accessorKey: 'timeTaken',
        header: 'Time Taken',
        cell: ({ row }) => (
            <div>{formatTime(row.original.timeTaken)}</div>
        ),
    },
    {
    id: 'actions',
    cell: ({ row }) => {
      const submission = row.original;

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
                View Submission
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
  ];

  return columns;
};
