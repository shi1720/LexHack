import type {
  Control,
  ControlEvaluation,
  EvaluationContext,
  Evidence,
} from '../types.js';

/**
 * Result builders. Controls read like sentences because of these:
 *
 *   return signals.has('control.human.review')
 *     ? satisfied('A human review gate exists before the decision is applied.', ev)
 *     : missing('No human review step was found.', 'Add an approval gate ...', ['control.human.review']);
 */

export function satisfied(finding: string, evidence: Evidence[] = []): ControlEvaluation {
  return { status: 'satisfied', finding, evidence };
}

export function partial(finding: string, gap: string, evidence: Evidence[] = []): ControlEvaluation {
  return { status: 'partial', finding, gap, evidence };
}

export function missing(finding: string, gap: string, lookedFor: string[] = []): ControlEvaluation {
  return {
    status: 'missing',
    finding,
    gap,
    evidence: lookedFor.length ? [absence(lookedFor)] : [],
  };
}

export function notApplicable(finding: string): ControlEvaluation {
  return { status: 'not_applicable', finding };
}

/** Use when code cannot settle the question and a human must decide. */
export function needsReview(finding: string, gap: string, evidence: Evidence[] = []): ControlEvaluation {
  return { status: 'needs_review', finding, gap, evidence };
}

/**
 * Negative evidence is still evidence. Recording *what we searched for* is what
 * makes a "missing" verdict auditable rather than an assertion.
 */
export function absence(lookedFor: string[]): Evidence {
  return {
    path: '(repository-wide search)',
    line: 0,
    snippet: `No match for: ${lookedFor.join(', ')}`,
    fileSha256: '',
    kind: 'absence',
    note: 'Negative finding: the engine searched the whole snapshot and found no corroborating evidence.',
  };
}

export function evidenceFrom(ctx: EvaluationContext, ...signalIds: string[]): Evidence[] {
  return ctx.signals.evidenceFor(...signalIds).slice(0, 6);
}

export { wiredIn, wiringGap, type Wiring } from '../evaluate/wiring.js';

// ---------------------------------------------------------------------------
// Applicability predicates, composed by the packs
// ---------------------------------------------------------------------------

export const whenHighRisk = (ctx: EvaluationContext): boolean =>
  ctx.classification.tier === 'high' || ctx.classification.tier === 'prohibited';

/**
 * High-risk, **or** an Annex III system whose provider has successfully claimed
 * the Article 6(3) derogation.
 *
 * Article 49(2) is the obligation that survives a successful claim: a provider
 * who concludes a system is not high-risk still has to register it. Hanging
 * that control off `whenHighRisk` meant the derogation switched off the one
 * duty it does not switch off — while the control's own gap text said so.
 */
export const whenHighRiskOrDerogated = (ctx: EvaluationContext): boolean =>
  whenHighRisk(ctx) || ctx.classification.article6_3?.available === true;

export const whenAiPresent = (ctx: EvaluationContext): boolean =>
  ctx.classification.tier !== 'unknown';

export const whenProvider = (ctx: EvaluationContext): boolean =>
  ctx.classification.role === 'provider' || ctx.classification.role === 'provider+deployer';

/**
 * Article 50 splits by role — 50(1) and 50(2) bind providers, 50(3) and 50(4)
 * bind deployers — and the pack has to split with it.
 *
 * `unknown` counts as a deployer here on purpose. The cost of asking a
 * provider about a duty that turns out to be its customer's is a paragraph to
 * read; the cost of silently switching off a duty that is in force today is a
 * fine. Where the role is positively inferred as provider-only, the duty is
 * genuinely somebody else's and the control says so.
 */
export const whenDeployer = (ctx: EvaluationContext): boolean =>
  ctx.classification.role === 'deployer' ||
  ctx.classification.role === 'provider+deployer' ||
  ctx.classification.role === 'unknown';

export const always = (): boolean => true;

export function allOf(...predicates: ((ctx: EvaluationContext) => boolean)[]) {
  return (ctx: EvaluationContext): boolean => predicates.every((p) => p(ctx));
}

export function anyOf(...predicates: ((ctx: EvaluationContext) => boolean)[]) {
  return (ctx: EvaluationContext): boolean => predicates.some((p) => p(ctx));
}

export function whenSignal(...ids: string[]) {
  return (ctx: EvaluationContext): boolean => ctx.signals.hasAny(...ids);
}

export function whenFinding(...findingIds: string[]) {
  return (ctx: EvaluationContext): boolean =>
    ctx.classification.findings.some((f) => findingIds.includes(f.id));
}

// ---------------------------------------------------------------------------
// Control factory
// ---------------------------------------------------------------------------

export type ControlSpec = Omit<Control, 'pack'>;

export function pack(packId: string) {
  return (spec: ControlSpec): Control => ({ ...spec, pack: packId });
}
