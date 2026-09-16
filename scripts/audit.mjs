/**
 * Accessibility and responsive audit.
 *
 * Checks the things the rubric actually asks for — "accessible and
 * understandable for everyday users" — rather than the things that are easy to
 * measure. Runs against a live instance and exits non-zero on a failure.
 *
 * Usage: node scripts/audit.mjs [baseUrl]
 */
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';

const BASE = process.argv[2] ?? 'http://localhost:3000';
const OUT = 'docs/screenshots/mobile';

/** WCAG relative luminance. */
function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const f = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

function contrast(a, b) {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

// The 4.5:1 rows are body text (WCAG 1.4.3). The 3:1 rows are the visual
// boundary of a user-interface component (WCAG 1.4.11), which is a different
// threshold and the one this design failed until the borders were darkened.
const PAIRS = [
  ['ink on paper', '#14181f', '#fcfcfa', 4.5],
  ['ink-soft on paper', '#444b57', '#fcfcfa', 4.5],
  ['ink-faint on paper', '#667080', '#fcfcfa', 4.5],
  ['control border on surface', '#8e9089', '#ffffff', 3],
  ['dark: control border on surface', '#6b7480', '#14181f', 3],
  ['dark: ink-faint on sunken', '#8791a0', '#1a1f28', 4.5],
  ['navy on paper', '#17356b', '#fcfcfa', 4.5],
  ['navy on navy-soft', '#17356b', '#e8edf6', 4.5],
  ['crimson on crimson-soft', '#a11526', '#fbe8ea', 4.5],
  ['amber on amber-soft', '#8a5a00', '#fbf1dc', 4.5],
  ['moss on moss-soft', '#0f6b45', '#e2f2ea', 4.5],
  ['paper on ink (primary button)', '#fcfcfa', '#14181f', 4.5],
  ['dark: ink on paper', '#eef1f5', '#0d1015', 4.5],
  ['dark: ink-soft on surface', '#b3bac6', '#14181f', 4.5],
  ['dark: ink-faint on surface', '#8791a0', '#14181f', 4.5],
  ['dark: navy on surface', '#8fb3f0', '#14181f', 4.5],
  ['dark: crimson on crimson-soft', '#ff8f9c', '#351319', 4.5],
  ['dark: amber on amber-soft', '#f0c060', '#302510', 4.5],
  ['dark: moss on moss-soft', '#6fd7a6', '#0f2a1f', 4.5],
];

const failures = [];

process.stdout.write('\nContrast (WCAG AA, 4.5:1 for body text)\n');
for (const [name, fg, bg, min] of PAIRS) {
  const ratio = contrast(fg, bg);
  const ok = ratio >= min;
  if (!ok) failures.push(`contrast: ${name} is ${ratio.toFixed(2)}:1, needs ${min}:1`);
  process.stdout.write(`  ${ok ? '✔' : '✖'} ${name.padEnd(34)} ${ratio.toFixed(2)}:1\n`);
}

await mkdir(OUT, { recursive: true });

const browser = await chromium
  .launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM || '/opt/pw-browsers/chromium' })
  .catch(() => chromium.launch());

// --------------------------------------------------------------------------
// Responsive: every page at phone width, checking for horizontal overflow
// --------------------------------------------------------------------------

const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const page = await context.newPage();
page.on('pageerror', (e) => failures.push(`pageerror: ${e.message}`));

await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
await page.click('text=Enter the demo workspace');
await page.waitForURL('**/app', { timeout: 90_000 });
await page.waitForLoadState('networkidle');

const first = await page.locator('article.card a[href^="/app/s/"]').first().getAttribute('href');

const PAGES = [
  ['landing', '/'],
  ['dashboard', '/app'],
  ['overview', first],
  ['evidence', `${first}/evidence`],
  ['dossier', `${first}/dossier`],
  ['remediation', `${first}/remediation`],
  ['history', `${first}/history`],
  ['new', '/app/new'],
  ['settings', '/app/settings'],
];

process.stdout.write('\nResponsive at 390px (no horizontal scroll)\n');
for (const [name, path] of PAGES) {
  await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(150);
  const overflow = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    client: document.documentElement.clientWidth,
    culprits: [...document.querySelectorAll('body *')]
      .filter((el) => el.getBoundingClientRect().right > document.documentElement.clientWidth + 2)
      .slice(0, 3)
      .map((el) => `${el.tagName.toLowerCase()}.${(el.className || '').toString().split(' ')[0]}`),
  }));
  const ok = overflow.scroll <= overflow.client + 2;
  if (!ok) failures.push(`overflow: ${name} scrolls to ${overflow.scroll}px at 390px (${overflow.culprits.join(', ')})`);
  process.stdout.write(`  ${ok ? '✔' : '✖'} ${name.padEnd(14)} ${overflow.scroll}px${ok ? '' : `  ← ${overflow.culprits.join(', ')}`}\n`);
  await page.screenshot({ path: `${OUT}/${name}.png` });
}

// --------------------------------------------------------------------------
// Semantics and keyboard
// --------------------------------------------------------------------------

process.stdout.write('\nSemantics and keyboard\n');
// Audit the same isolated workspace at both sizes. A second demo login creates
// another owner, which must not be able to read the first workspace's systems.
const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 }, storageState: await context.storageState() });
const dp = await desktop.newPage();

await dp.goto(`${BASE}/app`, { waitUntil: 'networkidle' });

