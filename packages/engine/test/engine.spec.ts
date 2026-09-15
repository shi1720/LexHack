import { describe, expect, it } from 'vitest';
import { buildSnapshot, extractDependencies } from '../src/ingest/snapshot.js';
import { parseGitHubUrl, IngestError } from '../src/ingest/github.js';
import { readTar, stripRootDir } from '../src/ingest/tar.js';
import { detectLanguage } from '../src/ingest/languages.js';
import { buildLedger, verifyLedger, verifyLedgerAgainstResults, ledgerFingerprint } from '../src/ledger/index.js';
import { scoreControls, estimateExposure, buildClock } from '../src/evaluate/index.js';
import { diffReports } from '../src/scan.js';
import { renderPatch } from '../src/remediate/index.js';
import { EU_AI_ACT_PACK } from '../src/packs/eu-ai-act.js';
import { ALL_PACKS, packsForMarkets } from '../src/packs/index.js';
import { BASE_APP, scanFiles, statusOf, firedSignals } from './helpers.js';
import type { ControlResult } from '../src/types.js';

// ---------------------------------------------------------------------------
// Ingest
// ---------------------------------------------------------------------------

describe('snapshot', () => {
  it('is content-addressed and stable across file ordering', () => {
    const a = buildSnapshot({ name: 'r', files: [{ path: 'a.ts', bytes: 'x' }, { path: 'b.ts', bytes: 'y' }] });
    const b = buildSnapshot({ name: 'r', files: [{ path: 'b.ts', bytes: 'y' }, { path: 'a.ts', bytes: 'x' }] });
    expect(a.id).toBe(b.id);
  });

  it('changes its id when any byte of any file changes', () => {
    const a = buildSnapshot({ name: 'r', files: [{ path: 'a.ts', bytes: 'x' }] });
    const b = buildSnapshot({ name: 'r', files: [{ path: 'a.ts', bytes: 'X' }] });
    expect(a.id).not.toBe(b.id);
  });

  it('skips dependency directories but keeps lockfiles', () => {
    const snap = buildSnapshot({
      name: 'r',
      files: [
        { path: 'node_modules/left-pad/index.js', bytes: 'x' },
        { path: '.git/config', bytes: 'x' },
        { path: 'src/app.ts', bytes: 'x' },
        { path: 'package-lock.json', bytes: '{}' },
      ],
    });
    expect(snap.files.map((f) => f.path)).toEqual(['package-lock.json', 'src/app.ts']);
  });

  it('marks oversized and binary files as skipped rather than dropping them', () => {
    const snap = buildSnapshot({
      name: 'r',
      files: [
        { path: 'big.ts', bytes: 'x'.repeat(600 * 1024) },
        { path: 'logo.png', bytes: 'not really a png' },
      ],
    });
    expect(snap.files.find((f) => f.path === 'big.ts')?.skipped).toBe('too-large');
    expect(snap.files.find((f) => f.path === 'logo.png')).toBeUndefined();
  });

  it('survives a malformed manifest', () => {
    expect(() =>
      buildSnapshot({ name: 'r', files: [{ path: 'package.json', bytes: '{ not json' }] }),
    ).not.toThrow();
  });
});

describe('dependency extraction', () => {
  it('reads npm, pypi, go and cargo manifests', () => {
    const snap = buildSnapshot({
      name: 'r',
      files: [
        { path: 'package.json', bytes: JSON.stringify({ dependencies: { openai: '^4.0.0' }, devDependencies: { vitest: '^2' } }) },
        { path: 'requirements.txt', bytes: '# comment\nscikit-learn==1.6.0\ntorch>=2.0\n' },
        { path: 'go.mod', bytes: 'module x\n\nrequire github.com/gin-gonic/gin v1.10.0\n' },
        { path: 'Cargo.toml', bytes: '[dependencies]\nserde = "1.0"\n' },
      ],
    });
    const names = snap.dependencies.map((d) => d.name);
    expect(names).toContain('openai');
    expect(names).toContain('vitest');
    expect(names).toContain('scikit-learn');
    expect(names).toContain('torch');
    expect(names).toContain('github.com/gin-gonic/gin');
    expect(names).toContain('serde');
    expect(snap.dependencies.find((d) => d.name === 'vitest')?.dev).toBe(true);
  });
});

