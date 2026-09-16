import type {
  EvidenceLedger,
  RepoSnapshot,
  RulePack,
  ScanReport,
  SystemProfile,
} from './types.js';
import { createSignalIndex, extractSignals, SIGNAL_CATALOGUE_VERSION } from './signals/index.js';
import { CODE_LANGUAGES } from './ingest/languages.js';
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
import { signLedgerRoot } from './ledger/sign.js';
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
  /**
   * PKCS#8 PEM of an Ed25519 key. When supplied, the ledger root is signed.
   *
   * Optional on purpose: a scan has to work with no key, no network and no
   * configuration, and an unsigned report is still internally verifiable.
   */
  signingKey?: string;
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
  if (snapshot.oversizePaths && snapshot.oversizePaths.length > 0) {
    warnings.push(
      `${snapshot.oversizePaths.length} file(s) exceeded the per-file size limit and were not analysed: ${snapshot.oversizePaths.slice(0, 5).join(', ')}${snapshot.oversizePaths.length > 5 ? ', …' : ''}. Padding a file past the limit is the cheapest way to hide it from this scan, so the paths are named.`,
    );
  }

  const signals = extractSignals(snapshot, {
    onProgress: (d, t, id) => opts.onProgress?.('signals', d, t, id),
  });
  const index = createSignalIndex(signals);

  /**
   * Every detector is written against English identifiers.
   *
   * A German or Spanish hiring model with a threshold and an automatic
   * advance/reject is unambiguously Annex III point 4(a), and Annex sees
   * nothing in it — which, for a tool whose primary market is the European
   * Union, is the largest class of false negative it has. That is a scope
   * limit rather than a bug, and a scope limit that resolves to a clean
   * result is indistinguishable from a pass, so it is said out loud whenever
   * a scan finds code and no domain signal at all.
   */
  if (
    snapshot.fileCount > 0 &&
    !index.hasAny('domain.*') &&
    snapshot.files.some((f) => f.text && !f.skipped && CODE_LANGUAGES.has(f.lang))
  ) {
    warnings.push(
      'No regulated use case was detected. Worth knowing before you read that as a clean result: every detector in Annex is written against English identifiers, so a hiring model whose variables are in German or Spanish is invisible to it. That is a limit of this tool, not a finding about this system.',
    );
  }


  const classification = classify(index, profile);
  opts.onProgress?.('classify', 1, 1, classification.tier);

  /**
   * Article 111(2), the largest scope carve-out in the amended Act.
   *
   * A high-risk system already on the market when Chapter III starts applying
   * is only caught by it if the design is significantly changed afterwards —
   * except for a public-authority system, which has to comply by 2 August 2030
   * regardless. The Omnibus replaced the hard-coded date with a dynamic
   * reference to Article 113, so the cut-off moved with the deferral.
   *
   * Annex cannot see when a system was placed on the market: that is a fact
   * about a company, not about a repository. What it can do is stop presenting
   * the whole Chapter III stack as settled for a legacy system, which is what
   * it did by saying nothing.
   */
  if (
    classification.tier === 'high' &&
    classification.findings.some((f) => f.id.startsWith('annex-iii.'))
  ) {
    warnings.push(
      'Article 111(2): if this system was placed on the market or put into service before 2 December 2027, the Chapter III obligations below bind it only if its design is significantly changed after that date — and a system operated by a public authority must comply by 2 August 2030 whatever happens. Annex cannot tell when a system was placed on the market, so it reports the obligations as though it were new.',
    );
  }

  const ctx = createContext({ snapshot, signals: index, classification, profile });
  const controls = evaluatePacks(packs, ctx, {
    today,
    onProgress: (d, t, id) => opts.onProgress?.('controls', d, t, id),
  });

  const ruleVersions = Object.fromEntries(packs.map((p) => [p.id, p.version]));
  const liveControls = controls.filter((r) => r.inForce);
  const ledgerBase = buildLedger(controls, ruleVersions);

  // The signature has to cover the derived figures, not only the chain. They
  // are computed here so the same values are signed and stored — a signature
  // over numbers recomputed later would be signing something the report might
  // not say.
  const score = scoreControls(controls);
  const liveScore = scoreControls(liveControls);
  const exposure = estimateExposure(packs, controls, profile);
  const ledger: EvidenceLedger = opts.signingKey
    ? {
        ...ledgerBase,
        signature: signLedgerRoot(
          ledgerBase.root,
          ledgerBase.algorithm,
          ledgerBase.entries.length,
          opts.signingKey,
          {
            score: score ?? -1,
            liveScore: liveScore ?? -1,
            tier: classification.tier,
            maxFine: exposure.maxFine,
            currency: exposure.currency,
          },
        ),
      }
    : ledgerBase;
  opts.onProgress?.('ledger', 1, 1, ledger.root.slice(0, 12));


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
    score,
    liveScore,
    clock: buildClock(packs, controls, today),
    exposure,
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
    // An unscorable side makes the delta meaningless rather than zero, and
    // `diffReports` has no way to say "unknown" — so it reports no movement
    // and the summary above names the tier change, which is the fact that
    // survives.
    scoreDelta: after.score === null || before.score === null ? 0 : after.score - before.score,
    classificationChanged,
    previousTier: before.classification.tier,
    currentTier: after.classification.tier,
    regressed,
    improved,
    summary,
  };
}
