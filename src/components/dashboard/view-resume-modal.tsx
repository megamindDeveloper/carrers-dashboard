'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

interface ViewResumeModalProps {
  isOpen: boolean;
  onClose: () => void;
  resumeUrl: string | null;
}

export function ViewResumeModal({
  isOpen,
  onClose,
  resumeUrl,
}: ViewResumeModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[90vh] p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle>Resume Preview</DialogTitle>
          <DialogDescription>
            Viewing resume. Note: Some file types may not render correctly in the
            browser.
          </DialogDescription>
        </DialogHeader>
        <div className="h-full w-full flex-1 p-6 pt-0">
          {resumeUrl ? (
            <iframe
              src={resumeUrl}
              className="h-full w-full rounded-md border"
              title="Resume Preview"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center rounded-md border">
              <p className="text-muted-foreground">No resume to display.</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
