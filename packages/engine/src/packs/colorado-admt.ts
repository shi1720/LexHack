import type { Citation, Control, RulePack } from '../types.js';
import { evidenceFrom, missing, pack, partial, satisfied, whenSignal } from './define.js';

const c = pack('colorado-admt');

function co(locator: string, title: string): Citation {
  return {
    instrument: 'Colorado SB 26-189 (Colorado Automated Decision-Making Technology Act), C.R.S. tit. 6, art. 1, pt. 17',
    short: 'Colorado ADMT Act',
    locator,
    title,
    url: 'https://leg.colorado.gov/bills/sb26-189',
  };
}

/**
 * Colorado replaced its 2024 AI Act rather than fixing it. SB 24-205 was
 * preliminarily enjoined in April 2026 and never took effect; SB 26-189, signed
 * 14 May 2026, is the live instrument and applies from 1 January 2027.
 *
 * This pack is included as much as a demonstration as a deliverable: when a
 * legislature repeals and replaces, the corpus changes and every dependent
 * dossier should be flagged stale. That is a versioning problem, which is
 * exactly why rule packs here carry a version and a reconciliation date.
 */
const APPLIES = '2027-01-01';

const consequential = whenSignal(
  'domain.employment.screening',
  'domain.employment.management',
  'domain.credit.scoring',
  'domain.insurance.pricing',
  'domain.education.assessment',
  'domain.public-benefits',
  'domain.emergency.triage',
);

