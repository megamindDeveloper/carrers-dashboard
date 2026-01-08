

'use client';

import type { ColumnDef } from '@tanstack/react-table';
import type { Candidate, CandidateStatus, CandidateType, AssessmentSubmission, CandidateSource } from '@/lib/types';
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
  Share2,
  Trash2,
  ClipboardList,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Checkbox } from '@/components/ui/checkbox';

type GetColumnsProps = {
  onStatusChange: (candidateId: string, status: CandidateStatus) => void;
  onDelete: (candidateId: string, candidateName: string) => void;
  onViewSubmission: (submission: AssessmentSubmission) => void;
  filterType?: CandidateType;
};

const toTitleCase = (str: string) => {
    if (!str) return '';
    return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase());
};

const ShareActionItem = ({ candidateId }: { candidateId: string }) => {
    const { toast } = useToast();
    
    const handleShare = (e: React.MouseEvent) => {
        e.stopPropagation();
        const shareUrl = `${window.location.origin}/share/candidate/${candidateId}`;
        navigator.clipboard.writeText(shareUrl);
        toast({
          title: 'Link Copied!',
          description: "A shareable link has been copied to your clipboard.",
        });
    }

    return (
        <DropdownMenuItem onClick={handleShare}>
            <Share2 className="mr-2 h-4 w-4" />
            Share Profile
        </DropdownMenuItem>
    )
}

export const getColumns = ({
  onStatusChange,
  onDelete,
  onViewSubmission,
  filterType,
}: GetColumnsProps): ColumnDef<Candidate>[] => {
  const baseColumns: ColumnDef<Candidate>[] = [
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

  const appliedDateColumn: ColumnDef<Candidate> = {
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
  };

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
  
  const assessmentStatusColumn: ColumnDef<Candidate> = {
    accessorKey: 'submissions',
    header: 'Assessment Status',
    cell: ({ row }) => {
      const submissions = row.original.submissions;
      if (!submissions || submissions.length === 0) {
        return <Badge variant="outline">Pending</Badge>;
      }
      return (
        <div className="flex flex-col items-start gap-1">
            {submissions.map(sub => (
                <Button key={sub.id} variant="secondary" size="sm" className="h-auto" onClick={(e) => { e.stopPropagation(); onViewSubmission(sub); }}>
                    <ClipboardList className="mr-2 h-4 w-4" />
                    {sub.assessmentTitle}
                </Button>
            ))}
        </div>
      );
    },
  }


  const commonColumns: ColumnDef<Candidate>[] = [
    {
      accessorKey: 'source',
      header: 'Source',
      cell: ({ row }) => {
        const source = row.original.source;
        return <Badge variant="outline">{source || 'N/A'}</Badge>
      }
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
        
        let variant: 'default' | 'secondary' | 'destructive' | 'outline' = 'secondary';
        let className = '';

        switch (safeStatus) {
            case 'Applied':
                variant = 'secondary';
                break;
            case 'Shortlisted':
                variant = 'default';
                className = 'bg-blue-500 hover:bg-blue-600 text-white border-blue-500';
                break;
            case 'First Round':
            case 'Second Round':
            case 'Third Round':
            case 'Final Round':
                 variant = 'outline';
                 className = 'border-purple-500 text-purple-500';
                 break;
            case 'Hired':
                variant = 'default';
                className = 'bg-green-500 hover:bg-green-600 text-white border-green-500';
                break;
            case 'Rejected':
                variant = 'destructive';
                break;
            case 'Future Reference':
                variant = 'outline';
                className = 'border-yellow-500 text-yellow-600';
                break;
        }

        return <Badge variant={variant} className={className}>{safeStatus}</Badge>;
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
            <DropdownMenuItem onClick={() => {
                const table = row.table;
                const onRowClick = table.options.meta?.onRowClick;
                 if (onRowClick) {
                    (onRowClick as (row: any) => void)(row);
                }
            }}>
                View/Edit Details
            </DropdownMenuItem>
             {candidate.submissions && candidate.submissions.length > 0 && (
                <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                        <ClipboardList className="mr-2 h-4 w-4" /> View Submission
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                        {candidate.submissions.map(sub => (
                            <DropdownMenuItem key={sub.id} onClick={() => onViewSubmission(sub)}>
                                {sub.assessmentTitle}
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuSubContent>
                </DropdownMenuSub>
            )}
            <ShareActionItem candidateId={candidate.id} />
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
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onDelete(candidate.id, candidate.fullName)}
              className="text-red-600 focus:text-red-600 focus:bg-red-50"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  };

  const statusColumn = commonColumns.find(c => c.accessorKey === 'status')!;
  const otherCommonColumns = commonColumns.filter(c => c.accessorKey !== 'status');

  let columns: ColumnDef<Candidate>[] = [...baseColumns, statusColumn, assessmentStatusColumn];

  if (filterType === 'internship') {
    columns = [...columns, appliedDateColumn, ...otherCommonColumns, introVideoColumn, actionColumn];
  } else if (filterType === 'full-time') {
    columns = [...columns, appliedDateColumn, experienceColumn, ...otherCommonColumns, actionColumn];
  } else {
    // For 'All' and 'Freelance', show both experience and video, and applied date
    columns = [...columns, appliedDateColumn, experienceColumn, ...otherCommonColumns, introVideoColumn, actionColumn];
  }

  return columns;
};

    
