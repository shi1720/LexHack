import type { Control, RulePack } from '../types.js';
import { nycLL144 } from './citations.js';
import { allOf, evidenceFrom, missing, needsReview, pack, partial, satisfied, whenSignal } from './define.js';

const c = pack('nyc-ll144');

/**
 * NYC Local Law 144 of 2021, implemented by 6 RCNY §§ 5-300 to 5-304.
 * Enforced since 5 July 2023 — the only bias-audit mandate anywhere that has
 * been live long enough to generate case files, and by far the most precisely
 * codable duty in the corpus. Its arithmetic is fully specified, so a scanner
 * can check for the *formula*, not just the vibe of fairness.
 */

const IN_FORCE = '2023-07-05';

/**
 * What actually makes a hiring tool an AEDT.
 *
 * The scope test was "this repository screens candidates", which catches every
 * HR machine-learning project in existence. The rule is narrower in two ways
 * that most New York employers relied on to conclude Local Law 144 did not
 * reach them, and neither was implemented:
 *
 *  - **6 RCNY § 5-300.** The tool has to "substantially assist or replace
 *    discretionary decision making", which the rule defines exhaustively:
 *    relying *solely* on a simplified output, weighting it above every other
 *    criterion, or using it to overrule conclusions drawn from other factors
 *    including a human's. A model that produces a number a recruiter reads
 *    alongside five other things is not an AEDT. Translation and transcription
 *    output is expressly not a simplified output at all.
 *  - **Geography.** The law binds employers and employment agencies using an
 *    AEDT *in New York City*, for candidates and employees in the city.
 *
 * Geography is a fact about a company rather than about code, so it arrives
 * through the market selection the operator already makes: evaluating this
 * pack at all is the assertion that New York City is in scope. That is stated
 * here rather than left implied, because a scope test nobody can see is the
 * same as no scope test.
 */
const isAedt = allOf(
  whenSignal('domain.employment.screening', 'domain.employment.management'),
  whenSignal('aedt.substantially-assists'),
  (ctx) => !ctx.signals.hasAny('aedt.translation-only'),
);

/**
 * Fixture dates for a duty that is about elapsed time.
 *
 * § 5-301(a) asks whether more than a year has passed, so a golden fixture
 * with a hard-coded date tests something different every year and eventually
 * tests the opposite of what it was written for — the previous "satisfied"
 * case was dated 2026-03-01 and would have started failing in March 2027.
 */
const daysAgo = (n: number): string => new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10);
/**
 * A repository that is an AEDT within 6 RCNY § 5-300, not merely one that
 * screens candidates.
 *
 * The scope test now requires the tool to substantially assist or replace
 * discretionary decision making, so a fixture that only ranks resumes is
 * outside the rule and every control returns `not_applicable`. This one relies
 * solely on the score against a threshold, which is limb (i).
 */
const AEDT =
  'const ADVANCE_THRESHOLD = 0.7;\n\nexport function screenCandidate(applicant) {\n  const resumeScore = rankResume(applicant.resume);\n  const hiringDecision = resumeScore >= ADVANCE_THRESHOLD ? "advance" : "reject";\n  return { candidate: applicant.id, shortlist: hiringDecision === "advance", hiring_decision: hiringDecision };\n}\n';

