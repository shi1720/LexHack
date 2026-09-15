import Link from 'next/link';
import { redirect } from 'next/navigation';
import { MARKET_PACKS, parseGitHubUrl } from '@annex/engine';
import { currentUser } from '@/server/auth';
import { SAMPLES, createSystem, runScan } from '@/server/systems';
import { Panel } from '@/components/primitives';

export const metadata = { title: 'Add a system' };
export const dynamic = 'force-dynamic';

async function addSample(formData: FormData) {
  'use server';
  const user = (await currentUser())!;
  const key = String(formData.get('sample'));
  const sample = SAMPLES.find((s) => s.key === key);
  if (!sample) redirect('/app/new?error=' + encodeURIComponent('Unknown sample.'));

  const system = createSystem({
    userId: user.id,
    name: sample.name,
    purpose: sample.purpose,
    source: sample.key,
    sourceKind: 'sample',
    markets: sample.markets,
  });
  await runScan(system, {
    ...(user.turnoverEur ? { turnoverEur: user.turnoverEur } : {}),
    ...(user.employees ? { employees: user.employees } : {}),
  }).catch(() => undefined);
  redirect(`/app/s/${system.id}`);
}

async function addRepo(formData: FormData) {
  'use server';
  const user = (await currentUser())!;
  const source = String(formData.get('repo') ?? '').trim();
  const purpose = String(formData.get('purpose') ?? '').trim();
  const markets = formData.getAll('markets').map(String);

  let name = source;
  try {
    const parsed = parseGitHubUrl(source);
    name = `${parsed.owner}/${parsed.repo}`;
  } catch (err) {
    redirect('/app/new?error=' + encodeURIComponent((err as Error).message));
  }

  const system = createSystem({
    userId: user.id,
    name,
    purpose,
    source,
    sourceKind: 'github',
    markets: markets.length ? markets : ['eu', 'us-federal'],
  });

  try {
    await runScan(system, {
      ...(user.githubToken ? { githubToken: user.githubToken } : {}),
      ...(user.turnoverEur ? { turnoverEur: user.turnoverEur } : {}),
      ...(user.employees ? { employees: user.employees } : {}),
    });
  } catch (err) {
    redirect(`/app/s/${system.id}?error=` + encodeURIComponent((err as Error).message));
  }
  redirect(`/app/s/${system.id}`);
}

export default async function NewSystemPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;

  return (
    <div className="space-y-7">
      <div>
        <Link href="/app" style={{ fontSize: 13, color: 'var(--ink-faint)', textDecoration: 'none' }}>
          ← Systems
        </Link>
        <h1 className="mt-2" style={{ fontSize: 26, fontWeight: 650, letterSpacing: '-0.025em', margin: 0 }}>
          Add a system
        </h1>
        <p style={{ color: 'var(--ink-faint)', fontSize: 13.5, margin: '5px 0 0', maxWidth: '72ch' }}>
          Annex downloads the repository archive, analyses it in memory and keeps only the report. Nothing is
          cloned to disk and no source code leaves this machine.
        </p>
      </div>

      {params.error ? (
        <p role="alert" className="card px-4 py-3" style={{ background: 'var(--crimson-soft)', color: 'var(--crimson)', fontSize: 13.5 }}>
          {params.error}
        </p>
      ) : null}

      <Panel title="Start from a sample codebase">
        <p style={{ fontSize: 13.5, color: 'var(--ink-soft)', margin: '0 0 16px', maxWidth: '76ch' }}>
          Four realistic repositories, bundled with the app so a scan works with no network and no credentials.
          Scan <strong>HireFlow</strong> and <strong>HireFlow v3</strong> and diff them to see what a
          substantial modification looks like from the code side.
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          {SAMPLES.map((sample) => (
            <form key={sample.key} action={addSample} className="card flex h-full flex-col gap-2 p-4">
              <input type="hidden" name="sample" value={sample.key} />
              <div className="flex items-center justify-between gap-2">
                <h3 style={{ fontSize: 15, fontWeight: 620, margin: 0 }}>{sample.name}</h3>
                <span className={`badge ${sample.expect === 'prohibited' ? 'badge-bad' : sample.expect === 'high' ? 'badge-warn' : 'badge-info'}`}>
                  {sample.headline.split('·').pop()?.trim()}
                </span>
              </div>
              <p style={{ fontSize: 13, color: 'var(--ink-soft)', margin: 0, flex: 1 }}>{sample.blurb}</p>
              <div className="flex items-center justify-between gap-2 pt-1">
                <span style={{ fontSize: 11.5, color: 'var(--ink-faint)' }}>
                  {sample.markets.map((m) => MARKET_PACKS[m]?.label ?? m).join(' · ')}
                </span>
                <button type="submit" className="btn btn-sm btn-primary">
                  Scan
                </button>
              </div>
            </form>
          ))}
        </div>
      </Panel>

      <Panel title="Or scan a GitHub repository">
        <form action={addRepo} className="space-y-5">
          <div>
            <label htmlFor="repo" className="eyebrow" style={{ display: 'block', marginBottom: 5 }}>
              Repository
            </label>
            <input
              id="repo"
              name="repo"
              className="input"
              required
              placeholder="owner/repo or https://github.com/owner/repo"
              aria-describedby="repo-hint"
            />
            <p id="repo-hint" style={{ fontSize: 12, color: 'var(--ink-faint)', margin: '5px 0 0' }}>
              Public repositories work with no credentials. For private ones, add a token in Settings.
            </p>
          </div>

          <div>
            <label htmlFor="purpose" className="eyebrow" style={{ display: 'block', marginBottom: 5 }}>
              Intended purpose
            </label>
            <textarea
              id="purpose"
              name="purpose"
              className="input"
              rows={2}
              placeholder="Ranks job applicants against a posting so recruiters can prioritise review."
              aria-describedby="purpose-hint"
            />
            <p id="purpose-hint" style={{ fontSize: 12, color: 'var(--ink-faint)', margin: '5px 0 0' }}>
              One sentence. Under Article 6 this is the sentence that decides the risk classification, and it is
              the first line of the Annex IV documentation.
            </p>
          </div>

          <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
            <legend className="eyebrow" style={{ marginBottom: 7 }}>
              Markets the system is offered in
            </legend>
            <div className="flex flex-wrap gap-4">
              {Object.entries(MARKET_PACKS).map(([key, market]) => (
                <label key={key} className="flex items-center gap-2" style={{ fontSize: 13.5 }}>
                  <input type="checkbox" name="markets" value={key} defaultChecked={key === 'eu' || key === 'us-federal'} />
                  {market.label}
                </label>
              ))}
            </div>
            <p style={{ fontSize: 12, color: 'var(--ink-faint)', margin: '7px 0 0' }}>
              A product that never touches New York should not be graded against Local Law 144, and a score that
              pretends otherwise is noise.
            </p>
          </fieldset>

          <button type="submit" className="btn btn-primary">
            Scan repository
          </button>
        </form>
      </Panel>
    </div>
  );
}
