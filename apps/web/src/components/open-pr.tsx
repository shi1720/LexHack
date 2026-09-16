'use client';

import { useState } from 'react';

interface Result {
  number?: number;
  url?: string;
  files?: number;
  error?: string;
  hint?: string;
}

export function OpenPullRequest({ systemId, canOpen }: { systemId: string; canOpen: boolean }) {
  const [state, setState] = useState<'idle' | 'working' | 'done' | 'error'>('idle');
  const [result, setResult] = useState<Result>({});

  async function open() {
    setState('working');
    try {
      const res = await fetch(`/api/systems/${systemId}/pr`, { method: 'POST' });
      const body = (await res.json()) as Result;
      setResult(body);
      setState(res.ok ? 'done' : 'error');
    } catch (err) {
      setResult({ error: (err as Error).message });
      setState('error');
    }
  }

  if (state === 'done' && result.url) {
    return (
      <div className="rounded-md p-3" style={{ background: 'var(--moss-soft)', border: '1px solid color-mix(in srgb, var(--moss) 30%, transparent)' }}>
        <p style={{ fontSize: 13, color: 'var(--moss)', margin: 0, fontWeight: 600 }}>
          Pull request #{result.number} opened
        </p>
        <p style={{ fontSize: 12.5, margin: '5px 0 0' }}>
          <a href={result.url} target="_blank" rel="noreferrer noopener" style={{ color: 'var(--navy)' }}>
            {result.url}
          </a>
        </p>
        <p style={{ fontSize: 11.5, color: 'var(--ink-faint)', margin: '5px 0 0' }}>
          {result.files} files in one commit, on a new branch. Your default branch was not touched.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Only the primary action when it can actually be taken. A filled
          button that cannot be pressed is the brightest thing on a dark page
          and it leads nowhere; for a bundled sample the patch download is the
          real action, so this one steps back to a secondary. */}
      <button
        type="button"
        className={`btn btn-sm w-full${canOpen ? ' btn-primary' : ''}`}
        onClick={open}
        disabled={!canOpen || state === 'working'}
        aria-busy={state === 'working'}
      >
        {state === 'working' ? 'Opening…' : 'Open the pull request'}
      </button>
      {!canOpen ? (
        <p style={{ fontSize: 11.5, color: 'var(--ink-faint)', margin: '6px 0 0' }}>
          Download the patch in the public demo. Self-hosted installations can open a pull request with a scoped GitHub token.
        </p>
      ) : null}
      {state === 'error' ? (
        <p role="alert" className="mt-2 rounded-md px-3 py-2" style={{ background: 'var(--crimson-soft)', color: 'var(--crimson)', fontSize: 12, margin: '8px 0 0' }}>
          {result.error}
          {result.hint ? <span style={{ display: 'block', opacity: 0.85, marginTop: 3 }}>{result.hint}</span> : null}
        </p>
      ) : null}
    </div>
  );
}
