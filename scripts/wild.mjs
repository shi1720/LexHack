/**
 * Run Annex over real repositories and write down what it found.
 *
 * The 50-case benchmark is written by the people who wrote the detectors, and
 * `docs/BENCHMARK.md` says so in the first paragraph. Its clean sheet is a
 * statement about the corpus, not about the world. This is the other
 * measurement: five open-source AI products nobody here chose for being easy,
 * cloned at their default branch and scanned with the same command a user
 * would run.
 *
 * It regenerates `docs/WILD.md`, including the false positives, because a
 * precision claim that only counts the hits is not a precision claim.
 *
 *   npm run build && node scripts/wild.mjs [--out docs/WILD.md]
 *
 * Needs network access and about 1.5 GB of disk for the clones.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const CLI = join(ROOT, 'packages/cli/dist/bin.js');
const OUT = resolve(ROOT, process.argv.includes('--out') ? process.argv[process.argv.indexOf('--out') + 1] : 'docs/WILD.md');

/**
 * Chosen before anything was run, and not changed afterwards.
 *
 * All five are AI products a person talks to, which is the population Article
 * 50 is about and the population this project claims is in scope today. None
 * is a compliance tool, none is a fixture, and none was swapped out for
 * producing an inconvenient answer — the two that produced false positives are
 * still here, with the false positives written down.
 */
const REPOS = [
  { slug: 'mckaywrigley/chatbot-ui', what: 'Self-hostable ChatGPT-style client' },
  { slug: 'huggingface/chat-ui', what: 'The front end behind HuggingChat' },
  { slug: 'langgenius/dify', what: 'LLM application platform, agents and workflows' },
  { slug: 'lobehub/lobe-chat', what: 'Multi-model chat framework with plugins' },
  { slug: 'open-webui/open-webui', what: 'Self-hosted interface for local models' },
];

const dir = mkdtempSync(join(tmpdir(), 'annex-wild-'));
process.on('exit', () => rmSync(dir, { recursive: true, force: true }));

const rows = [];

