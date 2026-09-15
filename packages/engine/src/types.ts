/**
 * Annex core domain model.
 *
 * The whole engine is built around one idea: a legal obligation is a *function*
 * over a code repository that returns a status plus the evidence that justifies it.
 * Everything below exists to make that function auditable, reproducible and testable.
 */

// ---------------------------------------------------------------------------
// Repository snapshot
// ---------------------------------------------------------------------------

export type Language =
  | 'typescript'
  | 'javascript'
  | 'python'
  | 'go'
  | 'java'
  | 'ruby'
  | 'rust'
  | 'csharp'
  | 'php'
  | 'sql'
  | 'markdown'
  | 'yaml'
  | 'json'
  | 'toml'
  | 'html'
  | 'css'
  | 'shell'
  | 'text'
  | 'other';

export interface SourceFile {
  /** Repo-relative POSIX path, e.g. `src/screening/rank.ts`. */
  path: string;
  lang: Language;
  bytes: number;
  /** Number of lines. */
  loc: number;
  /** UTF-8 content. Empty for skipped/binary files. */
  text: string;
  /** SHA-256 of the raw bytes, hex. The atom of the evidence ledger. */
  sha256: string;
  skipped?: 'binary' | 'too-large' | 'ignored';
}

export interface Dependency {
  name: string;
  version?: string;
  ecosystem: 'npm' | 'pypi' | 'go' | 'maven' | 'cargo' | 'rubygems' | 'nuget' | 'unknown';
  dev?: boolean;
  source: string;
}

export interface RepoSnapshot {
  /** Content-addressed id: SHA-256 over the sorted (path, sha256) tuples. */
  id: string;
  name: string;
  origin?: string;
  ref?: string;
  commit?: string;
  files: SourceFile[];
  dependencies: Dependency[];
  fileCount: number;
  totalBytes: number;
  /** True when the ingest hit a cap and did not read the whole tree. */
  truncated: boolean;
  /** Files excluded by `.annexignore`. Counted, so the report stays honest. */
  ignoredCount: number;
  capturedAt: string;
}

// ---------------------------------------------------------------------------
// Evidence
// ---------------------------------------------------------------------------

export type EvidenceKind = 'code' | 'doc' | 'config' | 'manifest' | 'dependency' | 'absence';

export interface Evidence {
  path: string;
  /** 1-based. 0 means "whole file" / "not line-anchored". */
  line: number;
  endLine?: number;
  snippet: string;
  /** SHA-256 of the file the snippet came from. Empty for `absence` evidence. */
  fileSha256: string;
  kind: EvidenceKind;
  note?: string;
}

// ---------------------------------------------------------------------------
// Signals — the deterministic facts we extract from source
// ---------------------------------------------------------------------------

export type SignalCategory =
  | 'ai-usage'
  | 'domain'
  | 'data'
  | 'control'
  | 'transparency'
  | 'security'
  | 'governance'
  | 'quality';

export interface SignalDefinition {
  id: string;
  label: string;
  category: SignalCategory;
  description: string;
  /** Detectors are pure functions over the snapshot. */
  detect: (snapshot: RepoSnapshot) => Evidence[];
}

export interface Signal {
  id: string;
  label: string;
  category: SignalCategory;
  description: string;
  evidence: Evidence[];
  /** Number of distinct files the signal fired in. */
  fileCount: number;
  hits: number;
}

export interface SignalIndex {
  byId: Record<string, Signal>;
  has(id: string): boolean;
  /** Supports `*` suffix globs, e.g. `has('provider.*')`. */
  hasAny(...ids: string[]): boolean;
  get(id: string): Signal | undefined;
  /** All signals whose id starts with the prefix. */
  prefix(p: string): Signal[];
  evidenceFor(...ids: string[]): Evidence[];
  all(): Signal[];
}

// ---------------------------------------------------------------------------
// Legal citation
// ---------------------------------------------------------------------------

export interface Citation {
  /** Formal instrument, e.g. `Regulation (EU) 2024/1689`. */
  instrument: string;
  /** Short name used in the UI, e.g. `EU AI Act`. */
  short: string;
  /** Pin-cite, e.g. `Art. 12(1)` or `Annex III, 4(a)`. */
  locator: string;
  title: string;
  url: string;
  /** Verbatim quote of the operative text, where short enough to quote. */
  quote?: string;
}

// ---------------------------------------------------------------------------
// Classification
// ---------------------------------------------------------------------------

export type RiskTier =
  | 'prohibited'
  | 'high'
  | 'transparency'
  | 'minimal'
  | 'gpai'
  | 'unknown';

