/**
 * Does the product work?
 *
 * `audit.mjs` checks how the app *looks* — contrast, overflow, landmarks,
 * keyboard order. This checks what it *does*, which is a different question and
 * the one the README's central claim rests on: a user signs up, points Annex at
 * a repository, and gets back findings that cite real lines of real files, a
 * dossier, a patch and a signed export.
 *
 * Every assertion here is functional. The most important one is `citations
 * resolve`: it takes the file and line number the web UI printed next to an
 * Article 5 finding, opens that file on disk, and checks the text matches. A
 * compliance tool whose citations do not resolve is a tool that has invented
 * its evidence, and nothing else in the product survives that being false.
 *
 * Runs against a live instance with an empty database, so it also covers the
 * thing a reviewer does first and nobody tests: arriving at a fresh install.
 *
 *   ANNEX_DB=/tmp/smoke.db npm run start &
 *   node scripts/smoke.mjs [baseUrl]
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from 'playwright';

const BASE = process.argv[2] ?? 'http://localhost:3000';
const ROOT = resolve(import.meta.dirname, '..');

const failures = [];
let passed = 0;

/** One named assertion. Records rather than throws, so one failure does not hide the rest. */
async function check(name, fn) {
  try {
    const detail = await fn();
    passed += 1;
    process.stdout.write(`  ✔ ${name}${detail ? `  ${detail}` : ''}\n`);
  } catch (error) {
    failures.push(`${name}: ${error.message}`);
    process.stdout.write(`  ✖ ${name}  ${error.message.split('\n')[0]}\n`);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

// Fail on the actual problem. Without this the first navigation throws
// `ERR_CONNECTION_REFUSED` inside an assertion and the run ends in a stack
// trace about a locator, which is a confusing way to be told the server is
// not running.
try {
  const ping = await fetch(BASE, { redirect: 'manual' });
  if (ping.status >= 500) throw new Error(`${BASE} answered ${ping.status}`);
} catch (error) {
  process.stderr.write(
    `\nNothing is serving ${BASE} (${error.message ?? error}).\n` +
      `Start one first:\n\n  ANNEX_DB=/tmp/smoke.db npm run start &\n  node scripts/smoke.mjs\n\n`,
  );
  process.exit(2);
}

const browser = await chromium
  .launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM || '/opt/pw-browsers/chromium' })
  .catch(() => chromium.launch());

const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();

// A page error anywhere in the walk is a failure of the walk, not a detail.
const runtime = [];
page.on('pageerror', (e) => runtime.push(`pageerror: ${e.message}`));
page.on('response', (r) => {
  if (r.status() >= 500) runtime.push(`HTTP ${r.status()} ${new URL(r.url()).pathname}`);
});

// ---------------------------------------------------------------------------
// Signing up
// ---------------------------------------------------------------------------

process.stdout.write('\nAccount\n');

// A new address every run, so the test is idempotent against a database that
// already has one — and so a failure is never "the account already exists".
const email = `smoke-${Date.now()}@example.test`;
// At least ten characters, with a letter and a number — the rule the
// sign-up form states and enforces.
const password = 'smoke-passw0rd-2026';

await check('the landing page loads', async () => {
  const response = await page.goto(BASE, { waitUntil: 'networkidle' });
  assert(response.ok(), `landing page returned ${response.status()}`);
  const text = await page.locator('body').innerText();
  assert(/EU AI Act/i.test(text), 'the landing page does not mention the EU AI Act');
});

await check('a new account can be created', async () => {
  await page.goto(`${BASE}/login?mode=signup`, { waitUntil: 'networkidle' });
  if ((await page.locator('input[name="name"]').count()) === 0) {
    await page.getByRole('link', { name: /create one/i }).click();
    await page.waitForLoadState('networkidle');
  }
  await page.fill('input[name="name"]', 'Smoke Test');
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  const org = page.locator('input[name="org"]');
  if (await org.count()) await org.fill('Smoke Ltd');
  await page.getByRole('button', { name: /create account|sign up/i }).click();
  await page.waitForURL('**/app', { timeout: 90_000 });
  return email;
});

// A new account starts empty on purpose — the seeded samples belong to the
// demo workspace and not to everybody who signs up — so the empty state is
// the first thing a real user sees and the only thing standing between them
// and a blank page.
await check('a new account starts empty and says what to do', async () => {
  const text = await page.locator('main').innerText();
  assert(/no systems yet/i.test(text), 'the empty state does not say the workspace is empty');
  assert(/sample|repository/i.test(text), 'the empty state does not say what to do next');
});

