import type { Control, RulePack } from '../types.js';
import { gdpr } from './citations.js';
import { allOf, evidenceFrom, missing, pack, partial, satisfied, whenSignal } from './define.js';

const c = pack('gdpr');

/**
 * GDPR has been in force since 25 May 2018. It is included here because for
 * most AI products it is the regulation that already applies — the AI Act adds
 * to it rather than replacing it, and Article 22 reaches automated decisions
 * that fall well outside Annex III.
 */
const IN_FORCE = '2018-05-25';

const touchesPeople = whenSignal('data.pii.handling');

const controls: Control[] = [
  c({
    id: 'gdpr.art22.human-intervention',
    title: 'Right to human intervention in an automated decision',
    obligation:
      'Article 22(1) gives a data subject the right not to be subject to a decision based solely on automated processing which produces legal effects or similarly significantly affects them. Where such processing is permitted, Article 22(3) requires safeguards including at least the right to obtain human intervention, to express a point of view, and to contest the decision.',
    family: 'rights',
    severity: 'critical',
    weight: 8,
    method: 'static-analysis',
    appliesFrom: IN_FORCE,
    citations: [
      gdpr('Art. 22(1)', 'Automated individual decision-making, including profiling'),
      gdpr('Art. 22(3)', 'Safeguards — human intervention, point of view, contest'),
    ],
    appliesWhen: allOf(touchesPeople, whenSignal('domain.automated.decision')),
    evaluate: (ctx) => {
      const human = ctx.signals.hasAny('control.human.review');
      const appeal = ctx.signals.hasAny('control.appeal');
      const ev = evidenceFrom(ctx, 'control.human.review', 'control.appeal', 'control.override');
      if (human && appeal) return satisfied('Both a human review path and a contest mechanism were found.', ev);
      if (human || appeal) {
        return partial(
          human
            ? 'A human review step exists, but no way for the affected person to contest the decision.'
            : 'A contest mechanism exists, but no human review step behind it.',
          'Article 22(3) requires both: a human who can intervene, and a route by which the data subject reaches them. A queue nobody can enter is not a safeguard.',
          ev,
        );
      }
      return missing(
        'An automated decision is taken about people with no human intervention path and no way to contest it.',
        'Add a route for the affected person to reach a human who can review and reverse the decision, and record that the human actually considered it.',
        ['human review', 'appeal', 'contest decision'],
      );
    },
    tests: [
      {
        name: 'missing when an automated decision about a person has no human path at all',
        files: {
          'src/decide.ts':
            'export function decide(person) {\n  const record = { full_name: person.full_name, email: person.email, date_of_birth: person.dob };\n  const score = model.predict(record);\n  const decision = score > 0.5 ? "approve" : "reject";\n  return { auto_decision: decision, eligible: score > 0.5 };\n}\n',
        },
        expect: 'missing',
      },
      {
        // Article 22(3) needs both halves. A reviewer queue nobody can enter is
        // not a safeguard, and neither is an appeal form with nobody behind it.
        name: 'partial when a human reviewer exists but the person cannot reach them',
        files: {
          'src/decide.ts':
            'export function decide(person) {\n  const record = { full_name: person.full_name, email: person.email, date_of_birth: person.dob };\n  const score = model.predict(record);\n  const decision = score > 0.5 ? "approve" : "reject";\n  return { auto_decision: decision, eligible: score > 0.5 };\n}\n',
          'src/review.ts':
            'export async function queueForHumanReview(decisionId) {\n  return db.reviews.create({ decisionId, status: "pending_review", reviewer: null });\n}\n',
        },
        expect: 'partial',
      },
      {
        name: 'satisfied when the person can contest and a human can reverse it',
        files: {
          'src/decide.ts':
            'export function decide(person) {\n  const record = { full_name: person.full_name, email: person.email, date_of_birth: person.dob };\n  const score = model.predict(record);\n  const decision = score > 0.5 ? "approve" : "reject";\n  return { auto_decision: decision, eligible: score > 0.5 };\n}\n',
          'src/review.ts':
            'export async function queueForHumanReview(decisionId) {\n  return db.reviews.create({ decisionId, status: "pending_review" });\n}\n',
          'src/appeal.ts':
            'export async function submitAppeal(decisionId, subjectId, grounds) {\n  await queueForHumanReview(decisionId);\n  return db.appeals.create({ decisionId, subjectId, grounds, contest: true });\n}\n',
        },
        expect: 'satisfied',
      },
    ],
  }),
  c({
    id: 'gdpr.art13-15.meaningful-information',
    title: 'Meaningful information about the logic involved',
    obligation:
      'Articles 13(2)(f), 14(2)(g) and 15(1)(h) require the controller, where automated decision-making under Article 22 takes place, to provide meaningful information about the logic involved and the significance and envisaged consequences of the processing for the data subject.',
    family: 'transparency',
    severity: 'high',
    weight: 6,
    method: 'static-analysis',
    appliesFrom: IN_FORCE,
    citations: [
      gdpr('Art. 13(2)(f)', 'Information to be provided — logic involved'),
      gdpr('Art. 15(1)(h)', 'Right of access — logic involved'),
    ],
    appliesWhen: allOf(touchesPeople, whenSignal('domain.automated.decision')),
    evaluate: (ctx) => {
      const explanation = ctx.signals.get('transparency.explanation');
      const policy = ctx.grepDocs(/privacy\s+(policy|notice)/i, 2, /(privacy|gdpr|data[-_]?protection|readme|legal|compliance)/i);
      if (explanation && explanation.hits >= 2) {
        return satisfied('The system produces reasons alongside its outputs.', explanation.evidence.slice(0, 4));
      }
      if (policy.length > 0) {
        return partial(
          'A privacy notice exists, but the system produces no per-decision explanation.',
          'A static policy paragraph describes the logic in general. Articles 15(1)(h) and 22(3) are answered properly only when the person can see why *their* decision came out the way it did.',
          policy,
        );
      }
      return missing(
        'No explanation capability and no privacy notice were found.',
        'Produce reason codes or a short rationale alongside each decision, and store it with the decision so it can be surfaced on a subject access request.',
        ['explanation', 'reason codes', 'privacy policy'],
      );
    },
  }),
  c({
    id: 'gdpr.art35.dpia',
    title: 'Data protection impact assessment',
    obligation:
      'Article 35(1) requires a DPIA where processing is likely to result in a high risk to the rights and freedoms of natural persons. Article 35(3)(a) names systematic and extensive evaluation of personal aspects based on automated processing, including profiling, on which decisions producing legal or similarly significant effects are based.',
    family: 'risk-management',
    severity: 'high',
    weight: 6,
    method: 'documentation',
    appliesFrom: IN_FORCE,
    citations: [
      gdpr('Art. 35(1)', 'Data protection impact assessment'),
      gdpr('Art. 35(3)(a)', 'When a DPIA is required — automated evaluation of personal aspects'),
    ],
    appliesWhen: allOf(touchesPeople, whenSignal('domain.automated.decision', 'data.special-category')),
    evaluate: (ctx) => {
      const dpia = ctx.signals.get('governance.dpia');
      return dpia && dpia.hits > 0
        ? satisfied('An impact assessment was referenced in the repository.', dpia.evidence.slice(0, 3))
        : missing(
            'No data protection impact assessment was found.',
            'Carry out a DPIA before the processing starts. Under AI Act Article 27(4), a fundamental rights impact assessment may cross-reference or incorporate it, so doing this once serves both regimes.',
            ['DPIA', 'data protection impact assessment', 'privacy impact assessment'],
          );
    },
  }),
  c({
    id: 'gdpr.art17.erasure',
    title: 'Erasure and rectification of personal data',
    obligation:
      'Articles 16 and 17 give data subjects the right to rectification of inaccurate personal data and to erasure. For an AI system this reaches the inputs, the stored decisions and any derived features.',
    family: 'rights',
    severity: 'medium',
    weight: 4,
    method: 'static-analysis',
    appliesFrom: IN_FORCE,
    citations: [gdpr('Art. 16', 'Right to rectification'), gdpr('Art. 17', 'Right to erasure')],
    appliesWhen: touchesPeople,
    evaluate: (ctx) => {
      const rights = ctx.signals.get('data.subject-rights');
      return rights && rights.hits > 0
        ? satisfied('Data subject rights endpoints were found.', rights.evidence.slice(0, 4))
        : missing(
            'No erasure or rectification path was found for personal data.',
            'Implement deletion and correction that reaches the decision log as well as the primary record. Note the tension with AI Act Article 19: logs must be retained for six months, so erasure normally means pseudonymising the log rather than dropping it.',
            ['delete user data', 'right to erasure', 'rectification'],
          );
    },
    tests: [
      {
        name: 'missing when personal data has no erasure or rectification path',
        files: {
          'src/store.ts':
            'export async function saveApplicant(a) {\n  return db.applicants.create({ full_name: a.full_name, email: a.email, address: a.address });\n}\n',
        },
        expect: 'missing',
      },
      {
        name: 'satisfied when erasure and rectification endpoints exist',
        files: {
          'src/store.ts':
            'export async function saveApplicant(a) {\n  return db.applicants.create({ full_name: a.full_name, email: a.email, address: a.address });\n}\n',
          'src/rights.ts':
            'export async function deleteUserData(subjectId) {\n  await db.applicants.delete({ subjectId });\n  return { right_to_erasure: true };\n}\n\nexport async function rectify(subjectId, patch) {\n  return db.applicants.update({ subjectId, ...patch });\n}\n\nexport async function exportMyData(subjectId) {\n  return db.applicants.find({ subjectId });\n}\n',
        },
        expect: 'satisfied',
      },
    ],
  }),
  c({
    id: 'gdpr.art9.special-category',
    title: 'Lawful basis for special-category data',
    obligation:
      'Article 9(1) prohibits processing personal data revealing racial or ethnic origin, political opinions, religious beliefs, trade union membership, genetic or biometric data for unique identification, health data, or data concerning sex life or sexual orientation, unless one of the Article 9(2) conditions applies.',
    family: 'data-governance',
    severity: 'high',
    weight: 6,
    method: 'static-analysis',
    appliesFrom: IN_FORCE,
    citations: [gdpr('Art. 9(1)', 'Processing of special categories of personal data'), gdpr('Art. 9(2)', 'Conditions for lawful processing')],
    appliesWhen: whenSignal('data.special-category'),
    evaluate: (ctx) => {
      const consent = ctx.signals.hasAny('data.consent');
      const ev = evidenceFrom(ctx, 'data.special-category', 'data.consent');
      return consent
        ? partial(
            'Special-category attributes appear in the data model, and a consent or lawful-basis mechanism exists.',
            'Record which Article 9(2) condition applies to each attribute. Explicit consent under 9(2)(a) is the usual answer and the hardest one to evidence.',
            ev,
          )
        : missing(
            'Special-category personal data appears in the data model with no recorded lawful basis.',
            'Identify the Article 9(2) condition for each attribute before processing. Collecting protected attributes solely to measure bias is defensible, but it needs its own recorded basis.',
            ['consent', 'lawful basis', 'Article 9(2)'],
          );
    },
    tests: [
      {
        name: 'missing when protected attributes are in the data model with no lawful basis recorded',
        files: {
          'src/model.ts':
            'export interface Applicant {\n  full_name: string;\n  email: string;\n  ethnicity: string;\n  religion: string;\n  disability: boolean;\n}\n',
        },
        expect: 'missing',
      },
      {
        // Never better than partial: consent machinery shows a basis *exists*,
        // not that the right Article 9(2) condition was picked per attribute.
        name: 'partial when a consent mechanism exists — the condition still has to be named',
        files: {
          'src/model.ts':
            'export interface Applicant {\n  full_name: string;\n  email: string;\n  ethnicity: string;\n  religion: string;\n  disability: boolean;\n}\n',
          'src/consent.ts':
            'export async function recordConsent(subjectId, purpose) {\n  return db.consent.create({ subjectId, purpose, lawful_basis: "explicit_consent", optIn: true });\n}\n',
        },
        expect: 'partial',
      },
    ],
  }),
];

