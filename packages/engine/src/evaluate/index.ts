import type {
  ComplianceClock,
  ComplianceMilestone,
  Control,
  ControlResult,
  ControlStatus,
  EvaluationContext,
  ExposureEstimate,
  PackScore,
  RulePack,
  Severity,
} from '../types.js';

export { createContext } from './context.js';

const STATUS_SCORE: Record<ControlStatus, number> = {
  satisfied: 1,
  partial: 0.5,
  needs_review: 0.35,
  missing: 0,
  not_applicable: 1,
};

/** Controls that carry a hard prohibition are not gradeable — they are pass/fail. */
const HARD_FAIL_FAMILIES = new Set(['prohibition']);

export function evaluateControl(control: Control, ctx: EvaluationContext, today: Date): ControlResult {
  const base: Omit<ControlResult, 'status' | 'score' | 'finding' | 'gap' | 'evidence'> = {
    controlId: control.id,
    pack: control.pack,
    title: control.title,
    obligation: control.obligation,
    family: control.family,
    severity: control.severity,
    weight: control.weight,
    citations: control.citations,
    method: control.method,
    remediationAvailable: Boolean(control.remediation),
    appliesFrom: control.appliesFrom,
    inForce: new Date(control.appliesFrom).getTime() <= today.getTime(),
  };

  let applicable: boolean;
  try {
    applicable = control.appliesWhen(ctx);
  } catch {
    applicable = false;
  }

  if (!applicable) {
    return {
      ...base,
      status: 'not_applicable',
      score: 1,
      finding: 'This obligation does not bind the system as classified.',
      evidence: [],
    };
  }

  let evaluation;
  try {
    evaluation = control.evaluate(ctx);
  } catch (err) {
    return {
      ...base,
      status: 'needs_review',
      score: STATUS_SCORE.needs_review,
      finding: `The detector for this control could not complete: ${(err as Error).message}`,
      gap: 'Review this obligation manually.',
      evidence: [],
    };
  }

  const score = evaluation.score ?? STATUS_SCORE[evaluation.status];
  const result: ControlResult = {
    ...base,
    status: evaluation.status,
    score,
    finding: evaluation.finding,
    evidence: evaluation.evidence ?? [],
  };
  if (evaluation.gap) result.gap = evaluation.gap;
  return result;
}

export interface EvaluateOptions {
  today?: Date;
  onProgress?: (done: number, total: number, controlId: string) => void;
}

export function evaluatePacks(
  packs: RulePack[],
  ctx: EvaluationContext,
  opts: EvaluateOptions = {},
): ControlResult[] {
  const today = opts.today ?? new Date();
  const all = packs.flatMap((p) => p.controls);
  const results: ControlResult[] = [];
  all.forEach((control, i) => {
    results.push(evaluateControl(control, ctx, today));
    opts.onProgress?.(i + 1, all.length, control.id);
  });
  return results;
}

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

/**
 * A weighted mean over applicable controls. Two deliberate choices:
 *
 * 1. `not_applicable` controls are excluded rather than counted as passes. A
 *    chatbot should not score 96 % because thirty high-risk obligations do not
 *    bind it.
 * 2. A failed *prohibition* caps the whole score at 25. A system that contains
 *    a prohibited practice is not "78 % compliant"; it cannot lawfully be
 *    placed on the EU market at all, and a score that says otherwise would be
 *    a lie told in a reassuring font.
 */
export function scoreControls(results: ControlResult[]): number {
  const applicable = results.filter((r) => r.status !== 'not_applicable');
  if (applicable.length === 0) return 100;

  const totalWeight = applicable.reduce((sum, r) => sum + r.weight, 0);
  const earned = applicable.reduce((sum, r) => sum + r.score * r.weight, 0);
  const raw = Math.round((earned / totalWeight) * 100);

  const prohibitionBreached = applicable.some(
    (r) => HARD_FAIL_FAMILIES.has(r.family) && r.status === 'missing' && r.inForce,
  );
  return prohibitionBreached ? Math.min(raw, 25) : raw;
}

