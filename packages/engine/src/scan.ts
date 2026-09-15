import type {
  RepoSnapshot,
  RulePack,
  ScanReport,
  SystemProfile,
} from './types.js';
import { createSignalIndex, extractSignals, SIGNAL_CATALOGUE_VERSION } from './signals/index.js';
import { classify } from './classify/index.js';
import {
  buildClock,
  createContext,
  estimateExposure,
  evaluatePacks,
  scoreControls,
  scorePacks,
} from './evaluate/index.js';
import { buildLedger } from './ledger/index.js';
import { planRemediation } from './remediate/index.js';
import { DEFAULT_PACKS, packsForMarkets } from './packs/index.js';
import { sha256, stableStringify } from './util/hash.js';

export const ENGINE_VERSION = '0.1.0';

export interface ScanOptions {
  packs?: RulePack[];
  profile?: Partial<SystemProfile>;
  /** Produce a remediation plan alongside the report. */
  remediate?: boolean;
  /** Override the clock — used by tests and by "what will bind me in 2027" views. */
  today?: Date;
  onProgress?: (phase: ScanPhase, done: number, total: number, detail: string) => void;
}

export type ScanPhase = 'signals' | 'classify' | 'controls' | 'ledger' | 'remediation';

export function defaultProfile(snapshot: RepoSnapshot, overrides: Partial<SystemProfile> = {}): SystemProfile {
  return {
    name: overrides.name ?? snapshot.name,
    purpose: overrides.purpose ?? '',
    role: overrides.role ?? 'unknown',
    euNexus: overrides.euNexus ?? true,
    markets: overrides.markets ?? ['eu', 'us-federal'],
    ...(overrides.turnoverEur !== undefined ? { turnoverEur: overrides.turnoverEur } : {}),
    ...(overrides.employees !== undefined ? { employees: overrides.employees } : {}),
    ...(overrides.attestations ? { attestations: overrides.attestations } : {}),
    ...(overrides.tierOverride ? { tierOverride: overrides.tierOverride } : {}),
  };
}

/**
 * The whole pipeline: snapshot in, evidence-backed report out.
 *
 * Every step is deterministic and offline. No model is called, nothing is sent
 * anywhere, and the same commit always produces the same ledger root. That is
 * not an optimisation — it is the reason the output is usable as evidence.
 */
export function scan(snapshot: RepoSnapshot, opts: ScanOptions = {}): ScanReport {
  const started = Date.now();
  const packs = opts.packs ?? packsForMarkets(opts.profile?.markets);
  const today = opts.today ?? new Date();
  const profile = defaultProfile(snapshot, opts.profile ?? {});
  const warnings: string[] = [];

  if (snapshot.truncated) {
    warnings.push(
      `The repository exceeded the ingest limit, so only the first ${snapshot.fileCount} files were analysed. Findings are sound but coverage is partial.`,
    );
  }
  if (snapshot.fileCount === 0) {
    warnings.push('No readable source files were found in this repository.');
  }

  const signals = extractSignals(snapshot, {
    onProgress: (d, t, id) => opts.onProgress?.('signals', d, t, id),
  });
  const index = createSignalIndex(signals);

  const classification = classify(index, profile);
  opts.onProgress?.('classify', 1, 1, classification.tier);

  const ctx = createContext({ snapshot, signals: index, classification, profile });
  const controls = evaluatePacks(packs, ctx, {
    today,
    onProgress: (d, t, id) => opts.onProgress?.('controls', d, t, id),
  });

  const ruleVersions = Object.fromEntries(packs.map((p) => [p.id, p.version]));
  const ledger = buildLedger(controls, ruleVersions);
  opts.onProgress?.('ledger', 1, 1, ledger.root.slice(0, 12));

  const liveControls = controls.filter((r) => r.inForce);
  const isSme = (profile.employees ?? 0) > 0 ? (profile.employees ?? 0) < 250 : true;

  const report: ScanReport = {
    id: sha256(
      [snapshot.id, stableStringify(ruleVersions), stableStringify(profile), SIGNAL_CATALOGUE_VERSION].join('|'),
    ).slice(0, 32),
    engineVersion: ENGINE_VERSION,
    createdAt: new Date().toISOString(),
    durationMs: 0,
    profile,
    snapshot: {
      ...stripFiles(snapshot),
      sampledPaths: snapshot.files.slice(0, 40).map((f) => f.path),
    },
    classification,
    signals: signals.filter((s) => s.hits > 0),
    controls,
    packs: scorePacks(packs, controls),
    score: scoreControls(controls),
    liveScore: scoreControls(liveControls),
    clock: buildClock(packs, controls, today),
    exposure: estimateExposure(packs, controls, profile.turnoverEur, isSme),
    ledger,
    warnings,
  };

  if (opts.remediate) {
    const plan = planRemediation(packs, controls, ctx);
    if (plan) report.remediation = plan;
    opts.onProgress?.('remediation', 1, 1, plan ? `${plan.files.length} files` : 'nothing to fix');
  }

  report.durationMs = Date.now() - started;
  return report;
}

