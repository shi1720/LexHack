import type { Evidence, RepoSnapshot, Signal, SignalIndex } from '../types.js';
import type { CompiledSignal } from './define.js';
import { AI_SIGNALS } from './catalogue.ai.js';
import { DOMAIN_SIGNALS } from './catalogue.domain.js';
import { CONTROL_SIGNALS } from './catalogue.controls.js';

export { defineSignal, trimSnippet } from './define.js';
export type { CompiledSignal, SignalSpec } from './define.js';

export const SIGNAL_CATALOGUE: CompiledSignal[] = [
  ...AI_SIGNALS,
  ...DOMAIN_SIGNALS,
  ...CONTROL_SIGNALS,
];

export const SIGNAL_CATALOGUE_VERSION = '2026.09.1';

function matches(id: string, pattern: string): boolean {
  if (pattern.endsWith('*')) return id.startsWith(pattern.slice(0, -1));
  return id === pattern;
}

export function createSignalIndex(signals: Signal[]): SignalIndex {
  const byId: Record<string, Signal> = {};
  for (const s of signals) byId[s.id] = s;

  return {
    byId,
    has: (id) => Boolean(byId[id]) && (byId[id]?.hits ?? 0) > 0,
    hasAny: (...ids) => ids.some((pattern) => signals.some((s) => s.hits > 0 && matches(s.id, pattern))),
    get: (id) => byId[id],
    prefix: (p) => signals.filter((s) => s.id.startsWith(p) && s.hits > 0),
    evidenceFor: (...ids) =>
      signals
        .filter((s) => ids.some((pattern) => matches(s.id, pattern)))
        .flatMap((s) => s.evidence),
    all: () => signals,
  };
}

export interface ExtractOptions {
  catalogue?: CompiledSignal[];
  /** Called after each detector; used for progress streaming. */
  onProgress?: (done: number, total: number, id: string) => void;
}

/** Run every detector over a snapshot. Deterministic, no network, no model. */
export function extractSignals(snapshot: RepoSnapshot, opts: ExtractOptions = {}): Signal[] {
  const catalogue = opts.catalogue ?? SIGNAL_CATALOGUE;
  const out: Signal[] = [];

  catalogue.forEach((spec, i) => {
    const evidence: Evidence[] = spec.detect(snapshot);
    const files = new Set(evidence.map((e) => e.path));
    out.push({
      id: spec.id,
      label: spec.label,
      category: spec.category,
      description: spec.description,
      evidence,
      fileCount: files.size,
      hits: evidence.length,
    });
    opts.onProgress?.(i + 1, catalogue.length, spec.id);
  });

  return out;
}