const controls: Control[] = [
  c({
    id: 'nyc-ll144.bias-audit',
    penaltyTier: 'first',
    title: 'Annual independent bias audit',
    obligation:
      '6 RCNY § 5-301(a): an employer or employment agency must not use an automated employment decision tool if more than one year has passed since its most recent bias audit, which must be carried out by an independent auditor.',
    family: 'data-governance',
    severity: 'critical',
    weight: 9,
    method: 'static-analysis',
    appliesFrom: IN_FORCE,
    citations: [
      nycLL144('§ 5-301(a)', 'Bias audit — annual requirement'),
      nycLL144('§ 5-300', "Definitions — 'independent auditor'"),
    ],
    appliesWhen: isAedt,
    evaluate: (ctx) => {
      const audit = ctx.grepDocs(/\bbias\s+audit\b/i, 4, /(bias|audit|fairness|ll144|aedt)/i);
      const testing = ctx.signals.get('data.bias.testing');

      if (audit.length > 0) {
        // § 5-301(a) is a rule about *currency*, and the arithmetic has to be
        // done properly or the control is worse than nothing. Two ways of
        // getting it wrong were both live here:
        //
        //  - A bare `Math.max` over any year in the document accepted a
        //    *future* one, so "the next bias audit is provisionally due 2027"
        //    read as an audit conducted in 2027. An audit cannot have been
        //    carried out on a date that has not happened.
        //  - Comparing calendar years meant an audit dated 2 January 2025 was
        //    "last year" in September 2026 — twenty months old, on the one
        //    duty in the corpus where every further day of use is a separate
        //    $500 violation under § 20-872.
        //
        // So: a full date is measured against a rolling twelve months, and a
        // bare year is only conclusive when it is the current one. A year
        // before that could be eleven months ago or twenty-three, and the
        // repository does not say which — which is what `needs_review` is for.
        const dated = ctx.grepDocs(/\b(20\d{2})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])\b|\b(19|20)\d{2}\b/, 6, /(bias|audit|fairness|ll144|aedt)/i);
        const now = Date.now();
        const thisYear = new Date(now).getFullYear();
        const DAY = 24 * 60 * 60 * 1000;

        const isoDates = dated
          .flatMap((e) => [...e.snippet.matchAll(/\b20\d{2}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])\b/g)].map((m) => m[0]))
          .filter((iso) => Date.parse(iso) <= now);
        const bareYears = dated
          .flatMap((e) => [...e.snippet.matchAll(/\b(20\d{2})\b(?!-(?:0[1-9]|1[0-2])-)/g)].map((m) => Number(m[1])))
          .filter((y) => y >= 2020 && y <= thisYear);

        if (isoDates.length > 0) {
          const mostRecent = isoDates.reduce((a, b) => (Date.parse(a) > Date.parse(b) ? a : b));
          const days = Math.floor((now - Date.parse(mostRecent)) / DAY);
          if (days > 365) {
            return partial(
              `Bias audit documentation was found, conducted on ${mostRecent}.`,
              `6 RCNY § 5-301(a) forbids use where more than one year has passed since the most recent bias audit. That audit is ${days} days old. Each day of continued use is a separate violation under § 20-872.`,
              audit,
            );
          }
          return satisfied(`A bias audit conducted on ${mostRecent} was found, ${days} days ago.`, audit);
        }

        if (bareYears.length === 0) {
          return partial(
            'Bias audit documentation was found, but it names no date that has already passed.',
            '6 RCNY § 5-301(a) requires the audit to have been conducted no more than one year before the tool is used, and § 5-303(a)(1) requires the date of the most recent audit to be published. A planned audit, or an undated one, cannot be shown to be current.',
            audit,
          );
        }

        const mostRecent = Math.max(...bareYears);
        if (mostRecent < thisYear - 1) {
          return partial(
            `Bias audit documentation was found, but the most recent year it names is ${mostRecent}.`,
            `6 RCNY § 5-301(a) requires an audit conducted no more than one year before use. On the dates in the document this audit is at least ${thisYear - mostRecent - 1} year(s) past that limit, and each day of continued use is a separate violation under § 20-872.`,
            audit,
          );
        }
        if (mostRecent < thisYear) {
          return needsReview(
            `Bias audit documentation was found naming ${mostRecent}, with no day or month.`,
            `Whether ${mostRecent} is within the twelve months § 5-301(a) allows depends on a date the repository does not contain: an audit in December ${mostRecent} is current, one in January ${mostRecent} is not. § 5-303(a)(1) requires the date of the most recent audit to be published — record the full date.`,
            audit,
          );
        }
        return satisfied(`A bias audit dated ${mostRecent} was found.`, audit);
      }
      if (testing && testing.hits > 0) {
        return partial(
          'Internal fairness testing was found, but no bias audit record.',
          'Local Law 144 requires an *independent* auditor: someone not involved in using, developing or distributing the tool, with no employment relationship and no material financial interest. Your own test suite, however good, is not an independent audit.',
          testing.evidence.slice(0, 4),
        );
      }
      return missing(
        'This repository screens candidates or employees and no bias audit was found.',
        'Commission an independent bias audit before use. Each day of use without a current audit is a separate violation under § 20-872.',
        ['bias audit', 'independent auditor', 'audit summary'],
      );
    },
    tests: [
      {
        // The § 5-300 trigger, from the other side. A model whose number a
        // recruiter reads alongside other things is not an AEDT, and most New
        // York employers relied on exactly this to conclude the law did not
        // reach them. The scope test used to be "screens candidates", which
        // caught every HR machine-learning project in existence.
        name: 'not_applicable when the score is advisory rather than decisive',
        files: {
          'src/screen.ts':
            'export function summariseApplicant(applicant) {\n  const resumeScore = rankResume(applicant.resume);\n  // Shown to the recruiter beside the interview notes, the referral and the\n  // structured scorecard. No threshold, no ordering, no automatic outcome.\n  return { candidate: applicant.id, resume_signal: resumeScore, notes: applicant.notes };\n}\n',
        },
        expect: 'not_applicable',
      },
      {
        name: 'missing when an AEDT ships with no bias audit anywhere',
        files: {
          'src/screen.ts':
AEDT,
        },
        expect: 'missing',
      },
      {
        // Local Law 144 wants an *independent* auditor. A team's own fairness
        // suite is good engineering and not the thing the rule asks for.
        name: 'partial when the team runs its own fairness tests instead',
        files: {
          'src/screen.ts':
AEDT,
          'src/fairness.ts':
            'export function disparateImpact(results) {\n  const selectionRate = rate(results, "female");\n  return demographicParity(selectionRate);\n}\n',
        },
        expect: 'partial',
      },
      {
        // The rule the pack exists for is a rule about currency.
        name: 'partial when the bias audit is more than a year old',
        files: {
          'src/screen.ts': AEDT,
          'docs/bias-audit.md': `# Bias audit\n\nIndependent bias audit conducted on ${daysAgo(400)} by an auditor with no employment relationship to us and no material financial interest in the tool.\n`,
        },
        expect: 'partial',
      },
      {
        // Thirteen months, not three years. The calendar-year arithmetic this
        // replaces called an audit from January "last year" and passed it in
        // September — twenty months, on a duty priced per day of use.
        name: 'partial when the audit is thirteen months old, not merely last calendar year',
        files: {
          'src/screen.ts': AEDT,
          'docs/bias-audit.md': `# Bias audit\n\nIndependent bias audit conducted on ${daysAgo(395)} by an independent auditor.\n`,
        },
        expect: 'partial',
      },
      {
        // An audit cannot have been carried out on a date that has not
        // happened. Reading the largest year in the document as "the most
        // recent audit" turned a document that says the opposite into a pass.
        name: 'partial when the only date named is a future audit that has not happened',
        files: {
          'src/screen.ts': AEDT,
          'docs/bias-audit.md': `# Bias audit\n\nWe have never commissioned a bias audit. The next bias audit is provisionally due ${new Date().getFullYear() + 1}.\n`,
        },
        expect: 'partial',
      },
      {
        // A year with no month could be eleven months ago or twenty-three.
        // The repository does not say, so neither does Annex.
        name: 'needs_review when the audit is named by year alone and the year is not this one',
        files: {
          'src/screen.ts': AEDT,
          'docs/bias-audit.md': `# Bias audit\n\nOur independent bias audit took place in ${new Date().getFullYear() - 1}, carried out by an auditor with no employment relationship to us.\n`,
        },
        expect: 'needs_review',
      },
      {
        name: 'satisfied when an independent bias audit is recorded with a date inside the year',
        files: {
          'src/screen.ts': AEDT,
          'docs/bias-audit-summary.md': `# Bias audit\n\nIndependent bias audit conducted on ${daysAgo(60)} by an auditor with no employment relationship to us and no material financial interest in the tool.\n`,
        },
        expect: 'satisfied',
      },
    ],
  }),
  c({
    id: 'nyc-ll144.impact-ratio',
    penaltyTier: 'first',
    title: 'Selection rate and impact ratio by category',
    obligation:
      '6 RCNY § 5-301(b)-(c): the audit must calculate the selection rate (or scoring rate) and the impact ratio for each category, separately for sex categories, race/ethnicity categories, and intersectional sex × ethnicity × race categories, using EEO-1 Component 1 categories.',
    family: 'data-governance',
    severity: 'high',
    weight: 7,
    method: 'static-analysis',
    appliesFrom: IN_FORCE,
    citations: [
      nycLL144('§ 5-301(b)', 'Bias audit — selection-type AEDT'),
      nycLL144('§ 5-301(c)', 'Bias audit — scoring-type AEDT'),
      nycLL144(
        '§ 5-300',
        'Impact ratio formula',
        'selection rate for a category divided by the selection rate of the most selected category',
      ),
    ],
    appliesWhen: isAedt,
    evaluate: (ctx) => {
      const testing = ctx.signals.get('data.bias.testing');
      const hasRatio = Boolean(testing?.evidence.some((e) => /impact[_\s]?ratio|selection[_\s]?rate|scoring[_\s]?rate|four[_\s-]?fifths/i.test(e.snippet)));
      const hasIntersectional = ctx.grep(/intersectional|sex\s*[x×*]\s*(race|ethnic)/i, { limit: 2 }).length > 0;

      if (hasRatio && hasIntersectional) {
        return satisfied(
          'Impact-ratio arithmetic including intersectional categories was found.',
          [...(testing?.evidence.slice(0, 3) ?? []), ...ctx.grep(/intersectional/i, { limit: 2 })],
        );
      }
      if (hasRatio) {
        return partial(
          'Impact-ratio or selection-rate arithmetic was found, but no intersectional analysis.',
          '§ 5-301(b)(3) requires the calculation separately for intersectional categories of sex × ethnicity × race — not only for sex and race independently. This is the most commonly missed clause in the rule.',
          testing?.evidence.slice(0, 4) ?? [],
        );
      }
      return missing(
        'No selection-rate or impact-ratio calculation was found.',
        'Implement: impact ratio = selection rate for a category ÷ selection rate of the most selected category, computed for sex, race/ethnicity and intersectional categories, plus a count of individuals in an unknown category.',
        ['impact ratio', 'selection rate', 'scoring rate', 'EEO-1 categories'],
      );
    },
    tests: [
      {
        name: 'partial when the impact ratio is computed for sex and race but not intersectionally',
        files: {
          'src/screen.ts':
AEDT,
          'src/audit.ts':
            'export function impactRatio(rates) {\n  const selectionRate = rates.category;\n  return selectionRate / Math.max(...Object.values(rates)); // four-fifths rule\n}\n\nexport function demographicParity(byGroup) {\n  return impactRatio(byGroup);\n}\n',
        },
        expect: 'partial',
      },
      {
        name: 'satisfied only once sex x ethnicity x race is calculated as well',
        files: {
          'src/screen.ts':
AEDT,
          'src/audit.ts':
            'export function impactRatio(rates) {\n  const selectionRate = rates.category;\n  return selectionRate / Math.max(...Object.values(rates)); // four-fifths rule\n}\n\n// 6 RCNY 5-301(b)(3): intersectional categories of sex x ethnicity x race.\nexport function intersectionalRates(rows) {\n  return group(rows, (r) => r.sex + "|" + r.ethnicity + "|" + r.race);\n}\n\nexport const demographicParity = impactRatio;\n',
        },
        expect: 'satisfied',
      },
    ],
  }),
  c({
    id: 'nyc-ll144.publish-summary',
    penaltyTier: 'first',
    title: 'Publish the audit summary before use',
    obligation:
      '6 RCNY § 5-303: before using the tool, publish clearly and conspicuously on the employment section of the website the date of the most recent bias audit (§ 5-303(a)(1)), the **distribution date of the tool** — the date the employer began using it (§ 5-303(a)(2) with § 5-300) — and a summary of results including the source and explanation of the data, the number of individuals in an unknown category, and for all categories the number of applicants, the selection or scoring rates and the impact ratios. Where § 5-301(d) was relied on to exclude a category under 2 % of the data, the summary must carry the auditor\'s justification together with that category\'s applicant count and rate. Where the audit used **test data** rather than historical data, § 5-302(c) requires the summary to explain why historical data was not used and how the test data was generated and obtained. Keep the whole thing posted for at least six months after the last use.',
    family: 'transparency',
    severity: 'high',
    weight: 6,
    method: 'static-analysis',
    appliesFrom: IN_FORCE,
    citations: [
      nycLL144('§ 5-303(a)(1)', 'Published results — date of the most recent bias audit'),
      nycLL144('§ 5-303(a)(2)', 'Published results — distribution date of the tool'),
      nycLL144('§ 5-302(c)', 'Data requirements — explaining the use of test data'),
      nycLL144('§ 5-301(d)', 'Excluding a category below 2 % of the data'),
    ],
    appliesWhen: isAedt,
    evaluate: (ctx) => {
      const published = ctx.grep(/bias[_\s-]?audit[_\s-]?(summary|results|report|page|url)/i, { limit: 4 });
      if (published.length > 0) {
        // § 5-303(a) lists two dates, and the second is the one everybody
        // forgets: the *distribution date of the tool*, meaning when the
        // employer started using it — not when the audit happened.
        const distribution = ctx.grep(
          /\bdistribution[_\s-]?date\b|\b(began|started|commenced)[_\s-]?(using|use)\b|\bin[_\s-]?use[_\s-]?since\b/i,
          { limit: 3 },
        );
        if (distribution.length === 0) {
          return partial(
            'A published bias audit summary was found, but nothing records the distribution date of the tool.',
            '6 RCNY § 5-303(a)(2) requires the published summary to carry the distribution date of the AEDT — the date you began using it — alongside the audit date in § 5-303(a)(1). It is a separate date and a separate requirement.',
            published,
          );
        }
        return satisfied('A published bias audit summary was found, carrying both the audit date and the distribution date of the tool.', [...published, ...distribution].slice(0, 5));
      }
      return missing(
            'No published bias audit summary was found.',
            'Publish the summary on the employment section of your website. An active hyperlink satisfies this if it is clearly identified as a link to bias audit results.',
            ['bias audit summary page', 'audit results URL'],
          );
    },
    tests: [
      {
        // The second date in § 5-303(a). It is not the audit date, and a
        // summary that carries only the audit date is not a compliant one.
        name: 'partial when the summary is published without the distribution date of the tool',
        files: {
          'src/screen.ts': AEDT,
          'src/careers.tsx': `export const BIAS_AUDIT_SUMMARY_URL = '/careers/bias-audit';\n`,
        },
        expect: 'partial',
      },
      {
        name: 'satisfied when both the audit date and the distribution date are published',
        files: {
          'src/screen.ts': AEDT,
          'src/careers.tsx': `export const BIAS_AUDIT_SUMMARY_URL = '/careers/bias-audit';\nexport const DISTRIBUTION_DATE = '${daysAgo(300)}'; // 6 RCNY 5-303(a)(2): when we began using the tool\n`,
        },
        expect: 'satisfied',
      },
    ],
  }),
  c({
    id: 'nyc-ll144.candidate-notice',
    penaltyTier: 'first',
    title: 'Ten business days notice to candidates',
    obligation:
      '6 RCNY § 5-304 and NYC Admin. Code § 20-871(b): notify New York City resident candidates at least ten business days before use of the tool (§ 20-871(b)(1)), disclose the job qualifications and characteristics the tool will use (§ 20-871(b)(2)), and include instructions for how to request an alternative selection process or a reasonable accommodation, if available (§ 20-871(b)(3) with § 5-304(b)).',
    family: 'rights',
    severity: 'high',
    weight: 6,
    method: 'static-analysis',
    appliesFrom: IN_FORCE,
    citations: [
      nycLL144('§ 5-304', 'Notice to candidates and employees'),
      nycLL144('§ 20-871(b)(1)', 'Ten business days notice'),
      nycLL144('§ 20-871(b)(2)', 'Job qualifications and characteristics the tool will use'),
      nycLL144('§ 20-871(b)(3)', 'Instructions for requesting an alternative process'),
    ],
    appliesWhen: isAedt,
    evaluate: (ctx) => {
      const notice = ctx.grep(/\b(candidate|applicant)[_\s-]?(notice|notification|disclosure)\b|10\s*business\s*days/i, {
        limit: 4,
      });
      const accommodation = ctx.grep(/alternative[_\s]?(selection|process)|reasonable[_\s]?accommodation/i, { limit: 2 });
      // § 20-871(b)(2) is the limb everybody drops: the notice has to say what
      // the tool actually looks at, not merely that a tool is being used.
      const qualifications = ctx.grep(
        /\bjob[_\s-]?qualification|\bqualifications?[_\s]?and[_\s]?characteristics\b|\bcharacteristics[_\s]?(used|assessed|evaluated)\b/i,
        { limit: 2 },
      );
      if (notice.length > 0 && accommodation.length > 0 && qualifications.length > 0) {
        return satisfied('Candidate notice found, carrying both the accommodation instructions and the qualifications the tool assesses.', [
          ...notice.slice(0, 2),
          ...accommodation,
          ...qualifications,
        ]);
      }
      if (notice.length > 0 && accommodation.length > 0) {
        return partial(
          'A candidate notice with accommodation instructions was found, but it does not say what the tool assesses.',
          'NYC Admin. Code § 20-871(b)(2) requires the notice to disclose the job qualifications and characteristics the automated employment decision tool will use. Saying that a tool is used is limb (b)(1); saying what it looks at is a separate limb, and each missing notice is its own violation under § 20-872.',
          [...notice.slice(0, 3), ...accommodation],
        );
      }
      if (notice.length > 0) {
        return partial(
          'A candidate notice exists, but no instructions for requesting an alternative process or accommodation.',
          '§ 5-304 requires the *instructions* to be in the notice. Note the common misreading: the rule does not require you to actually offer an alternative process — only to say how to ask for one.',
          notice.slice(0, 4),
        );
      }
      return missing(
        'No candidate notice was found for an automated employment decision tool.',
        'Notify NYC-resident candidates at least ten business days before the tool is used, via the employment section of the website, the job posting, or mail/email. Each missing notice is a separate violation.',
        ['candidate notice', '10 business days', 'alternative selection process'],
      );
    },
    tests: [
      {
        name: 'partial when candidates are notified but not told how to ask for an alternative process',
        files: {
          'src/screen.ts':
AEDT,
          'src/notice.ts':
            'export const CANDIDATE_NOTICE = "We use an automated employment decision tool. You are receiving this candidate notice at least 10 business days before it is used.";\n',
        },
        expect: 'partial',
      },
      {
        // The clause everyone misreads: the rule requires the *instructions*,
        // not an actual alternative process.
        // § 20-871(b) has three limbs and this notice carries two of them.
        name: 'partial when the notice never says what the tool assesses',
        files: {
          'src/screen.ts': AEDT,
          'src/notice.ts':
            'export const CANDIDATE_NOTICE = "We use an automated employment decision tool. You are receiving this candidate notice at least 10 business days before it is used. To request an alternative selection process or a reasonable accommodation, email careers@example.com.";\n',
        },
        expect: 'partial',
      },
      {
        name: 'satisfied once the notice carries all three limbs of § 20-871(b)',
        files: {
          'src/screen.ts': AEDT,
          'src/notice.ts':
            'export const CANDIDATE_NOTICE = "We use an automated employment decision tool. You are receiving this candidate notice at least 10 business days before it is used. The job qualifications and characteristics it assesses are: relevant work history, stated skills, and role-specific certifications. To request an alternative selection process or a reasonable accommodation, email careers@example.com.";\n',
        },
        expect: 'satisfied',
      },
    ],
  }),
  c({
    id: 'nyc-ll144.data-policy',
    penaltyTier: 'first',
    title: 'Publish the data retention policy and data sources',
    obligation:
      '6 RCNY § 5-304(d)(1)-(2) requires the employer or agency to post on the employment section of its website the automated employment decision tool\'s data retention policy, the type of data it collects and the source of that data, together with instructions for making a written request for that information. NYC Admin. Code § 20-871(b)(3) is the enabling provision and sets the thirty-day window for answering such a request.',
    family: 'transparency',
    severity: 'medium',
    weight: 4,
    method: 'static-analysis',
    appliesFrom: IN_FORCE,
    citations: [
      nycLL144('§ 5-304(d)', 'Published data retention policy, data types and sources'),
      nycLL144('§ 20-871(b)(3)', 'Enabling provision and the thirty-day response window'),
    ],
    appliesWhen: isAedt,
    evaluate: (ctx) => {
      const retention = ctx.signals.hasAny('control.logging.retention');
      const sources = ctx.signals.hasAny('data.provenance');
      const ev = evidenceFrom(ctx, 'control.logging.retention', 'data.provenance');
      if (retention && sources) return satisfied('A retention policy and data source documentation were both found.', ev);
      if (retention || sources) {
        return partial(
          retention ? 'A retention policy exists but data sources are undocumented.' : 'Data sources are documented but no retention policy was found.',
          '§ 20-871(b)(3) requires all three: the retention policy, the type of data collected, and the source of the data.',
          ev,
        );
      }
      return missing(
        'Neither a data retention policy nor data source documentation was found.',
        'Publish the retention policy, data types and data sources, plus instructions for a written request, and answer such requests within thirty days.',
        ['data retention policy', 'data sources', 'type of data collected'],
      );
    },
  }),
];

