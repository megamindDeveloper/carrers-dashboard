'use client';

import type { ColumnDef } from '@tanstack/react-table';
import type { Assessment, AssessmentSubmission } from '@/lib/types';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ArrowUpDown,
  MoreHorizontal,
  Share2,
  Trash2,
  Copy,
  ClipboardList,
} from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

type GetColumnsProps = {
  onDelete: (assessmentId: string, title: string) => void;
};


const ShareActionItem = ({ assessmentId, passcode }: { assessmentId: string, passcode?: string }) => {
    const { toast } = useToast();
    
    const handleShare = (e: React.MouseEvent) => {
        e.stopPropagation();
        const shareUrl = `${window.location.origin}/assessment/${assessmentId}`;
        const textToCopy = `Assessment URL: ${shareUrl}${passcode ? `\nPasscode: ${passcode}`: ''}`;
        navigator.clipboard.writeText(textToCopy);
        toast({
          title: 'Details Copied!',
          description: `Shareable link ${passcode ? 'and passcode ' : ''}copied to clipboard.`,
        });
    }

    return (
        <DropdownMenuItem onClick={handleShare}>
            <Share2 className="mr-2 h-4 w-4" />
            Copy Link {passcode && '& Passcode'}
        </DropdownMenuItem>
    )
}


export const getColumns = ({ onDelete }: GetColumnsProps): ColumnDef<Assessment>[] => {
  const columns: ColumnDef<Assessment>[] = [
    {
      accessorKey: 'title',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Title
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => <div className="font-medium">{row.original.title}</div>,
    },
    {
        accessorKey: 'questions',
        header: 'Questions',
        cell: ({ row }) => {
            const questionCount = row.original.sections?.reduce((acc, section) => acc + section.questions.length, 0) || 0;
            return <div className="text-center">{questionCount}</div>
        },
    },
     {
      accessorKey: 'submissions',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Submissions
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
            <div className="text-center">{row.original.submissionCount || 0}</div>
        ),
      sortingFn: 'basic',
    },
    {
        accessorKey: 'timeLimit',
        header: 'Time Limit',
        cell: ({ row }) => {
            const timeLimit = row.original.timeLimit;
            return <div className="text-center">{timeLimit ? `${timeLimit} mins` : 'N/A'}</div>;
        },
    },
    {
        accessorKey: 'passcode',
        header: 'Passcode',
        cell: ({ row }) => (
            <div className="font-mono">{row.original.passcode || 'N/A'}</div>
        ),
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
    id: 'actions',
    cell: ({ row }) => {
      const assessment = row.original;
      const { toast } = useToast();
      const shareUrl = `${window.location.origin}/assessment/${assessment.id}`;

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
            <DropdownMenuItem onClick={() => {
                const table = row.table;
                const onRowClick = table.options.meta?.onRowClick;
                 if (onRowClick) {
                    (onRowClick as (row: any) => void)(row);
                }
            }}>
                View/Edit Details
            </DropdownMenuItem>
             <DropdownMenuItem asChild>
              <Link href={`/dashboard/submissions/${assessment.id}`}>
                <ClipboardList className="mr-2 h-4 w-4" />
                View Submissions
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => {
                navigator.clipboard.writeText(shareUrl);
                toast({ title: 'Link Copied!', description: 'Assessment URL copied to clipboard.' });
            }}>
                <Copy className="mr-2 h-4 w-4" />
                Copy URL Only
            </DropdownMenuItem>
            <ShareActionItem assessmentId={assessment.id} passcode={assessment.passcode} />
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onDelete(assessment.id, assessment.title)}
              className="text-red-600 focus:text-red-600 focus:bg-red-50"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
  ];

  return columns;
};
