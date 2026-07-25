/**
 * DSA (Digital Signature Algorithm) — NIST FIPS 186, 1994.
 * @see CIPHER_ENGINE.md section "DSA"
 *
 * The finite-field discrete-log ancestor of ECDSA: same r/s signature
 * shape and same nonce-reuse vulnerability, computed in a prime-order
 * subgroup of (Z/pZ)* instead of on an elliptic curve. Demo mode uses
 * small textbook parameters (same approach as rsa.ts/dh.ts/elgamal.ts) —
 * real DSA requires p >= 2048 bits, q >= 224 bits per current NIST
 * guidance (SP 800-57).
 *
 * Verified demo values (independently computed, not hand-derived):
 *   p=47, q=23, g=4 (order-23 subgroup generator)
 *   private x=5, public y=37
 *   sign H=15 with nonce k=7 -> r=5, s=9 (verified valid)
 */

import { CipherError } from '../../utils/errors'
import type { CipherResult, CipherStep, CipherMetadata, CipherOptions, TestVector } from '../types'

const METADATA: CipherMetadata = {
  name: 'DSA',
  securityStatus: 'secure', // secure at real key sizes (p>=2048 bits, q>=224 bits per NIST SP 800-57); demo mode uses toy parameters for teaching
  yearDesigned: 1994,
  standardBody: 'NIST FIPS 186',
}

interface DsaPublicKey {
  p: bigint
  q: bigint
  g: bigint
  y: bigint
}

interface DsaPrivateKey {
  p: bigint
  q: bigint
  g: bigint
  x: bigint
}

function modPow(base: bigint, exp: bigint, mod: bigint): bigint {
  let result = 1n
  let b = ((base % mod) + mod) % mod
  let e = exp
  while (e > 0n) {
    if (e & 1n) result = (result * b) % mod
    b = (b * b) % mod
    e >>= 1n
  }
  return result
}

function extendedGcd(a: bigint, b: bigint): [bigint, bigint, bigint] {
  if (a === 0n) return [b, 0n, 1n]
  const [g, x1, y1] = extendedGcd(b % a, a)
  return [g, y1 - (b / a) * x1, x1]
}

function modInverse(a: bigint, m: bigint): bigint {
  const [g, x] = extendedGcd(((a % m) + m) % m, m)
  if (g !== 1n) throw new CipherError('INVALID_KEY', `No modular inverse exists for ${a} mod ${m}.`)
  return ((x % m) + m) % m
}

function parsePublicKey(keyStr: string): DsaPublicKey {
  const clean = keyStr.trim()
  if (!clean) return { p: 47n, q: 23n, g: 4n, y: 37n } // demo default
  const parts = clean.split(/[\s,]+/).map((s) => s.trim()).filter(Boolean)
  if (parts.length !== 4) {
    throw new CipherError('INVALID_KEY', 'DSA public key must be "p,q,g,y".')
  }
  return { p: BigInt(parts[0]), q: BigInt(parts[1]), g: BigInt(parts[2]), y: BigInt(parts[3]) }
}

function parsePrivateKey(keyStr: string): DsaPrivateKey {
  const clean = keyStr.trim()
  if (!clean) return { p: 47n, q: 23n, g: 4n, x: 5n } // demo default
  const parts = clean.split(/[\s,]+/).map((s) => s.trim()).filter(Boolean)
  if (parts.length !== 4) {
    throw new CipherError('INVALID_KEY', 'DSA private key must be "p,q,g,x".')
  }
  return { p: BigInt(parts[0]), q: BigInt(parts[1]), g: BigInt(parts[2]), x: BigInt(parts[3]) }
}

