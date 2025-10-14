

'use client';

import type { ColumnDef } from '@tanstack/react-table';
import type { CollegeCandidate, AssessmentSubmission, CandidateStatus } from '@/lib/types';
import { CANDIDATE_STATUSES } from '@/lib/types';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from '@/components/ui/dropdown-menu';
import {
  ArrowUpDown,
  ClipboardList,
  MoreHorizontal,
  Trash2,
  RefreshCcw,
} from 'lucide-react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';

interface GetCandidateColumnsProps {
    onViewSubmission: (submission: AssessmentSubmission) => void;
    onDelete: (candidateId: string, candidateName: string) => void;
    onResetSubmission: (submission: AssessmentSubmission, candidate: CollegeCandidate) => void;
    onStatusChange: (candidateId: string, status: CandidateStatus) => void;
    selectedAssessmentId: string;
}

const toTitleCase = (str: string | undefined): string => {
    if (!str) return '';
    return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase());
};

export const getCandidateColumns = ({ onViewSubmission, onDelete, onResetSubmission, onStatusChange, selectedAssessmentId }: GetCandidateColumnsProps): ColumnDef<CollegeCandidate>[] => {
  const columns: ColumnDef<CollegeCandidate>[] = [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && 'indeterminate')
          }
          onCheckedChange={value => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
          onClick={e => e.stopPropagation()}
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={value => row.toggleSelected(!!value)}
          aria-label="Select row"
          onClick={e => e.stopPropagation()}
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
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
      accessorKey: 'status',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Status
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const { status } = row.original;
        const safeStatus = toTitleCase(status as string) ?? 'Applied';
        
        let variant: 'default' | 'secondary' | 'destructive' | 'outline' = 'secondary';

        switch (safeStatus) {
            case 'Applied': variant = 'secondary'; break;
            case 'Shortlisted': variant = 'default'; break;
            case 'Rejected': variant = 'destructive'; break;
            default: variant = 'outline'; break;
        }

        return <Badge variant={variant}>{safeStatus}</Badge>;
      },
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
        const submission = candidate.submissions?.find(s => s.assessmentId === selectedAssessmentId);

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
               {submission && (
                <DropdownMenuItem onClick={() => onViewSubmission(submission)}>
                    <ClipboardList className="mr-2 h-4 w-4" />
                    View Submission
                </DropdownMenuItem>
              )}
               {submission && (
                <DropdownMenuItem onClick={() => onResetSubmission(submission, candidate)}>
                    <RefreshCcw className="mr-2 h-4 w-4" />
                    Reset Submission
                </DropdownMenuItem>
              )}
               <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <span>Change Status</span>
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    <DropdownMenuRadioGroup
                      value={toTitleCase(candidate.status as string)}
                      onValueChange={(value) =>
                        onStatusChange(candidate.id, value as CandidateStatus)
                      }
                    >
                      {CANDIDATE_STATUSES.map((status) => (
                        <DropdownMenuRadioItem key={status} value={status}>
                          {status}
                        </DropdownMenuRadioItem>
                      ))}
                    </DropdownMenuRadioGroup>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
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
      },
    },
  ];

  return columns;
};
