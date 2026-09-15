import type { Control, RulePack } from '../types.js';
import { nycLL144 } from './citations.js';
import { allOf, evidenceFrom, missing, pack, partial, satisfied, whenSignal } from './define.js';

const c = pack('nyc-ll144');

/**
 * NYC Local Law 144 of 2021, implemented by 6 RCNY §§ 5-300 to 5-304.
 * Enforced since 5 July 2023 — the only bias-audit mandate anywhere that has
 * been live long enough to generate case files, and by far the most precisely
 * codable duty in the corpus. Its arithmetic is fully specified, so a scanner
 * can check for the *formula*, not just the vibe of fairness.
 */

const IN_FORCE = '2023-07-05';

const isAedt = whenSignal('domain.employment.screening', 'domain.employment.management');

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
        // § 5-301(a) is a rule about *currency*: the audit must have been
        // conducted no more than one year before the tool is used. Accepting
        // any document containing the words "bias audit" meant a 2023 audit
        // passed in 2026 — on the most arithmetically checkable duty in the
        // corpus, in the pack the README singles out for that reason.
        const dated = ctx.grepDocs(/\b(20\d{2})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])\b|\b(19|20)\d{2}\b/, 6, /(bias|audit|fairness|ll144|aedt)/i);
        const years = dated
          .flatMap((e) => [...e.snippet.matchAll(/\b(20\d{2})\b/g)].map((m) => Number(m[1])))
          .filter((y) => y >= 2020 && y <= new Date().getFullYear() + 1);
        const mostRecent = years.length ? Math.max(...years) : undefined;
        const thisYear = new Date().getFullYear();

        if (mostRecent === undefined) {
          return partial(
            'Bias audit documentation was found, but it carries no date.',
            '6 RCNY § 5-301(a) requires the audit to have been conducted no more than one year before the tool is used, and § 5-303 requires the date of the most recent audit to be published. An undated audit cannot be shown to be current.',
            audit,
          );
        }
        if (mostRecent < thisYear - 1) {
          return partial(
            `Bias audit documentation was found, but the most recent year it names is ${mostRecent}.`,
            `6 RCNY § 5-301(a) requires an audit conducted no more than one year before use. On the dates in the document this audit is at least ${thisYear - mostRecent} years old, and each day of continued use is a separate violation under § 20-872.`,
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
        name: 'missing when an AEDT ships with no bias audit anywhere',
        files: {
          'src/screen.ts':
            'export function screenCandidate(applicant) {\n  const resumeScore = rankResume(applicant.resume);\n  return { candidate: applicant.id, shortlist: resumeScore > 0.7, hiring_decision: resumeScore > 0.7 ? "advance" : "reject" };\n}\n',
        },
        expect: 'missing',
      },
      {
        // Local Law 144 wants an *independent* auditor. A team's own fairness
        // suite is good engineering and not the thing the rule asks for.
        name: 'partial when the team runs its own fairness tests instead',
        files: {
          'src/screen.ts':
            'export function screenCandidate(applicant) {\n  const resumeScore = rankResume(applicant.resume);\n  return { candidate: applicant.id, shortlist: resumeScore > 0.7, hiring_decision: resumeScore > 0.7 ? "advance" : "reject" };\n}\n',
          'src/fairness.ts':
            'export function disparateImpact(results) {\n  const selectionRate = rate(results, "female");\n  return demographicParity(selectionRate);\n}\n',
        },
        expect: 'partial',
      },
      {
        // The rule the pack exists for is a rule about currency.
        name: 'partial when the bias audit is more than a year old',
        files: {
          'src/screen.ts':
            'export function screenCandidate(applicant) {\n  const resumeScore = rankResume(applicant.resume);\n  return { candidate: applicant.id, shortlist: resumeScore > 0.7, hiring_decision: resumeScore > 0.7 ? "advance" : "reject" };\n}\n',
          'docs/bias-audit.md':
            '# Bias audit\n\nIndependent bias audit conducted on 2023-03-01 by an auditor with no employment relationship to us and no material financial interest in the tool.\n',
        },
        expect: 'partial',
      },
      {
        name: 'satisfied when an independent bias audit is recorded in the repository',
        files: {
          'src/screen.ts':
            'export function screenCandidate(applicant) {\n  const resumeScore = rankResume(applicant.resume);\n  return { candidate: applicant.id, shortlist: resumeScore > 0.7, hiring_decision: resumeScore > 0.7 ? "advance" : "reject" };\n}\n',
          'docs/bias-audit-2026.md':
            '# Bias audit\n\nIndependent bias audit conducted on 2026-03-01 by an auditor with no employment relationship to us and no material financial interest in the tool.\n',
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
            'export function screenCandidate(applicant) {\n  const resumeScore = rankResume(applicant.resume);\n  return { candidate: applicant.id, shortlist: resumeScore > 0.7, hiring_decision: resumeScore > 0.7 ? "advance" : "reject" };\n}\n',
          'src/audit.ts':
            'export function impactRatio(rates) {\n  const selectionRate = rates.category;\n  return selectionRate / Math.max(...Object.values(rates)); // four-fifths rule\n}\n\nexport function demographicParity(byGroup) {\n  return impactRatio(byGroup);\n}\n',
        },
        expect: 'partial',
      },
      {
        name: 'satisfied only once sex x ethnicity x race is calculated as well',
        files: {
          'src/screen.ts':
            'export function screenCandidate(applicant) {\n  const resumeScore = rankResume(applicant.resume);\n  return { candidate: applicant.id, shortlist: resumeScore > 0.7, hiring_decision: resumeScore > 0.7 ? "advance" : "reject" };\n}\n',
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
      '6 RCNY § 5-303: before using the tool, publish clearly and conspicuously on the employment section of the website the date of the most recent bias audit, a summary of results including the source and explanation of the data, the number of individuals in an unknown category, and for all categories the number of applicants, the selection or scoring rates and the impact ratios. Keep it posted for at least six months after the last use.',
    family: 'transparency',
    severity: 'high',
    weight: 6,
    method: 'static-analysis',
    appliesFrom: IN_FORCE,
    citations: [nycLL144('§ 5-303', 'Published results')],
    appliesWhen: isAedt,
    evaluate: (ctx) => {
      const published = ctx.grep(/bias[_\s-]?audit[_\s-]?(summary|results|report|page|url)/i, { limit: 4 });
      return published.length > 0
        ? satisfied('A published bias audit summary was found.', published)
        : missing(
            'No published bias audit summary was found.',
            'Publish the summary on the employment section of your website. An active hyperlink satisfies this if it is clearly identified as a link to bias audit results.',
            ['bias audit summary page', 'audit results URL'],
          );
    },
  }),
  c({
    id: 'nyc-ll144.candidate-notice',
    penaltyTier: 'first',
    title: 'Ten business days notice to candidates',
    obligation:
      '6 RCNY § 5-304 and NYC Admin. Code § 20-871(b): notify New York City resident candidates at least ten business days before use of the tool, and include instructions for how to request an alternative selection process or a reasonable accommodation, if available.',
    family: 'rights',
    severity: 'high',
    weight: 6,
    method: 'static-analysis',
    appliesFrom: IN_FORCE,
    citations: [
      nycLL144('§ 5-304', 'Notice to candidates and employees'),
      nycLL144('§ 20-871(b)', 'Notice requirements'),
    ],
    appliesWhen: isAedt,
    evaluate: (ctx) => {
      const notice = ctx.grep(/\b(candidate|applicant)[_\s-]?(notice|notification|disclosure)\b|10\s*business\s*days/i, {
        limit: 4,
      });
      const accommodation = ctx.grep(/alternative[_\s]?(selection|process)|reasonable[_\s]?accommodation/i, { limit: 2 });
      if (notice.length > 0 && accommodation.length > 0) {
        return satisfied('Candidate notice including accommodation instructions was found.', [...notice.slice(0, 3), ...accommodation]);
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
            'export function screenCandidate(applicant) {\n  const resumeScore = rankResume(applicant.resume);\n  return { candidate: applicant.id, shortlist: resumeScore > 0.7, hiring_decision: resumeScore > 0.7 ? "advance" : "reject" };\n}\n',
          'src/notice.ts':
            'export const CANDIDATE_NOTICE = "We use an automated employment decision tool. You are receiving this candidate notice at least 10 business days before it is used.";\n',
        },
        expect: 'partial',
      },
      {
        // The clause everyone misreads: the rule requires the *instructions*,
        // not an actual alternative process.
        name: 'satisfied when the notice carries the instructions the rule actually asks for',
        files: {
          'src/screen.ts':
            'export function screenCandidate(applicant) {\n  const resumeScore = rankResume(applicant.resume);\n  return { candidate: applicant.id, shortlist: resumeScore > 0.7, hiring_decision: resumeScore > 0.7 ? "advance" : "reject" };\n}\n',
          'src/notice.ts':
            'export const CANDIDATE_NOTICE = "We use an automated employment decision tool. You are receiving this candidate notice at least 10 business days before it is used. To request an alternative selection process or a reasonable accommodation, email careers@example.com.";\n',
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
      nycLL144('6 RCNY § 5-304(d)', 'Published data retention policy, data types and sources'),
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
