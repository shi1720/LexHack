'use client';

import type { ScreeningResult } from '../screening/rank';

/**
 * The human oversight surface. Every screening outcome below the threshold
 * lands here; nothing leaves the pipeline without a named recruiter acting.
 * Article 14(4)(d): the reviewer can disregard, override or reverse the output.
 */
export function ReviewQueue({ results, onOverride }: {
  results: ScreeningResult[];
  onOverride: (decisionId: string, outcome: 'advance' | 'reject', reason: string) => void;
}) {
  return (
    <section aria-labelledby="queue-heading">
      <h2 id="queue-heading">Awaiting human review</h2>
      <ul>
        {results.filter((r) => r.requiresReviewer).map((r) => (
          <li key={r.decisionId}>
            <p>{r.explanation}</p>
            <button onClick={() => onOverride(r.decisionId, 'advance', 'reviewer override')}>
              Override — advance
            </button>
            <button onClick={() => onOverride(r.decisionId, 'reject', 'reviewer confirmed')}>
              Confirm — do not advance
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
