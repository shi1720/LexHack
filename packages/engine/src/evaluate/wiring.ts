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
 * when it is an entry point ; which nothing imports, by definition. An import
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
 * meant that in a Next.js repository ; the demo's own stack ; moving a
 * generated compliance module into `src/app/` exempted it from the check
 * entirely. The directory a file sits in says nothing about whether anything
 * calls it.
 */
const ENTRYPOINT = /(^|\/)(index|main|app|server|route|handler|__main__|cli|worker)\.[a-z]+$/i;

const IMPORT_LINE = /^\s*(?:import\s|from\s|const\s+\w+\s*=\s*require\(|export\s+.*\sfrom\s)/m;
const RELATIVE_IMPORT = /(?:from|import|require)\s*\(?\s*['"](\.{1,2}\/[^'"]*)['"]/g;

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
  // Narrowed from a bare `export default`. Any module at all can have one, so
  // the broad form was an escape hatch: a generated oversight module with a
  // default export was read as framework-dispatched and skipped the wiring
  // check entirely. A default export is evidence of dispatch when the file
  // sits where a framework looks for one ; a route, a page, a handler, a
  // worker, a serverless function.
  /\bexport\s+default\s+(?:async\s+)?(?:function|class|\w+)/,
  /\b(?:urlpatterns|module\.exports\s*=\s*router|app\.(?:use|get|post)\s*\(|router\.(?:get|post|put|patch|delete)\s*\()/,
  /\bif\s+__name__\s*==\s*['"]__main__['"]/,
];

/** Index of the `export default` pattern in FRAMEWORK_DISPATCH. */
const DEFAULT_EXPORT_PATTERN = 2;

/**
 * Does this file participate in the repository at all?
 *
 * A module is dead when nothing reaches it *and* it reaches nothing: no other
 * file calls into it, and it imports no local module of its own. That is what a
 * generated `ai_act/human_oversight.py` looks like the moment after a
 * remediation pull request merges ; it imports `os` and is imported by no one.
 * A hand-written decision module that pulls in its own helpers is a different
 * animal even when nothing imports it, because it is plainly part of the tree.
 */
/**
 * Does this file define behaviour, as opposed to data?
 *
 * "Nothing calls this" is only a meaningful complaint about a file that has
 * something to call. A module of constants ; `export const PROMPT_VERSION =
 * 'screen-2026-09-02'` ; is imported and read, never invoked, and asking
 * whether anything calls it produced a false "dead code" finding against the
 * remediated fixture's own prompt registry.
 */
const DEFINES_BEHAVIOUR =
  /\b(?:export\s+(?:async\s+)?function|export\s+class|^\s*(?:async\s+)?def\s|^\s*class\s|=>\s*\{|function\s*\()/m;

/** Directories whose contents a runner executes rather than another file importing. */
/** Where a framework goes looking for a default export. */
const DISPATCH_PATH =
  /(^|\/)(pages|app|routes?|api|handlers?|functions?|workers?|middleware|server|netlify|lambda)(\/|\.)|\.(page|route|handler|worker|api)\.[a-z]+$/i;

// `scripts/` came off this list. An eval harness or a migration is run by
// something outside the tree, which is the whole reason for the exemption; a
// `scripts/` directory is where people also put modules they simply never
// wired up, and putting the oversight gate there bought a pass for free.
/**
 * Does this module do anything when it is loaded?
 *
 * A top-level call, a server starting, a CLI guard, a framework default
 * export. Not `export function foo() {}` repeated three times.
 */
const RUNS_AT_IMPORT =
  /^(?:await\s+)?[\w.$]+\s*\(|^\s*(?:app|server|router|bot|client|cli|program)\.\w+\s*\(|\b(?:listen|createServer|serve|bootstrap|render|mount|main)\s*\(\s*\)?|^\s*if\s+__name__\s*==|^\s*export\s+default\s/m;

const RUNNER_DIR = /(^|\/)(evals?|tests?|__tests__|e2e|bench(marks?)?|migrations?|jobs?|workflows?)\//i;

/** Does this file import something that is actually in the tree? */
function resolvesLocally(ctx: EvaluationContext, from: string, text: string): boolean {
  const dir = from.split('/').slice(0, -1);
  RELATIVE_IMPORT.lastIndex = 0;
  for (const match of text.matchAll(RELATIVE_IMPORT)) {
    const spec = match[1];
    if (!spec) continue;
    const segments = [...dir];
    for (const part of spec.split('/')) {
      if (part === '.' || part === '') continue;
      if (part === '..') segments.pop();
      else segments.push(part);
    }
    const target = segments.join('/').replace(/\.[cm]?[jt]sx?$/, '');
    if (
      ctx.snapshot.files.some(
        (f) => f.path === target || f.path.replace(/\.[^./]+$/, '') === target || f.path.startsWith(`${target}/`),
      )
    ) {
      return true;
    }
  }
  return false;
}

function participates(ctx: EvaluationContext, path: string): boolean {
  if (RUNNER_DIR.test(path)) return true;
  const file = ctx.snapshot.files.find((f) => f.path === path);
  if (!file) return true;
  // The default-export pattern is the last one in the list and only counts
  // where the file sits somewhere a framework dispatches from; every other
  // pattern is self-evidencing wherever it appears.
  const dispatch = FRAMEWORK_DISPATCH.some((pattern, i) =>
    i === DEFAULT_EXPORT_PATTERN ? DISPATCH_PATH.test(path) && pattern.test(file.text) : pattern.test(file.text),
  );
  if (dispatch) return true;
  // An import has to go somewhere. Accepting the *presence* of a relative
  // import meant `import "./does-not-exist.js";` as line one bought a module
  // its way past the wiring check ; weaker than the dead `import gate` this
  // guard was written to reject, because the target need not exist.
  if (resolvesLocally(ctx, path, file.text)) return true;
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
    const file = ctx.snapshot.files.find((f) => f.path === path);
    if (!file) continue;
    // A file that defines no behaviour cannot be the thing that runs, so it
    // is *disqualifying* rather than exempt. This was `continue`, which meant
    // a file with no code in it dropped out of the orphan list and the
    // control came back wired.
    if (!DEFINES_BEHAVIOUR.test(file.text)) {
      orphans.push(path);
      continue;
    }
    // An entry point is reached by definition ; but only an entry point that
    // actually is one. Matching the name alone meant renaming `oversight.ts`
    // to `worker.ts` skipped the check outright, and a rename is not an
    // implementation. A module that runs does something when it is loaded;
    // one that only exports functions is a library with a suggestive name.
    if (ENTRYPOINT.test(path) && RUNS_AT_IMPORT.test(file.text)) continue;
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
