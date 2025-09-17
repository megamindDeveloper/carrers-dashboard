'use client';

import { useMemo, useState } from 'react';
import type { Candidate } from '@/lib/types';
import { DataTable } from './data-table';
import { getColumns } from './columns';
import { ViewResumeModal } from './view-resume-modal';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

interface CandidateTableProps {
  data: Candidate[];
}

export function CandidateTable({ data }: CandidateTableProps) {
  const [viewingResume, setViewingResume] = useState<string | null>(null);

  const columns = useMemo(
    () => getColumns({ setViewingResume }),
    [setViewingResume]
  );

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Candidate Pipeline</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable columns={columns} data={data} />
        </CardContent>
      </Card>
      <ViewResumeModal
        isOpen={!!viewingResume}
        onClose={() => setViewingResume(null)}
        resumeUrl={viewingResume}
      />
    </>
  );
}
