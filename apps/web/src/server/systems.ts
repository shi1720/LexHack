import { resolve } from 'node:path';
import {
  ingestDirectory,
  ingestGitHub,
  scan,
  type RepoSnapshot,
  type ScanReport,
} from '@annex/engine';
import { db, newId, newSlug, nowIso } from './db';

export type SourceKind = 'github' | 'sample';

export interface System {
  id: string;
  userId: string;
  name: string;
  purpose: string;
  source: string;
  sourceKind: SourceKind;
  markets: string[];
  trustSlug: string;
  trustPublic: boolean;
  createdAt: string;
}

export interface ScanRecord {
  id: string;
  systemId: string;
  status: 'queued' | 'running' | 'complete' | 'failed';
  score: number | null;
  liveScore: number | null;
  tier: string | null;
  ledgerRoot: string | null;
  error: string | null;
  createdAt: string;
}

interface SystemRow {
  id: string; user_id: string; name: string; purpose: string; source: string;
  source_kind: string; markets: string; trust_slug: string; trust_public: number; created_at: string;
}

interface ScanRow {
  id: string; system_id: string; status: string; score: number | null; live_score: number | null;
  tier: string | null; ledger_root: string | null; error: string | null; report: string | null; created_at: string;
}

function toSystem(row: SystemRow): System {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    purpose: row.purpose,
    source: row.source,
    sourceKind: row.source_kind as SourceKind,
    markets: row.markets.split(',').filter(Boolean),
    trustSlug: row.trust_slug,
    trustPublic: row.trust_public === 1,
    createdAt: row.created_at,
  };
}

function toScanRecord(row: ScanRow): ScanRecord {
  return {
    id: row.id,
    systemId: row.system_id,
    status: row.status as ScanRecord['status'],
    score: row.score,
    liveScore: row.live_score,
    tier: row.tier,
    ledgerRoot: row.ledger_root,
    error: row.error,
    createdAt: row.created_at,
  };
}

// ---------------------------------------------------------------------------
// Sample systems — bundled so a scan works with no network and no credentials
// ---------------------------------------------------------------------------

export interface Sample {
  key: string;
  name: string;
  purpose: string;
  dir: string;
  markets: string[];
  headline: string;
  blurb: string;
  expect: string;
}

export const SAMPLES: Sample[] = [
  {
    key: 'hireflow',
    name: 'HireFlow',
    purpose: 'Ranks and filters job applicants against a posting for high-volume recruiting teams.',
    dir: 'fixtures/hireflow',
    markets: ['eu', 'us-nyc', 'us-federal'],
    headline: 'Hiring platform · contains a prohibited practice',
    blurb:
      'A well-engineered recruiting product: CI, tests, auth, structured logging. It also infers candidate emotion from video interviews, which Article 5(1)(f) prohibits outright.',
    expect: 'prohibited',
  },
  {
    key: 'hireflow-remediated',
    name: 'HireFlow v3',
    purpose: 'Ranks and prioritises job applicants against a posting for recruiters. Human review on every adverse outcome.',
    dir: 'fixtures/hireflow-remediated',
    markets: ['eu', 'us-nyc', 'us-federal'],
    headline: 'The same product, after the work',
    blurb:
      'The affect-inference feature removed, human oversight wired in, inference logging, bias audit, and the Article 9/10/13/72/73 documents written. Scan both and diff them.',
    expect: 'high',
  },
  {
    key: 'lendwise',
    name: 'LendWise',
    purpose: 'Scores consumer loan applications and returns a probability of default with an underwriter review band.',
    dir: 'fixtures/lendwise',
    markets: ['eu', 'us-co', 'us-federal'],
    headline: 'Python credit scoring · Annex III 5(b)',
    blurb:
      'A competent ML team with no compliance programme: fairness testing and a model card exist, the risk management system and the record-keeping do not.',
    expect: 'high',
  },
  {
    key: 'supportly',
    name: 'Supportly',
    purpose: 'Answers customer support questions for e-commerce brands from their own help centre articles.',
    dir: 'fixtures/supportly',
    markets: ['eu'],
    headline: 'Six-person startup · three obligations already live',
    blurb:
      'No high-risk use case at all. Still in scope today: Article 50(1) disclosure, Article 50(2) marking, Article 4 literacy. The case almost everybody thinks does not apply to them.',
    expect: 'transparency',
  },
];

