import { describe, expect, it } from 'vitest';
import { SIGNAL_CATALOGUE } from '../src/signals/index.js';

/**
 * Every detector carries a lowercase keyword prefilter, checked against the
 * whole file before any line is scanned. It is what makes a scan fast, and it
 * is also a second, invisible copy of each pattern: a literal that appears in
 * a pattern and in no keyword can never match, because the file never reaches
 * the line loop.
 *
 * That is not hypothetical. `domain.profiling` matched `candidateScore` in its
 * pattern and had no keyword containing "score", so profiling was never
 * detected — and profiling is the fact that closes the Article 6(3)
 * derogation. The line Annex prints in the README, the deck and the landing
 * page as its own example was the line the prefilter was throwing away.
 *
 * This walks every pattern, pulls the literal runs out of it, and asserts that
 * at least one of them can survive the prefilter.
 */

/** Literal alphabetic runs a regex source requires, ignoring classes and groups. */
function literals(source: string): string[] {
  const stripped = source
    .replace(/\\[a-zA-Z]/g, ' ')
    .replace(/\[[^\]]*\]/g, ' ')
    .replace(/\{\d+(,\d*)?\}/g, ' ')
    .replace(/[(){}^$.*+?|]/g, ' ');
  return [...stripped.matchAll(/[a-zA-Z][a-zA-Z_-]{3,}/g)].map((m) => m[0].toLowerCase());
}

describe('keyword prefilters can reach their own patterns', () => {
  for (const spec of SIGNAL_CATALOGUE) {
    if (spec.keywords.length === 0) continue;
    const keywords = spec.keywords.map((k) => k.toLowerCase());

    for (const [i, pattern] of spec.patterns.entries()) {
      const words = literals(pattern.source);
      if (words.length === 0) continue;

      it(`${spec.id} pattern ${i}`, () => {
        // A pattern is reachable when some literal it requires is a substring
        // of a keyword, or a keyword is a substring of it — either direction
        // means a file containing the pattern also contains the keyword.
        const reachable = words.some((w) => keywords.some((k) => w.includes(k) || k.includes(w)));
        expect(
          reachable,
          `no keyword of ${spec.id} can match /${pattern.source}/ — the prefilter will skip every file this pattern would have found. Literals: ${words.slice(0, 8).join(', ')}`,
        ).toBe(true);
      });
    }
  }
});
