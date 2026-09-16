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
 * What gets signed.
 *
 * The root alone would be ambiguous across algorithm versions, so the signed
 * payload names the algorithm and the entry count too. Changing any of them
 * changes the payload and invalidates the signature, which is the point.
 */
function payload(root: string, algorithm: string, entryCount: number): Buffer {
  return Buffer.from(`annex-ledger/v1\n${algorithm}\n${entryCount}\n${root}\n`, 'utf8');
}

export function signLedgerRoot(
  root: string,
  algorithm: string,
  entryCount: number,
  privateKeyPem: string,
): LedgerSignature {
  const value = nodeSign(null, payload(root, algorithm, entryCount), privateKeyPem).toString('base64');
  // Carrying the public key beside the signature is deliberate: it makes the
  // report self-describing, so a reader can check internal consistency without
  // hunting for a key. It is not a substitute for knowing whose key it is —
  // a report signed by an unknown key proves only that it has not been edited
  // since somebody signed it, which `annex verify` says in those words.
  const publicKey = createPublicKey(privateKeyPem).export({ type: 'spki', format: 'pem' }).toString();
  return { algorithm: SIGNATURE_ALGORITHM, publicKey, value, signedPayload: 'annex-ledger/v1' };
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
): SignatureCheck {
  if (!signature) return { status: 'unsigned' };
  if (signature.algorithm !== SIGNATURE_ALGORITHM) {
    return { status: 'invalid', reason: `unknown signature algorithm "${signature.algorithm}"` };
  }

  // Check against the key the caller expects *first*. A signature that only
  // verifies against a key carried inside the same file is a signature over
  // itself: whoever edited the report could have re-signed it with a key of
  // their own and pasted that in too.
  const keyToTrust = expectedPublicKeyPem ?? signature.publicKey;
  let ok: boolean;
  try {
    ok = nodeVerify(null, payload(root, algorithm, entryCount), keyToTrust, Buffer.from(signature.value, 'base64'));
  } catch (err) {
    return { status: 'invalid', reason: `the key could not be read (${(err as Error).message})` };
  }
  if (!ok) {
    return {
      status: 'invalid',
      reason: expectedPublicKeyPem
        ? 'the ledger root was not signed by the key you supplied'
        : 'the signature does not match the ledger root it is attached to',
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
