import type { Dependency, RepoSnapshot, SourceFile } from '../types.js';
import { sha256 } from '../util/hash.js';
import { detectLanguage } from './languages.js';
import { INGEST_LIMITS, isBinaryPath, isIgnoredPath, isLockfile } from './ignore.js';
import { isIgnored, parseAnnexIgnore, type IgnoreRule } from './annexignore.js';

export interface RawFile {
  path: string;
  bytes: Uint8Array | string;
}

export interface SnapshotInput {
  name: string;
  origin?: string;
  ref?: string;
  commit?: string;
  files: RawFile[];
}

const decoder = new TextDecoder('utf-8', { fatal: false });
const NUL = String.fromCharCode(0);

function toText(bytes: Uint8Array | string): string {
  return typeof bytes === 'string' ? bytes : decoder.decode(bytes);
}

function byteLength(bytes: Uint8Array | string): number {
  return typeof bytes === 'string' ? Buffer.byteLength(bytes, 'utf8') : bytes.byteLength;
}

/** Heuristic NUL-byte check — cheaper and more reliable than extension alone. */
function looksBinary(text: string): boolean {
  return text.slice(0, 4096).includes(NUL);
}

export function buildSnapshot(input: SnapshotInput): RepoSnapshot {
  const files: SourceFile[] = [];
  let totalBytes = 0;
  let truncated = false;

  const sorted = [...input.files].sort((a, b) => a.path.localeCompare(b.path));

  // `.annexignore` is read before anything else, so an excluded file is still
  // counted and still hashed into the tree — it simply produces no signals.
  const ignoreFile = sorted.find((f) => f.path.replace(/^\.\//, '') === '.annexignore');
  const rules: IgnoreRule[] = ignoreFile ? parseAnnexIgnore(toText(ignoreFile.bytes)) : [];
  let ignoredCount = 0;

  for (const raw of sorted) {
    const path = raw.path.replace(/^\.\//, '').replace(/\\/g, '/');
    if (!path || path.endsWith('/')) continue;

    const size = byteLength(raw.bytes);
    const lang = detectLanguage(path);

    if (files.length >= INGEST_LIMITS.maxFiles || totalBytes >= INGEST_LIMITS.maxTotalBytes) {
      truncated = true;
      break;
    }

    if (isIgnoredPath(path)) {
      // Lockfiles live under ignored extensions but are kept for dependency extraction.
      if (!isLockfile(path)) continue;
    }

    const excluded = rules.length > 0 && isIgnored(path, rules);
    const shouldRead = !excluded && !isBinaryPath(path) && size <= INGEST_LIMITS.maxFileBytes;
    const text = shouldRead ? toText(raw.bytes) : '';
    const digest = sha256(typeof raw.bytes === 'string' ? raw.bytes : raw.bytes);
    if (excluded) ignoredCount++;

    if (shouldRead && looksBinary(text)) {
      files.push({ path, lang, bytes: size, loc: 0, text: '', sha256: digest, skipped: 'binary' });
      continue;
    }

    const record: SourceFile = {
      path,
      lang,
      bytes: size,
      loc: text ? text.split('\n').length : 0,
      text,
      sha256: digest,
    };
    if (!shouldRead) record.skipped = excluded ? 'ignored' : isBinaryPath(path) ? 'binary' : 'too-large';
    files.push(record);
    totalBytes += size;
  }

  const treeDigest = sha256(files.map((f) => `${f.path}:${f.sha256}`).join('\n'));
  const snapshot: RepoSnapshot = {
    id: treeDigest,
    name: input.name,
    files,
    dependencies: extractDependencies(files),
    fileCount: files.length,
    totalBytes,
    truncated,
    ignoredCount,
    capturedAt: new Date().toISOString(),
  };
  if (input.origin) snapshot.origin = input.origin;
  if (input.ref) snapshot.ref = input.ref;
  if (input.commit) snapshot.commit = input.commit;
  return snapshot;
}

// ---------------------------------------------------------------------------
// Dependency extraction — the input to the AI bill of materials
// ---------------------------------------------------------------------------

export function extractDependencies(files: SourceFile[]): Dependency[] {
  const out: Dependency[] = [];
  const seen = new Set<string>();

  const push = (d: Dependency) => {
    const key = `${d.ecosystem}:${d.name}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push(d);
  };

  for (const file of files) {
    const base = file.path.split('/').pop() ?? '';

    if (base === 'package.json' && file.text) {
      try {
        const pkg = JSON.parse(file.text) as {
          dependencies?: Record<string, string>;
          devDependencies?: Record<string, string>;
        };
        for (const [name, version] of Object.entries(pkg.dependencies ?? {})) {
          push({ name, version, ecosystem: 'npm', source: file.path });
        }
        for (const [name, version] of Object.entries(pkg.devDependencies ?? {})) {
          push({ name, version, ecosystem: 'npm', dev: true, source: file.path });
        }
      } catch {
        /* malformed manifest: a scan must never fail on user input */
      }
    }

    if (/^requirements.*\.txt$/.test(base) && file.text) {
      for (const line of file.text.split('\n')) {
        if (line.trim().startsWith('#')) continue;
        const m = /^\s*([A-Za-z0-9._-]+)\s*(?:[=<>!~]=?\s*([0-9A-Za-z.*+-]+))?/.exec(line);
        if (m?.[1]) {
          const dep: Dependency = { name: m[1], ecosystem: 'pypi', source: file.path };
          if (m[2]) dep.version = m[2];
          push(dep);
        }
      }
    }

    if ((base === 'pyproject.toml' || base === 'Pipfile') && file.text) {
      for (const line of file.text.split('\n')) {
        const m = /^\s*"?([A-Za-z0-9._-]+)"?\s*=\s*['"]?[\^~>=<]*([0-9][0-9A-Za-z.*-]*)/.exec(line);
        if (m?.[1] && !/^(python|name|version|description|requires|readme|authors|license)$/i.test(m[1])) {
          const dep: Dependency = { name: m[1], ecosystem: 'pypi', source: file.path };
          if (m[2]) dep.version = m[2];
          push(dep);
        }
      }
    }

    if (base === 'go.mod' && file.text) {
      for (const line of file.text.split('\n')) {
        const m = /^\s*(?:require\s+)?([a-z0-9.-]+\.[a-z]{2,}\/[^\s]+)\s+(v[0-9][^\s]*)/.exec(line);
        if (m?.[1]) push({ name: m[1], version: m[2], ecosystem: 'go', source: file.path });
      }
    }

    if (base === 'Cargo.toml' && file.text) {
      const depsBlock = /\[dependencies\]([\s\S]*?)(\n\[|$)/.exec(file.text);
      for (const line of (depsBlock?.[1] ?? '').split('\n')) {
        const m = /^\s*([A-Za-z0-9._-]+)\s*=/.exec(line);
        if (m?.[1]) push({ name: m[1], ecosystem: 'cargo', source: file.path });
      }
    }
  }

  return out.sort((a, b) => a.name.localeCompare(b.name));
}