const controls: Control[] = [
  c({
    id: 'colorado-admt.pre-use-notice',
    title: 'Clear pre-use notice before a consequential decision',
    obligation:
      'A deployer must give clear and conspicuous notice, before the consequential decision, that covered automated decision-making technology is or will be used — accessible to consumers with disabilities and with limited English proficiency.',
    family: 'transparency',
    severity: 'high',
    weight: 7,
    method: 'static-analysis',
    appliesFrom: APPLIES,
    citations: [co('§ 6-1-1703', 'Deployer duties — pre-use notice')],
    appliesWhen: consequential,
    evaluate: (ctx) => {
      const notice = ctx.grep(/\b(pre[_\s-]?use[_\s-]?notice|automated[_\s-]?decision[_\s-]?notice|ai[_\s-]?notice)\b/i, { limit: 3 });
      const disclosure = ctx.signals.get('transparency.ai-disclosure');
      if (notice.length > 0) return satisfied('A pre-use notice was found.', notice);
      if (disclosure && disclosure.hits > 0) {
        return partial(
          'An AI disclosure exists, but nothing shows it is served before the consequential decision.',
          'The Colorado duty is time-bound: the notice must reach the consumer *before* the decision, and must be accessible to consumers with disabilities and limited English proficiency.',
          disclosure.evidence.slice(0, 3),
        );
      }
      return missing(
        'No pre-use notice was found ahead of a consequential decision.',
        'Show the notice before the decision is made, not in a policy page the consumer never opens, and provide it in an accessible form.',
        ['pre-use notice', 'automated decision notice'],
      );
    },
  }),
  c({
    id: 'colorado-admt.adverse-explanation',
    title: 'Explain an adverse outcome within thirty days',
    obligation:
      'On an adverse outcome materially influenced by covered ADMT, the deployer must provide within thirty days a plain-language description of the decision and the technology\'s role in it, a simple process to request more information, and an explanation of the consumer\'s rights.',
    family: 'rights',
    severity: 'high',
    weight: 7,
    method: 'static-analysis',
    appliesFrom: APPLIES,
    citations: [co('§ 6-1-1703', 'Deployer duties — adverse outcome explanation')],
    appliesWhen: consequential,
    evaluate: (ctx) => {
      const explanation = ctx.signals.hasAny('transparency.explanation');
      const adverse = ctx.grep(/\badverse[_\s-]?(action|outcome|decision|notice)\b/i, { limit: 3 });
      const ev = [...evidenceFrom(ctx, 'transparency.explanation'), ...adverse];
      if (explanation && adverse.length > 0) {
        return satisfied('An adverse-outcome path with an explanation was found.', ev.slice(0, 5));
      }
      if (explanation || adverse.length > 0) {
        return partial(
          explanation
            ? 'Explanations are produced, but no distinct adverse-outcome path was found.'
            : 'An adverse-outcome path exists but produces no explanation.',
          'The duty is specific: on an adverse outcome, within thirty days, in plain language, including what role the technology played.',
          ev.slice(0, 5),
        );
      }
      return missing(
        'No adverse-outcome explanation path was found.',
        'Trigger an explanation whenever the outcome is adverse, carry the reason codes from the decision log, and start a thirty-day clock.',
        ['adverse action notice', 'explanation', 'reason codes'],
      );
    },
    tests: [
      {
        name: 'missing when an adverse outcome is returned with no explanation path',
        files: {
          'src/underwrite.ts':
            'export function underwrite(borrower) {\n  const creditScore = model.predict(borrower);\n  const loanDecision = creditScore > 640 ? "approve" : "decline";\n  return { borrower: borrower.id, credit_score: creditScore, loan_decision: loanDecision };\n}\n',
        },
        expect: 'missing',
      },
      {
        name: 'partial when reason codes exist but nothing distinguishes an adverse outcome',
        files: {
          'src/underwrite.ts':
            'export function underwrite(borrower) {\n  const creditScore = model.predict(borrower);\n  const loanDecision = creditScore > 640 ? "approve" : "decline";\n  return { borrower: borrower.id, credit_score: creditScore, loan_decision: loanDecision };\n}\n',
          'src/explain.ts':
            'export function reasonCodes(features) {\n  return featureImportance(features).map((f) => ({ reason_code: f.name, rationale: f.why }));\n}\n',
        },
        expect: 'partial',
      },
      {
        name: 'satisfied when the adverse path carries the explanation',
        files: {
          'src/underwrite.ts':
            'export function underwrite(borrower) {\n  const creditScore = model.predict(borrower);\n  const loanDecision = creditScore > 640 ? "approve" : "decline";\n  return { borrower: borrower.id, credit_score: creditScore, loan_decision: loanDecision };\n}\n',
          'src/explain.ts':
            'export function reasonCodes(features) {\n  return featureImportance(features).map((f) => ({ reason_code: f.name, rationale: f.why }));\n}\n',
          'src/adverse.ts':
            'export async function sendAdverseActionNotice(applicationId, features) {\n  const explanation = reasonCodes(features);\n  return notify({ applicationId, adverse_outcome: true, explanation, dueWithinDays: 30 });\n}\n',
        },
        expect: 'satisfied',
      },
    ],
  }),
  c({
    id: 'colorado-admt.human-review-override',
    title: 'Designated reviewers authorised to override',
    obligation:
      'A deployer must designate trained individuals authorised to override the technology\'s outcome during human review, and consumers have a right to meaningful human review and reconsideration after an adverse outcome, to the extent commercially reasonable.',
    family: 'human-oversight',
    severity: 'high',
    weight: 7,
    method: 'static-analysis',
    appliesFrom: APPLIES,
    citations: [
      co('§ 6-1-1704', 'Deployer duties — designated reviewers'),
      co('§ 6-1-1705', 'Consumer rights — meaningful human review'),
    ],
    appliesWhen: consequential,
    evaluate: (ctx) => {
      const review = ctx.signals.hasAny('control.human.review');
      const override = ctx.signals.hasAny('control.override');
      const ev = evidenceFrom(ctx, 'control.human.review', 'control.override');
      if (review && override) return satisfied('A human review step with an override path was found.', ev);
      if (review || override) {
        return partial(
          review ? 'Human review exists but no explicit override capability.' : 'An override exists but no review step feeds it.',
          'The statute requires a designated, trained individual who is *authorised to override*. Review without authority to change the outcome is not review.',
          ev,
        );
      }
      return missing(
        'No human review or override capability was found for a consequential decision.',
        'Designate reviewers, record who they are, and give them an override that is written back to the decision record.',
        ['human review', 'override', 'reviewer role'],
      );
    },
    tests: [
      {
        name: 'missing when a consequential decision has neither review nor override',
        files: {
          'src/underwrite.ts':
            'export function underwrite(borrower) {\n  const creditScore = model.predict(borrower);\n  const loanDecision = creditScore > 640 ? "approve" : "decline";\n  return { borrower: borrower.id, credit_score: creditScore, loan_decision: loanDecision };\n}\n',
        },
        expect: 'missing',
      },
      {
        // The statute asks for a designated individual *authorised to
        // override*. A reviewer who cannot change the outcome is a spectator.
        name: 'partial when a reviewer exists but cannot change the outcome',
        files: {
          'src/underwrite.ts':
            'export function underwrite(borrower) {\n  const creditScore = model.predict(borrower);\n  const loanDecision = creditScore > 640 ? "approve" : "decline";\n  return { borrower: borrower.id, credit_score: creditScore, loan_decision: loanDecision };\n}\n',
          'src/review.ts':
            'export async function queueForHumanReview(applicationId) {\n  return db.reviews.create({ applicationId, status: "pending_review" });\n}\n',
        },
        expect: 'partial',
      },
      {
        name: 'satisfied when the designated reviewer can override the outcome',
        files: {
          'src/underwrite.ts':
            'export function underwrite(borrower) {\n  const creditScore = model.predict(borrower);\n  const loanDecision = creditScore > 640 ? "approve" : "decline";\n  return { borrower: borrower.id, credit_score: creditScore, loan_decision: loanDecision };\n}\n',
          'src/review.ts':
            'export async function queueForHumanReview(applicationId) {\n  return db.reviews.create({ applicationId, status: "pending_review" });\n}\n\nexport async function overrideDecision(applicationId, reviewerId, newOutcome) {\n  await queueForHumanReview(applicationId);\n  return db.decisions.update({ applicationId, manual_override: true, reviewerId, newOutcome });\n}\n',
        },
        expect: 'satisfied',
      },
    ],
  }),
  c({
    id: 'colorado-admt.data-correction',
    title: 'Right to see and correct the data used',
    obligation:
      'A consumer has the right to request the personal data used in the decision and to correct factually incorrect or materially inaccurate data.',
    family: 'rights',
    severity: 'medium',
    weight: 5,
    method: 'static-analysis',
    appliesFrom: APPLIES,
    citations: [co('§ 6-1-1705', 'Consumer rights — access and correction')],
    appliesWhen: consequential,
    evaluate: (ctx) => {
      const rights = ctx.signals.get('data.subject-rights');
      return rights && rights.hits > 0
        ? satisfied('Data access or correction endpoints were found.', rights.evidence.slice(0, 4))
        : missing(
            'No way for a consumer to see or correct the data used in the decision was found.',
            'Expose the inputs that drove the decision and accept corrections. This is also the cheapest accuracy improvement available: the affected person is usually the only party who knows the data is wrong.',
            ['data access request', 'correct data', 'rectification'],
          );
    },
  }),
  c({
    id: 'colorado-admt.developer-documentation',
    title: 'Documentation handed to deployers',
    obligation:
      'A developer must give each deployer technical documentation stating the intended uses and known harmful or inappropriate uses, the categories of training data, known limitations and risks, instructions for appropriate use, monitoring and meaningful human review, and the information the deployer needs for its own consumer disclosures. Records must be retained for at least three years.',
    family: 'documentation',
    severity: 'high',
    weight: 6,
    method: 'documentation',
    appliesFrom: APPLIES,
    citations: [co('§ 6-1-1702', 'Developer duties — documentation to deployers')],
    appliesWhen: consequential,
    evaluate: (ctx) => {
      const instructions = ctx.signals.hasAny('transparency.instructions');
      const limitations = ctx.grepDocs(/^#+\s*(limitations|known issues|inappropriate uses|out[- ]of[- ]scope)/im, 3, /(limitation|model[-_]?card|known[-_]?issue|readme|compliance|governance)/i);
      const ev = [...evidenceFrom(ctx, 'transparency.instructions'), ...limitations];
      if (instructions && limitations.length > 0) {
        return satisfied('Deployer documentation including known limitations was found.', ev.slice(0, 5));
      }
      if (instructions || limitations.length > 0) {
        return partial(
          'Partial deployer documentation was found.',
          'The Colorado list is explicit: intended uses, known harmful or inappropriate uses, training data categories, limitations and risks, and instructions for monitoring and human review. Name each one.',
          ev.slice(0, 5),
        );
      }
      return missing(
        'No documentation aimed at a downstream deployer was found.',
        'Write it once against the Colorado list; it also answers AI Act Article 13(3), so the work is shared across both regimes.',
        ['intended uses', 'known limitations', 'training data categories'],
      );
    },
  }),
];

export const COLORADO_ADMT_PACK: RulePack = {
  id: 'colorado-admt',
  name: 'Colorado ADMT Act',
  version: '2026.09.1',
  jurisdiction: 'Colorado, USA',
  instrument: 'Colorado SB 26-189 (Colorado Automated Decision-Making Technology Act)',
  reconciledOn: '2026-09-15',
  summary:
    'Colorado repealed and replaced its 2024 AI Act. SB 24-205 was preliminarily enjoined in April 2026 and never took effect; SB 26-189, signed 14 May 2026, applies from 1 January 2027 to automated decision-making technology that materially influences a consequential decision in education, employment, housing, lending, insurance, health care or essential government services.',
  url: 'https://leg.colorado.gov/bills/sb26-189',
  milestones: [
    { date: '2026-05-14', label: 'SB 26-189 signed', note: 'Repealed and replaced SB 24-205, which had been preliminarily enjoined and never took effect.' },
    { date: APPLIES, label: 'Colorado ADMT Act applies', note: 'Duties on developers and deployers begin. The Attorney General must adopt clarifying rules by this date.' },
  ],
  penalty: {
    currency: 'USD',
    description:
      'Enforced exclusively by the Attorney General under the Colorado Consumer Protection Act as a deceptive trade practice. No private right of action. A sixty-day notice-and-cure period applies until it sunsets on 1 January 2030.',
    tiers: [],
  },
  controls,
};