export const NYC_LL144_PACK: RulePack = {
  id: 'nyc-ll144',
  name: 'NYC Local Law 144',
  version: '2026.09.1',
  jurisdiction: 'New York City, USA',
  instrument: 'NYC Admin. Code §§ 20-870 to 20-874; 6 RCNY §§ 5-300 to 5-304 (Local Law 144 of 2021)',
  reconciledOn: '2026-09-15',
  summary:
    'Bias-audit mandate for automated employment decision tools used to screen candidates or employees in New York City. Enforced since 5 July 2023 — the longest-running algorithmic audit obligation in force anywhere, and the most precisely specified: the rule defines the arithmetic.',
  url: 'https://www.nyc.gov/site/dca/about/automated-employment-decision-tools.page',
  milestones: [
    { date: IN_FORCE, label: 'Enforcement began', note: 'The Department of Consumer and Worker Protection has enforced Local Law 144 since 5 July 2023.' },
  ],
  penalty: {
    // NYC Admin. Code § 20-872 is denominated in US dollars.
    currency: 'USD',
    description:
      'Civil penalties under NYC Admin. Code § 20-872. Each day an AEDT is used in violation is a separate violation, and each missing notice is a separate violation.',
    tiers: [
      {
        id: 'first',
        label: 'First violation, and each additional violation on the same day',
        amount: 500,
        multiplier: 'per day of use and per missing notice, each of which is a separate violation',
        citation: nycLL144('§ 20-872', 'Penalties'),
      },
      {
        id: 'subsequent',
        label: 'Each subsequent violation',
        amount: 1_500,
        multiplier: 'per day of use and per missing notice, each of which is a separate violation',
        citation: nycLL144('§ 20-872', 'Penalties'),
      },
    ],
  },
  controls,
};

export { allOf };
