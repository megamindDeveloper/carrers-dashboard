
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { Loader2, Briefcase, Users, GraduationCap, ClipboardList, FileText, UserCheck } from 'lucide-react';
import { onSnapshot, collection, query, orderBy, limit } from 'firebase/firestore';
import { db } from '@/app/utils/firebase/firebaseConfig';
import type { Candidate, Job, Assessment, AssessmentSubmission } from '@/lib/types';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, Sector } from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { CANDIDATE_STATUSES } from '@/lib/types';

const toTitleCase = (str: string) => {
  if (!str) return '';
  return str.replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase());
};

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#FF8042', '#d0ed57'];

const ActiveShape = (props: any) => {
  const RADIAN = Math.PI / 180;
  const { cx, cy, midAngle, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent, value } = props;
  const sin = Math.sin(-RADIAN * midAngle);
  const cos = Math.cos(-RADIAN * midAngle);
  const sx = cx + (outerRadius + 10) * cos;
  const sy = cy + (outerRadius + 10) * sin;
  const mx = cx + (outerRadius + 30) * cos;
  const my = cy + (outerRadius + 30) * sin;
  const ex = mx + (cos >= 0 ? 1 : -1) * 22;
  const ey = my;
  const textAnchor = cos >= 0 ? 'start' : 'end';

  return (
    <g>
      <text x={cx} y={cy} dy={8} textAnchor="middle" fill={fill}>
        {payload.name}
      </text>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
      <Sector
        cx={cx}
        cy={cy}
        startAngle={startAngle}
        endAngle={endAngle}
        innerRadius={outerRadius + 6}
        outerRadius={outerRadius + 10}
        fill={fill}
      />
      <path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} stroke={fill} fill="none" />
      <circle cx={ex} cy={ey} r={2} fill={fill} stroke="none" />
      <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} textAnchor={textAnchor} fill="#333">{`${value} Candidates`}</text>
      <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} dy={18} textAnchor={textAnchor} fill="#999">
        {`(${(percent * 100).toFixed(2)}%)`}
      </text>
    </g>
  );
};


export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [submissions, setSubmissions] = useState<AssessmentSubmission[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
      return;
    }
    if (user) {
        const unsubscribers = [
            onSnapshot(collection(db, 'applications'), snapshot => {
                setCandidates(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Candidate)));
            }),
            onSnapshot(collection(db, 'jobs'), snapshot => {
                setJobs(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Job)));
            }),
            onSnapshot(collection(db, 'assessments'), snapshot => {
                setAssessments(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Assessment)));
            }),
            onSnapshot(collection(db, 'assessmentSubmissions'), snapshot => {
                setSubmissions(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as AssessmentSubmission)));
            }),
        ];

        Promise.all([
            new Promise(res => onSnapshot(collection(db, 'applications'), res)),
            new Promise(res => onSnapshot(collection(db, 'jobs'), res)),
            new Promise(res => onSnapshot(collection(db, 'assessments'), res)),
            new Promise(res => onSnapshot(collection(db, 'assessmentSubmissions'), res)),
        ]).then(() => setLoadingData(false));
        
        return () => unsubscribers.forEach(unsub => unsub());
    }
  }, [user, authLoading, router]);
  
  const [activeIndex, setActiveIndex] = useState(0);
  const onPieEnter = (_: any, index: number) => setActiveIndex(index);


  if (authLoading || loadingData || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const fullTimeCount = candidates.filter(c => c.type === 'full-time').length;
  const internCount = candidates.filter(c => c.type === 'internship').length;
  const hiredCount = candidates.filter(c => c.status?.toLowerCase() === 'hired').length;
  
  const applicationsPerJob = jobs.map(job => ({
      name: job.position,
      applications: candidates.filter(c => c.position === job.position).length
  })).sort((a,b) => b.applications - a.applications).slice(0, 10);

  const candidateStatusDistribution = CANDIDATE_STATUSES.map(status => ({
      name: status,
      value: candidates.filter(c => toTitleCase(c.status as string) === status).length,
  })).filter(item => item.value > 0);

  const recentCandidates = candidates
    .sort((a,b) => (b.submittedAt?.toDate() ?? 0) - (a.submittedAt?.toDate() ?? 0))
    .slice(0, 5);


  return (
      <main className="flex-1 space-y-4 p-4 pt-6 md:p-8">
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">Overview</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Applications</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{candidates.length}</div>
              <p className="text-xs text-muted-foreground">Total candidates in pipeline</p>
            </CardContent>
          </Card>
           <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Full-time Apps</CardTitle>
              <Briefcase className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{fullTimeCount}</div>
              <p className="text-xs text-muted-foreground">Total full-time applicants</p>
            </CardContent>
          </Card>
           <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Internship Apps</CardTitle>
              <GraduationCap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{internCount}</div>
              <p className="text-xs text-muted-foreground">Total intern applicants</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Assessments</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{assessments.length}</div>
              <p className="text-xs text-muted-foreground">Assessments created</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Submissions</CardTitle>
              <ClipboardList className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{submissions.length}</div>
              <p className="text-xs text-muted-foreground">Assessments submitted</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Hired</CardTitle>
              <UserCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{hiredCount}</div>
              <p className="text-xs text-muted-foreground">Candidates marked as hired</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-8 pt-4 md:grid-cols-2 lg:grid-cols-7">
           <Card className="lg:col-span-4">
            <CardHeader>
                <CardTitle>Applications per Position</CardTitle>
                <CardDescription>Top 10 job positions by application volume.</CardDescription>
            </CardHeader>
            <CardContent>
                 <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={applicationsPerJob} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" tick={{ fontSize: 12 }} interval={0} angle={-30} textAnchor="end" height={80}/>
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="applications" fill="hsl(var(--primary))" />
                    </BarChart>
                </ResponsiveContainer>
            </CardContent>
           </Card>
            <Card className="lg:col-span-3">
                <CardHeader>
                    <CardTitle>Candidate Status Distribution</CardTitle>
                    <CardDescription>Overview of where candidates are in the hiring funnel.</CardDescription>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={350}>
                        <PieChart>
                            <Pie
                                activeIndex={activeIndex}
                                activeShape={ActiveShape}
                                data={candidateStatusDistribution}
                                cx="50%"
                                cy="50%"
                                innerRadius={80}
                                outerRadius={110}
                                fill="hsl(var(--primary))"
                                dataKey="value"
                                onMouseEnter={onPieEnter}
                            >
                                {candidateStatusDistribution.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                        </PieChart>
                    </ResponsiveContainer>
                </CardContent>
           </Card>
        </div>
         <Card>
            <CardHeader>
                <CardTitle>Recent Applications</CardTitle>
                <CardDescription>The latest candidates to apply.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Candidate</TableHead>
                            <TableHead>Position</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Applied</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {recentCandidates.length > 0 ? (
                            recentCandidates.map(candidate => (
                                <TableRow key={candidate.id}>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <Avatar>
                                                <AvatarImage src={candidate.avatar} alt={candidate.fullName} />
                                                <AvatarFallback>{candidate.fullName.charAt(0)}</AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <div className="font-medium">{candidate.fullName}</div>
                                                <div className="text-sm text-muted-foreground">{candidate.email}</div>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>{candidate.position}</TableCell>
                                    <TableCell><Badge variant="secondary">{toTitleCase(candidate.status as string)}</Badge></TableCell>
                                    <TableCell className="text-right">{candidate.submittedAt ? formatDistanceToNow(candidate.submittedAt.toDate(), { addSuffix: true }) : 'N/A'}</TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center">No recent applications.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
      </main>
  );
}
