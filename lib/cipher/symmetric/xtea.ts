/**
 * XTEA (eXtended TEA) — Wheeler & Needham, 1997.
 * 64-bit block, 128-bit key, 64 Feistel rounds (32 double-rounds).
 * Pure ARX (add/rotate/XOR) — no S-boxes or lookup tables.
 * @see CIPHER_ENGINE.md Part 2 (Symmetric Ciphers) pattern
 *
 * Verified test vectors (independently computed and round-trip confirmed):
 *   key=000102030405060708090A0B0C0D0E0F, pt=4142434445464748 -> ct=497DF3D072612CB5
 *   key=00...00 (zero), pt=00...00 (zero) -> ct=DEE9D4D8F7131ED9
 */

import type { CipherResult, CipherStep, CipherOptions, TestVector } from '../types'
import { CipherError, validateInput, validateKey, toByteArray, fromByteArray } from '../../utils'

const METADATA = {
  name: 'XTEA',
  keySize: 128,
  blockSize: 64,
  rounds: 64,
  securityStatus: 'secure' as const,
  breakingComplexity: 'No practical attack better than brute force on the full 64-round variant; note the 64-bit block size is small by modern standards',
  yearDesigned: 1997,
}

const DELTA = 0x9e3779b9
const M32 = 0xffffffff
const ROUNDS = 32 // 32 double-rounds = 64 total rounds

function parseKey(key: string): [number, number, number, number] {
  validateKey(key)
  const clean = key.replace(/\s+/g, '').toLowerCase()
  if (!/^[0-9a-f]{32}$/.test(clean)) {
    throw new CipherError(
      'INVALID_KEY_LENGTH',
      `XTEA requires a 128-bit key as 32 hex characters (got ${clean.length} from "${key}").`
    )
  }
  const words: number[] = []
  for (let i = 0; i < 4; i++) {
    words.push(parseInt(clean.slice(i * 8, i * 8 + 8), 16) >>> 0)
  }
  return words as [number, number, number, number]
}

function parseHexInput(input: string): Uint8Array {
  const clean = input.replace(/\s+/g, '').toLowerCase()
  if (!/^[0-9a-f]*$/.test(clean)) {
    throw new CipherError('INVALID_INPUT', 'XTEA input must be a hex string (block cipher — no raw text mode).')
  }
  if (clean.length % 16 !== 0) {
    throw new CipherError(
      'INVALID_INPUT',
      `XTEA input must be a multiple of 8 bytes (16 hex chars). Got ${clean.length / 2} bytes — pad with zero bytes to the next 8-byte boundary.`
    )
  }
  const bytes = new Uint8Array(clean.length / 2)
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16)
  return bytes
}

function bytesToWord(b: Uint8Array, offset: number): number {
  return (((b[offset] << 24) | (b[offset + 1] << 16) | (b[offset + 2] << 8) | b[offset + 3]) >>> 0)
}

function wordToHex(w: number): string {
  return (w >>> 0).toString(16).padStart(8, '0')
}

function feistel(x: number, sum: number, k: number): number {
  const shifted = (((x << 4) >>> 0) ^ (x >>> 5)) >>> 0
  const left = (shifted + x) >>> 0
  const right = (sum + k) >>> 0
  return (left ^ right) >>> 0
}

function xteaBlockEncrypt(v0: number, v1: number, key: [number, number, number, number]): [number, number] {
  let sum = 0
  for (let i = 0; i < ROUNDS; i++) {
    v0 = (v0 + feistel(v1, sum, key[sum & 3])) & M32
    sum = (sum + DELTA) & M32
    v1 = (v1 + feistel(v0, sum, key[(sum >>> 11) & 3])) & M32
  }
  return [v0 >>> 0, v1 >>> 0]
}

function xteaBlockDecrypt(v0: number, v1: number, key: [number, number, number, number]): [number, number] {
  let sum = (Math.imul(DELTA, ROUNDS)) & M32
  for (let i = 0; i < ROUNDS; i++) {
    v1 = (v1 - feistel(v0, sum, key[(sum >>> 11) & 3])) & M32
    sum = (sum - DELTA) & M32
    v0 = (v0 - feistel(v1, sum, key[sum & 3])) & M32
  }
  return [v0 >>> 0, v1 >>> 0]
}

