import { notFound } from 'next/navigation';
import { buildDossier, ledgerFingerprint } from '@annex/engine';
import { currentUser } from '@/server/auth';
import { getSystem, latestReport } from '@/server/systems';
import { Empty, Panel, Stat } from '@/components/primitives';

export const dynamic = 'force-dynamic';

const LOCALES = [
  { key: 'en', label: 'English' },
  { key: 'de', label: 'Deutsch' },
  { key: 'fr', label: 'Français' },
] as const;

export default async function DossierPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ locale?: string; simplified?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const user = (await currentUser())!;
  const system = getSystem(id, user.id);
  if (!system) notFound();
  const latest = latestReport(system.id);

  if (!latest) {
    return (
      <Panel>
        <Empty title="No completed scan yet" body="The dossier is generated from a scan." />
      </Panel>
    );
  }

  const locale = (LOCALES.find((l) => l.key === query.locale)?.key ?? 'en') as 'en' | 'de' | 'fr';
  const simplified = query.simplified === '1';
  const dossier = buildDossier(latest.report, {
    locale,
    simplified,
    provider: user.orgName || user.name,
  });

  const base = `/api/systems/${system.id}/dossier?locale=${locale}${simplified ? '&simplified=1' : ''}`;

  return (
    <div className="space-y-5">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(260px,320px)]">
        <Panel title="Annex IV technical documentation">
          <p className="legal" style={{ fontSize: 14.5, color: 'var(--ink-soft)', margin: 0, maxWidth: '76ch' }}>
            Article 11(1) requires this document before a high-risk system is placed on the market, and Annex IV
            sets out what it must contain. Every statement below is either backed by a citation to a file and a
            line, recorded as a negative finding, or left explicitly open — because a generated document that
            invents the residual-risk acceptance is a false statement to a competent authority, and Article 99(5)
            prices that at €7.5 million or 1 % of turnover.
          </p>
          <div className="mt-5 flex flex-wrap gap-8">
            <Stat label="Evidence citations" value={dossier.evidenceCount} tone="ok" />
            <Stat label="Open items" value={dossier.openCount} tone={dossier.openCount ? 'warn' : 'ok'} hint="only a human can close these" />
            <Stat label="Sections answered" value={`${dossier.sections.filter((s) => s.evidence.length).length}/9`} />
          </div>
          <p className="mt-4" style={{ fontSize: 12, color: 'var(--ink-faint)', margin: '16px 0 0' }}>
            Ledger <span className="code">{ledgerFingerprint(latest.report.ledger)}</span> · version under
            assessment <span className="code">{dossier.version}</span>
          </p>
        </Panel>

        <Panel title="Export">
          <div className="space-y-3">
            <div>
              <div className="eyebrow" style={{ marginBottom: 6 }}>
                Language
              </div>
              <div className="flex gap-1.5">
                {LOCALES.map((l) => (
                  <a
                    key={l.key}
                    className="btn btn-sm"
                    href={`?locale=${l.key}${simplified ? '&simplified=1' : ''}`}
                    style={locale === l.key ? { background: 'var(--ink)', color: 'var(--paper)', borderColor: 'var(--ink)' } : undefined}
                  >
                    {l.label}
                  </a>
                ))}
              </div>
              <p style={{ fontSize: 11.5, color: 'var(--ink-faint)', margin: '6px 0 0', maxWidth: 260 }}>
                Article 11 documentation must be readable by the competent authority of the Member State
                concerned.
              </p>
            </div>

            <div>
              <div className="eyebrow" style={{ marginBottom: 6 }}>
                Form
              </div>
              <a className="btn btn-sm" href={`?locale=${locale}${simplified ? '' : '&simplified=1'}`}>
                {simplified ? 'Switch to full form' : 'Switch to simplified form'}
              </a>
              <p style={{ fontSize: 11.5, color: 'var(--ink-faint)', margin: '6px 0 0', maxWidth: 260 }}>
                Article 11(1) lets SMEs, start-ups and small mid-caps provide these elements in simplified form.
              </p>
            </div>

            <div className="space-y-2 pt-1">
              <a className="btn btn-sm w-full" href={`${base}&format=html`} target="_blank" rel="noreferrer">
                Open print-ready HTML
              </a>
              <a className="btn btn-sm w-full" href={`${base}&format=md`}>
                Download Markdown
              </a>
              <a className="btn btn-sm w-full" href={`/api/systems/${system.id}/export?format=cdxa`}>
                CycloneDX attestation
              </a>
              <a className="btn btn-sm w-full" href={`/api/systems/${system.id}/export?format=mlbom`}>
                ML-BOM inventory
              </a>
              <a className="btn btn-sm w-full" href={`/api/systems/${system.id}/export?format=sarif`}>
                SARIF for code scanning
              </a>
            </div>
          </div>
        </Panel>
      </div>

      {/* The document itself */}
      <Panel tight>
        <article className="p-6 sm:p-9" style={{ maxWidth: 820, margin: '0 auto' }}>
          <h1 className="legal" style={{ fontSize: 26, fontWeight: 620, letterSpacing: '-0.02em', margin: 0, lineHeight: 1.25 }}>
            {dossier.title}
          </h1>
          <p style={{ fontSize: 12, color: 'var(--ink-faint)', margin: '6px 0 0' }}>
            Regulation (EU) 2024/1689, Annex IV{simplified ? ' — simplified form under Article 11(1)' : ''} ·
            compiled from source by Annex
          </p>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5, margin: '24px 0' }}>
            <tbody>
              {[
                ['System', dossier.systemName],
                ['Provider', dossier.provider],
                ['Version under assessment', dossier.version],
                ['Issued', dossier.issuedAt.slice(0, 10)],
                ['Classification', dossier.classification],
                ['Role under Article 3', dossier.role.replace('+', ' and ')],
                ['Evidence ledger', dossier.ledgerFingerprint],
                ['Open items', String(dossier.openCount)],
              ].map(([k, v]) => (
                <tr key={k} style={{ borderBottom: '1px solid var(--line)' }}>
                  <th style={{ textAlign: 'left', padding: '7px 12px 7px 0', width: '38%', color: 'var(--ink-faint)', fontWeight: 500, verticalAlign: 'top' }}>
                    {k}
                  </th>
                  <td style={{ padding: '7px 0', verticalAlign: 'top' }}>{v}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {dossier.sections.map((section) => (
            <section key={section.point} className="mt-8">
              <h2 className="legal" style={{ fontSize: 17, fontWeight: 620, margin: 0, paddingBottom: 6, borderBottom: '1px solid var(--line)' }}>
                <span style={{ color: 'var(--navy)', display: 'inline-block', minWidth: 26 }}>{section.point}</span>
                {section.title}
              </h2>
              {section.body.map((p, i) => (
                <p key={i} className="legal" style={{ margin: '11px 0 0', color: 'var(--ink-soft)' }}>
                  {renderInline(p)}
                </p>
              ))}

              {section.evidence.length > 0 ? (
                <div className="mt-4 rounded-md p-3.5" style={{ background: 'var(--sunken)' }}>
                  <div className="eyebrow">Evidence</div>
                  <ul className="mt-2 space-y-1.5" style={{ listStyle: 'none', margin: '8px 0 0', padding: 0 }}>
                    {section.evidence.map((e, i) => (
                      <li key={i}>
                        <span className="evidence-loc">
                          {e.path}:{e.line}
                        </span>
                        <code className="evidence-snippet">{e.snippet}</code>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {section.open.length > 0 ? (
                <div className="mt-3 rounded-md p-3.5" style={{ background: 'var(--amber-soft)', border: '1px solid color-mix(in srgb, var(--amber) 30%, transparent)' }}>
                  <div className="eyebrow" style={{ color: 'var(--amber)' }}>
                    Open — determinations this document cannot make
                  </div>
                  <ul className="mt-2" style={{ margin: '8px 0 0', paddingLeft: 18, fontSize: 13, color: 'var(--ink-soft)' }}>
                    {section.open.map((o) => (
                      <li key={o}>{o}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </section>
          ))}
        </article>
      </Panel>
    </div>
  );
}

/** Renders the small subset of markdown the dossier body uses. */
function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (part.startsWith('`') && part.endsWith('`')) return <code key={i} className="code">{part.slice(1, -1)}</code>;
    return <span key={i}>{part}</span>;
  });
}
