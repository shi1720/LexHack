'use client';

import { useState } from 'react';

type Audience = 'engineer' | 'executive' | 'auditor';

const AUDIENCES: { key: Audience; label: string }[] = [
  { key: 'engineer', label: 'For an engineer' },
  { key: 'executive', label: 'For a founder' },
  { key: 'auditor', label: 'For an assessor' },
];

/**
 * The only model-written text in the product, and it says so.
 *
 * The status, the evidence and the citation on this page were all decided
 * without a model. This panel rewrites that already-settled finding for a
 * particular reader; it cannot change what was found.
 */
export function ExplainPanel({ systemId, controlId }: { systemId: string; controlId: string }) {
  const [audience, setAudience] = useState<Audience | undefined>();
  const [state, setState] = useState<'idle' | 'loading' | 'done'>('idle');
  const [text, setText] = useState('');
  const [available, setAvailable] = useState(true);

  async function explain(next: Audience) {
    setAudience(next);
    setState('loading');
    try {
      const res = await fetch(`/api/systems/${systemId}/explain`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ controlId, audience: next }),
      });
      const body = (await res.json()) as { text?: string; available?: boolean; error?: string };
      setText(body.text ?? body.error ?? 'No explanation was returned.');
      setAvailable(Boolean(body.available));
    } catch (err) {
      setText((err as Error).message);
      setAvailable(false);
    }
    setState('done');
  }

  return (
    <section>
      <div className="flex flex-wrap items-center gap-2">
        <div className="eyebrow">Put it in plain language</div>
        <span className="badge badge-neutral" title="Everything else on this page is decided without a model.">
          model-written
        </span>
      </div>

      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {AUDIENCES.map((a) => (
          <button
            key={a.key}
            type="button"
            className="btn btn-sm"
            onClick={() => explain(a.key)}
            disabled={state === 'loading'}
            style={audience === a.key ? { background: 'var(--ink)', color: 'var(--paper)', borderColor: 'var(--ink)' } : undefined}
          >
            {a.label}
          </button>
        ))}
      </div>

      {state === 'loading' ? (
        <p className="pulse mt-3" style={{ fontSize: 13.5, color: 'var(--ink-faint)', margin: '12px 0 0' }}>
          Writing…
        </p>
      ) : null}

      {state === 'done' ? (
        <div
          className="mt-3 rounded-md p-3.5"
          style={{
            margin: '12px 0 0',
            background: available ? 'var(--navy-soft)' : 'var(--sunken)',
            border: `1px solid ${available ? 'color-mix(in srgb, var(--navy) 22%, transparent)' : 'var(--line)'}`,
          }}
        >
          <p style={{ fontSize: 14, margin: 0, whiteSpace: 'pre-wrap', color: 'var(--ink)' }}>{text}</p>
          {available ? (
            <p style={{ fontSize: 11, color: 'var(--ink-faint)', margin: '10px 0 0' }}>
              Written by a language model from the finding above. It cannot change the status, the evidence or
              the citation — those are produced by the deterministic engine and are what goes in the dossier.
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
