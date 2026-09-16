import { readdir, readFile, realpath, stat } from 'node:fs/promises';
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

  const visited = new Set<string>();

  // Resolved once. Every symlink target is checked against this, so the walk
  // cannot leave the directory the caller named.
  const realRoot = await realpath(root).catch(() => root);

  /** Source before everything else, so a truncated walk truncates the noise. */
  const rank = (name: string): number =>
    /^(src|lib|app|packages|apps|services|api|server|core|internal|cmd|pkg)$/i.test(name)
      ? 0
      : /^(docs?|documentation)$/i.test(name)
        ? 2
        : name.startsWith('.')
          ? 3
          : 1;

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
    // Source first. The walk used to take directories in readdir order and
    // stop at the file limit, so a repository with four thousand notes under
    // `aaa/` never reached `src/` — padding the tree was enough to make the
    // regulated code invisible, and the scan came back clean.
    const ordered = [...entries].sort((a, b) => rank(a.name) - rank(b.name) || a.name.localeCompare(b.name));

    for (const entry of ordered) {
      if (files.length >= maxFiles) return;
      const full = join(dir, entry.name);

      // A symlink is neither `isDirectory()` nor `isFile()`, so the whole
      // subtree behind one was silently dropped — which is how a pnpm,
      // Bazel or workspace layout loses its source. Resolve it, and keep a
      // visited set so a cycle terminates.
      let isDir = entry.isDirectory();
      let isFile = entry.isFile();
      if (entry.isSymbolicLink()) {
        try {
          // A symlink that leaves the tree is not part of the repository, and
          // following one is a confidentiality bug rather than a coverage
          // feature: `ln -s /tmp/secrets vendor` made `scan` read and then
          // *quote* files outside the directory the user named, into a report
          // people publish. Worse, it supplied evidence — a one-line
          // `notes.md` outside the tree satisfied Article 14.
          const real = await realpath(full);
          if (real !== realRoot && !real.startsWith(realRoot + sep)) continue;
          const target = await stat(full);
          const key = `${target.dev}:${target.ino}`;
          if (visited.has(key)) continue;
          visited.add(key);
          isDir = target.isDirectory();
          isFile = target.isFile();
        } catch {
          continue;
        }
      } else if (isDir) {
        // Real directories were never recorded, so `ln -s src src2` ingested
        // the subtree twice: double the file count, double the signal density,
        // and a tree pushed that much closer to the truncation limit.
        try {
          const self = await stat(full);
          const key = `${self.dev}:${self.ino}`;
          if (visited.has(key)) continue;
          visited.add(key);
        } catch {
          continue;
        }
      }

      if (isDir) {
        if (IGNORED_DIRS.has(entry.name)) continue;
        await walk(full);
        continue;
      }
      if (!isFile) continue;
      try {
        const info = await stat(full);
        const path = relative(root, full).split(sep).join('/');
        // A file past the hard limit is *recorded* and not read.
        //
        // It used to be dropped here, before the snapshot existed — so it was
        // absent from `oversizePaths`, produced no warning, and did not change
        // the tree digest. Appending two megabytes of padding to the one file
        // containing `detectEmotion()` therefore took a repository from
        // PROHIBITED, €35,000,000 to MINIMAL RISK, 100/100, €0, and
        // `verify --against` still called the tree unchanged.
        //
        // Recording an empty body with the real byte length puts it back in
        // the digest and in `oversizePaths`, where the scan warns about it by
        // name and `--fail-under` refuses over it.
        if (info.size > INGEST_LIMITS.maxFileBytes) {
          files.push({ path, bytes: new Uint8Array(0), declaredBytes: info.size });
          continue;
        }
        const buf = await readFile(full);
        files.push({ path, bytes: new Uint8Array(buf) });
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
