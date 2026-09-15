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
      const audit = ctx.grepDocs(/\bbias\s+audit\b/i, 4);
      const testing = ctx.signals.get('data.bias.testing');
      if (audit.length > 0) {
        return satisfied('Bias audit documentation was found.', audit);
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
  }),
  c({
    id: 'nyc-ll144.impact-ratio',
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
  }),
  c({
    id: 'nyc-ll144.publish-summary',
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
  }),
  c({
    id: 'nyc-ll144.data-policy',
    title: 'Publish the data retention policy and data sources',
    obligation:
      'NYC Admin. Code § 20-871(b)(3): publish on the employment section of the website the tool\'s data retention policy, the type of data collected and the source of the data, with instructions for making a written request for that information, and respond within thirty days.',
    family: 'transparency',
    severity: 'medium',
    weight: 4,
    method: 'static-analysis',
    appliesFrom: IN_FORCE,
    citations: [nycLL144('§ 20-871(b)(3)', 'Data retention policy disclosure')],
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
    description:
      'Civil penalties under NYC Admin. Code § 20-872. Each day an AEDT is used in violation is a separate violation, and each missing notice is a separate violation.',
    tiers: [
      {
        label: 'First violation, and each additional violation on the same day',
        amountEur: 500,
        citation: nycLL144('§ 20-872', 'Penalties'),
      },
      {
        label: 'Each subsequent violation',
        amountEur: 1_500,
        citation: nycLL144('§ 20-872', 'Penalties'),
      },
    ],
  },
  controls,
};

export { allOf };