describe('github url parsing', () => {
  it.each([
    ['owner/repo', 'owner', 'repo', undefined],
    ['https://github.com/owner/repo', 'owner', 'repo', undefined],
    ['https://github.com/owner/repo.git', 'owner', 'repo', undefined],
    ['github.com/owner/repo/', 'owner', 'repo', undefined],
    ['https://github.com/owner/repo/tree/main', 'owner', 'repo', 'main'],
    ['https://github.com/owner/repo/tree/feat/x', 'owner', 'repo', 'feat/x'],
  ])('parses %s', (input, owner, repo, ref) => {
    const parsed = parseGitHubUrl(input);
    expect(parsed.owner).toBe(owner);
    expect(parsed.repo).toBe(repo);
    expect(parsed.ref).toBe(ref);
  });

  it('rejects non-GitHub hosts and carries an actionable hint', () => {
    expect(() => parseGitHubUrl('https://gitlab.com/a/b')).toThrow(IngestError);
    try {
      parseGitHubUrl('not a url at all !!');
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(IngestError);
      expect((err as IngestError).code).toBe('invalid-url');
      expect((err as IngestError).hint).toContain('owner/repo');
    }
  });
});

describe('tar reader', () => {
  function tarEntry(name: string, body: string): Buffer {
    const header = Buffer.alloc(512);
    header.write(name, 0, 'utf8');
    header.write('0000644\0', 100);
    header.write('0000000\0', 108);
    header.write('0000000\0', 116);
    header.write(body.length.toString(8).padStart(11, '0') + '\0', 124);
    header.write('00000000000\0', 136);
    header.write('        ', 148); // checksum placeholder
    header.write('0', 156);
    header.write('ustar\x0000', 257);
    let sum = 0;
    for (const b of header) sum += b;
    header.write(sum.toString(8).padStart(6, '0') + '\0 ', 148);
    const content = Buffer.alloc(Math.ceil(body.length / 512) * 512);
    content.write(body);
    return Buffer.concat([header, content]);
  }

  it('reads regular files and strips the GitHub root directory', () => {
    const tar = Buffer.concat([
      tarEntry('owner-repo-abc123/README.md', '# hi'),
      tarEntry('owner-repo-abc123/src/a.ts', 'const a = 1;'),
      Buffer.alloc(1024),
    ]);
    const entries = stripRootDir(readTar(tar));
    expect(entries.map((e) => e.path)).toEqual(['README.md', 'src/a.ts']);
    expect(Buffer.from(entries[0]!.bytes).toString()).toBe('# hi');
  });
});

describe('language detection', () => {
  it.each([
    ['src/a.tsx', 'typescript'],
    ['main.py', 'python'],
    ['README.md', 'markdown'],
    ['Dockerfile', 'shell'],
    ['config.yml', 'yaml'],
    ['unknown.qqq', 'other'],
  ])('%s -> %s', (path, lang) => {
    expect(detectLanguage(path)).toBe(lang);
  });
});

// ---------------------------------------------------------------------------
// Evidence ledger
// ---------------------------------------------------------------------------

