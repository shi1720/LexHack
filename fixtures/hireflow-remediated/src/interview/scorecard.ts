/**
 * Structured interview scorecards.
 *
 * This module replaced the previous "Interview Signal" feature, which inferred
 * affective state from video. Article 5(1)(f) prohibits inferring emotions of a
 * natural person in the areas of workplace and education institutions, and
 * recruitment sits squarely inside that. Interviewers now score against
 * pre-agreed, job-related competencies instead.
 */

export const COMPETENCIES = ['technical_depth', 'communication', 'ownership', 'collaboration'] as const;

export interface Scorecard {
  interviewerId: string;
  ratings: Record<(typeof COMPETENCIES)[number], 1 | 2 | 3 | 4>;
  evidenceNotes: string;
  submittedAt: string;
}

/** A scorecard is entered by a person. No model participates in this score. */
export function scorecardAverage(card: Scorecard): number {
  const values = COMPETENCIES.map((c) => card.ratings[c]);
  return values.reduce((a, b) => a + b, 0) / values.length / 4;
}
