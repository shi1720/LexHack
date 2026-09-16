/**
 * Every way found so far of making Annex say yes without doing the work.
 *
 * A second hostile audit took the engine apart and produced ten findings. Each
 * one is reproduced below with the attack that found it, so a future change
 * that re-opens one fails here rather than in somebody's dossier. They fall
 * into three families:
 *
 *  - **Making a duty look discharged** — prose, a comment, a docstring, a
 *    scaffold with the placeholders renamed, a call site written in a comment.
 *  - **Making a regulated system invisible** — a character that opens a
 *    comment the lexer never closes, a file padded past the size limit, a
 *    symlink out of the tree.
 *  - **Making a report say something the results do not** — an exposure or a
 *    tier edited after the fact.
 *
 * The pattern in the first two families is the same, and it is worth naming:
 * an invariant stated in `evaluateControl` is only as good as the regex that
 * decides whether it fires, and an attacker picks the complement of the regex.
 * Where a structural answer exists — a marker Annex itself writes, "was there
 * any code evidence at all", `realpath` containment — it is preferred here
 * over another pattern.
 */
import { describe, expect, it } from 'vitest';
import { buildSnapshot } from '../src/ingest/snapshot.js';
import { commentLines } from '../src/signals/define.js';
import { deniesTheDuty } from '../src/evaluate/denial.js';
import { BASE_APP, scanFiles, statusOf } from './helpers.js';

/** A hiring product: unambiguously Annex III point 4(a). */
const SCREENER: Record<string, string> = {
  ...BASE_APP,
  'src/screen.ts': [
    "import { complete } from './model';",
    "export async function screenCandidate(applicant: { cv: string }): Promise<'advance' | 'reject'> {",
    '  const completion = await complete(applicant.cv);',
    '  const candidateScore = Number(completion.choices[0]?.message?.content ?? 0);',
    "  return candidateScore >= 0.72 ? 'advance' : 'reject';",
    '}',
  ].join('\n'),
};

/** Emotion inference in a recruitment context — Article 5(1)(f). */
const AFFECT = [
  "import { complete } from './model';",
  "export const EMOTION_LABELS = ['engaged', 'hesitant', 'anxious'];",
  'export async function detectEmotion(frames: string[], transcript: string) {',
  '  return complete(`rate the candidate affect: ${transcript}`);',
  '}',
].join('\n');

describe('a duty about running code needs running code', () => {
  /**
   * The cheapest attack of all, and it was open while the harder version of it
   * was closed. The comment guard only fires on a control that cited *some*
   * code; cite none and neither it nor the wiring check runs.
   */
  it('does not let a markdown file discharge Article 14', () => {
    const report = scanFiles({
      ...SCREENER,
      'docs/oversight.md': [
        '# Human oversight',
        '',
        'Every adverse screening outcome is queued for manual review by a reviewer',
        'before it takes effect. A reviewer can override or reverse the decision.',
        'The AI_ENABLED feature flag is our kill switch and halts the system.',
      ].join('\n'),
    });
    expect(statusOf(report, 'eu-ai-act.art14.human-oversight')).not.toBe('satisfied');
  });

  it('says which document it read, so the finding is arguable', () => {
    const report = scanFiles({
      ...SCREENER,
      'docs/oversight.md': 'A reviewer can override or reverse the model decision, and the AI_ENABLED kill switch halts the system. Every adverse outcome goes to manual review.',
    });
    const control = report.controls.find((c) => c.controlId === 'eu-ai-act.art14.human-oversight');
    expect(control?.finding).toMatch(/documentation/i);
    expect(control?.finding).toContain('docs/oversight.md');
  });
});

