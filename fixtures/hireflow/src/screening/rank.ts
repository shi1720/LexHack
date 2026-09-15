import { openai, logger, SCORING_MODEL } from '../lib/openai';
import { SYSTEM_PROMPT } from './prompts';
import type { Applicant, JobPosting } from '../db/schema';

/** Applicants scoring below this are filtered out of the recruiter's queue. */
const ADVANCE_THRESHOLD = 0.62;

export interface ScreeningResult {
  applicantId: string;
  candidateScore: number;
  decision: 'advance' | 'reject';
}

export async function scoreApplicant(
  applicant: Applicant,
  posting: JobPosting,
): Promise<ScreeningResult> {
  const completion = await openai.chat.completions.create({
    model: SCORING_MODEL,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: `POSTING:\n${posting.description}\n\nRESUME:\n${applicant.resumeText}` },
    ],
    temperature: 0,
  });

  const candidateScore = Number(completion.choices[0]?.message?.content ?? 0);
  const decision = candidateScore >= ADVANCE_THRESHOLD ? 'advance' : 'reject';

  logger.info({ applicantId: applicant.id }, 'scored applicant');

  return { applicantId: applicant.id, candidateScore, decision };
}

/** Rank and filter a whole requisition's applicant pool in one pass. */
export async function rankApplicants(applicants: Applicant[], posting: JobPosting) {
  const scored = await Promise.all(applicants.map((a) => scoreApplicant(a, posting)));
  return scored
    .filter((s) => s.decision === 'advance')
    .sort((a, b) => b.candidateScore - a.candidateScore);
}
