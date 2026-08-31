/**
 * Goldwasser-Micali (GM) Cryptosystem — 1982.
 * First semantically-secure (IND-CPA) public-key scheme.
 * 
 * Based on the Quadratic Residuosity Problem.
 * Deliberately probabilistic: encrypting the same bit twice yields
 * different ciphertexts, demonstrating the core of semantic security.
 * 
 * NOTE: Encrypts bit-by-bit, resulting in massive ciphertext expansion.
 */
import type { CipherResult, CipherStep, CipherOptions, TestVector, CipherMetadata } from '../types'
import { CipherError, validateInput } from '../../utils'
import { cryptoRandomBytes } from '../../random/cryptoRandom'

const METADATA: CipherMetadata = {
  name: 'Goldwasser-Micali',
  securityStatus: 'secure',
  breakingComplexity: 'Relies on Quadratic Residuosity Problem. Foundational to IND-CPA/IND-CCA.',
  yearDesigned: 1982,
  standardBody: 'Goldwasser & Micali (STOC 1982)',
}

// Default demo parameters (p=11, q=23 -> n=253, x=7)
const DEFAULT_DEMO_P = 11n
const DEFAULT_DEMO_Q = 23n
const DEFAULT_DEMO_N = DEFAULT_DEMO_P * DEFAULT_DEMO_Q // 253n
const DEFAULT_DEMO_X = 7n // Jacobi(7, 253) = 1, non-residue mod 11 and 23

export interface GMPublicKey {
  n: bigint
  x: bigint
  r?: bigint // Optional fixed blinding factor for deterministic testing/vectors
}

export interface GMPrivateKey {
  p: bigint
  q: bigint
  n: bigint
  x?: bigint
}

function gcd(a: bigint, b: bigint): bigint {
  let x = a < 0n ? -a : a
  let y = b < 0n ? -b : b
  while (y !== 0n) {
    const t = y
    y = x % y
    x = t
  }
  return x
}

function modPow(base: bigint, exp: bigint, mod: bigint): bigint {
  let res = 1n
  let b = ((base % mod) + mod) % mod
  let e = exp
  while (e > 0n) {
    if (e % 2n === 1n) res = (res * b) % mod
    b = (b * b) % mod
    e /= 2n
  }
  return res
}

// Jacobi symbol (a|n) - efficiently computable without factorization
function jacobi(aInput: bigint, nInput: bigint): number {
  if (nInput <= 0n || nInput % 2n === 0n) return 0
  let a = ((aInput % nInput) + nInput) % nInput
  let n = nInput
  let t = 1
  while (a !== 0n) {
    while (a % 2n === 0n) {
      a /= 2n
      if (n % 8n === 3n || n % 8n === 5n) t = -t
    }
    ;[a, n] = [n, a]
    if (a % 4n === 3n && n % 4n === 3n) t = -t
    a = a % n
  }
  return n === 1n ? t : 0
}

// Check if x is a quadratic residue mod p (using Euler's criterion)
function isResidueModP(x: bigint, p: bigint): boolean {
  return modPow(x, (p - 1n) / 2n, p) === 1n
}

function getRandomGMRandomness(n: bigint): bigint {
  const numBits = n.toString(2).length
  const byteLen = Math.ceil(numBits / 8) + 1
  while (true) {
    const bytes = cryptoRandomBytes(byteLen)
    let r = 0n
    for (const b of bytes) {
      r = (r << 8n) | BigInt(b)
    }
    r = (r % (n - 1n)) + 1n
    if (gcd(r, n) === 1n) {
      return r
    }
  }
}

