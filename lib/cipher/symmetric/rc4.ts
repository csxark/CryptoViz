/**
 * RC4 — byte-oriented stream cipher (Rivest Cipher 4, 1987).
 * @see CIPHER_ENGINE.md section "RC4"
 *
 * Two phases:
 *  1. KSA (Key-Scheduling Algorithm): scrambles a 256-byte identity permutation
 *     using the secret key, cycling the key bytes as needed.
 *  2. PRGA (Pseudo-Random Generation Algorithm): walks the scrambled permutation
 *     one step per output byte, emitting a keystream byte each step.
 * The keystream is XORed with the input. XOR is self-inverse, so running the same
 * KSA + PRGA + XOR on ciphertext with the same key recovers the plaintext — encrypt
 * and decrypt share one core routine.
 *
 * RC4 has no authentication and no IV — key reuse across messages leaks keystream
 * bytes when the two ciphertexts are XORed together. Out of scope for this teaching
 * module, but called out in the instrumented notes.
 */

import { CipherError, validateInput, validateKey } from '../../utils/errors'
import { toByteArray, fromByteArray } from '../../utils/encoding'
import type { CipherResult, CipherStep, CipherMetadata, CipherOptions, TestVector } from '../types'

const METADATA: CipherMetadata = {
  name: 'RC4',
  securityStatus: 'broken',
  breakingComplexity:
    'Statistical biases in early keystream bytes (Fluhrer-Mantin-Shamir, Klein attacks); banned in TLS by RFC 7465 (2015).',
  yearDesigned: 1987,
  standardBody: 'Never formally standardized; de facto standard via widespread deployment (SSL/TLS, WEP, WPA-TKIP)',
}

const MAX_TRACED_BYTES = 48 // classical-style summary budget for the byte-by-byte PRGA trace

interface KsaResult {
  finalState: Uint8Array
  swapTable: { key: string; value: string }[]
}

function ksa(keyBytes: Uint8Array): KsaResult {
  const S = new Uint8Array(256)
  for (let i = 0; i < 256; i++) S[i] = i
  let j = 0
  const swaps: { key: string; value: string }[] = []
  for (let i = 0; i < 256; i++) {
    j = (j + S[i] + keyBytes[i % keyBytes.length]) % 256
    const tmp = S[i]
    S[i] = S[j]
    S[j] = tmp
    if (i < 8) {
      swaps.push({ key: `swap S[${i}] <-> S[${j}]`, value: `S[${i}]=${S[i]}, S[${j}]=${S[j]}` })
    }
  }
  return { finalState: S, swapTable: swaps }
}

function prga(S: Uint8Array, length: number): Uint8Array {
  const state = S.slice()
  let i = 0
  let j = 0
  const keystream = new Uint8Array(length)
  for (let n = 0; n < length; n++) {
    i = (i + 1) % 256
    j = (j + state[i]) % 256
    const tmp = state[i]
    state[i] = state[j]
    state[j] = tmp
    keystream[n] = state[(state[i] + state[j]) % 256]
  }
  return keystream
}

