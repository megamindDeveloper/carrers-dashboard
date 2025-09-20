
'use client';

import type { ColumnDef } from '@tanstack/react-table';
import type { Candidate, CandidateStatus, CandidateType } from '@/lib/types';
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
  MoreHorizontal,
  FileText,
  ExternalLink,
  Video,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

type GetColumnsProps = {
  onStatusChange: (candidateId: string, status: CandidateStatus) => void;
  filterType?: CandidateType;
};

const toTitleCase = (str: string) => {
    if (!str) return '';
    return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase());
};

export const getColumns = ({
  onStatusChange,
  filterType,
}: GetColumnsProps): ColumnDef<Candidate>[] => {
  const baseColumns: ColumnDef<Candidate>[] = [
    {
      id: 'slNo',
      header: 'Sl. No.',
      cell: ({ row, table }) => {
        const { pageIndex, pageSize } = table.getState().pagination;
        const index = (pageIndex * pageSize) + row.index + 1;
        return <span>{index}</span>;
      },
    },
    {
      accessorKey: 'fullName',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Full Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const candidate = row.original;
        const name = candidate.fullName ?? 'Unnamed Candidate';
        return (
          <div className="flex items-center gap-3">
            <div className="flex flex-col">
              <span className="font-medium">{name}</span>
              <span className="text-sm text-muted-foreground">
                {candidate.email ?? 'No email'}
              </span>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'position',
      header: 'Position',
      cell: ({ row }) => (
        <Badge variant="secondary">{row.original.position ?? 'N/A'}</Badge>
      ),
    },
  ];

  const experienceColumn: ColumnDef<Candidate> = {
    accessorKey: 'experience',
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        Experience
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const candidate = row.original;
      const experience = candidate.experience || candidate.workExperience;
      return <div className="truncate max-w-[200px]">{experience || 'N/A'}</div>
    },
  };
  
  const introVideoColumn: ColumnDef<Candidate> = {
    accessorKey: 'introductionVideoIntern',
    header: 'Intro Video',
    cell: ({ row }) => {
      const { introductionVideoIntern } = row.original;
      if (!introductionVideoIntern) {
        return <span className="text-muted-foreground">N/A</span>;
      }
      return (
        <Button
          variant="outline"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            window.open(introductionVideoIntern, '_blank');
          }}
        >
          <Video className="mr-2 h-4 w-4" />
          View
        </Button>
      );
    },
  };

  const commonColumns: ColumnDef<Candidate>[] = [
    {
      accessorKey: 'submittedAt',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Applied Date
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
          return format(date, 'MMM d, yyyy');
        } catch (e) {
          return 'Invalid Date';
        }
      },
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
        const safeStatus = toTitleCase(status as string) ?? 'Unknown';
        let variant: 'default' | 'secondary' | 'destructive' = 'secondary';
        if (['Shortlisted', 'First Round', 'Second Round', 'Third Round', 'Final Round'].includes(safeStatus)) {
          variant = 'default';
        } else if (safeStatus === 'Rejected') {
          variant = 'destructive';
        } else if (safeStatus === 'Hired') {
          variant = 'default';
        }
        return <Badge variant={variant}>{safeStatus}</Badge>;
      },
      filterFn: (row, columnId, filterValue) => {
          const status = row.getValue(columnId) as string;
          return toTitleCase(status) === filterValue;
      }
    },
  ];

  const actionColumn: ColumnDef<Candidate> = {
    id: 'actions',
    cell: ({ row }) => {
      const candidate = row.original;
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
            {candidate.portfolio && (
              <DropdownMenuItem
                onClick={() => window.open(candidate.portfolio!, '_blank')}
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                View Portfolio
              </DropdownMenuItem>
            )}
            {candidate.resumeUrl && (
              <DropdownMenuItem onClick={() => window.open(candidate.resumeUrl!, '_blank')}>
                <FileText className="mr-2 h-4 w-4" />
                View Resume
              </DropdownMenuItem>
            )}
             {candidate.introductionVideoIntern && (
              <DropdownMenuItem onClick={() => window.open(candidate.introductionVideoIntern!, '_blank')}>
                <Video className="mr-2 h-4 w-4" />
                View Intro Video
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
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
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  };

  let columns: ColumnDef<Candidate>[] = [...baseColumns];

  if (filterType === 'internship') {
    // For interns, add intro video and remove experience
    columns = [...columns, ...commonColumns, introVideoColumn, actionColumn];
  } else if (filterType === 'full-time') {
    // For full-time, add experience
    columns = [...columns, experienceColumn, ...commonColumns, actionColumn];
  } else {
    // For 'all' or undefined, include both
    columns = [...columns, experienceColumn, ...commonColumns, introVideoColumn, actionColumn];
  }

  return columns;
};
