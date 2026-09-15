import type {
  ActorRole,
  Article6_3Assessment,
  Classification,
  ClassificationFinding,
  RiskTier,
  SignalIndex,
  SystemProfile,
} from '../types.js';
import { aiActArticle } from '../packs/citations.js';
import { CLASSIFICATION_RULES, ruleMatches, type ClassificationRule } from './rules.js';

export { CLASSIFICATION_RULES, ruleMatches } from './rules.js';

/** Which instrument each rule classifies under, by rule id. */
const RULE_REGIME: Record<string, 'eu-ai-act' | 'gdpr'> = Object.fromEntries(
  CLASSIFICATION_RULES.map((r) => [r.id, r.regime ?? 'eu-ai-act']),
);
export type { ClassificationRule } from './rules.js';

const TIER_RANK: Record<RiskTier, number> = {
  prohibited: 5,
  high: 4,
  gpai: 3,
  transparency: 2,
  minimal: 1,
  unknown: 0,
};

/**
 * Keyword hints taken from the operator's own description of the system.
 * They can only *raise* confidence in a rule that already fired on code — a
 * sentence in a form never creates a finding by itself.
 */
const PURPOSE_HINTS: Record<string, string[]> = {
  'annex-iii.4a.recruitment': ['recruit', 'candidate', 'applicant', 'hiring', 'resume', 'cv', 'talent'],
  'annex-iii.4b.worker-management': ['employee', 'worker', 'workforce', 'performance review', 'shift'],
  'annex-iii.5b.credit': ['credit', 'loan', 'lending', 'underwrit', 'borrower'],
  'annex-iii.5c.insurance': ['insurance', 'premium', 'actuarial'],
  'annex-iii.5a.public-benefits': ['benefit', 'welfare', 'public assistance', 'entitlement'],
  'annex-iii.5d.emergency-triage': ['triage', 'emergency', 'patient', 'clinical'],
  'annex-iii.3.education': ['student', 'education', 'exam', 'admission', 'grading', 'course'],
  'annex-iii.1a.biometric-id': ['biometric', 'face', 'fingerprint', 'identity verification'],
  'annex-iii.7.migration': ['visa', 'asylum', 'immigration', 'border'],
  'annex-iii.8a.justice': ['court', 'judicial', 'legal research', 'case law'],
  'art50.1.chat-disclosure': ['chat', 'assistant', 'conversational', 'support'],
  'art50.2.synthetic-content': ['generate', 'image', 'video', 'voice', 'synthesis'],
};

function purposeBoost(ruleId: string, purpose: string): number {
  const hints = PURPOSE_HINTS[ruleId];
  if (!hints || !purpose) return 0;
  const lower = purpose.toLowerCase();
  return hints.some((h) => lower.includes(h)) ? 0.08 : 0;
}

function confidenceFor(rule: ClassificationRule, signals: SignalIndex, profile: SystemProfile): number {
  let confidence = rule.baseConfidence;

  // Each corroborating signal adds a little; the evidence count matters too.
  for (const boost of rule.boosts ?? []) {
    if (signals.hasAny(boost)) confidence += 0.03;
  }

  const primary = rule.requires[0];
  const hits = primary ? (signals.get(primary)?.hits ?? 0) : 0;
  if (hits >= 3) confidence += 0.04;
  if (hits >= 8) confidence += 0.03;

  confidence += purposeBoost(rule.id, profile.purpose ?? '');

  return Math.min(0.97, Math.round(confidence * 100) / 100);
}

/**
 * Art. 3(3) defines a provider as whoever develops an AI system *and places it
 * on the market under their own name*. A team calling someone else's model API
 * from their own product is, on that definition, a provider — which surprises
 * almost everyone. Art. 25(1)(c) makes it sharper: repoint a general-purpose
 * model at an Annex III use case and you become the provider of a high-risk
 * system, while the model vendor does not.
 */
