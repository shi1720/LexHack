import Link from 'next/link';
import { notFound } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { currentUser } from '@/server/auth';
import { getSystem, latestReport, updateSystem } from '@/server/systems';
import { Panel } from '@/components/primitives';
import { CopyButton } from '@/components/copy-button';

export const dynamic = 'force-dynamic';

async function toggleTrust(formData: FormData) {
  'use server';
  const user = (await currentUser())!;
  const id = String(formData.get('id'));
  const system = getSystem(id, user.id);
  if (!system) return;
  updateSystem(id, { trustPublic: !system.trustPublic });
  revalidatePath(`/app/s/${id}/share`);
}

export default async function SharePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = (await currentUser())!;
  const system = getSystem(id, user.id);
  if (!system) return notFound();
  const latest = latestReport(system.id);

  const path = `/trust/${system.trustSlug}`;

  return (
    <div className="space-y-5">
      <Panel title="Trust page">
        <p className="legal" style={{ fontSize: 14.5, color: 'var(--ink-soft)', margin: 0, maxWidth: '76ch' }}>
          Your customer&rsquo;s security reviewer is going to ask what role you play under the AI Act, how you
          classify this system, and what evidence you can produce. Today the honest answer is a PDF somebody
          wrote about themselves. A trust page is the same evidence, published, with a ledger root a reviewer
          can check against a re-run.
        </p>
        <p className="legal mt-3" style={{ fontSize: 14.5, color: 'var(--ink-soft)', margin: '12px 0 0', maxWidth: '76ch' }}>
          It shows the classification, the obligations, the score and the ledger root. It never shows your source
          code — evidence snippets are replaced by the file and line they came from.
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <form action={toggleTrust}>
            <input type="hidden" name="id" value={system.id} />
            <button type="submit" className={system.trustPublic ? 'btn' : 'btn btn-primary'}>
              {system.trustPublic ? 'Unpublish' : 'Publish trust page'}
            </button>
          </form>
          {system.trustPublic ? (
            <>
              <Link className="btn" href={path} target="_blank">
                View it →
              </Link>
              <CopyButton label="Copy link" text={path} />
            </>
          ) : null}
        </div>

        {system.trustPublic ? (
          <p className="mt-4" style={{ fontSize: 12.5, color: 'var(--ink-faint)', margin: '16px 0 0' }}>
            Live at <span className="code">{path}</span> — anyone with the link can read it, no account needed.
          </p>
        ) : (
          <p className="mt-4" style={{ fontSize: 12.5, color: 'var(--ink-faint)', margin: '16px 0 0' }}>
            Not published. The page is private until you publish it.
          </p>
        )}
      </Panel>

      {latest ? (
        <Panel title="What a reviewer will see">
          <ul className="space-y-2" style={{ listStyle: 'none', margin: 0, padding: 0, fontSize: 13.5 }}>
            <li>
              <strong>Classification</strong> — {latest.report.classification.summary}
            </li>
            <li>
              <strong>Role</strong> — {latest.report.classification.role.replace('+', ' and ')} under Article 3(3)
            </li>
            <li>
              <strong>Conformity</strong> — {latest.report.score}/100 across{' '}
              {latest.report.controls.filter((c) => c.status !== 'not_applicable').length} applicable obligations
            </li>
            <li>
              <strong>Evidence ledger</strong> — <span className="code">{latest.report.ledger.root.slice(0, 32)}…</span>
            </li>
            <li>
              <strong>Not shown</strong> — snippets, file contents, dependency versions, anything that would leak
              the implementation
            </li>
          </ul>
        </Panel>
      ) : null}

      <Panel title="Continuous integration">
        <p style={{ fontSize: 13.5, color: 'var(--ink-soft)', margin: 0, maxWidth: '76ch' }}>
          A trust page that goes stale is worse than none. Wire the scan into CI so the evidence is regenerated
          on every merge and a regression fails the build.
        </p>
        <pre
          className="scroll-x mt-4 rounded-md p-4"
          style={{ background: 'var(--sunken)', fontSize: 12.5, fontFamily: 'var(--font-mono)', margin: '16px 0 0' }}
        >
{`- name: AI Act conformity
  run: npx @annex/cli scan . --format sarif --out annex.sarif --fail-under 70

- uses: github/codeql-action/upload-sarif@v3
  with:
    sarif_file: annex.sarif

- name: Detect substantial modification
  run: npx @annex/cli diff --base origin/main --head HEAD`}
        </pre>
        <p style={{ fontSize: 12, color: 'var(--ink-faint)', margin: '12px 0 0' }}>
          Findings land in the Security tab as code-scanning alerts, on the line that caused them.
        </p>
      </Panel>
    </div>
  );
}