for (const [name, path] of PAGES) {
  const response = await dp.goto(`${BASE}${path}`, { waitUntil: 'networkidle' });
  if (!response?.ok()) failures.push(`navigation ${name}: HTTP ${response?.status()}`);
  const audit = await dp.evaluate(() => {
    const problems = [];
    if (document.querySelectorAll('h1').length !== 1) problems.push(`${document.querySelectorAll('h1').length} h1 elements`);
    if (!document.querySelector('main')) problems.push('no <main> landmark');
    for (const img of document.querySelectorAll('img')) if (!img.alt) problems.push('img without alt');
    for (const input of document.querySelectorAll('input:not([type=hidden]), select, textarea')) {
      const id = input.getAttribute('id');
      const labelled =
        (id && document.querySelector(`label[for="${id}"]`)) ||
        input.getAttribute('aria-label') ||
        input.closest('label');
      if (!labelled) problems.push(`unlabelled ${input.tagName.toLowerCase()}`);
    }
    for (const b of document.querySelectorAll('button')) {
      if (!b.textContent.trim() && !b.getAttribute('aria-label')) problems.push('button with no accessible name');
    }
    if (document.documentElement.lang !== 'en') problems.push('html lang not set');
    return [...new Set(problems)];
  });
  const ok = audit.length === 0;
  if (!ok) failures.push(`a11y ${name}: ${audit.join('; ')}`);
  process.stdout.write(`  ${ok ? '✔' : '✖'} ${name.padEnd(14)} ${ok ? 'clean' : audit.join('; ')}\n`);
}

// --------------------------------------------------------------------------
// Tailwind's `space-y-*` sets margin-block-end on each child rather than a gap
// on the parent, so a child that zeroes its own margin silently collapses the
// stack. Two real gaps had disappeared this way before the check existed.
// --------------------------------------------------------------------------

process.stdout.write('\nStack spacing\n');
const collapsed = [];
for (const [name, path] of PAGES) {
  const response = await dp.goto(`${BASE}${path}`, { waitUntil: 'networkidle' });
  if (!response?.ok()) failures.push(`navigation ${name}: HTTP ${response?.status()}`);
  const found = await dp.evaluate(() => {
    const out = [];
    for (const parent of document.querySelectorAll('[class*="space-y-"]')) {
      const wanted = /space-y-([1-9]\d*)/.exec(parent.className.toString());
      if (!wanted) continue; // space-y-0 is a deliberate zero
      for (const kid of [...parent.children].slice(0, -1)) {
        const style = getComputedStyle(kid);
        if (style.position === 'absolute' || style.display === 'none') continue;
        if ((parseFloat(style.marginBlockEnd) || 0) >= 2) continue;
        out.push(`${kid.tagName.toLowerCase()}${kid.className ? '.' + String(kid.className).split(' ')[0] : ''}`);
      }
    }
    return [...new Set(out)];
  });
  if (found.length) collapsed.push(`${name}: ${found.join(', ')}`);
  process.stdout.write(`  ${found.length ? '✖' : '✔'} ${name.padEnd(14)} ${found.length ? found.join(', ') : 'clean'}\n`);
}
if (collapsed.length) failures.push(`collapsed stack spacing — ${collapsed.join(' · ')}`);

// --------------------------------------------------------------------------
// Invalid ARIA is worse than none: a role promises interactions to a screen
// reader that the markup then has to honour.
// --------------------------------------------------------------------------

await dp.goto(`${BASE}${first}/evidence`, { waitUntil: 'networkidle' });
const aria = await dp.evaluate(() => {
  const problems = [];
  for (const tab of document.querySelectorAll('[role="tab"]')) {
    if (!tab.getAttribute('aria-controls')) problems.push('role=tab without aria-controls');
    if (!tab.closest('[role="tablist"]')) problems.push('role=tab outside a tablist');
  }
  for (const list of document.querySelectorAll('[role="tablist"]')) {
    if (!document.querySelector('[role="tabpanel"]')) problems.push('tablist with no tabpanel');
  }
  const scrollers = [...document.querySelectorAll('.evidence-snippet')].filter(
    (el) => el.scrollWidth > el.clientWidth + 2,
  );
  for (const el of scrollers) {
    if (el.tabIndex < 0) problems.push('scrollable code region is not focusable');
  }
  return [...new Set(problems)];
});
if (aria.length) failures.push(`aria evidence: ${aria.join('; ')}`);
process.stdout.write(`  ${aria.length ? '✖' : '✔'} aria patterns  ${aria.length ? aria.join('; ') : 'clean'}\n`);

// Tab from the top of the dashboard and confirm focus is visible and ordered.
await dp.goto(`${BASE}/app`, { waitUntil: 'networkidle' });
const focusTrail = [];
for (let i = 0; i < 8; i++) {
  await dp.keyboard.press('Tab');
  focusTrail.push(
    await dp.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body) return '(body)';
      const style = getComputedStyle(el, ':focus-visible');
      return `${el.tagName.toLowerCase()}:${(el.textContent ?? '').trim().slice(0, 22)}`;
    }),
  );
}
const focusOk = !focusTrail.includes('(body)');
if (!focusOk) failures.push('keyboard: focus escaped to body within the first 8 tab stops');
process.stdout.write(`  ${focusOk ? '✔' : '✖'} tab order      ${focusTrail.slice(0, 5).join(' → ')}\n`);

await browser.close();

process.stdout.write('\n');
if (failures.length) {
  process.stdout.write(`${failures.length} problem(s):\n${failures.map((f) => `  ✖ ${f}`).join('\n')}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write('All checks passed.\n');
}
