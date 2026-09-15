import { openai, logger, SCORING_MODEL } from '../lib/openai';
import { SYSTEM_PROMPT, PROMPT_VERSION } from './prompts';
import { recordInference } from '../../lib/ai-act/audit-log';
import { gate } from '../../lib/ai-act/human-oversight';
import { explainScore } from './explain';
import type { Applicant, JobPosting } from '../db/schema';

/** Applicants below this band are routed to a recruiter, never auto-rejected. */
const ADVANCE_THRESHOLD = 0.62;

export interface ScreeningResult {
  applicantId: string;
  candidateScore: number;
  decision: 'advance' | 'pending_review';
  explanation: string;
  requiresReviewer: boolean;
  decisionId: string;
}

export async function scoreApplicant(
  applicant: Applicant,
  posting: JobPosting,
  escalate: (reason: string) => void,
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
  const explanation = explainScore(applicant, posting, candidateScore);
  const isAdverse = candidateScore < ADVANCE_THRESHOLD;

  // Article 14: no adverse screening outcome is applied without a human.
  const oversight = gate({ isAdverse, confidence: candidateScore, explanation, escalate });

  const record = recordInference({
    modelId: SCORING_MODEL,
    modelVersion: SCORING_MODEL,
    promptVersion: PROMPT_VERSION,
    inputs: { postingId: posting.id, applicantId: applicant.id },
    output: { candidateScore },
    outcome: oversight.outcome,
    confidence: candidateScore,
    subjectRef: applicant.id,
    humanDecision: oversight.requiresReviewer ? 'pending' : 'accepted',
  });

  logger.info({ decisionId: record.decisionId }, 'ai.inference_decision');

  return {
    applicantId: applicant.id,
    candidateScore,
    decision: oversight.outcome === 'auto_applied' ? 'advance' : 'pending_review',
    explanation,
    requiresReviewer: oversight.requiresReviewer,
    decisionId: record.decisionId,
  };
}

export async function rankApplicants(
  applicants: Applicant[],
  posting: JobPosting,
  escalate: (reason: string) => void,
) {
  const scored = await Promise.all(applicants.map((a) => scoreApplicant(a, posting, escalate)));
  return scored.sort((a, b) => b.candidateScore - a.candidateScore);
}
