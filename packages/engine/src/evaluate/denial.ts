import type { Evidence } from '../types.js';

/**
 * A document that says the duty was *not* discharged is not evidence that it
 * was.
 *
 * The engine already refuses two ways of faking a closed control: a scaffold
 * whose judgements are still `_TODO_`, and a module nothing calls. Both are
 * about evidence that is *incomplete*. This is the third way, and it is the
 * opposite problem ; evidence that is complete and says no:
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
 * Real conformity documentation is full of it ; "not later than 2 days",
 * "never a final rejection", "not validated for languages other than English",
 * "a prioritisation signal, not a verdict". A word list over `no|not|never`
 * flags all of those and is unusable.
 *
 * So the patterns below match a narrower thing: a sentence in which the
 * *existence* of the measure, or the *performance* of the act, is denied or
 * deferred. "We have not obtained", "no audit has ever been conducted", "is
 * provisionally due", "we plan to". Across every document in every fixture in
 * this repository these patterns fire exactly once, on a sentence that is a
 * genuine denial ; and that sentence is not cited by any control.
 */
/**
 * Denials of existence and denials of performance.
 *
 * An allowlist of phrasings cannot be sound and this one was not: it covered
 * "we have never commissioned a bias audit" ; its own test vector ; and four
 * ordinary refusals walked past it. "No bias audit exists for this tool."
 * "Status: none." "Remains outstanding." "Was cancelled." So the patterns
 * below are shapes rather than sentences, and they are applied to the whole
 * paragraph around a citation rather than to the line under it, in both
 * directions. That is still a heuristic; what makes it defensible is that
 * firing wrongly costs a control at `partial` with the offending sentence
 * quoted, which a reader can disagree with.
 */
const DENIES = [
  // "We have never commissioned…", "the team did not establish…"
  //
  // The negation has to attach to a *performance* verb. Without that clause
  // this fired on "we would rather answer the request than have the authority
  // ask us why we did not" ; a sentence in this repository's own remediated
  // fixture, which is the kind of ordinary prose a guard like this must leave
  // alone.
  /\b(?:we|the (?:company|organisation|organization|team|provider|deployer|board|management)|this (?:document|repository|project|system|product))\b[^.]{0,50}?\b(?:ha(?:ve|s)|had|do(?:es)?|did|is|are|was|were)\s+(?:not|never)\s+(?:yet\s+)?(?:been\s+)?(?:\w+\s+){0,2}?(?:commission\w*|perform\w*|conduct\w*|complet\w*|carr(?:y|ied)|establish\w*|implement\w*|obtain\w*|publish\w*|maintain\w*|audit\w*|review\w*|document\w*|assess\w*|run|done|do|have|had)\b/i,
  // "We have no risk management system", "there is no audit"
  /\b(?:we|there)\s+(?:ha(?:ve|s)|is|are)\s+no\b/i,
  // "…has not yet been performed", "…have never been reviewed"
  /\bha(?:s|ve)\s+(?:not|never)\s+(?:yet\s+)?been\b/i,
  // "no independent audit has ever been conducted", "no bias audit exists"
  /\bno\s+[\w\s-]{0,40}?\b(?:has|have|was|were|exists?|existed)\b/i,
  // A performance verb, negated, whoever the subject is.
  /\b(?:not|never)\s+(?:yet\s+)?(?:commissioned|performed|conducted|completed|carried out|established|implemented|obtained|published|maintained|audited|reviewed|documented|assessed)\b/i,
  // "has yet to commission", "have yet to be reviewed"
  /\bha(?:s|ve)\s+yet\s+to\b/i,
  // "remains outstanding", "is still outstanding", "is pending"
  /\b(?:remains?|is|are|was|were)\s+(?:still\s+)?(?:outstanding|unstarted|incomplete|unfinished|pending|open)\b/i,
  // "was cancelled", "were abandoned", "we declined to fund one"
  /\b(?:cancelled|canceled|abandoned|deferred|postponed|declined|withdrew|withdrawn|lapsed|expired)\b/i,
  // "Status: none", "Bias audit: n/a"
  /\b(?:status|result|outcome|state)\b[^.\n]{0,30}:\s*(?:none|n\/a|nil|nothing|not applicable)\b/i,
  // A table cell whose whole content is the denial:
  //
  //     | Independent bias audit | None | 2026-06-01 |
  //
  // read as satisfied, on the one obligation where each further day of use is
  // a separate $500 violation, because a status table is not a sentence and
  // every pattern above wants a sentence.
  /(?:^|\|)\s*(?:none|n\/a|nil|nothing|not applicable|not performed|not started|not conducted|no)\s*\|/im,
  // "Has a bias audit been commissioned? Not yet." ; a two-word answer.
  /\bnot\s+yet\b\s*[.!]?\s*(?:$|\n)/im,
  // "There is none.", "We have none." The `\bno\b` pattern above stops at the
  // word boundary and never sees "none".
  /\b(?:there|we|the \w+)\s+(?:is|are|ha(?:ve|s))\s+(?:currently\s+)?(?:none|nothing)\b/i,
  // Bare "none" or "not applicable" as the answer to a heading.
  /^\s*(?:none|n\/a|nil|not applicable|to be confirmed)\s*\.?\s*$/i,
  // Deferred rather than denied ; a plan is not a control.
  /\b(?:is|are)\s+(?:provisionally\s+)?(?:due|planned|scheduled)\b/i,
  /\bwill\s+be\s+(?:commissioned|performed|conducted|completed|carried out|established|implemented|published|documented)\b/i,
  /\bwe\s+(?:intend|plan|aim)\s+to\b/i,
  /\b(?:TBD|to be (?:determined|confirmed|completed|decided))\b/i,
];

