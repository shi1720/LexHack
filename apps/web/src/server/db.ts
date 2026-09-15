import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

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

export function db(): Database.Database {
  if (instance) return instance;

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

    CREATE INDEX IF NOT EXISTS idx_systems_user ON systems(user_id);
    CREATE INDEX IF NOT EXISTS idx_scans_system ON scans(system_id, created_at DESC);
  `);
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
