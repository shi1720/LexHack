/**
 * Fail the build when a number in the documentation stops being true.
 *
 * Every count in the README, the deck and the write-up — obligations, packs,
 * detectors, benchmark cases, golden fixtures — is a claim about the corpus,
 * and the corpus changes. Twice now a control was added and those numbers were
 * corrected by hand afterwards, which means twice there was a commit whose
 * README described a system that did not exist. This closes that by deriving
 * the numbers and checking them, rather than trusting a person to remember.
 *
 * It is deliberately narrow: it checks counts that have a single right answer.
 * Prose is not its business.
 */
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { ALL_PACKS, ingestDirectory, scan } from '../packages/engine/dist/index.js';
import { BENCHMARK } from '../packages/engine/dist/benchmark/corpus.js';
import { SIGNAL_CATALOGUE } from '../packages/engine/dist/signals/index.js';

const ROOT = resolve(import.meta.dirname, '..');

const controls = ALL_PACKS.flatMap((p) => p.controls);
const withFixtures = controls.filter((c) => c.tests?.length);

/**
 * The self-scan's own size and cost, measured rather than remembered.
 *
 * Four documents and a headline deck stat said "191 files… ~450 ms" against a
 * tree that had grown to 206 files and takes closer to 700, so the project was
 * understating its own scan time by half and inviting the reader, in the same
 * README, to run the command and see otherwise. That is exactly the drift this
 * script exists to stop, and performance numbers were not in it.
 *
 * Wall-clock varies by machine, so these are checked with a tolerance rather
 * than for equality: the claim being defended is the order of magnitude, not
 * the millisecond. The file count is exact.
 */
const selfScan = scan(await ingestDirectory(ROOT, { name: 'annex' }), {
  profile: { markets: ['eu', 'us-federal'] },
});

const FACTS = {
  obligations: controls.length,
  euObligations: ALL_PACKS.find((p) => p.id === 'eu-ai-act').controls.length,
  packs: ALL_PACKS.length,
  detectors: SIGNAL_CATALOGUE.length,
  benchmarkCases: BENCHMARK.length,
  fixtureCases: withFixtures.reduce((n, c) => n + c.tests.length, 0),
  fixtureControls: withFixtures.length,
  selfScanFiles: selfScan.snapshot.fileCount,
  selfScanMs: selfScan.durationMs,
};

/**
 * Claims that are true within a tolerance rather than exactly.
 *
 * Both self-scan figures are properties of *this checkout on this machine*
 * rather than of the corpus, so neither can be an exact match. A timing on
 * somebody else's laptop is obviously not the timing here; less obviously,
 * neither is the file count — a development tree carries build metadata a
 * fresh clone does not, and this check failed in CI at 204 files against a
 * working tree that had 206. Two files is not a documentation error.
 *
 * The tolerances are set to catch the thing this was added for — four
 * documents claiming 191 files and 450 ms against 206 and 690 — and to ignore
 * the noise either side of it. The file band was 8 % for one commit, which let
 * 191 back through at 7.9 %: a tolerance loose enough to admit the original
 * defect is not a gate. 4 % rejects it at 7.3 % and accepts the two-file
 * difference between a clean clone and a development tree.
 */
const APPROXIMATE = { selfScanFiles: 0.04, selfScanMs: 0.3 };

/**
 * Each claim is a file, a regular expression with one capturing group holding
 * the number, and the fact that group has to equal. A claim whose pattern
 * matches nothing is also a failure: it means the sentence was reworded and
 * this check silently stopped covering it.
 */
