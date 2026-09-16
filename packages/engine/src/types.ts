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
  /** The best few citations, ranked. Capped for readability. */
  evidence: Evidence[];
  /** Number of distinct files the signal fired in. Not capped. */
  fileCount: number;
  /** Total matching lines across the snapshot. Not capped — see `evidence`. */
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

export interface Article6_3Assessment {
  /** The limb of Article 6(3) the operator relies on. */
  claimed: 'narrow-procedural' | 'improves-human-activity' | 'pattern-detection' | 'preparatory';
  /** False when the derogation is blocked or was not available to begin with. */
  available: boolean;
  /** Why, in a sentence an assessor can read. */
  rationale: string;
  /** Evidence of profiling, where that is what blocked it. */
  evidence: Evidence[];
  citations: Citation[];
}

export interface Classification {
  tier: RiskTier;
  role: ActorRole;
  /** Present when the operator claimed the Article 6(3) derogation. */
  article6_3?: Article6_3Assessment;
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
  /**
   * Does this duty turn on code *running*, rather than on an artefact existing?
   *
   * Article 14(4)(d)-(e) require that an overseer can override or stop the
   * system **while it is in use**; Article 12(1) requires logs recorded
   * **over the lifetime of the system**. For those, a module nothing calls
   * discharges nothing, and the engine caps the verdict at `partial` — which
   * is what stops merging Annex's own remediation pull request from turning
   * the score green without a line of running code changing.
   *
   * Most obligations are not like that. Article 15(3) asks for a declared
   * accuracy level, 6 RCNY § 5-303 asks for a published summary, Article 10
   * asks for a bias examination: those are satisfied by an artefact, and an
   * evaluation harness that CI runs is not dead code merely because no file
   * imports it. Marking the distinction per obligation, rather than applying
   * one rule to all forty-five, is the difference between a check and a
   * source of false positives.
   */
  requiresWiring?: boolean;
  /**
   * Which penalty tier prices a breach of *this* obligation.
   *
   * Penalty provisions are closed lists, and the tier used to be chosen by
   * position in an array: the first if any prohibition was failing, otherwise
   * the second. That charged €15,000,000 under Article 99(4) for a missing AI
   * literacy page — and Article 99 does not mention Article 4 at all — while
   * pricing every GDPR breach at the Article 83(4) tier even when the failing
   * obligations were Article 9 and Article 17, which are Article 83(5).
   *
   * Left unset, the obligation carries no Union-level administrative fine of
   * its own, and the exposure model says so rather than inventing one.
   */
  penaltyTier?: string;
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
    /**
     * Currency of the flat amounts in this regime. NYC's civil penalties are
     * dollars, and running them through a euro formatter — as this did until
     * the field existed — turns $1,500 into €1,500 and invites a comparison
     * across regimes that is not a comparison at all.
     */
    currency: 'EUR' | 'USD';
    /**
     * Does this regime invert the higher-of rule for SMEs?
     *
     * Article 99(6) of the AI Act does. GDPR Article 83(4) and 83(5) both say
     * "whichever is higher", full stop — applying the inversion to them
     * reported a €20,000,000 ceiling as €196,000.
     */
    smeInversion?: boolean;
    tiers: {
      /** Stable key a control names in `penaltyTier`. */
      id: string;
      label: string;
      amount?: number;
      turnoverPct?: number;
      /** Set where the statute multiplies the amount, e.g. per day or per notice. */
      multiplier?: string;
      /**
       * Whether Article 99(6a) inverts *this* tier for a small mid-cap.
       *
       * It inverts paragraphs 4 and 5 and not paragraph 3, so the flag belongs
       * on the tier rather than on the pack. An SMC failing Article 5 faces the
       * full higher-of €35 000 000 or 7 %, and reading the pack-wide SME flag
       * across all tiers would have understated that by roughly four times for
       * a €120m operator.
       */
      smcInversion?: boolean;
      citation: Citation;
    }[];
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
  /**
   * Article 2(1): does the Regulation reach this system at all?
   *
   * True where the system is placed on the Union market or put into service in
   * the Union, the deployer is established or located in the Union, or the
   * output produced by the system is used in the Union. When this is false the
   * EU packs still evaluate — a team usually wants to know what *would* bind
   * them — but the exposure figure is suppressed, because a €35M banner over a
   * product with no Union nexus is the error most likely to embarrass its
   * author.
   */
  euNexus: boolean;
  /**
   * Article 2 exclusions the operator claims: scientific research and
   * development only (2(6)), pre-market research, testing or development
   * (2(8)), or free and open-source release (2(12) — which does not reach
   * Articles 5 and 50, or a high-risk placing on the market).
   */
  scopeExclusions?: ('research' | 'pre-market' | 'foss')[];
  /** Balance-sheet total in EUR. With turnover, decides SME status. */
  balanceSheetEur?: number;
  /**
   * Article 27(1) limb (i) or (ii): the deployer is a body governed by public
   * law, or a private entity providing a public service.
   *
   * This is a fact about the organisation, not about the code, so Annex cannot
   * read it — but without it the fundamental rights impact assessment reaches
   * only limb (iii), the Annex III point 5(b) and 5(c) use cases. A
   * municipality deploying a recruitment tool, a public hospital deploying
   * triage, a school deploying grading and a private operator of a public
   * transport service are all inside Article 27(1) and were all outside the
   * control.
   */
  publicBodyOrPublicService?: boolean;
  /**
   * Article 99(6a), inserted by the Digital Omnibus: the operator is a **small
   * mid-cap company**.
   *
   * SMCs get the lower-of rule for paragraphs 4 and 5 — and **not** for
   * paragraph 3, so an Article 5 breach by an SMC carries the full higher-of
   * €35 000 000 or 7 %. The inversion is therefore per-tier, which is why this
   * is a separate flag rather than a wider reading of the SME test.
   *
   * It is an operator attestation because the defining instrument for "small
   * mid-cap" sits outside the AI Act and Annex does not model it; the research
   * notes flag the thresholds as unverified. Unknown resolves to *not* an SMC,
   * for the same reason unknown resolves to not-an-SME: the inversion lowers
   * the ceiling, and guessing generously hands an operator a number that is
   * too small.
   */
  smallMidCap?: boolean;
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
  /**
   * Article 6(3) derogation, claimed by the operator.
   *
   * An Annex III system is not high-risk where it does not pose a significant
   * risk of harm to health, safety or fundamental rights — because it performs
   * a narrow procedural task, improves the result of a previously completed
   * human activity, detects decision-making patterns or deviations from prior
   * patterns without replacing or influencing the human assessment, or performs
   * a preparatory task. This is the provision most real Annex III conversations
   * turn on, and it is a determination the provider makes and documents under
   * Article 6(4), not one a scanner can make for them. Annex evaluates the
   * consequences of the claim; it never claims it on anyone's behalf.
   *
   * It is never available where the system performs profiling of natural
   * persons (Article 6(3), final subparagraph), which Annex checks in code.
   */
  article6_3Derogation?: 'narrow-procedural' | 'improves-human-activity' | 'pattern-detection' | 'preparatory';
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
  /**
   * Documentation-only search (markdown/rst/txt).
   *
   * `paths` narrows which documents may answer. Without it, a repo-wide grep
   * for "risk management" is answered by the words "risk management" appearing
   * in an incident-response runbook — which is how a documentation control
   * ends up satisfied by a document about something else.
   */
  grepDocs: (pattern: RegExp, limit?: number, paths?: RegExp) => Evidence[];
  hasDependency: (name: string | RegExp) => Dependency | undefined;
  /**
   * Where does the rest of the tree reach into this file?
   *
   * The difference between a control that exists and a control that runs. A
   * generated `human_oversight.py` that nothing imports satisfies nobody's
   * Article 14 duty, and a scanner that says otherwise is a laundering
   * machine: it would let a team merge Annex's own remediation PR and watch
   * the score rise without a line of running code changing.
   *
   * Imports and calls are reported separately because they are different
   * facts. An import is a declaration of intent; a call is the thing the
   * obligation is actually about. `import gate  # noqa: F401` is one line of
   * work and would otherwise turn the highest-weight control in the corpus
   * green.
   */
  isReferenced: (file: SourceFile) => { calls: Evidence[]; imports: Evidence[] };
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
  /** Statutory ceiling in the headline currency. Not a forecast. */
  maxFine: number;
  currency: 'EUR' | 'USD';
  basis: string;
  citations: Citation[];
  drivers: { controlId: string; title: string; severity: Severity }[];
  /**
   * One entry per regime that is failing. Regimes are modelled separately
   * rather than reduced to a single maximum: a €15m EU ceiling and a $1,500
   * per-day NYC penalty are different kinds of number, and the headline shows
   * the largest EUR-denominated one.
   */
  byRegime: {
    packId: string;
    packName: string;
    amount: number;
    currency: 'EUR' | 'USD';
    label: string;
    multiplier?: string;
    citation: Citation;
  }[];
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

export interface LedgerSignature {
  algorithm: 'ed25519';
  /** SPKI PEM of the signing key, carried so the report is self-describing. */
  publicKey: string;
  /** Base64 Ed25519 signature over the versioned payload. */
  value: string;
  /** What was signed, so a future format change is detectable rather than silent. */
  signedPayload: 'annex-ledger/v1';
}

export interface EvidenceLedger {
  /** Merkle-style hash chain over every control result, in deterministic order. */
  entries: LedgerEntry[];
  root: string;
  algorithm: 'sha256-chain/v1';
  /**
   * Optional detached signature over the root.
   *
   * The chain makes an edit detectable to someone who has the source. The
   * signature makes it detectable to someone who has neither the source nor a
   * reason to trust whoever produced the file — which is the reader a
   * conformity statement is actually for.
   */
  signature?: LedgerSignature;
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
