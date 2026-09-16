import { createPublicKey, generateKeyPairSync, sign as nodeSign, verify as nodeVerify } from 'node:crypto';
import type { LedgerSignature } from '../types.js';

/**
 * A detached signature over the evidence-ledger root.
 *
 * The chain on its own is tamper-*evident*: it makes a silent edit detectable
 * by anyone who has the source and can re-run the scan. That is a real
 * property and it is not what "proof" means to the person a conformity
 * statement is handed to, because they have neither the source nor a reason to
 * trust the party that produced the numbers. Anyone holding the report can
 * recompute a self-consistent chain over different numbers.
 *
 * Signing the root closes that: the chain binds the results to each other, and
 * the signature binds the chain to a key. A reader with the public key can tell
 * that this exact set of results was produced by the holder of the private key,
 * without re-running anything and without trusting the file.
 *
 * Ed25519, from `node:crypto`, because this has to work with no dependency and
 * no network — the same constraints as the rest of the engine. What it still
 * does not give you is written down in SECURITY.md rather than implied away:
 * no timestamp authority, so a signature says who and not when; and key
 * distribution is a problem this does not solve.
 */
export const SIGNATURE_ALGORITHM = 'ed25519' as const;

export interface SigningKeyPair {
  /** PKCS#8 PEM. Secret. */
  privateKey: string;
  /** SPKI PEM. Publish this. */
  publicKey: string;
}

export function generateSigningKey(): SigningKeyPair {
  const { privateKey, publicKey } = generateKeyPairSync('ed25519');
  return {
    privateKey: privateKey.export({ type: 'pkcs8', format: 'pem' }).toString(),
    publicKey: publicKey.export({ type: 'spki', format: 'pem' }).toString(),
  };
}

/**
 * The numbers a reader actually looks at.
 *
 * The chain covers the control results. It does not cover the score, the live
 * score, the tier or the exposure — those are *derived* from the results and
 * stored beside them, so a signature over the root alone leaves every headline
 * unsigned. An auditor produced a report reading `100/100, limited risk, €0
 * exposure` that verified as `LEDGER INTACT · signed by <the real key>` and
 * exited 0, with the root and the signature bytes identical to the honest
 * report. The CLI's `summaryMismatches` catches that — but only the CLI, and
 * only for a reader who runs it.
 */
export interface SignedSummary {
  score: number;
  liveScore: number;
  tier: string;
  maxFine: number;
  currency: string;
}

/**
 * What gets signed.
 *
 * Length-prefixed for the same reason the chain payload is: a `\n`-joined
 * encoding lets one field's content be read as another's.
 */
function payload(root: string, algorithm: string, entryCount: number, summary?: SignedSummary): Buffer {
  const fields = [
    'annex-ledger/v2',
    algorithm,
    String(entryCount),
    root,
    summary ? `${summary.score}|${summary.liveScore}|${summary.tier}|${summary.maxFine}|${summary.currency}` : '',
  ];
  return Buffer.from(fields.map((f) => `${Buffer.byteLength(f, 'utf8')}:${f}`).join(''), 'utf8');
}

export function signLedgerRoot(
  root: string,
  algorithm: string,
  entryCount: number,
  privateKeyPem: string,
  summary?: SignedSummary,
): LedgerSignature {
  const value = nodeSign(null, payload(root, algorithm, entryCount, summary), privateKeyPem).toString('base64');
  // Carrying the public key beside the signature is deliberate: it makes the
  // report self-describing, so a reader can check internal consistency without
  // hunting for a key. It is not a substitute for knowing whose key it is —
  // a report signed by an unknown key proves only that it has not been edited
  // since somebody signed it, which `annex verify` says in those words.
  const publicKey = createPublicKey(privateKeyPem).export({ type: 'spki', format: 'pem' }).toString();
  return { algorithm: SIGNATURE_ALGORITHM, publicKey, value, signedPayload: 'annex-ledger/v2' };
}

export type SignatureCheck =
  | { status: 'unsigned' }
  | { status: 'valid'; publicKey: string; matchedExpectedKey: boolean }
  | { status: 'invalid'; reason: string };

export function verifyLedgerSignature(
  signature: LedgerSignature | undefined,
  root: string,
  algorithm: string,
  entryCount: number,
  expectedPublicKeyPem?: string,
  summary?: SignedSummary,
): SignatureCheck {
  if (!signature) return { status: 'unsigned' };
  if (signature.algorithm !== SIGNATURE_ALGORITHM) {
    return { status: 'invalid', reason: `unknown signature algorithm "${signature.algorithm}"` };
  }
  if (signature.signedPayload !== 'annex-ledger/v2') {
    return {
      status: 'invalid',
      reason: `this signature covers "${signature.signedPayload}", which did not bind the report's score, tier or exposure — re-sign it`,
    };
  }

  // Check against the key the caller expects *first*. A signature that only
  // verifies against a key carried inside the same file is a signature over
  // itself: whoever edited the report could have re-signed it with a key of
  // their own and pasted that in too.
  const keyToTrust = expectedPublicKeyPem ?? signature.publicKey;
  let ok: boolean;
  try {
    ok = nodeVerify(null, payload(root, algorithm, entryCount, summary), keyToTrust, Buffer.from(signature.value, 'base64'));
  } catch (err) {
    return { status: 'invalid', reason: `the key could not be read (${(err as Error).message})` };
  }
  if (!ok) {
    return {
      status: 'invalid',
      reason: expectedPublicKeyPem
        ? "the signature does not cover this report's ledger root and headline figures under the key you supplied"
        : "the signature does not match this report's ledger root and headline figures",
    };
  }

  const matchedExpectedKey =
    expectedPublicKeyPem !== undefined && normalise(expectedPublicKeyPem) === normalise(signature.publicKey);
  return { status: 'valid', publicKey: signature.publicKey, matchedExpectedKey };
}

const normalise = (pem: string) => pem.replace(/\s+/g, '');

/** A short, readable form of a public key, for printing beside a root. */
export function keyFingerprint(publicKeyPem: string): string {
  const der = createPublicKey(publicKeyPem).export({ type: 'spki', format: 'der' });
  // The last 8 bytes of an Ed25519 SPKI are the tail of the raw key.
  return [...der.subarray(der.length - 8)]
    .map((b) => b.toString(16).padStart(2, '0').toUpperCase())
    .join('')
    .replace(/(.{4})(?=.)/g, '$1-');
}