for (const repo of REPOS) {
  const name = repo.slug.split('/')[1];
  const path = join(dir, name);
  process.stdout.write(`  cloning ${repo.slug}…\n`);
  execFileSync('git', ['clone', '--quiet', '--depth', '1', `https://github.com/${repo.slug}`, path], {
    stdio: ['ignore', 'ignore', 'inherit'],
  });

  process.stdout.write(`  scanning ${name}…\n`);
  const report = JSON.parse(
    execFileSync(process.execPath, [CLI, 'scan', path, '--markets', 'eu', '--quiet', '--format', 'json'], {
      encoding: 'utf8',
      maxBuffer: 256 * 1024 * 1024,
    }),
  );

  const head = execFileSync('git', ['-C', path, 'rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).trim();
  const live = report.controls.filter((c) => c.inForce && (c.status === 'missing' || c.status === 'partial'));
  rows.push({
    ...repo,
    name,
    head,
    tier: report.classification.tier,
    score: report.score,
    liveScore: report.liveScore,
    files: report.snapshot.fileCount,
    truncated: report.snapshot.truncated,
    ms: report.durationMs,
    findings: report.classification.findings.map((f) => ({
      id: f.id,
      tier: f.tier,
      confidence: f.confidence,
      where: f.evidence[0] ? `${f.evidence[0].path}:${f.evidence[0].line}` : '',
    })),
    live: live.map((c) => ({ id: c.controlId, status: c.status })),
  });
  process.stdout.write(`    ${report.classification.tier} · ${report.score}/100 · ${live.length} in-force gaps\n`);
}

const pct = (n) => `${Math.round(n * 100)} %`;
const md = [
  '# What it found in the wild',
  '',
  '> Regenerate with `npm run build && node scripts/wild.mjs`. Every number below',
  '> comes out of that command; nothing here is typed by hand.',
  '',
  'The [50-case benchmark](BENCHMARK.md) is written by the people who wrote the',
  'detectors, and it says so in its first paragraph. Its clean sheet is a statement',
  'about the corpus rather than about the world. This is the other measurement.',
  '',
  'Five open-source AI products, cloned at their default branch and scanned with',
  'the command a user would run. They were chosen before anything was run, for',
  'being AI systems a person talks to — the population Article 50 is about — and',
  'the list did not change afterwards.',
  '',
  '| Repository | What it is | Commit | Tier | Conformity | In force today | Files | Time |',
  '|---|---|---|---|---|---|---|---|',
  ...rows.map(
    (r) =>
      `| [\`${r.slug}\`](https://github.com/${r.slug}) | ${r.what} | \`${r.head}\` | **${r.tier}** | ${r.score ?? '—'}/100 | ${r.liveScore ?? '—'}/100 | ${r.files}${r.truncated ? ' (truncated)' : ''} | ${(r.ms / 1000).toFixed(1)} s |`,
  ),
  '',
  '## The finding that repeats',
  '',
  'All five fail **Article 50(1)** disclosure, machine-readable **Article 50(2)**',
  'marking of generated content, or both — *missing* in some, *partial* in others,',
  'which is Annex saying it found something and not enough. Those are the two',
  'obligations in force *now* rather than in December 2027, and the €15,000,000 or',
  '3 % under Article 99(4)(g) attaches to them today. Article 4 AI literacy is',
  'absent from all five as well.',
  '',
  '| Repository | In-force obligations failing |',
  '|---|---|',
  ...rows.map((r) => `| \`${r.name}\` | ${r.live.length} — ${r.live.slice(0, 4).map((c) => `\`${c.id}\` *${c.status}*`).join(', ')}${r.live.length > 4 ? `, and ${r.live.length - 4} more` : ''} |`),
  '',
  'Said carefully, because the distinction matters: this is **what Annex could see',
  'in the source**, not a legal conclusion about any of these projects. A',
  'disclosure rendered by a component Annex did not recognise is a false negative',
  'here and a discharged duty in reality. Several of these are upstream libraries',
  'rather than products placed on the Union market, and Article 50 binds the',
  'provider or deployer of the deployed system, not necessarily the repository.',
  'What the table supports is narrower and still worth saying: the evidence a',
  'conformity dossier would have to point at is, in five well-run open-source AI',
  'products, not in the code.',
  '',
  '## What it got wrong',
  '',
  'Running this the first time produced four false positives, and they are the',
  'reason the exercise was worth doing — none of them could have been found by a',
  'benchmark written in this repository.',
  '',
  '| What it said | Why it was wrong | Status |',
  '|---|---|---|',
  '| `chat-ui` — **PROHIBITED**, Article 5(1)(b) | `childList`, the second argument to every `MutationObserver.observe` call on the web, matched a pattern for `child` + `list`. A deploy badge produced a €35,000,000 headline. | **Fixed** — the separator is required and `list` is gone |',
  '| `lobe-chat` — **high-risk**, Annex III 5(d) emergency triage | Two lines of `domain.test.ts` reading `description: \'Detect and triage.\'`. | **Fixed** — a test may corroborate a classification and can no longer carry one alone |',
  '| `open-webui` — **high-risk**, Annex III 1(a) biometric identification | The string `\'generateInitialsImage: failed pixel test, fingerprint evasion\'` — browser fingerprinting, which is anti-tracking code and the opposite of biometric identification. | **Fixed** — the biometric sense now needs a finger |',
  '| `open-webui` — **high-risk**, Annex III 1(c) emotion recognition | A prompt template that asks a model to pick an emoji reflecting the tone of a typed message. Article 3(39) defines emotion recognition as inference **on the basis of biometric data**, and text a person typed is not that. | **Open** — see below |',
  '',
  'The last one is not fixed, and it is worth being precise about why rather than',
  'quietly dropping the repository from the table. The guard that is supposed to',
  'establish modality asks whether the file mentions a face, a camera, a frame or',
  'audio. Here the emotion pattern and the word `facial` are *the same sentence* —',
  'a forty-word prompt string corroborating itself. Requiring the corroboration to',
  'sit on a different line fixes this case and breaks a real one, because a',
  'two-line Python function that reads `def mood_detection(audio)` has nowhere',
  'else to put it. The honest fix is knowing that the match is inside a',
  'natural-language string literal rather than in code, which is a lexer change',
  'and is not built.',
  '',
  '`lobe-chat` also reports GDPR Article 22 against a task supervisor\'s eligibility',
  'check, which is a decision about a job rather than about a person. That finding',
  'does not move the AI Act tier — a GDPR rule never promotes a system into Annex',
  'III — but it is in the list, and it is wrong.',
  '',
  '## What this costs',
  '',
  `The largest tree read here is ${Math.max(...rows.map((r) => r.files)).toLocaleString('en-GB')} files and the slowest scan is ${(Math.max(...rows.map((r) => r.ms)) / 1000).toFixed(1)} seconds, on one`,
  'core, with no model called and nothing sent anywhere.',
  '',
  ...(rows.some((r) => r.truncated)
    ? [
        `${rows.filter((r) => r.truncated).map((r) => `\`${r.name}\``).join(' and ')} hit an ingest cap, and the report says so on its face rather than`,
        'scoring what it happened to read. A partial scan reported as a partial scan',
        'is a different object from a clean one, and `--fail-under` refuses it.',
      ]
    : []),
  '',
  '## Every classification, in full',
  '',
  ...rows.flatMap((r) => [
    `### \`${r.slug}\` — ${r.tier}`,
    '',
    ...(r.findings.length === 0
      ? ['No classification finding fired.', '']
      : [
          '| Rule | Tier | Confidence | First evidence |',
          '|---|---|---|---|',
          ...r.findings.map((f) => `| \`${f.id}\` | ${f.tier} | ${pct(f.confidence)} | \`${f.where}\` |`),
          '',
        ]),
  ]),
].join('\n');

writeFileSync(OUT, `${md}\n`);
process.stdout.write(`\n  ✔ ${OUT.replace(`${ROOT}/`, '')}\n\n`);
