import type { Citation, RiskTier, SignalIndex } from '../types.js';
import { aiActAnnex, aiActArticle, gdpr } from '../packs/citations.js';

export interface ClassificationRule {
  id: string;
  tier: RiskTier;
  title: string;
  /** Short explanation of the legal hook, shown in the UI. */
  basis: string;
  citations: Citation[];
  /** Every one of these signals must be present. */
  requires: string[];
  /** At least one of these must be present, when provided. */
  requiresAny?: string[];
  /** Signals that raise confidence when present. */
  boosts?: string[];
  /** Signals that suppress the rule entirely (documented carve-outs). */
  suppressedBy?: string[];
  baseConfidence: number;
  /** Carve-out or nuance an operator must confirm. Shown as a review prompt. */
  caveat?: string;
}

/**
 * Classification is deliberately rule-based and readable. A regulator, a
 * lawyer, or a judge can audit this table line by line — which is the whole
 * point. An LLM may *annotate* these findings but never produces them.
 */
export const CLASSIFICATION_RULES: ClassificationRule[] = [
  // ---------------------------------------------------------------------
  // Art. 5 — prohibited practices. Applicable since 2 February 2025.
  // ---------------------------------------------------------------------
  {
    id: 'art5.1f.emotion-workplace',
    tier: 'prohibited',
    title: 'Emotion inference in the workplace or an education setting',
    basis:
      'The code infers emotional state from people in a recruitment, employment or education context. Article 5(1)(f) prohibits placing on the market, putting into service or using AI systems to infer emotions of a natural person in the areas of workplace and education institutions, outside medical or safety purposes.',
    citations: [
      aiActArticle(
        5,
        '(1)(f)',
        'Prohibited AI practices — emotion inference at work or school',
        'the placing on the market, the putting into service for this specific purpose, or the use of AI systems to infer emotions of a natural person in the areas of workplace and education institutions, except where the use of the AI system is intended to be put in place or into the market for medical or safety reasons',
      ),
      aiActArticle(99, '(3)', 'Penalties — up to EUR 35 000 000 or 7 % of worldwide annual turnover'),
    ],
    requires: ['domain.emotion.recognition'],
    requiresAny: ['domain.employment.screening', 'domain.employment.management', 'domain.education.assessment'],
    boosts: ['ai.inference.call', 'domain.biometric.identification'],
    baseConfidence: 0.82,
    caveat:
      'Article 5(1)(f) carves out systems placed on the market for medical or safety reasons. Confirm the deployment context before treating this as final.',
  },
  {
    id: 'art5.1e.face-scraping',
    tier: 'prohibited',
    title: 'Untargeted scraping of facial images',
    basis:
      'The code appears to build a facial recognition database by scraping images from the internet or CCTV. Article 5(1)(e) prohibits this outright.',
    citations: [
      aiActArticle(
        5,
        '(1)(e)',
        'Prohibited AI practices — untargeted scraping of facial images',
        'the placing on the market, the putting into service for this specific purpose, or the use of AI systems that create or expand facial recognition databases through the untargeted scraping of facial images from the internet or CCTV footage',
      ),
    ],
    requires: ['domain.biometric.scraping'],
    boosts: ['domain.biometric.identification'],
    baseConfidence: 0.7,
  },
  {
    id: 'art5.1c.social-scoring',
    tier: 'prohibited',
    title: 'Social scoring of natural persons',
    basis:
      'The code scores people on social behaviour or personal characteristics. Article 5(1)(c) prohibits social scoring that leads to detrimental treatment in unrelated contexts or that is unjustified or disproportionate.',
    citations: [
      aiActArticle(
        5,
        '(1)(c)',
        'Prohibited AI practices — social scoring',
        'the placing on the market, the putting into service or the use of AI systems for the evaluation or classification of natural persons or groups of persons over a certain period of time based on their social behaviour or known, inferred or predicted personal or personality characteristics',
      ),
    ],
    requires: ['domain.social-scoring'],
    baseConfidence: 0.55,
    caveat:
      'The prohibition bites only where the score causes detrimental or disproportionate treatment in an unrelated social context. Review how the score is used downstream.',
  },
  {
    id: 'art5.1d.crime-prediction',
    tier: 'prohibited',
    title: 'Individual crime-risk prediction based on profiling',
    basis:
      'The code predicts the likelihood that an individual commits an offence. Article 5(1)(d) prohibits this where the assessment is based solely on profiling or on personality traits.',
    citations: [
      aiActArticle(5, '(1)(d)', 'Prohibited AI practices — predicting criminal offences'),
      aiActAnnex('III', '6', 'High-risk AI systems — law enforcement'),
    ],
    requires: ['domain.predictive-policing'],
    baseConfidence: 0.55,
    caveat:
      'The prohibition applies to assessments based *solely* on profiling or personality traits. Systems that support a human assessment grounded in objective, verifiable facts fall under Annex III, point 6 instead.',
  },
  {
    id: 'art5.1g.biometric-categorisation',
    tier: 'prohibited',
    title: 'Biometric categorisation by protected attribute',
    basis:
      'The code infers race, political opinions, trade union membership, religious or philosophical beliefs, sex life or sexual orientation from biometric data. Article 5(1)(g) prohibits this.',
    citations: [
      aiActArticle(5, '(1)(g)', 'Prohibited AI practices — biometric categorisation of sensitive attributes'),
    ],
    requires: ['domain.biometric.categorisation'],
    requiresAny: ['data.special-category', 'domain.biometric.identification'],
    baseConfidence: 0.5,
    caveat:
      'Labelling or filtering of lawfully acquired biometric datasets is carved out. Age and gender estimation is not inherently within the Article 5(1)(g) list — check which attribute is actually inferred.',
  },

  // ---------------------------------------------------------------------
  // Annex III — high-risk. General application from 2 August 2026.
  // ---------------------------------------------------------------------
  {
    id: 'annex-iii.4a.recruitment',
    tier: 'high',
    title: 'Employment: recruitment and candidate selection',
    basis:
      'The system analyses, filters or evaluates job applicants. Annex III, point 4(a) classifies AI systems intended to be used for the recruitment or selection of natural persons as high-risk.',
    citations: [
      aiActAnnex(
        'III',
        '4(a)',
        'High-risk AI systems — employment and worker management',
        'AI systems intended to be used for the recruitment or selection of natural persons, in particular to place targeted job advertisements, to analyse and filter job applications, and to evaluate candidates',
      ),
      aiActArticle(6, '(2)', 'Classification rules for high-risk AI systems'),
    ],
    requires: ['domain.employment.screening'],
    requiresAny: ['ai.inference.call', 'ai.ml.classical', 'ai.provider.*', 'domain.automated.decision'],
    boosts: ['domain.automated.decision', 'ai.prompt.system', 'data.pii.handling'],
    baseConfidence: 0.88,
  },
  {
    id: 'annex-iii.4b.worker-management',
    tier: 'high',
    title: 'Employment: worker management and monitoring',
    basis:
      'The system allocates tasks, monitors performance or informs decisions about work relationships. Annex III, point 4(b) classifies these as high-risk.',
    citations: [
      aiActAnnex(
        'III',
        '4(b)',
        'High-risk AI systems — decisions affecting work relationships',
        'AI systems intended to be used to make decisions affecting terms of work-related relationships, the promotion or termination of work-related contractual relationships, to allocate tasks based on individual behaviour or personal traits or characteristics or to monitor and evaluate the performance and behaviour of persons in such relationships',
      ),
    ],
    requires: ['domain.employment.management'],
    requiresAny: ['ai.inference.call', 'ai.ml.classical', 'ai.provider.*'],
    baseConfidence: 0.78,
  },
  {
    id: 'annex-iii.5b.credit',
    tier: 'high',
    title: 'Essential services: creditworthiness assessment',
    basis:
      'The system evaluates creditworthiness or establishes a credit score for natural persons. Annex III, point 5(b) classifies this as high-risk.',
    citations: [
      aiActAnnex(
        'III',
        '5(b)',
        'High-risk AI systems — creditworthiness',
        'AI systems intended to be used to evaluate the creditworthiness of natural persons or establish their credit score, with the exception of AI systems used for the purpose of detecting financial fraud',
      ),
    ],
    requires: ['domain.credit.scoring'],
    requiresAny: ['ai.inference.call', 'ai.ml.classical', 'ai.provider.*', 'domain.automated.decision'],
    baseConfidence: 0.85,
    caveat: 'Systems used solely to detect financial fraud are expressly excluded from point 5(b).',
  },
  {
    id: 'annex-iii.5c.insurance',
    tier: 'high',
    title: 'Essential services: life and health insurance pricing',
    basis:
      'The system performs risk assessment or pricing for life or health insurance in relation to natural persons — Annex III, point 5(c).',
    citations: [aiActAnnex('III', '5(c)', 'High-risk AI systems — insurance risk assessment and pricing')],
    requires: ['domain.insurance.pricing'],
    requiresAny: ['ai.inference.call', 'ai.ml.classical', 'ai.provider.*'],
    baseConfidence: 0.75,
  },
  {
    id: 'annex-iii.5a.public-benefits',
    tier: 'high',
    title: 'Essential services: eligibility for public assistance',
    basis:
      'The system evaluates eligibility for essential public assistance benefits and services, or grants, reduces, revokes or reclaims them — Annex III, point 5(a).',
    citations: [aiActAnnex('III', '5(a)', 'High-risk AI systems — public assistance benefits')],
    requires: ['domain.public-benefits'],
    requiresAny: ['ai.inference.call', 'ai.ml.classical', 'ai.provider.*', 'domain.automated.decision'],
    baseConfidence: 0.8,
  },
  {
    id: 'annex-iii.5d.emergency-triage',
    tier: 'high',
    title: 'Essential services: emergency triage and dispatch',
    basis:
      'The system evaluates or classifies emergency calls, or dispatches or prioritises emergency response, including patient triage — Annex III, point 5(d).',
    citations: [aiActAnnex('III', '5(d)', 'High-risk AI systems — emergency services and patient triage')],
    requires: ['domain.emergency.triage'],
    requiresAny: ['ai.inference.call', 'ai.ml.classical', 'ai.provider.*'],
    baseConfidence: 0.76,
    caveat:
      'If the system is itself a medical device or a safety component of one, Annex I and the sectoral regulation (MDR/IVDR) apply in addition.',
  },
  {
    id: 'annex-iii.3.education',
    tier: 'high',
    title: 'Education: admission, evaluation and proctoring',
    basis:
      'The system determines access to education, evaluates learning outcomes or monitors students during tests — Annex III, point 3.',
    citations: [aiActAnnex('III', '3', 'High-risk AI systems — education and vocational training')],
    requires: ['domain.education.assessment'],
    requiresAny: ['ai.inference.call', 'ai.ml.classical', 'ai.provider.*'],
    baseConfidence: 0.78,
  },
  {
    id: 'annex-iii.1a.biometric-id',
    tier: 'high',
    title: 'Biometrics: remote biometric identification',
    basis:
      'The system identifies natural persons from biometric data — Annex III, point 1(a). One-to-one verification to confirm a claimed identity is excluded.',
    citations: [aiActAnnex('III', '1(a)', 'High-risk AI systems — remote biometric identification')],
    requires: ['domain.biometric.identification'],
    baseConfidence: 0.7,
    caveat:
      'AI systems intended to be used for biometric verification whose sole purpose is to confirm that a person is who they claim to be are outside point 1(a).',
  },
  {
    id: 'annex-iii.1c.emotion',
    tier: 'high',
    title: 'Biometrics: emotion recognition',
    basis:
      'The system infers emotions from biometric data outside workplace and education settings — Annex III, point 1(c). Inside those settings it is prohibited under Article 5(1)(f).',
    citations: [aiActAnnex('III', '1(c)', 'High-risk AI systems — emotion recognition')],
    requires: ['domain.emotion.recognition'],
    baseConfidence: 0.65,
  },
  {
    id: 'annex-iii.7.migration',
    tier: 'high',
    title: 'Migration, asylum and border control',
    basis: 'The system assesses migration, asylum or border applications — Annex III, point 7.',
    citations: [aiActAnnex('III', '7', 'High-risk AI systems — migration, asylum and border control')],
    requires: ['domain.migration.border'],
    requiresAny: ['ai.inference.call', 'ai.ml.classical', 'ai.provider.*'],
    baseConfidence: 0.75,
  },
  {
    id: 'annex-iii.8a.justice',
    tier: 'high',
    title: 'Administration of justice',
    basis:
      'The system assists a judicial authority in researching and interpreting facts and law, or applying the law to a concrete set of facts — Annex III, point 8(a).',
    citations: [aiActAnnex('III', '8(a)', 'High-risk AI systems — administration of justice')],
    requires: ['domain.justice.administration'],
    requiresAny: ['ai.inference.call', 'ai.provider.*'],
    baseConfidence: 0.7,
    caveat:
      'Purely ancillary administrative activities — anonymisation, document management, scheduling — are outside point 8(a).',
  },
  {
    id: 'annex-iii.8b.elections',
    tier: 'high',
    title: 'Influencing elections and voting behaviour',
    basis: 'The system is intended to influence an election outcome or voting behaviour — Annex III, point 8(b).',
    citations: [aiActAnnex('III', '8(b)', 'High-risk AI systems — democratic processes')],
    requires: ['domain.democratic.process'],
    requiresAny: ['ai.inference.call', 'ai.provider.*'],
    baseConfidence: 0.68,
  },
  {
    id: 'annex-iii.2.infrastructure',
    tier: 'high',
    title: 'Critical infrastructure safety component',
    basis:
      'The system is a safety component in the management or operation of critical digital infrastructure, road traffic or the supply of water, gas, heating or electricity — Annex III, point 2.',
    citations: [aiActAnnex('III', '2', 'High-risk AI systems — critical infrastructure')],
    requires: ['domain.critical-infrastructure'],
    requiresAny: ['ai.inference.call', 'ai.ml.classical'],
    baseConfidence: 0.7,
  },

  // ---------------------------------------------------------------------
  // Art. 50 — transparency obligations.
  // ---------------------------------------------------------------------
  {
    id: 'art50.1.chat-disclosure',
    tier: 'transparency',
    title: 'Direct interaction with natural persons',
    basis:
      'The system talks to people. Article 50(1) requires that they are informed they are interacting with an AI system, unless it is obvious to a reasonably well-informed person.',
    citations: [
      aiActArticle(
        50,
        '(1)',
        'Transparency obligations — interaction with natural persons',
        'Providers shall ensure that AI systems intended to interact directly with natural persons are designed and developed in such a way that the natural persons concerned are informed that they are interacting with an AI system, unless this is obvious from the point of view of a natural person who is reasonably well-informed, observant and circumspect',
      ),
    ],
    requires: ['domain.chat.enduser'],
    requiresAny: ['ai.inference.call', 'ai.provider.*'],
    baseConfidence: 0.8,
  },
  {
    id: 'art50.2.synthetic-content',
    tier: 'transparency',
    title: 'Generation of synthetic content',
    basis:
      'The system generates synthetic audio, image, video or text. Article 50(2) requires outputs to be marked in a machine-readable format and detectable as artificially generated or manipulated.',
    citations: [
      aiActArticle(
        50,
        '(2)',
        'Transparency obligations — marking of synthetic content',
        'Providers of AI systems, including general-purpose AI systems, generating synthetic audio, image, video or text content, shall ensure that the outputs of the AI system are marked in a machine-readable format and detectable as artificially generated or manipulated',
      ),
      aiActArticle(50, '(4)', 'Transparency obligations — deep fakes and public-interest text'),
    ],
    requires: ['domain.synthetic.content'],
    baseConfidence: 0.78,
  },

  // ---------------------------------------------------------------------
  // GDPR Art. 22 — automated individual decision-making.
  // ---------------------------------------------------------------------
  {
    id: 'gdpr.art22.automated-decision',
    tier: 'transparency',
    title: 'Solely automated decision with legal or similarly significant effect',
    basis:
      'An automated decision is taken about a person without a human in the loop. GDPR Article 22 restricts this and requires safeguards including a right to obtain human intervention.',
    citations: [
      gdpr(
        'Art. 22(1)',
        'Automated individual decision-making, including profiling',
        'The data subject shall have the right not to be subject to a decision based solely on automated processing, including profiling, which produces legal effects concerning him or her or similarly significantly affects him or her',
      ),
      gdpr('Art. 22(3)', 'Safeguards — right to obtain human intervention'),
    ],
    requires: ['domain.automated.decision', 'data.pii.handling'],
    suppressedBy: ['control.human.review'],
    baseConfidence: 0.6,
    caveat:
      'Article 22 applies only where the decision is based *solely* on automated processing and produces legal or similarly significant effects.',
  },
];

/** Does a rule fire against this signal index? */
export function ruleMatches(rule: ClassificationRule, signals: SignalIndex): boolean {
  if (!rule.requires.every((id) => signals.hasAny(id))) return false;
  if (rule.requiresAny && rule.requiresAny.length > 0 && !signals.hasAny(...rule.requiresAny)) return false;
  if (rule.suppressedBy && signals.hasAny(...rule.suppressedBy)) return false;
  return true;
}
