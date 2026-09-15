import type { Citation } from '../types.js';

/**
 * Every finding Annex produces must be traceable to a specific piece of law.
 * These helpers make the citation the *cheapest* thing to write, so no control
 * ever ships without one.
 */

const AI_ACT_BASE = 'https://artificialintelligenceact.eu';

/** Regulation (EU) 2024/1689 — the EU AI Act. */
export function aiAct(locator: string, title: string, opts: { anchor?: string; quote?: string } = {}): Citation {
  const c: Citation = {
    instrument: 'Regulation (EU) 2024/1689 (EU Artificial Intelligence Act)',
    short: 'EU AI Act',
    locator,
    title,
    url: opts.anchor ? `${AI_ACT_BASE}/${opts.anchor}/` : AI_ACT_BASE,
  };
  if (opts.quote) c.quote = opts.quote;
  return c;
}

export function aiActArticle(n: number, sub: string, title: string, quote?: string): Citation {
  const locator = sub ? `Art. ${n}${sub}` : `Art. ${n}`;
  return aiAct(locator, title, { anchor: `article/${n}`, ...(quote ? { quote } : {}) });
}

export function aiActAnnex(annex: string, point: string, title: string, quote?: string): Citation {
  return aiAct(`Annex ${annex}${point ? `, point ${point}` : ''}`, title, {
    anchor: `annex/${annex.toLowerCase()}`,
    ...(quote ? { quote } : {}),
  });
}

export function gdpr(locator: string, title: string, quote?: string): Citation {
  const c: Citation = {
    instrument: 'Regulation (EU) 2016/679 (GDPR)',
    short: 'GDPR',
    locator,
    title,
    url: 'https://gdpr-info.eu/',
  };
  if (quote) c.quote = quote;
  return c;
}

export function colorado(locator: string, title: string, quote?: string): Citation {
  const c: Citation = {
    instrument: 'Colorado Revised Statutes tit. 6, art. 1, pt. 17 (SB 24-205, the Colorado AI Act)',
    short: 'Colorado AI Act',
    locator,
    title,
    url: 'https://leg.colorado.gov/bills/sb24-205',
  };
  if (quote) c.quote = quote;
  return c;
}

export function nycLL144(locator: string, title: string, quote?: string): Citation {
  const c: Citation = {
    instrument: 'NYC Admin. Code tit. 20, ch. 5, subch. 25 (Local Law 144 of 2021)',
    short: 'NYC Local Law 144',
    locator,
    title,
    url: 'https://www.nyc.gov/site/dca/about/automated-employment-decision-tools.page',
  };
  if (quote) c.quote = quote;
  return c;
}

export function nistRmf(locator: string, title: string, quote?: string): Citation {
  const c: Citation = {
    instrument: 'NIST AI Risk Management Framework 1.0 (NIST AI 100-1)',
    short: 'NIST AI RMF',
    locator,
    title,
    url: 'https://www.nist.gov/itl/ai-risk-management-framework',
  };
  if (quote) c.quote = quote;
  return c;
}

export function iso42001(locator: string, title: string): Citation {
  return {
    instrument: 'ISO/IEC 42001:2023 — Artificial intelligence management system',
    short: 'ISO/IEC 42001',
    locator,
    title,
    url: 'https://www.iso.org/standard/81230.html',
  };
}
