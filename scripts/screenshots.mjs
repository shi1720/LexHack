/**
 * Capture the screenshots used in the README, the Devpost write-up and the deck.
 *
 * Usage: node scripts/screenshots.mjs [baseUrl] [outDir]
 *
 * Requires a running Annex web app and Playwright's Chromium. Every shot is
 * taken twice (light and dark) so the documentation matches whichever theme a
 * reader has, and the console is asserted clean on every page.
 */
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';

const BASE = process.argv[2] ?? 'http://localhost:3000';
const OUT = process.argv[3] ?? 'docs/screenshots';
const EXEC = process.env.PLAYWRIGHT_CHROMIUM ?? '/opt/pw-browsers/chromium';

/** Pages to capture. `prepare` runs before the shot. */
const SHOTS = [
  { name: '01-landing', path: '/', full: false },
  { name: '02-landing-clock', path: '/#clock', full: false, scrollTo: '#clock' },
  { name: '03-dashboard', path: '/app', full: false },
  { name: '04-overview-prohibited', path: 'SYSTEM:HireFlow', full: false },
  { name: '05-evidence', path: 'SYSTEM:HireFlow/evidence', full: false },
  { name: '06-dossier', path: 'SYSTEM:HireFlow/dossier', full: false },
  { name: '07-remediation', path: 'SYSTEM:HireFlow/remediation', full: false },
  { name: '08-overview-remediated', path: 'SYSTEM:HireFlow v3', full: false },
  { name: '09-history-drift', path: 'SYSTEM:HireFlow v3/history', full: false },
  { name: '10-trust-page', path: 'TRUST:HireFlow v3', full: false },
  { name: '11-supportly', path: 'SYSTEM:Supportly', full: false },
  { name: '12-add-system', path: '/app/new', full: false },
];

async function main() {
  await mkdir(OUT, { recursive: true });

  const browser = await chromium.launch({ executablePath: EXEC }).catch(() => chromium.launch());
  const problems = [];

  for (const theme of ['light', 'dark']) {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 940 },
      deviceScaleFactor: 2,
      colorScheme: theme,
    });
    const page = await context.newPage();
    page.on('pageerror', (e) => problems.push(`[${theme}] pageerror: ${e.message}`));
    page.on('console', (m) => {
      if (m.type() === 'error' && !m.text().includes('404')) problems.push(`[${theme}] console: ${m.text()}`);
    });

    // Sign in once per context.
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
    await page.click('text=Enter the demo workspace');
    await page.waitForURL('**/app', { timeout: 90_000 });
    await page.waitForLoadState('networkidle');

    // Resolve system links by name.
    const systemHrefs = {};
    for (const link of await page.locator('article.card a[href^="/app/s/"]').all()) {
      const name = (await link.textContent())?.trim();
      const href = await link.getAttribute('href');
      if (name && href && !systemHrefs[name]) systemHrefs[name] = href;
    }
    const trustHrefs = {};
    for (const [name, href] of Object.entries(systemHrefs)) {
      await page.goto(`${BASE}${href}/share`, { waitUntil: 'networkidle' });
      const link = page.locator('a[href^="/trust/"]').first();
      if (await link.count()) trustHrefs[name] = await link.getAttribute('href');
    }

    for (const shot of SHOTS) {
      let url = shot.path;
      if (url.startsWith('SYSTEM:')) {
        const [name, ...rest] = url.slice(7).split('/');
        const href = systemHrefs[name];
        if (!href) {
          problems.push(`[${theme}] no system named "${name}"`);
          continue;
        }
        url = href + (rest.length ? `/${rest.join('/')}` : '');
      } else if (url.startsWith('TRUST:')) {
        const href = trustHrefs[url.slice(6)];
        if (!href) {
          problems.push(`[${theme}] no trust page for "${url.slice(6)}"`);
          continue;
        }
        url = href;
      }

      await page.goto(`${BASE}${url}`, { waitUntil: 'networkidle' });
      if (shot.scrollTo) await page.locator(shot.scrollTo).scrollIntoViewIfNeeded();
      await page.waitForTimeout(220);
      const file = `${OUT}/${shot.name}${theme === 'dark' ? '-dark' : ''}.png`;
      await page.screenshot({ path: file, fullPage: shot.full });
      process.stdout.write(`  ${file}\n`);
    }

    await context.close();
  }

  await browser.close();

  if (problems.length) {
    process.stderr.write('\nPage problems:\n' + problems.map((p) => `  ${p}`).join('\n') + '\n');
    process.exitCode = 1;
  } else {
    process.stdout.write('\nNo console or page errors on any captured page.\n');
  }
}

void main();
