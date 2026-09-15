import { describe, expect, it } from 'vitest';
import { ALL_PACKS } from '../src/packs/index.js';
import { DATES } from '../src/packs/eu-ai-act.js';

/**
 * The product's own thesis, applied to itself.
 *
 * Annex's central claim is that "every control carries its own application
 * date" — which is only worth saying if the dates are right. They were not:
 * Article 25 sits in Chapter III Section 3 and was dated as generally
 * applicable, because a human typed a constant and nothing checked it.
 *
 * So the structure of the Regulation is written down once, here, and every
 * control is checked against it. The table below is derived from Article 113
 * as amended by Regulation (EU) 2026/1744 (the Digital Omnibus on AI):
 *
 *   ¶1  2 February 2025 — Chapters I and II (definitions, AI literacy,
 *       prohibited practices).
 *   ¶2  2 August 2025 — Chapter V (GPAI models), Chapter XII, Article 78,
 *       and the governance and penalty provisions other than Article 101.
 *   ¶3  2 August 2026 — general application, which is where Chapter IV
 *       (Article 50) lives and where it stayed when the Omnibus moved
 *       everything around it.
 *   ¶4  2 December 2027 — Chapter III Sections 1, 2 and 3 (with the exception
 *       of Article 6(5)) as regards Annex III high-risk systems.
 *   ¶5  2 August 2028 — the same, as regards Annex I high-risk systems.
 *
 * A control whose article is not in the table fails loudly rather than being
 * quietly skipped: an obligation nobody has placed in the Regulation's
 * structure is an obligation whose date nobody has checked.
 */

type Expected = keyof typeof DATES;

/** EU AI Act article number -> the Article 113 paragraph that switches it on. */
const ARTICLE_APPLICATION: Record<number, Expected> = {
  3: 'GENERAL', // definitions apply from 2 Feb 2025, but a duty anchored to them
  //              binds when the duty does; see the role-determination control.
  4: 'PROHIBITIONS', // Chapter I — AI literacy
  5: 'PROHIBITIONS', // Chapter II — prohibited practices
  9: 'HIGH_RISK_ANNEX_III', // Chapter III Section 2
  10: 'HIGH_RISK_ANNEX_III',
  11: 'HIGH_RISK_ANNEX_III',
  12: 'HIGH_RISK_ANNEX_III',
  13: 'HIGH_RISK_ANNEX_III',
  14: 'HIGH_RISK_ANNEX_III',
  15: 'HIGH_RISK_ANNEX_III',
  16: 'HIGH_RISK_ANNEX_III', // Chapter III Section 3
  17: 'HIGH_RISK_ANNEX_III',
  19: 'HIGH_RISK_ANNEX_III',
  25: 'HIGH_RISK_ANNEX_III',
  43: 'HIGH_RISK_ANNEX_III', // Chapter III Section 5
  47: 'HIGH_RISK_ANNEX_III',
  49: 'HIGH_RISK_ANNEX_III',
  50: 'GENERAL', // Chapter IV — untouched by the Omnibus
  72: 'HIGH_RISK_ANNEX_III', // Chapter IX, but the duty attaches to a regulated
  73: 'HIGH_RISK_ANNEX_III', // high-risk system, which cannot exist before then
};

/** Controls whose date deliberately differs, each with the reason. */
const DELIBERATE_EXCEPTIONS: Record<string, string> = {
  'eu-ai-act.art5.ncii-csam-safeguards':
    'New Article 5(1)(ba) and (bb), inserted by the Omnibus, apply from 2 December 2026 rather than with the rest of Article 5.',
  'eu-ai-act.art50.2.content-marking':
    'Article 111(4) gives generative systems already on the market before 2 August 2026 until 2 December 2026 to comply with the marking duty.',
};

function articleOf(locator: string): number | undefined {
  const m = /^Art\.\s*(\d+)/.exec(locator);
  return m?.[1] ? Number(m[1]) : undefined;
}

describe('application dates are derived from Article 113, not typed by hand', () => {
  const euPack = ALL_PACKS.find((p) => p.id === 'eu-ai-act');

  it('places every EU AI Act control on the date its article actually applies', () => {
    expect(euPack).toBeDefined();
    const wrong: string[] = [];

    for (const control of euPack!.controls) {
      if (DELIBERATE_EXCEPTIONS[control.id]) continue;
      const article = control.citations.map((c) => articleOf(c.locator)).find((n) => n !== undefined);
      if (article === undefined) {
        wrong.push(`${control.id}: no EU AI Act article in its citations`);
        continue;
      }
      const expected = ARTICLE_APPLICATION[article];
      if (!expected) {
        wrong.push(`${control.id}: Article ${article} is not in the Article 113 table — add it with its chapter and section`);
        continue;
      }
      if (control.appliesFrom !== DATES[expected]) {
        wrong.push(
          `${control.id}: Article ${article} applies from ${DATES[expected]} (${expected}), but the control says ${control.appliesFrom}`,
        );
      }
    }

    expect(wrong, wrong.join('\n')).toEqual([]);
  });

  it('keeps Article 50 in force while the high-risk regime is deferred', () => {
    // The single fact the whole product is built on. If the Omnibus analysis is
    // ever quietly reverted, this is the test that says so.
    expect(DATES.GENERAL < DATES.HIGH_RISK_ANNEX_III).toBe(true);
    expect(DATES.HIGH_RISK_ANNEX_III < DATES.HIGH_RISK_ANNEX_I).toBe(true);
    expect(DATES.GENERAL).toBe('2026-08-02');
    expect(DATES.HIGH_RISK_ANNEX_III).toBe('2027-12-02');
  });

  it('gives every control in every pack an ISO application date', () => {
    for (const pack of ALL_PACKS) {
      for (const control of pack.controls) {
        expect(control.appliesFrom, control.id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(Number.isNaN(Date.parse(control.appliesFrom)), control.id).toBe(false);
      }
    }
  });
});