export function parsePublicKey(keyStr: string): GMPublicKey {
  const clean = keyStr.trim()
  if (!clean || clean === 'mock' || clean === 'mock_keys') {
    return { n: DEFAULT_DEMO_N, x: DEFAULT_DEMO_X }
  }

  let n: bigint | undefined
  let x: bigint | undefined
  let r: bigint | undefined

  if (clean.startsWith('{')) {
    try {
      const obj = JSON.parse(clean)
      if (obj.n !== undefined) n = BigInt(obj.n)
      if (obj.x !== undefined || obj.y !== undefined) x = BigInt(obj.x ?? obj.y)
      if (obj.r !== undefined) r = BigInt(obj.r)
    } catch {
      throw new CipherError('INVALID_KEY', 'Invalid JSON format for Goldwasser-Micali public key.')
    }
  } else if (clean.includes('=')) {
    const pairs = clean.split(/[,;\s]+/)
    for (const pair of pairs) {
      const [k, v] = pair.split('=').map((s) => s.trim())
      if (k === 'n' && v) n = BigInt(v)
      if ((k === 'x' || k === 'y') && v) x = BigInt(v)
      if (k === 'r' && v) r = BigInt(v)
    }
  } else {
    const parts = clean.split(/[\s,]+/).map((s) => s.trim()).filter(Boolean)
    if (parts.length >= 2) {
      try {
        n = BigInt(parts[0])
        x = BigInt(parts[1])
        if (parts.length >= 3) r = BigInt(parts[2])
      } catch {
        throw new CipherError('INVALID_KEY', 'Invalid Goldwasser-Micali public key format. Values must be valid integers.')
      }
    }
  }

  if (n === undefined || x === undefined) {
    throw new CipherError(
      'INVALID_KEY',
      'Goldwasser-Micali public key requires modulus n and parameter x (e.g. "n,x" or "n=253, x=7").'
    )
  }

  if (n <= 3n) {
    throw new CipherError('INVALID_KEY', 'Public modulus n must be an integer greater than 3.')
  }

  if (x <= 1n || x >= n || gcd(x, n) !== 1n) {
    throw new CipherError('INVALID_KEY', 'Parameter x must satisfy 1 < x < n and gcd(x, n) = 1.')
  }

  if (jacobi(x, n) !== 1) {
    throw new CipherError('INVALID_KEY', 'Parameter x must have Jacobi symbol Jacobi(x, n) = 1.')
  }

  return { n, x, r }
}

export function parsePrivateKey(keyStr: string): GMPrivateKey {
  const clean = keyStr.trim()
  if (!clean || clean === 'mock' || clean === 'mock_keys') {
    return { p: DEFAULT_DEMO_P, q: DEFAULT_DEMO_Q, n: DEFAULT_DEMO_N, x: DEFAULT_DEMO_X }
  }

  let p: bigint | undefined
  let q: bigint | undefined
  let n: bigint | undefined
  let x: bigint | undefined

  if (clean.startsWith('{')) {
    try {
      const obj = JSON.parse(clean)
      if (obj.p !== undefined) p = BigInt(obj.p)
      if (obj.q !== undefined) q = BigInt(obj.q)
      if (obj.n !== undefined) n = BigInt(obj.n)
      if (obj.x !== undefined || obj.y !== undefined) x = BigInt(obj.x ?? obj.y)
    } catch {
      throw new CipherError('INVALID_KEY', 'Invalid JSON format for Goldwasser-Micali private key.')
    }
  } else if (clean.includes('=')) {
    const pairs = clean.split(/[,;\s]+/)
    for (const pair of pairs) {
      const [k, v] = pair.split('=').map((s) => s.trim())
      if (k === 'p' && v) p = BigInt(v)
      if (k === 'q' && v) q = BigInt(v)
      if (k === 'n' && v) n = BigInt(v)
      if ((k === 'x' || k === 'y') && v) x = BigInt(v)
    }
  } else {
    const parts = clean.split(/[\s,]+/).map((s) => s.trim()).filter(Boolean)
    if (parts.length >= 2) {
      try {
        p = BigInt(parts[0])
        q = BigInt(parts[1])
        if (parts.length >= 3) x = BigInt(parts[2])
      } catch {
        throw new CipherError('INVALID_KEY', 'Invalid Goldwasser-Micali private key format. Values must be valid integers.')
      }
    }
  }

  if (p === undefined || q === undefined) {
    throw new CipherError(
      'INVALID_KEY',
      'Goldwasser-Micali private key requires prime factors p and q (e.g. "p,q" or "p=11, q=23").'
    )
  }

  if (p <= 1n || q <= 1n || p === q) {
    throw new CipherError('INVALID_KEY', 'Private factors p and q must be distinct integers > 1.')
  }

  const computedN = p * q
  if (n !== undefined && n !== computedN) {
    throw new CipherError('INVALID_KEY', `Public modulus n (${n}) does not equal p * q (${computedN}).`)
  }
  n = computedN

  if (x !== undefined) {
    if (x <= 1n || x >= n || gcd(x, n) !== 1n) {
      throw new CipherError('INVALID_KEY', 'Parameter x must satisfy 1 < x < n and gcd(x, n) = 1.')
    }
    if (isResidueModP(x, p) || isResidueModP(x, q)) {
      throw new CipherError('INVALID_KEY', 'Parameter x must be a quadratic non-residue modulo both p and q.')
    }
  }

  return { p, q, n, x }
}

function parseHex(s: string): number[] {
  const c = s.replace(/\s+/g, '').toLowerCase()
  if (!/^[0-9a-f]*$/.test(c) || c.length % 2 !== 0) throw new CipherError('INVALID_INPUT', `Input must be valid hex.`)
  const o: number[] = []
  for (let i = 0; i < c.length; i += 2) o.push(parseInt(c.slice(i, i + 2), 16))
  return o
}