function xteaCore(input: string, key: string, decrypt: boolean, instrument: boolean, options: CipherOptions = {}): CipherResult {
  const start = performance.now()
  const keyWords = parseKey(key)

  let bytes: Uint8Array
  if (decrypt) {
    const clean = input.replace(/\s+/g, '').toLowerCase()
    if (!/^[0-9a-f]*$/.test(clean) || clean.length % 16 !== 0) {
      throw new CipherError('INVALID_INPUT', 'XTEA decryption input must be a valid hex string with length a multiple of 16 hex characters (8 bytes).')
    }
    bytes = toByteArray(clean, 'hex')
  } else {
    bytes = toByteArray(input, options.encoding || 'utf8')
    const remainder = bytes.length % 8
    if (remainder !== 0) {
      const padded = new Uint8Array(bytes.length + (8 - remainder))
      padded.set(bytes)
      bytes = padded
    }
  }

  if (bytes.length > 4096) {
    throw new CipherError('INPUT_TOO_LONG', 'Input exceeds maximum allowed size of 4096 bytes.')
  }

  const numBlocks = bytes.length / 8
  const steps: CipherStep[] = []
  if (instrument) {
    steps.push({
      index: 0,
      label: 'Key setup',
      inputState: key,
      outputState: keyWords.map(wordToHex).join(' '),
      table: keyWords.map((w, i) => ({ key: `K[${i}]`, value: `0x${wordToHex(w)}` })),
      note: `128-bit key split into four 32-bit words. ${numBlocks} block(s) of 8 bytes to process.`,
      isMilestone: true,
    })
  }

  const outBytes = new Uint8Array(bytes.length)
  for (let b = 0; b < numBlocks; b++) {
    const off = b * 8
    const v0 = bytesToWord(bytes, off)
    const v1 = bytesToWord(bytes, off + 4)
    const inHex = wordToHex(v0) + wordToHex(v1)

    const [o0, o1] = decrypt ? xteaBlockDecrypt(v0, v1, keyWords) : xteaBlockEncrypt(v0, v1, keyWords)
    outBytes[off] = (o0 >>> 24) & 0xff
    outBytes[off + 1] = (o0 >>> 16) & 0xff
    outBytes[off + 2] = (o0 >>> 8) & 0xff
    outBytes[off + 3] = o0 & 0xff
    outBytes[off + 4] = (o1 >>> 24) & 0xff
    outBytes[off + 5] = (o1 >>> 16) & 0xff
    outBytes[off + 6] = (o1 >>> 8) & 0xff
    outBytes[off + 7] = o1 & 0xff

    const outBlockHex = wordToHex(o0) + wordToHex(o1)
    if (instrument) {
      steps.push({
        index: steps.length,
        label: `Block ${b + 1}/${numBlocks} — 64 rounds`,
        inputState: inHex,
        outputState: outBlockHex,
        note: `${decrypt ? 'Decrypted' : 'Encrypted'} via 32 double-rounds of add-rotate-XOR (no lookup tables). '${inHex}' -> '${outBlockHex}'`,
        isMilestone: true,
      })
    }
  }

  const output = decrypt
    ? fromByteArray(outBytes, options.encoding || 'utf8')
    : fromByteArray(outBytes, 'hex')

  return {
    output,
    outputEncoding: decrypt ? (options.encoding || 'utf8') : 'hex',
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
  return xteaCore(input, key, false, !!options.instrument, options)
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
  return xteaCore(input, key, true, !!options.instrument, options)
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
    input: '4142434445464748',
    key: '000102030405060708090a0b0c0d0e0f',
    expected: '497df3d072612cb5',
    description: 'Reference vector — key bytes 00-0F, plaintext "ABCDEFGH"',
  },
  {
    input: '0000000000000000',
    key: '00000000000000000000000000000000',
    expected: 'dee9d4d8f7131ed9',
    description: 'All-zero key (32 hex chars) and plaintext',
  },
]
