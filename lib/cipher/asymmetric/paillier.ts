/**
 * Paillier Cryptosystem — Pascal Paillier, 1999.
 * @see CIPHER_ENGINE.md section "Paillier"
 *
 * Partially homomorphic: multiplying two ciphertexts mod n² and decrypting
 * the product yields the SUM of the two original plaintexts mod n, without
 * either plaintext ever being exposed. No other asymmetric cipher in this
 * registry (RSA, DH, ElGamal, ECC, Ed25519, X25519) has any algebraic
 * relationship between ciphertext operations and plaintext operations —
 * this is the standard first example of homomorphic encryption taught in
 * any cryptography course, and underlies real private-tally / private-sum
 * demos.
 *
 * Demo mode uses small textbook primes (same approach as rsa.ts / dh.ts /
 * elgamal.ts) so the full modular arithmetic is visible and reproducible.
 *
 * Verified demo values (independently computed, not hand-derived):
 *   p=13, q=17 -> n=221, n²=48841, λ=48, g=222, μ=198
 *   Encrypt m=15 with fixed r=7  -> c=4613  (decrypts back to 15)
 *   Encrypt m=8  with fixed r=11 -> c=30947
 *   Homomorphic sum: (4613 * 30947) mod 48841 = 45109 -> decrypts to 23 (= 15+8) ✓
 */

import { CipherError } from '../../utils/errors'
import { modInverse } from './rsa'
import type { CipherResult, CipherStep, CipherMetadata, CipherOptions, TestVector } from '../types'

const METADATA: CipherMetadata = {
  name: 'Paillier',
  securityStatus: 'secure', // secure at real key sizes (security reduces to the Decisional Composite Residuosity assumption); demo mode uses toy primes for teaching, same caveat as rsa.ts/elgamal.ts
  yearDesigned: 1999,
  standardBody: 'Decisional Composite Residuosity Assumption (DCRA)',
}

interface PaillierPublicKey {
  n: bigint
  g: bigint
  r?: bigint // optional fixed random factor, demo/testing only
}

interface PaillierPrivateKey {
  n: bigint
  lambda: bigint
  mu: bigint
}

function gcd(a: bigint, b: bigint): bigint {
  while (b) {
    ;[a, b] = [b, a % b]
  }
  return a
}

function lcm(a: bigint, b: bigint): bigint {
  return (a * b) / gcd(a, b)
}

function parsePublicKey(keyStr: string): PaillierPublicKey {
  const clean = keyStr.trim()
  if (!clean) {
    // Demo default: p=13, q=17 -> n=221
    return { n: 221n, g: 222n }
  }
  const parts = clean.split(/[\s,]+/).map((s) => s.trim()).filter(Boolean)
  if (parts.length < 2) {
    throw new CipherError('INVALID_KEY', 'Paillier public key must be "n,g" (optionally "n,g,r" to fix the random factor for reproducible output).')
  }
  try {
    const n = BigInt(parts[0])
    const g = BigInt(parts[1])
    const r = parts.length >= 3 ? BigInt(parts[2]) : undefined
    if (n <= 3n) throw new CipherError('INVALID_KEY', 'Modulus n must be greater than 3.')
    return { n, g, r }
  } catch (err) {
    if (err instanceof CipherError) throw err
    throw new CipherError('INVALID_KEY', 'Invalid Paillier public key format.')
  }
}

function parsePrivateKey(keyStr: string): PaillierPrivateKey {
  const clean = keyStr.trim()
  if (!clean) {
    // Demo default matching the public-key default above: p=13, q=17
    return { n: 221n, lambda: 48n, mu: 198n }
  }
  const parts = clean.split(/[\s,]+/).map((s) => s.trim()).filter(Boolean)
  if (parts.length === 2) {
    // "p,q" form — derive n, lambda, mu, g=n+1
    const p = BigInt(parts[0])
    const q = BigInt(parts[1])
    const n = p * q
    const lambda = lcm(p - 1n, q - 1n)
    const mu = modInverse(lambda, n)
    return { n, lambda, mu }
  }
  if (parts.length >= 3) {
    return { n: BigInt(parts[0]), lambda: BigInt(parts[1]), mu: BigInt(parts[2]) }
  }
  throw new CipherError('INVALID_KEY', 'Paillier private key must be "p,q" or "n,lambda,mu".')
}

