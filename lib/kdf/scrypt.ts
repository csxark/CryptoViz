import { scrypt as nobleScrypt } from '@noble/hashes/scrypt.js'
import { toByteArray, fromByteArray } from '../utils/encoding'

export interface ScryptParams {
  N: number // CPU/Memory cost (power of 2, e.g. 16384)
  r: number // Block size (typically 8)
  p: number // Parallelization (typically 1)
  dkLen: number // Derived key length in bytes
  salt?: string // Hex string
}

export interface ScryptResult {
  derivedKeyHex: string
  saltHex: string
  params: ScryptParams
}

export interface ScryptStageStep {
  label: string
  detail: string
}

// Limits to prevent freezing the worker/browser
export const SCRYPT_LIMITS = {
  minN: 1024,
  maxN: 65536,
  minR: 1,
  maxR: 32,
  minP: 1,
  maxP: 8,
}

// Recommendation limits for OWASP/Standard secure storage guidance
export const OWASP_RECOMMENDATIONS = {
  N: 16384,
  r: 8,
  p: 1,
}

export function isPowerOfTwo(n: number): boolean {
  return n > 0 && (n & (n - 1)) === 0
}

export function calculateScryptMemory(N: number, r: number, p: number): number {
  // Scrypt memory requirement = 128 * r * N * p bytes
  return (128 * r * N * p) / (1024 * 1024) // in MB
}

export function validateScryptParams(params: ScryptParams): void {
  const { N, r, p, dkLen, salt } = params

  if (!isPowerOfTwo(N)) {
    throw new Error('Cost parameter N must be a power of two (e.g., 1024, 2048, 4096, 8192, 16384).')
  }

  if (N < SCRYPT_LIMITS.minN || N > SCRYPT_LIMITS.maxN) {
    throw new Error(`Cost parameter N must be between ${SCRYPT_LIMITS.minN} and ${SCRYPT_LIMITS.maxN.toLocaleString()} for visualization.`)
  }

  if (r < SCRYPT_LIMITS.minR || r > SCRYPT_LIMITS.maxR) {
    throw new Error(`Block size r must be between ${SCRYPT_LIMITS.minR} and ${SCRYPT_LIMITS.maxR}.`)
  }

  if (p < SCRYPT_LIMITS.minP || p > SCRYPT_LIMITS.maxP) {
    throw new Error(`Parallelization parameter p must be between ${SCRYPT_LIMITS.minP} and ${SCRYPT_LIMITS.maxP}.`)
  }

  if (![16, 24, 32].includes(dkLen)) {
    throw new Error('Derived key length must be 16, 24, or 32 bytes (suitable for AES key sizes).')
  }

  if (salt) {
    if (!/^[0-9a-fA-F]+$/.test(salt)) {
      throw new Error('Salt must be a valid hexadecimal string.')
    }
    if (salt.length % 2 !== 0) {
      throw new Error('Salt must have an even number of hex characters.')
    }
  }
}

export async function deriveScryptKey(
  password: string,
  params: ScryptParams
): Promise<ScryptResult> {
  validateScryptParams(params)

  const passwordBytes = new TextEncoder().encode(password)
  const saltBytes = params.salt
    ? toByteArray(params.salt, 'hex')
    : crypto.getRandomValues(new Uint8Array(16))

  // Run nobleScrypt synchronously (designed to execute inside a Web Worker)
  const derivedKeyBytes = nobleScrypt(passwordBytes, saltBytes, {
    N: params.N,
    r: params.r,
    p: params.p,
    dkLen: params.dkLen,
  })

  return {
    derivedKeyHex: fromByteArray(derivedKeyBytes, 'hex'),
    saltHex: fromByteArray(saltBytes, 'hex'),
    params: {
      N: params.N,
      r: params.r,
      p: params.p,
      dkLen: params.dkLen,
    },
  }
}

export function describeScryptStages(
  passwordLength: number,
  saltHex: string,
  N: number,
  r: number,
  p: number,
  dkLen: number
): ScryptStageStep[] {
  const steps: ScryptStageStep[] = []
  const memoryMB = calculateScryptMemory(N, r, p)

  steps.push({
    label: 'Parse Password & Salt Inputs',
    detail: `Password (${passwordLength} chars) and Salt (${saltHex.length / 2} bytes: "${saltHex.slice(0, 16)}...") are converted to byte streams. Salting prevents dictionary/rainbow table attacks.`,
  })

  steps.push({
    label: 'Allocate Memory Footprint',
    detail: `Scrypt allocates ${memoryMB.toFixed(2)} MB of memory. Formula: (128 * r * N * p) bytes. This deliberate memory usage is the core feature of Scrypt, preventing hardware brute forcing via customized FPGA/ASIC chips.`,
  })

  steps.push({
    label: 'Initial PBKDF2 Stretching',
    detail: `Stretches the password and salt using PBKDF2-HMAC-SHA256 into a large block array 'B' of size ${128 * r * p} bytes (derived from 128 * r * p).`,
  })

  steps.push({
    label: `ROMix Mixing Loop (N = ${N.toLocaleString()} iterations)`,
    detail: `Iterates ${N} times to compute Salsa20/8 core mix blocks. An array 'V' of size N is populated sequentially where V[i] = BlockMix(V[i-1]). Each blockmix consists of XORing arrays and applying a Salsa20 core rotation.`,
  })

  steps.push({
    label: 'Integerify Pseudo-Random Querying',
    detail: `Iterates N times: extracts a pseudo-random index 'j' by reading the last block state, then updates block array B = BlockMix(B ^ V[j]). Because index 'j' is data-dependent, memory lookups are randomized, defeating GPU cache optimization.`,
  })

  steps.push({
    label: 'Final PBKDF2 Processing',
    detail: `Passes the mixed block array B through PBKDF2-HMAC-SHA256 one final time to compute the cryptographically secure key of ${dkLen} bytes (${dkLen * 8} bits).`,
  })

  return steps
}
