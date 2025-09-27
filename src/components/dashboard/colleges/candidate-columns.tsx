'use client';

import type { ColumnDef } from '@tanstack/react-table';
import type { CollegeCandidate, AssessmentSubmission } from '@/lib/types';
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
  ClipboardList,
  MoreHorizontal,
  Trash2,
} from 'lucide-react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';


export const getCandidateColumns = ({ onViewSubmission, onDelete }: { onViewSubmission: (submission: AssessmentSubmission) => void, onDelete: (candidateId: string, candidateName: string) => void; }): ColumnDef<CollegeCandidate>[] => {
  const columns: ColumnDef<CollegeCandidate>[] = [
    {
      accessorKey: 'name',
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
        const candidate = row.original;
        return (
          <div className="flex flex-col">
            <span className="font-medium">{candidate.name}</span>
            <span className="text-sm text-muted-foreground">
              {candidate.email}
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: 'submissionStatus',
      header: 'Submission Status',
      cell: ({ row }) => {
          const submission = row.original.submission;
          if (submission) {
              return (
                  <div className="flex flex-col">
                      <Badge variant="default" className="bg-green-500 hover:bg-green-600 mb-1 w-fit">Submitted</Badge>
                      <span className="text-xs text-muted-foreground">
                          {format(submission.submittedAt.toDate(), 'MMM d, yyyy')}
                      </span>
                  </div>
              );
          }
          return <Badge variant="secondary">Not Submitted</Badge>;
      }
    },
    {
      accessorKey: 'importedAt',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Imported At
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const { importedAt } = row.original as any;
        if (!importedAt) return 'N/A';
        try {
          const date = importedAt.toDate ? importedAt.toDate() : new Date(importedAt);
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
        id: 'actions',
        cell: ({ row }) => {
            const candidate = row.original;
            const submission = candidate.submission;

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
                    {submission && (
                      <DropdownMenuItem onClick={() => onViewSubmission(submission)}>
                        <ClipboardList className="mr-2 h-4 w-4" />
                        View Submission
                      </DropdownMenuItem>
                    )}
                     <DropdownMenuSeparator />
                     <DropdownMenuItem
                        onClick={() => onDelete(candidate.id, candidate.name)}
                        className="text-red-600 focus:text-red-600 focus:bg-red-50"
                        >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete Candidate
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
            );
        }
    }
  ];

  return columns;
};
