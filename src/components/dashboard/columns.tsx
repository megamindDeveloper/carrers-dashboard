
'use client';

import type { ColumnDef } from '@tanstack/react-table';
import type { Candidate, CandidateStatus } from '@/lib/types';
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
  Download,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

const downloadJSON = (data: Candidate) => {
  const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
    JSON.stringify(data, null, 2)
  )}`;
  const link = document.createElement('a');
  link.href = jsonString;
  link.download = `${(data.fullName ?? 'candidate').replace(/\s/g, '_')}_data.json`;
  link.click();
};

type GetColumnsProps = {
  onStatusChange: (candidateId: string, status: CandidateStatus) => void;
};

export const getColumns = ({
  onStatusChange,
}: GetColumnsProps): ColumnDef<Candidate>[] => [
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
  {
    accessorKey: 'type',
    header: 'Type',
    cell: ({ row }) => {
      const { type } = row.original;
      let variant: 'default' | 'secondary' = 'secondary';
      let label = 'Intern';
      if (type === 'emp') {
        variant = 'default';
        label = 'Full-time';
      }
      return <Badge variant={variant}>{label}</Badge>;
    }
  },
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
        return format(new Date(submittedAt), 'MMM d, yyyy');
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
      const safeStatus = status ?? 'Unknown';
      let variant: 'default' | 'secondary' | 'destructive' = 'secondary';
      if (['Shortlisted', 'First Round', 'Second Round', 'Final Round'].includes(safeStatus)) {
        variant = 'default';
      } else if (safeStatus === 'Rejected') {
        variant = 'destructive';
      }
      return <Badge variant={variant}>{safeStatus}</Badge>;
    },
    filterFn: 'myCustomFilter',
  },
  {
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
          <DropdownMenuContent align="end">
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
            <DropdownMenuSeparator />
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <span>Change Status</span>
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuRadioGroup
                  value={candidate.status ?? ''}
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
            <DropdownMenuItem onClick={() => downloadJSON(candidate)}>
              <Download className="mr-2 h-4 w-4" />
              Download Data
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
