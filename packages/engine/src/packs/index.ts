import type { RulePack } from '../types.js';
import { EU_AI_ACT_PACK } from './eu-ai-act.js';
import { NYC_LL144_PACK } from './nyc-ll144.js';
import { GDPR_PACK } from './gdpr.js';
import { COLORADO_ADMT_PACK } from './colorado-admt.js';
import { NIST_AI_RMF_PACK } from './nist-ai-rmf.js';

export { EU_AI_ACT_PACK, DATES as EU_AI_ACT_DATES } from './eu-ai-act.js';
export { NYC_LL144_PACK } from './nyc-ll144.js';
export { GDPR_PACK } from './gdpr.js';
export { COLORADO_ADMT_PACK } from './colorado-admt.js';
export { NIST_AI_RMF_PACK } from './nist-ai-rmf.js';
export * from './citations.js';
export * from './define.js';

/** Every pack Annex ships with. Order drives display order in the UI. */
export const ALL_PACKS: RulePack[] = [
  EU_AI_ACT_PACK,
  GDPR_PACK,
  NYC_LL144_PACK,
  COLORADO_ADMT_PACK,
  NIST_AI_RMF_PACK,
];

/** Packs enabled unless the caller narrows the set. */
export const DEFAULT_PACKS: RulePack[] = ALL_PACKS;

export function packById(id: string): RulePack | undefined {
  return ALL_PACKS.find((p) => p.id === id);
}

export function selectPacks(ids?: string[]): RulePack[] {
  if (!ids || ids.length === 0) return DEFAULT_PACKS;
  return ALL_PACKS.filter((p) => ids.includes(p.id));
}

/** Market code -> the packs that bind someone operating there. */
export const MARKET_PACKS: Record<string, { label: string; packs: string[] }> = {
  eu: { label: 'European Union / EEA', packs: ['eu-ai-act', 'gdpr'] },
  'us-nyc': { label: 'New York City', packs: ['nyc-ll144'] },
  'us-co': { label: 'Colorado', packs: ['colorado-admt'] },
  'us-federal': { label: 'United States (framework alignment)', packs: ['nist-ai-rmf'] },
};

/** Resolve the packs that apply to a set of markets. */
export function packsForMarkets(markets?: string[]): RulePack[] {
  if (!markets || markets.length === 0) return DEFAULT_PACKS;
  const ids = new Set<string>();
  for (const m of markets) for (const id of MARKET_PACKS[m]?.packs ?? []) ids.add(id);
  const selected = ALL_PACKS.filter((p) => ids.has(p.id));
  return selected.length > 0 ? selected : DEFAULT_PACKS;
}

export function controlById(id: string) {
  for (const p of ALL_PACKS) {
    const hit = p.controls.find((c) => c.id === id);
    if (hit) return hit;
  }
  return undefined;
}

/** Total number of executable obligations in the corpus. */
export const CORPUS_SIZE = ALL_PACKS.reduce((n, p) => n + p.controls.length, 0);