function stripFiles(snapshot: RepoSnapshot): Omit<RepoSnapshot, 'files'> {
  const { files: _files, ...rest } = snapshot;
  return rest;
}

/**
 * Article 43(4): a substantial modification re-opens the conformity assessment.
 * Only something that reads the code can tell you a modification was
 * substantial — which is the one thing a questionnaire can never do.
 */
export interface DriftReport {
  substantial: boolean;
  scoreDelta: number;
  classificationChanged: boolean;
  previousTier: string;
  currentTier: string;
  regressed: { controlId: string; title: string; from: string; to: string; severity: string }[];
  improved: { controlId: string; title: string; from: string; to: string }[];
  summary: string;
}

export function diffReports(before: ScanReport, after: ScanReport): DriftReport {
  const beforeById = new Map(before.controls.map((r) => [r.controlId, r]));
  const regressed: DriftReport['regressed'] = [];
  const improved: DriftReport['improved'] = [];

  for (const current of after.controls) {
    const previous = beforeById.get(current.controlId);
    if (!previous || previous.status === current.status) continue;
    if (current.score < previous.score) {
      regressed.push({
        controlId: current.controlId,
        title: current.title,
        from: previous.status,
        to: current.status,
        severity: current.severity,
      });
    } else {
      improved.push({
        controlId: current.controlId,
        title: current.title,
        from: previous.status,
        to: current.status,
      });
    }
  }

  const classificationChanged = before.classification.tier !== after.classification.tier;
  // "Substantial" under Art. 3(49): compliance with Chapter III Section 2 is
  // affected, or the intended purpose changed. A regression in a Chapter III
  // control, or a tier change, is the code-visible proxy for exactly that.
  const substantial =
    classificationChanged ||
    regressed.some((r) => r.severity === 'critical' || r.severity === 'high');

  const summary = substantial
    ? classificationChanged
      ? `The risk classification moved from ${before.classification.tier} to ${after.classification.tier}. Under Article 25(1)(c) and Article 43(4) this is a substantial modification: the conformity assessment has to be re-opened and the technical documentation updated.`
      : `${regressed.length} control${regressed.length === 1 ? '' : 's'} regressed, including at least one that affects compliance with Chapter III, Section 2. On the Article 3(49) definition this is a substantial modification.`
    : regressed.length > 0
      ? `${regressed.length} low-severity control${regressed.length === 1 ? '' : 's'} regressed. Not substantial on its own, but the dossier is now out of date.`
      : improved.length > 0
        ? `${improved.length} control${improved.length === 1 ? '' : 's'} improved and nothing regressed.`
        : 'No change in conformity posture.';

  return {
    substantial,
    scoreDelta: after.score - before.score,
    classificationChanged,
    previousTier: before.classification.tier,
    currentTier: after.classification.tier,
    regressed,
    improved,
    summary,
  };
}