function L(x: bigint, n: bigint): bigint {
  return (x - 1n) / n
}

function paillierEncryptCore(input: string, key: string, instrument: boolean): CipherResult {
  const start = performance.now()
  const pub = parsePublicKey(key)
  const n2 = pub.n * pub.n
  const m = BigInt(input.trim())
  if (m < 0n || m >= pub.n) {
    throw new CipherError('INVALID_INPUT', `Plaintext must satisfy 0 <= m < n (n=${pub.n}).`)
  }

  // Random r coprime to n. Demo mode allows a fixed r via the key string for
  // reproducible test vectors; real usage should always pick fresh randomness.
  let r = pub.r
  if (r === undefined) {
    do {
      r = BigInt(Math.floor(Math.random() * Number(pub.n - 1n)) + 1)
    } while (gcd(r, pub.n) !== 1n)
  }

  const steps: CipherStep[] = []
  const c = (modPow(pub.g, m, n2) * modPow(r, pub.n, n2)) % n2

  if (instrument) {
    steps.push({
      index: 0,
      label: 'Encrypt',
      inputState: m.toString(),
      outputState: c.toString(),
      table: [
        { key: 'n', value: pub.n.toString() },
        { key: 'g', value: pub.g.toString() },
        { key: 'r', value: r.toString() },
      ],
      note: `c = g^m * r^n mod n² = ${pub.g}^${m} * ${r}^${pub.n} mod ${n2} = ${c}`,
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

function paillierDecryptCore(input: string, key: string, instrument: boolean): CipherResult {
  const start = performance.now()
  const priv = parsePrivateKey(key)
  const n2 = priv.n * priv.n
  const c = BigInt(input.trim())

  const steps: CipherStep[] = []
  const u = modPow(c, priv.lambda, n2)
  const m = (L(u, priv.n) * priv.mu) % priv.n

  if (instrument) {
    steps.push({
      index: 0,
      label: 'Decrypt',
      inputState: c.toString(),
      outputState: m.toString(),
      note: `u = c^λ mod n² = ${u}; m = L(u) * μ mod n = ${m}`,
      isMilestone: true,
    })
  }

  return {
    output: m.toString(),
    outputEncoding: 'utf8',
    steps,
    metadata: METADATA,
    durationMs: performance.now() - start,
  }
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

export function encrypt(input: string, key: string, options: CipherOptions = {}): CipherResult {
  return paillierEncryptCore(input, key, !!options.instrument)
}

export function decrypt(input: string, key: string, options: CipherOptions = {}): CipherResult {
  return paillierDecryptCore(input, key, !!options.instrument)
}

/**
 * Not part of the standard encrypt/decrypt contract — demonstrates the
 * homomorphic-addition property directly. Exported for the test file and
 * optionally for a dedicated UI panel if the maintainers want one later.
 */
export function homomorphicAdd(c1: string, c2: string, publicKeyStr: string): string {
  const pub = parsePublicKey(publicKeyStr)
  const n2 = pub.n * pub.n
  const sum = (BigInt(c1) * BigInt(c2)) % n2
  return sum.toString()
}

export const TEST_VECTORS: TestVector[] = [
  {
    input: '15',
    key: '221,222,7', // n, g, fixed r=7
    expected: '4613',
    description: 'Encrypt m=15 with n=221 (p=13,q=17), g=222, fixed r=7',
  },
  {
    input: '4613',
    key: '221,48,198', // n, lambda, mu
    expected: '15',
    description: 'Decrypt c=4613 back to m=15 with private key (n=221, λ=48, μ=198)',
  },
]
