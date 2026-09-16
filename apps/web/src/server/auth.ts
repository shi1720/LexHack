import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { SignJWT, jwtVerify } from 'jose';
import { db, installationSecret, newId, nowIso } from './db';

/**
 * Authentication with no third party.
 *
 * scrypt for passwords, a signed JWT in an httpOnly cookie for the session.
 * A compliance tool that needs you to sign up to an identity vendor before it
 * will tell you anything is making a joke of itself, and one external service
 * is one more thing that can be down during a demo.
 */

const COOKIE = '__session'; // Firebase Hosting forwards only this cookie.
const MAX_AGE = 60 * 60 * 24 * 14;

/**
 * The session signing key. `ANNEX_SECRET` when set, otherwise a random secret
 * generated on first boot and kept in the database file ; never a constant
 * published in this repository, which is what a hardcoded fallback would be.
 */
function secret(): Uint8Array {
  const configured = process.env.ANNEX_SECRET;
  if (configured && configured.length >= 32) return new TextEncoder().encode(configured);
  if (configured) {
    throw new Error('ANNEX_SECRET is set but shorter than 32 characters. Use a random 32+ character string.');
  }
  return new TextEncoder().encode(installationSecret());
}

export interface User {
  id: string;
  email: string;
  name: string;
  orgName: string;
  turnoverEur: number | null;
  employees: number | null;
  githubToken: string | null;
  createdAt: string;
}

interface UserRow {
  id: string;
  email: string;
  name: string;
  password_hash: string;
  org_name: string;
  turnover_eur: number | null;
  employees: number | null;
  github_token: string | null;
  created_at: string;
}

function toUser(row: UserRow): User {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    orgName: row.org_name,
    turnoverEur: row.turnover_eur,
    employees: row.employees,
    githubToken: row.github_token,
    createdAt: row.created_at,
  };
}

// ---------------------------------------------------------------------------
// Passwords
// ---------------------------------------------------------------------------

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 });
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [scheme, saltHex, hashHex] = stored.split('$');
  if (scheme !== 'scrypt' || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, 'hex');
  const actual = scryptSync(password, Buffer.from(saltHex, 'hex'), expected.length, { N: 16384, r: 8, p: 1 });
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function passwordProblem(password: string): string | undefined {
  if (password.length > 200) return 'Use no more than 200 characters.';
  if (password.length < 10) return 'Use at least 10 characters.';
  if (!/[a-z]/i.test(password) || !/\d/.test(password)) return 'Include at least one letter and one number.';
  return undefined;
}

// ---------------------------------------------------------------------------
// Session
// ---------------------------------------------------------------------------

export async function createSession(userId: string): Promise<void> {
  const token = await new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret());

  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: MAX_AGE,
  });
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE);
}

/**
 * The signed-in user, or a redirect to the login page.
 *
 * Pages used to assert `(await currentUser())!`, which is true right up until
 * it is not: a session cookie that outlives the row it points at ; a reset
 * database, a deleted account ; made every page throw
 * `Cannot read properties of undefined (reading 'id')` and render a 500. The
 * layout's own `if (!user) redirect()` did not save them, because in the App
 * Router a layout and its page render in parallel. Asking for the user and
 * being sent to sign in are the same operation, so they are one function.
 */
export async function requireUser(): Promise<User> {
  const user = await currentUser();
  // Deliberately does *not* clear the stale cookie. Doing that here threw
  // `Cookies can only be modified in a Server Action or Route Handler` during
  // render, so the page a signed-out visitor got was an error page rather than
  // the login form ; on exactly the path this function exists to make safe. A
  // cookie pointing at a row that is gone is inert: `currentUser` already
  // returns undefined for it, `/login` renders normally, and the next
  // successful sign-in overwrites it.
  if (!user) redirect('/login');
  return user;
}

export async function currentUser(): Promise<User | undefined> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return undefined;
  try {
    const { payload } = await jwtVerify(token, secret());
    const row = db().prepare('SELECT * FROM users WHERE id = ?').get(payload.sub) as UserRow | undefined;
    return row ? toUser(row) : undefined;
  } catch {
    return undefined;
  }
}

