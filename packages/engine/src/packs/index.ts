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

/** Market code -> the packs that bind someone operating there. */
export const MARKET_PACKS: Record<string, { label: string; packs: string[] }> = {
  eu: { label: 'European Union / EEA', packs: ['eu-ai-act', 'gdpr'] },
  'us-nyc': { label: 'New York City', packs: ['nyc-ll144'] },
  'us-co': { label: 'Colorado', packs: ['colorado-admt'] },
  'us-federal': { label: 'United States (framework alignment)', packs: ['nist-ai-rmf'] },
};

export interface MarketResolution {
  packs: RulePack[];
  /** Market codes that matched nothing. Never silently dropped. */
  unknown: string[];
  /** True when nothing resolved and the full corpus was used instead. */
  fellBack: boolean;
}

/**
 * Resolve the packs that bind someone operating in a set of markets.
 *
 * An unrecognised market code used to expand silently to the whole corpus, so
 * `--markets uk` scored you against New York City and said nothing. The
 * fallback is still the safe default ; it is better to over-report than to
 * report nothing ; but the caller is now told, and the warning reaches the
 * report.
 */
export function resolveMarkets(markets?: string[]): MarketResolution {
  if (!markets || markets.length === 0) return { packs: DEFAULT_PACKS, unknown: [], fellBack: false };
  const ids = new Set<string>();
  const unknown: string[] = [];
  for (const m of markets) {
    const entry = MARKET_PACKS[m];
    if (!entry) {
      unknown.push(m);
      continue;
    }
    for (const id of entry.packs) ids.add(id);
  }
  const selected = ALL_PACKS.filter((p) => ids.has(p.id));
  return selected.length > 0
    ? { packs: selected, unknown, fellBack: false }
    : { packs: DEFAULT_PACKS, unknown, fellBack: true };
}

/** Resolve markets to packs, discarding the diagnostics. */
export function packsForMarkets(markets?: string[]): RulePack[] {
  return resolveMarkets(markets).packs;
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
