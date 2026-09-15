import type { EvaluationContext, Evidence } from '../types.js';

/**
 * A file that nothing reaches is not a control.
 *
 * This is the guard against the most dangerous thing a remediation tool can do:
 * write a `human_oversight.py`, watch the next scan turn Article 14 green, and
 * let a team believe a duty is discharged because a file exists. Article 14 asks
 * whether an overseer *can* intervene, not whether a function is defined.
 *
 * A file counts as reached when some other file calls a name it exports, or
 * when it is an entry point — which nothing imports, by definition. An import
 * with no call is deliberately not enough: `import gate  # noqa: F401` is one
 * line of work, and it used to be the whole difference between partial and
 * satisfied.
 *
 * The check is syntactic, so it is generous on purpose: callers cap at
 * `partial` rather than dropping to `missing`, because "we could not see the
 * wiring" is not the same claim as "there is none".
 */

/**
 * Files nothing imports because they are where execution starts.
 *
 * Matched on the **base name only**. A directory clause used to be here, which
 * meant that in a Next.js repository — the demo's own stack — moving a
 * generated compliance module into `src/app/` exempted it from the check
 * entirely. The directory a file sits in says nothing about whether anything
 * calls it.
 */
const ENTRYPOINT = /(^|\/)(index|main|app|server|route|handler|__main__|cli|worker)\.[a-z]+$/i;

const IMPORT_LINE = /^\s*(?:import\s|from\s|const\s+\w+\s*=\s*require\(|export\s+.*\sfrom\s)/m;
const RELATIVE_IMPORT = /(?:from|import|require)\s*\(?\s*['"]\.{1,2}\//;

/**
 * Code a framework calls, which no file in the tree imports.
 *
 * Reachability in a dynamic language is undecidable, and the honest failure
 * mode of a syntactic check is to call a live HTTP handler dead. A route
 * decorator, an exported HTTP method, a URL table or a registered router is
 * the framework saying "I will call this", and that is as good as a call site.
 */
const FRAMEWORK_DISPATCH = [
  /^\s*@(?:\w+\.)*(?:route|get|post|put|patch|delete|app|router|bp|blueprint|api|task|schedule|on|handler|command|listen\w*)\b/im,
  /\bexport\s+(?:async\s+)?function\s+(?:GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS|handler|middleware|loader|action)\b/,
  /\bexport\s+default\s+(?:async\s+)?(?:function|class|\w+)/,
  /\b(?:urlpatterns|module\.exports\s*=\s*router|app\.(?:use|get|post)\s*\(|router\.(?:get|post|put|patch|delete)\s*\()/,
  /\bif\s+__name__\s*==\s*['"]__main__['"]/,
];

/**
 * Does this file participate in the repository at all?
 *
 * A module is dead when nothing reaches it *and* it reaches nothing: no other
 * file calls into it, and it imports no local module of its own. That is what a
 * generated `ai_act/human_oversight.py` looks like the moment after a
 * remediation pull request merges — it imports `os` and is imported by no one.
 * A hand-written decision module that pulls in its own helpers is a different
 * animal even when nothing imports it, because it is plainly part of the tree.
 */
/**
 * Does this file define behaviour, as opposed to data?
 *
 * "Nothing calls this" is only a meaningful complaint about a file that has
 * something to call. A module of constants — `export const PROMPT_VERSION =
 * 'screen-2026-09-02'` — is imported and read, never invoked, and asking
 * whether anything calls it produced a false "dead code" finding against the
 * remediated fixture's own prompt registry.
 */
const DEFINES_BEHAVIOUR =
  /\b(?:export\s+(?:async\s+)?function|export\s+class|^\s*(?:async\s+)?def\s|^\s*class\s|=>\s*\{|function\s*\()/m;

/** Directories whose contents a runner executes rather than another file importing. */
const RUNNER_DIR = /(^|\/)(evals?|tests?|__tests__|spec|e2e|scripts?|bench(marks?)?|migrations?|jobs?|workflows?)\//i;

function participates(ctx: EvaluationContext, path: string): boolean {
  if (RUNNER_DIR.test(path)) return true;
  const file = ctx.snapshot.files.find((f) => f.path === path);
  if (!file) return true;
  if (FRAMEWORK_DISPATCH.some((p) => p.test(file.text))) return true;
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
  /** False only when some file carrying the evidence is demonstrably unreached. */
  wired: boolean;
  /** True when there was code evidence to check at all. */
  checked: boolean;
  /** Where it is called from. Cited alongside the definition. */
  callSites: Evidence[];
  /** Files that define the affordance and that nothing appears to reach. */
  orphans: string[];
  /** Files that are imported somewhere and never called. */
  importedNotCalled: string[];
}

export function wiredIn(ctx: EvaluationContext, evidence: Evidence[]): Wiring {
  const paths = [...new Set(evidence.filter((e) => e.kind === 'code').map((e) => e.path))];
  // No code evidence is not the same fact as unreached code. A documentation
  // control has nothing to wire, and treating that as "not wired" downgraded
  // controls for the wrong reason and printed an empty sentence while doing it.
  if (paths.length === 0) {
    return { wired: true, checked: false, callSites: [], orphans: [], importedNotCalled: [] };
  }

  const callSites: Evidence[] = [];
  const orphans: string[] = [];
  const importedNotCalled: string[] = [];
  for (const path of paths) {
    if (ENTRYPOINT.test(path)) continue; // an entry point is reached by definition
    const file = ctx.snapshot.files.find((f) => f.path === path);
    if (!file) continue;
    if (!DEFINES_BEHAVIOUR.test(file.text)) continue; // data, not a control
    const { calls, imports } = ctx.isReferenced(file);
    if (calls.length) {
      callSites.push(...calls.slice(0, 2));
      continue;
    }
    if (!participates(ctx, path)) {
      if (imports.length) importedNotCalled.push(path);
      else orphans.push(path);
    }
  }

  // Every file must be reached, not merely one of them. A control assembled
  // from two real modules and one orphan is a control with a hole in it, and
  // "one of the three affordances is dead code" is the finding that matters.
  return {
    wired: orphans.length === 0 && importedNotCalled.length === 0,
    checked: true,
    callSites: callSites.slice(0, 4),
    orphans,
    importedNotCalled,
  };
}

/** One clause naming what is not wired, for a control's `gap`. */
export function wiringGap(w: Wiring): string {
  const parts = [
    w.orphans.length ? `nothing in the repository reaches ${w.orphans.slice(0, 3).join(', ')}` : '',
    w.importedNotCalled.length
      ? `${w.importedNotCalled.slice(0, 3).join(', ')} ${w.importedNotCalled.length === 1 ? 'is' : 'are'} imported but never called`
      : '',
  ].filter(Boolean);
  return parts.length ? parts.join('; ') : 'no call site was found for the module that defines it';
}