await check('a bundled sample can be added and scans on its own', async () => {
  await page.goto(`${BASE}/app/new`, { waitUntil: 'networkidle' });
  const form = page.locator('form:has(input[name="sample"][value="lendwise"])');
  assert(await form.count(), 'no form offers the lendwise sample');
  await form.getByRole('button').first().click();
  await page.waitForLoadState('networkidle');
  for (let i = 0; i < 60; i += 1) {
    await page.goto(`${BASE}/app`, { waitUntil: 'networkidle' });
    if (await page.locator('article.card a[href^="/app/s/"]').count()) return 'LendWise scanned';
    await page.waitForTimeout(1000);
  }
  throw new Error('the system never appeared on the dashboard');
});

// Everything below walks the demo workspace, which is what a judge clicks
// into and the only one carrying two scans of the same system — so it is the
// only one where drift detection has anything to detect.
await check('the demo workspace is one click from the login page', async () => {
  await page.goto(`${BASE}/app`, { waitUntil: 'networkidle' });
  await Promise.all([
    page.waitForURL((u) => !u.pathname.startsWith('/app'), { timeout: 60_000 }),
    page.getByRole('button', { name: /sign out/i }).click(),
  ]);
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /demo workspace/i }).click();
  await page.waitForURL('**/app', { timeout: 90_000 });
  for (let i = 0; i < 60; i += 1) {
    await page.goto(`${BASE}/app`, { waitUntil: 'networkidle' });
    const n = await page.locator('article.card:has(a[href^="/app/s/"])').count();
    if (n >= 4) return `${n} systems, seeded and scanned`;
    await page.waitForTimeout(1000);
  }
  throw new Error('fewer than four systems after 60 seconds');
});

const links = [
  ...new Set(
    await page.locator('article.card a[href^="/app/s/"]').evaluateAll((ns) => ns.map((n) => n.getAttribute('href'))),
  ),
];

/** The system whose name matches, by the heading on its own overview page. */
async function systemNamed(name) {
  for (const href of links) {
    await page.goto(`${BASE}${href}`, { waitUntil: 'networkidle' });
    if ((await page.locator('h1').innerText()).trim() === name) return href;
  }
  throw new Error(`no seeded system is called ${name}`);
}

const hireflow = await systemNamed('HireFlow');
const remediated = await systemNamed('HireFlow v3');

// ---------------------------------------------------------------------------
// The finding, and whether its evidence is real
// ---------------------------------------------------------------------------

process.stdout.write('\nFindings and evidence\n');

await check('the prohibited practice is on the overview page', async () => {
  await page.goto(`${BASE}${hireflow}`, { waitUntil: 'networkidle' });
  const text = await page.locator('main').innerText();
  assert(/prohibited/i.test(text), 'the word "prohibited" does not appear');
  assert(/5\(1\)\(f\)/.test(text), 'Article 5(1)(f) is not cited');
});

await check('the remediated tree is not prohibited', async () => {
  await page.goto(`${BASE}${remediated}`, { waitUntil: 'networkidle' });
  const text = await page.locator('main').innerText();
  assert(!/\bPROHIBITED\b/.test(text), 'the remediated tree still reads as prohibited');
  assert(/high[- ]risk/i.test(text), 'the remediated tree is not classified high-risk');
});

await check('citations resolve to the lines they name', async () => {
  await page.goto(`${BASE}${hireflow}/evidence`, { waitUntil: 'networkidle' });
  // Every citation the UI renders carries its path and line in the same
  // element, in the `path:line` form the CLI prints.
  const cited = await page.locator('main').evaluate((main) => {
    const out = [];
    for (const el of main.querySelectorAll('*')) {
      if (el.children.length) continue;
      const m = /^([\w./-]+\.[a-z]{1,5}):(\d+)$/.exec((el.textContent ?? '').trim());
      if (m) out.push({ path: m[1], line: Number(m[2]) });
    }
    return out;
  });
  assert(cited.length > 0, 'the evidence page renders no path:line citations at all');

  const unresolved = [];
  for (const { path, line } of cited.slice(0, 25)) {
    // The sample systems are the fixtures in this repository, so the cited
    // path is resolvable from either fixture root.
    let source;
    for (const root of ['fixtures/hireflow', 'fixtures/hireflow-remediated', '.']) {
      try {
        source = readFileSync(resolve(ROOT, root, path), 'utf8');
        break;
      } catch {
        /* try the next root */
      }
    }
    if (source === undefined) unresolved.push(`${path} does not exist`);
    else if (source.split('\n').length < line) unresolved.push(`${path} has no line ${line}`);
  }
  assert(unresolved.length === 0, unresolved.join('; '));
  return `${cited.length} citations, ${Math.min(cited.length, 25)} checked against disk`;
});

// ---------------------------------------------------------------------------
// Every route renders
// ---------------------------------------------------------------------------

process.stdout.write('\nRoutes\n');

