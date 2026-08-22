/**
 * Digital-Signature Nonce-Reuse & Malleability Attack Lab (secp256k1 / ECDSA).
 *
 * ECDSA's security hinges on the per-signature nonce `k` being unique and secret.
 * If a signer ever reuses `k` across two different messages, both signatures share
 * the same `r`, and *anyone* can recover the long-term private key with basic
 * modular arithmetic:
 *
 *   k = (z1 − z2) · (s1 − s2)⁻¹  (mod n)
 *   d = (s1·k − z1) · r⁻¹        (mod n)
 *
 * This is the real bug that leaked the Sony PS3 code-signing key and drained
 * Bitcoin wallets whose wallet software reused nonces. This module also
 * demonstrates ECDSA signature *malleability* (s and n−s are both valid).
 *
 * The signer here takes an explicit `k` on purpose so the reuse can be shown — a
 * correct implementation derives `k` deterministically (RFC 6979) or from a CSPRNG
 * and never exposes it.
 */
import { secp256k1 } from '@noble/curves/secp256k1.js'
import { sha256 } from '@noble/hashes/sha2.js'

/** secp256k1 group order n and base point G. */
const CURVE_N: bigint = secp256k1.Point.Fn.ORDER
const G = secp256k1.Point.BASE

export const SECP256K1_ORDER = CURVE_N

export interface EcdsaSignature {
  /** r = (k·G).x mod n */
  r: bigint
  /** s = k⁻¹(z + r·d) mod n */
  s: bigint
  /** z = the message hash reduced into the scalar field (what actually gets signed) */
  z: bigint
  /** The message this signature is over (for display). */
  message: string
}

export interface RecoveryResult {
  /** The recovered nonce k. */
  k: bigint
  /** The recovered private key d. */
  d: bigint
}

function mod(a: bigint, m: bigint): bigint {
  const x = a % m
  return x >= 0n ? x : x + m
}

/** Modular inverse via the extended Euclidean algorithm. */
function modInverse(a: bigint, m: bigint): bigint {
  let [oldR, r] = [mod(a, m), m]
  let [oldS, s] = [1n, 0n]
  while (r !== 0n) {
    const q = oldR / r
    ;[oldR, r] = [r, oldR - q * r]
    ;[oldS, s] = [s, oldS - q * s]
  }
  if (oldR !== 1n) {
    throw new Error('Value is not invertible modulo the curve order.')
  }
  return mod(oldS, m)
}

/** Hash a message to the scalar z that ECDSA actually signs. */
export function hashToScalar(message: string): bigint {
  const digest = sha256(new TextEncoder().encode(message))
  let z = 0n
  for (const byte of digest) {
    z = (z << 8n) | BigInt(byte)
  }
  return mod(z, CURVE_N)
}

/** Format a scalar as a fixed-width 64-hex-char string (256 bits). */
export function toHex(value: bigint): string {
  return value.toString(16).padStart(64, '0')
}

/** Derive the public key point Q = d·G from a private scalar. */
export function publicKeyOf(privateKey: bigint) {
  return G.multiply(mod(privateKey, CURVE_N))
}

/**
 * Sign a message with an EXPLICIT nonce `k`. Deliberately vulnerable — exists
 * only so the lab can reuse `k` and show the consequence.
 */
export function signWithNonce(message: string, privateKey: bigint, k: bigint): EcdsaSignature {
  const kReduced = mod(k, CURVE_N)
  if (kReduced === 0n) {
    throw new Error('Nonce k must be non-zero mod n.')
  }
  const point = G.multiply(kReduced)
  const r = mod(point.x, CURVE_N)
  if (r === 0n) {
    throw new Error('Degenerate nonce produced r = 0; choose another k.')
  }
  const z = hashToScalar(message)
  const s = mod(modInverse(kReduced, CURVE_N) * (z + r * mod(privateKey, CURVE_N)), CURVE_N)
  if (s === 0n) {
    throw new Error('Degenerate signature produced s = 0; choose another k.')
  }
  return { r, s, z, message }
}

