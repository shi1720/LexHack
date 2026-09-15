import type {
  ActorRole,
  Classification,
  ClassificationFinding,
  RiskTier,
  SignalIndex,
  SystemProfile,
} from '../types.js';
import { CLASSIFICATION_RULES, ruleMatches, type ClassificationRule } from './rules.js';

export { CLASSIFICATION_RULES, ruleMatches } from './rules.js';
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
  const detectedTier: RiskTier = findings[0]?.tier ?? (usesAi ? 'minimal' : 'unknown');
  const tier = opts.tierOverride ?? profile.tierOverride ?? detectedTier;
  const role = inferRole(signals, profile);

  const classification: Classification = {
    tier,
    role,
    findings,
    summary: summarise(tier, findings, usesAi),
    confidence: findings[0]?.confidence ?? (usesAi ? 0.6 : 0.3),
  };
  if (tier !== detectedTier) classification.overridden = true;
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
      return top
        ? `High-risk under Annex III — ${top.title.toLowerCase()}.`
        : 'High-risk under Annex III.';
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