export function inferRole(signals: SignalIndex, profile: SystemProfile): ActorRole {
  if (profile.role && profile.role !== 'unknown') return profile.role;
  const buildsOwnSystem =
    signals.hasAny('ai.inference.call', 'ai.prompt.system', 'ai.ml.training', 'ai.framework.agent');
  const usesThirdPartyModel = signals.hasAny('ai.provider.*');
  if (buildsOwnSystem && usesThirdPartyModel) return 'provider+deployer';
  if (buildsOwnSystem || usesThirdPartyModel) return 'provider';
  return 'unknown';
}

const ARTICLE_6_3_LIMBS: Record<NonNullable<SystemProfile['article6_3Derogation']>, string> = {
  'narrow-procedural': 'the system performs a narrow procedural task (Article 6(3)(a))',
  'improves-human-activity':
    'the system is intended to improve the result of a previously completed human activity (Article 6(3)(b))',
  'pattern-detection':
    'the system detects decision-making patterns or deviations from prior decision-making patterns and is not meant to replace or influence the previously completed human assessment, without proper human review (Article 6(3)(c))',
  preparatory: 'the system performs a preparatory task to an assessment relevant to an Annex III use case (Article 6(3)(d))',
};

/**
 * Evaluate an Article 6(3) claim. Annex never makes the claim itself — a
 * scanner cannot know whether a task is "narrow" in the sense the Regulation
 * means — but once an operator makes it, one part *is* checkable in code: the
 * final subparagraph closes the derogation whenever the system performs
 * profiling of natural persons, no matter which limb is relied on.
 */
function assessArticle6_3(
  claimed: NonNullable<SystemProfile['article6_3Derogation']>,
  signals: SignalIndex,
  annexIiiFindings: ClassificationFinding[],
): Article6_3Assessment {
  const profiling = signals.get('domain.profiling');
  const citations = [
    aiActArticle(6, '(3)', 'Classification rules for high-risk AI systems — derogation'),
    aiActArticle(6, '(4)', 'Obligation to document the assessment before placing on the market'),
    aiActArticle(49, '(2)', 'Registration of Annex III systems considered not high-risk'),
  ];

  if (annexIiiFindings.length === 0) {
    return {
      claimed,
      available: false,
      rationale:
        'The Article 6(3) derogation was claimed, but nothing in this repository places the system in Annex III to begin with, so there is no high-risk classification for it to displace.',
      evidence: [],
      citations,
    };
  }

  if (profiling && profiling.hits > 0) {
    return {
      claimed,
      available: false,
      rationale: `The Article 6(3) derogation is not available: the final subparagraph of Article 6(3) closes it for any AI system that performs profiling of natural persons, and profiling was found in this repository. The system remains high-risk under ${annexIiiFindings[0]?.title ?? 'Annex III'}.`,
      evidence: profiling.evidence.slice(0, 4),
      citations,
    };
  }

  return {
    claimed,
    available: true,
    rationale: `The operator has assessed that the system does not pose a significant risk of harm to the health, safety or fundamental rights of natural persons, including by not materially influencing the outcome of decision making, and that ${ARTICLE_6_3_LIMBS[claimed]}. Both limbs of Article 6(3) are required, and the first is a judgement about consequences that no scanner can make. No profiling of natural persons was found in the code, which is the one limb that is checkable and which would otherwise close the derogation outright. On that assessment the system is not high-risk — but Article 6(4) requires the assessment to be documented before the system is placed on the market or put into service, and Article 49(2) still requires registration in the EU database.`,
    evidence: [],
    citations,
  };
}

export interface ClassifyOptions {
  /** Operator override; recorded in the report and the dossier. */
  tierOverride?: RiskTier;
}

