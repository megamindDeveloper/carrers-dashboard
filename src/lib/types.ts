export const CANDIDATE_STATUSES = [
  'Applied',
  'Shortlisted',
  'First Round',
  'Second Round',
  'Final Round',
  'Hired',
  'Rejected',
] as const;

export type CandidateStatus = (typeof CANDIDATE_STATUSES)[number];
export type ApplicationType = 'Intern' | 'Full-time';

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
  applicationType: ApplicationType;
};
