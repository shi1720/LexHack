import { notFound } from 'next/navigation';
import { ALL_PACKS } from '@annex/engine';
import { currentUser } from '@/server/auth';
import { getSystem, latestReport } from '@/server/systems';
import { Citation, Empty, Panel, Stat } from '@/components/primitives';
import { CopyButton } from '@/components/copy-button';

export const dynamic = 'force-dynamic';

export default async function RemediationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = (await currentUser())!;
  const system = getSystem(id, user.id);
  if (!system) notFound();
  const latest = latestReport(system.id);

  if (!latest) {
    return (
      <Panel>
        <Empty title="No completed scan yet" body="Remediation is planned from a scan." />
      </Panel>
    );
  }

  const plan = latest.report.remediation;
  if (!plan) {
    return (
      <Panel>
        <Empty
          title="Nothing left that code can close"
          body="Every gap with an available remediation is already closed. What remains needs a human decision — a residual-risk acceptance, a declared accuracy level, a registration filed with an authority."
        />
      </Panel>
    );
  }

  const controlTitles = Object.fromEntries(
    ALL_PACKS.flatMap((p) => p.controls).map((c) => [c.id, { title: c.title, citation: c.citations[0] }]),
  );

  return (
    <div className="space-y-5">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(260px,320px)]">
        <Panel title="The pull request Annex would open">
          <p className="legal" style={{ fontSize: 14.5, color: 'var(--ink-soft)', margin: 0, maxWidth: '76ch' }}>
            Every file here is additive and written only when absent, so applying this can never overwrite
            something a person wrote. The files are scaffolding backed by statute, not finished compliance:
            each carries <code className="code">TODO</code> markers at exactly the points where the answer is a
            judgement your organisation has to make. Annex leaves those blank on purpose.
          </p>
          <div className="mt-5 flex flex-wrap gap-8">
            <Stat label="Files" value={plan.files.length} />
            <Stat label="Obligations closed" value={plan.closes.length} tone="ok" />
            <Stat
              label="Projected score"
              value={`${plan.scoreBefore} → ${plan.scoreAfter}`}
              tone={plan.scoreAfter > plan.scoreBefore ? 'ok' : undefined}
            />
          </div>
        </Panel>

        <Panel title="Apply it">
          <div className="space-y-2">
            <a className="btn btn-sm btn-primary w-full" href={`/api/systems/${system.id}/patch`}>
              Download .patch
            </a>
            <CopyButton
              label="Copy PR description"
              text={plan.body}
              className="btn btn-sm w-full"
            />
            <CopyButton
              label="Copy apply command"
              text={`curl -sL <patch-url> | git apply && git checkout -b ${plan.branchName}`}
              className="btn btn-sm w-full"
            />
          </div>
          <p style={{ fontSize: 11.5, color: 'var(--ink-faint)', margin: '12px 0 0' }}>
            Branch <span className="code">{plan.branchName}</span>
          </p>
          <p style={{ fontSize: 11.5, color: 'var(--ink-faint)', margin: '8px 0 0' }}>
            Or run <code className="code">annex fix .</code> in the repository — the CLI writes the same files.
          </p>
        </Panel>
      </div>

      <Panel title={`${plan.files.length} files`} tight>
        <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {plan.files.map((file) => {
            const meta = controlTitles[file.controlId];
            return (
              <li key={file.path} style={{ borderBottom: '1px solid var(--line)' }}>
                <details>
                  <summary
                    style={{ cursor: 'pointer', padding: '12px 20px', listStyle: 'none', display: 'flex', gap: 12, alignItems: 'baseline', flexWrap: 'wrap' }}
                  >
                    <span className="badge badge-ok">new</span>
                    <span className="code" style={{ fontSize: 13, fontWeight: 600 }}>
                      {file.path}
                    </span>
                    <span style={{ fontSize: 12.5, color: 'var(--ink-faint)', flex: 1, minWidth: 180 }}>
                      {file.description}
                    </span>
                    {meta?.citation ? <Citation {...meta.citation} title={undefined} /> : null}
                  </summary>
                  <div className="scroll-x" style={{ background: 'var(--sunken)', borderTop: '1px solid var(--line)' }}>
                    <pre className="code m-0 p-4" style={{ maxHeight: 460, overflowY: 'auto' }}>
                      {file.contents.split('\n').slice(0, 220).map((line, i) => (
                        <div key={i} style={{ display: 'flex', gap: 14 }}>
                          <span style={{ color: 'var(--moss)', userSelect: 'none', width: 10 }}>+</span>
                          <span style={{ color: 'var(--ink-faint)', userSelect: 'none', width: 28, textAlign: 'right' }}>
                            {i + 1}
                          </span>
                          <span style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{line || ' '}</span>
                        </div>
                      ))}
                    </pre>
                  </div>
                </details>
              </li>
            );
          })}
        </ul>
      </Panel>

      <Panel title="Pull request description">
        <pre
          className="scroll-x m-0 rounded-md p-4"
          style={{ background: 'var(--sunken)', fontSize: 12.5, whiteSpace: 'pre-wrap', fontFamily: 'var(--font-mono)', maxHeight: 420, overflowY: 'auto' }}
        >
          {plan.body}
        </pre>
      </Panel>
    </div>
  );
}
