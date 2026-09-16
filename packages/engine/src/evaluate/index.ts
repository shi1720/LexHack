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
export { wiredIn, wiringGap, type Wiring } from './wiring.js';

import { wiredIn, wiringGap } from './wiring.js';
import { deniedByItsOwnEvidence } from './denial.js';
import { commentLines } from '../signals/define.js';

/**
 * Annex's own mark for a judgement a human still has to supply.
 *
 * The regex below is a guess at other people's spellings and will always be
 * one `sed` behind ; it was case-sensitive, so `sed -i 's/TODO/todo/g'` over
 * the generated scaffolds flipped five controls to `satisfied` without
 * anybody supplying a judgement, and `_PENDING_`, `_TK_` and `«fill»` walk
 * past it today. A guard against *Annex's own output* has no business
 * guessing: `annex fix` writes this marker into every scaffold it generates,
 * and removing it is an explicit act rather than a formatting accident.
 */
const UNFILLED_MARKER = /<!--\s*annex:unfilled\b[^>]*-->/i;

/**
 * What an unfilled placeholder looks like in a document Annex did not write.
 *
 * Case-insensitive, because `todo` and `TODO` are the same note to the same
 * reader and `sed -i 's/TODO/todo/g'` used to be the whole difference between
 * `partial` and `satisfied` on five controls.
 */
const PLACEHOLDER = /\b_{0,2}TODO_{0,2}\b|\bTBD\b|\bFIXME\b|\bFILL[ _-]?IN\b|_(?:PENDING|TK|TBC)_|«[^»]*»|\b(?:XX+|\?{3,})\b/i;

/**
 * The angle-bracket form, which must stay case-**sensitive**.
 *
 * `<NAME HERE>` is a placeholder; `<Session>`, `<ScreeningResult>`, `<strong>`
 * and `<table>` are a type parameter and two HTML tags. Folding case here
 * capped nine controls across the remediated fixture on ordinary TSX.
 */
const BRACKET_PLACEHOLDER = /<[A-Z][A-Z_ ]{2,}>/;

/** Does this document still carry a judgement nobody has made? */
function unfilled(text: string): boolean {
  return UNFILLED_MARKER.test(text) || PLACEHOLDER.test(text) || BRACKET_PLACEHOLDER.test(text);
}

const STATUS_SCORE: Record<ControlStatus, number> = {
  satisfied: 1,
  partial: 0.5,
  needs_review: 0.35,
  missing: 0,
  not_applicable: 1,
};

