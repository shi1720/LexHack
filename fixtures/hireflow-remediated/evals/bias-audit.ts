/**
 * Independent bias audit harness.
 *
 * NYC Local Law 144, 6 RCNY § 5-301(b): calculate the selection rate and the
 * impact ratio for each category, separately for sex, race/ethnicity, and
 * intersectional sex x ethnicity x race categories, using EEO-1 categories.
 *
 * AI Act Art. 10(2)(f): examine for possible biases likely to lead to
 * discrimination prohibited under Union law.
 */

export const EEO1_CATEGORIES = {
  sex: ['male', 'female'],
  race: ['hispanic_or_latino', 'white', 'black_or_african_american', 'native_hawaiian_or_pacific_islander', 'asian', 'american_indian_or_alaska_native', 'two_or_more_races'],
} as const;

export interface AuditRow {
  sex: string;
  race: string;
  advanced: boolean;
}

export function selectionRate(rows: AuditRow[]): number {
  if (rows.length === 0) return 0;
  return rows.filter((r) => r.advanced).length / rows.length;
}

/** Impact ratio = selection rate for a category / selection rate of the most selected category. */
export function impactRatio(ratesByCategory: Record<string, number>): Record<string, number> {
  const max = Math.max(...Object.values(ratesByCategory));
  return Object.fromEntries(Object.entries(ratesByCategory).map(([k, v]) => [k, max === 0 ? 0 : v / max]));
}

/** Intersectional categories of sex x ethnicity x race — § 5-301(b)(3). */
export function intersectionalRates(rows: AuditRow[]): Record<string, number> {
  const groups = new Map<string, AuditRow[]>();
  for (const row of rows) {
    const key = `${row.sex}:${row.race}`;
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }
  return Object.fromEntries([...groups].map(([k, v]) => [k, selectionRate(v)]));
}

export function unknownCategoryCount(rows: { sex?: string; race?: string }[]): number {
  return rows.filter((r) => !r.sex || !r.race).length;
}
