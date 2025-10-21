
'use client';

import type { ColumnDef } from '@tanstack/react-table';
import type { AssessmentSubmission, CandidateStatus, College, Candidate, CollegeCandidate } from '@/lib/types';
import { CANDIDATE_STATUSES } from '@/lib/types';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from '@/components/ui/dropdown-menu';
import {
  ArrowUpDown,
  MoreHorizontal,
  Trash2,
} from 'lucide-react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';

const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds < 0) return '0m 0s';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
};




const toTitleCase = (str: string | undefined): string => {
    if (!str) return '';
    return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase());
};

type PositionMap = { [email: string]: string };
type GetColumnsArgs = {
  onStatusChange: (submission: AssessmentSubmission, newStatus: CandidateStatus) => void;
  colleges?: College[];
  positionMap?: PositionMap;
};

export const getColumns = ({ onStatusChange, colleges = [], positionMap = {} }: GetColumnsArgs): ColumnDef<AssessmentSubmission>[] => {

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
    // {
    //     accessorKey: 'collegeId',
    //     header: 'College',
    //     cell: ({ row }) => {
    //         const collegeId = row.original.collegeId;
    //         if (!collegeId) return 'Direct';
    //         const college = colleges.find(c => c.id === collegeId);
    //         return college ? <Badge variant="secondary">{college.name}</Badge> : 'Unknown College';
    //     },
    //     filterFn: (row, columnId, filterValue) => {
    //         if (!filterValue || filterValue.length === 0) return true;
    //          const collegeId = row.original.collegeId || 'Direct';
    //         return (filterValue as string[]).includes(collegeId);
    //     },
    // },
   {
        accessorKey: 'answers',
        header: 'Position Applied For',
        cell: ({ row }) => {
            const submission = row.original;
            const positionAnswer = submission.answers.find(a => a.questionText?.toLowerCase().includes('position applying for'));
            const position = positionAnswer?.answer || positionMap[submission.candidateEmail.toLowerCase()] || 'N/A';
            return position;
        },
        filterFn: (row, columnId, filterValue) => {
            if (!filterValue || filterValue.length === 0) return true;
            const submission = row.original;
            const positionAnswer = submission.answers.find(a => a.questionText?.toLowerCase().includes('position applying for'));
            const position = positionAnswer?.answer || positionMap[submission.candidateEmail.toLowerCase()];

            return position ? (filterValue as string[]).includes(position) : false;
        },
    },
     {
      id: 'candidateStatus',
      accessorKey: 'candidateStatus',
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
        const status = (row.original as any).candidateStatus;
        if (!status) return <Badge variant="outline">Unknown</Badge>;

        const safeStatus = toTitleCase(status) ?? 'Unknown';
        
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
      const candidateStatus = (row.original as any).candidateStatus as CandidateStatus | undefined;

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
             <DropdownMenuSub>
                <DropdownMenuSubTrigger disabled={!candidateStatus}>
                    <span>Change Status</span>
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                    <DropdownMenuRadioGroup
                    value={candidateStatus ? toTitleCase(candidateStatus) : undefined}
                    onValueChange={(value) => onStatusChange(submission, value as CandidateStatus)}
                    >
                    {CANDIDATE_STATUSES.map((status) => (
                        <DropdownMenuRadioItem key={status} value={status} disabled={!candidateStatus}>
                        {status}
                        </DropdownMenuRadioItem>
                    ))}
                    </DropdownMenuRadioGroup>
                </DropdownMenuSubContent>
            </DropdownMenuSub>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
  ];

  return columns;
};