describe('prose is not an implementation', () => {
  /**
   * `POLICY = """…"""` — the docstring opener was only recognised at the start
   * of a line, so an assigned docstring's interior was read as code. Three
   * sentences of English plus `def main()` satisfied Article 14.
   */
  it('reads an assigned Python docstring as prose', () => {
    const lines = [
      'POLICY = """',
      'Human review: every adverse outcome is queued for manual review.',
      'Override: a reviewer can override the model decision.',
      '"""',
      'def main():',
      '    return POLICY',
    ];
    const prose = commentLines(lines);
    expect(prose.has(1)).toBe(true);
    expect(prose.has(2)).toBe(true);
    expect(prose.has(5)).toBe(false);
  });

  it('reads a JSX comment as prose', () => {
    const lines = ['{/* A reviewer can override the decision.', '   The kill switch halts the system. */}', 'render();'];
    const prose = commentLines(lines);
    expect(prose.has(0)).toBe(true);
    expect(prose.has(1)).toBe(true);
    expect(prose.has(2)).toBe(false);
  });

  it('keeps a trailing comment from swallowing the code beside it', () => {
    expect(commentLines(['foo(); /* why */', 'bar();']).size).toBe(0);
  });
});

describe('a call site in a comment is not a call site', () => {
  /**
   * `isReferenced` excluded import lines and not comment lines, so two lines
   * of "we should call gate() one day" made an entirely unreached module read
   * as wired — and the gap sentence naming it disappeared.
   */
  it('does not accept a commented-out call as wiring', () => {
    const files = {
      ...SCREENER,
      'src/oversight.ts': [
        'export function reviewGate(outcome: string) {',
        '  if (outcome === "reject") return queueForHumanReview(outcome);',
        '  return outcome;',
        '}',
        'export function queueForHumanReview(outcome: string) { return outcome; }',
        'export function overrideDecision(id: string) { return id; }',
        'export function haltSystem() { return false; }',
      ].join('\n'),
    };
    const wired = scanFiles(files);
    const commented = scanFiles({
      ...files,
      'src/screen.ts': `${files['src/screen.ts']}\n// Follow-up: we should call reviewGate(outcome) from screenCandidate one day.\n`,
    });
    // The comment must not improve anything.
    expect(commented.score).toBe(wired.score);
  });
});

describe('a scaffold is not a control', () => {
  /**
   * The placeholder regex was case-sensitive, so `sed -i 's/TODO/todo/g'` over
   * Annex's own generated scaffolds flipped five controls to satisfied. Every
   * other spelling walked past it too. A guard against Annex's own output has
   * no business guessing at Annex's own output, so `annex fix` now writes a
   * marker and the cap keys on that.
   */
  const scaffolded = (placeholder: string) => ({
    ...SCREENER,
    'docs/ai-act/bias-examination.md': [
      '# Examination for bias',
      '',
      `> **Status:** DRAFT — accountable person: ${placeholder}`,
      '',
      'Article 10(2)(f) requires examination in view of possible biases. The',
      'training data was examined for bias across the protected attributes.',
      `Residual risk acceptance: ${placeholder}`,
    ].join('\n'),
  });

  for (const spelling of ['_TODO_', 'TODO', 'todo', 'TBD', 'tbd', '_PENDING_', 'FIXME', '«fill»', '<NAME HERE>']) {
    it(`caps on the placeholder spelled ${spelling}`, () => {
      const report = scanFiles(scaffolded(spelling));
      expect(statusOf(report, 'eu-ai-act.art10.bias-examination')).not.toBe('satisfied');
    });
  }

  it('caps on the marker alone, whatever the placeholders are called', () => {
    const report = scanFiles({
      ...SCREENER,
      'docs/ai-act/bias-examination.md': [
        '# Examination for bias',
        '',
        '<!-- annex:unfilled — remove when every judgement has been supplied. -->',
        '',
        'The training data was examined for bias across the protected attributes',
        'and the examination is documented. Accountable person: Dana Okafor.',
      ].join('\n'),
    });
    expect(statusOf(report, 'eu-ai-act.art10.bias-examination')).not.toBe('satisfied');
  });
});

