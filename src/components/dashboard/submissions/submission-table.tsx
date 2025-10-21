
"use client";
import React, { useEffect, useMemo, useState } from "react";
import type { Assessment, AssessmentSubmission, College, Candidate, CollegeCandidate, CandidateStatus } from "@/lib/types";
import { DataTable } from "@/components/dashboard/data-table";
import { getColumns } from "./columns";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { collection, onSnapshot, query, where, getDocs, doc, updateDoc, writeBatch, getDoc } from "firebase/firestore";
import { db } from "@/app/utils/firebase/firebaseConfig";
import { useToast } from "@/hooks/use-toast";
import { SubmissionDetailsModal } from "./submission-details-modal";
import { ExportSubmissionsDialog } from "./export-submissions-dialog";
import { Button } from "@/components/ui/button";
import { Download, RefreshCw, Loader2 } from "lucide-react";
import { ConfirmationDialog } from "../confirmation-dialog";
import { gradeSubmission } from "@/lib/utils";
import { DropdownMenu, DropdownMenuTrigger } from "@radix-ui/react-dropdown-menu";
import { DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";

interface SubmissionTableProps {
  assessmentId: string;
}

export function SubmissionTable({ assessmentId }: SubmissionTableProps) {
  const [data, setData] = useState<AssessmentSubmission[]>([]);
  const [allSubmissions, setAllSubmissions] = useState<AssessmentSubmission[]>([]);
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [colleges, setColleges] = useState<College[]>([]);
  const [candidates, setCandidates] = useState<(Candidate | CollegeCandidate)[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<AssessmentSubmission | null>(null);
  const [isExportDialogOpen, setExportDialogOpen] = useState(false);
  const { toast } = useToast();
  const [confirmation, setConfirmation] = useState<{ isOpen: boolean; title: string; description: string; onConfirm: () => void }>({
    isOpen: false,
    title: "",
    description: "",
    onConfirm: () => {},
  });

  const [positionMap, setPositionMap] = useState<Record<string, string>>({}); // For the position lookup
  useEffect(() => {
    const buildPositionMap = async () => {
      const allSubmissionsQuery = query(collection(db, "assessmentSubmissions"));
      const querySnapshot = await getDocs(allSubmissionsQuery);
      const allSubs = querySnapshot.docs.map(doc => doc.data() as AssessmentSubmission);

      const map: { [email: string]: string } = {};
      allSubs.forEach((sub) => {
        if (sub.candidateEmail) {
          const email = sub.candidateEmail.toLowerCase();
          if (!map[email]) {
            const positionAnswer = sub.answers.find((a) => a.questionText?.toLowerCase().includes("position applying for"))?.answer;
            if (positionAnswer && typeof positionAnswer === "string") {
              map[email] = positionAnswer;
            }
          }
        }
      });
      setPositionMap(map);
    };

    buildPositionMap();
  }, []);
  useEffect(() => {
    if (!assessmentId) return;

    const assessmentRef = doc(db, "assessments", assessmentId);
    const unsubAssessment = onSnapshot(assessmentRef, (doc) => {
      if (doc.exists()) {
        const assessmentData = { id: doc.id, ...doc.data() } as Assessment;
        if ((!assessmentData.sections || assessmentData.sections.length === 0) && (assessmentData as any).questions?.length > 0) {
          assessmentData.sections = [{ id: "default", title: "General Questions", questions: (assessmentData as any).questions }];
        } else if (!assessmentData.sections) {
          assessmentData.sections = [];
        }
        setAssessment(assessmentData);
      }
    });

    const submissionsQuery = query(
      collection(db, "assessmentSubmissions"),
      where("assessmentId", "==", assessmentId)
    );
    const unsubSubmissions = onSnapshot(
      submissionsQuery,
      (snapshot) => {
        const subs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as AssessmentSubmission));
        setAllSubmissions(subs);
      },
      (error) => {
        console.error("Error fetching submissions:", error);
        toast({ variant: "destructive", title: "Error fetching submissions", description: error.message });
      }
    );

    const unsubColleges = onSnapshot(collection(db, "colleges"), (snapshot) => {
      setColleges(snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as College)));
    });

    const unsubCandidates = onSnapshot(collection(db, "applications"), (snapshot) => {
      const appCands = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Candidate));
      setCandidates((prevCands) => {
        const newCandsMap = new Map(prevCands.map((c) => [c.id, c]));
        appCands.forEach((c) => newCandsMap.set(c.id, c));
        return Array.from(newCandsMap.values());
      });
    });

    const collegeListeners: (() => void)[] = [];
    const unsubAllCollegesForCands = onSnapshot(collection(db, "colleges"), (snapshot) => {
      collegeListeners.forEach((unsub) => unsub());
      collegeListeners.length = 0;

      snapshot.docs.forEach((collegeDoc) => {
        const unsub = onSnapshot(collection(db, `colleges/${collegeDoc.id}/candidates`), (candSnapshot) => {
          const collegeCands = candSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as CollegeCandidate));
          setCandidates((prevCands) => {
            const newCandsMap = new Map(prevCands.map((c) => [c.id, c]));
            collegeCands.forEach((c) => newCandsMap.set(c.id, c));
            return Array.from(newCandsMap.values());
          });
        });
        collegeListeners.push(unsub);
      });
    });

    return () => {
      unsubAssessment();
      unsubSubmissions();
      unsubColleges();
      unsubCandidates();
      unsubAllCollegesForCands();
      collegeListeners.forEach((unsub) => unsub());
    };
  }, [assessmentId, toast]);

  useEffect(() => {
    if (allSubmissions.length > 0 && candidates.length > 0) {
      const currentAssessmentSubmissions = allSubmissions
        .map((sub) => {
          const candidate = candidates.find((c) => {
            if (sub.candidateId && c.id === sub.candidateId) return true;
            if (sub.collegeCandidateId && c.id === sub.collegeCandidateId) return true;
            return c.email.toLowerCase() === sub.candidateEmail.toLowerCase();
          });
          return { ...sub, candidateStatus: candidate?.status, candidate: candidate || null };
        })
        .sort((a, b) => (b.submittedAt?.toDate() ?? 0) - (a.submittedAt?.toDate() ?? 0));

      setData(currentAssessmentSubmissions);
      setLoading(false);
    } else if (allSubmissions.length === 0) {
      setData([]);
      setLoading(false);
    }
  }, [allSubmissions, candidates]);

  const handleRecalculateScores = async () => {
    if (!assessment || data.length === 0) {
      toast({
        title: "Nothing to recalculate",
        description: "There are no submissions for this assessment.",
      });
      return;
    }

    setIsRecalculating(true);
    toast({
      title: "Recalculating Scores...",
      description: `Updating scores for ${data.length} submissions. Please wait.`,
    });

    try {
      const allQuestions = assessment.sections?.flatMap((s) => s.questions) || [];

      const batch = writeBatch(db);
      data.forEach((submission) => {
        const { score, maxScore, gradedAnswers } = gradeSubmission(submission.answers, allQuestions);
        const submissionRef = doc(db, "assessmentSubmissions", submission.id);
        batch.update(submissionRef, {
          maxScore: maxScore,
          score: score,
          answers: gradedAnswers,
        });
      });

      await batch.commit();

      toast({
        title: "Scores Recalculated!",
        description: "All submissions have been updated with the correct scores and total points.",
      });
    } catch (error) {
      console.error("Error recalculating scores:", error);
      toast({
        variant: "destructive",
        title: "Recalculation Failed",
        description: "An error occurred while updating the scores.",
      });
    } finally {
      setIsRecalculating(false);
    }
  };

  const handleRowClick = (submission: AssessmentSubmission) => {
    setSelectedSubmission({
      ...submission,
      shouldAutoGrade: assessment?.shouldAutoGrade || false,
    });
  };

  const handleCloseModal = () => {
    setSelectedSubmission(null);
  };

  const selectedCandidate = useMemo(() => {
    if (!selectedSubmission) return null;
    return (
      candidates.find((c) => {
        if (selectedSubmission.candidateId && c.id === selectedSubmission.candidateId) {
          return true;
        }
        if (selectedSubmission.collegeCandidateId && c.id === selectedSubmission.collegeCandidateId) {
          return true;
        }
        return c.email.toLowerCase() === selectedSubmission.candidateEmail.toLowerCase();
      }) || null
    );
  }, [selectedSubmission, candidates]);

  const collegeCounts = useMemo(() => {
    return allSubmissions
      .filter((s) => s.assessmentId === assessmentId)
      .reduce((acc, sub) => {
        const collegeId = sub.collegeId || "Direct";
        acc[collegeId] = (acc[collegeId] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
  }, [allSubmissions, assessmentId]);

  const positionCounts = useMemo(() => {
    return allSubmissions
      .filter((s) => s.assessmentId === assessmentId)
      .reduce((acc, sub) => {
        const position = positionMap[sub.candidateEmail.toLowerCase()];
        if (position) {
          acc[position] = (acc[position] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>);
  }, [allSubmissions, assessmentId, positionMap]);

  const positionOptions = useMemo(() => {
    return Object.keys(positionCounts);
  }, [positionCounts]);

  const handleStatusChange = async (submission: AssessmentSubmission, newStatus: CandidateStatus) => {
    const candidate = submission.candidate as Candidate | CollegeCandidate | null;
    if (!candidate?.id) {
      toast({ variant: "destructive", title: "Update Failed", description: "Candidate ID not found for this submission." });
      return;
    }

    const isCollegeCandidate = !!submission.collegeId;
    const collectionPath = isCollegeCandidate ? `colleges/${submission.collegeId}/candidates` : "applications";
    const docRef = doc(db, collectionPath, candidate.id);

    const proceedWithUpdate = async () => {
      try {
        await updateDoc(docRef, { status: newStatus });
        toast({
          title: "Status Updated",
          description: `Candidate status has been changed to ${newStatus}.`,
        });

        const shouldSendEmail = !isCollegeCandidate && (newStatus === "Shortlisted" || newStatus === "Rejected");

        if (shouldSendEmail) {
          const apiEndpoint = newStatus === "Shortlisted" ? "/api/shortlisted" : "/api/rejected";
          const mainCandidate = candidate as Candidate;
          const response = await fetch(apiEndpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              fullName: mainCandidate.fullName,
              email: mainCandidate.email,
              position: mainCandidate.position,
            }),
          });
          const result = await response.json();
          if (response.ok && result.success) {
            toast({ title: "Email Sent", description: `An email has been sent to the candidate.` });
          } else {
            toast({ variant: "destructive", title: "Email Failed", description: result.message });
          }
        }
      } catch (error) {
        toast({ variant: "destructive", title: "Update Failed", description: "Could not update candidate status." });
      }
    };

    if (!isCollegeCandidate && (newStatus === "Shortlisted" || newStatus === "Rejected")) {
      const action = newStatus === "Shortlisted" ? "shortlist" : "reject";
      const emailType = newStatus === "Shortlisted" ? 'a "shortlisted"' : 'a "rejection"';
      setConfirmation({
        isOpen: true,
        title: `Are you sure you want to ${action} this candidate?`,
        description: `This will send ${emailType} email to the candidate. Do you want to proceed?`,
        onConfirm: async () => {
          await proceedWithUpdate();
          setConfirmation({ ...confirmation, isOpen: false });
        },
      });
      return;
    }

    await proceedWithUpdate();
  };

  const columns = useMemo(
    () =>
      getColumns({
        onStatusChange: handleStatusChange,
        colleges,
        positionMap,
      }),
    [colleges, positionMap]
  );
  
  if (loading) return <p className="p-4">Loading submissions...</p>;

  return (
    <>
      <Card>
        <CardHeader className="flex flex-col items-stretch gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>Submissions</CardTitle>
            <CardDescription>A list of all candidate submissions for this assessment.</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={handleRecalculateScores} variant="outline" disabled={isRecalculating || data.length === 0}>
                {isRecalculating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                Recalculate All Scores
            </Button>
            <Button onClick={() => setExportDialogOpen(true)} variant="outline" disabled={data.length === 0}>
              <Download className="mr-2 h-4 w-4" />
              Export to CSV
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          <DataTable
            data={data}
            columns={columns}
            onRowClick={handleRowClick}
            colleges={colleges}
            collegeCounts={collegeCounts}
            positionCounts={positionCounts}
            positionOptions={positionOptions}
            allSubmissionsForFiltering={allSubmissions}
          />
        </CardContent>
      </Card>
      <SubmissionDetailsModal
        isOpen={!!selectedSubmission}
        onClose={handleCloseModal}
        submission={selectedSubmission}
        candidate={selectedCandidate}
        onUpdate={(updated) => setData((prev) => prev.map((s) => (s.id === updated.id ? updated : s)))}
        onStatusChange={(candidateId, status, isCollege) =>
          handleStatusChange(
            {
              ...selectedSubmission,
              candidateId: isCollege ? null : candidateId,
              collegeCandidateId: isCollege ? candidateId : null,
            } as AssessmentSubmission,
            status
          )
        }
      />
      <ExportSubmissionsDialog isOpen={isExportDialogOpen} onClose={() => setExportDialogOpen(false)} submissions={data} positionMap={positionMap} />
      <ConfirmationDialog
        isOpen={confirmation.isOpen}
        onOpenChange={(isOpen) => setConfirmation({ ...confirmation, isOpen })}
        title={confirmation.title}
        description={confirmation.description}
        onConfirm={confirmation.onConfirm}
        onCancel={() => setConfirmation({ ...confirmation, isOpen: false })}
      />
    </>
  );
}
