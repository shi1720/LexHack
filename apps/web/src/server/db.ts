import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { createPublicKey } from 'node:crypto';
import { generateSigningKey } from '@annex/engine';

/**
 * SQLite, deliberately.
 *
 * The whole product is a deterministic function of a repository, so the
 * database only ever holds results. A single file means the app runs with one
 * command and no infrastructure, and the same schema runs on libSQL/Turso in
 * production without a migration.
 */

const DB_PATH = resolve(process.env.ANNEX_DB ?? './data/annex.db');

let instance: Database.Database | undefined;
let lastCleanup = 0;
function cleanup(handle: Database.Database) {
  if (Date.now() - lastCleanup < 60_000) return;
  lastCleanup = Date.now();
  handle.prepare("DELETE FROM users WHERE email LIKE 'visitor-%@demo.annex.local' AND created_at < ?")
    .run(new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
}

export function db(): Database.Database {
  if (instance) { cleanup(instance); return instance; }

  mkdirSync(dirname(DB_PATH), { recursive: true });
  const handle = new Database(DB_PATH);
  handle.pragma('journal_mode = WAL');
  handle.pragma('foreign_keys = ON');
  migrate(handle);
  instance = handle;
  return handle;
}

function migrate(handle: Database.Database): void {
  handle.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id            TEXT PRIMARY KEY,
      email         TEXT NOT NULL UNIQUE,
      name          TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      org_name      TEXT NOT NULL DEFAULT '',
      turnover_eur  INTEGER,
      employees     INTEGER,
      github_token  TEXT,
      created_at    TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS systems (
      id           TEXT PRIMARY KEY,
      user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name         TEXT NOT NULL,
      purpose      TEXT NOT NULL DEFAULT '',
      source       TEXT NOT NULL,
      source_kind  TEXT NOT NULL,
      markets      TEXT NOT NULL DEFAULT 'eu,us-federal',
      trust_slug   TEXT UNIQUE,
      trust_public INTEGER NOT NULL DEFAULT 0,
      created_at   TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS scans (
      id          TEXT PRIMARY KEY,
      system_id   TEXT NOT NULL REFERENCES systems(id) ON DELETE CASCADE,
      status      TEXT NOT NULL,
      score       INTEGER,
      live_score  INTEGER,
      tier        TEXT,
      ledger_root TEXT,
      error       TEXT,
      report      TEXT,
      created_at  TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_systems_user ON systems(user_id);
    CREATE INDEX IF NOT EXISTS idx_scans_system ON scans(system_id, created_at DESC);
  `);
}

/**
 * A per-installation secret, generated once and kept in the database file.
 *
 * The alternative shapes are both worse. A hardcoded fallback in a public
 * repository is a published signing key: anyone could mint a session for
 * anyone. Requiring an environment variable before the app will start turns
 * "clone it and run it" into a configuration exercise for a reviewer who just
 * wants to look at the thing. Generating one on first boot has neither
 * problem, and an operator who wants to manage the secret themselves still
 * can ; `ANNEX_SECRET` takes precedence and is what a multi-instance
 * deployment should set, since a value in one container's SQLite file does not
 * reach another's.
 */
export function installationSecret(): string {
  const row = db().prepare('SELECT value FROM settings WHERE key = ?').get('session_secret') as
    | { value: string }
    | undefined;
  if (row) return row.value;

  const bytes = new Uint8Array(48);
  crypto.getRandomValues(bytes);
  const value = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  db().prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('session_secret', value);
  return value;
}

/**
 * The installation's ledger signing key, created on first use.
 *
 * Every scan this app publishes is signed, because the trust page is the whole
 * point of the product and an unsigned conformity statement asks its reader to
 * take the publisher's word for the numbers. Generating the key on first boot
 * keeps "clone and run" working with no configuration ; the cost is that the
 * key lives in the same SQLite file as everything else, which SECURITY.md says
 * in those words rather than leaving you to find out.
 */
export function installationSigningKey(): string {
  const row = db().prepare('SELECT value FROM settings WHERE key = ?').get('ledger_signing_key') as
    | { value: string }
    | undefined;
  if (row) return row.value;

  const { privateKey } = generateSigningKey();
  db()
    .prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)')
    .run('ledger_signing_key', privateKey);
  return privateKey;
}

/** The public half, for showing a reader which key to check against. */
export function installationPublicKey(): string {
  return createPublicKey(installationSigningKey()).export({ type: 'spki', format: 'pem' }).toString();
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function newId(prefix: string): string {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${prefix}_${hex}`;
}

/** URL-safe, human-typeable slug for a public trust page. */
export function newSlug(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 28);
  const bytes = new Uint8Array(3);
  crypto.getRandomValues(bytes);
  const suffix = Array.from(bytes, (b) => b.toString(36)).join('').slice(0, 5);
  return `${base || 'system'}-${suffix}`;
}
