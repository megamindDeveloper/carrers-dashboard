
'use client';

import type { Table } from '@tanstack/react-table';
import { Input } from '@/components/ui/input';
import { CANDIDATE_STATUSES, CandidateType } from '@/lib/types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface DataTableToolbarProps<TData> {
  table: Table<TData>;
  filterType?: CandidateType;
}

export function DataTableToolbar<TData>({
  table,
  filterType,
}: DataTableToolbarProps<TData>) {
  const isFiltered =
    table.getState().columnFilters.length > 0;
  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-1 items-center space-x-2">
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
        <Input
          placeholder="Filter by position..."
          value={
            (table.getColumn('position')?.getFilterValue() as string) ?? ''
          }
          onChange={event =>
            table.getColumn('position')?.setFilterValue(event.target.value)
          }
          className="h-8 w-[150px] lg:w-[250px]"
        />
        {filterType !== 'internship' && (
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
        <Select
          value={(table.getColumn('status')?.getFilterValue() as string) ?? ''}
          onValueChange={value =>
            table.getColumn('status')?.setFilterValue(value === 'all' ? null : value)
          }
        >
          <SelectTrigger className="h-8 w-[150px] lg:w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {CANDIDATE_STATUSES.map(status => (
              <SelectItem key={status} value={status}>
                {status}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
