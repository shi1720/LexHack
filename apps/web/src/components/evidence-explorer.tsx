'use client';

import { useMemo, useState, type KeyboardEvent } from 'react';
import type { ControlResult } from '@annex/engine';
import { Citation, EvidenceLine, StatusBadge } from './primitives';
import { ExplainPanel } from './explain-panel';

type Filter = 'gaps' | 'live' | 'all' | 'evidenced';

const FILTERS: { key: Filter; label: string; hint: string }[] = [
  { key: 'gaps', label: 'Gaps', hint: 'Obligations with no or partial evidence' },
  { key: 'live', label: 'In force today', hint: 'Obligations already enforceable' },
  { key: 'evidenced', label: 'Evidenced', hint: 'Obligations the code already satisfies' },
  { key: 'all', label: 'All', hint: 'Every applicable obligation' },
];

/**
 * The evidence explorer.
 *
 * Statute on the left, source on the right, and a status that is derived from
 * the second rather than asserted about the first. This is the screen the whole
 * product exists to render.
 */
export function EvidenceExplorer({
  controls,
  packNames,
  systemId,
  initialSelected,
  compareTo,
}: {
  controls: ControlResult[];
  packNames: Record<string, string>;
  systemId: string;
  initialSelected?: string;
  /** The same product on the other side of the conformity work, if it is here. */
  compareTo?: { href: string; name: string };
}) {
  const [filter, setFilter] = useState<Filter>('gaps');
  const [packFilter, setPackFilter] = useState<string>('all');
  const [query, setQuery] = useState('');

  const applicable = useMemo(() => controls.filter((c) => c.status !== 'not_applicable'), [controls]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return applicable
      .filter((c) => {
        if (packFilter !== 'all' && c.pack !== packFilter) return false;
        if (filter === 'gaps' && c.status === 'satisfied') return false;
        if (filter === 'evidenced' && c.status !== 'satisfied') return false;
        if (filter === 'live' && !c.inForce) return false;
        if (!needle) return true;
        return (
          c.title.toLowerCase().includes(needle) ||
          c.obligation.toLowerCase().includes(needle) ||
          c.controlId.toLowerCase().includes(needle) ||
          c.citations.some((x) => `${x.short} ${x.locator}`.toLowerCase().includes(needle))
        );
      })
      .sort((a, b) => {
        // In-force failures first: those are the ones that cost money today.
        const rank = (c: ControlResult) =>
          (c.inForce ? 0 : 100) + (c.status === 'missing' ? 0 : c.status === 'partial' ? 1 : c.status === 'needs_review' ? 2 : 3) * 10;
        return rank(a) - rank(b) || b.weight - a.weight;
      });
  }, [applicable, filter, packFilter, query]);

  const [selectedId, setSelectedId] = useState<string | undefined>(initialSelected ?? visible[0]?.controlId);
  const selected = visible.find((c) => c.controlId === selectedId) ?? visible[0];

  const packs = useMemo(() => [...new Set(applicable.map((c) => c.pack))], [applicable]);

  /**
   * Up and down walk the obligation list, Home and End jump to its ends.
   *
   * An auditor working through thirty controls should not have to press Tab
   * thirty times, and the list is long enough that they will.
   */
  const onListKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const step = event.key === 'ArrowDown' ? 1 : event.key === 'ArrowUp' ? -1 : 0;
    if (step === 0 && event.key !== 'Home' && event.key !== 'End') return;
    const buttons = Array.from(
      event.currentTarget.closest('ul')?.querySelectorAll<HTMLButtonElement>('button[data-obligation]') ?? [],
    );
    const here = buttons.indexOf(event.currentTarget);
    const next =
      event.key === 'Home'
        ? buttons[0]
        : event.key === 'End'
          ? buttons[buttons.length - 1]
          : buttons[here + step];
    if (!next) return;
    event.preventDefault();
    next.focus();
    next.click();
  };

  return (
    <div className="space-y-4">
      {/* Controls ------------------------------------------------------- */}
      <div className="flex flex-wrap items-center gap-3">
        {/*
          A filter group, not a tab list. The ARIA tab pattern promises a screen
          reader that Left and Right move between the tabs and that each one
          controls a panel; neither was true here, and these are not tabs
          anyway — they narrow one list rather than swapping between several.
          `aria-pressed` describes what they actually are: toggles.
        */}
        <div role="group" aria-label="Filter obligations" className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => {
            const count =
              f.key === 'all'
                ? applicable.length
                : f.key === 'gaps'
                  ? applicable.filter((c) => c.status !== 'satisfied').length
                  : f.key === 'live'
                    ? applicable.filter((c) => c.inForce).length
                    : applicable.filter((c) => c.status === 'satisfied').length;
            const active = filter === f.key;
            return (
              <button
                key={f.key}
                type="button"
                aria-pressed={active}
                title={f.hint}
                className="btn btn-sm"
                onClick={() => setFilter(f.key)}
                style={
                  active
                    ? { background: 'var(--ink)', color: 'var(--paper)', borderColor: 'var(--ink)' }
                    : undefined
                }
              >
                {f.label}
                <span style={{ opacity: 0.65, marginLeft: 2 }}>{count}</span>
              </button>
            );
          })}
        </div>

        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:flex-1 sm:justify-end">
          <label htmlFor="pack-filter" className="sr-only">
            Filter by rule pack
          </label>
          <select
            id="pack-filter"
            className="input"
            style={{ width: '100%', minWidth: 0, maxWidth: 220 }}
            value={packFilter}
            onChange={(e) => setPackFilter(e.target.value)}
          >
            <option value="all">All rule packs</option>
            {packs.map((p) => (
              <option key={p} value={p}>
                {packNames[p] ?? p}
              </option>
            ))}
          </select>
          <label htmlFor="search" className="sr-only">
            Search obligations
          </label>
          <input
            id="search"
            className="input"
            style={{ width: '100%', minWidth: 0, flex: '1 1 180px', maxWidth: 280 }}
            placeholder="Search article, control, text…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Split view ----------------------------------------------------- */}
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
        <div className="card overflow-hidden">
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, maxHeight: 640, overflowY: 'auto' }}>
            {visible.length === 0 ? (
              <li style={{ padding: 20, fontSize: 13.5, color: 'var(--ink-faint)' }}>
                {/* "Nothing matches that filter" is true and useless. The case
                    that matters is `Evidenced` over a repository that evidences
                    nothing — the state of the demo's own headline system, and
                    the strongest thing this screen has to say if it says it. */}
                {filter === 'evidenced' && !query && packFilter === 'all' ? (
                  <>
                    <strong style={{ color: 'var(--ink-soft)' }}>This repository evidences nothing.</strong>
                    <span style={{ display: 'block', marginTop: 6 }}>
                      Every applicable obligation is a gap. That is not a bug in the scan — it is what a
                      product that has had no conformity work done to it looks like from the code.
                    </span>
                    {compareTo ? (
                      <a href={compareTo.href} style={{ display: 'inline-block', marginTop: 10, color: 'var(--navy)', fontWeight: 560 }}>
                        See the same product after the work — {compareTo.name} →
                      </a>
                    ) : null}
                  </>
                ) : (
                  'Nothing matches that filter.'
                )}
              </li>
            ) : null}
            {visible.map((c) => {
              const active = c.controlId === selected?.controlId;
              return (
                <li key={c.controlId} style={{ borderBottom: '1px solid var(--line)' }}>
                  <button
                    data-obligation
                    onClick={() => setSelectedId(c.controlId)}
                    onKeyDown={onListKeyDown}
                    aria-current={active ? 'true' : undefined}
                    style={{
                      display: 'block',
                      width: '100%',
                      textAlign: 'left',
                      padding: '11px 14px',
                      background: active ? 'var(--navy-soft)' : 'transparent',
                      border: 0,
                      borderLeft: `3px solid ${active ? 'var(--navy)' : 'transparent'}`,
                      cursor: 'pointer',
                      color: 'inherit',
                      font: 'inherit',
                    }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="cite" style={{ fontSize: 12 }}>
                        {c.citations[0] ? `${c.citations[0].short} ${c.citations[0].locator}` : c.controlId}
                      </span>
                      {/* A neutral fact — this obligation is enforceable today —
                          not an alarm. Crimson here sat next to a crimson
                          severity badge and a crimson status badge, three
                          different meanings in one card. */}
                      {c.inForce ? <span className="badge badge-neutral">In force today</span> : null}
                    </div>
                    <div style={{ fontSize: 13.5, fontWeight: active ? 600 : 480, marginTop: 2, lineHeight: 1.35 }}>
                      {c.title}
                    </div>
                    <div style={{ marginTop: 5 }}>
                      <StatusBadge status={c.status} prohibition={c.family === 'prohibition'} />
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        {selected ? (
          <ControlDetail control={selected} packName={packNames[selected.pack] ?? selected.pack} systemId={systemId} />
        ) : null}
      </div>
    </div>
  );
}

function ControlDetail({ control, packName, systemId }: { control: ControlResult; packName: string; systemId: string }) {
  const codeEvidence = control.evidence.filter((e) => e.kind !== 'absence');
  const absence = control.evidence.filter((e) => e.kind === 'absence');

  return (
    <article className="card" id={control.controlId}>
      <header className="border-b px-5 py-4" style={{ borderColor: 'var(--line)' }}>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={control.status} prohibition={control.family === 'prohibition'} />
          <span className="badge badge-neutral">{packName}</span>
          <span className="badge badge-neutral">{control.family.replace('-', ' ')}</span>
          {control.inForce ? (
            <span className="badge badge-bad">In force since {control.appliesFrom}</span>
          ) : (
            <span className="badge badge-neutral">Applies from {control.appliesFrom}</span>
          )}
        </div>
        <h2 className="mt-2.5" style={{ fontSize: 18, fontWeight: 630, letterSpacing: '-0.02em', margin: '10px 0 0' }}>
          {control.title}
        </h2>
        <p className="code" style={{ color: 'var(--ink-faint)', margin: '4px 0 0' }}>
          {control.controlId}
        </p>
      </header>

      <div className="space-y-5 p-5">
        {/* What the law says */}
        <section>
          <div className="eyebrow">What the law requires</div>
          <p className="legal mt-2" style={{ margin: '8px 0 0' }}>
            {control.obligation}
          </p>
          <div className="mt-3 space-y-2.5">
            {control.citations.map((cite) => (
              <div key={`${cite.short}-${cite.locator}`}>
                <Citation {...cite} />
                {cite.quote ? (
                  <blockquote
                    className="legal"
                    style={{
                      margin: '6px 0 0',
                      paddingLeft: 12,
                      borderLeft: '2px solid var(--navy)',
                      fontStyle: 'italic',
                      color: 'var(--ink-soft)',
                      fontSize: 14,
                    }}
                  >
                    “{cite.quote}”
                  </blockquote>
                ) : null}
                {cite.unverifiedLocator ? (
                  <p
                    className="mt-1.5"
                    style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--amber)', maxWidth: '68ch' }}
                  >
                    ⚠ {cite.unverifiedLocator}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </section>

        {/* What the code says */}
        <section className="rounded-md p-4" style={{ background: 'var(--sunken)' }}>
          <div className="eyebrow">What your code says</div>
          <p style={{ fontSize: 14, margin: '8px 0 0', color: 'var(--ink)' }}>{control.finding}</p>

          {codeEvidence.length > 0 ? (
            <div className="mt-3.5 space-y-2.5">
              {codeEvidence.map((e, i) => (
                <EvidenceLine key={`${e.path}-${e.line}-${i}`} {...e} />
              ))}
            </div>
          ) : null}

          {absence.length > 0 ? (
            <div className="mt-3.5 space-y-2">
              {absence.map((e, i) => (
                <EvidenceLine key={`absence-${i}`} {...e} />
              ))}
              <p style={{ fontSize: 11.5, color: 'var(--ink-faint)', margin: '6px 0 0' }}>
                A negative finding is recorded, not omitted: the search that found nothing is itself part of the
                evidence.
              </p>
            </div>
          ) : null}

          <p style={{ fontSize: 11.5, color: 'var(--ink-faint)', margin: '12px 0 0' }}>
            Determined by {control.method.replace('-', ' ')} · weight {control.weight} · severity {control.severity}
          </p>
        </section>

        {/* What to do */}
        {control.gap ? (
          <section>
            <div className="eyebrow">How to close it</div>
            <p style={{ fontSize: 14, margin: '8px 0 0', color: 'var(--ink-soft)' }}>{control.gap}</p>
            {control.remediationAvailable ? (
              <p className="mt-3" style={{ margin: '12px 0 0' }}>
                <span className="badge badge-info">Annex can write this one for you</span>
              </p>
            ) : null}
          </section>
        ) : null}

        <ExplainPanel systemId={systemId} controlId={control.controlId} />
      </div>
    </article>
  );
}
