/**
 * Annex ; the compliance engine.
 *
 * Deterministic, offline, and reproducible: the same commit always produces the
 * same evidence ledger. Language models are used elsewhere in the product to
 * write prose; they are never used to decide whether an obligation is met.
 */

export * from './types.js';

export { buildSnapshot, extractDependencies } from './ingest/snapshot.js';
export type { RawFile, SnapshotInput } from './ingest/snapshot.js';
export { ingestDirectory } from './ingest/fs.js';
export { ingestGitHub, parseGitHubUrl } from './ingest/github.js';
export { IngestError, type IngestErrorCode } from './ingest/error.js';
export type { GitHubIngestResult, GitHubIngestOptions } from './ingest/github.js';
export { readTar, readTarGz, stripRootDir } from './ingest/tar.js';
export type { TarEntry } from './ingest/tar.js';
export { detectLanguage } from './ingest/languages.js';
export { INGEST_LIMITS } from './ingest/ignore.js';
export { parseAnnexIgnore, isIgnored } from './ingest/annexignore.js';
export type { IgnoreRule } from './ingest/annexignore.js';

export {
  SIGNAL_CATALOGUE,
  SIGNAL_CATALOGUE_VERSION,
  createSignalIndex,
  extractSignals,
  defineSignal,
} from './signals/index.js';

export { classify, inferRole, CLASSIFICATION_RULES } from './classify/index.js';
export type { ClassificationRule } from './classify/index.js';

export {
  createContext,
  evaluateControl,
  evaluatePacks,
  scoreControls,
  scorePacks,
  estimateExposure,
  buildClock,
} from './evaluate/index.js';

export {
  buildLedger,
  verifyLedger,
  verifyLedgerAgainstResults,
  ledgerFingerprint,
  LEDGER_ALGORITHM,
} from './ledger/index.js';
export type { LedgerVerification } from './ledger/index.js';
export {
  SIGNATURE_ALGORITHM,
  generateSigningKey,
  signLedgerRoot,
  verifyLedgerSignature,
  keyFingerprint,
} from './ledger/sign.js';
export type { SigningKeyPair, SignatureCheck } from './ledger/sign.js';

export { planRemediation, renderPatch } from './remediate/index.js';
export type { RemediationOptions } from './remediate/index.js';

export { scan, diffReports, defaultProfile, ENGINE_VERSION } from './scan.js';
export type { ScanOptions, ScanPhase, DriftReport } from './scan.js';

export * from './packs/index.js';
export { sha256, shortHash, stableStringify } from './util/hash.js';

export { buildDossier } from './dossier/annex-iv.js';
export type { Dossier, DossierSection, DossierOptions, DossierLocale } from './dossier/annex-iv.js';
export { dossierToMarkdown, dossierToHtml } from './dossier/render.js';

export { toSarif } from './export/sarif.js';
export { toAttestation, toMlBom } from './export/cyclonedx.js';

export { runBenchmark, benchmarkMarkdown, BENCHMARK } from './benchmark/index.js';
export type { BenchmarkSummary, CaseOutcome, BenchmarkCase } from './benchmark/index.js';
