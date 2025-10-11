

'use client';
import { useMemo } from 'react';
import type { Table } from '@tanstack/react-table';
import { Input } from '@/components/ui/input';
import { CANDIDATE_SOURCES, CANDIDATE_STATUSES, JOB_STATUSES, JOB_TYPES, CandidateType } from '@/lib/types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import type { Job, AssessmentSubmission, College } from '@/lib/types';

interface DataTableToolbarProps<TData> {
  table: Table<TData>;
  filterType?: CandidateType;
  colleges?: College[];
  collegeCounts?: Record<string, number>;
  positionCounts?: Record<string, number>;
  allSubmissionsForFiltering?: AssessmentSubmission[];
}

export function DataTableToolbar<TData>({
  table,
  filterType,
  colleges,
  collegeCounts,
  positionCounts,
  allSubmissionsForFiltering,
}: DataTableToolbarProps<TData>) {
  const isFiltered =
    table.getState().columnFilters.length > 0;
    
  const columnExists = (columnId: string) => {
    return table.getAllColumns().some(column => column.id === columnId);
  }

  const isJobTable = table.options.data.length > 0 && 'openings' in table.options.data[0];
  const isSubmissionTable = table.options.data.length > 0 && 'assessmentId' in table.options.data[0] && 'timeTaken' in table.options.data[0];
  const isCollegeCandidateTable = table.options.data.length > 0 && 'importedAt' in table.options.data[0];
  const isCandidateTable = !isJobTable && !isSubmissionTable && !isCollegeCandidateTable;

  const positionOptions = useMemo(() => {
    if (!isSubmissionTable || !allSubmissionsForFiltering) return [];
    const positions = new Set<string>();
    
    // Use the comprehensive list of all submissions for the filter
    allSubmissionsForFiltering.forEach(submission => {
      const positionAnswer = submission.answers.find(a => a.questionText?.toLowerCase().includes('position applying for'));
      if (positionAnswer?.answer && typeof positionAnswer.answer === 'string') {
        positions.add(positionAnswer.answer);
      }
    });
    return Array.from(positions);
  }, [isSubmissionTable, allSubmissionsForFiltering]);


  const statusOptions = isJobTable ? JOB_STATUSES : CANDIDATE_STATUSES;

  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex flex-1 flex-wrap items-center gap-2">
        {isCandidateTable && columnExists('fullName') && (
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
         {isSubmissionTable && columnExists('candidateName') && (
          <Input
            placeholder="Filter by name..."
            value={
              (table.getColumn('candidateName')?.getFilterValue() as string) ?? ''
            }
            onChange={event =>
              table.getColumn('candidateName')?.setFilterValue(event.target.value)
            }
            className="h-8 w-[150px] lg:w-[250px]"
          />
        )}
         {isCollegeCandidateTable && columnExists('name') && (
          <Input
            placeholder="Filter by name..."
            value={
              (table.getColumn('name')?.getFilterValue() as string) ?? ''
            }
            onChange={event =>
              table.getColumn('name')?.setFilterValue(event.target.value)
            }
            className="h-8 w-[150px] lg:w-[250px]"
          />
        )}
        {isCandidateTable && columnExists('position') && (
           <Input
            placeholder="Filter by position..."
            value={(table.getColumn('position')?.getFilterValue() as string) ?? ''}
            onChange={(event) =>
              table.getColumn('position')?.setFilterValue(event.target.value)
            }
            className="h-8 w-[150px] lg:w-[250px]"
          />
        )}
         {isSubmissionTable && columnExists('answers') && positionOptions.length > 0 && (
            <Select
                value={(table.getColumn('answers')?.getFilterValue() as string[])?.[0] ?? 'all'}
                onValueChange={value =>
                    table.getColumn('answers')?.setFilterValue(value === 'all' ? null : [value])
                }
            >
                <SelectTrigger className="h-8 w-[200px]">
                <SelectValue placeholder="Filter by position" />
                </SelectTrigger>
                <SelectContent>
                <SelectItem value="all">All Positions</SelectItem>
                {positionOptions.map(pos => (
                    <SelectItem key={pos} value={pos}>{pos} {positionCounts ? `(${positionCounts[pos] || 0})` : ''}</SelectItem>
                ))}
                </SelectContent>
            </Select>
         )}
          {isSubmissionTable && columnExists('collegeId') && colleges && colleges.length > 0 && (
            <Select
                value={(table.getColumn('collegeId')?.getFilterValue() as string[])?.[0] ?? 'all'}
                onValueChange={value =>
                    table.getColumn('collegeId')?.setFilterValue(value === 'all' ? null : [value])
                }
            >
                <SelectTrigger className="h-8 w-[200px]">
                <SelectValue placeholder="Filter by college" />
                </SelectTrigger>
                <SelectContent>
                <SelectItem value="all">All Colleges</SelectItem>
                <SelectItem value="Direct">Direct {collegeCounts ? `(${collegeCounts['Direct'] || 0})` : ''}</SelectItem>
                {colleges.map(college => (
                    <SelectItem key={college.id} value={college.id}>{college.name} {collegeCounts ? `(${collegeCounts[college.id] || 0})` : ''}</SelectItem>
                ))}
                </SelectContent>
            </Select>
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
        {isCandidateTable && columnExists('status') && (
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
         {isCandidateTable && columnExists('source') && (
          <Select
            value={(table.getColumn('source')?.getFilterValue() as string) ?? 'all'}
            onValueChange={value =>
              table.getColumn('source')?.setFilterValue(value === 'all' ? null : value)
            }
          >
            <SelectTrigger className="h-8 w-[150px] lg:w-[180px]">
              <SelectValue placeholder="Filter by source" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sources</SelectItem>
              {CANDIDATE_SOURCES.map(source => (
                <SelectItem key={source} value={source}>
                  {source}
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
