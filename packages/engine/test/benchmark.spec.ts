import { describe, expect, it } from 'vitest';
import { BENCHMARK, type BenchmarkCase } from './benchmark/corpus.js';
import { scanFiles } from './helpers.js';
import type { RiskTier } from '../src/types.js';

/**
 * Honest measurement.
 *
 * The numbers this file prints are the numbers in the README. There is no
 * threshold tuned to make them look good, and the carve-out cases — fraud
 * detection, one-to-one identity verification, a blog post *about* prohibited
 * practices — exist specifically to punish a scanner that pattern-matches
 * keywords instead of reading code.
 */

export interface CaseOutcome {
  id: string;
  description: string;
  expectedTier: RiskTier;
  actualTier: RiskTier;
  tierCorrect: boolean;
  missedFindings: string[];
  falseFindings: string[];
  rationale: string;
}

function runCase(bench: BenchmarkCase): CaseOutcome {
  const report = scanFiles(bench.files, { name: bench.id, purpose: bench.description });
  const found = new Set(report.classification.findings.map((f) => f.id));

  return {
    id: bench.id,
    description: bench.description,
    expectedTier: bench.tier,
    actualTier: report.classification.tier,
    tierCorrect: report.classification.tier === bench.tier,
    missedFindings: (bench.expectFindings ?? []).filter((f) => !found.has(f)),
    falseFindings: (bench.forbidFindings ?? []).filter((f) => found.has(f)),
    rationale: bench.rationale,
  };
}

export interface BenchmarkSummary {
  total: number;
  tierCorrect: number;
  tierAccuracy: number;
  expectedFindings: number;
  recalledFindings: number;
  recall: number;
  forbiddenChecks: number;
  forbiddenViolations: number;
  carveOutPrecision: number;
  outcomes: CaseOutcome[];
}

export function runBenchmark(): BenchmarkSummary {
  const outcomes = BENCHMARK.map(runCase);
  const expectedFindings = BENCHMARK.reduce((n, b) => n + (b.expectFindings?.length ?? 0), 0);
  const missed = outcomes.reduce((n, o) => n + o.missedFindings.length, 0);
  const forbiddenChecks = BENCHMARK.reduce((n, b) => n + (b.forbidFindings?.length ?? 0), 0);
  const violations = outcomes.reduce((n, o) => n + o.falseFindings.length, 0);
  const tierCorrect = outcomes.filter((o) => o.tierCorrect).length;

  return {
    total: outcomes.length,
    tierCorrect,
    tierAccuracy: tierCorrect / outcomes.length,
    expectedFindings,
    recalledFindings: expectedFindings - missed,
    recall: expectedFindings === 0 ? 1 : (expectedFindings - missed) / expectedFindings,
    forbiddenChecks,
    forbiddenViolations: violations,
    carveOutPrecision: forbiddenChecks === 0 ? 1 : (forbiddenChecks - violations) / forbiddenChecks,
    outcomes,
  };
}

describe('benchmark — classification against a hand-labelled corpus', () => {
  const summary = runBenchmark();

  it('reports its own numbers', () => {
    const wrong = summary.outcomes.filter((o) => !o.tierCorrect || o.missedFindings.length || o.falseFindings.length);
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

  it('classifies the risk tier correctly in at least 85% of cases', () => {
    expect(summary.tierAccuracy).toBeGreaterThanOrEqual(0.85);
  });

  it('recalls at least 90% of the findings a competent reader would make', () => {
    expect(summary.recall).toBeGreaterThanOrEqual(0.9);
  });

  it('never fires a finding the statute expressly carves out', () => {
    const violations = summary.outcomes.flatMap((o) => o.falseFindings.map((f) => `${o.id}:${f}`));
    expect(violations).toEqual([]);
  });

  it('never finds an AI system in a repository that has none', () => {
    const noAi = summary.outcomes.find((o) => o.id === 'negative.no-ai');
    expect(noAi?.actualTier).toBe('unknown');
  });

  it('does not mistake writing about a prohibited practice for doing one', () => {
    const docs = summary.outcomes.find((o) => o.id === 'negative.docs-only');
    expect(docs?.falseFindings).toEqual([]);
  });
});
