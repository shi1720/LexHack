export interface Applicant {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  dateOfBirth: string | null;
  address: string | null;
  /** Self-reported at application time for EEO reporting. */
  gender: string | null;
  ethnicity: string | null;
  disability: string | null;
  resumeText: string;
  createdAt: Date;
}

export interface JobPosting {
  id: string;
  title: string;
  description: string;
  location: string;
  requisitionId: string;
}

export interface ScreeningRecord {
  id: string;
  applicantId: string;
  postingId: string;
  candidateScore: number;
  decision: 'advance' | 'reject';
  createdAt: Date;
}
