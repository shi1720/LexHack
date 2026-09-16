import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { notFound } from 'next/navigation';
import { currentUser, requireUser } from '@/server/auth';
import { getSystem, latestReport, runScan } from '@/server/systems';
import { TierBadge } from '@/components/primitives';
import { Tabs } from '@/components/tabs';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await currentUser();
  const system = user ? getSystem(id, user.id) : undefined;
  return { title: system?.name ?? 'System' };
}

async function rescan(formData: FormData) {
  'use server';
  const user = await requireUser();
  const system = getSystem(String(formData.get('id')), user.id);
  if (!system) return;
  await runScan(system, {
    ...(user.githubToken ? { githubToken: user.githubToken } : {}),
    ...(user.turnoverEur != null ? { turnoverEur: user.turnoverEur } : {}),
    ...(user.employees != null ? { employees: user.employees } : {}),
  }).catch(() => undefined);
  revalidatePath(`/app/s/${system.id}`);
}

export default async function SystemLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const system = getSystem(id, user.id);
  if (!system) notFound();
  const latest = latestReport(system.id);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/app" style={{ fontSize: 13, color: 'var(--ink-faint)', textDecoration: 'none' }}>
          ← Systems
        </Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 style={{ fontSize: 26, fontWeight: 650, letterSpacing: '-0.025em', margin: 0 }}>{system.name}</h1>
              {latest ? <TierBadge tier={latest.report.classification.tier} /> : null}
            </div>
            <p style={{ fontSize: 13.5, color: 'var(--ink-soft)', margin: '6px 0 0', maxWidth: '76ch' }}>
              {latest?.report.classification.summary ?? 'Not yet scanned.'}
            </p>
            <p style={{ fontSize: 12, color: 'var(--ink-faint)', margin: '4px 0 0' }}>
              {system.sourceKind === 'github' ? (
                <a href={`https://github.com/${system.name}`} target="_blank" rel="noreferrer noopener" style={{ color: 'var(--navy)' }}>
                  github.com/{system.name}
                </a>
              ) : (
                <>bundled sample · {system.source}</>
              )}
              {latest ? (
                <>
                  {' · '}scanned {new Date(latest.record.createdAt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}
                  {' · '}
                  <span className="code">{latest.report.snapshot.fileCount} files</span>
                  {' · '}
                  <span className="code">{latest.report.durationMs} ms</span>
                </>
              ) : null}
            </p>
          </div>
          <form action={rescan} className="shrink-0">
            <input type="hidden" name="id" value={system.id} />
            <button type="submit" className="btn btn-sm">
              Re-scan
            </button>
          </form>
        </div>
      </div>

      <Tabs
        base={`/app/s/${system.id}`}
        items={[
          { href: '', label: 'Overview' },
          { href: '/evidence', label: 'Evidence' },
          { href: '/dossier', label: 'Annex IV dossier' },
          { href: '/remediation', label: 'Remediation' },
          { href: '/history', label: 'History' },
          { href: '/share', label: 'Share' },
        ]}
      />

      {children}
    </div>
  );
}
