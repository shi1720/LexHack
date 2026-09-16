import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireUser, deleteUser, destroySession, updateUser } from '@/server/auth';
import { Panel } from '@/components/primitives';

export const metadata = { title: 'Settings' };
export const dynamic = 'force-dynamic';

async function save(formData: FormData) {
  'use server';
  const user = await requireUser();
  const turnover = String(formData.get('turnover') ?? '').trim();
  const employees = String(formData.get('employees') ?? '').trim();
  if ([turnover, employees].some(v => v && (!/^\d+$/.test(v) || !Number.isSafeInteger(Number(v))))) redirect('/app/settings?error=' + encodeURIComponent('Enter whole, non-negative numbers or leave the fields blank.'));
  const token = String(formData.get('github') ?? '').trim();

  updateUser(user.id, {
    name: String(formData.get('name') ?? user.name),
    orgName: String(formData.get('org') ?? ''),
    turnoverEur: turnover ? Number(turnover) : null,
    employees: employees ? Number(employees) : null,
    githubToken: process.env.ANNEX_PUBLIC_DEMO === '1' ? null : token === '' ? null : token.startsWith('•') ? undefined : token,
  });
  revalidatePath('/app/settings');
  redirect('/app/settings?saved=1');
}

async function eraseAccount(formData: FormData) {
  'use server';
  const user = await requireUser();
  if (String(formData.get('confirm') ?? '').trim().toLowerCase() !== 'delete') {
    redirect('/app/settings?error=' + encodeURIComponent('Type "delete" to confirm.'));
  }
  deleteUser(user.id);
  await destroySession();
  redirect('/?erased=1');
}

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ error?: string; saved?: string }> }) {
  const params = await searchParams;
  const user = await requireUser();

  return (
    <div className="space-y-5" style={{ maxWidth: 680 }}>
      <div>
        <h1 style={{ fontSize: 26, fontWeight: 650, letterSpacing: '-0.025em', margin: 0 }}>Settings</h1>
        <p style={{ color: 'var(--ink-faint)', fontSize: 13.5, margin: '5px 0 0' }}>
          Two of these change what Annex computes, not just what it displays.
        </p>
      </div>

      {params.saved ? <p role="status" className="demo-notice">Settings saved. Re-scan a system to update its exposure model.</p> : null}
      {params.error ? <p role="alert" style={{ color: 'var(--crimson)' }}>{params.error}</p> : null}
      <form action={save} className="space-y-5">
        <Panel title="Organisation">
          <div className="space-y-4">
            <Field label="Your name" name="name" defaultValue={user.name} />
            <Field label="Organisation" name="org" defaultValue={user.orgName} placeholder="Appears as the provider on the dossier" />
          </div>
        </Panel>

        <Panel title="Exposure modelling">
          <p style={{ fontSize: 13.5, color: 'var(--ink-soft)', margin: '0 0 16px', maxWidth: '68ch' }}>
            Article 99 sets fines as the <em>higher</em> of a flat cap and a percentage of worldwide annual
            turnover · except for SMEs and start-ups, where Article 99(6) inverts it to the <em>lower</em> of the
            two. Without these numbers Annex shows only the flat cap, which overstates exposure for a small
            company by a factor of a hundred.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Worldwide annual turnover (EUR)"
              name="turnover"
              inputMode="numeric"
              defaultValue={user.turnoverEur != null ? String(user.turnoverEur) : ''}
              placeholder="4200000"
            />
            <Field
              label="Employees"
              name="employees"
              inputMode="numeric"
              defaultValue={user.employees != null ? String(user.employees) : ''}
              placeholder="38"
              hint="Under 250 applies the SME cap."
            />
          </div>
        </Panel>

        {process.env.ANNEX_PUBLIC_DEMO !== '1' ? <Panel title="GitHub access">
          <p style={{ fontSize: 13.5, color: 'var(--ink-soft)', margin: '0 0 16px', maxWidth: '68ch' }}>
            Public repositories scan with no credentials at all. A token lifts the anonymous rate limit and
            reaches private repositories. It is stored in your own database row and used to download the repository archive and, only when you request it, open a remediation pull request. Self-hosted tokens are stored in the database; protect its disk and backups.
          </p>
          <Field
            label="Personal access token"
            name="github"
            type="password"
            autoComplete="off"
            defaultValue={user.githubToken ? '••••••••••••••••' : ''}
            placeholder="github_pat_… (optional)"
            hint="Needs only the contents:read scope. Clear the field to remove it."
          />
        </Panel>

        : <Panel title="Public demo access"><p>Public repositories work without credentials. For private code or opening remediation pull requests, self-host Annex. Patch downloads work here.</p></Panel>}

        <button type="submit" className="btn btn-primary">
          Save settings
        </button>
      </form>

      <Panel title="Your data">
        <p style={{ fontSize: 13.5, color: 'var(--ink-soft)', margin: '0 0 16px', maxWidth: '68ch' }}>
          GDPR Articles 15 and 17. Annex reported this gap against its own web app on a self-scan ;{' '}
          <code className="code">gdpr.art17.erasure</code> came back missing · so it was fixed rather than
          excluded. Reports can contain quoted source code and personal data found in that source. Export only what you intend to share. Erasure removes your workspace, reports and published trust pages.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <a className="btn btn-sm" href="/api/account/export">
            Export everything as JSON
          </a>
        </div>

        {params.error ? (
          <p role="alert" style={{ color: 'var(--crimson)', fontSize: 13, margin: '16px 0 0' }}>
            {params.error}
          </p>
        ) : null}

        <form action={eraseAccount} className="mt-5 flex flex-wrap items-end gap-3" style={{ marginTop: 20 }}>
          <div>
            <label htmlFor="confirm" className="eyebrow" style={{ display: 'block', marginBottom: 5 }}>
              Delete this account and every scan
            </label>
            <input
              id="confirm"
              name="confirm"
              className="input"
              placeholder='Type "delete"'
              style={{ width: 200 }}
              aria-describedby="confirm-hint"
            />
          </div>
          <button type="submit" className="btn" style={{ borderColor: 'var(--crimson)', color: 'var(--crimson)' }}>
            Erase permanently
          </button>
        </form>
        <p id="confirm-hint" style={{ fontSize: 12, color: 'var(--ink-faint)', margin: '8px 0 0' }}>
          Cascades to every system and scan. There is no undo.
        </p>
      </Panel>
    </div>
  );
}

function Field({
  label,
  name,
  hint,
  ...rest
}: { label: string; name: string; hint?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  const id = `set-${name}`;
  return (
    <div>
      <label htmlFor={id} className="eyebrow" style={{ display: 'block', marginBottom: 5 }}>
        {label}
      </label>
      <input id={id} name={name} className="input" aria-describedby={hint ? `${id}-hint` : undefined} {...rest} />
      {hint ? (
        <p id={`${id}-hint`} style={{ fontSize: 12, color: 'var(--ink-faint)', margin: '5px 0 0' }}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}
