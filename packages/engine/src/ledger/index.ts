import type { ControlResult, EvidenceLedger, LedgerEntry } from '../types.js';
import { sha256 } from '../util/hash.js';

export const LEDGER_ALGORITHM = 'sha256-chain/v1' as const;
const GENESIS = '0'.repeat(64);

/**
 * The evidence ledger.
 *
 * Every conformity dossier in existence today is a self-attested document: it
 * asserts that controls are in place, and nobody can check the assertion
 * without redoing the work. The ledger closes that gap.
 *
 * Each control result is reduced to a canonical line — control id, status, the
 * digest of every piece of evidence, and the version of the rule that produced
 * it — and hashed into a chain. Change one character of one cited source file
 * and the digest changes, the chain breaks, and `verifyLedger` says exactly
 * which entry stopped matching.
 *
 * The root hash is short enough to print on the front page of the dossier. An
 * auditor who re-runs the scan on the same commit gets the same root, or knows
 * something moved.
 */
export function buildLedger(results: ControlResult[], ruleVersions: Record<string, string>): EvidenceLedger {
  const ordered = [...results].sort((a, b) => a.controlId.localeCompare(b.controlId));
  const entries: LedgerEntry[] = [];
  let prevHash = GENESIS;

  ordered.forEach((result, index) => {
    const evidenceDigests = result.evidence.map((e) =>
      sha256(`${e.path}|${e.line}|${e.endLine ?? ''}|${e.fileSha256}|${e.kind}|${e.snippet}`),
    );
    const ruleVersion = ruleVersions[result.pack] ?? 'unknown';
    const payload = [
      prevHash,
      result.controlId,
      result.status,
      result.score.toFixed(4),
      ruleVersion,
      ...evidenceDigests,
    ].join('\n');
    const hash = sha256(payload);

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

/** Recompute the chain and report the first entry that does not match. */
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
          reason: `Control "${entry.controlId}" no longer produces the recorded result. The evidence it cites has changed since the dossier was issued.`,
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
