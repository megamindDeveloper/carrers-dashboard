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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

const downloadJSON = (data: Candidate) => {
  const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
    JSON.stringify(data, null, 2)
  )}`;
  const link = document.createElement('a');
  link.href = jsonString;
  link.download = `${data.fullName.replace(/\s/g, '_')}_data.json`;
  link.click();
};

type GetColumnsProps = {
  setViewingResume: (url: string) => void;
  onStatusChange: (candidateId: string, status: CandidateStatus) => void;
};

export const getColumns = ({
  setViewingResume,
  onStatusChange,
}: GetColumnsProps): ColumnDef<Candidate>[] => [
  {
    accessorKey: 'fullName',
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Full Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const candidate = row.original;
      const nameParts = candidate.fullName.split(' ');
      const initials =
        (nameParts[0]?.[0] ?? '') + (nameParts[nameParts.length - 1]?.[0] ?? '');
      return (
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarImage src={candidate.avatar} alt={candidate.fullName} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="font-medium">{candidate.fullName}</span>
            <span className="text-sm text-muted-foreground">
              {candidate.email}
            </span>
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: 'position',
    header: 'Position',
    cell: ({ row }) => {
      return <Badge variant="secondary">{row.original.position}</Badge>;
    },
  },
  {
    accessorKey: 'status',
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Status
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const { status } = row.original;
      let variant: 'default' | 'secondary' | 'destructive' = 'secondary';
      if (['Shortlisted', 'First Round', 'Second Round', 'Final Round'].includes(status)) {
        variant = 'default';
      } else if (status === 'Rejected') {
        variant = 'destructive';
      }
      return <Badge variant={variant}>{status}</Badge>;
    },
  },
  {
    accessorKey: 'contactNumber',
    header: 'Contact',
  },
  {
    accessorKey: 'location',
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Location
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
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
            <DropdownMenuItem
              onClick={() => window.open(candidate.portfolio, '_blank')}
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              View Portfolio
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setViewingResume(candidate.resumeUrl)}>
              <FileText className="mr-2 h-4 w-4" />
              View Resume
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <span>Change Status</span>
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuRadioGroup
                  value={candidate.status}
                  onValueChange={value =>
                    onStatusChange(candidate.id, value as CandidateStatus)
                  }
                >
                  {CANDIDATE_STATUSES.map(status => (
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
