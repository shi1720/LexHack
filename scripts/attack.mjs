/**
 * Try to make Annex say yes without doing the work.
 *
 * "Nothing goes green because a file exists" is the load-bearing claim of this
 * project and, written down, it is indistinguishable from marketing. So this
 * runs the attacks instead: five ways to fake a discharged Article 14 duty,
 * each one a single edit to a real repository, each one scanned and reported.
 * Four are refused with the reason; the fifth is a genuine implementation and
 * goes green.
 *
 * It takes about twenty seconds and it writes only into a temporary copy.
 *
 *   npm run build && npm run attack
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync, appendFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join, dirname } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const CLI = join(ROOT, 'packages/cli/dist/bin.js');
const CONTROL = 'eu-ai-act.art14.human-oversight';

const c = process.stdout.isTTY
  ? {
      bold: (s) => `[1m${s}[0m`,
      grey: (s) => `[90m${s}[0m`,
      red: (s) => `[31m${s}[0m`,
      green: (s) => `[32m${s}[0m`,
      amber: (s) => `[33m${s}[0m`,
    }
  : { bold: (s) => s, grey: (s) => s, red: (s) => s, green: (s) => s, amber: (s) => s };

/** Wrap prose to a column, for a terminal rather than a browser. */
function wrap(text, width, indent) {
  const words = text.split(/\s+/);
  const lines = [];
  let line = '';
  for (const word of words) {
    if ((line + ' ' + word).trim().length > width) {
      lines.push(indent + line.trim());
      line = '';
    }
    line += ' ' + word;
  }
  if (line.trim()) lines.push(indent + line.trim());
  return lines.join('\n');
}

const dir = mkdtempSync(join(tmpdir(), 'annex-attack-'));
process.on('exit', () => rmSync(dir, { recursive: true, force: true }));

function write(path, body) {
  const full = join(dir, path);
  try {
    execFileSync('mkdir', ['-p', dirname(full)]);
  } catch {
    /* the directory already exists */
  }
  writeFileSync(full, body);
}

// A purpose-made tree rather than a copy of a fixture.
//
// The bundled fixtures are deliberately realistic, which means their oversight
// affordances are spread across a screening module, a React review queue and a
// test — so removing "the oversight file" removes one of four, and the control
// never had a clean starting point to move from. This repository is the
// smallest thing that is unambiguously Annex III point 4(a) and has no human
// oversight at all.
const BASE = {
  'package.json': JSON.stringify({ name: 'screenco', dependencies: { openai: '^4.0.0' } }, null, 2),
  'src/model.ts': [
    "import OpenAI from 'openai';",
    'const client = new OpenAI();',
    "export const MODEL = 'gpt-4o';",
    'export async function complete(prompt: string) {',
    "  return client.chat.completions.create({ model: MODEL, messages: [{ role: 'user', content: prompt }] });",
    '}',
  ].join('\n'),
  'src/screening/rank.ts': [
    "import { complete } from '../model';",
    '',
    "export async function screenCandidate(applicant: { id: string; cv: string }): Promise<'advance' | 'reject'> {",
    '  const completion = await complete(applicant.cv);',
    '  const candidateScore = Number(completion.choices[0]?.message?.content ?? 0);',
    "  return candidateScore >= 0.72 ? 'advance' : 'reject';",
    '}',
  ].join('\n'),
};

for (const [path, body] of Object.entries(BASE)) write(path, body);