describe('a document that says no is not a yes', () => {
  // Four phrasings walked past the section-scoped guard. Each is a shape that
  // real conformity documentation uses, not a sentence somebody contrived.
  for (const [name, text] of [
    ['a denial under a later heading', '# Bias audit\n\nAn independent bias audit was conducted on 2026-06-01.\n\n## Notes\n\nWe have never commissioned a bias audit.'],
    ['a status table whose cell reads None', '| Item | Status | Date |\n| --- | --- | --- |\n| Independent bias audit | None | 2026-06-01 |'],
    ['a two-word answer', 'Has a bias audit been commissioned? Not yet.'],
    ['"there is none"', 'The audit was scoped last quarter. There is none.'],
  ] as const) {
    it(`reads ${name} as a denial`, () => {
      expect(deniesTheDuty(text)).toBe(true);
    });
  }

  // The other half of the job, and the harder one. Conformity documentation is
  // full of negation and a guard that fires on all of it is unusable.
  for (const [name, text] of [
    ['a bounded commitment', 'Serious incidents are reported not later than 2 days after the provider becomes aware of them.'],
    ['a scope limit', 'The model is not validated for languages other than English.'],
    ['a disclaimer about the output', 'The score is a prioritisation signal, not a verdict, and never a final rejection.'],
    ['an ordinary subordinate clause', 'We would rather answer the request than have the authority ask us why we did not.'],
    ['a plain statement of fact', 'An independent bias audit was conducted on 2026-06-01 and the summary of results is published.'],
  ] as const) {
    it(`leaves ${name} alone`, () => {
      expect(deniesTheDuty(text)).toBe(false);
    });
  }
});

describe('one character must not erase a file', () => {
  /**
   * A `/*` that the lexer reads as a block comment opener turns every line
   * below it into prose. Blanking quoted strings closed two spellings and left
   * three: a regex literal, a regex literal containing the HTML opener, and
   * the interior of a multi-line template literal.
   */
  const poisoned = (opener: string) =>
    scanFiles({ ...BASE_APP, 'src/screen.ts': `${opener}\n${AFFECT}\n${SCREENER['src/screen.ts']}` });

  const clean = poisoned('');

  for (const opener of [
    "export const GLOB = '/*';",
    'export const SEP = /[/*]/;',
    'export const H = /<!--/;',
    'export const T = `first line\n/* second line`;',
    'export const D = "<!--";',
  ]) {
    it(`survives ${JSON.stringify(opener.slice(0, 34))}`, () => {
      const report = poisoned(opener);
      expect(report.classification.tier).toBe(clean.classification.tier);
      expect(report.exposure.maxFine).toBe(clean.exposure.maxFine);
    });
  }

  it('still finds the prohibited practice with none of them', () => {
    expect(clean.classification.tier).toBe('prohibited');
  });
});

describe('a file too large to read is recorded, not dropped', () => {
  /**
   * The walker dropped a file past the hard limit before the snapshot existed,
   * so it was absent from `oversizePaths`, produced no warning and did not
   * move the tree digest. Two megabytes of padding on one file took a
   * repository from PROHIBITED at €35,000,000 to MINIMAL at €0, and
   * `verify --against` called the tree unchanged.
   *
   * `buildSnapshot` is the unit under test here; the walker hands it
   * `declaredBytes` and the CLI refuses `--fail-under` over the result.
   */
  it('marks an oversize file as skipped and names it', () => {
    const snapshot = buildSnapshot({
      name: 'padded',
      files: [
        { path: 'src/screen.ts', bytes: new Uint8Array(0), declaredBytes: 2_600_000 },
        { path: 'package.json', bytes: '{"name":"padded"}' },
      ],
    });
    expect(snapshot.oversizePaths).toContain('src/screen.ts');
    expect(snapshot.files.find((f) => f.path === 'src/screen.ts')?.skipped).toBe('too-large');
  });

  it('moves the tree digest when the padding grows', () => {
    const at = (size: number) =>
      buildSnapshot({
        name: 'padded',
        files: [{ path: 'src/screen.ts', bytes: new Uint8Array(0), declaredBytes: size }],
      }).id;
    expect(at(2_600_000)).not.toBe(at(2_600_001));
  });
});

describe('the excluded set travels with the report', () => {
  it('names the paths .annexignore removed', () => {
    const snapshot = buildSnapshot({
      name: 'ignored',
      files: [
        // Not `vendor/` or `dist/`: those never reach `.annexignore`, because
        // the ingest skips them by name first.
        { path: '.annexignore', bytes: 'generated/\n' },
        { path: 'generated/thing.ts', bytes: 'export const x = 1;' },
        { path: 'src/app.ts', bytes: 'export const y = 2;' },
      ],
    });
    expect(snapshot.ignoredCount).toBe(1);
    expect(snapshot.ignoredPaths).toEqual(['generated/thing.ts']);
  });
});
