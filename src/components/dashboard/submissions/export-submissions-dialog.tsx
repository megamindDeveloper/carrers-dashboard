
'use client';

import { useState, useMemo } from 'react';
import Papa from 'papaparse';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import type { AssessmentSubmission } from '@/lib/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';

interface ExportSubmissionsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  submissions: AssessmentSubmission[];
}

type HeaderKey = keyof AssessmentSubmission | `answer_${string}`;

const BASE_HEADERS: { key: HeaderKey; label: string }[] = [
    { key: 'candidateName', label: 'Candidate Name' },
    { key: 'candidateEmail', label: 'Candidate Email' },
    { key: 'submittedAt', label: 'Submitted At' },
    { key: 'timeTaken', label: 'Time Taken (seconds)' },
];

export function ExportSubmissionsDialog({ isOpen, onClose, submissions }: ExportSubmissionsDialogProps) {
  const [selectedHeaders, setSelectedHeaders] = useState<HeaderKey[]>([]);
  const { toast } = useToast();

  const allPossibleHeaders = useMemo(() => {
    if (submissions.length === 0) return [];
    
    const questionHeaders = new Map<string, string>();
    submissions.forEach(sub => {
      sub.answers.forEach(ans => {
        if (!questionHeaders.has(ans.questionId)) {
          questionHeaders.set(ans.questionId, ans.questionText);
        }
      });
    });

    const dynamicHeaders = Array.from(questionHeaders.entries()).map(([id, text]) => ({
      key: `answer_${id}` as HeaderKey,
      label: `Q: ${text}`
    }));

    return [...BASE_HEADERS, ...dynamicHeaders];
  }, [submissions]);

  const handleExport = () => {
    if (selectedHeaders.length === 0) {
      toast({
        variant: 'destructive',
        title: 'No fields selected',
        description: 'Please select at least one field to export.',
      });
      return;
    }

    const dataToExport = submissions.map(sub => {
        const row: Record<string, any> = {};
        selectedHeaders.forEach(key => {
            const headerInfo = allPossibleHeaders.find(h => h.key === key);
            if (!headerInfo) return;

            if (key.startsWith('answer_')) {
                const qId = key.replace('answer_', '');
                const answerObj = sub.answers.find(a => a.questionId === qId);
                const answer = answerObj?.answer;
                row[headerInfo.label] = Array.isArray(answer) ? answer.join('; ') : answer ?? '';
            } else {
                 let value = sub[key as keyof AssessmentSubmission] as any;
                 if (key === 'submittedAt' && value?.toDate) {
                    value = format(value.toDate(), 'yyyy-MM-dd HH:mm:ss');
                 }
                row[headerInfo.label] = value ?? '';
            }
        });
        return row;
    });

    const csv = Papa.unparse(dataToExport);

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    const assessmentTitle = submissions[0]?.assessmentTitle.replace(/[^a-z0-9]/gi, '_');
    link.setAttribute('download', `submissions_${assessmentTitle}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
        title: 'Export Successful',
        description: 'Your CSV file has been downloaded.',
    });
    onClose();
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedHeaders(allPossibleHeaders.map(h => h.key));
    } else {
      setSelectedHeaders([]);
    }
  };

  if (!isOpen) return null;

  const allSelected = allPossibleHeaders.length > 0 && selectedHeaders.length === allPossibleHeaders.length;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Export Submissions to CSV</DialogTitle>
          <DialogDescription>
            Select the fields you want to include in the export.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex items-center space-x-2 my-4">
            <Checkbox
                id="select-all"
                checked={allSelected}
                onCheckedChange={handleSelectAll}
            />
            <Label htmlFor="select-all" className="font-bold">
                Select All Fields
            </Label>
        </div>

        <ScrollArea className="max-h-60 pr-4">
            <div className="grid gap-2">
            {allPossibleHeaders.map(({ key, label }) => (
                <div key={key} className="flex items-center space-x-2">
                <Checkbox
                    id={key}
                    checked={selectedHeaders.includes(key)}
                    onCheckedChange={(checked) => {
                    setSelectedHeaders(prev =>
                        checked ? [...prev, key] : prev.filter(h => h !== key)
                    );
                    }}
                />
                <Label htmlFor={key} className="font-normal">{label}</Label>
                </div>
            ))}
            </div>
        </ScrollArea>
        
        <DialogFooter className="pt-4">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleExport} disabled={selectedHeaders.length === 0}>Export</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
