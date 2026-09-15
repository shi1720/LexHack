import type { RepoSnapshot } from '../types.js';
import { buildSnapshot, type SnapshotInput } from './snapshot.js';
import { readTarGz, stripRootDir } from './tar.js';

export interface GitHubRef {
  owner: string;
  repo: string;
  ref?: string;
}

export class IngestError extends Error {
  constructor(
    message: string,
    readonly code:
      | 'invalid-url'
      | 'not-found'
      | 'rate-limited'
      | 'too-large'
      | 'network'
      | 'private',
    readonly hint?: string,
  ) {
    super(message);
    this.name = 'IngestError';
  }
}

/** Accepts `owner/repo`, full https URLs, `.git` suffixes and `/tree/<ref>` paths. */
export function parseGitHubUrl(input: string): GitHubRef {
  const trimmed = input.trim().replace(/\.git$/, '').replace(/\/+$/, '');

  const shorthand = /^([\w.-]+)\/([\w.-]+)$/.exec(trimmed);
  if (shorthand?.[1] && shorthand[2]) {
    return { owner: shorthand[1], repo: shorthand[2] };
  }

  let url: URL;
  try {
    url = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
  } catch {
    throw new IngestError(`Not a GitHub repository: "${input}"`, 'invalid-url', 'Try owner/repo or https://github.com/owner/repo');
  }

  if (!/(^|\.)github\.com$/.test(url.hostname)) {
    throw new IngestError(`Only github.com repositories are supported right now (got ${url.hostname}).`, 'invalid-url');
  }

  const parts = url.pathname.split('/').filter(Boolean);
  const owner = parts[0];
  const repo = parts[1];
  if (!owner || !repo) {
    throw new IngestError(`Could not read owner/repo from "${input}".`, 'invalid-url');
  }
  const treeIndex = parts.indexOf('tree');
  const ref = treeIndex >= 0 ? parts.slice(treeIndex + 1).join('/') : undefined;
  return ref ? { owner, repo, ref } : { owner, repo };
}

export interface GitHubIngestOptions {
  /** Optional PAT: lifts the 60/hr anonymous rate limit and reaches private repos. */
  token?: string;
  /** Hard cap on the downloaded tarball, bytes. */
  maxBytes?: number;
  fetchImpl?: typeof fetch;
}

interface RepoMeta {
  default_branch: string;
  full_name: string;
  description: string | null;
  private: boolean;
  html_url: string;
  stargazers_count?: number;
  license?: { spdx_id?: string } | null;
}

export interface GitHubIngestResult {
  snapshot: RepoSnapshot;
  meta: {
    fullName: string;
    description: string;
    defaultBranch: string;
    htmlUrl: string;
    stars: number;
    private: boolean;
  };
}

const DEFAULT_MAX_BYTES = 60 * 1024 * 1024;

function headers(token?: string): Record<string, string> {
  const h: Record<string, string> = {
    'User-Agent': 'annex-compliance-engine',
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

/** Download and snapshot a GitHub repository without cloning it. */
export async function ingestGitHub(
  input: string,
  opts: GitHubIngestOptions = {},
): Promise<GitHubIngestResult> {
  const doFetch = opts.fetchImpl ?? fetch;
  const { owner, repo, ref } = parseGitHubUrl(input);

  const metaRes = await doFetch(`https://api.github.com/repos/${owner}/${repo}`, {
    headers: headers(opts.token),
  }).catch((err: unknown) => {
    throw new IngestError(`Could not reach GitHub: ${(err as Error).message}`, 'network');
  });

  if (metaRes.status === 404) {
    throw new IngestError(
      `Repository ${owner}/${repo} was not found.`,
      'not-found',
      'If it is private, add a GitHub token in Settings.',
    );
  }
  if (metaRes.status === 403 || metaRes.status === 429) {
    throw new IngestError(
      'GitHub rate limit reached for anonymous requests.',
      'rate-limited',
      'Add a personal access token in Settings to lift the limit to 5,000 requests/hour.',
    );
  }
  if (!metaRes.ok) {
    throw new IngestError(`GitHub returned ${metaRes.status} for ${owner}/${repo}.`, 'network');
  }

  const meta = (await metaRes.json()) as RepoMeta;
  const targetRef = ref ?? meta.default_branch;

  const tarUrl = `https://codeload.github.com/${owner}/${repo}/tar.gz/${targetRef}`;
  const tarRes = await doFetch(tarUrl, { headers: headers(opts.token) }).catch((err: unknown) => {
    throw new IngestError(`Could not download the repository archive: ${(err as Error).message}`, 'network');
  });
  if (!tarRes.ok) {
    throw new IngestError(
      `Could not download ${owner}/${repo}@${targetRef} (HTTP ${tarRes.status}).`,
      tarRes.status === 404 ? 'not-found' : 'network',
    );
  }

  const buf = Buffer.from(await tarRes.arrayBuffer());
  const maxBytes = opts.maxBytes ?? DEFAULT_MAX_BYTES;
  if (buf.byteLength > maxBytes) {
    throw new IngestError(
      `Repository archive is ${(buf.byteLength / 1024 / 1024).toFixed(0)} MB, over the ${(maxBytes / 1024 / 1024).toFixed(0)} MB scan limit.`,
      'too-large',
    );
  }

  const entries = stripRootDir(readTarGz(buf));
  const snapshotInput: SnapshotInput = {
    name: meta.full_name ?? `${owner}/${repo}`,
    origin: meta.html_url ?? `https://github.com/${owner}/${repo}`,
    ref: targetRef,
    files: entries.map((e) => ({ path: e.path, bytes: e.bytes })),
  };

  return {
    snapshot: buildSnapshot(snapshotInput),
    meta: {
      fullName: meta.full_name ?? `${owner}/${repo}`,
      description: meta.description ?? '',
      defaultBranch: meta.default_branch,
      htmlUrl: meta.html_url ?? `https://github.com/${owner}/${repo}`,
      stars: meta.stargazers_count ?? 0,
      private: Boolean(meta.private),
    },
  };
}