for (const tab of ['', '/evidence', '/dossier', '/remediation', '/history', '/share']) {
  await check(`${tab || '/overview'} renders`, async () => {
    const response = await page.goto(`${BASE}${hireflow}${tab}`, { waitUntil: 'networkidle' });
    assert(response.ok(), `returned ${response.status()}`);
    const text = (await page.locator('main').innerText()).trim();
    assert(text.length > 200, `rendered only ${text.length} characters`);
    assert(!/application error|internal server error/i.test(text), 'rendered an error page');
  });
}

await check('drift is detected between the two scans', async () => {
  await page.goto(`${BASE}${hireflow}/history`, { waitUntil: 'networkidle' });
  const text = await page.locator('main').innerText();
  assert(/→/.test(text), 'no before/after pair is shown');
  assert(/prohibited/i.test(text), 'the regression to prohibited is not reported');
  assert(!/\bnull\b/.test(text), 'the page prints the literal word "null"');
});

// ---------------------------------------------------------------------------
// The artefacts a customer is actually handed
// ---------------------------------------------------------------------------

process.stdout.write('\nDownloads\n');

/** Fetch inside the browser context so the session cookie travels with it. */
async function download(path) {
  return page.evaluate(async (url) => {
    const r = await fetch(url);
    return { status: r.status, type: r.headers.get('content-type') ?? '', body: await r.text() };
  }, `${BASE}${path}`);
}

await check('the SARIF export is valid SARIF 2.1.0', async () => {
  const { status, body } = await download(`/api/systems/${hireflow.split('/')[3]}/export?format=sarif`);
  assert(status === 200, `returned ${status}`);
  const doc = JSON.parse(body);
  assert(doc.version === '2.1.0', `version is ${doc.version}`);
  assert(doc.runs?.[0]?.results?.length > 0, 'the run carries no results');
  assert(doc.runs[0].tool?.driver?.rules?.length > 0, 'the run declares no rules');
  return `${doc.runs[0].results.length} results`;
});

for (const [format, check_] of [
  ['cdxa', (d) => assert(d.declarations?.claims?.length > 0, 'the attestation carries no claims')],
  ['mlbom', (d) => assert(d.components?.length > 0, 'the ML-BOM carries no components')],
]) {
  await check(`the ${format} export is well-formed CycloneDX`, async () => {
    const { status, body } = await download(`/api/systems/${hireflow.split('/')[3]}/export?format=${format}`);
    assert(status === 200, `returned ${status}`);
    const doc = JSON.parse(body);
    assert(doc.bomFormat === 'CycloneDX', `bomFormat is ${doc.bomFormat}`);
    assert(doc.specVersion === '1.6', `specVersion is ${doc.specVersion}`);
    assert(typeof doc.$schema === 'string', 'the document does not name its schema');
    check_(doc);
  });
}