const CLAIMS = [
  ['README.md', /(\d+) executable obligations across five instruments and three jurisdictions/, 'obligations'],
  ['README.md', /E\[(\d+) controls<br\/>5 rule packs\]/, 'obligations'],
  ['README.md', /The corpus: (\d+) controls with citations/, 'obligations'],
  ['README.md', /C\[(\d+) signal detectors/, 'detectors'],
  ['README.md', /as amended by \(EU\) 2026\/1744 \| 2026\.09\.1 \| (\d+) \|/, 'euObligations'],
  ['README.md', /Risk-tier accuracy \| 100 % \((\d+)\/\d+\)/, 'benchmarkCases'],
  ['README.md', /Roughly half the (\d+)-case corpus/, 'benchmarkCases'],
  ['README.md', /The benchmark is (\d+) cases, all written in-house/, 'benchmarkCases'],
  ['README.md', /the (\d+)-case benchmark and the golden fixtures do that job/, 'benchmarkCases'],
  ['README.md', /— (\d+) cases over \d+ obligations, in all five packs —/, 'fixtureCases'],
  ['README.md', /— \d+ cases over (\d+) obligations, in all five packs —/, 'fixtureControls'],
  ['docs/deck/index.html', /<h2>(\d+) obligations\. 5 instruments/, 'obligations'],
  // The cover's four figures. They are the first numbers a reader sees and the
  // ones nothing else on the slide would correct.
  ['docs/deck/index.html', /<div class="stat">(\d+)<\/div>\s*<div class="cap">executable obligations/, 'obligations'],
  ['docs/deck/index.html', /<div class="stat">(\d+)<\/div>\s*<div class="cap">rule packs/, 'packs'],
  ['docs/deck/index.html', /<div class="stat">(\d+)<\/div>\s*<div class="cap">hand-labelled benchmark cases/, 'benchmarkCases'],
  ['docs/deck/index.html', /<div class="stat s">(\d+)<\/div><div class="cap">executable obligations/, 'obligations'],
  ['docs/deck/index.html', /<div class="stat s">(\d+)<\/div><div class="cap">signal detectors/, 'detectors'],
  ['docs/deck/index.html', /<td>(\d+) obligations · post-Omnibus dates<\/td>/, 'euObligations'],
  ['docs/deck/index.html', /(\d+) hand-labelled cases\. Roughly half/, 'benchmarkCases'],
  ['docs/deck/index.html', /<strong>(\d+) golden fixtures<\/strong>/, 'fixtureCases'],
  ['docs/diagram-architecture.svg', /a rule-based classifier and (\d+) controls/, 'obligations'],
  ['docs/diagram-architecture.svg', /(\d+) signal detectors/, 'detectors'],
  ['docs/diagram-architecture.svg', />(\d+) controls · 5 rule packs</, 'obligations'],
  ['docs/deck/diagram-core.svg', /a rule-based classifier and (\d+) controls/, 'obligations'],
  ['docs/deck/diagram-core.svg', />(\d+) controls · 5 rule packs</, 'obligations'],
  ['docs/DEVPOST.md', /a readable classification rule table, (\d+) controls/, 'obligations'],
  ['docs/DEVPOST.md', /(\d+) signal detectors/, 'detectors'],
  ['docs/DEVPOST.md', /a (\d+)-case hand-labelled corpus/, 'benchmarkCases'],
  ['docs/DEVPOST.md', /A (\d+)-case benchmark, a unit suite/, 'benchmarkCases'],
  ['docs/VIDEO.md', /`(\d+) obligations · 5 instruments · 0 model calls`/, 'obligations'],
  ['docs/VIDEO.md', /`(\d+) cases · 100% tier accuracy/, 'benchmarkCases'],
  ['CONTRIBUTING.md', /npm run benchmark {5}# (\d+) labelled cases/, 'benchmarkCases'],
  ['README.md', /signals\/ {11}(\d+) detectors over code, docs and manifests/, 'detectors'],
  ['docs/ARCHITECTURE.md', /S->>S: (\d+) detectors, keyword-prefiltered/, 'detectors'],
  ['docs/ARCHITECTURE.md', /^(\d+) detectors in eight families:/m, 'detectors'],
  // Added after a judge found four artefacts stating counts the corpus
  // contradicted, two of them inside the same deck.
  ['docs/ARCHITECTURE.md', /E->>E: (\d+) controls, each with its own application date/, 'obligations'],
  ['docs/ARCHITECTURE.md', /^(\d+) obligations across five instruments\./m, 'obligations'],
  ['docs/BUSINESS.md', /evaluates (\d+) obligations in about/, 'obligations'],
  ['docs/DEVPOST.md', /Annex reads the code instead: (\d+) obligations/, 'obligations'],
  ['docs/deck/diagram-core.svg', /(\d+) golden fixtures across all five packs/, 'fixtureCases'],
  ['docs/diagram-architecture.svg', /(\d+) golden fixtures across all five packs/, 'fixtureCases'],
  // The self-scan's size and cost, in the four places they are quoted.
  ['docs/ARCHITECTURE.md', /A ~(\d+)-file repository — this one — scans in/, 'selfScanFiles'],
  ['docs/ARCHITECTURE.md', /this one — scans in ~(\d+) ms/, 'selfScanMs'],
  ['docs/BUSINESS.md', /A ~(\d+)-file repository — this one — evaluates/, 'selfScanFiles'],
  ['docs/BUSINESS.md', /obligations in about (\d+) ms of a single core/, 'selfScanMs'],
  ['docs/DEVPOST.md', /A ~(\d+)-file repository — this one — scans in/, 'selfScanFiles'],
  ['docs/DEVPOST.md', /this one — scans in ~(\d+) ms/, 'selfScanMs'],
  ['docs/deck/index.html', /<div class="stat s">(\d+)<span style="font-size:18px">ms<\/span>/, 'selfScanMs'],
  ['docs/deck/index.html', /<div class="cap">to scan its own (\d+) files<\/div>/, 'selfScanFiles'],
];

const cache = new Map();
const read = async (file) => {
  if (!cache.has(file)) cache.set(file, await readFile(resolve(ROOT, file), 'utf8'));
  return cache.get(file);
};

const problems = [];
for (const [file, pattern, fact] of CLAIMS) {
  const text = await read(file);
  const match = text.match(pattern);
  if (!match) {
    problems.push(`${file}: nothing matched ${pattern} — the sentence moved, so this claim is no longer checked`);
    continue;
  }
  const found = Number(match[1]);
  const actual = FACTS[fact];
  const tolerance = APPROXIMATE[fact];
  const wrong = tolerance === undefined ? found !== actual : Math.abs(found - actual) / actual > tolerance;
  if (wrong) {
    problems.push(
      `${file}: says ${found} ${fact}, this run measured ${actual}${tolerance === undefined ? '' : ` (tolerance ±${Math.round(tolerance * 100)} %)`} — ${JSON.stringify(match[0])}`,
    );
  }
}

process.stdout.write(`\nDerived from the corpus: ${Object.entries(FACTS).map(([k, v]) => `${k} ${v}`).join(' · ')}\n\n`);
if (problems.length > 0) {
  for (const p of problems) process.stdout.write(`  ✖ ${p}\n`);
  process.stdout.write(`\n${problems.length} documented number(s) no longer describe the corpus.\n`);
  process.exit(1);
}
process.stdout.write(`  ✔ all ${CLAIMS.length} documented counts match the corpus.\n`);
