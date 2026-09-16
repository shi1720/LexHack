import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ALL_PACKS, keyFingerprint, ledgerFingerprint } from '@annex/engine';
import { getSystemBySlug, latestReport } from '@/server/systems';
import { Citation, Logo, ScoreDial, StatusBadge, TierBadge } from '@/components/primitives';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const system = getSystemBySlug(slug);
  return {
    title: system ? `${system.name} · AI Act conformity` : 'Trust page',
    description: system?.purpose,
    robots: { index: false },
  };
}

/**
 * The public trust page.
 *
 * Deliberately read-only and deliberately incomplete: it publishes the
 * classification, the obligations and the ledger root, and never the code.
 * A reviewer can check the root against a re-run; they cannot read the source.
 */
export default async function TrustPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const system = getSystemBySlug(slug);
  if (!system || !system.trustPublic) notFound();
  const latest = latestReport(system.id);
  if (!latest) notFound();

  const { report } = latest;
  const signature = report.ledger.signature;
  const applicable = report.controls.filter((c) => c.status !== 'not_applicable');
  const packNames = Object.fromEntries(ALL_PACKS.map((p) => [p.id, p.name]));
  const byPack = new Map<string, typeof applicable>();
  for (const c of applicable) byPack.set(c.pack, [...(byPack.get(c.pack) ?? []), c]);

  return (
    <div className="min-h-screen">
      <header className="border-b" style={{ borderColor: 'var(--line)', background: 'var(--surface)' }}>
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-5">
          <span className="eyebrow">AI Act conformity statement</span>
          <Link href="/" className="no-underline" style={{ opacity: 0.7 }}>
            <Logo size={15} muted />
          </Link>
        </div>
      </header>

      <main id="main" className="mx-auto max-w-4xl px-5 py-10">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 style={{ fontSize: 30, fontWeight: 650, letterSpacing: '-0.03em', margin: 0 }}>{system.name}</h1>
              <TierBadge tier={report.classification.tier} />
            </div>
            <p className="legal mt-3" style={{ fontSize: 16, color: 'var(--ink-soft)', margin: '12px 0 0', maxWidth: '62ch' }}>
              {system.purpose}
            </p>
            <p className="mt-3" style={{ fontSize: 13.5, color: 'var(--ink-soft)', margin: '12px 0 0', maxWidth: '62ch' }}>
              {report.classification.summary} Role under Articles 3(3) and 3(4):{' '}
              <strong>{report.classification.role.replace('+', ' and ')}</strong>.
            </p>
          </div>
          <ScoreDial score={report.score} label="Conformity" sublabel={`${applicable.length} obligations`} />
        </div>

        {/* Verification -------------------------------------------------- */}
        <section className="card mt-9 p-5">
          <div className="eyebrow">Independently checkable</div>
          <p className="legal mt-2" style={{ fontSize: 14.5, color: 'var(--ink-soft)', margin: '8px 0 0' }}>
            Every statement below was derived from the source code of this system at commit{' '}
            <span className="code">{(report.snapshot.commit ?? report.snapshot.id).slice(0, 12)}</span> by a
            deterministic, offline analysis. No language model participated in any determination. The results
            are hashed into a chain whose root is printed here: re-run the same scan on the same commit and you
            get the same root. Every entry can be re-derived from the results it describes, and{' '}
            <span className="code">annex verify --against .</span> re-hashes each cited file off disk · so an
            edited status, or source that has moved since, is detectable by anyone holding the repository.
          </p>
          {signature ? (
            <p className="legal" style={{ fontSize: 14.5, color: 'var(--ink-soft)', margin: '10px 0 0' }}>
              The root is also <strong>signed</strong>, which is what a chain on its own cannot do for you:
              anyone can rebuild a consistent chain over altered numbers, so the chain catches an edit only for
              a reader who has the source. Check the signature against the publisher&rsquo;s key with{' '}
              <span className="code">annex verify report.json --pubkey &lt;their key&gt;</span> and you have
              established that these results came from that key&rsquo;s holder, without re-running anything.
              There is no timestamp authority behind it, so it establishes who and not when.
            </p>
          ) : null}
          <div className={`mt-4 grid gap-4 ${signature ? 'sm:grid-cols-2 lg:grid-cols-4' : 'sm:grid-cols-3'}`}>
            <div>
              <div className="eyebrow">Ledger root</div>
              <div className="code" style={{ fontSize: 13, color: 'var(--navy)', letterSpacing: '0.04em' }}>
                {ledgerFingerprint(report.ledger)}
              </div>
            </div>
            {signature ? (
              <div>
                <div className="eyebrow">Signed by</div>
                <div className="code" style={{ fontSize: 13, color: 'var(--moss)', letterSpacing: '0.04em' }}>
                  {keyFingerprint(signature.publicKey)}
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--ink-faint)', marginTop: 2 }}>ed25519</div>
              </div>
            ) : null}
            <div>
              <div className="eyebrow">Assessed</div>
              <div style={{ fontSize: 13 }}>{report.createdAt.slice(0, 10)}</div>
            </div>
            <div>
              <div className="eyebrow">Rule packs</div>
              <div style={{ fontSize: 13 }}>
                {report.packs.map((p) => `${p.packName} ${p.version}`).join(' · ')}
              </div>
            </div>
          </div>
          <p style={{ fontSize: 11.5, color: 'var(--ink-faint)', margin: '14px 0 0' }}>
            {signature ? '' : 'This report is unsigned: the chain establishes internal consistency, not who produced it. '}
            Self-assessment, not a third-party conformity assessment. Source code is not published on this page:
            evidence is shown as the file and line it came from.
          </p>
        </section>

        {/* Obligations --------------------------------------------------- */}
        {[...byPack].map(([packId, controls]) => (
          <section key={packId} className="mt-8">
            <h2 style={{ fontSize: 16, fontWeight: 620, margin: 0, letterSpacing: '-0.015em' }}>
              {packNames[packId] ?? packId}
            </h2>
            <div className="card mt-3 overflow-hidden">
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <caption className="sr-only">Obligations assessed under {packNames[packId] ?? packId}</caption>
                <thead>
                  <tr style={{ background: 'var(--sunken)' }}>
                    <th scope="col" style={{ textAlign: 'left', padding: '9px 14px', fontWeight: 600 }}>Obligation</th>
                    <th scope="col" style={{ textAlign: 'left', padding: '9px 14px', fontWeight: 600 }}>Citation</th>
                    <th scope="col" style={{ textAlign: 'left', padding: '9px 14px', fontWeight: 600 }}>In force from</th>
                    <th scope="col" style={{ textAlign: 'left', padding: '9px 14px', fontWeight: 600 }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {controls.map((c) => (
                    <tr key={c.controlId} style={{ borderTop: '1px solid var(--line)' }}>
                      <td style={{ padding: '9px 14px' }}>
                        <div style={{ fontWeight: 560 }}>{c.title}</div>
                        <div style={{ color: 'var(--ink-faint)', fontSize: 12, marginTop: 2 }}>
                          {c.evidence.filter((e) => e.kind !== 'absence').length > 0
                            ? `Evidenced at ${c.evidence.filter((e) => e.kind !== 'absence').slice(0, 2).map((e) => `${e.path}:${e.line}`).join(', ')}`
                            : c.finding}
                        </div>
                      </td>
                      <td style={{ padding: '9px 14px', whiteSpace: 'nowrap' }}>
                        {c.citations[0] ? <Citation {...c.citations[0]} title={undefined} /> : null}
                      </td>
                      <td style={{ padding: '9px 14px', whiteSpace: 'nowrap', color: c.inForce ? 'var(--crimson)' : 'var(--ink-faint)' }}>
                        {c.inForce ? 'now' : c.appliesFrom}
                      </td>
                      <td style={{ padding: '9px 14px' }}>
                        <StatusBadge status={c.status} prohibition={c.family === 'prohibition'} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))}

        <footer className="mt-10 border-t pt-6" style={{ borderColor: 'var(--line)' }}>
          <p style={{ fontSize: 12, color: 'var(--ink-faint)', margin: 0 }}>
            Generated by{' '}
            <Link href="/" style={{ color: 'var(--navy)' }}>
              Annex
            </Link>{' '}
            {report.engineVersion} on {report.createdAt.slice(0, 10)} from {report.snapshot.fileCount} source
            files in {report.durationMs} ms. This is a technical artefact, not legal advice, and not a
            conformity assessment under Article 43.
          </p>
        </footer>
      </main>
    </div>
  );
}
