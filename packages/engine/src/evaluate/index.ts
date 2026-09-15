import type {
  Citation,
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
  SystemProfile,
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

  // A detector that crashes while deciding whether an obligation binds must
  // never be mistaken for an obligation that does not bind: "not applicable"
  // scores as a pass, so swallowing the error here would *raise* the score.
  let applicable: boolean;
  try {
    applicable = control.appliesWhen(ctx);
  } catch (err) {
    return {
      ...base,
      status: 'needs_review',
      score: STATUS_SCORE.needs_review,
      finding: `Annex could not determine whether this obligation binds the system: ${(err as Error).message}`,
      gap: 'Review this obligation manually. Annex has deliberately not scored it as a pass.',
      evidence: [],
    };
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

  // A scaffold is not a control.
  //
  // Annex writes documentation templates with `_TODO_` where a human has to
  // supply a judgement it cannot make — the residual-risk acceptance, the
  // monitoring thresholds, the accountable person. If every piece of evidence
  // behind a `satisfied` verdict comes from a file still carrying those
  // markers, then merging Annex's own remediation pull request would raise the
  // score without anyone deciding anything. That is the exact failure this
  // product exists to argue against, so it is caught here rather than in each
  // control: the status drops to `partial` and the finding says why.
  if (evaluation.status === 'satisfied') {
    const cited = (evaluation.evidence ?? []).filter((e) => e.kind !== 'absence');
    const unfilled = [...new Set(cited.map((e) => e.path))].filter((path) => {
      const file = ctx.snapshot.files.find((f) => f.path === path);
      return Boolean(file?.text.includes('_TODO_'));
    });
    if (cited.length > 0 && unfilled.length === new Set(cited.map((e) => e.path)).size) {
      return {
        ...base,
        status: 'partial',
        score: STATUS_SCORE.partial,
        finding: `${evaluation.finding} Every document behind this finding still carries unfilled \`_TODO_\` placeholders, so the scaffold exists but the judgements it asks for have not been made.`,
        gap: `Fill in the placeholders in ${unfilled.slice(0, 3).join(', ')}. A generated template is a starting point; on its own it evidences nothing.`,
        evidence: evaluation.evidence ?? [],
      };
    }
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
      // With no in-force obligation in this pack there is nothing that can be
      // failing today; `liveApplicable: 0` is what tells the UI to say so.
      liveScore: scoreControls(live),
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
 * Is this an SME or start-up for the purposes of Article 99(6)?
 *
 * Article 99(6) borrows the definition in Commission Recommendation
 * 2003/361/EC: fewer than 250 staff **and** either turnover at or below €50m
 * or a balance-sheet total at or below €43m — assessed across linked and
 * partner enterprises, not the legal entity in isolation.
 *
 * Unknown therefore resolves to **not** an SME. The inversion lowers the cap,
 * so guessing in the other direction hands an operator a ceiling an order of
 * magnitude too low, in the direction that makes them relax.
 */
export function isSmeUnderArticle99(profile: SystemProfile): boolean {
  const staff = profile.employees;
  if (staff === undefined || staff >= 250) return false;
  const turnover = profile.turnoverEur;
  const balance = profile.balanceSheetEur;
  if (turnover === undefined && balance === undefined) return false;
  return (turnover !== undefined && turnover <= 50_000_000) || (balance !== undefined && balance <= 43_000_000);
}

/**
 * Worst-case administrative exposure — a statutory ceiling, not a forecast.
 *
 * Only obligations already in force and actually failing count. Two things
 * this deliberately refuses to do: it will not produce a figure at all where
 * the operator has told us there is no Union nexus (Article 2(1)), because a
 * €35m banner over a product the Regulation does not reach is worse than no
 * number; and it does not pretend the number is an estimate. Article 99(1)
 * and 99(7) make fines discretionary and proportionality-bound, so what is
 * modelled here is the top of the range, not a prediction of where in it a
 * regulator would land.
 */
export function estimateExposure(
  packs: RulePack[],
  results: ControlResult[],
  profile: SystemProfile,
): ExposureEstimate {
  const { turnoverEur } = profile;
  const isSme = isSmeUnderArticle99(profile);

  const none = (basis: string): ExposureEstimate => ({
    maxFine: 0,
    currency: 'EUR',
    basis,
    citations: [],
    drivers: [],
    byRegime: [],
  });

  if (!profile.euNexus) {
    return none(
      'No exposure is modelled: the operator has recorded that the system is not placed on the Union market, is not put into service in the Union, and its output is not used in the Union. On Article 2(1) the Regulation does not reach it. Remove that declaration to see the figure.',
    );
  }

  const excluded = profile.scopeExclusions ?? [];
  if (excluded.includes('research')) {
    return none(
      'No exposure is modelled: the operator has claimed the Article 2(6) exclusion for AI systems developed and put into service for the sole purpose of scientific research and development. The exclusion is lost the moment the system is placed on the market or put into service for any other purpose.',
    );
  }
  if (excluded.includes('pre-market')) {
    return none(
      'No exposure is modelled: the operator has claimed the Article 2(8) exclusion for research, testing and development activity prior to placing on the market. It does not cover testing in real-world conditions.',
    );
  }

  const failing = results.filter((r) => (r.status === 'missing' || r.status === 'partial') && r.inForce);

  // Each regime is modelled on its own terms. Reducing them to a single
  // maximum silently compared a EUR ceiling against a USD per-day penalty and
  // reported whichever integer happened to be larger.
  const byRegime: ExposureEstimate['byRegime'] = [];

  for (const p of packs) {
    if (!p.penalty) continue;
    const packFailures = failing.filter((r) => r.pack === p.id);
    if (packFailures.length === 0) continue;

    const prohibition = packFailures.some((r) => r.family === 'prohibition');
    const tier = prohibition ? p.penalty.tiers[0] : p.penalty.tiers[1] ?? p.penalty.tiers[0];
    if (!tier) continue;

    const flat = tier.amount ?? 0;
    const eurDenominated = p.penalty.currency === 'EUR';
    const pct = tier.turnoverPct && turnoverEur && eurDenominated ? (turnoverEur * tier.turnoverPct) / 100 : 0;
    // Art. 99(3)-(5): the higher of the two. Art. 99(6): for SMEs, the lower.
    // A tier with no turnover percentage has only the flat cap to offer.
    const comparable = turnoverEur !== undefined && pct > 0;
    const amount = comparable ? (isSme ? Math.min(flat, pct) : Math.max(flat, pct)) : flat;
    if (amount <= 0) continue;

    const entry: ExposureEstimate['byRegime'][number] = {
      packId: p.id,
      packName: p.name,
      amount: Math.round(amount),
      currency: p.penalty.currency,
      label: tier.label,
      citation: tier.citation,
    };
    if (tier.multiplier) entry.multiplier = tier.multiplier;
    byRegime.push(entry);
  }

  byRegime.sort((a, b) => b.amount - a.amount);
  // The headline is the largest euro-denominated ceiling, so the number next
  // to a "€" is always actually euros. Other regimes are listed, never merged.
  const headline = byRegime.find((r) => r.currency === 'EUR') ?? byRegime[0];

  let basis = 'No obligation that is already in force is failing.';
  let citations: Citation[] = [];
  let maxFine = 0;
  let currency: 'EUR' | 'USD' = 'EUR';

  if (headline) {
    maxFine = headline.amount;
    currency = headline.currency;
    citations = [headline.citation];
    const pack = packs.find((p) => p.id === headline.packId);
    const tier = pack?.penalty?.tiers.find((t) => t.label === headline.label);
    const flat = tier?.amount ?? 0;
    const pct = tier?.turnoverPct && turnoverEur ? (turnoverEur * tier.turnoverPct) / 100 : 0;
    const comparable = turnoverEur !== undefined && pct > 0 && headline.currency === 'EUR';
    const figure =
      headline.amount === Math.round(pct)
        ? `the ${tier?.turnoverPct}% turnover figure`
        : `the ${headline.currency} ${flat.toLocaleString('en-GB')} cap`;
    basis = `${headline.packName}: ${headline.label}. ${
      comparable
        ? isSme
          ? `Article 99(6) caps fines on SMEs and start-ups at the lower of the two figures, so ${figure} applies.`
          : `The higher of EUR ${flat.toLocaleString('en-GB')} and ${tier?.turnoverPct}% of turnover applies, so ${figure} is used.`
        : turnoverEur === undefined
          ? 'Worldwide annual turnover was not supplied, so only the flat cap is shown.'
          : 'This regime sets a flat civil penalty rather than a turnover-linked one.'
    }`;
    const others = byRegime.filter((r) => r !== headline);
    if (others.length) {
      basis += ` ${others
        .map((r) => `${r.packName} is separately exposed at ${r.currency} ${r.amount.toLocaleString('en-GB')}${r.multiplier ? ` ${r.multiplier}` : ''}.`)
        .join(' ')}`;
    }
    if (headline.multiplier) basis += ` This amount applies ${headline.multiplier}.`;
  }

  return {
    maxFine: Math.round(maxFine),
    currency,
    basis,
    citations,
    byRegime,
    drivers: failing
      .sort((a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity] || b.weight - a.weight)
      .slice(0, 5)
      .map((r) => ({ controlId: r.controlId, title: r.title, severity: r.severity })),
  };
}
