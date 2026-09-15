import { readdir, readFile, stat } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';
import { IGNORED_DIRS, INGEST_LIMITS } from './ignore.js';
import { buildSnapshot, type RawFile, type SnapshotInput } from './snapshot.js';
import type { RepoSnapshot } from '../types.js';
import { IngestError } from './error.js';

export interface LocalIngestOptions {
  name?: string;
  origin?: string;
  ref?: string;
  commit?: string;
  maxFiles?: number;
}

/** Ingest a directory on disk. Used by the CLI and the local-path scan mode. */
export async function ingestDirectory(root: string, opts: LocalIngestOptions = {}): Promise<RepoSnapshot> {
  const files: RawFile[] = [];
  const maxFiles = opts.maxFiles ?? INGEST_LIMITS.maxFiles;

  async function walk(dir: string, top = false): Promise<void> {
    if (files.length >= maxFiles) return;
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch (err) {
      // A nested directory that vanished mid-walk or cannot be read is a file
      // we skip. The *root* being unreadable means we were pointed at the
      // wrong place, and reporting a score over nothing would be a lie.
      if (top) {
        throw new IngestError(
          `Cannot read "${dir}": ${(err as Error).message}`,
          'not-found',
          'Check the path. Annex will not score a repository it could not read.',
        );
      }
      return;
    }
    for (const entry of entries) {
      if (files.length >= maxFiles) return;
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (IGNORED_DIRS.has(entry.name)) continue;
        await walk(full);
        continue;
      }
      if (!entry.isFile()) continue;
      try {
        const info = await stat(full);
        if (info.size > INGEST_LIMITS.maxFileBytes * 4) continue;
        const buf = await readFile(full);
        files.push({ path: relative(root, full).split(sep).join('/'), bytes: new Uint8Array(buf) });
      } catch {
        /* unreadable file: skip */
      }
    }
  }

  await walk(root, true);

  if (files.length === 0) {
    throw new IngestError(
      `No readable files under "${root}".`,
      'empty',
      'An empty snapshot cannot evidence anything, so Annex refuses to score one.',
    );
  }

  const input: SnapshotInput = {
    name: opts.name ?? (root.split(sep).filter(Boolean).pop() || 'repository'),
    files,
  };
  if (opts.origin) input.origin = opts.origin;
  if (opts.ref) input.ref = opts.ref;
  if (opts.commit) input.commit = opts.commit;
  return buildSnapshot(input);
}
