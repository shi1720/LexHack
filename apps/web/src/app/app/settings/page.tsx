import { revalidatePath } from 'next/cache';
import { currentUser, updateUser } from '@/server/auth';
import { Panel } from '@/components/primitives';

export const metadata = { title: 'Settings' };
export const dynamic = 'force-dynamic';

async function save(formData: FormData) {
  'use server';
  const user = (await currentUser())!;
  const turnover = String(formData.get('turnover') ?? '').replace(/[^\d]/g, '');
  const employees = String(formData.get('employees') ?? '').replace(/[^\d]/g, '');
  const token = String(formData.get('github') ?? '').trim();

  updateUser(user.id, {
    name: String(formData.get('name') ?? user.name),
    orgName: String(formData.get('org') ?? ''),
    turnoverEur: turnover ? Number(turnover) : null,
    employees: employees ? Number(employees) : null,
    githubToken: token === '' ? null : token.startsWith('•') ? undefined : token,
  } as never);
  revalidatePath('/app/settings');
}

export default async function SettingsPage() {
  const user = (await currentUser())!;

  return (
    <div className="space-y-5" style={{ maxWidth: 680 }}>
      <div>
        <h1 style={{ fontSize: 26, fontWeight: 650, letterSpacing: '-0.025em', margin: 0 }}>Settings</h1>
        <p style={{ color: 'var(--ink-faint)', fontSize: 13.5, margin: '5px 0 0' }}>
          Two of these change what Annex computes, not just what it displays.
        </p>
      </div>

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
            turnover — except for SMEs and start-ups, where Article 99(6) inverts it to the <em>lower</em> of the
            two. Without these numbers Annex shows only the flat cap, which overstates exposure for a small
            company by a factor of a hundred.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Worldwide annual turnover (EUR)"
              name="turnover"
              inputMode="numeric"
              defaultValue={user.turnoverEur ? String(user.turnoverEur) : ''}
              placeholder="4200000"
            />
            <Field
              label="Employees"
              name="employees"
              inputMode="numeric"
              defaultValue={user.employees ? String(user.employees) : ''}
              placeholder="38"
              hint="Under 250 applies the SME cap."
            />
          </div>
        </Panel>

        <Panel title="GitHub access">
          <p style={{ fontSize: 13.5, color: 'var(--ink-soft)', margin: '0 0 16px', maxWidth: '68ch' }}>
            Public repositories scan with no credentials at all. A token lifts the anonymous rate limit and
            reaches private repositories. It is stored in your own database row and used only to download the
            repository archive.
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

        <button type="submit" className="btn btn-primary">
          Save settings
        </button>
      </form>
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
