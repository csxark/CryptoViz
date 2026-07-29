/**
 * Threefish-256 — Ferguson, Kelsey, Schneier et al., 2008. Skein hash
 * family's underlying block cipher (Skein was a SHA-3 finalist).
 * 256-bit block (four 64-bit words), 256-bit key, 128-bit tweak, 72 rounds.
 * @see CIPHER_ENGINE.md Part 2 (Symmetric Ciphers) pattern
 *
 * Round-trip verified in a sandbox (decrypt(encrypt(x)) === x) but NOT
 * checked against the official NIST Skein submission's published test
 * vectors — self-consistency only. Cross-check before treating as fully
 * vetted.
 *
 * Tweakable: the same key with a different 128-bit tweak produces
 * unrelated ciphertext for the same plaintext — no other cipher in this
 * registry exposes a tweak input as a first-class parameter.
 */

import type { CipherResult, CipherStep, CipherOptions, TestVector, CipherMetadata } from '../types'
import { CipherError, validateInput, validateKey } from '../../utils'

const METADATA: CipherMetadata = {
  name: 'Threefish-256',
  keySize: 256,
  blockSize: 256,
  rounds: 72,
  securityStatus: 'secure',
  breakingComplexity: 'No practical attack on the full 72-round cipher',
  yearDesigned: 2008,
  standardBody: 'Skein hash function submission (SHA-3 competition finalist)',
}

const MASK = (1n << 64n) - 1n
const C240 = 0x1bd11bda_a9fc1a22n
const ROUNDS = 72
const ROT: [number, number][] = [
  [14, 16], [52, 57], [23, 40], [5, 37], [25, 33], [46, 12], [58, 22], [32, 32],
]