export type ActorRole = 'provider' | 'deployer' | 'provider+deployer' | 'unknown';

export interface ClassificationFinding {
  /** e.g. `annex-iii.4a` or `art5.1f`. */
  id: string;
  tier: RiskTier;
  title: string;
  rationale: string;
  confidence: number;
  citations: Citation[];
  evidence: Evidence[];
}

export interface Classification {
  tier: RiskTier;
  role: ActorRole;
  findings: ClassificationFinding[];
  /** Human-readable one-liner used in headlines and the dossier. */
  summary: string;
  /** 0..1 — how sure the engine is about the top tier. */
  confidence: number;
  /** Set when the operator overrode the automatic classification. */
  overridden?: boolean;
}

// ---------------------------------------------------------------------------
// Controls
// ---------------------------------------------------------------------------

export type ControlStatus =
  | 'satisfied'
  | 'partial'
  | 'missing'
  | 'not_applicable'
  | 'needs_review';

export type Severity = 'critical' | 'high' | 'medium' | 'low';

export type ControlFamily =
  | 'risk-management'
  | 'data-governance'
  | 'documentation'
  | 'record-keeping'
  | 'transparency'
  | 'human-oversight'
  | 'accuracy-robustness'
  | 'quality-management'
  | 'post-market'
  | 'incident-response'
  | 'registration'
  | 'prohibition'
  | 'rights';

export interface RemediationFile {
  path: string;
  /** Full file contents to write. */
  contents: string;
  /** If true, only write when the file is absent. */
  createOnly?: boolean;
  description: string;
}

export interface Remediation {
  summary: string;
  /** What a reviewer should check after applying. */
  reviewerNote: string;
  /** Files produced. Rendered as a unified diff / PR. */
  files: (ctx: EvaluationContext) => RemediationFile[];
  effort: 'minutes' | 'hours' | 'days';
}

export interface ControlResult {
  controlId: string;
  pack: string;
  title: string;
  obligation: string;
  family: ControlFamily;
  severity: Severity;
  weight: number;
  status: ControlStatus;
  /** 0..1. 1 = fully satisfied. */
  score: number;
  /** Why the engine reached this status, in plain English. */
  finding: string;
  /** What to do about it. */
  gap?: string;
  citations: Citation[];
  evidence: Evidence[];
  /** Deterministic vs LLM-assisted. Always deterministic in the core engine. */
  method: 'static-analysis' | 'manifest' | 'documentation' | 'attestation';
  remediationAvailable: boolean;
  /** ISO date the obligation starts to bind. Drives the compliance clock. */
  appliesFrom: string;
  /** True when `appliesFrom` is in the past relative to the scan date. */
  inForce: boolean;
}

export interface ControlEvaluation {
  status: ControlStatus;
  finding: string;
  gap?: string;
  evidence?: Evidence[];
  /** Override the default score derived from status. */
  score?: number;
}

export interface ControlTest {
  name: string;
  /** Minimal virtual repo used to exercise the control. */
  files: Record<string, string>;
  /** Profile answers for the virtual repo. */
  profile?: Partial<SystemProfile>;
  expect: ControlStatus;
}

export interface Control {
  id: string;
  pack: string;
  title: string;
  /** Plain-English statement of what the law requires. */
  obligation: string;
  family: ControlFamily;
  severity: Severity;
  /** Relative weight inside the pack score. */
  weight: number;
  citations: Citation[];
  method: ControlResult['method'];
  /**
   * ISO date from which the obligation binds. The EU AI Act phases in over
   * four years and the Digital Omnibus moved two of those dates, so every
   * control carries its own clock rather than inheriting one global deadline.
   */
  appliesFrom: string;
  /** Which risk tiers / roles this control binds. */
  appliesWhen: (ctx: EvaluationContext) => boolean;
  evaluate: (ctx: EvaluationContext) => ControlEvaluation;
  remediation?: Remediation;
  /** Golden tests — the law gets a test suite. */
  tests?: ControlTest[];
}

export interface RulePack {
  id: string;
  name: string;
  /** Semantic version of the pack corpus. */
  version: string;
  jurisdiction: string;
  instrument: string;
  /** Date the pack content was last reconciled against the source text. */
  reconciledOn: string;
  summary: string;
  url: string;
  /** Key dates that drive the urgency clock in the UI. */
  milestones: { date: string; label: string; note: string }[];
  controls: Control[];
  /** Maximum administrative fine, for exposure modelling. */
  penalty?: {
    description: string;
    tiers: { label: string; amountEur?: number; turnoverPct?: number; citation: Citation }[];
  };
}

// ---------------------------------------------------------------------------
// Operator-supplied profile (the small set of things code cannot tell us)
// ---------------------------------------------------------------------------

