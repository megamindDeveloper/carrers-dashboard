
'use client';

import { useState, useMemo, useEffect } from 'react';
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
import type { CollegeCandidate, Assessment } from '@/lib/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';

interface ExportCollegeCandidatesDialogProps {
  isOpen: boolean;
  onClose: () => void;
  candidates: CollegeCandidate[];
  selectedAssessment: Assessment | null;
}

type HeaderKey = keyof CollegeCandidate | 'assessmentStatus' | `answer_${string}`;

const BASE_HEADERS: { key: HeaderKey; label: string }[] = [
    { key: 'name', label: 'Candidate Name' },
    { key: 'email', label: 'Candidate Email' },
    { key: 'importedAt', label: 'Imported At' },
];

export function ExportCollegeCandidatesDialog({ isOpen, onClose, candidates, selectedAssessment }: ExportCollegeCandidatesDialogProps) {
  const [selectedHeaders, setSelectedHeaders] = useState<HeaderKey[]>([]);
  const { toast } = useToast();

  const allPossibleHeaders = useMemo(() => {
    const headers = [...BASE_HEADERS];
    if (selectedAssessment) {
      headers.push({ key: 'assessmentStatus', label: `Status for '${selectedAssessment.title}'` });

      const allQuestions = selectedAssessment.sections?.flatMap(s => s.questions) || [];
      allQuestions.forEach(q => {
        headers.push({ key: `answer_${q.id}`, label: `Q: ${q.text}` });
      });
    }
    return headers;
  }, [selectedAssessment]);

  useEffect(() => {
    // Pre-select all headers when the dialog opens or the assessment changes
    if (isOpen) {
      setSelectedHeaders(allPossibleHeaders.map(h => h.key));
    }
  }, [isOpen, allPossibleHeaders]);


  const handleExport = () => {
    if (selectedHeaders.length === 0) {
      toast({
        variant: 'destructive',
        title: 'No fields selected',
        description: 'Please select at least one field to export.',
      });
      return;
    }

    const dataToExport = candidates.map(candidate => {
        const row: Record<string, any> = {};
        selectedHeaders.forEach(key => {
            const headerInfo = allPossibleHeaders.find(h => h.key === key);
            if (!headerInfo) return;

            if (key === 'assessmentStatus') {
                const submission = selectedAssessment ? candidate.submissions?.find(s => s.assessmentId === selectedAssessment.id) : null;
                row[headerInfo.label] = submission ? 'Submitted' : 'Not Submitted';
            } else if (key.startsWith('answer_')) {
                 const submission = selectedAssessment ? candidate.submissions?.find(s => s.assessmentId === selectedAssessment.id) : null;
                 if (submission) {
                     const questionId = key.replace('answer_', '');
                     const answerObj = submission.answers.find(a => a.questionId === questionId);
                     const answer = answerObj?.answer;
                     row[headerInfo.label] = Array.isArray(answer) ? answer.join('; ') : (answer ?? '');
                 } else {
                     row[headerInfo.label] = ''; // No submission, so empty answer
                 }
            } else {
                 let value = candidate[key as keyof CollegeCandidate] as any;
                 if (key === 'importedAt' && value?.toDate) {
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
    const assessmentTitle = selectedAssessment?.title.replace(/[^a-z0-9]/gi, '_') || 'candidates';
    link.setAttribute('download', `college_candidates_${assessmentTitle}.csv`);
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
          <DialogTitle>Export Candidates to CSV</DialogTitle>
          <DialogDescription>
            Select the fields you want to include in the export for the currently filtered candidates.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex items-center space-x-2 my-4">
            <Checkbox
                id="select-all-export"
                checked={allSelected}
                onCheckedChange={(checked) => handleSelectAll(Boolean(checked))}
            />
            <Label htmlFor="select-all-export" className="font-bold">
                Select All Fields
            </Label>
        </div>

        <ScrollArea className="max-h-60 pr-4">
            <div className="grid gap-2">
            {allPossibleHeaders.map(({ key, label }) => (
                <div key={key} className="flex items-center space-x-2">
                <Checkbox
                    id={`export-${key}`}
                    checked={selectedHeaders.includes(key)}
                    onCheckedChange={(checked) => {
                    setSelectedHeaders(prev =>
                        checked ? [...prev, key] : prev.filter(h => h !== key)
                    );
                    }}
                />
                <Label htmlFor={`export-${key}`} className="font-normal">{label}</Label>
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
