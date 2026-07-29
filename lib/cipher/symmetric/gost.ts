/**
 * GOST 28147-89 — Soviet/Russian government standard block cipher
 * (declassified 1994; later the basis for GOST R 34.12-2015 "Magma").
 * 64-bit block (two 32-bit words), 256-bit key, 32-round Feistel network.
 * @see CIPHER_ENGINE.md Part 2 (Symmetric Ciphers) pattern
 *
 * IMPORTANT: unlike DES/AES, GOST's standard does NOT fix the S-boxes —
 * they are a separate negotiated parameter between communicating parties.
 * The S-boxes below are one widely-circulated reference/"test" parameter
 * set, NOT verified against a single canonical source — cite the actual
 * named parameter set you're using (e.g. a specific CryptoPro set) in
 * this file and in the registry description before merging, rather than
 * presenting these as definitive.
 *
 * Round-trip verified in a sandbox (decrypt(encrypt(x)) === x) with this
 * exact key-schedule ordering (K0..K7 x3 forward, K7..K0 once reverse,
 * final round skips the a/b swap).
 */

import type { CipherResult, CipherStep, CipherOptions, TestVector, CipherMetadata } from '../types'
import { CipherError, validateInput, validateKey } from '../../utils'

const METADATA: CipherMetadata = {
  name: 'GOST 28147-89',
  keySize: 256,
  blockSize: 64,
  rounds: 32,
  securityStatus: 'secure',
  breakingComplexity: 'No practical attack when using a well-chosen (non-degenerate) S-box set',
  yearDesigned: 1989,
  standardBody: 'GOST 28147-89 (declassified 1994)',
}

const MASK = 0xffffffff

// Reference S-box set — see file header. 8 boxes, each a 16-entry
// (4-bit -> 4-bit) lookup table, applied one per nibble of the 32-bit
// round-function output.
const SBOX: number[][] = [
  [4, 10, 9, 2, 13, 8, 0, 14, 6, 11, 1, 12, 7, 15, 5, 3],
  [14, 11, 4, 12, 6, 13, 15, 10, 2, 3, 8, 1, 0, 7, 5, 9],
  [5, 8, 1, 13, 10, 3, 4, 2, 14, 15, 12, 7, 6, 0, 9, 11],
  [7, 13, 10, 1, 0, 8, 9, 15, 14, 4, 6, 12, 11, 2, 5, 3],
  [6, 12, 7, 1, 5, 15, 13, 8, 4, 10, 9, 14, 0, 3, 11, 2],
  [4, 11, 10, 0, 7, 2, 1, 13, 3, 6, 8, 5, 9, 12, 15, 14],
  [13, 11, 4, 1, 3, 15, 5, 9, 0, 10, 14, 7, 6, 8, 2, 12],
  [1, 15, 13, 0, 5, 7, 10, 4, 9, 2, 3, 14, 6, 11, 8, 12],
]

function rotl(x: number, n: number): number {
  const ux = x >>> 0
  return (((ux << n) | (ux >>> (32 - n))) >>> 0)
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
function bytesToWordLE(b: Uint8Array, off: number): number {
  return (b[off] | (b[off + 1] << 8) | (b[off + 2] << 16) | (b[off + 3] << 24)) >>> 0
}
function wordToBytesLE(w: number, out: Uint8Array, off: number): void {
  out[off] = w & 0xff
  out[off + 1] = (w >>> 8) & 0xff
  out[off + 2] = (w >>> 16) & 0xff
  out[off + 3] = (w >>> 24) & 0xff
}
function wordToHex(w: number): string {
  return (w >>> 0).toString(16).padStart(8, '0')
}

function gostF(word: number, subkey: number): number {
  const x = (word + subkey) >>> 0
  let out = 0
  for (let i = 0; i < 8; i++) {
    const nibble = (x >>> (i * 4)) & 0xf
    out |= SBOX[i][nibble] << (i * 4)
  }
  return rotl(out >>> 0, 11)
}

function parseKey(key: string): number[] {
  validateKey(key)
  const bytes = parseHexBytes(key, 'GOST key')
  if (bytes.length !== 32) {
    throw new CipherError('INVALID_KEY_LENGTH', `GOST 28147-89 requires a 256-bit key as 64 hex characters (got ${bytes.length} bytes).`)
  }
  const K: number[] = []
  for (let i = 0; i < 8; i++) K.push(bytesToWordLE(bytes, i * 4))
  return K
}

function roundOrder(decrypt: boolean): number[] {
  const forward = [0, 1, 2, 3, 4, 5, 6, 7]
  const reverse = [7, 6, 5, 4, 3, 2, 1, 0]
  const encOrder = [...forward, ...forward, ...forward, ...reverse]
  return decrypt ? [...encOrder].reverse() : encOrder
}

function gostCore(input: string, key: string, decrypt: boolean, instrument: boolean): CipherResult {
  const start = performance.now()
  const K = parseKey(key)
  const bytes = parseHexBytes(input, 'GOST input')
  if (bytes.length === 0 || bytes.length % 8 !== 0) {
    throw new CipherError('INVALID_INPUT', `GOST input must be a non-empty multiple of 8 bytes (64-bit blocks). Got ${bytes.length} bytes.`)
  }

  const order = roundOrder(decrypt)
  const steps: CipherStep[] = []
  if (instrument) {
    steps.push({
      index: 0,
      label: 'Round key order',
      inputState: key,
      outputState: order.join(','),
      note: `${decrypt ? 'Decrypt' : 'Encrypt'} order: ${decrypt ? 'K0..K7 once forward, then K7..K0 three times' : 'K0..K7 three times forward, then K7..K0 once reverse'} — 32 rounds total.`,
      isMilestone: true,
    })
  }

  const numBlocks = bytes.length / 8
  const outBytes = new Uint8Array(bytes.length)
  for (let blk = 0; blk < numBlocks; blk++) {
    const off = blk * 8
    let a = bytesToWordLE(bytes, off)
    let b = bytesToWordLE(bytes, off + 4)
    const inHex = wordToHex(a) + wordToHex(b)

    order.forEach((ki, idx) => {
      const newB = a
      const newA = (b ^ gostF(a, K[ki])) >>> 0
      a = newA
      b = newB
      if (idx === order.length - 1) {
        // GOST's final round skips the usual swap
        ;[a, b] = [b, a]
      }
    })

    wordToBytesLE(a, outBytes, off)
    wordToBytesLE(b, outBytes, off + 4)
    const outHex = wordToHex(a) + wordToHex(b)

    if (instrument) {
      steps.push({
        index: steps.length,
        label: `Block ${blk + 1}/${numBlocks} — 32 rounds`,
        inputState: inHex,
        outputState: outHex,
        note: `'${inHex}' -> '${outHex}'`,
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
  return gostCore(input, key, false, !!options.instrument)
}
export function decrypt(input: string, key: string, options: CipherOptions = {}): CipherResult {
  validateInput(input)
  return gostCore(input, key, true, !!options.instrument)
}

export const TEST_VECTORS: TestVector[] = [
  {
    input: '0000000000000000',
    key: '000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f',
    expected: '66aa28cf3b24ddb9'.slice(0, 16),
    description: 'Self-computed reference (round-trip verified in sandbox; S-box set is a reference/"test" parameter set — see file header)',
  },
]
