/**
 * TEA (Tiny Encryption Algorithm) — Wheeler & Needham, 1994.
 * @see CIPHER_ENGINE.md Part 2 (Symmetric Ciphers) pattern
 *
 * The direct, simpler predecessor to the already-merged xtea.ts. Has a
 * KNOWN equivalent-key weakness: any of 4 related 128-bit keys produce
 * identical ciphertext for the same plaintext, because TEA's key
 * schedule doesn't mix all key bits into every round the way XTEA's
 * extra shifting does. Not "broken" in the MD4 sense (no practical full
 * key-recovery attack), but this weakness is real and documented — do
 * not present TEA as equally secure to XTEA.
 *
 * Round-trip verified in a sandbox before this file was written:
 *   key = [1,2,3,4] (as 32-bit words), pt = (0,0) -> ct = (0x68233b78, 0xdcdcee22)
 */

import type { CipherResult, CipherStep, CipherOptions, TestVector, CipherMetadata } from '../types'
import { CipherError, validateInput, validateKey } from '../../utils'

const METADATA: CipherMetadata = {
  name: 'TEA',
  keySize: 128,
  blockSize: 64,
  rounds: 32,
  securityStatus: 'legacy', // known equivalent-key weakness — see file header
  breakingComplexity: 'No full break, but a documented equivalent-key weakness: 4 related keys produce identical ciphertext for any plaintext',
  yearDesigned: 1994,
  standardBody: 'Wheeler & Needham, 1994 (Cambridge)',
}

const _MASK = 0xffffffff
const DELTA = 0x9e3779b9
const ROUNDS = 32

function parseHexBytes(str: string, label: string): Uint8Array {
  const clean = str.replace(/\s+/g, '').toLowerCase()
  if (!/^[0-9a-f]*$/.test(clean) || clean.length % 2 !== 0) {
    throw new CipherError('INVALID_INPUT', `${label} must be a hex string with an even number of digits.`)
  }
  const bytes = new Uint8Array(clean.length / 2)
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16)
  return bytes
}
function bytesToHex(b: Uint8Array): string {
  return Array.from(b).map((x) => x.toString(16).padStart(2, '0')).join('')
}
function bytesToWordBE(b: Uint8Array, off: number): number {
  return ((b[off] << 24) | (b[off + 1] << 16) | (b[off + 2] << 8) | b[off + 3]) >>> 0
}
function wordToBytesBE(w: number, out: Uint8Array, off: number): void {
  out[off] = (w >>> 24) & 0xff
  out[off + 1] = (w >>> 16) & 0xff
  out[off + 2] = (w >>> 8) & 0xff
  out[off + 3] = w & 0xff
}
function wordToHex(w: number): string {
  return (w >>> 0).toString(16).padStart(8, '0')
}

function parseKey(key: string): number[] {
  validateKey(key)
  const bytes = parseHexBytes(key, 'TEA key')
  if (bytes.length !== 16) {
    throw new CipherError('INVALID_KEY_LENGTH', `TEA requires a 128-bit key as 32 hex characters (got ${bytes.length} bytes).`)
  }
  return [0, 4, 8, 12].map((off) => bytesToWordBE(bytes, off))
}

function parseBlockInput(input: string): Uint8Array {
  const bytes = parseHexBytes(input, 'TEA input')
  if (bytes.length === 0 || bytes.length % 8 !== 0) {
    throw new CipherError('INVALID_INPUT', `TEA input must be a non-empty multiple of 8 bytes (64-bit blocks). Got ${bytes.length} bytes.`)
  }
  return bytes
}

function teaEncryptBlock(v0: number, v1: number, k: number[]): [number, number] {
  let sum = 0
  for (let i = 0; i < ROUNDS; i++) {
    sum = (sum + DELTA) >>> 0
    v0 = (v0 + ((((v1 << 4) >>> 0) + k[0]) ^ ((v1 + sum) >>> 0) ^ (((v1 >>> 5) >>> 0) + k[1]))) >>> 0
    v1 = (v1 + ((((v0 << 4) >>> 0) + k[2]) ^ ((v0 + sum) >>> 0) ^ (((v0 >>> 5) >>> 0) + k[3]))) >>> 0
  }
  return [v0, v1]
}
function teaDecryptBlock(v0: number, v1: number, k: number[]): [number, number] {
  let sum = (DELTA * ROUNDS) >>> 0
  for (let i = 0; i < ROUNDS; i++) {
    v1 = (v1 - ((((v0 << 4) >>> 0) + k[2]) ^ ((v0 + sum) >>> 0) ^ (((v0 >>> 5) >>> 0) + k[3]))) >>> 0
    v0 = (v0 - ((((v1 << 4) >>> 0) + k[0]) ^ ((v1 + sum) >>> 0) ^ (((v1 >>> 5) >>> 0) + k[1]))) >>> 0
    sum = (sum - DELTA) >>> 0
  }
  return [v0, v1]
}

function teaCore(input: string, key: string, decrypt: boolean, instrument: boolean): CipherResult {
  const start = performance.now()
  const k = parseKey(key)
  const bytes = parseBlockInput(input)
  const numBlocks = bytes.length / 8

  const steps: CipherStep[] = []
  const outBytes = new Uint8Array(bytes.length)
  for (let b = 0; b < numBlocks; b++) {
    const off = b * 8
    const v0 = bytesToWordBE(bytes, off)
    const v1 = bytesToWordBE(bytes, off + 4)
    const inHex = wordToHex(v0) + wordToHex(v1)

    const [ov0, ov1] = decrypt ? teaDecryptBlock(v0, v1, k) : teaEncryptBlock(v0, v1, k)
    wordToBytesBE(ov0, outBytes, off)
    wordToBytesBE(ov1, outBytes, off + 4)
    const outHex = wordToHex(ov0) + wordToHex(ov1)

    if (instrument) {
      steps.push({
        index: steps.length,
        label: `Block ${b + 1}/${numBlocks} — 32 rounds`,
        inputState: inHex,
        outputState: outHex,
        note: `${decrypt ? 'Decrypted' : 'Encrypted'} via 32 rounds of golden-ratio sum accumulation + ARX mixing. '${inHex}' -> '${outHex}'`,
        isMilestone: true,
      })
    }
  }

  return {
    output: bytesToHex(outBytes),
    outputEncoding: 'hex',
    steps,
    metadata: METADATA,
    durationMs: performance.now() - start,
  }
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
  return teaCore(input, key, false, !!options.instrument)
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
  return teaCore(input, key, true, !!options.instrument)
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
    input: '0000000000000000',
    key: '00000001000000020000000300000004',
    expected: '68233b78dcdcee22',
    description: 'Self-computed reference vector (round-trip verified in sandbox before writing this file)',
  },
]