// ---------------------------------------------------------------------------
// Accounts
// ---------------------------------------------------------------------------

export function findByEmail(email: string): (User & { passwordHash: string }) | undefined {
  const row = db().prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase().trim()) as UserRow | undefined;
  return row ? { ...toUser(row), passwordHash: row.password_hash } : undefined;
}

export function createUser(input: {
  email: string;
  name: string;
  password: string;
  orgName?: string;
}): User {
  const id = newId('usr');
  db()
    .prepare(
      `INSERT INTO users (id, email, name, password_hash, org_name, created_at)
       VALUES (@id, @email, @name, @passwordHash, @orgName, @createdAt)`,
    )
    .run({
      id,
      email: input.email.toLowerCase().trim(),
      name: input.name.trim(),
      passwordHash: hashPassword(input.password),
      orgName: input.orgName?.trim() ?? '',
      createdAt: nowIso(),
    });
  return toUser(db().prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow);
}

export function updateUser(id: string, patch: Partial<Pick<User, 'name' | 'orgName' | 'turnoverEur' | 'employees' | 'githubToken'>>): void {
  const current = db().prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow | undefined;
  if (!current) return;
  db()
    .prepare(
      `UPDATE users SET name = @name, org_name = @orgName, turnover_eur = @turnoverEur,
       employees = @employees, github_token = @githubToken WHERE id = @id`,
    )
    .run({
      id,
      name: patch.name ?? current.name,
      orgName: patch.orgName ?? current.org_name,
      turnoverEur: patch.turnoverEur === undefined ? current.turnover_eur : patch.turnoverEur,
      employees: patch.employees === undefined ? current.employees : patch.employees,
      githubToken: patch.githubToken === undefined ? current.github_token : patch.githubToken,
    });
}

/**
 * Erasure and export.
 *
 * GDPR Articles 15 and 17. Annex reported this gap against its own web app on
 * a self-scan ; `annex scan .` flagged `gdpr.art17.erasure` as missing ; which
 * is the most direct argument for the tool there is, so it was fixed rather
 * than excluded.
 *
 * Deletion cascades to systems and scans through the foreign keys. Scan
 * reports are derived entirely from public source code and carry no personal
 * data of their own, so there is nothing here to pseudonymise and retain.
 */
export function exportUserData(id: string): Record<string, unknown> {
  const handle = db();
  const user = handle.prepare('SELECT id, email, name, org_name, turnover_eur, employees, created_at FROM users WHERE id = ?').get(id);
  const systems = handle.prepare('SELECT * FROM systems WHERE user_id = ?').all(id);
  const scans = handle
    .prepare('SELECT id, system_id, status, score, live_score, tier, ledger_root, created_at FROM scans WHERE system_id IN (SELECT id FROM systems WHERE user_id = ?)')
    .all(id);
  return { exportedAt: nowIso(), user, systems, scans };
}

export function deleteUser(id: string): void {
  db().prepare('DELETE FROM users WHERE id = ?').run(id);
}

// ---------------------------------------------------------------------------
// The demo account ; a judge should never meet a signup wall
// ---------------------------------------------------------------------------

export const DEMO_EMAIL = 'demo@annex.dev';
export const DEMO_PASSWORD = 'annex-demo-2026';

export function ensureDemoUser(): User {
  // A fresh, unguessable identity for every visitor. No shared editable account.
  db().prepare("DELETE FROM users WHERE email LIKE 'visitor-%@demo.annex.local' AND created_at < ?")
    .run(new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
  const user = createUser({
    email: `visitor-${randomBytes(16).toString('hex')}@demo.annex.local`,
    name: 'Demo reviewer', password: randomBytes(32).toString('hex'), orgName: 'Your demo workspace',
  });
  updateUser(user.id, { turnoverEur: 9_800_000, employees: 40 });
  return { ...user, turnoverEur: 9_800_000, employees: 40 };
}
