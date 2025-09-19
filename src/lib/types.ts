
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
export type CandidateType = 'intern' | 'emp';

export type Candidate = {
  id: string;
  fullName: string;
  email: string;
  contactNumber: string;
  location: string;
  address: string;
  education: string;
  workExperience: string;
  position: string;
  portfolio: string;
  resumeUrl: string;
  avatar: string;
  status: CandidateStatus;
  type: CandidateType;
  submittedAt: string;
  rejectionReason?: string;
};
