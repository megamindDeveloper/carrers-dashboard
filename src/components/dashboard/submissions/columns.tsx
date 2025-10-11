
'use client';

import type { ColumnDef } from '@tanstack/react-table';
import type { AssessmentSubmission, College } from '@/lib/types';
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
import { Badge } from '@/components/ui/badge';

const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds < 0) return '0m 0s';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
};


export const getColumns = (colleges: College[] = []): ColumnDef<AssessmentSubmission>[] => {
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
        accessorKey: 'collegeId',
        header: 'College',
        cell: ({ row }) => {
            const collegeId = row.original.collegeId;
            if (!collegeId) return 'Direct';
            const college = colleges.find(c => c.id === collegeId);
            return college ? <Badge variant="secondary">{college.name}</Badge> : 'Unknown College';
        },
        filterFn: (row, columnId, filterValue) => {
            if (!filterValue || filterValue.length === 0) return true;
            return filterValue.includes(row.original.collegeId);
        },
    },
    {
        accessorKey: 'answers',
        header: 'Position Applied For',
        cell: ({ row }) => {
            const positionAnswer = row.original.answers.find(a => a.questionText?.toLowerCase().includes('position applying for'));
            return positionAnswer?.answer || 'N/A';
        },
        filterFn: (row, columnId, filterValue) => {
            if (!filterValue || filterValue.length === 0) return true;
            const positionAnswer = row.original.answers.find(a => a.questionText?.toLowerCase().includes('position applying for'));
            return filterValue.includes(positionAnswer?.answer);
        },
    },
    {
        accessorKey: 'score',
        header: ({ column }) => (
            <Button
                variant="ghost"
                onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                >
                Score
                <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
        ),
        cell: ({ row }) => {
            const { score, maxScore } = row.original;
            if (typeof score !== 'number' || typeof maxScore !== 'number' || maxScore === 0) {
                return 'N/A';
            }
            return `${score}/${maxScore}`;
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
    cell: ({ row, table }) => {
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
            <DropdownMenuItem
              onClick={() => {
                const onRowClick = (table.options.meta as any)?.onRowClick;
                if (onRowClick) {
                  onRowClick(submission);
                }
              }}
            >
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
