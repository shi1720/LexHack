import { gunzipSync } from 'node:zlib';

export interface TarEntry {
  path: string;
  bytes: Uint8Array;
}

const BLOCK = 512;

function readString(buf: Buffer, offset: number, length: number): string {
  let end = offset;
  const limit = offset + length;
  while (end < limit && buf[end] !== 0) end++;
  return buf.toString('utf8', offset, end);
}

function readOctal(buf: Buffer, offset: number, length: number): number {
  const raw = readString(buf, offset, length).trim();
  if (!raw) return 0;
  // GNU base-256 encoding for large values.
  if ((buf[offset] ?? 0) & 0x80) {
    let value = 0;
    for (let i = offset + 1; i < offset + length; i++) value = value * 256 + (buf[i] ?? 0);
    return value;
  }
  const parsed = parseInt(raw, 8);
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Minimal, dependency-free tar reader covering the ustar/GNU subset that
 * `codeload.github.com` emits. We only need regular files and long names.
 */
export function readTar(input: Buffer): TarEntry[] {
  const entries: TarEntry[] = [];
  let offset = 0;
  let pendingLongName: string | undefined;

  while (offset + BLOCK <= input.length) {
    const header = input.subarray(offset, offset + BLOCK);
    // Two consecutive zero blocks mark the end of the archive.
    if (header.every((b) => b === 0)) break;

    const name = readString(header, 0, 100);
    const size = readOctal(header, 124, 12);
    const typeflag = String.fromCharCode(header[156] ?? 0);
    const prefix = readString(header, 345, 155);

    offset += BLOCK;
    const dataLength = Math.min(size, Math.max(0, input.length - offset));
    const data = input.subarray(offset, offset + dataLength);
    offset += Math.ceil(size / BLOCK) * BLOCK;

    if (typeflag === 'L') {
      pendingLongName = data.toString('utf8').replace(/\0+$/, '');
      continue;
    }
    if (typeflag === 'K' || typeflag === 'x' || typeflag === 'g') {
      pendingLongName = undefined;
      continue;
    }
    if (typeflag !== '0' && typeflag !== '\0' && typeflag !== '') continue;

    const fullPath = pendingLongName ?? (prefix ? `${prefix}/${name}` : name);
    pendingLongName = undefined;
    if (!fullPath || fullPath.endsWith('/')) continue;

    entries.push({ path: fullPath, bytes: new Uint8Array(data) });
  }

  return entries;
}

export function readTarGz(input: Buffer | Uint8Array): TarEntry[] {
  return readTar(gunzipSync(Buffer.from(input)));
}

/** GitHub tarballs nest everything under `owner-repo-sha/`. Strip that prefix. */
export function stripRootDir(entries: TarEntry[]): TarEntry[] {
  if (entries.length === 0) return entries;
  const firstSegments = new Set(entries.map((e) => e.path.split('/')[0] ?? ''));
  if (firstSegments.size !== 1) return entries;
  const [root] = [...firstSegments];
  if (!root) return entries;
  return entries
    .map((e) => ({ ...e, path: e.path.slice(root.length + 1) }))
    .filter((e) => e.path.length > 0);
}
