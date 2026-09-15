import type { Applicant, JobPosting } from '../db/schema';

/**
 * Reason codes shown to the recruiter and, on request, to the candidate.
 * GDPR Art. 15(1)(h) requires meaningful information about the logic involved;
 * AI Act Art. 13(3)(b)(iv) requires the system to be able to explain its output.
 */
export const REASON_CODES = {
  SKILLS_MATCH: 'Listed skills overlap with the required skills in the posting.',
  SENIORITY_MATCH: 'Years of relevant experience match the seniority band.',
  SKILLS_GAP: 'One or more required skills were not evidenced in the application.',
  SENIORITY_GAP: 'Relevant experience is below the band stated in the posting.',
} as const;

export function explainScore(applicant: Applicant, posting: JobPosting, candidateScore: number): string {
  const codes = candidateScore >= 0.62
    ? [REASON_CODES.SKILLS_MATCH, REASON_CODES.SENIORITY_MATCH]
    : [REASON_CODES.SKILLS_GAP, REASON_CODES.SENIORITY_GAP];
  return `Fit score ${(candidateScore * 100).toFixed(0)}% for ${posting.title}. ${codes.join(' ')}`;
}
