import { notFound } from 'next/navigation';
import { diffReports } from '@annex/engine';
import { requireUser } from '@/server/auth';
import { getSystem, latestReport, listScans, previousReport } from '@/server/systems';
import { Empty, Panel, Stat } from '@/components/primitives';

export const dynamic = 'force-dynamic';

export default async function HistoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const system = getSystem(id, user.id);
  if (!system) notFound();

  const scans = listScans(system.id);
  const latest = latestReport(system.id);
  const previous = previousReport(system.id);
  const drift = latest && previous ? diffReports(previous.report, latest.report) : undefined;

  return (
    <div className="space-y-5">
      <Panel title="Substantial modification">
        <p className="legal" style={{ fontSize: 14.5, color: 'var(--ink-soft)', margin: 0, maxWidth: '78ch' }}>
          Article 3(23) defines a substantial modification as a change, not foreseen in the initial conformity
          assessment, that affects compliance with Chapter III Section 2 or modifies the intended purpose.
          Article 43(4) then requires a new conformity assessment. Only something that reads the code can tell
          you a modification was substantial — which is the one thing a questionnaire can never do.
        </p>

        {!drift ? (
          <div className="mt-5">
            <Empty
              title="Not enough history yet"
              body="Annex compares consecutive scans of the same system. Re-scan after a change to see whether it was a substantial modification."
            />
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className={`badge ${drift.substantial ? 'badge-bad' : 'badge-ok'}`}>
                {drift.substantial ? 'Substantial modification' : 'No substantial modification'}
              </span>
              <span style={{ fontSize: 12.5, color: 'var(--ink-faint)' }}>
                {new Date(previous!.record.createdAt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}
                {' → '}
                {new Date(latest!.record.createdAt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}
              </span>
            </div>

            <p className="legal" style={{ fontSize: 14.5, marginInline: 0 }}>{drift.summary}</p>

            <div className="grid gap-5 sm:grid-cols-3">
              <Stat
                label="Conformity"
                value={`${previous!.report.score} → ${latest!.report.score}`}
                tone={drift.scoreDelta >= 0 ? 'ok' : 'bad'}
              />
              <Stat label="Tier" value={`${drift.previousTier} → ${drift.currentTier}`} tone={drift.classificationChanged ? 'bad' : undefined} />
              <Stat label="Controls changed" value={drift.regressed.length + drift.improved.length} />
            </div>

            {drift.regressed.length > 0 ? (
              <div>
                <div className="eyebrow">Regressed</div>
                <ul className="mt-2 space-y-1.5" style={{ listStyle: 'none', margin: '8px 0 0', padding: 0 }}>
                  {drift.regressed.map((r) => (
                    <li key={r.controlId} style={{ fontSize: 13.5 }}>
                      <span className="badge badge-bad">{r.from} → {r.to}</span>{' '}
                      <span style={{ fontWeight: 560 }}>{r.title}</span>{' '}
                      <span className="code" style={{ color: 'var(--ink-faint)' }}>{r.controlId}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {drift.improved.length > 0 ? (
              <div>
                <div className="eyebrow">Improved</div>
                <ul className="mt-2 space-y-1.5" style={{ listStyle: 'none', margin: '8px 0 0', padding: 0 }}>
                  {drift.improved.map((r) => (
                    <li key={r.controlId} style={{ fontSize: 13.5 }}>
                      <span className="badge badge-ok">{r.from} → {r.to}</span>{' '}
                      <span style={{ fontWeight: 560 }}>{r.title}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        )}
      </Panel>

      <Panel title={`Scan history (${scans.length})`} tight>
        <div className="scroll-x">
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'var(--sunken)' }}>
                {['When', 'Status', 'Tier', 'Score', 'In force', 'Ledger root'].map((h) => (
                  <th key={h} style={{ textAlign: 'left', padding: '9px 16px', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {scans.map((scan) => (
                <tr key={scan.id} style={{ borderTop: '1px solid var(--line)' }}>
                  <td style={{ padding: '9px 16px', whiteSpace: 'nowrap' }}>
                    {new Date(scan.createdAt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}
                  </td>
                  <td style={{ padding: '9px 16px' }}>
                    <span className={`badge ${scan.status === 'complete' ? 'badge-ok' : scan.status === 'failed' ? 'badge-bad' : 'badge-neutral'}`}>
                      {scan.status}
                    </span>
                  </td>
                  <td style={{ padding: '9px 16px' }}>{scan.tier ?? '—'}</td>
                  <td style={{ padding: '9px 16px', fontWeight: 600 }}>{scan.score ?? '—'}</td>
                  <td style={{ padding: '9px 16px' }}>{scan.liveScore ?? '—'}</td>
                  <td className="code" style={{ padding: '9px 16px', color: 'var(--ink-faint)' }}>
                    {scan.ledgerRoot?.slice(0, 16) ?? scan.error?.slice(0, 40) ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
