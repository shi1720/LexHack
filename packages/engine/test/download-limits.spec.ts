import { describe, expect, it } from 'vitest';
import { ingestGitHub } from '../src/ingest/github.js';
import { gzipSync } from 'node:zlib';
import { readTarGz } from '../src/ingest/tar.js';
function fetchArchive(archive: Response) {
  let calls = 0;
  return (async () => ++calls === 1 ? new Response(JSON.stringify({ default_branch: 'main', full_name: 'test/repo', html_url: 'https://github.com/test/repo' })) : archive) as typeof fetch;
}
describe('untrusted repository resource limits', () => {
  it('rejects an oversized declared length before reading the body', async () => {
    let cancelled = false;
    const archive = new Response(new ReadableStream({ cancel() { cancelled = true; } }), { headers: { 'content-length': '1000' } });
    await expect(ingestGitHub('test/repo', { maxBytes: 20, fetchImpl: fetchArchive(archive) })).rejects.toMatchObject({ code: 'too-large' });
    expect(cancelled).toBe(true);
  });
  it('bounds a chunked response without trusting content-length', async () => {
    const archive = new Response(new ReadableStream({ start(c) { c.enqueue(new Uint8Array(12)); c.enqueue(new Uint8Array(12)); c.close(); } }));
    await expect(ingestGitHub('test/repo', { maxBytes: 20, fetchImpl: fetchArchive(archive) })).rejects.toMatchObject({ code: 'too-large' });
  });
  it('rejects compressed archives whose expansion exceeds the limit', () => {
    const compressed = gzipSync(Buffer.alloc(129 * 1024 * 1024));
    expect(() => readTarGz(compressed)).toThrow();
  });
});