export function deniesTheDuty(text: string): boolean {
  return DENIES.some((r) => r.test(text));
}

/**
 * The section a line belongs to, bounded by markdown headings.
 *
 * Scanning forward from the citation was a second, independent bypass. A
 * denial one line *below* the last thing a control cited was never examined,
 * so a table of aspirational rows with "we have never commissioned one" under
 * it read as satisfied ; with the exact sentence the guard was written for
 * sitting in the file.
 */
const HEADING_LINE = /^\s{0,3}#{1,6}\s/;
/** A setext heading ; the underlined form. `eligibleLines` already knows it. */
const SETEXT_UNDERLINE = /^\s{0,3}[-=]{3,}\s*$/;

function isHeading(lines: string[], i: number): boolean {
  return HEADING_LINE.test(lines[i] ?? '') || SETEXT_UNDERLINE.test(lines[i + 1] ?? '');
}

function sectionAround(lines: string[], index: number): string {
  let first = index;
  let last = index;
  while (first > 0 && !isHeading(lines, first)) first--;
  while (last < lines.length - 1 && !isHeading(lines, last + 1)) last++;
  return lines.slice(first, last + 1).join(' ');
}

const STOPWORD = new Set([
  'about','after','under','which','their','there','these','those','where','while','with','from','that','this',
  'have','has','been','were','was','are','the','and','for','not','but','its','our','any','all','act','per',
  'regulation','article','articles','annex','section','system','systems','document','documentation','notes',
]);

/**
 * The words a document's title is about.
 *
 * Used to decide whether a denial *outside* the cited section is a denial of
 * the same thing. `docs/bias-audit.md` opens `# Bias audit`, so "we have never
 * commissioned a bias audit" three headings down is the document contradicting
 * itself and must count ; that was the bypass, and moving the sentence under a
 * `## Notes` heading was the whole attack.
 *
 * Reading the whole file unconditionally is the obvious fix and it is wrong: a
 * role-determination document that says, under a heading of its own, "we have
 * not obtained a written undertaking [from the model supplier]" is denying a
 * different thing, and capping the role determination on it is a false finding
 * against exactly the careful, candid documentation this tool wants to see
 * more of. So a distant denial has to be *about the document's subject*.
 */
function titleWords(lines: string[]): string[] {
  const title = lines.find((l) => HEADING_LINE.test(l)) ?? lines[0] ?? '';
  return [...new Set(title.toLowerCase().match(/[a-z]{3,}/g) ?? [])].filter((w) => !STOPWORD.has(w));
}

/** The section around the citation, plus any distant denial on the same subject. */
function scopeFor(lines: string[], index: number): string {
  const section = sectionAround(lines, index);
  const subject = titleWords(lines);
  if (subject.length === 0) return section;
  const distant = lines.filter((line) => {
    const lower = line.toLowerCase();
    return subject.some((w) => lower.includes(w)) && deniesTheDuty(line);
  });
  return distant.length > 0 ? `${section} ${distant.join(' ')}` : section;
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
 * Three changes from the version an auditor took apart. It reads the whole
 * *section* around each citation ; heading to heading ; instead of six lines
 * forward, because a denial below the last cited line was invisible: a table
 * of aspirational rows with "we have never commissioned one" in the paragraph
 * under it read as satisfied. It fires when *any*
 * documentation citation denies, rather than requiring all of them to ;
 * the old rule meant one positive sentence anywhere disabled the check. And
 * it no longer requires every citation to be documentation, because a single
 * incidental code citation was enough to switch the guard off for a control
 * otherwise resting entirely on prose.
 *
 * Code citations are still not examined: a line of code is a fact about the
 * system rather than a claim about it. Where this fires on a sentence that
 * only reads like a denial, the cost is a control at `partial` whose finding
 * quotes the exact line it read that way ; a thing a reader can disagree with,
 * rather than a verdict they have to trust.
 */
export function deniedByItsOwnEvidence(
  cited: Evidence[],
  fileText: (path: string) => string | undefined,
): Evidence[] {
  const denying: Evidence[] = [];
  const seen = new Set<string>();
  for (const e of cited) {
    if (e.kind !== 'doc') continue;
    const text = fileText(e.path);
    if (text === undefined) continue;
    const lines = text.split('\n');
    const index = Math.max(0, Math.min(lines.length - 1, e.line - 1));
    if (!deniesTheDuty(scopeFor(lines, index))) continue;

    // Quote the assertion rather than the heading the control happened to
    // cite, so the finding names the sentence a reader should look at.
    const assertion = assertionAt(lines, index);
    const line = assertion && deniesTheDuty(assertion.text) ? assertion.line : index + 1;
    const snippet = (lines[line - 1] ?? '').trim();
    const key = `${e.path}:${line}`;
    if (seen.has(key)) continue;
    seen.add(key);
    denying.push({ ...e, line, snippet });
  }
  return denying;
}