/** Controls that carry a hard prohibition are not gradeable ; they are pass/fail. */
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

  // --------------------------------------------------------------------
  // The invariant: a `satisfied` verdict must rest on something live.
  //
  // Annex's whole argument is that a document a company wrote about itself
  // cannot answer the question. Two ways of writing exactly such a document
  // had to be closed, and they were closed the wrong way the first time ;
  // hand-patched into the two controls a reviewer happened to name, while the
  // other forty-three stayed open. A guard that holds for two controls is not
  // a property of the engine; it is a patch. So it lives here, where every
  // result passes through, and the packs carry no special cases at all.
  //
  //  - **A scaffold is not a control.** Annex writes documentation templates
  //    with `_TODO_` where a human has to supply a judgement ; the residual
  //    risk acceptance, the declared accuracy level, the accountable person.
  //    A finding backed only by unfilled placeholders is a finding backed by
  //    Annex's own output.
  //  - **Dead code is not a control.** A generated `human_oversight.py` that
  //    nothing calls discharges nobody's Article 14 duty.
  //  - **Prose is not an implementation.** A comment can corroborate a
  //    verdict and cannot carry one; a file of four `//` lines satisfied
  //    Article 14, the heaviest control in the corpus.
  //  - **A document that says no is not a yes.** "We have never commissioned
  //    a bias audit" contains the words a matcher is looking for and denies
  //    the thing they are looking for. This one was found by a judge in five
  //    minutes, on the obligation where each further day of use is its own
  //    penalty.
  //  - **A duty about running code needs running code.** The previous
  //    invariant only fires on a control that cited *some* code, so the
  //    cheaper attack was to cite none: five lines of `docs/oversight.md`
  //    describing a review queue, an override and a kill switch satisfied
  //    Article 14 over a repository containing no oversight code at all. It
  //    was easier than the comment-only file it was written to stop, because
  //    the attacker simply does not write the file. Where a control declares
  //    `requiresWiring` it is a claim about what happens at run time, and a
  //    document is not that.
  //
  // All four cap at `partial` rather than dropping to `missing`, because "we
  // could not see it working" is a weaker claim than "it is not there".
  // --------------------------------------------------------------------
  if (evaluation.status === 'satisfied') {
    const cited = (evaluation.evidence ?? []).filter((e) => e.kind !== 'absence');
    const paths = [...new Set(cited.map((e) => e.path))];

    /**
     * Collect every reason, not the first one.
     *
     * These used to return on the earliest match, so a control resting on an
     * unfilled scaffold *and* on code nothing calls reported only the
     * scaffold ; and the sharper fact, that the module is never reached,
     * never reached the reader. A reader fixing one and re-running to find
     * the next is a reader we wasted a cycle of.
     */
    const caps: { finding: string; gap: string }[] = [];

    const unfilledDocs = paths.filter((path) => unfilled(ctx.snapshot.files.find((f) => f.path === path)?.text ?? ''));
    if (unfilledDocs.length > 0) {
      caps.push({
        finding: `${
          unfilledDocs.length === paths.length
            ? 'Every document behind this finding still carries'
            : `${unfilledDocs.length} of the ${paths.length} documents behind this finding ${unfilledDocs.length === 1 ? 'still carries' : 'still carry'}`
        } unfilled placeholders, so the scaffold exists but the judgements it asks for have not been made.`,
        gap: `Fill in the placeholders in ${unfilledDocs.slice(0, 3).join(', ')}. A generated template is a starting point; on its own it evidences nothing.`,
      });
    }

    const codeCitations = cited.filter((e) => e.kind === 'code');
    if (codeCitations.length > 0) {
      const executable = codeCitations.filter((e) => {
        const file = ctx.snapshot.files.find((f) => f.path === e.path);
        if (!file) return true;
        return !commentLines(file.text.split('\n')).has(e.line - 1);
      });
      if (executable.length === 0) {
        const first = codeCitations[0]!;
        caps.push({
          finding: `Every line behind this finding is a comment: ${first.path}:${first.line} reads "${first.snippet.trim().slice(0, 100)}". A description of a control is not the control.`,
          gap: 'Either the measure exists and the detector found only the prose describing it ; in which case cite the code ; or the prose is all there is. Annex will corroborate a verdict with a comment and will not rest one on comments alone.',
        });
      }
    }

    const denied = deniedByItsOwnEvidence(cited, (path) => ctx.snapshot.files.find((f) => f.path === path)?.text);
    if (denied.length > 0) {
      const first = denied[0]!;
      caps.push({
        finding: `The documentation this rests on denies or defers the thing it is being read as evidence of: ${first.path}:${first.line} reads "${first.snippet.slice(0, 140)}".`,
        gap: 'Either the measure exists and that sentence is out of date, or the sentence is right and the measure does not exist. Annex cannot tell which from prose, and will not read a denial as a discharge.',
      });
    }

    // `wiredIn` returns `{ wired: true, checked: false }` when there is no
    // code to check, which is right for a documentation control and wrong
    // here: a control that demands wiring and cites nothing executable has
    // not been shown to be wired, it has been shown to be described.
    if (control.requiresWiring && codeCitations.length === 0) {
      const doc = cited.find((e) => e.kind === 'doc') ?? cited[0];
      caps.push({
        finding: `This obligation is about what the system does while it runs, and every line behind this finding is documentation${doc ? `: ${doc.path}:${doc.line}` : ''}. No code in this repository was found implementing it.`,
        gap: 'Cite the implementation, not the description of it. A policy that says an adverse outcome is queued for review is evidence that somebody wrote the policy.',
      });
    }

    const wiring = control.requiresWiring ? wiredIn(ctx, cited) : undefined;
    if (wiring && !wiring.wired) {
      caps.push({
        finding: 'The code behind this finding is not reached from anywhere else in the repository, so it cannot be doing the work at the moment the obligation bites.',
        gap: `Wire it into the path that makes the decision: ${wiringGap(wiring)}.`,
      });
    }

    if (caps.length > 0) {
      return {
        ...base,
        status: 'partial',
        score: STATUS_SCORE.partial,
        finding: `${evaluation.finding} ${caps.map((c) => c.finding).join(' ')}`,
        gap: caps.map((c) => c.gap).join(' '),
        evidence: evaluation.evidence ?? [],
      };
    }

    if (wiring && wiring.callSites.length > 0) {
      evaluation = { ...evaluation, evidence: [...(evaluation.evidence ?? []), ...wiring.callSites] };
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
/**
 * The conformity score, or `null` where there is nothing to score.
 *
 * Returning 100 for an empty applicable set was the most dangerous line in the
 * engine. A repository Annex could not read ; a Jupyter notebook, an R file,
 * a `.annexignore` containing `*`, a source file one byte over the size limit,
 * a tree whose 4,001st file is the interesting one ; classifies as `unknown`,
 * applies no obligations, scores a full green 100 and passes `--fail-under 90`
 * in CI. Every false negative became a passing build, and the number most
 * likely to be wrong was the one that looked best.
 *
 * `null` is the honest value: not "compliant", not "zero", *not assessed*.
 * Every caller has to say so, which is the point of making it a different
 * type rather than a different number.
 */
export function scoreControls(results: ControlResult[]): number | null {
  const applicable = results.filter((r) => r.status !== 'not_applicable');
  if (applicable.length === 0) return null;

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
 * or a balance-sheet total at or below €43m ; assessed across linked and
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
 * Worst-case administrative exposure ; a statutory ceiling, not a forecast.
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
  // Not derived: "small mid-cap" is defined outside the AI Act and Annex does
  // not model the thresholds, so it is an operator attestation and unknown
  // resolves to not-an-SMC.
  const isSmc = !isSme && profile.smallMidCap === true;

  const none = (basis: string): ExposureEstimate => ({
    maxFine: 0,
    currency: 'EUR',
    basis,
    citations: [],
    drivers: [],
    byRegime: [],
  });

  // Article 2 is a scope provision of the AI Act, and only of the AI Act. An
  // argument that the Regulation does not reach a system says nothing about a
  // New York City civil penalty or a GDPR fine, so the gate suppresses the EU
  // regimes it governs and leaves the others standing.
  const excluded = profile.scopeExclusions ?? [];
  const outOfAiActScope = !profile.euNexus
    ? 'the operator has recorded that the system is not placed on the Union market, is not put into service in the Union, and its output is not used in the Union, so on Article 2(1) the Regulation does not reach it'
    : excluded.includes('research')
      ? 'the operator has claimed the Article 2(6) exclusion for AI systems developed and put into service for the sole purpose of scientific research and development ; an exclusion lost the moment the system is placed on the market or put into service for any other purpose'
      : excluded.includes('pre-market')
        ? 'the operator has claimed the Article 2(8) exclusion for research, testing and development prior to placing on the market, which does not cover testing in real-world conditions'
        : undefined;

  const inScope = outOfAiActScope
    ? packs.filter((p) => p.id !== 'eu-ai-act' && (p.id !== 'gdpr' || profile.euNexus))
    : packs;

  if (outOfAiActScope && inScope.length === 0) {
    return none(`No AI Act exposure is modelled: ${outOfAiActScope}.`);
  }

  const failing = results.filter((r) => (r.status === 'missing' || r.status === 'partial') && r.inForce);

  /**
   * Prohibition controls are inverted, and the exposure model has to know it.
   *
   * For an ordinary obligation `partial` means "some of the duty is
   * discharged", which is a breach and is properly priced. For a prohibition
   * it means the opposite: the practice was looked for and the prohibition was
   * found *not* to bite. `eu-ai-act.art5.emotion-workplace` returns partial
   * with "Article 5(1)(f) is not engaged" for a driver-drowsiness detector
   * that Recital 18 puts outside the definition altogether.
   *
   * Pricing that at the Article 99(3) tier meant Annex classified the system
   * as minimal risk, told the operator in terms that the prohibition did not
   * apply, and then billed them at the €35 000 000 / 7 % prohibited-practice
   * ceiling on the same screen. Article 99(3) reaches "non-compliance with the
   * prohibition of the AI practices referred to in Article 5" and nothing
   * else, so only a `missing` prohibition can select that tier.
   *
   * This is stated as a rule about prohibitions rather than about Article 5,
   * because the next prohibition control added will have the same shape: the
   * new Article 5(1)(ba) and (bb) safeguards arm the identical trap on
   * 2 December 2026.
   */
  const pricedAsBreach = (r: ControlResult, control: Control | undefined): boolean =>
    control?.family !== 'prohibition' || r.status === 'missing';

  // Each regime is modelled on its own terms. Reducing them to a single
  // maximum silently compared a EUR ceiling against a USD per-day penalty and
  // reported whichever integer happened to be larger.
  const byRegime: ExposureEstimate['byRegime'] = [];

  for (const p of inScope) {
    if (!p.penalty) continue;
    const packFailures = failing.filter((r) => r.pack === p.id);
    if (packFailures.length === 0) continue;

    // The penalty provision is a closed list, so the failing obligations pick
    // the tier ; not their position in an array. An obligation the statute
    // does not price carries no Union-level ceiling, and is skipped.
    const controls = new Map(p.controls.map((c) => [c.id, c]));
    const tiers = new Map(p.penalty.tiers.map((t) => [t.id, t]));
    let tier: (typeof p.penalty.tiers)[number] | undefined;
    let highest = -1;
    for (const failure of packFailures) {
      const control = controls.get(failure.controlId);
      if (!control?.penaltyTier) continue;
      if (!pricedAsBreach(failure, control)) continue;
      const candidate = tiers.get(control.penaltyTier);
      if (!candidate) continue;
      const ceiling = candidate.amount ?? 0;
      if (ceiling > highest) {
        highest = ceiling;
        tier = candidate;
      }
    }
    if (!tier) continue;

    const flat = tier.amount ?? 0;
    const eurDenominated = p.penalty.currency === 'EUR';
    const pct = tier.turnoverPct && turnoverEur && eurDenominated ? (turnoverEur * tier.turnoverPct) / 100 : 0;
    const comparable = turnoverEur !== undefined && pct > 0;
    // Article 99(6) inverts the higher-of rule for SMEs, across paragraphs 3,
    // 4 and 5. GDPR Article 83 does not invert at all, and applying it there
    // understated a €20m ceiling by two orders of magnitude.
    //
    // Article 99(6a) inverts for small mid-caps too ; but only for paragraphs
    // 4 and 5. An SMC failing Article 5 faces the full higher-of figure, so
    // the SMC inversion is read off the tier and the SME inversion off the
    // pack. Those are different provisions and collapsing them is a four-fold
    // error on a €120m operator.
    const inverts =
      (isSme && p.penalty.smeInversion === true) || (isSmc && tier.smcInversion === true);
    const amount = comparable ? (inverts ? Math.min(flat, pct) : Math.max(flat, pct)) : flat;
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

  if (outOfAiActScope && byRegime.length === 0) {
    return none(`No AI Act exposure is modelled: ${outOfAiActScope}. No other regime in this scan is failing.`);
  }

  if (headline) {
    maxFine = headline.amount;
    currency = headline.currency;
    citations = [headline.citation];
    const pack = packs.find((p) => p.id === headline.packId);
    const tier = pack?.penalty?.tiers.find((t) => t.label === headline.label);
    const flat = tier?.amount ?? 0;
    const pct = tier?.turnoverPct && turnoverEur && headline.currency === 'EUR' ? (turnoverEur * tier.turnoverPct) / 100 : 0;
    const comparable = turnoverEur !== undefined && pct > 0;
    const inverts = (isSme && pack?.penalty?.smeInversion === true) || (isSmc && tier?.smcInversion === true);
    const figure =
      headline.amount === Math.round(pct)
        ? `the ${tier?.turnoverPct}% turnover figure`
        : `the ${headline.currency} ${flat.toLocaleString('en-GB')} cap`;
    basis = `${headline.packName}: ${headline.label}. ${
      comparable
        ? inverts
          ? `Article 99(6) caps fines on SMEs and start-ups at the lower of the two figures, so ${figure} applies.`
          : `The higher of ${headline.currency} ${flat.toLocaleString('en-GB')} and ${tier?.turnoverPct}% of turnover applies, so ${figure} is used.`
        : turnoverEur === undefined
          ? 'Worldwide annual turnover was not supplied, so only the flat cap is shown.'
          : 'This regime sets a flat civil penalty rather than a turnover-linked one.'
    }`;
    // The other regimes are carried in `byRegime`, which every renderer lists
    // beside this sentence. Repeating them here said the same thing twice.
    if (headline.multiplier) basis += ` This amount applies ${headline.multiplier}.`;
    if (outOfAiActScope) {
      basis += ` The AI Act is excluded from this figure because ${outOfAiActScope}; the regimes above are unaffected by that.`;
    }
  }

  return {
    maxFine: Math.round(maxFine),
    currency,
    basis,
    citations,
    byRegime,
    // Only obligations that carry a fine drive a fine. A voluntary framework
    // with no penalty provision used to top the list under a €15m headline.
    drivers: failing
      .filter((r) =>
        packs.some((p) => {
          if (!p.penalty) return false;
          const control = p.controls.find((c) => c.id === r.controlId);
          return Boolean(control?.penaltyTier) && pricedAsBreach(r, control);
        }),
      )
      .sort((a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity] || b.weight - a.weight)
      .slice(0, 5)
      .map((r) => ({ controlId: r.controlId, title: r.title, severity: r.severity })),
  };
}