export function scorePacks(packs: RulePack[], results: ControlResult[]): PackScore[] {
  return packs.map((p) => {
    const mine = results.filter((r) => r.pack === p.id);
    const applicable = mine.filter((r) => r.status !== 'not_applicable');
    const live = applicable.filter((r) => r.inForce);
    return {
      packId: p.id,
      packName: p.name,
      version: p.version,
      jurisdiction: p.jurisdiction,
      score: scoreControls(mine),
      applicable: applicable.length,
      satisfied: mine.filter((r) => r.status === 'satisfied').length,
      partial: mine.filter((r) => r.status === 'partial').length,
      missing: mine.filter((r) => r.status === 'missing').length,
      notApplicable: mine.filter((r) => r.status === 'not_applicable').length,
      needsReview: mine.filter((r) => r.status === 'needs_review').length,
      liveScore: scoreControls(live.length ? live : []),
      liveApplicable: live.length,
    };
  });
}

// ---------------------------------------------------------------------------
// Compliance clock
// ---------------------------------------------------------------------------

const DAY_MS = 24 * 60 * 60 * 1000;

export function buildClock(packs: RulePack[], results: ControlResult[], today = new Date()): ComplianceClock {
  const failingByDate = new Map<string, string[]>();
  for (const r of results) {
    if (r.status === 'satisfied' || r.status === 'not_applicable') continue;
    const list = failingByDate.get(r.appliesFrom) ?? [];
    list.push(r.controlId);
    failingByDate.set(r.appliesFrom, list);
  }

  const seen = new Set<string>();
  const milestones: ComplianceMilestone[] = [];
  for (const p of packs) {
    for (const m of p.milestones) {
      const key = `${m.date}|${m.label}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const daysAway = Math.round((new Date(m.date).getTime() - today.getTime()) / DAY_MS);
      milestones.push({
        ...m,
        daysAway,
        status: daysAway <= 0 ? 'in-force' : 'upcoming',
        controlIds: failingByDate.get(m.date) ?? [],
      });
    }
  }
  milestones.sort((a, b) => a.date.localeCompare(b.date));

  const next = milestones.find((m) => m.status === 'upcoming' && m.controlIds.length > 0);
  const clock: ComplianceClock = { today: today.toISOString().slice(0, 10), milestones };
  if (next) clock.next = next;
  return clock;
}

// ---------------------------------------------------------------------------
// Exposure
// ---------------------------------------------------------------------------

const SEVERITY_RANK: Record<Severity, number> = { critical: 3, high: 2, medium: 1, low: 0 };

/**
 * Worst-case administrative exposure. Deliberately conservative: only
 * obligations that are *already in force* and actually failing count, and the
 * SME inversion in Article 99(6) is applied when turnover is known.
 */
export function estimateExposure(
  packs: RulePack[],
  results: ControlResult[],
  turnoverEur?: number,
  isSme = false,
): ExposureEstimate {
  const failing = results.filter((r) => (r.status === 'missing' || r.status === 'partial') && r.inForce);

  let maxFine = 0;
  let basis = 'No obligation that is already in force is failing.';
  const citations = [];

  for (const p of packs) {
    if (!p.penalty) continue;
    const packFailures = failing.filter((r) => r.pack === p.id);
    if (packFailures.length === 0) continue;

    const prohibition = packFailures.some((r) => r.family === 'prohibition');
    const tier = prohibition ? p.penalty.tiers[0] : p.penalty.tiers[1] ?? p.penalty.tiers[0];
    if (!tier) continue;

    const flat = tier.amountEur ?? 0;
    const pct = tier.turnoverPct && turnoverEur ? (turnoverEur * tier.turnoverPct) / 100 : 0;
    // Art. 99(3)-(5): the higher of the two. Art. 99(6): for SMEs, the lower.
    const amount = turnoverEur ? (isSme ? Math.min(flat, pct) : Math.max(flat, pct)) : flat;

    if (amount > maxFine) {
      maxFine = amount;
      basis = `${p.name}: ${tier.label}. ${
        turnoverEur
          ? isSme
            ? `Article 99(6) caps fines on SMEs and start-ups at the *lower* of the two figures, so the ${tier.turnoverPct}% turnover figure applies.`
            : `The higher of EUR ${flat.toLocaleString('en-GB')} and ${tier.turnoverPct}% of turnover applies.`
          : 'Worldwide annual turnover was not supplied, so only the flat cap is shown.'
      }`;
      citations.push(tier.citation);
    }
  }

  return {
    maxFineEur: Math.round(maxFine),
    basis,
    citations,
    drivers: failing
      .sort((a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity] || b.weight - a.weight)
      .slice(0, 5)
      .map((r) => ({ controlId: r.controlId, title: r.title, severity: r.severity })),
  };
}
