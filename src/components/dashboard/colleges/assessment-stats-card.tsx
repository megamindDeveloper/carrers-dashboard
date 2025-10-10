
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { Users, Mail, CheckCircle } from "lucide-react";

type AssessmentStats = {
  assessmentTitle: string;
  totalCandidates: number;
  invitationsSent: number;
  submissionsReceived: number;
};

interface AssessmentStatsCardProps {
  stats: AssessmentStats;
  className?: string;
}

export function AssessmentStatsCard({ stats, className }: AssessmentStatsCardProps) {
  const completionPercentage = stats.invitationsSent > 0
    ? (stats.submissionsReceived / stats.invitationsSent) * 100
    : 0;

  return (
    <Card className={cn("bg-background", className)}>
      <CardHeader>
        <CardTitle>Assessment Stats: {stats.assessmentTitle}</CardTitle>
        <CardDescription>
          Tracking progress for the selected assessment.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
          <div className="p-4 rounded-lg bg-muted">
            <Users className="h-6 w-6 mx-auto text-primary mb-2" />
            <p className="text-2xl font-bold">{stats.totalCandidates}</p>
            <p className="text-sm text-muted-foreground">Total Candidates</p>
          </div>
          <div className="p-4 rounded-lg bg-muted">
            <Mail className="h-6 w-6 mx-auto text-blue-500 mb-2" />
            <p className="text-2xl font-bold">{stats.invitationsSent}</p>
            <p className="text-sm text-muted-foreground">Invitations Sent</p>
          </div>
          <div className="p-4 rounded-lg bg-muted">
            <CheckCircle className="h-6 w-6 mx-auto text-green-500 mb-2" />
            <p className="text-2xl font-bold">{stats.submissionsReceived}</p>
            <p className="text-sm text-muted-foreground">Submissions Received</p>
          </div>
        </div>
        <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
                <span>Completion Rate</span>
                <span>{completionPercentage.toFixed(0)}%</span>
            </div>
            <Progress value={completionPercentage} />
        </div>
      </CardContent>
    </Card>
  );
}