function toHex(b: number[]): string {
  return b.map((x) => x.toString(16).padStart(2, '0')).join('')
}

function gmCore(input: string, key: string, doDecrypt: boolean, instrument: boolean): CipherResult {
  const start = performance.now()
  const steps: CipherStep[] = []

  let outHex = ''

  if (!doDecrypt) {
    // ENCRYPT: Bit-by-bit
    const pubKey = parsePublicKey(key)
    const inBytes = parseHex(input)
    const ciphertexts: bigint[] = []
    const hexChunkLen = Math.max(4, Math.ceil(pubKey.n.toString(16).length / 2) * 2)

    if (instrument) {
      steps.push({
        index: 0,
        label: 'GM Setup',
        inputState: `n=${pubKey.n}, x=${pubKey.x}`,
        outputState: 'Parameters loaded',
        note: 'x is a non-residue mod p and q, but Jacobi(x,n)=1.',
        isMilestone: true,
      })
    }

    for (let i = 0; i < inBytes.length; i++) {
      for (let b = 7; b >= 0; b--) {
        const bit = (inBytes[i] >> b) & 1
        const r = pubKey.r ?? getRandomGMRandomness(pubKey.n)

        // c = (r^2 * x^bit) mod n
        const r2 = modPow(r, 2n, pubKey.n)
        const xb = modPow(pubKey.x, BigInt(bit), pubKey.n)
        const c = (r2 * xb) % pubKey.n

        ciphertexts.push(c)
      }
    }

    outHex = ciphertexts.map((c) => c.toString(16).padStart(hexChunkLen, '0')).join('')

    if (instrument) {
      steps.push({
        index: 1,
        label: 'GM Encryption',
        inputState: input,
        outputState: outHex,
        note: 'Each bit encrypted independently to a full-modulus ciphertext. Probabilistic.',
        isMilestone: true,
      })
    }
  } else {
    // DECRYPT: Residuosity test using p
    const privKey = parsePrivateKey(key)
    const hexChunkLen = Math.max(4, Math.ceil(privKey.n.toString(16).length / 2) * 2)
    const ctChunks = input.replace(/\s+/g, '').match(new RegExp(`.{1,${hexChunkLen}}`, 'g')) || []

    if (ctChunks.length === 0) {
      throw new CipherError('INVALID_INPUT', 'Ciphertext is empty or invalid.')
    }

    if (instrument) {
      steps.push({
        index: 0,
        label: 'GM Setup',
        inputState: `p=${privKey.p}, q=${privKey.q}, n=${privKey.n}`,
        outputState: 'Parameters loaded',
        note: 'Decryption uses prime factors (p, q) to determine quadratic residuosity.',
        isMilestone: true,
      })
    }

    const bits: number[] = []

    for (const chunk of ctChunks) {
      if (!/^[0-9a-fA-F]+$/.test(chunk)) {
        throw new CipherError('INVALID_INPUT', `Invalid hex ciphertext chunk "${chunk}".`)
      }
      const c = BigInt('0x' + chunk)

      // Check if c is a quadratic residue mod p
      // If residue -> bit was 0. If non-residue -> bit was 1.
      const isRes = isResidueModP(c, privKey.p)
      bits.push(isRes ? 0 : 1)
    }

    const outBytes: number[] = []
    for (let i = 0; i < bits.length; i += 8) {
      let byte = 0
      for (let b = 0; b < 8; b++) {
        if (i + b < bits.length) {
          byte |= bits[i + b] << (7 - b)
        }
      }
      outBytes.push(byte)
    }

    outHex = toHex(outBytes)

    if (instrument) {
      steps.push({
        index: 1,
        label: 'GM Decryption',
        inputState: input,
        outputState: outHex,
        note: 'Uses factorization (p,q) to test quadratic residuosity efficiently.',
        isMilestone: true,
      })
    }
  }

  return { output: outHex, outputEncoding: 'hex', steps, metadata: METADATA, durationMs: performance.now() - start }
}

export function encrypt(input: string, key: string, options: CipherOptions = {}): CipherResult {
  validateInput(input)
  return gmCore(input, key, false, !!options.instrument)
}

export function decrypt(input: string, key: string, options: CipherOptions = {}): CipherResult {
  validateInput(input)
  return gmCore(input, key, true, !!options.instrument)
}

export const TEST_VECTORS: TestVector[] = [
  {
    input: '01',
    key: '253,7,5',
    expected: '001900190019001900190019001900af',
    description: 'GM bit-by-bit encryption of 0x01 with public key (n=253, x=7) and fixed r=5',
  },
  {
    input: '001900190019001900190019001900af',
    key: '11,23',
    expected: '01',
    description: 'GM bit-by-bit decryption with private key (p=11, q=23) back to 0x01',
  },
]
