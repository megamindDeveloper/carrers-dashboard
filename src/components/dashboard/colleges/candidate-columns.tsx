
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

interface GetCandidateColumnsProps {
    onViewSubmission: (submission: AssessmentSubmission) => void;
    onDelete: (candidateId: string, candidateName: string) => void;
    selectedAssessmentId: string;
}

export const getCandidateColumns = ({ onViewSubmission, onDelete, selectedAssessmentId }: GetCandidateColumnsProps): ColumnDef<CollegeCandidate>[] => {
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
        id: 'assessmentStatus',
        header: 'Assessment Status',
        cell: ({ row }) => {
            const { submissions } = row.original;
            if (!selectedAssessmentId) {
                return <span className="text-xs text-muted-foreground">Select an assessment</span>;
            }

            const submission = submissions?.find(s => s.assessmentId === selectedAssessmentId);

            if (submission) {
                return (
                    <Button variant="secondary" size="sm" onClick={(e) => { e.stopPropagation(); onViewSubmission(submission); }}>
                        <ClipboardList className="mr-2 h-4 w-4 text-green-600" />
                        Submitted
                    </Button>
                )
            }
            
            return <Badge variant="outline">Pending</Badge>;
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
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0" onClick={e => e.stopPropagation()}>
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={e => e.stopPropagation()}>
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
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
      },
    },
  ];

  return columns;
};
