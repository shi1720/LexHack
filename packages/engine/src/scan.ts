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
import { DEFAULT_PACKS, MARKET_PACKS, resolveMarkets } from './packs/index.js';
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
  /**
   * Carry through every answer the operator actually gave.
   *
   * This used to be an allow-list of field names, which is a bug factory: a
   * field added to `SystemProfile`, accepted by the CLI and read by a control
   * is silently dropped here, and the control quietly reports
   * `not_applicable` for a duty that binds. `publicBodyOrPublicService` did
   * exactly that on the Article 27 fundamental rights impact assessment — the
   * flag parsed, the control never saw it, and nothing failed.
   *
   * Undefined values are filtered out rather than spread, because
   * `exactOptionalPropertyTypes` distinguishes an absent key from a present
   * `undefined` one, and half this file's assertions depend on that.
   */
  const supplied = Object.fromEntries(
    Object.entries(overrides).filter(([, value]) => value !== undefined),
  ) as Partial<SystemProfile>;

  return {
    ...supplied,
    name: overrides.name ?? snapshot.name,
    purpose: overrides.purpose ?? '',
    role: overrides.role ?? 'unknown',
    euNexus: overrides.euNexus ?? true,
    markets: overrides.markets?.length ? overrides.markets : ['eu', 'us-federal'],
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
  const markets = resolveMarkets(opts.profile?.markets);
  const packs = opts.packs ?? markets.packs;
  const today = opts.today ?? new Date();
  const profile = defaultProfile(snapshot, opts.profile ?? {});
  const warnings: string[] = [];

  if (!opts.packs && markets.unknown.length > 0) {
    const codes = markets.unknown.map((m) => `"${m}"`).join(', ');
    const known = Object.keys(MARKET_PACKS).join(', ');
    warnings.push(
      markets.fellBack
        ? `No market code was recognised (${codes}), so every rule pack was evaluated. Known markets: ${known}.`
        : `Unrecognised market code ${codes} was ignored. Known markets: ${known}.`,
    );
  }

  if (snapshot.truncated) {
    warnings.push(
      `The repository exceeded the ingest limit, so only the first ${snapshot.fileCount} files were analysed. Findings are sound but coverage is partial.`,
    );
  }
  if (snapshot.ignoredCount > 0) {
    warnings.push(
      `${snapshot.ignoredCount} file${snapshot.ignoredCount === 1 ? '' : 's'} excluded by .annexignore and not analysed. They are still counted in the tree hash, so the ledger root reflects what was there.`,
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
    exposure: estimateExposure(packs, controls, profile),
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
  // "Substantial" under Art. 3(23): compliance with Chapter III Section 2 is
  // affected, or the intended purpose changed. A regression in a Chapter III
  // control, or a tier change, is the code-visible proxy for exactly that.
  const substantial =
    classificationChanged ||
    regressed.some((r) => r.severity === 'critical' || r.severity === 'high');

  const summary = substantial
    ? classificationChanged
      ? `The risk classification moved from ${before.classification.tier} to ${after.classification.tier}. A change in the intended purpose is a substantial modification on the face of Article 3(23), and Article 43(4) then requires the conformity assessment to be re-opened and the technical documentation updated.`
      : `${regressed.length} control${regressed.length === 1 ? '' : 's'} regressed, including at least one that affects compliance with Chapter III, Section 2. On the Article 3(23) definition this is a substantial modification.`
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
