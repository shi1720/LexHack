import Link from 'next/link';
import { ALL_PACKS, CORPUS_SIZE } from '@annex/engine';
import { currentUser } from '@/server/auth';
import { listSystems, latestReport } from '@/server/systems';
import { seedDemoScans } from '@/server/seed-demo';
import { Empty, Panel, ScoreDial, StatusBadge, TierBadge, money, relativeDays } from '@/components/primitives';

export const metadata = { title: 'Systems' };
export const dynamic = 'force-dynamic';

const DAY = 86_400_000;

export default async function Dashboard() {
  const user = (await currentUser())!;

  // A first visit lands on populated data, not four spinners.
  await seedDemoScans(user.id, {
    ...(user.turnoverEur ? { turnoverEur: user.turnoverEur } : {}),
    ...(user.employees ? { employees: user.employees } : {}),
  });

  const systems = listSystems(user.id);
  const reports = systems.map((s) => ({ system: s, data: latestReport(s.id) }));

  const scanned = reports.filter((r) => r.data);
  const liveGaps = scanned.flatMap((r) =>
    r.data!.report.controls.filter((c) => c.inForce && (c.status === 'missing' || c.status === 'partial')),
  );
  const prohibitions = scanned.filter((r) => r.data!.report.classification.tier === 'prohibited');
  // Only euro-denominated ceilings are summed. A NYC per-day civil penalty is
  // a different kind of number and is shown on the system it belongs to.
  const totalExposure = scanned.reduce(
    (n, r) => n + (r.data!.report.exposure.currency === 'EUR' ? r.data!.report.exposure.maxFine : 0),
    0,
  );

  const nextMilestone = ALL_PACKS.flatMap((p) => p.milestones)
    .map((m) => ({ ...m, days: Math.round((new Date(m.date).getTime() - Date.now()) / DAY) }))
    .filter((m) => m.days > 0)
    .sort((a, b) => a.days - b.days)[0];

  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 650, letterSpacing: '-0.025em', margin: 0 }}>AI systems</h1>
          <p style={{ color: 'var(--ink-faint)', fontSize: 13.5, margin: '5px 0 0' }}>
            {systems.length} registered · {CORPUS_SIZE} obligations in the corpus · scanned against{' '}
            {ALL_PACKS.length} rule packs
          </p>
        </div>
        <Link className="btn btn-primary" href="/app/new">
          Add system
        </Link>
      </div>

      {/* Portfolio strip ------------------------------------------------ */}
      {scanned.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Tile
            label="In force and failing"
            value={String(liveGaps.length)}
            tone={liveGaps.length > 0 ? 'bad' : 'ok'}
            hint="obligations binding today"
          />
          <Tile
            label="Prohibited practices"
            value={String(prohibitions.length)}
            tone={prohibitions.length > 0 ? 'bad' : 'ok'}
            hint={prohibitions.length ? prohibitions.map((p) => p.system.name).join(', ') : 'none detected'}
          />
          <Tile
            label="Statutory maximum"
            value={money(totalExposure)}
            tone={totalExposure > 0 ? 'warn' : 'ok'}
            hint="ceiling, in force today"
          />
          <Tile
            label="Next deadline"
            value={nextMilestone ? relativeDays(nextMilestone.days) : '—'}
            hint={nextMilestone ? `${nextMilestone.label} · ${nextMilestone.date}` : undefined}
          />
        </div>
      ) : null}

      {/* Systems -------------------------------------------------------- */}
      {systems.length === 0 ? (
        <Panel>
          <Empty
            title="No systems yet"
            body="Point Annex at a GitHub repository, or start with one of the four bundled sample codebases — including one that contains a practice prohibited in the EU today."
            action={
              <Link className="btn btn-primary" href="/app/new">
                Add a system
              </Link>
            }
          />
        </Panel>
      ) : (
        <div className="space-y-3">
          {reports.map(({ system, data }) => (
            <article key={system.id} className="card">
              <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/app/s/${system.id}`}
                      style={{ fontSize: 17, fontWeight: 620, letterSpacing: '-0.015em', textDecoration: 'none' }}
                    >
                      {system.name}
                    </Link>
                    {data ? <TierBadge tier={data.report.classification.tier} /> : <span className="badge badge-neutral">Not scanned</span>}
                    {system.trustPublic ? <span className="badge badge-info">Trust page live</span> : null}
                  </div>

                  <p style={{ fontSize: 13.5, color: 'var(--ink-soft)', margin: '7px 0 0', maxWidth: '72ch' }}>
                    {system.purpose || 'No intended purpose recorded — the sentence that decides the classification.'}
                  </p>

                  {data ? (
                    <div className="mt-3.5 flex flex-wrap items-center gap-x-5 gap-y-1.5" style={{ fontSize: 12.5, color: 'var(--ink-faint)' }}>
                      <span>
                        <strong style={{ color: 'var(--ink)' }}>
                          {data.report.controls.filter((c) => c.status === 'satisfied').length}
                        </strong>{' '}
                        evidenced
                      </span>
                      <span>
                        <strong style={{ color: 'var(--crimson)' }}>
                          {data.report.controls.filter((c) => c.status === 'missing').length}
                        </strong>{' '}
                        with no evidence
                      </span>
                      <span>
                        <strong style={{ color: 'var(--amber)' }}>
                          {data.report.controls.filter((c) => c.inForce && c.status !== 'satisfied' && c.status !== 'not_applicable').length}
                        </strong>{' '}
                        failing today
                      </span>
                      <span className="code">{data.report.ledger.root.slice(0, 12)}</span>
                      <span>{data.report.durationMs} ms</span>
                    </div>
                  ) : null}
                </div>

                {data ? (
                  <div className="flex items-center gap-6">
                    <ScoreDial score={data.report.score} label="Conformity" size={92} />
                    <div className="hidden sm:block">
                      <ScoreDial score={data.report.liveScore} label="In force today" size={92} />
                    </div>
                  </div>
                ) : null}

                <div className="flex shrink-0 gap-2">
                  <Link className="btn btn-sm" href={`/app/s/${system.id}`}>
                    Open
                  </Link>
                </div>
              </div>

              {data && data.report.classification.findings.length > 0 ? (
                <div className="border-t px-5 py-3" style={{ borderColor: 'var(--line)', background: 'var(--sunken)' }}>
                  <div className="flex flex-wrap items-center gap-2">
                    {data.report.classification.findings.slice(0, 3).map((f) => (
                      <span key={f.id} className="badge badge-neutral" title={f.title}>
                        <span className="cite" style={{ fontSize: 11.5 }}>
                          {f.citations[0] ? `${f.citations[0].short} ${f.citations[0].locator}` : f.id}
                        </span>
                      </span>
                    ))}
                    {data.report.classification.findings.length > 3 ? (
                      <span style={{ fontSize: 12, color: 'var(--ink-faint)' }}>
                        +{data.report.classification.findings.length - 3} more
                      </span>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </article>
          ))}
        </div>
      )}

      {/* Corpus --------------------------------------------------------- */}
      <Panel title="Rule packs in this workspace">
        <div className="space-y-3.5">
          {ALL_PACKS.map((pack) => {
            const covered = reports.some((r) => r.system.markets.some((m) => packMarkets(pack.id).includes(m)));
            return (
              <div key={pack.id} className="flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>{pack.name}</span>{' '}
                  <span className="code" style={{ color: 'var(--ink-faint)' }}>
                    {pack.version}
                  </span>
                  <p style={{ fontSize: 12.5, color: 'var(--ink-faint)', margin: '2px 0 0', maxWidth: '78ch' }}>
                    {pack.summary}
                  </p>
                </div>
                <div className="flex items-center gap-2 whitespace-nowrap">
                  <span style={{ fontSize: 12, color: 'var(--ink-faint)' }}>{pack.controls.length} obligations</span>
                  {covered ? <StatusBadge status="satisfied" /> : <span className="badge badge-neutral">Not in scope</span>}
                </div>
              </div>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}

function packMarkets(packId: string): string[] {
  switch (packId) {
    case 'eu-ai-act':
    case 'gdpr':
      return ['eu'];
    case 'nyc-ll144':
      return ['us-nyc'];
    case 'colorado-admt':
      return ['us-co'];
    default:
      return ['us-federal'];
  }
}

function Tile({ label, value, tone, hint }: { label: string; value: string; tone?: 'bad' | 'warn' | 'ok'; hint?: string }) {
  const colour = tone === 'bad' ? 'var(--crimson)' : tone === 'warn' ? 'var(--amber)' : tone === 'ok' ? 'var(--moss)' : 'var(--ink)';
  return (
    <div className="card p-4">
      <div className="eyebrow">{label}</div>
      <div style={{ fontSize: 26, fontWeight: 650, letterSpacing: '-0.03em', color: colour, lineHeight: 1.25 }}>{value}</div>
      {hint ? (
        <div style={{ fontSize: 12, color: 'var(--ink-faint)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {hint}
        </div>
      ) : null}
    </div>
  );
}