function rotl(x: bigint, r: number): bigint {
  const s = BigInt(r & 63)
  x &= MASK
  return s === 0n ? x : ((x << s) | (x >> (64n - s))) & MASK
}
function rotr(x: bigint, r: number): bigint {
  const s = BigInt(r & 63)
  x &= MASK
  return s === 0n ? x : ((x >> s) | (x << (64n - s))) & MASK
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
function bytesToWordLE(b: Uint8Array, off: number): bigint {
  let w = 0n
  for (let i = 7; i >= 0; i--) w = (w << 8n) | BigInt(b[off + i])
  return w
}
function wordToBytesLE(w: bigint, out: Uint8Array, off: number): void {
  for (let i = 0; i < 8; i++) {
    out[off + i] = Number(w & 0xffn)
    w >>= 8n
  }
}
function wordToHex(w: bigint): string {
  return w.toString(16).padStart(16, '0')
}

function keySchedule(k: bigint[], t: bigint[]): bigint[][] {
  const kx = [...k, C240 ^ k[0] ^ k[1] ^ k[2] ^ k[3]]
  const tx = [...t, t[0] ^ t[1]]
  const subkeys: bigint[][] = []
  for (let s = 0; s < 19; s++) {
    subkeys.push([
      kx[s % 5],
      (kx[(s + 1) % 5] + tx[s % 3]) & MASK,
      (kx[(s + 2) % 5] + tx[(s + 1) % 3]) & MASK,
      (kx[(s + 3) % 5] + BigInt(s)) & MASK,
    ])
  }
  return subkeys
}

function parseKeyAndTweak(key: string): { k: bigint[]; t: bigint[] } {
  validateKey(key)
  const parts = key.split('|')
  const keyBytes = parseHexBytes(parts[0], 'Threefish key')
  if (keyBytes.length !== 32) {
    throw new CipherError('INVALID_KEY_LENGTH', `Threefish-256 requires a 256-bit key as 64 hex characters (got ${keyBytes.length} bytes).`)
  }
  const k = [0, 8, 16, 24].map((off) => bytesToWordLE(keyBytes, off))
  let t: bigint[]
  if (parts.length >= 2 && parts[1].trim()) {
    const tweakBytes = parseHexBytes(parts[1], 'Threefish tweak')
    if (tweakBytes.length !== 16) {
      throw new CipherError('INVALID_KEY_LENGTH', `Threefish tweak must be 128 bits as 32 hex characters (got ${tweakBytes.length} bytes).`)
    }
    t = [bytesToWordLE(tweakBytes, 0), bytesToWordLE(tweakBytes, 8)]
  } else {
    t = [0n, 0n]
  }
  return { k, t }
}

function parseBlockInput(input: string): Uint8Array {
  const bytes = parseHexBytes(input, 'Threefish input')
  if (bytes.length !== 32) {
    throw new CipherError('INVALID_INPUT', `Threefish-256 input must be exactly 32 bytes (256-bit block). Got ${bytes.length} bytes.`)
  }
  return bytes
}

function mix(x0: bigint, x1: bigint, r: number): [bigint, bigint] {
  const y0 = (x0 + x1) & MASK
  const y1 = rotl(x1, r) ^ y0
  return [y0, y1]
}
function unmix(y0: bigint, y1: bigint, r: number): [bigint, bigint] {
  const x1 = rotr(y1 ^ y0, r)
  const x0 = (y0 - x1) & MASK
  return [x0, x1]
}

function encryptBlock(pt: bigint[], subkeys: bigint[][]): bigint[] {
  let x = [...pt]
  for (let d = 0; d < ROUNDS; d++) {
    if (d % 4 === 0) {
      const sk = subkeys[d / 4]
      x = x.map((w, i) => (w + sk[i]) & MASK)
    }
    const r = ROT[d % 8]
    const [a, b] = mix(x[0], x[1], r[0])
    const [c, dd] = mix(x[2], x[3], r[1])
    x = [a, dd, c, b]
  }
  const sk = subkeys[18]
  return x.map((w, i) => (w + sk[i]) & MASK)
}

function decryptBlock(ct: bigint[], subkeys: bigint[][]): bigint[] {
  let sk = subkeys[18]
  let x = ct.map((w, i) => (w - sk[i]) & MASK)
  for (let d = ROUNDS - 1; d >= 0; d--) {
    const [a, dd, c, b] = x
    x = [a, b, c, dd]
    const r = ROT[d % 8]
    const [x0, x1] = unmix(x[0], x[1], r[0])
    const [x2, x3] = unmix(x[2], x[3], r[1])
    x = [x0, x1, x2, x3]
    if (d % 4 === 0) {
      sk = subkeys[d / 4]
      x = x.map((w, i) => (w - sk[i]) & MASK)
    }
  }
  return x
}

function threefishCore(input: string, key: string, decrypt: boolean, instrument: boolean): CipherResult {
  const start = performance.now()
  const { k, t } = parseKeyAndTweak(key)
  const subkeys = keySchedule(k, t)
  const bytes = parseBlockInput(input)
  const words = [0, 8, 16, 24].map((off) => bytesToWordLE(bytes, off))

  const steps: CipherStep[] = []
  if (instrument) {
    steps.push({
      index: 0,
      label: 'Key + tweak schedule',
      inputState: key,
      outputState: `19 subkeys derived`,
      note: `Tweak words t0=${wordToHex(t[0])}, t1=${wordToHex(t[1])} mixed into subkey derivation — changing only the tweak changes every subsequent subkey.`,
      isMilestone: true,
    })
  }

  const out = decrypt ? decryptBlock(words, subkeys) : encryptBlock(words, subkeys)
  const outBytes = new Uint8Array(32)
  ;[0, 8, 16, 24].forEach((off, i) => wordToBytesLE(out[i], outBytes, off))

  if (instrument) {
    steps.push({
      index: steps.length,
      label: `${decrypt ? 'Decrypt' : 'Encrypt'} — 72 rounds`,
      inputState: words.map(wordToHex).join(''),
      outputState: out.map(wordToHex).join(''),
      note: 'Subkey injected every 4 rounds; each round runs two MIX operations (add/rotate/XOR) then permutes the four words.',
      isMilestone: true,
    })
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
  return threefishCore(input, key, false, !!options.instrument)
}
export function decrypt(input: string, key: string, options: CipherOptions = {}): CipherResult {
  validateInput(input)
  return threefishCore(input, key, true, !!options.instrument)
}

export const TEST_VECTORS: TestVector[] = [
  {
    input: '0000000000000000000000000000000000000000000000000000000000000'.slice(0, 64),
    key: '17161514131211101f1e1d1c1b1a19182726252423222120' + '2f2e2d2c2b2a2928' + '|' + '07060504030201000f0e0d0c0b0a0908',
    expected: '8f2a105e3b9b431e' + '9cdf064dff4d972a' + 'f4c998fa019e4c77' + 'ca68d447c9e4bbf6',
    description: 'Self-computed reference (round-trip verified; NOT checked against the official NIST Skein test vectors — cross-check before relying on this outside the repo)',
  },
]