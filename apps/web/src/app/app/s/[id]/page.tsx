import Link from 'next/link';
import { notFound } from 'next/navigation';
import { currentUser } from '@/server/auth';
import { getSystem, latestReport } from '@/server/systems';
import { Citation, Empty, EvidenceLine, Panel, ScoreDial, StatusBadge, money, relativeDays } from '@/components/primitives';

export const dynamic = 'force-dynamic';

export default async function Overview({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = (await currentUser())!;
  const system = getSystem(id, user.id);
  if (!system) notFound();
  const latest = latestReport(system.id);

  if (!latest) {
    return (
      <Panel>
        <Empty title="No completed scan yet" body="Run a scan from the Re-scan button above." />
      </Panel>
    );
  }

  const { report } = latest;
  const applicable = report.controls.filter((c) => c.status !== 'not_applicable');
  const liveFailing = applicable.filter((c) => c.inForce && c.status !== 'satisfied');
  const futureFailing = applicable.filter((c) => !c.inForce && c.status !== 'satisfied');

  return (
    <div className="space-y-6">
      {/* Headline ------------------------------------------------------- */}
      <div className="grid gap-4 lg:grid-cols-[auto_1fr]">
        <div className="card flex items-center justify-center gap-8 p-6">
          <ScoreDial score={report.score} label="Conformity" sublabel={`${applicable.length} obligations`} />
          <ScoreDial
            score={report.liveScore}
            label="In force today"
            sublabel={`${liveFailing.length} failing now`}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Panel title="Your role">
            <p style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>
              {report.classification.role.replace('+', ' and ')}
            </p>
            <p className="legal mt-2" style={{ fontSize: 13.5, color: 'var(--ink-soft)', margin: '8px 0 0' }}>
              Article 3(3) makes whoever develops an AI system and places it on the market under their own name
              the <strong>provider</strong>. Calling someone else&rsquo;s model does not make you only a deployer
              — and Article 25(1)(c) can convert a deployer into the provider where they repoint a
              general-purpose AI system, already on the market and not classified high-risk, at an Annex III
              use case. Whether that applies here is a determination for you; Annex records the dependency,
              not the conclusion.
            </p>
          </Panel>

          <Panel title="Statutory maximum">
            <p style={{ fontSize: 26, fontWeight: 660, letterSpacing: '-0.03em', color: report.exposure.maxFine > 0 ? 'var(--crimson)' : 'var(--moss)', margin: 0, lineHeight: 1.2 }}>
              {money(report.exposure.maxFine, report.exposure.currency)}
            </p>
            <p className="legal mt-2" style={{ fontSize: 13, color: 'var(--ink-soft)', margin: '8px 0 0' }}>
              {report.exposure.basis}
            </p>
            {report.exposure.maxFine > 0 ? (
              <p className="legal" style={{ fontSize: 12.5, color: 'var(--ink-faint)', margin: '8px 0 0' }}>
                A ceiling, not a forecast. Article 99(1) and 99(7) make administrative fines discretionary and
                require them to be effective, proportionate and dissuasive in each case.
              </p>
            ) : null}
            {report.exposure.citations[0] ? (
              <p style={{ margin: '8px 0 0' }}>
                <Citation {...report.exposure.citations[0]} />
              </p>
            ) : null}
          </Panel>
        </div>
      </div>

      {/* Classification -------------------------------------------------- */}
      <Panel
        title="Classification"
        action={
          <span style={{ fontSize: 12, color: 'var(--ink-faint)' }}>
            rule-based · no model called · {Math.round(report.classification.confidence * 100)}% top confidence
          </span>
        }
      >
        {report.classification.findings.length === 0 ? (
          <p style={{ fontSize: 13.5, color: 'var(--ink-soft)', margin: 0 }}>
            No Annex III use case or Article 5 practice was detected in this codebase. Articles 4 and 5 still
            apply to every AI system.
          </p>
        ) : (
          <div className="space-y-5">
            {report.classification.findings.map((finding) => (
              <article key={finding.id} className="grid gap-4 md:grid-cols-[1fr_minmax(0,1.15fr)]">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`badge ${finding.tier === 'prohibited' ? 'badge-bad' : finding.tier === 'high' ? 'badge-warn' : 'badge-info'}`}>
                      {finding.tier === 'prohibited' ? 'Prohibited' : finding.tier === 'high' ? 'High risk' : 'Transparency'}
                    </span>
                    <h3 style={{ fontSize: 15, fontWeight: 620, margin: 0 }}>{finding.title}</h3>
                    <span style={{ fontSize: 11.5, color: 'var(--ink-faint)' }}>{Math.round(finding.confidence * 100)}%</span>
                  </div>
                  {finding.citations.map((cite) => (
                    <p key={cite.locator} style={{ margin: '7px 0 0' }}>
                      <Citation {...cite} />
                    </p>
                  ))}
                  <p className="legal" style={{ fontSize: 14, color: 'var(--ink-soft)', margin: '10px 0 0', whiteSpace: 'pre-line' }}>
                    {finding.rationale}
                  </p>
                </div>
                <div className="space-y-2.5 rounded-md p-3.5" style={{ background: 'var(--sunken)' }}>
                  <div className="eyebrow">Evidence in your code</div>
                  {finding.evidence.slice(0, 3).map((e, i) => (
                    <EvidenceLine key={`${e.path}-${e.line}-${i}`} {...e} />
                  ))}
                  <Link href={`/app/s/${system.id}/evidence`} className="btn btn-sm" style={{ marginTop: 4 }}>
                    Open the evidence explorer
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </Panel>

      {/* Compliance clock ------------------------------------------------ */}
      <Panel title="Compliance clock" action={<span style={{ fontSize: 12, color: 'var(--ink-faint)' }}>as at {report.clock.today}</span>}>
        <ol className="space-y-0" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {report.clock.milestones.map((m, i) => {
            const failing = m.controlIds.length;
            const inForce = m.status === 'in-force';
            return (
              <li
                key={`${m.date}-${m.label}`}
                className="flex gap-4 py-3"
                style={{ borderTop: i === 0 ? undefined : '1px solid var(--line)' }}
              >
                <div className="shrink-0 pt-0.5" style={{ width: 96 }}>
                  <div className="code" style={{ color: inForce ? 'var(--crimson)' : 'var(--ink-faint)', fontWeight: 600 }}>
                    {m.date}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--ink-faint)' }}>
                    {inForce ? 'in force' : relativeDays(m.daysAway)}
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span style={{ fontWeight: 580, fontSize: 14 }}>{m.label}</span>
                    {failing > 0 ? (
                      <span className={`badge ${inForce ? 'badge-bad' : 'badge-warn'}`}>
                        {failing} not evidenced
                      </span>
                    ) : (
                      <span className="badge badge-ok">clear</span>
                    )}
                  </div>
                  <p style={{ fontSize: 12.5, color: 'var(--ink-faint)', margin: '3px 0 0' }}>{m.note}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </Panel>

      {/* Gaps ------------------------------------------------------------ */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel
          title={`Failing today (${liveFailing.length})`}
          action={<span className="badge badge-bad">Enforceable now</span>}
        >
          <GapList controls={liveFailing} systemId={system.id} />
        </Panel>
        <Panel
          title={`Due later (${futureFailing.length})`}
          action={<span className="badge badge-neutral">Not yet enforceable</span>}
        >
          <GapList controls={futureFailing} systemId={system.id} />
        </Panel>
      </div>

      {report.warnings.length > 0 ? (
        <Panel title="Scan notes">
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13.5, color: 'var(--ink-soft)' }}>
            {report.warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </Panel>
      ) : null}
    </div>
  );
}

function GapList({ controls, systemId }: { controls: { controlId: string; title: string; status: string; family: string; citations: { short: string; locator: string; url: string }[]; finding: string }[]; systemId: string }) {
  if (controls.length === 0) {
    return (
      <p style={{ fontSize: 13.5, color: 'var(--moss)', margin: 0 }}>
        Nothing outstanding here.
      </p>
    );
  }
  return (
    <ul className="space-y-3.5" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
      {controls.map((c) => (
        <li key={c.controlId}>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={c.status} prohibition={c.family === 'prohibition'} />
            <Link href={`/app/s/${systemId}/evidence#${c.controlId}`} style={{ fontSize: 13.5, fontWeight: 580, textDecoration: 'none' }}>
              {c.title}
            </Link>
          </div>
          {c.citations[0] ? (
            <div style={{ marginTop: 3 }}>
              <Citation {...c.citations[0]} />
            </div>
          ) : null}
          <p style={{ fontSize: 12.5, color: 'var(--ink-faint)', margin: '4px 0 0' }}>{c.finding}</p>
        </li>
      ))}
    </ul>
  );
}
