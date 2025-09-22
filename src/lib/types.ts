

export const CANDIDATE_STATUSES = [
  'Applied',
  'Shortlisted',
  'First Round',
  'Second Round',
  'Third Round',
  'Final Round',
  'Hired',
  'Rejected',
] as const;

export type CandidateStatus = (typeof CANDIDATE_STATUSES)[number];
export type CandidateType = 'internship' | 'full-time';

export type Candidate = {
  id: string;
  fullName: string;
  email: string;
  contactNumber: string;
  location?: string; // Kept for backward compatibility, new data uses city/state
  address: string;
  city: string;
  state: string;
  pincode: string;
  education: string;
  workExperience?: string; // from AI
  experience: string; // from form/db
  position: string;
  portfolio: string;
  resumeUrl: string;
  avatar: string;
  status: CandidateStatus | string; // Allow for lowercase from db
  type: CandidateType;
  submittedAt: any; // Allow for Firestore timestamp object
  rejectionReason?: string;
  whatsappNumber: string;
  introductionVideoIntern?: string;
  comments?: string;
};

export const JOB_STATUSES = ['Open', 'Closed'] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

export const JOB_TYPES = ['full-time', 'internship'] as const;
export type JobType = (typeof JOB_TYPES)[number];

export type Job = {
  id: string;
  position: string;
  description: string;
  icon: string;
  openings: number;
  experience: string;
  location: string;
  highlightPoints: string[];
  responsibilities: string[];
  skills: string[];
  status: JobStatus;
  createdAt: any;
  type: JobType;
};
