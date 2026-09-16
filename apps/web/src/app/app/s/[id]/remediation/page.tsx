import { notFound } from 'next/navigation';
import { ALL_PACKS } from '@annex/engine';
import { requireUser } from '@/server/auth';
import { getSystem, latestReport } from '@/server/systems';
import { Citation, Empty, Panel, Stat } from '@/components/primitives';
import { CopyButton } from '@/components/copy-button';
import { OpenPullRequest } from '@/components/open-pr';

export const dynamic = 'force-dynamic';

export default async function RemediationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
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
  const canOpenPr = system.sourceKind === 'github' && Boolean(user.githubToken);
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

  /*
    A prohibited practice is not a remediation problem.

    On a system Annex has just classified under Article 5, the first thing on
    this tab was "obligations closed: 10 · projected score 3 → 25", which reads
    as a route to compliance. There is no such route: Article 5 prohibits the
    practice outright, the only carve-out in 5(1)(f) is a medical or safety
    purpose, and no file Annex writes touches any of that. The pull request is
    still worth having for everything else, but it is not the headline and it
    must not be mistaken for one.
  */
  const prohibited = latest.report.classification.tier === 'prohibited';
  const prohibitions = latest.report.controls.filter(
    (c) => c.family === 'prohibition' && c.status === 'missing',
  );

  return (
    <div className="space-y-5">
      {prohibited ? (
        <Panel title="Start here: this is not a remediation problem">
          <p className="legal" style={{ fontSize: 14.5, color: 'var(--ink-soft)', margin: 0, maxWidth: '76ch' }}>
            Annex classified this system as containing a practice <strong>prohibited by Article 5</strong>. A
            prohibition is not closed by adding files: no amount of disclosure, consent, documentation or human
            review cures it, and nothing in the pull request below addresses it. The system is unlawful to place
            on the Union market or put into service in its current form.
          </p>
          <ul className="mt-4 space-y-3" style={{ listStyle: 'none', margin: '16px 0 0', padding: 0 }}>
            {prohibitions.map((c) => (
              <li key={c.controlId}>
                <p style={{ fontSize: 14, fontWeight: 620, margin: 0 }}>{c.title}</p>
                <p className="legal" style={{ fontSize: 13.5, color: 'var(--ink-soft)', margin: '4px 0 0', maxWidth: '76ch' }}>
                  {c.gap ?? c.finding}
                </p>
                {c.citations[0] ? (
                  <p style={{ margin: '6px 0 0' }}>
                    <Citation {...c.citations[0]} />
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
          <p className="legal" style={{ fontSize: 13, color: 'var(--ink-faint)', margin: '16px 0 0', maxWidth: '76ch' }}>
            The remainder of this page plans the obligations that <em>can</em> be closed by code. Doing that work
            while the prohibited practice is still in the product raises the score and changes nothing that
            matters.
          </p>
        </Panel>
      ) : null}

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(260px,320px)]">
        <Panel title={prohibited ? 'What the pull request does close' : 'The pull request Annex would open'}>
          {/* The numbers first. This panel used to open with six lines of
              justified serif before anything countable appeared, so on a phone
              the whole first screen was prose and the artefact was below the
              fold. The caveat matters and is still here — one line, under the
              figures it qualifies. */}
          <div className="flex flex-wrap gap-8">
            <Stat label="Files" value={plan.files.length} />
            <Stat label="Obligations closed" value={plan.closes.length} tone="ok" />
            <Stat
              label="Projected score"
              value={`${plan.scoreBefore} → ${plan.scoreAfter}`}
              tone={plan.scoreAfter > plan.scoreBefore ? 'ok' : undefined}
            />
          </div>
          <p className="legal mt-5" style={{ fontSize: 13.5, color: 'var(--ink-soft)', margin: '20px 0 0', maxWidth: '76ch' }}>
            Additive only, and written only where the file is absent, so applying this can never overwrite
            something a person wrote. What it produces is scaffolding backed by statute rather than finished
            compliance: every document carries <code className="code">TODO</code> markers at exactly the points
            where the answer is a judgement your organisation has to make, and Annex leaves those blank on
            purpose — a scan of the applied branch will cap each of those obligations at <em>partial</em> until
            somebody fills them in.
          </p>
        </Panel>

        <Panel title="Apply it">
          {/* The download comes first unless the pull request can actually be
              opened. A disabled primary button at the top of the panel is the
              product telling a first-time reader that its headline action is
              unavailable, when the artefact underneath it is real and one
              click away. */}
          <div className="space-y-2">
            {canOpenPr ? (
              <OpenPullRequest systemId={system.id} canOpen />
            ) : null}
            <a
              className={`btn btn-sm w-full${canOpenPr ? '' : ' btn-primary'}`}
              href={`/api/systems/${system.id}/patch`}
            >
              Download .patch
            </a>
            {canOpenPr ? null : <OpenPullRequest systemId={system.id} canOpen={false} />}
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
          <p className="legal" style={{ fontSize: 12, color: 'var(--ink-faint)', margin: '8px 0 0' }}>
            Merging this does not close the gaps. The next scan reads these files the way an auditor would:
            a document with unfilled placeholders counts as partial, and a module no code path reaches counts
            as partial. The projected score above already assumes that.
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
