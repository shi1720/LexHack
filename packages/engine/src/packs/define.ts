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

/**
 * A file that nothing reaches is not a control.
 *
 * This is the guard against the most dangerous thing a remediation tool can
 * do: write a `human_oversight.py`, watch the next scan turn Article 14 green,
 * and let a team believe a duty is discharged because a file exists. Article 14
 * asks whether an overseer *can* intervene, not whether a function is defined.
 *
 * A file counts as reached when some other file imports it or calls a name it
 * exports, or when it is an entry point — which nothing imports by definition.
 * The check is syntactic, so it is generous on purpose: callers downgrade to
 * `partial` rather than `missing`, because "we could not see the wiring" is not
 * the same claim as "there is none".
 */
const ENTRYPOINT = /(^|\/)(index|main|app|server|route|handler|__main__|cli|worker|api)\.[a-z]+$|(^|\/)(pages|app)\//i;
const IMPORT_LINE = /^\s*(?:import\s|from\s|const\s+\w+\s*=\s*require\(|export\s+.*\sfrom\s)/m;
const RELATIVE_IMPORT = /(?:from|import|require)\s*\(?\s*['"]\.{1,2}\//;

/**
 * Does this file participate in the repository at all?
 *
 * A module is dead when nothing reaches it *and* it reaches nothing: no other
 * file imports it, and it imports no local module of its own. That is what a
 * generated `ai_act/human_oversight.py` looks like the moment after a
 * remediation pull request merges — it imports `os` and is imported by no one.
 * A hand-written decision module that pulls in its own helpers is a different
 * animal even when nothing imports it, because it is plainly part of the tree.
 */
function participates(ctx: EvaluationContext, path: string): boolean {
  const file = ctx.snapshot.files.find((f) => f.path === path);
  if (!file) return true;
  if (RELATIVE_IMPORT.test(file.text)) return true;
  const stems = new Set(
    ctx.snapshot.files
      .filter((f) => f.path !== path && f.text && !f.skipped)
      .map((f) => (f.path.split('/').pop() ?? '').replace(/\.[^.]+$/, ''))
      .filter((stem) => stem.length > 3),
  );
  for (const line of file.text.split('\n')) {
    if (!IMPORT_LINE.test(line)) continue;
    for (const stem of stems) if (line.includes(stem)) return true;
  }
  return false;
}

export interface Wiring {
  /** True when every file carrying the evidence is actually reached. */
  wired: boolean;
  /** Where it is called from. Cited alongside the definition. */
  callSites: Evidence[];
  /** Files that define the affordance but that nothing appears to reach. */
  orphans: string[];
  /** Files that are imported somewhere and never called. */
  importedNotCalled: string[];
}

export function wiredIn(ctx: EvaluationContext, evidence: Evidence[]): Wiring {
  const paths = [...new Set(evidence.filter((e) => e.kind === 'code').map((e) => e.path))];
  if (paths.length === 0) return { wired: false, callSites: [], orphans: [], importedNotCalled: [] };

  const callSites: Evidence[] = [];
  const orphans: string[] = [];
  const importedNotCalled: string[] = [];
  for (const path of paths) {
    if (ENTRYPOINT.test(path)) continue; // an entry point is reached by definition
    const file = ctx.snapshot.files.find((f) => f.path === path);
    if (!file) continue;
    const { calls, imports } = ctx.isReferenced(file);
    if (calls.length) {
      callSites.push(...calls.slice(0, 2));
      continue;
    }
    // An import with no call is one line of work and used to be enough. It is
    // now its own finding: the module is on the page, nothing invokes it.
    if (imports.length) {
      importedNotCalled.push(path);
      continue;
    }
    if (!participates(ctx, path)) orphans.push(path);
  }
  // Every file must be reached, not merely one of them. A control assembled
  // from two real modules and one orphan is a control with a hole in it, and
  // "one of the three affordances is dead code" is the finding that matters.
  return {
    wired: orphans.length === 0 && importedNotCalled.length === 0,
    callSites: callSites.slice(0, 4),
    orphans,
    importedNotCalled,
  };
}

/** One sentence naming what is not wired, for a control's `gap`. */
export function wiringGap(w: Wiring): string {
  const parts = [
    w.orphans.length ? `nothing in the repository reaches ${w.orphans.slice(0, 3).join(', ')}` : '',
    w.importedNotCalled.length
      ? `${w.importedNotCalled.slice(0, 3).join(', ')} ${w.importedNotCalled.length === 1 ? 'is' : 'are'} imported but never called`
      : '',
  ].filter(Boolean);
  return parts.join('; ');
}

// ---------------------------------------------------------------------------
// Applicability predicates, composed by the packs
// ---------------------------------------------------------------------------

export const whenHighRisk = (ctx: EvaluationContext): boolean =>
  ctx.classification.tier === 'high' || ctx.classification.tier === 'prohibited';

export const whenAiPresent = (ctx: EvaluationContext): boolean =>
  ctx.classification.tier !== 'unknown';

export const whenProvider = (ctx: EvaluationContext): boolean =>
  ctx.classification.role === 'provider' || ctx.classification.role === 'provider+deployer';

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