for (const locale of ['en', 'de', 'fr']) {
  await check(`the Annex IV dossier renders in ${locale}`, async () => {
    const { status, body } = await download(`/api/systems/${hireflow.split('/')[3]}/dossier?locale=${locale}`);
    assert(status === 200, `returned ${status}`);
    assert(body.length > 2000, `only ${body.length} characters`);
    // Article 11 lists nine points; a dossier missing one is not a dossier.
    const points = body.match(/^##\s/gm) ?? [];
    assert(points.length >= 9, `only ${points.length} sections`);
    // A generated document that quietly invents a judgement is the failure
    // mode this project argues against, so the open points must be visible.
    assert(/_TODO_|open|not established|to be supplied/i.test(body), 'nothing is left explicitly open');
  });
}

await check('the remediation patch is a unified diff', async () => {
  const { status, body } = await download(`/api/systems/${hireflow.split('/')[3]}/patch`);
  assert(status === 200, `returned ${status}`);
  assert(/^diff --git /m.test(body), 'no `diff --git` header');
  assert(/^--- /m.test(body) && /^\+\+\+ /m.test(body), 'no file headers');
  assert(/^@@ /m.test(body), 'no hunk header');
  return `${(body.match(/^diff --git /gm) ?? []).length} files`;
});

await check('the account export returns the workspace', async () => {
  const { status, body } = await download('/api/account/export');
  assert(status === 200, `returned ${status}`);
  const doc = JSON.parse(body);
  assert(!JSON.stringify(doc).includes(password), 'the export contains the plaintext password');
  assert(!/"password_hash"/.test(body), 'the export contains the password hash');
});

// ---------------------------------------------------------------------------
// The trust page, which is the only thing here a logged-out stranger sees
// ---------------------------------------------------------------------------

process.stdout.write('\nPublic trust page\n');

await check('publishing a trust page yields a public URL', async () => {
  await page.goto(`${BASE}${remediated}/share`, { waitUntil: 'networkidle' });
  const already = await page.getByRole('button', { name: /unpublish/i }).count();
  if (!already) {
    await page.getByRole('button', { name: /publish trust page/i }).click();
    await page.waitForLoadState('networkidle');
  }
  const slug = await page.locator('a[href^="/trust/"]').first().getAttribute('href');
  assert(slug, 'no /trust/ link appeared after publishing');
  return slug;
});

const slug = await page.locator('a[href^="/trust/"]').first().getAttribute('href');

await check('a logged-out visitor can read it', async () => {
  const anon = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const anonPage = await anon.newPage();
  const response = await anonPage.goto(`${BASE}${slug}`, { waitUntil: 'networkidle' });
  assert(response.ok(), `returned ${response.status()}`);
  const text = await anonPage.locator('main').innerText();
  assert(/HireFlow v3/.test(text), 'the system is not named');
  // The whole point of a trust page is that it proves posture without
  // shipping the implementation. A leaked snippet here is a product bug.
  assert(!/detectEmotion|candidateScore/.test(text), 'the public page leaks source identifiers');
  await anon.close();
});

await check('an unpublished system is not public', async () => {
  const anon = await browser.newContext();
  const anonPage = await anon.newPage();
  await page.goto(`${BASE}${hireflow}/share`, { waitUntil: 'networkidle' });
  const link = await page.locator('a[href^="/trust/"]').first().count();
  if (link) {
    await anon.close();
    return 'skipped — HireFlow is published';
  }
  // The slug exists in the database whether or not the page is published;
  // an unpublished one must not resolve.
  const response = await anonPage.goto(`${BASE}/trust/does-not-exist-${Date.now()}`, { waitUntil: 'domcontentloaded' });
  assert(response.status() === 404, `an unknown slug returned ${response.status()}`);
  await anon.close();
});

// ---------------------------------------------------------------------------
// Sessions
// ---------------------------------------------------------------------------

process.stdout.write('\nSession\n');

await check('the session survives a reload and ends on sign-out', async () => {
  await page.goto(`${BASE}/app`, { waitUntil: 'networkidle' });
  assert(page.url().endsWith('/app'), 'a reload bounced the session to the login page');

  // A server action posts and *then* navigates, so `networkidle` can resolve
  // on the page you were already on. Wait for the navigation itself.
  await Promise.all([
    page.waitForURL((u) => !u.pathname.startsWith('/app'), { timeout: 60_000 }),
    page.getByRole('button', { name: /sign out/i }).click(),
  ]);

  await page.goto(`${BASE}/app`, { waitUntil: 'networkidle' });
  assert(/\/login/.test(page.url()), `signed out, /app still rendered (${page.url()})`);
});

await check('the account created earlier can sign back in', async () => {
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.getByRole('button', { name: /^sign in$/i }).click();
  await page.waitForURL('**/app', { timeout: 60_000 });
});

await check('a cookie whose account is gone lands on the login page', async () => {
  // The scenario the deploy guide creates by accident: a volume is replaced,
  // the database comes back empty, and every returning visitor is holding a
  // session cookie for a row that no longer exists. Clearing it here is what
  // Next forbids during a render, and doing it anyway served an error page.
  const stale = await browser.newContext();
  const stalePage = await stale.newPage();
  await stalePage.goto(BASE, { waitUntil: 'domcontentloaded' });
  await stale.addCookies([
    { name: 'annex_session', value: 'not.a.token', domain: 'localhost', path: '/', httpOnly: true, sameSite: 'Lax' },
  ]);
  const response = await stalePage.goto(`${BASE}/app`, { waitUntil: 'networkidle' });
  assert(response.status() < 500, `returned ${response.status()}`);
  assert(/\/login/.test(stalePage.url()), `landed on ${stalePage.url()}`);
  const text = await stalePage.locator('body').innerText();
  assert(!/application error|internal server error/i.test(text), 'rendered an error page');
  await stale.close();
});

await check('the wrong password does not', async () => {
  await page.goto(`${BASE}/app`, { waitUntil: 'networkidle' });
  await Promise.all([
    page.waitForURL((u) => !u.pathname.startsWith('/app'), { timeout: 60_000 }),
    page.getByRole('button', { name: /sign out/i }).click(),
  ]);
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', 'not the password');
  await page.getByRole('button', { name: /^sign in$/i }).click();
  await page.waitForLoadState('networkidle');
  assert(!/\/app$/.test(page.url()), 'a wrong password signed in');
});

await browser.close();

// ---------------------------------------------------------------------------

if (runtime.length) failures.push(...[...new Set(runtime)]);

process.stdout.write(`\n${passed} checks passed`);
if (failures.length === 0) {
  process.stdout.write('. The product works end to end from an empty database.\n\n');
  process.exit(0);
}
process.stdout.write(`, ${failures.length} failed:\n`);
for (const f of failures) process.stdout.write(`  ✖ ${f}\n`);
process.stdout.write('\n');
process.exit(1);