/** Scan the working copy and return this one control's result. */
function statusOfArt14() {
  const out = execFileSync(
    process.execPath,
    [CLI, 'scan', dir, '--markets', 'eu', '--quiet', '--format', 'json'],
    { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
  );
  const report = JSON.parse(out);
  const control = report.controls.find((x) => x.controlId === CONTROL);
  return { status: control?.status ?? 'absent', finding: control?.finding ?? '', gap: control?.gap ?? '' };
}

const OVERSIGHT_BODY = [
  'export interface Outcome { candidateId: string; decision: string }',
  '',
  'export function queueForHumanReview(outcome: Outcome): Outcome {',
  '  reviewQueue.push(outcome);',
  '  return outcome;',
  '}',
  '',
  'export function overrideDecision(candidateId: string, decision: string): Outcome {',
  '  return { candidateId, decision };',
  '}',
  '',
  'export function haltSystem(): boolean {',
  "  return process.env.AI_ENABLED !== 'true';",
  '}',
  '',
  'const reviewQueue: Outcome[] = [];',
].join('\n');

const ATTACKS = [
  {
    name: 'Write a policy document',
    detail:
      'Five lines of markdown describing a review queue, an override and a kill switch. No code anywhere in the repository implements any of it.',
    apply: () =>
      write(
        'docs/ai-act/human-oversight.md',
        [
          '# Human oversight',
          '',
          'Every adverse screening outcome is queued for manual review by a named',
          'reviewer before it takes effect. A reviewer can override or reverse the',
          'model decision at any point. The AI_ENABLED feature flag is our kill',
          'switch and halts the system.',
        ].join('\n'),
      ),
    expect: 'partial',
  },
  {
    name: 'Describe it in a code comment',
    detail:
      'Move the same sentences into a docblock in a real TypeScript file, so the detector is reading a `.ts` file and citing lines of code.',
    apply: () =>
      write(
        'lib/ai-act/human-oversight.ts',
        [
          '/**',
          ' * Human oversight.',
          ' *',
          ' * Every adverse outcome is queued for manual review by a reviewer, who can',
          ' * override or reverse the decision. The AI_ENABLED kill switch halts the',
          ' * system.',
          ' */',
        ].join('\n'),
      ),
    expect: 'partial',
  },
  {
    name: 'Actually write the module',
    detail:
      'Real functions this time — a review queue, an override, a halt. Nothing in the repository calls any of them.',
    apply: () => write('lib/ai-act/human-oversight.ts', OVERSIGHT_BODY),
    expect: 'partial',
  },
  {
    name: 'Import it without calling it',
    detail: 'One line at the top of the screening path. `import gate  # noqa: F401` is the same move in Python.',
    apply: () => {
      const path = join(dir, 'src/screening/rank.ts');
      const body = readFileSync(path, 'utf8');
      writeFileSync(path, `import { queueForHumanReview } from '../../lib/ai-act/human-oversight';\n${body}`);
    },
    expect: 'partial',
  },
  {
    name: 'Wire it into the decision',
    detail: 'Call it on the adverse branch, where the obligation actually bites. This is not an attack; it is the work.',
    apply: () => {
      const path = join(dir, 'src/screening/rank.ts');
      appendFileSync(
        path,
        [
          '',
          'export function decide(candidateId: string, decision: string) {',
          '  if (haltSystem()) return null;',
          "  if (decision === 'reject') return queueForHumanReview({ candidateId, decision });",
          '  return { candidateId, decision };',
          '}',
          '',
        ].join('\n'),
      );
      writeFileSync(
        path,
        readFileSync(path, 'utf8').replace(
          "import { queueForHumanReview } from '../../lib/ai-act/human-oversight';",
          "import { queueForHumanReview, haltSystem } from '../../lib/ai-act/human-oversight';",
        ),
      );
    },
    expect: 'satisfied',
  },
];

process.stdout.write(
  `\n${c.bold('Five attempts to discharge Article 14')} ${c.grey('— EU AI Act Art. 14(1), the heaviest control in the corpus')}\n`,
);
process.stdout.write(
  `${c.grey(wrap('Each step is one edit to a minimal hiring product that Annex classifies as high-risk under Annex III point 4(a). Nothing here is a special case in the rule pack: the guards live in the engine and run over every control.', 76, ''))}\n\n`,
);

let wrong = 0;

for (const [i, attack] of ATTACKS.entries()) {
  attack.apply();
  const { status, finding, gap } = statusOfArt14();
  const ok = status === attack.expect;
  if (!ok) wrong += 1;

  const badge =
    status === 'satisfied'
      ? c.green(' SATISFIED ')
      : status === 'partial'
        ? c.amber(' PARTIAL   ')
        : c.red(` ${status.toUpperCase().padEnd(9)} `);

  process.stdout.write(`${c.grey(`${i + 1}.`)} ${c.bold(attack.name)}\n`);
  process.stdout.write(`${c.grey(wrap(attack.detail, 72, '   '))}\n\n`);
  process.stdout.write(`   ${badge}  ${ok ? '' : c.red(`expected ${attack.expect}`)}\n`);

  // The sentence that does the work is the *reason*, not the badge. Print the
  // part of the finding the invariant added, which is what tells a reader why
  // a plausible-looking file did not close the duty.
  const reason = finding.split('. ').slice(1).join('. ').trim();
  if (status !== 'satisfied' && reason) process.stdout.write(`${c.grey(wrap(reason, 72, '   '))}\n`);
  if (status !== 'satisfied' && gap) process.stdout.write(`${c.grey(wrap(`→ ${gap}`, 72, '   '))}\n`);
  process.stdout.write('\n');
}

if (wrong > 0) {
  process.stdout.write(`${c.red(`${wrong} step(s) did not do what this script says they do.`)}\n\n`);
  process.exit(1);
}

process.stdout.write(
  `${c.grey(wrap('Four documents, modules and imports that each look like a discharged duty, refused with the reason; then one call site, and it goes green. The difference between step 4 and step 5 is one line — which is the point, because one line is also the difference between an overseer who can intervene and one who cannot.', 76, ''))}\n\n`,
);
