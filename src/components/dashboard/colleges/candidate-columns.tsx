
'use client';

import type { ColumnDef } from '@tanstack/react-table';
import type { CollegeCandidate, AssessmentSubmission } from '@/lib/types';
import { Button } from '@/components/ui/button';
import {
  ArrowUpDown,
  ClipboardList,
} from 'lucide-react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';


export const getCandidateColumns = ({ onViewSubmission }: { onViewSubmission: (submission: AssessmentSubmission) => void }): ColumnDef<CollegeCandidate>[] => {
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
      accessorKey: 'submissions',
      header: 'Submissions',
      cell: ({ row }) => {
          const { submissions } = row.original;
          if (!submissions || submissions.length === 0) {
              return <Badge variant="secondary">None</Badge>;
          }
          return (
              <div className="flex flex-wrap gap-1">
                  {submissions.map(sub => (
                       <Button key={sub.id} variant="outline" size="sm" className="h-auto" onClick={(e) => { e.stopPropagation(); onViewSubmission(sub); }}>
                          <ClipboardList className="mr-2 h-3 w-3" />
                          <span>{sub.assessmentTitle}</span>
                      </Button>
                  ))}
              </div>
          )
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
  ];

  return columns;
};
