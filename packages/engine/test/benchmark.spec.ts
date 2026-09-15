import { describe, expect, it } from 'vitest';
import { runBenchmark } from '../src/benchmark/index.js';

/**
 * Honest measurement.
 *
 * The numbers this file prints are the numbers in the README. There is no
 * threshold tuned to make them look good, and the carve-out cases — fraud
 * detection, one-to-one identity verification, a blog post *about* prohibited
 * practices — exist specifically to punish a scanner that pattern-matches
 * keywords instead of reading code.
 */
describe('benchmark — classification against a hand-labelled corpus', () => {
  const summary = runBenchmark();

  it('reports its own numbers, including the failures', () => {
    const wrong = summary.outcomes.filter(
      (o) => !o.tierCorrect || o.missedFindings.length || o.falseFindings.length,
    );
    // eslint-disable-next-line no-console
    console.log(
      [
        '',
        `  cases                 ${summary.total}`,
        `  tier accuracy         ${(summary.tierAccuracy * 100).toFixed(1)}%  (${summary.tierCorrect}/${summary.total})`,
        `  finding recall        ${(summary.recall * 100).toFixed(1)}%  (${summary.recalledFindings}/${summary.expectedFindings})`,
        `  carve-out precision   ${(summary.carveOutPrecision * 100).toFixed(1)}%  (${summary.forbiddenChecks - summary.forbiddenViolations}/${summary.forbiddenChecks})`,
        wrong.length ? '\n  cases Annex gets wrong:' : '\n  no failures',
        ...wrong.map(
          (o) =>
            `   - ${o.id}: expected ${o.expectedTier}, got ${o.actualTier}` +
            (o.missedFindings.length ? ` | missed ${o.missedFindings.join(', ')}` : '') +
            (o.falseFindings.length ? ` | false ${o.falseFindings.join(', ')}` : ''),
        ),
        '',
      ].join('\n'),
    );
    expect(summary.total).toBeGreaterThanOrEqual(25);
  });

  it('classifies the risk tier correctly in at least 90% of cases', () => {
    expect(summary.tierAccuracy).toBeGreaterThanOrEqual(0.9);
  });

  it('recalls at least 95% of the findings a competent reader would make', () => {
    expect(summary.recall).toBeGreaterThanOrEqual(0.95);
  });

  it('never fires a finding the statute expressly carves out', () => {
    const violations = summary.outcomes.flatMap((o) => o.falseFindings.map((f) => `${o.id}:${f}`));
    expect(violations).toEqual([]);
  });

  it('never finds an AI system in a repository that has none', () => {
    expect(summary.outcomes.find((o) => o.id === 'negative.no-ai')?.actualTier).toBe('unknown');
  });

  it('does not mistake writing about a prohibited practice for doing one', () => {
    expect(summary.outcomes.find((o) => o.id === 'negative.docs-only')?.falseFindings).toEqual([]);
  });
});