describe('evidence ledger', () => {
  const versions = { 'eu-ai-act': '2026.09.1' };
  const results: ControlResult[] = [
    {
      controlId: 'a.one', pack: 'eu-ai-act', title: 'One', obligation: 'o', family: 'transparency',
      severity: 'high', weight: 5, status: 'satisfied', score: 1, finding: 'f', citations: [],
      evidence: [{ path: 'src/a.ts', line: 3, snippet: 'const x = 1;', fileSha256: 'abc', kind: 'code' }],
      method: 'static-analysis', remediationAvailable: false, appliesFrom: '2026-08-02', inForce: true,
    },
    {
      controlId: 'a.two', pack: 'eu-ai-act', title: 'Two', obligation: 'o', family: 'record-keeping',
      severity: 'high', weight: 5, status: 'missing', score: 0, finding: 'f', citations: [],
      evidence: [], method: 'static-analysis', remediationAvailable: false, appliesFrom: '2027-12-02', inForce: false,
    },
  ];

  it('produces a stable root for the same inputs', () => {
    expect(buildLedger(results, versions).root).toBe(buildLedger(results, versions).root);
  });

  it('is order-independent — controls are canonically sorted', () => {
    expect(buildLedger([...results].reverse(), versions).root).toBe(buildLedger(results, versions).root);
  });

  it('changes the root when a single evidence character changes', () => {
    const tampered = structuredClone(results);
    tampered[0]!.evidence[0]!.snippet = 'const x = 2;';
    expect(buildLedger(tampered, versions).root).not.toBe(buildLedger(results, versions).root);
  });

  it('changes the root when the rule pack version changes', () => {
    expect(buildLedger(results, { 'eu-ai-act': '2027.01.1' }).root).not.toBe(buildLedger(results, versions).root);
  });

  it('verifies an intact chain', () => {
    expect(verifyLedger(buildLedger(results, versions)).valid).toBe(true);
  });

  it('detects a broken link and names the entry', () => {
    const ledger = buildLedger(results, versions);
    ledger.entries[1]!.prevHash = '0'.repeat(64);
    const check = verifyLedger(ledger);
    expect(check.valid).toBe(false);
    expect(check.brokenAt).toBe(1);
    expect(check.reason).toContain('a.two');
  });

  it('detects that the evidence behind a dossier has changed', () => {
    const ledger = buildLedger(results, versions);
    const changed = structuredClone(results);
    changed[0]!.evidence[0]!.fileSha256 = 'deadbeef';
    const check = verifyLedgerAgainstResults(ledger, changed, versions);
    expect(check.valid).toBe(false);
    expect(check.reason).toContain('no longer produces the recorded result');
  });

  it('prints a human-quotable fingerprint', () => {
    expect(ledgerFingerprint(buildLedger(results, versions))).toMatch(/^[0-9A-F]{4}(-[0-9A-F]{4}){3}$/);
  });
});

// ---------------------------------------------------------------------------
// Scoring, exposure, clock
// ---------------------------------------------------------------------------

describe('scoring', () => {
  const base = (over: Partial<ControlResult>): ControlResult => ({
    controlId: 'x', pack: 'eu-ai-act', title: 't', obligation: 'o', family: 'transparency',
    severity: 'high', weight: 5, status: 'satisfied', score: 1, finding: 'f', citations: [],
    evidence: [], method: 'static-analysis', remediationAvailable: false,
    appliesFrom: '2025-02-02', inForce: true, ...over,
  });

  it('excludes not-applicable controls rather than counting them as passes', () => {
    const score = scoreControls([
      base({ controlId: 'a', status: 'missing', score: 0 }),
      base({ controlId: 'b', status: 'not_applicable', score: 1 }),
    ]);
    expect(score).toBe(0);
  });

  it('weights controls by their statutory weight', () => {
    const score = scoreControls([
      base({ controlId: 'a', status: 'satisfied', score: 1, weight: 9 }),
      base({ controlId: 'b', status: 'missing', score: 0, weight: 1 }),
    ]);
    expect(score).toBe(90);
  });

  it('caps the score when a prohibition in force is breached', () => {
    const score = scoreControls([
      ...Array.from({ length: 9 }, (_v, i) => base({ controlId: `ok${i}`, status: 'satisfied', score: 1 })),
      base({ controlId: 'p', family: 'prohibition', status: 'missing', score: 0, severity: 'critical' }),
    ]);
    // A system containing a prohibited practice is not "90% compliant".
    expect(score).toBeLessThanOrEqual(25);
  });

  it('does not cap on a prohibition that is not yet in force', () => {
    const score = scoreControls([
      ...Array.from({ length: 9 }, (_v, i) => base({ controlId: `ok${i}`, status: 'satisfied', score: 1 })),
      base({ controlId: 'p', family: 'prohibition', status: 'missing', score: 0, inForce: false }),
    ]);
    expect(score).toBeGreaterThan(25);
  });
});