export const GDPR_PACK: RulePack = {
  id: 'gdpr',
  name: 'GDPR (automated decisions)',
  version: '2026.09.1',
  jurisdiction: 'European Union',
  instrument: 'Regulation (EU) 2016/679 (General Data Protection Regulation)',
  reconciledOn: '2026-09-15',
  summary:
    'The subset of the GDPR that bites on AI systems making decisions about people: Article 22 automated decision-making, the Article 13-15 explanation duties, Article 35 impact assessments, and Article 9 special-category data. In force since 2018 — for most AI products this is the regulation that already applies.',
  url: 'https://gdpr-info.eu/',
  milestones: [{ date: IN_FORCE, label: 'GDPR applies', note: 'In force since 25 May 2018.' }],
  penalty: {
    currency: 'EUR',
    description: 'Administrative fines under Article 83.',
    tiers: [
      {
        label: 'Breach of data subject rights, including Article 22',
        amount: 20_000_000,
        turnoverPct: 4,
        citation: gdpr('Art. 83(5)', 'General conditions for imposing administrative fines'),
      },
      {
        label: 'Breach of controller obligations, including Article 35',
        amount: 10_000_000,
        turnoverPct: 2,
        citation: gdpr('Art. 83(4)', 'General conditions for imposing administrative fines'),
      },
    ],
  },
  controls,
};