/** Standard ECDSA verification against a public key point Q. */
export function verifySignature(
  message: string,
  signature: Pick<EcdsaSignature, 'r' | 's'>,
  publicKey: ReturnType<typeof publicKeyOf>,
): boolean {
  const { r, s } = signature
  if (r <= 0n || r >= CURVE_N || s <= 0n || s >= CURVE_N) {
    return false
  }
  const z = hashToScalar(message)
  const w = modInverse(s, CURVE_N)
  const u1 = mod(z * w, CURVE_N)
  const u2 = mod(r * w, CURVE_N)
  const point = G.multiply(u1).add(publicKey.multiply(u2))
  return mod(point.x, CURVE_N) === r
}

/**
 * Recover the private key from two signatures that reused the nonce (same r).
 * Throws if the two signatures do not actually share a nonce.
 */
export function recoverPrivateKey(sig1: EcdsaSignature, sig2: EcdsaSignature): RecoveryResult {
  if (sig1.r !== sig2.r) {
    throw new Error('Signatures do not share a nonce (r differs) — recovery requires nonce reuse.')
  }
  const sDiff = mod(sig1.s - sig2.s, CURVE_N)
  if (sDiff === 0n) {
    throw new Error('Signatures are identical (s1 = s2); the two messages must differ.')
  }
  const k = mod(mod(sig1.z - sig2.z, CURVE_N) * modInverse(sDiff, CURVE_N), CURVE_N)
  const d = mod(mod(sig1.s * k - sig1.z, CURVE_N) * modInverse(sig1.r, CURVE_N), CURVE_N)
  return { k, d }
}

/**
 * Produce the malleable twin of a signature: (r, s) and (r, n−s) both verify.
 * This is why systems that treat the raw signature bytes as a unique id
 * (e.g. transaction hashes) were vulnerable to transaction malleability.
 */
export function malleateSignature(
  signature: Pick<EcdsaSignature, 'r' | 's'>,
): { r: bigint; s: bigint } {
  return { r: signature.r, s: mod(CURVE_N - signature.s, CURVE_N) }
}

export interface AttackStep {
  index: number
  label: string
  detail: string
  value?: string
  isMilestone?: boolean
}

export interface NonceReuseAttackResult {
  signature1: EcdsaSignature
  signature2: EcdsaSignature
  recovered: RecoveryResult
  /** Whether the recovered private key matches the signer's true key. */
  keyRecovered: boolean
  steps: AttackStep[]
}

/**
 * Run the full lab: sign two distinct messages with the same reused nonce,
 * then recover the private key and confirm it matches — returning a
 * step-by-step trace suitable for the visualizer.
 */
export function runNonceReuseAttack(
  privateKey: bigint,
  reusedNonce: bigint,
  message1: string,
  message2: string,
): NonceReuseAttackResult {
  const d = mod(privateKey, CURVE_N)
  const sig1 = signWithNonce(message1, d, reusedNonce)
  const sig2 = signWithNonce(message2, d, reusedNonce)
  const recovered = recoverPrivateKey(sig1, sig2)
  const keyRecovered = recovered.d === d

  const steps: AttackStep[] = [
    {
      index: 0,
      label: 'Two signatures, one nonce',
      detail:
        'The victim signs two different messages but (fatally) reuses the same nonce k. Both signatures therefore share the same r — the public tell-tale of nonce reuse.',
      value: `r = ${toHex(sig1.r)}`,
      isMilestone: true,
    },
    {
      index: 1,
      label: 'Message hashes z1, z2',
      detail: 'ECDSA signs the hash of each message, not the message itself.',
      value: `z1 = ${toHex(sig1.z)}\nz2 = ${toHex(sig2.z)}`,
    },
    {
      index: 2,
      label: 'Recover the nonce k',
      detail: 'k = (z1 − z2) · (s1 − s2)⁻¹  (mod n)',
      value: `k = ${toHex(recovered.k)}`,
      isMilestone: true,
    },
    {
      index: 3,
      label: 'Recover the private key d',
      detail: 'd = (s1·k − z1) · r⁻¹  (mod n)',
      value: `d = ${toHex(recovered.d)}`,
      isMilestone: true,
    },
    {
      index: 4,
      label: keyRecovered ? 'Private key fully compromised' : 'Recovery mismatch',
      detail: keyRecovered
        ? "The recovered d matches the signer's real private key exactly. Every past and future signature is now forgeable. This is why nonces must be unique — use RFC 6979 (deterministic) or a CSPRNG, never a fixed or repeated value."
        : 'The recovered key did not match — check the inputs.',
      isMilestone: true,
    },
  ]

  return { signature1: sig1, signature2: sig2, recovered, keyRecovered, steps }
}