export function classify(
  signals: SignalIndex,
  profile: SystemProfile,
  opts: ClassifyOptions = {},
): Classification {
  const findings: ClassificationFinding[] = [];

  for (const rule of CLASSIFICATION_RULES) {
    if (!ruleMatches(rule, signals)) continue;

    const evidence = signals.evidenceFor(...rule.requires).slice(0, 6);
    if (evidence.length === 0) continue;

    findings.push({
      id: rule.id,
      tier: rule.tier,
      title: rule.title,
      rationale: rule.caveat ? `${rule.basis}\n\nCarve-out to check: ${rule.caveat}` : rule.basis,
      confidence: confidenceFor(rule, signals, profile),
      citations: rule.citations,
      evidence,
    });
  }

  findings.sort((a, b) => TIER_RANK[b.tier] - TIER_RANK[a.tier] || b.confidence - a.confidence);

  const usesAi = signals.hasAny('ai.provider.*', 'ai.inference.call', 'ai.ml.classical', 'ai.framework.agent');
  // Only AI Act findings set the AI Act tier. A GDPR Article 22 finding is
  // reported alongside them and never promotes a system into Annex III.
  const aiActFindings = findings.filter((f) => RULE_REGIME[f.id] !== 'gdpr');
  const detectedTier: RiskTier = aiActFindings[0]?.tier ?? (usesAi ? 'minimal' : 'unknown');

  // Article 6(3), where the operator has claimed it. An Annex III finding that
  // survives the claim is kept in the record with its rationale rewritten, so
  // the dossier shows the derogation being applied rather than the finding
  // quietly disappearing.
  let effectiveTier = detectedTier;
  let article6_3: Article6_3Assessment | undefined;
  if (profile.article6_3Derogation) {
    const annexIii = findings.filter((f) => f.id.startsWith('annex-iii.'));
    article6_3 = assessArticle6_3(profile.article6_3Derogation, signals, annexIii);
    if (article6_3.available) {
      for (const f of annexIii) {
        f.tier = 'minimal';
        f.rationale = `${f.rationale}\n\nArticle 6(3) derogation claimed: ${article6_3.rationale}`;
      }
      findings.sort((a, b) => TIER_RANK[b.tier] - TIER_RANK[a.tier] || b.confidence - a.confidence);
      effectiveTier = findings[0]?.tier ?? (usesAi ? 'minimal' : 'unknown');
    }
  }

  const tier = opts.tierOverride ?? profile.tierOverride ?? effectiveTier;
  const role = inferRole(signals, profile);

  const classification: Classification = {
    tier,
    role,
    findings,
    summary: summarise(tier, aiActFindings, usesAi),
    confidence: aiActFindings[0]?.confidence ?? findings[0]?.confidence ?? (usesAi ? 0.6 : 0.3),
  };
  if (article6_3) classification.article6_3 = article6_3;
  if (tier !== effectiveTier) classification.overridden = true;
  return classification;
}

function summarise(tier: RiskTier, findings: ClassificationFinding[], usesAi: boolean): string {
  const top = findings[0];
  switch (tier) {
    case 'prohibited':
      return top
        ? `Contains a practice prohibited by Article 5: ${top.title.toLowerCase()}.`
        : 'Contains a practice prohibited by Article 5.';
    case 'high':
      if (!top) return 'High-risk under the AI Act.';
      return top.id.startsWith('annex-iii.')
        ? `High-risk under Annex III — ${top.title.toLowerCase()}.`
        : `High-risk under the AI Act — ${top.title.toLowerCase()}.`;
    case 'transparency':
      return top
        ? `Subject to Article 50 transparency duties — ${top.title.toLowerCase()}.`
        : 'Subject to Article 50 transparency duties.';
    case 'gpai':
      return 'Provider of a general-purpose AI model — Chapter V obligations apply.';
    case 'minimal':
      return usesAi
        ? 'Uses AI but falls outside Annex III and Article 50 on the evidence found. Articles 4 and 5 still apply.'
        : 'No AI system detected in this repository.';
    default:
      return 'Not enough evidence in this repository to place the system in a risk tier.';
  }
}
