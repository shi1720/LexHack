import type {
  Control,
  ControlResult,
  EvaluationContext,
  RemediationFile,
  RemediationPlan,
  RulePack,
} from '../types.js';
import { createContext, evaluatePacks, scoreControls } from '../evaluate/index.js';
import { buildSnapshot } from '../ingest/snapshot.js';
import { classify } from '../classify/index.js';
import { createSignalIndex, extractSignals } from '../signals/index.js';

export interface RemediationOptions {
  /** Only remediate these control ids. Defaults to every failing control with a fix. */
  only?: string[];
  branchPrefix?: string;
}

/**
 * Build the pull request that closes the gaps.
 *
 * The plan is deliberately additive: every generated file is `createOnly`, so
 * running this can never overwrite something a human wrote. A remediation that
 * clobbers your code is a remediation nobody merges.
 */
export function planRemediation(
  packs: RulePack[],
  results: ControlResult[],
  ctx: EvaluationContext,
  opts: RemediationOptions = {},
): RemediationPlan | undefined {
  const controlsById = new Map<string, Control>();
  for (const p of packs) for (const control of p.controls) controlsById.set(control.id, control);

  const targets = results.filter(
    (r) =>
      (r.status === 'missing' || r.status === 'partial') &&
      controlsById.get(r.controlId)?.remediation &&
      (!opts.only || opts.only.includes(r.controlId)),
  );

  if (targets.length === 0) return undefined;

  const files: (RemediationFile & { controlId: string })[] = [];
  const existingPaths = new Set(ctx.snapshot.files.map((f) => f.path));
  const closes: string[] = [];
  const sections: string[] = [];

  for (const target of targets) {
    const control = controlsById.get(target.controlId);
    const remediation = control?.remediation;
    if (!control || !remediation) continue;

    let produced: RemediationFile[] = [];
    try {
      produced = remediation.files(ctx);
    } catch {
      continue;
    }

    const fresh = produced.filter((f) => !(f.createOnly && existingPaths.has(f.path)));
    if (fresh.length === 0) continue;

    for (const file of fresh) {
      files.push({ ...file, controlId: target.controlId });
      existingPaths.add(file.path);
    }
    closes.push(target.controlId);

    const citation = control.citations[0];
    sections.push(
      [
        `### ${control.title}`,
        '',
        `**Obligation** — ${citation ? `${citation.short} ${citation.locator}` : 'see citations'}: ${control.obligation}`,
        '',
        `**What the scan found** — ${target.finding}`,
        '',
        `**What this PR adds** — ${remediation.summary}`,
        '',
        fresh.map((f) => `- \`${f.path}\` — ${f.description}`).join('\n'),
        '',
        `> **Reviewer:** ${remediation.reviewerNote}`,
        '',
      ].join('\n'),
    );
  }

  if (files.length === 0) return undefined;

  // The projected score is *measured*, not assumed.
  //
  // It used to mark every closed control `partial` and add it up, which was
  // wrong in both directions: a generated document with a date and no unfilled
  // placeholder comes back satisfied, and a generated module nothing calls
  // stays partial. Predicting 3 → 17 and then delivering 25 makes the number
  // decorative — and this is the number the pull request puts in front of a
  // reviewer, so it has to be the one the next scan produces. Re-running the
  // engine over the tree as it would be after the merge costs tens of
  // milliseconds and cannot drift.
  const scoreBefore = scoreControls(results);
  const scoreAfter = projectedScore(ctx, packs, files);
  const stamp = new Date().toISOString().slice(0, 10);

  return {
    branchName: `${opts.branchPrefix ?? 'annex'}/conformity-${stamp}-${ctx.snapshot.id.slice(0, 7)}`,
    title: `Close ${closes.length} AI Act conformity gap${closes.length === 1 ? '' : 's'}`,
    body: buildBody({ ctx, sections, closes, scoreBefore, scoreAfter, fileCount: files.length }),
    files,
    closes,
    scoreBefore,
    scoreAfter,
  };
}