describe('exposure', () => {
  const failing: ControlResult[] = [
    {
      controlId: 'eu-ai-act.art50.1.interaction-disclosure', pack: 'eu-ai-act', title: 't', obligation: 'o',
      family: 'transparency', severity: 'high', weight: 8, status: 'missing', score: 0, finding: 'f',
      citations: [], evidence: [], method: 'static-analysis', remediationAvailable: true,
      appliesFrom: '2026-08-02', inForce: true,
    },
  ];

  it('applies the higher-of rule for a large undertaking', () => {
    const e = estimateExposure([EU_AI_ACT_PACK], failing, 900_000_000, false);
    expect(e.maxFineEur).toBe(27_000_000); // 3% of turnover beats EUR 15m
  });

  it('applies the Article 99(6) inversion for an SME', () => {
    const e = estimateExposure([EU_AI_ACT_PACK], failing, 2_000_000, true);
    expect(e.maxFineEur).toBe(60_000); // the *lower* of EUR 15m and 3% of EUR 2m
    expect(e.basis).toContain('99(6)');
  });

  it('counts nothing when no in-force obligation is failing', () => {
    const notYet = [{ ...failing[0]!, inForce: false }];
    expect(estimateExposure([EU_AI_ACT_PACK], notYet, 900_000_000).maxFineEur).toBe(0);
  });
});

describe('compliance clock', () => {
  it('splits milestones into in-force and upcoming around the scan date', () => {
    const clock = buildClock([EU_AI_ACT_PACK], [], new Date('2026-09-15T00:00:00Z'));
    const byLabel = Object.fromEntries(clock.milestones.map((m) => [m.label, m.status]));
    expect(byLabel['Article 50 transparency']).toBe('in-force');
    expect(byLabel['Annex III high-risk obligations']).toBe('upcoming');
  });

  it('carries the post-Omnibus dates, not the original ones', () => {
    const annexIII = EU_AI_ACT_PACK.milestones.find((m) => m.label.startsWith('Annex III'));
    expect(annexIII?.date).toBe('2027-12-02');
  });
});

describe('market scoping', () => {
  it('only evaluates packs for the markets the operator selected', () => {
    expect(packsForMarkets(['eu']).map((p) => p.id).sort()).toEqual(['eu-ai-act', 'gdpr']);
    expect(packsForMarkets(['us-nyc']).map((p) => p.id)).toEqual(['nyc-ll144']);
    expect(packsForMarkets([]).length).toBe(ALL_PACKS.length);
  });
});

// ---------------------------------------------------------------------------
// End to end
// ---------------------------------------------------------------------------

describe('scan pipeline', () => {
  it('is deterministic: the same tree produces the same ledger root', () => {
    const a = scanFiles(BASE_APP);
    const b = scanFiles(BASE_APP);
    expect(a.ledger.root).toBe(b.ledger.root);
    expect(a.score).toBe(b.score);
  });

  it('runs offline in well under a second on a small repository', () => {
    const report = scanFiles(BASE_APP);
    expect(report.durationMs).toBeLessThan(1000);
  });

  it('records a warning rather than failing on an empty repository', () => {
    const report = scanFiles({});
    expect(report.warnings.join(' ')).toContain('No readable source files');
    expect(report.classification.tier).toBe('unknown');
  });

  it('never reports a control without a citation', () => {
    const report = scanFiles(BASE_APP);
    for (const control of report.controls) {
      expect(control.citations.length, control.controlId).toBeGreaterThan(0);
    }
  });

  it('records negative findings as absence evidence rather than silence', () => {
    const report = scanFiles(BASE_APP);
    const missing = report.controls.find((c) => c.status === 'missing' && c.evidence.length > 0);
    expect(missing?.evidence[0]?.kind).toBe('absence');
    expect(missing?.evidence[0]?.snippet).toContain('No match for');
  });

  it('produces an additive remediation plan that renders as a valid patch', () => {
    const report = scanFiles(
      { ...BASE_APP, 'src/chat.tsx': 'export const ChatWindow = () => <MessageList />;' },
      { purpose: 'A chat assistant.' },
      { remediate: true },
    );
    expect(report.remediation).toBeDefined();
    for (const file of report.remediation!.files) {
      expect(file.createOnly).toBe(true);
      expect(Object.keys(BASE_APP)).not.toContain(file.path);
    }
    const patch = renderPatch(report.remediation!);
    expect(patch).toContain('diff --git');
    expect(patch).toContain('new file mode 100644');
    expect(report.remediation!.scoreAfter).toBeGreaterThan(report.remediation!.scoreBefore);
  });
});

