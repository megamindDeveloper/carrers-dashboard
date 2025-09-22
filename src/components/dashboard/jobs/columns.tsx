
'use client';

import type { ColumnDef } from '@tanstack/react-table';
import type { Job, JobStatus, JobType } from '@/lib/types';
import { JOB_STATUSES, JOB_TYPES } from '@/lib/types';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from '@/components/ui/dropdown-menu';
import { ArrowUpDown, MoreHorizontal } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import * as Icons from 'lucide-react';

type GetColumnsProps = {
  onStatusChange: (jobId: string, status: JobStatus) => void;
};

const toTitleCase = (str: string) => {
    if (!str) return '';
    return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase());
};

const Icon = ({ name, className }: { name: string; className?: string }) => {
    const LucideIcon = (Icons as any)[name];
    if (!LucideIcon) {
      return <Icons.FileText className={className} />;
    }
    return <LucideIcon className={className} />;
};


export const getColumns = ({ onStatusChange }: GetColumnsProps): ColumnDef<Job>[] => {
  const columns: ColumnDef<Job>[] = [
    {
      accessorKey: 'position',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Position
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const job = row.original;
        return (
          <div className="flex items-center gap-3">
             <Icon name={job.icon} className="h-5 w-5 text-muted-foreground" />
            <div className="flex flex-col">
              <span className="font-medium">{job.position}</span>
              <span className="text-sm text-muted-foreground">
                {job.location}
              </span>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'type',
      header: 'Type',
      cell: ({ row }) => {
        const type = row.original.type;
        return <Badge variant={type === 'full-time' ? 'default' : 'secondary'} className="capitalize">{type}</Badge>;
      },
    },
    {
      accessorKey: 'openings',
      header: 'Openings',
      cell: ({ row }) => (
        <div className="text-center">{row.original.openings}</div>
      ),
    },
    {
      accessorKey: 'experience',
      header: 'Experience',
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
        const safeStatus = toTitleCase(status) ?? 'Unknown';
        let variant: 'default' | 'secondary' | 'destructive' = 'secondary';
        if (safeStatus === 'Open') {
          variant = 'default';
        } else if (safeStatus === 'Closed') {
          variant = 'destructive';
        }
        return <Badge variant={variant}>{safeStatus}</Badge>;
      },
       filterFn: (row, columnId, filterValue) => {
          const status = row.getValue(columnId) as string;
          return toTitleCase(status) === filterValue;
      }
    },
    {
    id: 'actions',
    cell: ({ row }) => {
      const job = row.original;
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
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <span>Change Status</span>
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuRadioGroup
                  value={toTitleCase(job.status)}
                  onValueChange={(value) =>
                    onStatusChange(job.id, value as JobStatus)
                  }
                >
                  {JOB_STATUSES.map((status) => (
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
  },
  ];

  return columns;
};