function buildBody(input: {
  ctx: EvaluationContext;
  sections: string[];
  closes: string[];
  scoreBefore: number;
  scoreAfter: number;
  fileCount: number;
}): string {
  const { ctx, sections, closes, scoreBefore, scoreAfter, fileCount } = input;
  const cls = ctx.classification;

  return `## What this is

Annex scanned \`${ctx.snapshot.name}\` at \`${(ctx.snapshot.commit ?? ctx.snapshot.id).slice(0, 12)}\` and found ${closes.length} obligation${closes.length === 1 ? '' : 's'} with no supporting evidence anywhere in the codebase. This PR adds ${fileCount} file${fileCount === 1 ? '' : 's'} that close them.

**Classification:** ${cls.summary}
**Role under Articles 3(3) and 3(4):** ${cls.role.replace('+', ' and ')}
**Projected conformity score:** ${scoreBefore} → ${scoreAfter}

Every file here is additive and created only when absent. Nothing you wrote is modified.

---

${sections.join('\n')}

---

## Before you merge

These files are scaffolding backed by statute, not finished compliance. The generated documents carry \`_TODO_\` markers at exactly the points where the answer is a judgement your organisation has to make — the residual-risk acceptance, the declared accuracy level, the named accountable person. Annex leaves them blank on purpose: a generated document that invents those answers is worse than no document, because it is a false statement to a regulator. The generated modules are complete code, and inert: nothing calls them until you do.

**Merging this PR will not make you compliant, and Annex will not pretend it did.** The next scan reads these files exactly as an auditor would. A document whose \`_TODO_\` markers are unfilled counts as *partial*, never satisfied; an oversight or logging module that no code path reaches counts as *partial*, never satisfied. The projected score above already assumes that. Closing the gap is the work below, not the merge.

- [ ] Wire the generated modules into the real call paths (they are inert until you do)
- [ ] Replace every \`_TODO_\` or record why it does not apply
- [ ] Re-scan: the controls should move from *partial* to *satisfied*, and if they do not, the finding will say which file is still a scaffold

<sub>Generated by [Annex](https://github.com/shi1720/LexHack) — conformity evidence compiled from source code.</sub>`;
}

/**
 * Score the tree as it would be after the pull request merges, by building
 * that tree and scanning it. No shortcut: the same detectors, the same
 * controls, the same invariants that cap a scaffold or an unreached module.
 */
function projectedScore(
  ctx: EvaluationContext,
  packs: RulePack[],
  files: (RemediationFile & { controlId: string })[],
): number {
  const existing = ctx.snapshot.files
    .filter((f) => !f.skipped)
    .map((f) => ({ path: f.path, bytes: f.text }));
  const merged = buildSnapshot({
    name: ctx.snapshot.name,
    files: [...existing, ...files.map((f) => ({ path: f.path, bytes: f.contents }))],
  });

  const signals = createSignalIndex(extractSignals(merged));
  const profile = ctx.profile;
  const after = createContext({
    snapshot: merged,
    signals,
    classification: classify(signals, profile),
    profile,
  });
  return scoreControls(evaluatePacks(packs, after, {}));
}

/** Render the plan as a unified diff so it can be applied with `git apply`. */
export function renderPatch(plan: RemediationPlan): string {
  const chunks: string[] = [];
  for (const file of plan.files) {
    const lines = file.contents.split('\n');
    if (lines.at(-1) === '') lines.pop();
    chunks.push(
      `diff --git a/${file.path} b/${file.path}`,
      'new file mode 100644',
      'index 0000000..0000000',
      '--- /dev/null',
      `+++ b/${file.path}`,
      `@@ -0,0 +1,${lines.length} @@`,
      ...lines.map((l) => `+${l}`),
    );
  }
  return chunks.join('\n') + '\n';
}