export function sampleByKey(key: string): Sample | undefined {
  return SAMPLES.find((s) => s.key === key);
}

/** Fixtures live in the repository, so a demo works with no network at all. */
function sampleDir(sample: Sample): string {
  const root = process.env.ANNEX_FIXTURES ?? resolve(process.cwd(), '../..');
  return resolve(root, sample.dir);
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export function listSystems(userId: string): (System & { latest?: ScanRecord })[] {
  const rows = db().prepare('SELECT * FROM systems WHERE user_id = ? ORDER BY created_at DESC').all(userId) as SystemRow[];
  return rows.map((row) => {
    const latest = db()
      .prepare('SELECT * FROM scans WHERE system_id = ? ORDER BY created_at DESC LIMIT 1')
      .get(row.id) as ScanRow | undefined;
    const system = toSystem(row);
    return latest ? { ...system, latest: toScanRecord(latest) } : system;
  });
}

export function getSystem(id: string, userId?: string): System | undefined {
  const row = db().prepare('SELECT * FROM systems WHERE id = ?').get(id) as SystemRow | undefined;
  if (!row) return undefined;
  if (userId && row.user_id !== userId) return undefined;
  return toSystem(row);
}

export function getSystemBySlug(slug: string): System | undefined {
  const row = db().prepare('SELECT * FROM systems WHERE trust_slug = ?').get(slug) as SystemRow | undefined;
  return row ? toSystem(row) : undefined;
}

export function createSystem(input: {
  userId: string;
  name: string;
  purpose: string;
  source: string;
  sourceKind: SourceKind;
  markets: string[];
}): System {
  const id = newId('sys');
  db()
    .prepare(
      `INSERT INTO systems (id, user_id, name, purpose, source, source_kind, markets, trust_slug, trust_public, created_at)
       VALUES (@id, @userId, @name, @purpose, @source, @sourceKind, @markets, @trustSlug, 0, @createdAt)`,
    )
    .run({
      id,
      userId: input.userId,
      name: input.name,
      purpose: input.purpose,
      source: input.source,
      sourceKind: input.sourceKind,
      markets: input.markets.join(','),
      trustSlug: newSlug(input.name),
      createdAt: nowIso(),
    });
  return getSystem(id)!;
}

export function updateSystem(id: string, patch: Partial<Pick<System, 'name' | 'purpose' | 'markets' | 'trustPublic'>>): void {
  const current = getSystem(id);
  if (!current) return;
  db()
    .prepare('UPDATE systems SET name = @name, purpose = @purpose, markets = @markets, trust_public = @trustPublic WHERE id = @id')
    .run({
      id,
      name: patch.name ?? current.name,
      purpose: patch.purpose ?? current.purpose,
      markets: (patch.markets ?? current.markets).join(','),
      trustPublic: (patch.trustPublic ?? current.trustPublic) ? 1 : 0,
    });
}

export function deleteSystem(id: string, userId: string): void {
  db().prepare('DELETE FROM systems WHERE id = ? AND user_id = ?').run(id, userId);
}

export function listScans(systemId: string, limit = 20): ScanRecord[] {
  const rows = db()
    .prepare('SELECT * FROM scans WHERE system_id = ? ORDER BY created_at DESC LIMIT ?')
    .all(systemId, limit) as ScanRow[];
  return rows.map(toScanRecord);
}

export function getReport(scanId: string): ScanReport | undefined {
  const row = db().prepare('SELECT report FROM scans WHERE id = ?').get(scanId) as { report: string | null } | undefined;
  if (!row?.report) return undefined;
  return JSON.parse(row.report) as ScanReport;
}

export function latestReport(systemId: string): { record: ScanRecord; report: ScanReport } | undefined {
  const row = db()
    .prepare("SELECT * FROM scans WHERE system_id = ? AND status = 'complete' ORDER BY created_at DESC LIMIT 1")
    .get(systemId) as ScanRow | undefined;
  if (!row?.report) return undefined;
  return { record: toScanRecord(row), report: JSON.parse(row.report) as ScanReport };
}

/** The scan before the latest one, for drift detection. */
export function previousReport(systemId: string): { record: ScanRecord; report: ScanReport } | undefined {
  const rows = db()
    .prepare("SELECT * FROM scans WHERE system_id = ? AND status = 'complete' ORDER BY created_at DESC LIMIT 2")
    .all(systemId) as ScanRow[];
  const previous = rows[1];
  if (!previous?.report) return undefined;
  return { record: toScanRecord(previous), report: JSON.parse(previous.report) as ScanReport };
}

// ---------------------------------------------------------------------------
// Running a scan
// ---------------------------------------------------------------------------

export interface RunScanOptions {
  onProgress?: (phase: string, done: number, total: number, detail: string) => void;
  githubToken?: string;
  turnoverEur?: number;
  employees?: number;
  /**
   * Scan a different tree than the system currently points at, and record the
   * result at a given time.
   *
   * Only the demo seeder uses this, and only to do something honest: give
   * HireFlow a real history. Its first scan is the remediated tree as it stood
   * in August; its second is the tree as it stands now, with affect inference
   * reintroduced. The drift between them is a genuine engine output over two
   * genuine snapshots, not a fixture of a screenshot. The alternative was a
   * History page that shows "not enough history yet" under a heading the pitch
   * calls the thing nobody else can build.
   */
  asSample?: string;
  recordedAt?: string;
}

export async function loadSnapshotForSystem(system: System, opts: RunScanOptions = {}): Promise<RepoSnapshot> {
  if (opts.asSample) {
    const sample = sampleByKey(opts.asSample);
    if (!sample) throw new Error(`Unknown sample "${opts.asSample}".`);
    return ingestDirectory(sampleDir(sample), { name: system.name, origin: `sample:${sample.key}` });
  }
  if (system.sourceKind === 'sample') {
    const sample = sampleByKey(system.source);
    if (!sample) throw new Error(`Unknown sample "${system.source}".`);
    return ingestDirectory(sampleDir(sample), { name: sample.name, origin: `sample:${sample.key}` });
  }
  const { snapshot } = await ingestGitHub(system.source, opts.githubToken ? { token: opts.githubToken } : {});
  return snapshot;
}

export async function runScan(system: System, opts: RunScanOptions = {}): Promise<{ record: ScanRecord; report: ScanReport }> {
  const id = newId('scn');
  db()
    .prepare("INSERT INTO scans (id, system_id, status, created_at) VALUES (?, ?, 'running', ?)")
    .run(id, system.id, opts.recordedAt ?? nowIso());

  try {
    const snapshot = await loadSnapshotForSystem(system, opts);
    const report = scan(snapshot, {
      remediate: true,
      profile: {
        name: system.name,
        purpose: system.purpose,
        markets: system.markets,
        ...(opts.turnoverEur ? { turnoverEur: opts.turnoverEur } : {}),
        ...(opts.employees ? { employees: opts.employees } : {}),
      },
      onProgress: opts.onProgress,
    });

    db()
      .prepare(
        `UPDATE scans SET status = 'complete', score = @score, live_score = @liveScore, tier = @tier,
         ledger_root = @ledgerRoot, report = @report WHERE id = @id`,
      )
      .run({
        id,
        score: report.score,
        liveScore: report.liveScore,
        tier: report.classification.tier,
        ledgerRoot: report.ledger.root,
        report: JSON.stringify(report),
      });

    const record = db().prepare('SELECT * FROM scans WHERE id = ?').get(id) as ScanRow;
    return { record: toScanRecord(record), report };
  } catch (err) {
    db().prepare("UPDATE scans SET status = 'failed', error = ? WHERE id = ?").run((err as Error).message, id);
    throw err;
  }
}