function rc4Core(dataBytes: Uint8Array, keyBytes: Uint8Array, instrument: boolean): { output: Uint8Array; steps: CipherStep[] } {
  const steps: CipherStep[] = []
  const { finalState, swapTable } = ksa(keyBytes)

  if (instrument) {
    steps.push({
      index: 0,
      label: 'Key-Scheduling Algorithm (KSA) complete',
      inputState: fromByteArray(keyBytes, 'hex'),
      outputState: '',
      table: swapTable,
      note: `Scrambled the 256-byte identity permutation using the ${keyBytes.length}-byte key (cycling key bytes as needed). Showing the first 8 of 256 swap steps.`,
      isMilestone: true,
    })
  }

  const keystream = prga(finalState, dataBytes.length)
  const output = new Uint8Array(dataBytes.length)
  for (let n = 0; n < dataBytes.length; n++) output[n] = dataBytes[n] ^ keystream[n]

  if (instrument) {
    const traceLimit = Math.min(dataBytes.length, MAX_TRACED_BYTES)
    for (let n = 0; n < traceLimit; n++) {
      steps.push({
        index: steps.length,
        label: `PRGA byte ${n + 1}/${dataBytes.length}`,
        inputState: dataBytes[n].toString(16).padStart(2, '0'),
        outputState: output[n].toString(16).padStart(2, '0'),
        highlight: [n],
        note: `keystream byte = 0x${keystream[n].toString(16).padStart(2, '0')}; output = input XOR keystream = 0x${output[n].toString(16).padStart(2, '0')}`,
      })
    }
    if (dataBytes.length > MAX_TRACED_BYTES) {
      steps.push({
        index: steps.length,
        label: `Remaining ${dataBytes.length - MAX_TRACED_BYTES} bytes (summarized)`,
        inputState: '',
        outputState: '',
        note: 'PRGA continues identically for the rest of the stream — omitted from the trace to stay within the step budget.',
        isMilestone: true,
      })
    }
  }

  return { output, steps }
}

function parseKey(key: string): Uint8Array {
  validateKey(key)
  const keyBytes = new TextEncoder().encode(key)
  if (keyBytes.length > 256) {
    throw new CipherError('INVALID_KEY', `RC4 key must be at most 256 bytes (got ${keyBytes.length}).`)
  }
  return keyBytes
}

/**
 * Encrypt cipher-engine utility export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @param input Input required by the Encrypt operation.
 * @param key Input required by the Encrypt operation.
 * @param options Input required by the Encrypt operation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/46-3/final — FIPS 46-3.
 */
export function encrypt(input: string, key: string, options: CipherOptions = {}): CipherResult {
  validateInput(input)
  const start = performance.now()
  const keyBytes = parseKey(key)
  const dataBytes = toByteArray(input, options.encoding || 'utf8')
  const { output, steps } = rc4Core(dataBytes, keyBytes, !!options.instrument)
  return {
    output: fromByteArray(output, 'hex'),
    outputEncoding: 'hex',
    steps,
    metadata: { ...METADATA, keySize: keyBytes.length * 8 },
    durationMs: performance.now() - start,
  }
}

/**
 * Decrypt cipher-engine utility export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @param input Input required by the Decrypt operation.
 * @param key Input required by the Decrypt operation.
 * @param options Input required by the Decrypt operation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/46-3/final — FIPS 46-3.
 */
export function decrypt(input: string, key: string, options: CipherOptions = {}): CipherResult {
  validateInput(input)
  const start = performance.now()
  const keyBytes = parseKey(key)
  let dataBytes: Uint8Array
  try {
    dataBytes = toByteArray(input, 'hex')
  } catch {
    throw new CipherError('INVALID_INPUT', 'RC4 ciphertext input must be a valid hex string.')
  }
  const { output, steps } = rc4Core(dataBytes, keyBytes, !!options.instrument)

  let outputStr: string
  try {
    outputStr = new TextDecoder('utf-8', { fatal: true }).decode(output)
  } catch {
    outputStr = fromByteArray(output, 'hex')
  }

  return {
    output: outputStr,
    outputEncoding: 'utf8',
    steps,
    metadata: { ...METADATA, keySize: keyBytes.length * 8 },
    durationMs: performance.now() - start,
  }
}

/**
 * TEST VECTORS cipher-engine utility export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/46-3/final — FIPS 46-3.
 */
export const TEST_VECTORS: TestVector[] = [
  {
    input: 'Plaintext',
    key: 'Key',
    expected: 'bbf316e8d940af0ad3',
    description: 'Classic RC4 textbook vector — key="Key", plaintext="Plaintext"',
  },
  {
    input: 'pedia',
    key: 'Wiki',
    expected: '1021bf0420',
    description: 'Well-known RC4 vector — key="Wiki", plaintext="pedia"',
  },
]
