import { notFound } from 'next/navigation';
import { ALL_PACKS, ledgerFingerprint } from '@annex/engine';
import { requireUser } from '@/server/auth';
import { getSystem, latestReport, listSystems, sampleByKey } from '@/server/systems';
import { EvidenceExplorer } from '@/components/evidence-explorer';
import { Empty, Panel } from '@/components/primitives';

export const dynamic = 'force-dynamic';

export default async function EvidencePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const system = getSystem(id, user.id);
  if (!system) notFound();
  const latest = latestReport(system.id);

  if (!latest) {
    return (
      <Panel>
        <Empty title="No completed scan yet" body="Run a scan to populate the evidence explorer." />
      </Panel>
    );
  }

  const packNames = Object.fromEntries(ALL_PACKS.map((p) => [p.id, p.name]));

  // The before-or-after of this system, if the workspace holds it. Only the
  // bundled samples declare a counterpart; a repository somebody added has
  // none, and the explorer simply says less in that case.
  const counterpartKey = sampleByKey(system.source)?.compareWith;
  const counterpart = counterpartKey
    ? listSystems(user.id).find((s) => s.source === counterpartKey)
    : undefined;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p style={{ fontSize: 13.5, color: 'var(--ink-soft)', margin: 0, maxWidth: '78ch' }}>
          Every obligation, the text of the law that imposes it, and the lines of your code that answer it.
          Hashed into a chain rooted at <span className="code">{ledgerFingerprint(latest.report.ledger)}</span> —
          re-run the scan on the same commit and you get the same root.
        </p>
      </div>
      <EvidenceExplorer
        controls={latest.report.controls}
        packNames={packNames}
        systemId={system.id}
        {...(counterpart ? { compareTo: { href: `/app/s/${counterpart.id}/evidence`, name: counterpart.name } } : {})}
      />
    </div>
  );
}