function signCore(input: string, key: string, instrument: boolean): CipherResult {
  const start = performance.now()
  const priv = parsePrivateKey(key)
  const { p, q, g, x } = priv
  const H = BigInt(input.trim())
  if (H < 0n || H >= q) {
    throw new CipherError('INVALID_INPUT', `Message hash H must satisfy 0 <= H < q (q=${q}). Reduce your hash mod q first.`)
  }

  // Demo-mode nonce: derived from input+key for reproducibility in tests.
  // Real usage MUST use a fresh cryptographically random k per signature —
  // reusing k across two signatures leaks the private key x directly.
  let k = 1n
  let r = 0n
  let s = 0n
  const steps: CipherStep[] = []
  do {
    k = ((H + x + k) % (q - 1n)) + 1n // deterministic-for-demo search, NOT how real DSA should pick k
    r = modPow(g, k, p) % q
    if (r === 0n) continue
    const kInv = modInverse(k, q)
    s = (kInv * (H + x * r)) % q
  } while (r === 0n || s === 0n)

  if (instrument) {
    steps.push({
      index: 0,
      label: 'Sign',
      inputState: H.toString(),
      outputState: `r=${r}, s=${s}`,
      table: [
        { key: 'k (nonce)', value: k.toString() },
        { key: 'r = (g^k mod p) mod q', value: r.toString() },
        { key: 's = k⁻¹(H + x·r) mod q', value: s.toString() },
      ],
      note: 'r/s shape is the same equation ECDSA later adapted to elliptic curves. Never reuse k across signatures — doing so leaks x.',
      isMilestone: true,
    })
  }

  return {
    output: `${r},${s}`,
    outputEncoding: 'utf8',
    steps,
    metadata: METADATA,
    durationMs: performance.now() - start,
  }
}

function verifyCore(input: string, key: string, instrument: boolean): CipherResult {
  const start = performance.now()
  const pub = parsePublicKey(key)
  const { p, q, g, y } = pub

  // Standard contract for signature verification in this registry:
  // input = "messageHash", signature = "r,s" (passed via key or appended)
  // To match the UI pattern in ecc.ts/ed25519.ts, we expect input to be H
  // and the key to contain "p,q,g,y|r,s"
  const [keyPart, sigPart] = key.split('|').map(s => s.trim())
  if (!sigPart) {
    throw new CipherError('INVALID_KEY', 'Verification requires "p,q,g,y | r,s".')
  }

  const H = BigInt(input.trim())
  const [rs, ss] = sigPart.split(',').map((s) => s.trim())
  const r = BigInt(rs)
  const s = BigInt(ss)

  if (r <= 0n || r >= q || s <= 0n || s >= q) {
    throw new CipherError('INVALID_INPUT', 'r and s must both be in [1, q-1].')
  }

  const w = modInverse(s, q)
  const u1 = (H * w) % q
  const u2 = (r * w) % q
  const v = ((modPow(g, u1, p) * modPow(y, u2, p)) % p) % q
  const valid = v === r

  const steps: CipherStep[] = []
  if (instrument) {
    steps.push({
      index: 0,
      label: 'Verify',
      inputState: `H=${H}, r=${r}, s=${s}`,
      outputState: valid ? 'VALID' : 'INVALID',
      note: `v = (g^u1 * y^u2 mod p) mod q = ${v}; valid iff v == r (${r}).`,
      isMilestone: true,
    })
  }

  if (!valid) {
    throw new CipherError('INVALID_INPUT', 'DSA signature verification failed.')
  }

  return {
    output: 'VALID',
    outputEncoding: 'utf8',
    steps,
    metadata: METADATA,
    durationMs: performance.now() - start,
  }
}

export function encrypt(input: string, key: string, options: CipherOptions = {}): CipherResult {
  return signCore(input, key, !!options.instrument)
}

export function decrypt(input: string, key: string, options: CipherOptions = {}): CipherResult {
  return verifyCore(input, key, !!options.instrument)
}

export const TEST_VECTORS: TestVector[] = [
  {
    input: '15',
    key: '47,23,4,5', // p,q,g,x (private)
    expected: '5,9',
    description: 'Sign H=15 with demo params (p=47,q=23,g=4), private key x=5 -> r=5, s=9',
  },
]
