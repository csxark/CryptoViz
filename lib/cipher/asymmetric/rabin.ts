/**
 * Rabin Cryptosystem — Michael O. Rabin, 1979.
 * @see CIPHER_ENGINE.md section "Rabin"
 *
 * The only asymmetric cipher in this registry with a PROVEN security
 * reduction to integer factoring (RSA's security is only conjectured to
 * require factoring — no such proof exists for RSA). Encryption is a
 * single modular squaring; decryption needs modular square roots, and
 * because squaring isn't injective mod a composite, decryption produces
 * FOUR candidate roots — a decryption ambiguity no other cipher here has.
 * Real-world use requires redundancy in the plaintext to disambiguate;
 * this module surfaces all four candidates instead of silently guessing.
 *
 * Requires p ≡ 3 (mod 4) and q ≡ 3 (mod 4) — this special form gives a
 * closed-form square-root formula (x^((p+1)/4) mod p) instead of needing
 * the general Tonelli-Shanks algorithm.
 *
 * Verified demo values (independently computed, not hand-derived):
 *   p=19, q=23 (both ≡ 3 mod 4) -> n=437
 *   Encrypt m=66 -> c=423
 *   Decrypt c=423 -> four roots: {66, 181, 256, 371} — 66 is the original m
 */

import { CipherError } from '../../utils/errors'
import type { CipherResult, CipherStep, CipherMetadata, CipherOptions, TestVector } from '../types'

const METADATA: CipherMetadata = {
  name: 'Rabin',
  securityStatus: 'secure', // security has a PROVEN reduction to factoring n, unlike RSA; demo mode uses toy primes for teaching
  yearDesigned: 1979,
  standardBody: 'Provably reducible to Integer Factorization',
}

function modPow(base: bigint, exp: bigint, mod: bigint): bigint {
  let result = 1n
  let b = base % mod
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

interface RabinPublicKey {
  n: bigint
}

interface RabinPrivateKey {
  p: bigint
  q: bigint
}

function requireCongruentTo3Mod4(prime: bigint, label: string): void {
  if (((prime % 4n) + 4n) % 4n !== 3n) {
    throw new CipherError('INVALID_KEY', `Rabin requires ${label} ≡ 3 (mod 4). Got ${label}=${prime}, which is ${prime % 4n} mod 4.`)
  }
}

function parsePublicKey(keyStr: string): RabinPublicKey {
  const clean = keyStr.trim()
  if (!clean) return { n: 437n } // demo default: p=19, q=23
  try {
    return { n: BigInt(clean) }
  } catch {
    throw new CipherError('INVALID_KEY', 'Rabin public key must be a single integer n.')
  }
}

function parsePrivateKey(keyStr: string): RabinPrivateKey {
  const clean = keyStr.trim()
  const parts = clean ? clean.split(/[\s,]+/).map((s) => s.trim()).filter(Boolean) : ['19', '23']
  if (parts.length !== 2) {
    throw new CipherError('INVALID_KEY', 'Rabin private key must be "p,q".')
  }
  const p = BigInt(parts[0])
  const q = BigInt(parts[1])
  requireCongruentTo3Mod4(p, 'p')
  requireCongruentTo3Mod4(q, 'q')
  return { p, q }
}

function rabinEncryptCore(input: string, key: string, instrument: boolean): CipherResult {
  const start = performance.now()
  const pub = parsePublicKey(key)
  const m = BigInt(input.trim())
  if (m < 0n || m >= pub.n) {
    throw new CipherError('INVALID_INPUT', `Plaintext must satisfy 0 <= m < n (n=${pub.n}).`)
  }

  const c = modPow(m, 2n, pub.n)
  const steps: CipherStep[] = []
  if (instrument) {
    steps.push({
      index: 0,
      label: 'Encrypt (modular squaring)',
      inputState: m.toString(),
      outputState: c.toString(),
      note: `c = m² mod n = ${m}² mod ${pub.n} = ${c}`,
      isMilestone: true,
    })
  }

  return {
    output: c.toString(),
    outputEncoding: 'utf8',
    steps,
    metadata: METADATA,
    durationMs: performance.now() - start,
  }
}

function rabinDecryptCore(input: string, key: string, instrument: boolean): CipherResult {
  const start = performance.now()
  const priv = parsePrivateKey(key)
  const { p, q } = priv
  const n = p * q
  const c = BigInt(input.trim())

  const mp = modPow(c, (p + 1n) / 4n, p)
  const mq = modPow(c, (q + 1n) / 4n, q)

  const [, yp, yq] = extendedGcd(p, q) // yp*p + yq*q = 1

  const norm = (x: bigint, m: bigint) => ((x % m) + m) % m
  const r1 = norm(yp * p * mq + yq * q * mp, n)
  const r2 = norm(n - r1, n)
  const r3 = norm(yp * p * mq - yq * q * mp, n)
  const r4 = norm(n - r3, n)
  const roots = Array.from(new Set([r1, r2, r3, r4].map((r) => r.toString())))

  const steps: CipherStep[] = []
  if (instrument) {
    steps.push({
      index: 0,
      label: 'Compute square roots mod p and mod q',
      inputState: c.toString(),
      outputState: `mp=${mp}, mq=${mq}`,
      note: `mp = c^((p+1)/4) mod p = ${mp}; mq = c^((q+1)/4) mod q = ${mq}`,
      isMilestone: true,
    })
    steps.push({
      index: 1,
      label: 'CRT-combine into four candidates',
      inputState: `mp=${mp}, mq=${mq}`,
      outputState: roots.join(', '),
      note: `Squaring mod a composite is 4-to-1, not injective — all four values square back to ${c} mod ${n}. Without redundancy in the plaintext, the decrypter cannot tell which one was the real message.`,
      isMilestone: true,
    })
  }

  return {
    output: roots.join(','),
    outputEncoding: 'utf8',
    steps,
    metadata: METADATA,
    durationMs: performance.now() - start,
  }
}

export function encrypt(input: string, key: string, options: CipherOptions = {}): CipherResult {
  return rabinEncryptCore(input, key, !!options.instrument)
}

export function decrypt(input: string, key: string, options: CipherOptions = {}): CipherResult {
  return rabinDecryptCore(input, key, !!options.instrument)
}

export const TEST_VECTORS: TestVector[] = [
  {
    input: '66',
    key: '437', // n = 19*23
    expected: '423',
    description: 'Encrypt m=66 with n=437 (p=19, q=23)',
  },
  {
    input: '423',
    key: '19,23', // p, q
    expected: '66,181,256,371',
    description: 'Decrypt c=423 back to the four candidate roots; 66 is the original plaintext',
  },
]
