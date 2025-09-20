
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
  type: CandidateType | 'emp' | 'intern'; // Allow old values from db
  submittedAt: any; // Allow for Firestore timestamp object
  rejectionReason?: string;
  whatsappNumber: string;
};
