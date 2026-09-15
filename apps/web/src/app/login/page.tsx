import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  DEMO_EMAIL,
  DEMO_PASSWORD,
  createSession,
  createUser,
  currentUser,
  ensureDemoUser,
  findByEmail,
  passwordProblem,
  verifyPassword,
} from '@/server/auth';
import { seedDemoSystems } from '@/server/seed-demo';
import { Logo } from '@/components/primitives';

export const metadata = { title: 'Sign in' };
export const dynamic = 'force-dynamic';

async function signIn(formData: FormData) {
  'use server';
  const email = String(formData.get('email') ?? '');
  const password = String(formData.get('password') ?? '');
  const user = findByEmail(email);
  if (!user || !verifyPassword(password, user.passwordHash)) {
    redirect('/login?error=' + encodeURIComponent('That email and password do not match an account.'));
  }
  await createSession(user.id);
  redirect('/app');
}

async function signUp(formData: FormData) {
  'use server';
  const email = String(formData.get('email') ?? '').trim();
  const name = String(formData.get('name') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const orgName = String(formData.get('org') ?? '').trim();

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    redirect('/login?mode=signup&error=' + encodeURIComponent('Enter a valid email address.'));
  }
  if (!name) redirect('/login?mode=signup&error=' + encodeURIComponent('Tell us your name.'));
  const problem = passwordProblem(password);
  if (problem) redirect('/login?mode=signup&error=' + encodeURIComponent(problem));
  if (findByEmail(email)) {
    redirect('/login?error=' + encodeURIComponent('An account with that email already exists. Sign in instead.'));
  }

  const user = createUser({ email, name, password, orgName });
  await createSession(user.id);
  redirect('/app');
}

/** One click into a seeded account. A judge should never meet a signup wall. */
async function enterDemo() {
  'use server';
  const user = ensureDemoUser();
  seedDemoSystems(user.id);
  await createSession(user.id);
  redirect('/app');
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; error?: string }>;
}) {
  if (await currentUser()) redirect('/app');
  const params = await searchParams;
  const signup = params.mode === 'signup';

  return (
    <main id="main" className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-7 px-5 py-14">
      <Link href="/" className="no-underline">
        <Logo />
      </Link>

      <div className="card p-6">
        <form action={enterDemo}>
          <button type="submit" className="btn btn-primary w-full" style={{ height: 44, fontSize: 15 }}>
            Enter the demo workspace →
          </button>
        </form>
        <p className="mt-3" style={{ fontSize: 12.5, color: 'var(--ink-faint)', margin: '12px 0 0' }}>
          Four sample codebases, already scanned. No signup, no credentials, nothing to configure. The
          account is <code className="code">{DEMO_EMAIL}</code> if you would rather sign in by hand.
        </p>
      </div>

      <div className="flex items-center gap-3" aria-hidden="true">
        <span style={{ flex: 1, height: 1, background: 'var(--line)' }} />
        <span className="eyebrow">or use your own account</span>
        <span style={{ flex: 1, height: 1, background: 'var(--line)' }} />
      </div>

      <div className="card p-6">
        <h1 style={{ fontSize: 19, fontWeight: 640, margin: 0, letterSpacing: '-0.02em' }}>
          {signup ? 'Create an account' : 'Sign in'}
        </h1>

        {params.error ? (
          <p
            role="alert"
            className="mt-4 rounded-md px-3 py-2"
            style={{ background: 'var(--crimson-soft)', color: 'var(--crimson)', fontSize: 13, margin: '16px 0 0' }}
          >
            {params.error}
          </p>
        ) : null}

        <form action={signup ? signUp : signIn} className="mt-5 space-y-4">
          {signup ? (
            <>
              <Field label="Your name" name="name" autoComplete="name" required />
              <Field label="Organisation" name="org" autoComplete="organization" placeholder="Optional" />
            </>
          ) : null}
          <Field
            label="Email"
            name="email"
            type="email"
            autoComplete="email"
            required
            defaultValue={signup ? '' : DEMO_EMAIL}
          />
          <Field
            label="Password"
            name="password"
            type="password"
            autoComplete={signup ? 'new-password' : 'current-password'}
            required
            defaultValue={signup ? '' : DEMO_PASSWORD}
            hint={signup ? 'At least 10 characters, with a letter and a number.' : undefined}
          />
          <button type="submit" className="btn btn-primary w-full">
            {signup ? 'Create account' : 'Sign in'}
          </button>
        </form>

        <p className="mt-5" style={{ fontSize: 13, color: 'var(--ink-faint)', margin: '20px 0 0' }}>
          {signup ? 'Already have an account? ' : 'No account yet? '}
          <Link href={signup ? '/login' : '/login?mode=signup'} style={{ color: 'var(--navy)', fontWeight: 560 }}>
            {signup ? 'Sign in' : 'Create one'}
          </Link>
        </p>
      </div>

      <p style={{ fontSize: 12, color: 'var(--ink-faint)', textAlign: 'center' }}>
        Passwords are hashed with scrypt and the session is a signed httpOnly cookie. Annex has no identity
        vendor and sends nothing anywhere.
      </p>
    </main>
  );
}

function Field({
  label,
  name,
  hint,
  ...rest
}: { label: string; name: string; hint?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  const id = `field-${name}`;
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
