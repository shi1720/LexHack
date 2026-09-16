/**
 * Render an HTML file to PDF with Chromium.
 *
 * Usage: node scripts/render-pdf.mjs <input.html> <output.pdf> [--landscape]
 *
 * Used to produce the example Annex IV dossier and the pitch deck. The dossier
 * HTML is already A4 print-styled (`@page { size: A4 }`), so this is a
 * faithful render rather than a reformat.
 */
import { resolve } from 'node:path';
import { chromium } from 'playwright';

const [input, output, ...flags] = process.argv.slice(2);

if (!input || !output) {
  process.stderr.write('usage: node scripts/render-pdf.mjs <input.html> <output.pdf> [--landscape]\n');
  process.exit(2);
}

const landscape = flags.includes('--landscape');

const browser = await chromium
  .launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM || '/opt/pw-browsers/chromium' })
  .catch(() => chromium.launch());

const page = await browser.newPage();
await page.goto(`file://${resolve(input)}`, { waitUntil: 'networkidle' });
await page.emulateMedia({ media: 'print' });
await page.pdf({
  path: resolve(output),
  format: landscape ? 'A4' : 'A4',
  landscape,
  printBackground: true,
  margin: landscape ? undefined : { top: '18mm', bottom: '18mm', left: '16mm', right: '16mm' },
});

await browser.close();
process.stdout.write(`wrote ${output}\n`);
