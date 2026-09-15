/** Article 14(4)(b): guard against automation bias. */
export const REVIEW_CONFIDENCE_FLOOR = Number(process.env.AI_REVIEW_CONFIDENCE_FLOOR ?? 0.85);

/** Article 14(4)(e): stop control — brings the system to a halt in a safe state. */
export const AI_ENABLED = process.env.AI_ENABLED !== 'false';

export type OversightOutcome = 'auto_applied' | 'pending_human_review' | 'halted';

export interface OversightDecision {
  outcome: OversightOutcome;
  reason: string;
  requiresReviewer: boolean;
  explanation: string;
}

/**
 * Article 14 human oversight gate. No adverse outcome is ever applied without a
 * named reviewer confirming it (Article 14(4)(d)).
 */
export function gate(input: {
  isAdverse: boolean;
  confidence: number;
  explanation: string;
  escalate: (reason: string) => void;
}): OversightDecision {
  if (!AI_ENABLED) {
    return { outcome: 'halted', reason: 'Stop control engaged.', requiresReviewer: false, explanation: input.explanation };
  }
  if (input.isAdverse) {
    input.escalate('adverse outcome requires human confirmation');
    return {
      outcome: 'pending_human_review',
      reason: 'Adverse outcomes are never applied automatically (Art. 14(4)(d)).',
      requiresReviewer: true,
      explanation: input.explanation,
    };
  }
  if (input.confidence < REVIEW_CONFIDENCE_FLOOR) {
    input.escalate('confidence below review floor');
    return {
      outcome: 'pending_human_review',
      reason: `Confidence ${input.confidence.toFixed(2)} is below the review floor.`,
      requiresReviewer: true,
      explanation: input.explanation,
    };
  }
  return { outcome: 'auto_applied', reason: 'Non-adverse, high-confidence outcome.', requiresReviewer: false, explanation: input.explanation };
}
