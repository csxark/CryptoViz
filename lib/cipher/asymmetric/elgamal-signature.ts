/**
 * ElGamal Signature Scheme — Taher ElGamal, 1985.
 * @see CIPHER_ENGINE.md section "ElGamal Signature"
 *
 * Distinct from elgamal.ts (ElGamal ENCRYPTION) — same discrete-log
 * hardness assumption and same author/paper, different construction.
 * Historically the direct ancestor of DSA: DSA is essentially this
 * scheme with signatures computed in a smaller prime-order subgroup for
 * shorter signatures. Compare the r/s computation here against dsa.ts's
 * (mod p-1 here vs mod q there) to see the relationship directly.
 *
 * Verified demo values (independently computed, not hand-derived):
 *   p=467, g=2 (p is prime), private x=127, public y = g^x mod p = 132
 *   sign H=100 with k=213 (gcd(213,466)=1) -> r=29, s=51
 */

import { CipherError } from '../../utils/errors'
import type { CipherResult, CipherStep, CipherMetadata, CipherOptions, TestVector } from '../types'

const METADATA: CipherMetadata = {
  name: 'ElGamal Signature',
  securityStatus: 'secure',
  yearDesigned: 1985,
  standardBody: 'ElGamal 1985 paper; historical ancestor of NIST DSA (FIPS 186)',
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
  if (g !== 1n) throw new CipherError('INVALID_KEY', `No modular inverse exists for ${a} mod ${m} — k must be coprime to p-1.`)
  return ((x % m) + m) % m
}

interface PubKey { p: bigint; g: bigint; y: bigint }
interface PrivKey { p: bigint; g: bigint; x: bigint }

function parsePub(keyStr: string): PubKey {
  const clean = keyStr.trim()
  if (!clean) return { p: 467n, g: 2n, y: 132n }
  const [p, g, y] = clean.split(/[\s,]+/).map((s) => BigInt(s.trim()))
  return { p, g, y }
}
function parsePriv(keyStr: string): PrivKey {
  const clean = keyStr.trim()
  if (!clean) return { p: 467n, g: 2n, x: 127n }
  const [p, g, x] = clean.split(/[\s,]+/).map((s) => BigInt(s.trim()))
  return { p, g, x }
}

function signCore(input: string, key: string, instrument: boolean): CipherResult {
  const start = performance.now()
  const priv = parsePriv(key)
  const { p, g, x } = priv
  const pm1 = p - 1n
  const H = BigInt(input.trim())

  // Demo-mode fixed nonce for reproducibility. Real usage MUST use a
  // fresh cryptographically random k per signature, coprime to p-1 —
  // reuse leaks x, same failure mode as DSA/ECDSA nonce reuse.
  const k = 213n
  const [g1] = extendedGcd(k, pm1)
  if (g1 !== 1n) {
    throw new CipherError('INVALID_KEY', 'Nonce k is not coprime to p-1 — choose a different k.')
  }

  const r = modPow(g, k, p)
  const kInv = modInverse(k, pm1)
  const s = (((kInv * (((H - x * r) % pm1) + pm1)) % pm1) + pm1) % pm1

  const steps: CipherStep[] = []
  if (instrument) {
    steps.push({
      index: 0,
      label: 'Sign',
      inputState: H.toString(),
      outputState: `r=${r}, s=${s}`,
      table: [
        { key: 'k (nonce, must be coprime to p-1)', value: k.toString() },
        { key: 'r = g^k mod p', value: r.toString() },
        { key: 's = k⁻¹(H - x·r) mod (p-1)', value: s.toString() },
      ],
      note: 'Note the modulus split: r uses mod p, but k⁻¹ and s use mod (p-1) — mixing these up is the most common bug in this scheme.',
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
  const pub = parsePub(key)
  const { p, g, y } = pub

  const [Hs, rs, ss] = input.split(',').map((s) => s.trim())
  const H = BigInt(Hs)
  const r = BigInt(rs)
  const s = BigInt(ss)

  if (r <= 0n || r >= p) {
    throw new CipherError('INVALID_INPUT', 'r must satisfy 0 < r < p.')
  }

  const lhs = modPow(g, H, p)
  const rhs = (modPow(y, r, p) * modPow(r, s, p)) % p
  const valid = lhs === rhs

  const steps: CipherStep[] = []
  if (instrument) {
    steps.push({
      index: 0,
      label: 'Verify',
      inputState: `H=${H}, r=${r}, s=${s}`,
      outputState: valid ? 'VALID' : 'INVALID',
      note: `g^H mod p = ${lhs}; y^r · r^s mod p = ${rhs}. Valid iff equal.`,
      isMilestone: true,
    })
  }

  if (!valid) {
    throw new CipherError('INVALID_INPUT', 'VERIFICATION_FAILED: ElGamal signature verification failed.')
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
    input: '100',
    key: '467,2,127', // p,g,x (private)
    expected: '29,51',
    description: 'Sign H=100 with demo params (p=467,g=2), private x=127, fixed k=213 -> r=29, s=51',
  },
]
