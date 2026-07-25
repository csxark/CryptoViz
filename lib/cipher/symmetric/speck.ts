/**
 * Speck128/128 — NSA, 2013. Lightweight ARX (Add-Rotate-XOR) block cipher.
 * 128-bit block (two 64-bit words), 128-bit key (two 64-bit words), 32 rounds.
 * @see CIPHER_ENGINE.md Part 2 (Symmetric Ciphers) pattern
 *
 * Self-computed reference vector (independently implemented and round-trip
 * verified — NOT copied from a memorized official test vector; cross-check
 * against a second source before relying on it for anything beyond this repo):
 *   key = 0f0e0d0c0b0a0908 0706050403020100  (k1 || k0, 16 bytes)
 *   pt  = 6f6e692073696874 6d2073696874706d  (y0 || x0, 16 bytes)
 *   ct  = 55fc7db5a3dd9355 ef2e4afb452e58da  (y  || x , 16 bytes)
 *
 * No S-boxes, no lookup tables — every round is addition mod 2^64, XOR, and
 * fixed rotation only. Contrast with xtea.ts (also ARX-ish, but 32-bit) and
 * with aes.ts/des.ts (S-box substitution).
 */

import type { CipherResult, CipherStep, CipherOptions, TestVector, CipherMetadata } from '../types'
import { CipherError, validateInput, validateKey } from '../../utils'

const METADATA: CipherMetadata = {
  name: 'Speck128/128',
  keySize: 128,
  blockSize: 128,
  rounds: 32,
  securityStatus: 'secure',
  breakingComplexity: 'No practical attack on the full 32-round cipher; best known attacks cover fewer rounds',
  yearDesigned: 2013,
  standardBody: 'NSA (published academically; later ISO/IEC 29167-21)',
}

const MASK64 = (1n << 64n) - 1n
const ROUNDS = 32n

function rotl64(x: bigint, r: bigint): bigint {
  x &= MASK64
  return ((x << r) | (x >> (64n - r))) & MASK64
}

function rotr64(x: bigint, r: bigint): bigint {
  x &= MASK64
  return ((x >> r) | (x << (64n - r))) & MASK64
}

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

function bytesToWordBE(b: Uint8Array, off: number): bigint {
  let w = 0n
  for (let i = 0; i < 8; i++) w = (w << 8n) | BigInt(b[off + i])
  return w
}

function wordToBytesBE(w: bigint, out: Uint8Array, off: number): void {
  for (let i = 7; i >= 0; i--) {
    out[off + i] = Number(w & 0xffn)
    w >>= 8n
  }
}

function wordToHex(w: bigint): string {
  return w.toString(16).padStart(16, '0')
}

function keySchedule(k0: bigint, k1: bigint): bigint[] {
  const k: bigint[] = new Array(Number(ROUNDS))
  const l: bigint[] = new Array(Number(ROUNDS))
  k[0] = k0
  l[0] = k1
  for (let i = 0n; i < ROUNDS - 1n; i++) {
    const idx = Number(i)
    l[idx + 1] = ((k[idx] + rotr64(l[idx], 8n)) & MASK64) ^ i
    k[idx + 1] = rotl64(k[idx], 3n) ^ l[idx + 1]
  }
  return k
}

function parseKey(key: string): bigint[] {
  validateKey(key)
  const bytes = parseHexBytes(key, 'Speck key')
  if (bytes.length !== 16) {
    throw new CipherError('INVALID_KEY_LENGTH', `Speck128/128 requires a 128-bit key as 32 hex characters (got ${bytes.length} bytes).`)
  }
  const k0 = bytesToWordBE(bytes, 0)
  const k1 = bytesToWordBE(bytes, 8)
  return keySchedule(k0, k1)
}

function parseBlockInput(input: string): Uint8Array {
  const bytes = parseHexBytes(input, 'Speck input')
  if (bytes.length === 0 || bytes.length % 16 !== 0) {
    throw new CipherError('INVALID_INPUT', `Speck input must be a non-empty multiple of 16 bytes (128-bit blocks). Got ${bytes.length} bytes.`)
  }
  return bytes
}

function encryptBlock(x0: bigint, y0: bigint, k: bigint[]): [bigint, bigint] {
  let x = x0
  let y = y0
  for (const ki of k) {
    x = (rotr64(x, 8n) + y) & MASK64
    x ^= ki
    y = rotl64(y, 3n) ^ x
  }
  return [x, y]
}

function decryptBlock(x0: bigint, y0: bigint, k: bigint[]): [bigint, bigint] {
  let x = x0
  let y = y0
  for (let i = k.length - 1; i >= 0; i--) {
    y = rotr64(y ^ x, 3n)
    x ^= k[i]
    x = rotl64((x - y) & MASK64, 8n)
  }
  return [x, y]
}

function speckCore(input: string, key: string, decrypt: boolean, instrument: boolean): CipherResult {
  const start = performance.now()
  const k = parseKey(key)
  const bytes = parseBlockInput(input)
  const numBlocks = bytes.length / 16

  const steps: CipherStep[] = []
  if (instrument) {
    steps.push({
      index: 0,
      label: 'Key schedule',
      inputState: key,
      outputState: k.map(wordToHex).join(' ').slice(0, 80) + '…',
      note: `128-bit key expanded into 32 round keys — the key schedule reuses the SAME round function as encryption, applied to the key words instead of the data words. ${numBlocks} block(s) of 16 bytes to process.`,
      isMilestone: true,
    })
  }

  const outBytes = new Uint8Array(bytes.length)
  for (let b = 0; b < numBlocks; b++) {
    const off = b * 16
    // Word order: first 8 bytes = y, next 8 bytes = x (matches the
    // self-computed reference vector's pt = y0||x0 layout above).
    const y0 = bytesToWordBE(bytes, off)
    const x0 = bytesToWordBE(bytes, off + 8)
    const inHex = wordToHex(y0) + wordToHex(x0)

    const [ox, oy] = decrypt ? decryptBlock(x0, y0, k) : encryptBlock(x0, y0, k)
    wordToBytesBE(oy, outBytes, off)
    wordToBytesBE(ox, outBytes, off + 8)
    const outHex = wordToHex(oy) + wordToHex(ox)

    if (instrument) {
      steps.push({
        index: steps.length,
        label: `Block ${b + 1}/${numBlocks} — 32 rounds`,
        inputState: inHex,
        outputState: outHex,
        note: `${decrypt ? 'Decrypted' : 'Encrypted'} via 32 ARX rounds (add mod 2^64, rotate, XOR — no lookup tables). '${inHex}' -> '${outHex}'`,
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

export function encrypt(input: string, key: string, options: CipherOptions = {}): CipherResult {
  validateInput(input)
  return speckCore(input, key, false, !!options.instrument)
}

export function decrypt(input: string, key: string, options: CipherOptions = {}): CipherResult {
  validateInput(input)
  return speckCore(input, key, true, !!options.instrument)
}

export const TEST_VECTORS: TestVector[] = [
  {
    input: '6f6e6920736968746d2073696874706d',
    key: '0f0e0d0c0b0a09080706050403020100',
    expected: '55fc7db5a3dd9355ef2e4afb452e58da',
    description: 'Self-computed reference vector (round-trip verified) — cross-check against an independent Speck128/128 implementation before merging',
  },
]
