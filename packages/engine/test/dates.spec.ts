import { describe, expect, it } from 'vitest';
import { ALL_PACKS } from '../src/packs/index.js';
import { DATES } from '../src/packs/eu-ai-act.js';

/**
 * The product's own thesis, applied to itself.
 *
 * Annex's central claim is that "every control carries its own application
 * date" — which is only worth saying if the dates are right. They were not,
 * twice. Article 25 was marked generally applicable when it sits in Chapter III
 * Section 3. Then Articles 49, 72 and 73 were dated with the high-risk regime
 * because that is what a practitioner would *expect*, even though Article 113
 * says otherwise and our own research note said so too.
 *
 * The second mistake is the instructive one: the first version of this file
 * was an article→date map, and a map can be tuned until the controls pass. So
 * the table below records where each article **sits in the Regulation**, and
 * the date is derived from that. Getting a control's date wrong now requires
 * misstating which chapter an article is in, which is a harder thing to do by
 * accident and an obvious thing to review.
 *
 * Article 113 as amended by Regulation (EU) 2026/1744:
 *
 *   ¶1  2 February 2025 — Chapters I and II.
 *   ¶2  2 August 2026   — general application: everything not otherwise named,
 *                         which is where Chapter IV (Article 50), Chapter III
 *                         Sections 4 and 5, and Chapter IX all sit.
 *   ¶4  2 December 2027 — Chapter III **Sections 1, 2 and 3**, as regards
 *                         Annex III high-risk systems.
 *   ¶5  2 August 2028   — the same sections, as regards Annex I.
 */

type Placement =
  | 'chapter-i'
  | 'chapter-ii'
  | 'chapter-iii-s1'
  | 'chapter-iii-s2'
  | 'chapter-iii-s3'
  | 'chapter-iii-s5'
  | 'chapter-iv'
  | 'chapter-ix';

/** Where each article sits. This is a fact about the Regulation's structure. */
const PLACEMENT: Record<number, Placement> = {
  3: 'chapter-i', // Definitions
  4: 'chapter-i', // AI literacy
  5: 'chapter-ii', // Prohibited practices
  6: 'chapter-iii-s1', // Classification rules
  9: 'chapter-iii-s2', // Requirements for high-risk systems
  10: 'chapter-iii-s2',
  11: 'chapter-iii-s2',
  12: 'chapter-iii-s2',
  13: 'chapter-iii-s2',
  14: 'chapter-iii-s2',
  15: 'chapter-iii-s2',
  16: 'chapter-iii-s3', // Obligations of providers and deployers
  17: 'chapter-iii-s3',
  19: 'chapter-iii-s3',
  25: 'chapter-iii-s3',
  26: 'chapter-iii-s3', // Obligations of deployers
  27: 'chapter-iii-s3', // Fundamental rights impact assessment
  43: 'chapter-iii-s5', // Conformity assessment, certificates, registration
  47: 'chapter-iii-s5',
  48: 'chapter-iii-s5',
  49: 'chapter-iii-s5',
  50: 'chapter-iv', // Transparency obligations
  72: 'chapter-ix', // Post-market monitoring, information sharing, surveillance
  73: 'chapter-ix',
};

/** Article 113 maps a placement to a date. Nothing else does. */
const APPLIES_FROM: Record<Placement, string> = {
  'chapter-i': DATES.PROHIBITIONS,
  'chapter-ii': DATES.PROHIBITIONS,
  'chapter-iii-s1': DATES.HIGH_RISK_ANNEX_III,
  'chapter-iii-s2': DATES.HIGH_RISK_ANNEX_III,
  'chapter-iii-s3': DATES.HIGH_RISK_ANNEX_III,
  'chapter-iii-s5': DATES.GENERAL,
  'chapter-iv': DATES.GENERAL,
  'chapter-ix': DATES.GENERAL,
};

/**
 * Controls whose date deliberately differs from their article's placement,
 * each because the Regulation says so somewhere else.
 */
const DELIBERATE_EXCEPTIONS: Record<string, string> = {
  'eu-ai-act.art5.ncii-csam-safeguards':
    'New Article 5(1)(ba) and (bb), inserted by Regulation (EU) 2026/1744, apply from 2 December 2026 rather than with the rest of Article 5.',
  'eu-ai-act.art50.2.content-marking':
    'Article 111(4) gives generative systems already on the market before 2 August 2026 until 2 December 2026 to comply with the marking duty.',
  'eu-ai-act.art3.role-determination':
    'Article 3 is a definitions provision and imposes no duty of its own. The control is anchored to the Article 50 consequence of the determination, which is what binds today.',
};

function articleOf(locator: string): number | undefined {
  const m = /^Art\.\s*(\d+)/.exec(locator);
  return m?.[1] ? Number(m[1]) : undefined;
}

describe('application dates are derived from Article 113, not typed by hand', () => {
  const euPack = ALL_PACKS.find((p) => p.id === 'eu-ai-act');

  it('dates every EU AI Act control from where its article sits in the Regulation', () => {
    expect(euPack).toBeDefined();
    const wrong: string[] = [];

    for (const control of euPack!.controls) {
      if (DELIBERATE_EXCEPTIONS[control.id]) continue;
      const article = control.citations.map((c) => articleOf(c.locator)).find((n) => n !== undefined);
      if (article === undefined) {
        wrong.push(`${control.id}: no EU AI Act article in its citations`);
        continue;
      }
      const placement = PLACEMENT[article];
      if (!placement) {
        wrong.push(
          `${control.id}: Article ${article} is not placed in the table — record its chapter and section rather than guessing a date`,
        );
        continue;
      }
      const expected = APPLIES_FROM[placement];
      if (control.appliesFrom !== expected) {
        wrong.push(
          `${control.id}: Article ${article} is in ${placement}, which Article 113 switches on at ${expected}, but the control says ${control.appliesFrom}`,
        );
      }
    }

    expect(wrong, wrong.join('\n')).toEqual([]);
  });

  it('keeps Chapter III Sections 4 and 5 and Chapter IX in force while Sections 1-3 are deferred', () => {
    // The oddity the Omnibus created, and the one this corpus got wrong once:
    // registration, post-market monitoring and serious-incident reporting all
    // apply thirteen months before the requirements they attach to.
    expect(APPLIES_FROM['chapter-iii-s5']).toBe('2026-08-02');
    expect(APPLIES_FROM['chapter-ix']).toBe('2026-08-02');
    expect(APPLIES_FROM['chapter-iii-s2']).toBe('2027-12-02');

    const byId = Object.fromEntries(euPack!.controls.map((c) => [c.id, c.appliesFrom]));
    expect(byId['eu-ai-act.art49.registration']).toBe('2026-08-02');
    expect(byId['eu-ai-act.art72.post-market-monitoring']).toBe('2026-08-02');
    expect(byId['eu-ai-act.art73.incident-reporting']).toBe('2026-08-02');
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
