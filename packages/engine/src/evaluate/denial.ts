import type { Evidence } from '../types.js';

/**
 * A document that says the duty was *not* discharged is not evidence that it
 * was.
 *
 * The engine already refuses two ways of faking a closed control: a scaffold
 * whose judgements are still `_TODO_`, and a module nothing calls. Both are
 * about evidence that is *incomplete*. This is the third way, and it is the
 * opposite problem — evidence that is complete and says no:
 *
 *     # Bias audit
 *     We have never commissioned a bias audit. The next bias audit is
 *     provisionally due 2027.
 *
 * A keyword matcher reads "bias audit" twice and closes the obligation, citing
 * the sentence that denies it. Nothing about the match is wrong; the *reading*
 * is. On the one obligation in the corpus where each further day of use is a
 * separate $500 violation, that is a tool actively making its user worse off.
 *
 * The hard part is not detecting negation, it is not detecting it everywhere.
 * Real conformity documentation is full of it — "not later than 2 days",
 * "never a final rejection", "not validated for languages other than English",
 * "a prioritisation signal, not a verdict". A word list over `no|not|never`
 * flags all of those and is unusable.
 *
 * So the patterns below match a narrower thing: a sentence in which the
 * *existence* of the measure, or the *performance* of the act, is denied or
 * deferred. "We have not obtained", "no audit has ever been conducted", "is
 * provisionally due", "we plan to". Across every document in every fixture in
 * this repository these patterns fire exactly once, on a sentence that is a
 * genuine denial — and that sentence is not cited by any control.
 */
const DENIES = [
  // "We have never commissioned…", "the team did not establish…"
  /\b(?:we|the (?:company|organisation|organization|team|provider|deployer)|this (?:document|repository|project|system|product))\b[^.]{0,40}?\b(?:ha(?:ve|s)|had|do(?:es)?|did|is|are|was|were)\s+(?:not|never)\b/i,
  // "We have no risk management system", "there is no audit"
  /\b(?:we|there)\s+(?:ha(?:ve|s)|is|are)\s+no\b/i,
  // "…has not yet been performed", "…have never been reviewed"
  /\bha(?:s|ve)\s+(?:not|never)\s+(?:yet\s+)?been\b/i,
  // "no independent audit has ever been conducted"
  /\bno\s+[\w\s-]{0,30}?\b(?:has|have|was|were)\s+(?:ever\s+)?been\b/i,
  // A performance verb, negated, whoever the subject is.
  /\b(?:not|never)\s+(?:yet\s+)?(?:commissioned|performed|conducted|completed|carried out|established|implemented|obtained|published|maintained|audited|reviewed|documented|assessed)\b/i,
  // Deferred rather than denied — a plan is not a control.
  /\b(?:is|are)\s+(?:provisionally\s+)?(?:due|planned|scheduled|pending)\b/i,
  /\bwill\s+be\s+(?:commissioned|performed|conducted|completed|carried out|established|implemented|published|documented)\b/i,
  /\bwe\s+(?:intend|plan|aim)\s+to\b/i,
  /\b(?:TBD|to be (?:determined|confirmed|completed|decided))\b/i,
];

export function deniesTheDuty(text: string): boolean {
  return DENIES.some((r) => r.test(text));
}

/** A heading names a topic; it does not assert anything about it. */
const NOT_AN_ASSERTION = /^\s{0,3}(?:#{1,6}\s|[-=]{3,}\s*$|\|[\s:|-]*\|\s*$|[-*+]\s*$|\s*$)/;

function assertionAt(lines: string[], index: number): { line: number; text: string } | undefined {
  for (let i = index; i < Math.min(lines.length, index + 6); i++) {
    const line = lines[i] ?? '';
    if (NOT_AN_ASSERTION.test(line)) continue;
    if (line.trim().split(/\s+/).length < 4) continue;
    return { line: i + 1, text: line };
  }
  return undefined;
}

/**
 * True when a `satisfied` verdict is resting on prose that denies the duty.
 *
 * Returns the denying lines, so the finding can quote the sentence rather than
 * asserting that one exists.
 *
 * Deliberately narrow in three directions.
 *
 * It looks only at documentation citations, and only where *every* citation is
 * documentation. A line of code is a fact about the system rather than a claim
 * about it — a `recordInference()` call nothing reaches is a wiring question,
 * not a negation one — so one code citation and the control keeps its verdict.
 *
 * It resolves each citation to the nearest *assertion*. Controls routinely
 * cite a document's heading, and "# Bias audit" neither affirms nor denies
 * anything; what matters is the sentence underneath it.
 *
 * And the patterns are about denied *existence* or denied *performance*, not
 * about negation. Real conformity documentation is full of legitimate
 * negation — "not later than 2 days", "never a final rejection", "a
 * prioritisation signal, not a verdict" — and a word list over `no|not|never`
 * flags all of it. Across every document in every fixture in this repository
 * these patterns fire on exactly one line, which is a genuine denial and is
 * cited by nothing.
 *
 * Where it does fire on a sentence that only reads like a denial, the cost is
 * a control at `partial` whose finding quotes the exact line it read that way
 * — which is a thing a reader can disagree with, rather than a verdict they
 * have to trust.
 */
export function deniedByItsOwnEvidence(
  cited: Evidence[],
  fileText: (path: string) => string | undefined,
): Evidence[] {
  const docs = cited.filter((e) => e.kind === 'doc');
  if (docs.length === 0 || docs.length !== cited.length) return [];

  const denying: Evidence[] = [];
  const seen = new Set<string>();
  for (const e of docs) {
    const text = fileText(e.path);
    if (text === undefined) continue;
    const assertion = assertionAt(text.split('\n'), Math.max(0, e.line - 1));
    if (assertion === undefined || !deniesTheDuty(assertion.text)) continue;
    const key = `${e.path}:${assertion.line}`;
    if (seen.has(key)) continue;
    seen.add(key);
    denying.push({ ...e, line: assertion.line, snippet: assertion.text.trim() });
  }
  return denying;
}
