import { z } from 'zod';

export const CANDIDATE_STATUSES = [
  'Applied',
  'Shortlisted',
  'First Round',
  'Second Round',
  'Third Round',
  'Final Round',
  'Hired',
  'Rejected',
  'Future Reference',
] as const;

export const CANDIDATE_TYPES = ['full-time', 'internship'] as const;

export type CandidateStatus = (typeof CANDIDATE_STATUSES)[number];
export type CandidateType = (typeof CANDIDATE_TYPES)[number];

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

export const CandidateUpdateSchema = z.object({
  fullName: z.string().min(1, 'Full name is required'),
  email: z.string().email('Invalid email address'),
  contactNumber: z.string().min(1, 'Contact number is required'),
  whatsappNumber: z.string().min(1, 'WhatsApp number is required'),
  address: z.string().min(1, 'Address is required'),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  pincode: z.string().min(1, 'Pincode is required'),
  education: z.string().optional(),
  experience: z.string().min(1, 'Experience is required'),
  position: z.string().min(1, 'Position is required'),
  portfolio: z.string().url('Invalid URL').or(z.literal('')),
  introductionVideoIntern: z.string().url('Invalid URL').or(z.literal('')),
  status: z.enum(CANDIDATE_STATUSES),
  type: z.enum(CANDIDATE_TYPES),
  rejectionReason: z.string().optional(),
  comments: z.string().optional(),
});


export const JOB_STATUSES = ['Open', 'Closed'] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

export const JOB_TYPES = ['full-time', 'internship'] as const;
export type JobType = (typeof JOB_TYPES)[number];

export type Job = {
  id: string;
  position: string;
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
  duration?: string;
};

// Assessment Types
export const QUESTION_TYPES = ['text', 'multiple-choice', 'file-upload'] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];

export type AssessmentQuestion = {
  id: string;
  text: string;
  type: QuestionType;
  options?: string[];
};

export type Assessment = {
  id: string;
  title: string;
  passcode: string;
  timeLimit: number; // in minutes
  questions: AssessmentQuestion[];
  createdAt: any;
  submissionCount?: number;
};

export type AssessmentSubmission = {
  id: string;
  assessmentId: string;
  assessmentTitle: string;
  candidateName: string;
  candidateEmail: string;
  candidateContact: string;
  candidateResumeUrl: string;
  answers: {
    questionId: string;
    questionText: string;
    answer: string;
  }[];
  submittedAt: any;
  timeTaken: number; // in seconds
};

// College Collaboration Types
export type College = {
    id: string;
    name: string;
    location: string;
    contactPerson: string;
    contactEmail: string;
    createdAt: any;
    candidateCount?: number;
};

export type CollegeCandidate = {
    id: string;
    name: string;
    email: string;
};

export const CollegeSchema = z.object({
  name: z.string().min(1, "College name is required"),
  location: z.string().min(1, "Location is required"),
  contactPerson: z.string().min(1, "Contact person's name is required"),
  contactEmail: z.string().email("A valid email is required for the contact person"),
});
