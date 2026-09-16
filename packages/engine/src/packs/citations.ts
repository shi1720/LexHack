import type { Citation } from '../types.js';

/**
 * Every finding Annex produces must be traceable to a specific piece of law.
 * These helpers make the citation the *cheapest* thing to write, so no control
 * ever ships without one.
 */

const AI_ACT_BASE = 'https://artificialintelligenceact.eu';

/** Regulation (EU) 2024/1689 ; the EU AI Act. */
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

/**
 * Local Law 144 lives in two places, and a citation that files one under the
 * other does not exist.
 *
 * The statute is NYC Administrative Code §§ 20-870 to 20-874. The rules that
 * implement it ; where the arithmetic actually lives ; are 6 RCNY §§ 5-300 to
 * 5-304. Every locator here used to carry the Administrative Code instrument,
 * so the product rendered "NYC Admin. Code tit. 20, ch. 5, subch. 25,
 * § 5-301(a)", which is not a provision of anything. On a tool whose pitch is
 * traceable citation, that is not a typo.
 */
export function nycLL144(locator: string, title: string, quote?: string): Citation {
  const isRule = /^§\s*5-3/.test(locator);
  const c: Citation = {
    instrument: isRule
      ? 'Rules of the City of New York, tit. 6, §§ 5-300 to 5-304 (implementing Local Law 144 of 2021)'
      : 'NYC Admin. Code tit. 20, ch. 5, subch. 25 (Local Law 144 of 2021)',
    short: isRule ? '6 RCNY' : 'NYC Admin. Code',
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