export interface SystemProfile {
  name: string;
  /** What the system does, in the operator's words. Feeds classification. */
  purpose: string;
  role: ActorRole;
  /** Does the system get placed on the EU market / used in the EU? */
  euNexus: boolean;
  /**
   * Markets the system is offered in. Drives which rule packs are evaluated:
   * a product that never touches New York should not be graded against
   * Local Law 144, and a score that pretends otherwise is noise.
   */
  markets?: string[];
  /** Annual worldwide turnover in EUR — drives fine exposure modelling. */
  turnoverEur?: number;
  employees?: number;
  /** Operator attestations for things not visible in code. */
  attestations?: Record<string, boolean>;
  /** Operator override of the detected tier. */
  tierOverride?: RiskTier;
}

// ---------------------------------------------------------------------------
// Evaluation context
// ---------------------------------------------------------------------------

export interface EvaluationContext {
  snapshot: RepoSnapshot;
  signals: SignalIndex;
  classification: Classification;
  profile: SystemProfile;
  /** Convenience helpers available to every control. */
  findFile: (pattern: RegExp) => SourceFile | undefined;
  findFiles: (pattern: RegExp) => SourceFile[];
  /** Search file *contents*; returns line-anchored evidence. */
  grep: (pattern: RegExp, opts?: { paths?: RegExp; limit?: number; kind?: EvidenceKind }) => Evidence[];
  /** Documentation-only search (markdown/rst/txt). */
  grepDocs: (pattern: RegExp, limit?: number) => Evidence[];
  hasDependency: (name: string | RegExp) => Dependency | undefined;
}

// ---------------------------------------------------------------------------
// Scan report
// ---------------------------------------------------------------------------

export interface PackScore {
  packId: string;
  packName: string;
  version: string;
  jurisdiction: string;
  score: number;
  applicable: number;
  satisfied: number;
  partial: number;
  missing: number;
  notApplicable: number;
  needsReview: number;
  /** Score restricted to obligations already in force on the scan date. */
  liveScore: number;
  liveApplicable: number;
}

export interface ExposureEstimate {
  /** Worst-case administrative fine, EUR. */
  maxFineEur: number;
  basis: string;
  citations: Citation[];
  drivers: { controlId: string; title: string; severity: Severity }[];
}

export interface LedgerEntry {
  index: number;
  /** SHA-256 over (prevHash, controlId, status, evidence digests, rule version). */
  hash: string;
  prevHash: string;
  controlId: string;
  status: ControlStatus;
  evidenceDigests: string[];
  ruleVersion: string;
  recordedAt: string;
}

export interface EvidenceLedger {
  /** Merkle-style hash chain over every control result, in deterministic order. */
  entries: LedgerEntry[];
  root: string;
  algorithm: 'sha256-chain/v1';
}

export interface ScanReport {
  /** Deterministic id: hash of snapshot id + pack versions + profile digest. */
  id: string;
  engineVersion: string;
  createdAt: string;
  /** Wall-clock duration of the deterministic pipeline, ms. */
  durationMs: number;
  profile: SystemProfile;
  snapshot: Omit<RepoSnapshot, 'files'> & { sampledPaths: string[] };
  classification: Classification;
  signals: Signal[];
  controls: ControlResult[];
  packs: PackScore[];
  /** Weighted conformity score across every applicable obligation, 0-100. */
  score: number;
  /** Score across obligations already in force on the scan date, 0-100. */
  liveScore: number;
  /** The next obligation deadline that bites, with days remaining. */
  clock: ComplianceClock;
  exposure: ExposureEstimate;
  ledger: EvidenceLedger;
  /** Populated only when remediation is requested. */
  remediation?: RemediationPlan;
  /** Optional LLM-authored narrative. Never required for a valid report. */
  narrative?: Narrative;
  warnings: string[];
}

export interface ComplianceMilestone {
  date: string;
  label: string;
  note: string;
  daysAway: number;
  status: 'in-force' | 'upcoming';
  controlIds: string[];
}

export interface ComplianceClock {
  today: string;
  milestones: ComplianceMilestone[];
  /** The nearest future milestone that has failing controls attached. */
  next?: ComplianceMilestone;
}

export interface RemediationPlan {
  branchName: string;
  title: string;
  body: string;
  files: (RemediationFile & { controlId: string })[];
  closes: string[];
  scoreBefore: number;
  scoreAfter: number;
}

export interface Narrative {
  headline: string;
  executiveSummary: string;
  intendedPurpose?: string;
  systemDescription?: string;
  riskNarrative?: string;
  model: string;
  generatedAt: string;
}
