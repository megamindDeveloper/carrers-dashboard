

'use client';

import type { Table } from '@tanstack/react-table';
import { Input } from '@/components/ui/input';
import { CANDIDATE_STATUSES, JOB_STATUSES, JOB_TYPES, CandidateType } from '@/lib/types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import type { Job } from '@/lib/types';

interface DataTableToolbarProps<TData> {
  table: Table<TData>;
  filterType?: CandidateType;
}

function isJobData<TData>(data: TData[]): data is Job[] {
    if (data.length === 0) return false;
    const firstItem = data[0] as any;
    return 'position' in firstItem && 'openings' in firstItem && 'responsibilities' in firstItem;
}

export function DataTableToolbar<TData>({
  table,
  filterType,
}: DataTableToolbarProps<TData>) {
  const isFiltered =
    table.getState().columnFilters.length > 0;
    
  const columnExists = (columnId: string) => {
    return table.getAllColumns().some(column => column.id === columnId);
  }

  const isJobTable = table.options.data.length > 0 && 'openings' in table.options.data[0];

  const statusOptions = isJobTable ? JOB_STATUSES : CANDIDATE_STATUSES;

  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex flex-1 flex-wrap items-center gap-2">
        {columnExists('fullName') && (
          <Input
            placeholder="Filter by name..."
            value={
              (table.getColumn('fullName')?.getFilterValue() as string) ?? ''
            }
            onChange={event =>
              table.getColumn('fullName')?.setFilterValue(event.target.value)
            }
            className="h-8 w-[150px] lg:w-[250px]"
          />
        )}
        {columnExists('position') && (
           <Input
            placeholder="Filter by position..."
            value={(table.getColumn('position')?.getFilterValue() as string) ?? ''}
            onChange={(event) =>
              table.getColumn('position')?.setFilterValue(event.target.value)
            }
            className="h-8 w-[150px] lg:w-[250px]"
          />
        )}
        {filterType !== 'internship' && columnExists('experience') && !isJobTable && (
          <Input
            placeholder="Filter by experience..."
            value={
              (table.getColumn('experience')?.getFilterValue() as string) ?? ''
            }
            onChange={event =>
              table.getColumn('experience')?.setFilterValue(event.target.value)
            }
            className="h-8 w-[150px] lg:w-[250px]"
          />
        )}
        {isJobTable && columnExists('type') && (
          <Select
            value={(table.getColumn('type')?.getFilterValue() as string) ?? 'all'}
            onValueChange={value =>
              table.getColumn('type')?.setFilterValue(value === 'all' ? null : value)
            }
          >
            <SelectTrigger className="h-8 w-[150px] lg:w-[180px]">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {JOB_TYPES.map(type => (
                <SelectItem key={type} value={type} className="capitalize">
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {columnExists('status') && (
          <Select
            value={(table.getColumn('status')?.getFilterValue() as string) ?? 'all'}
            onValueChange={value =>
              table.getColumn('status')?.setFilterValue(value === 'all' ? null : value)
            }
          >
            <SelectTrigger className="h-8 w-[150px] lg:w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {statusOptions.map(status => (
                <SelectItem key={status} value={status}>
                  {status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {isFiltered && (
          <Button
            variant="ghost"
            onClick={() => table.resetColumnFilters()}
            className="h-8 px-2 lg:px-3"
          >
            Reset
            <X className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}