import Link from 'next/link';
import { redirect } from 'next/navigation';
import { currentUser, destroySession } from '@/server/auth';
import { Logo } from '@/components/primitives';
import { ThemeToggle } from '@/components/theme-toggle';

export const dynamic = 'force-dynamic';

async function signOut() {
  'use server';
  await destroySession();
  redirect('/');
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  if (!user) redirect('/login');

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b" style={{ borderColor: 'var(--line)', background: 'var(--surface)' }}>
        <nav className="mx-auto flex min-h-14 max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-5 py-2">
          <div className="flex min-w-0 items-center gap-3 sm:gap-5">
            <Link href="/app" className="no-underline">
              <Logo size={19} />
            </Link>
            <span style={{ color: 'var(--line-strong)' }} aria-hidden="true">
              /
            </span>
            <span
              style={{
                fontSize: 13.5,
                color: 'var(--ink-soft)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {user.orgName || user.name}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link className="btn btn-sm" href="/app/new">
              Add system
            </Link>
            <Link className="btn btn-sm" href="/app/settings">
              Settings
            </Link>
            <ThemeToggle />
            <form action={signOut}>
              <button type="submit" className="btn btn-sm">
                Sign out
              </button>
            </form>
          </div>
        </nav>
      </header>
      <main id="main" className="mx-auto max-w-6xl px-5 py-8">
        {process.env.ANNEX_PUBLIC_DEMO === '1' ? <p className="demo-notice" role="note">Private demo workspace · Public repositories and samples only · Data resets after 24 hours or a service restart. Export reports to keep them.</p> : null}
        {children}
      </main>
      <footer className="border-t" style={{ borderColor: 'var(--line)' }}>
        <div className="mx-auto max-w-6xl px-5 py-6">
          <p style={{ fontSize: 12, color: 'var(--ink-faint)', margin: 0 }}>
            Annex is a technical tool, not legal advice, and not a conformity assessment. It produces the
            evidence a competent person needs in order to carry one out.
          </p>
        </div>
      </footer>
    </div>
  );
}