describe('substantial modification detection (Article 43(4))', () => {
  const withOversight = {
    ...BASE_APP,
    'src/decide.ts': [
      "export const AI_ENABLED = process.env.AI_ENABLED !== 'false';",
      'export function decide(score: number) {',
      "  if (score < 0.5) return { status: 'pending_review', humanReview: true };",
      "  return { status: 'advance' };",
      '}',
      'export function overrideDecision(id: string, reviewerId: string) { return { id, reviewerId }; }',
    ].join('\n'),
    'src/screen.ts': 'export function screenApplicant(resume: string, jobPosting: string) { return rankCandidate(resume); }\nfunction rankCandidate(r: string) { return 0.5; }',
  };
  const withoutOversight = { ...withOversight, 'src/decide.ts': 'export function decide(score: number) { return { status: score < 0.5 ? "reject" : "advance" }; }' };

  it('flags the removal of a human oversight gate as substantial', () => {
    const before = scanFiles(withOversight, { purpose: 'Screens job applicants.' });
    const after = scanFiles(withoutOversight, { purpose: 'Screens job applicants.' });
    const drift = diffReports(before, after);
    expect(drift.substantial).toBe(true);
    expect(drift.regressed.map((r) => r.controlId)).toContain('eu-ai-act.art14.human-oversight');
    expect(drift.summary).toMatch(/substantial modification/i);
  });

  it('reports no change when nothing changed', () => {
    const drift = diffReports(scanFiles(withOversight), scanFiles(withOversight));
    expect(drift.substantial).toBe(false);
    expect(drift.regressed).toEqual([]);
  });
});

describe('detection behaviour that the product claims', () => {
  it('sees the Article 50(1) gap in a chat UI with no disclosure', () => {
    const report = scanFiles({
      ...BASE_APP,
      'src/Chat.tsx': 'export function ChatWindow() { return <MessageList messages={messages} />; }',
    });
    expect(statusOf(report, 'eu-ai-act.art50.1.interaction-disclosure')).toBe('missing');
  });

  it('accepts a disclosure rendered in the interface', () => {
    const report = scanFiles({
      ...BASE_APP,
      'src/Chat.tsx':
        'export function ChatWindow() { return (<><p role="status">You are chatting with an AI assistant, not a human.</p><MessageList /></>); }',
    });
    expect(statusOf(report, 'eu-ai-act.art50.1.interaction-disclosure')).toBe('satisfied');
  });

  it('rejects a log retention window below the Article 19 six-month floor', () => {
    const report = scanFiles(
      {
        ...BASE_APP,
        'src/screen.ts': 'export function screenApplicant(resume: string, jobPosting: string) { return candidateScore(resume); }\nfunction candidateScore(r: string) { return 1; }',
        'src/log.ts': 'export const auditLog = (e: unknown) => e;\nexport const RETENTION_DAYS = 30;',
      },
      { tierOverride: 'high' },
    );
    const control = report.controls.find((c) => c.controlId === 'eu-ai-act.art19.log-retention');
    expect(control?.status).toBe('missing');
    expect(control?.finding).toContain('30 days');
    expect(control?.gap).toContain('183');
  });

  it('does not treat prose about a prohibited practice as the practice', () => {
    const report = scanFiles({
      'README.md':
        '# Guide\n\nInferring candidate emotion from video interviews is prohibited under Article 5(1)(f) when applicants are screened.',
    });
    expect(report.classification.tier).toBe('unknown');
    expect(firedSignals(report)).not.toContain('domain.emotion.recognition');
  });
});
