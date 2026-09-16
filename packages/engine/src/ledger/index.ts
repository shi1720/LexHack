import type { ControlResult, EvidenceLedger, LedgerEntry } from '../types.js';
import { sha256 } from '../util/hash.js';

export const LEDGER_ALGORITHM = 'sha256-chain/v1' as const;
const GENESIS = '0'.repeat(64);

/**
 * The evidence ledger.
 *
 * Every conformity dossier in existence today is a self-attested document: it
 * asserts that controls are in place, and nobody can check the assertion
 * without redoing the work. The ledger narrows that gap ; precisely, and no
 * further than it actually goes.
 *
 * Each control result is reduced to a canonical line ; control id, status, the
 * digest of every piece of evidence, and the version of the rule that produced
 * it ; and hashed into a chain whose root is short enough to print on the
 * front page of the dossier.
 *
 * What that buys, exactly:
 *
 *  - **Re-derivability.** `verifyLedgerAgainstResults` rebuilds every hash from
 *    the results the report carries. Edit a status from `missing` to
 *    `satisfied` and the entry for that control no longer matches. This is
 *    what `annex verify` runs.
 *  - **Correspondence to source.** The digests describe specific bytes at
 *    specific paths. `annex verify --against <dir>` re-hashes each cited file
 *    off disk, so a dossier that no longer describes the tree says so.
 *  - **Reproducibility.** Re-run the scan on the same commit with the same
 *    rule versions and the root is identical, or something moved.
 *
 * What the chain alone does *not* buy: it is a checksum chain, so anyone
 * holding the report can recompute a self-consistent one over different
 * numbers. It makes a silent edit detectable to a reader who has the source
 * and can re-run the scan ; which is not the reader a conformity statement is
 * handed to.
 *
 * That is what `ledger/sign.ts` is for. A detached Ed25519 signature over the
 * root binds the chain to a key, so a reader holding the public key can tell
 * that these exact results came from that key's holder without re-running
 * anything. Signing is opt-in (`annex scan --sign`), because a scan has to
 * work with no key and no configuration. What remains outside the model is
 * written down rather than implied away: there is no timestamp authority, so a
 * signature says who and not when, and key distribution is still the
 * operator's problem.
 */
/**
 * Length-prefixed concatenation, because `join('\n')` is ambiguous.
 *
 * The rule-pack version comes out of the report and sits immediately before
 * the evidence digests, so an editor could move five digests into the version
 * string, empty the control's evidence array, and produce a byte-identical
 * payload: same root, same signature, and a control now citing nothing while
 * `--against` silently re-hashes fewer files. Prefixing each field with its
 * length makes the encoding injective, so two different ledgers cannot agree.
 */
function canonical(fields: string[]): string {
  return fields.map((f) => `${Buffer.byteLength(f, 'utf8')}:${f}`).join('');
}

export function buildLedger(results: ControlResult[], ruleVersions: Record<string, string>): EvidenceLedger {
  const ordered = [...results].sort((a, b) => a.controlId.localeCompare(b.controlId));
  const entries: LedgerEntry[] = [];
  let prevHash = GENESIS;

  ordered.forEach((result, index) => {
    const evidenceDigests = result.evidence.map((e) =>
      sha256(`${e.path}|${e.line}|${e.endLine ?? ''}|${e.fileSha256}|${e.kind}|${e.snippet}`),
    );
    const ruleVersion = ruleVersions[result.pack] ?? 'unknown';
    const hash = sha256(
      canonical([
        prevHash,
        result.controlId,
        result.pack,
        result.status,
        result.score.toFixed(4),
        // The four fields below are inputs to the numbers a reader actually
        // looks at, and leaving them out of the chain left the headline
        // unsigned. `scoreControls` is a weighted mean over `weight`;
        // `liveScore` filters on `inForce`; and `family` decides whether a
        // prohibition prices at the Article 99(3) tier. An auditor zeroed
        // every failing control's weight, set `inForce: false`, rewrote the
        // score to 100 and the tier to "limited" ; and the root, and the
        // signature over it, did not move.
        result.family,
        String(result.weight),
        result.severity,
        result.inForce ? 'in-force' : 'not-yet',
        ruleVersion,
        ...evidenceDigests,
      ]),
    );

    entries.push({
      index,
      hash,
      prevHash,
      controlId: result.controlId,
      status: result.status,
      evidenceDigests,
      ruleVersion,
      recordedAt: new Date().toISOString(),
    });
    prevHash = hash;
  });

  return { entries, root: prevHash, algorithm: LEDGER_ALGORITHM };
}

export interface LedgerVerification {
  valid: boolean;
  root: string;
  expectedRoot: string;
  brokenAt?: number;
  reason?: string;
  checked: number;
}

/**
 * Structural check only: confirm the links join up and the root is the last
 * hash. It cannot detect an edited *result*, because entries do not carry the
 * score ; that is `verifyLedgerAgainstResults`, which is what the CLI runs.
 * This exists for callers holding a ledger without the report it came from.
 */
export function verifyLedger(ledger: EvidenceLedger): LedgerVerification {
  let prevHash = GENESIS;

  for (const entry of ledger.entries) {
    if (entry.prevHash !== prevHash) {
      return {
        valid: false,
        root: prevHash,
        expectedRoot: ledger.root,
        brokenAt: entry.index,
        reason: `Entry ${entry.index} (${entry.controlId}) links to ${entry.prevHash.slice(0, 12)} but the chain is at ${prevHash.slice(0, 12)}.`,
        checked: entry.index,
      };
    }
    // Entries do not carry the score, so re-derivation of the hash is only
    // possible alongside the results. What we can verify standalone is the
    // link structure and the final root.
    prevHash = entry.hash;
  }

  const valid = prevHash === ledger.root;
  return {
    valid,
    root: prevHash,
    expectedRoot: ledger.root,
    checked: ledger.entries.length,
    ...(valid ? {} : { reason: 'The recomputed root does not match the recorded root.' }),
  };
}

/**
 * Full verification: re-derive every hash from the control results themselves.
 * This is what `annex verify` runs, and what an auditor runs to confirm that a
 * dossier describes the commit it claims to describe.
 */
export function verifyLedgerAgainstResults(
  ledger: EvidenceLedger,
  results: ControlResult[],
  ruleVersions: Record<string, string>,
): LedgerVerification {
  const rebuilt = buildLedger(results, ruleVersions);
  if (rebuilt.root === ledger.root) {
    return { valid: true, root: rebuilt.root, expectedRoot: ledger.root, checked: rebuilt.entries.length };
  }
  const firstMismatch = rebuilt.entries.findIndex((e, i) => e.hash !== ledger.entries[i]?.hash);
  const entry = rebuilt.entries[firstMismatch];
  return {
    valid: false,
    root: rebuilt.root,
    expectedRoot: ledger.root,
    checked: rebuilt.entries.length,
    ...(firstMismatch >= 0 && entry
      ? {
          brokenAt: firstMismatch,
          reason: `Entry ${firstMismatch} ("${entry.controlId}") does not hash to its recorded value: the status, score, rule version or cited evidence in this report is not what the ledger was built over.`,
        }
      : { reason: 'The ledger has a different number of entries than the current scan.' }),
  };
}

/** Short, quotable form for the dossier front page and the UI. */
export function ledgerFingerprint(ledger: EvidenceLedger): string {
  return ledger.root
    .slice(0, 16)
    .toUpperCase()
    .replace(/(.{4})(?=.)/g, '$1-');
}
