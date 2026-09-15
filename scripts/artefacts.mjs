/**
 * Regenerate every artefact that is checked in but derived from the engine.
 *
 * Usage: node scripts/artefacts.mjs
 *
 * These files — the example dossier, the standards exports, the deck PDF and
 * its slide stills — are committed so a reader can open them without running
 * anything. That makes them a drift hazard: every time a control is added or a
 * citation is corrected, the committed copy becomes a claim the code no longer
 * supports. Regenerating them is therefore a single command, run at the end of
 * every change to the corpus.
 */
import { execFileSync } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright';

const ROOT = resolve(import.meta.dirname, '..');
const CLI = resolve(ROOT, 'packages/cli/dist/bin.js');
/** The failing tree, for the artefact whose job is to carry findings. */
const FIXTURE = 'fixtures/hireflow';
/** The remediated tree — "HireFlow v3" in the demo — for the artefacts a
 *  customer is actually handed: an attestation and a model inventory. */
const REMEDIATED = 'fixtures/hireflow-remediated';

/** The deck slides reproduced as stills in the write-up. */
const DECK_STILLS = [1, 3, 5, 6, 7, 8];

const run = (args) => {
  execFileSync(process.execPath, [CLI, ...args], { cwd: ROOT, stdio: ['ignore', 'ignore', 'inherit'] });
  process.stdout.write(`  ✔ ${args.join(' ')}\n`);
};

process.stdout.write('\nStandards exports and the example dossier\n');
await mkdir(resolve(ROOT, 'docs/examples'), { recursive: true });
run(['scan', FIXTURE, '--format', 'sarif', '--out', 'docs/examples/hireflow.sarif', '--quiet']);
run(['scan', REMEDIATED, '--format', 'cdxa', '--out', 'docs/examples/hireflow-v3-attestation.cdx.json', '--quiet']);
run(['scan', REMEDIATED, '--format', 'mlbom', '--out', 'docs/examples/hireflow-v3.mlbom.cdx.json', '--quiet']);
run(['dossier', FIXTURE, '--html', '--out', '/tmp/annex-dossier.html']);

const browser = await chromium
  .launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM ?? '/opt/pw-browsers/chromium' })
  .catch(() => chromium.launch());

const pdf = async (input, output, landscape) => {
  const page = await browser.newPage({ viewport: { width: 1440, height: 810 } });
  await page.goto(`file://${resolve(input)}`, { waitUntil: 'networkidle' });
  await page.emulateMedia({ media: 'print' });
  await page.pdf({
    path: resolve(ROOT, output),
    format: 'A4',
    landscape,
    printBackground: true,
    ...(landscape ? {} : { margin: { top: '18mm', bottom: '18mm', left: '16mm', right: '16mm' } }),
  });
  await page.close();
  process.stdout.write(`  ✔ ${output}\n`);
};

process.stdout.write('\nPDFs\n');
await pdf('/tmp/annex-dossier.html', 'docs/examples/annex-iv-dossier-hireflow.pdf', false);
await pdf(resolve(ROOT, 'docs/deck/index.html'), 'docs/deck/annex-pitch-deck.pdf', true);

process.stdout.write('\nDeck stills\n');
const page = await browser.newPage({ viewport: { width: 1440, height: 810 }, deviceScaleFactor: 2 });
await page.goto(`file://${resolve(ROOT, 'docs/deck/index.html')}`, { waitUntil: 'networkidle' });
const slides = await page.locator('section.slide').all();

// A slide is a fixed 297x167mm box with `overflow: hidden`, so content that
// does not fit is silently cut off mid-sentence rather than reflowing. That
// happened once and shipped; check every slide instead of eyeballing them.
// The slide is a fixed-height flex column, so a block that does not fit is
// not pushed past the edge — it is squeezed, and its own `overflow: hidden`
// then cuts the text off mid-line. That happened to the diff slide and
// shipped. Check every clipping box for content taller than the box.
const overflowing = await page.$$eval('section.slide', (nodes) => {
  const out = [];
  nodes.forEach((slide, i) => {
    const boxes = [slide, ...slide.querySelectorAll('*')].filter(
      (el) => getComputedStyle(el).overflow !== 'visible',
    );
    for (const el of boxes) {
      const over = Math.round(el.scrollHeight - el.clientHeight);
      if (over > 1) out.push({ n: i + 1, tag: el.tagName.toLowerCase(), over });
    }
  });
  return out;
});
if (overflowing.length > 0) {
  const detail = overflowing.map((s) => `slide ${s.n} clips ${s.over}px inside <${s.tag}>`).join(', ');
  throw new Error(`the deck does not fit its own page size: ${detail}`);
}

for (const n of DECK_STILLS) {
  const slide = slides[n - 1];
  if (!slide) throw new Error(`the deck has no slide ${n} (it has ${slides.length})`);
  const name = `docs/deck/slide-${String(n).padStart(2, '0')}.png`;
  await slide.screenshot({ path: resolve(ROOT, name) });
  process.stdout.write(`  ✔ ${name}\n`);
}

await browser.close();
process.stdout.write('\nAll artefacts regenerated.\n');
