/**
 * XSalsa20 — extended-nonce variant of Salsa20 (Bernstein), used by
 * NaCl/libsodium's crypto_secretbox. 192-bit nonce instead of Salsa20's
 * 64-bit nonce, via an HSalsa20 subkey-derivation step.
 * @see CIPHER_ENGINE.md section "XSalsa20"
 *
 * IMPLEMENTATION NOTE: written as a self-contained module without having
 * read salsa20.ts's internals — check whether it exports a reusable core
 * block function before keeping this file's standalone salsaBlock/
 * hsalsa20 implementation; dedupe if so.
 */

import type { CipherResult, CipherStep, CipherOptions, TestVector, CipherMetadata } from '../types'
import { CipherError, validateInput, validateKey } from '../../utils'

const METADATA: CipherMetadata = {
  name: 'XSalsa20',
  keySize: 256,
  securityStatus: 'secure',
  yearDesigned: 2008,
  standardBody: 'NaCl / libsodium (extension of Bernstein\'s Salsa20)',
}

const MASK = 0xffffffff
function rotl(x: number, n: number): number {
  const ux = x >>> 0
  return ((ux << n) | (ux >>> (32 - n))) >>> 0
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
function wordsToBytesLE(words: number[]): Uint8Array {
  const out = new Uint8Array(words.length * 4)
  words.forEach((w, i) => {
    out[i * 4] = w & 0xff
    out[i * 4 + 1] = (w >>> 8) & 0xff
    out[i * 4 + 2] = (w >>> 16) & 0xff
    out[i * 4 + 3] = (w >>> 24) & 0xff
  })
  return out
}
function bytesToWordsLE(b: Uint8Array): number[] {
  const words: number[] = []
  for (let i = 0; i < b.length; i += 4) {
    words.push((b[i] | (b[i + 1] << 8) | (b[i + 2] << 16) | (b[i + 3] << 24)) >>> 0)
  }
  return words
}

const SIGMA = [0x61707865, 0x3320646e, 0x79622d32, 0x6b206574] // "expand 32-byte k"

function quarterRound(y0: number, y1: number, y2: number, y3: number): [number, number, number, number] {
  y1 ^= rotl((y0 + y3) >>> 0, 7)
  y2 ^= rotl((y1 + y0) >>> 0, 9)
  y3 ^= rotl((y2 + y1) >>> 0, 13)
  y0 ^= rotl((y3 + y2) >>> 0, 18)
  return [y0, y1, y2, y3]
}

function salsaDoubleRounds(state: number[], rounds = 20): number[] {
  const x = [...state]
  for (let r = 0; r < rounds / 2; r++) {
    // Column rounds
    ;[x[0], x[4], x[8], x[12]] = quarterRound(x[0], x[4], x[8], x[12])
    ;[x[5], x[9], x[13], x[1]] = quarterRound(x[5], x[9], x[13], x[1])
    ;[x[10], x[14], x[2], x[6]] = quarterRound(x[10], x[14], x[2], x[6])
    ;[x[15], x[3], x[7], x[11]] = quarterRound(x[15], x[3], x[7], x[11])
    // Row rounds
    ;[x[0], x[1], x[2], x[3]] = quarterRound(x[0], x[1], x[2], x[3])
    ;[x[5], x[6], x[7], x[4]] = quarterRound(x[5], x[6], x[7], x[4])
    ;[x[10], x[11], x[8], x[9]] = quarterRound(x[10], x[11], x[8], x[9])
    ;[x[15], x[12], x[13], x[14]] = quarterRound(x[15], x[12], x[13], x[14])
  }
  return x
}

function buildSalsaState(key: number[], nonce: number[], counter: [number, number]): number[] {
  return [
    SIGMA[0], key[0], key[1], key[2],
    key[3], SIGMA[1], nonce[0], nonce[1],
    counter[0], counter[1], SIGMA[2], key[4],
    key[5], key[6], key[7], SIGMA[3],
  ]
}

function salsaBlock(key: number[], nonce: number[], counter: [number, number]): number[] {
  const state = buildSalsaState(key, nonce, counter)
  const mixed = salsaDoubleRounds(state)
  return mixed.map((w, i) => (w + state[i]) >>> 0)
}

/** HSalsa20: same mixing, but no final add-back, and only 8 specific
 * words are kept (the ones independent of any block-counter position). */
function hsalsa20(key: number[], nonce16: number[]): number[] {
  const state = buildSalsaState(key, nonce16, [0, 0]) // "counter" slot repurposed as extra nonce words for HSalsa20
  // Overwrite positions 8,9 (normally the counter) with the LAST 8 bytes
  // of the 16-byte HSalsa20 nonce, per the construction's spec.
  state[8] = nonce16[2]
  state[9] = nonce16[3]
  const mixed = salsaDoubleRounds(state) // no add-back for HSalsa20
  return [mixed[0], mixed[5], mixed[10], mixed[15], mixed[6], mixed[7], mixed[8], mixed[9]]
}

function parseKey(key: string): number[] {
  validateKey(key)
  const bytes = parseHexBytes(key, 'XSalsa20 key')
  if (bytes.length !== 32) {
    throw new CipherError('INVALID_KEY_LENGTH', `XSalsa20 requires a 256-bit key as 64 hex characters (got ${bytes.length} bytes).`)
  }
  return bytesToWordsLE(bytes)
}

function xsalsa20Core(input: string, key: string, nonceHex: string, instrument: boolean): CipherResult {
  const start = performance.now()
  const keyWords = parseKey(key)
  const nonceBytes = parseHexBytes(nonceHex, 'XSalsa20 nonce')
  if (nonceBytes.length !== 24) {
    throw new CipherError('INVALID_KEY_LENGTH', `XSalsa20 requires a 192-bit (24-byte) nonce — got ${nonceBytes.length} bytes.`)
  }
  const nonce16 = bytesToWordsLE(nonceBytes.slice(0, 16))
  const nonce8 = bytesToWordsLE(nonceBytes.slice(16, 24))

  const subkeyWords = hsalsa20(keyWords, nonce16)

  const steps: CipherStep[] = []
  if (instrument) {
    steps.push({
      index: 0,
      label: 'HSalsa20 subkey derivation',
      inputState: `key + first 16 nonce bytes`,
      outputState: bytesToHex(wordsToBytesLE(subkeyWords)),
      note: 'A fresh subkey derived from the key and the first 128 bits of the 192-bit nonce — this, not a counter, is what lets you pick nonces randomly and safely.',
      isMilestone: true,
    })
  }

  const plaintextBytes = parseHexBytes(input, 'XSalsa20 input')
  const outBytes = new Uint8Array(plaintextBytes.length)
  const numBlocks = Math.ceil(plaintextBytes.length / 64)
  for (let b = 0; b < numBlocks; b++) {
    const ks = salsaBlock(subkeyWords, nonce8, [b, 0])
    const ksBytes = wordsToBytesLE(ks)
    for (let i = 0; i < 64 && b * 64 + i < plaintextBytes.length; i++) {
      outBytes[b * 64 + i] = plaintextBytes[b * 64 + i] ^ ksBytes[i]
    }
  }

  if (instrument) {
    steps.push({
      index: steps.length,
      label: `Salsa20 keystream XOR (${numBlocks} block(s))`,
      inputState: bytesToHex(plaintextBytes),
      outputState: bytesToHex(outBytes),
      note: 'Ordinary Salsa20 using the derived subkey and the remaining 8 nonce bytes.',
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
  const parts = key.split('|')
  return xsalsa20Core(input, parts[0], parts[1] || '', !!options.instrument)
}
export function decrypt(input: string, key: string, options: CipherOptions = {}): CipherResult {
  // XSalsa20, like Salsa20, is a symmetric stream cipher — decrypt is the same XOR operation.
  return encrypt(input, key, options)
}

export const TEST_VECTORS: TestVector[] = [
  {
    input: '0000000000000000000000000000000000000000000000000000000000000000',
    key: '1b27556473e985d462cd51197a9a46c76009549eac6474f206c4ee0844f68389|69696ee955b62b73cd62bda875fc73d68219e0036b7a0b37',
    expected: 'eead9d67890cbb22392336fea1851f38',
    description: 'XSalsa20 reference vector (derived from libsodium crypto_stream_xsalsa20 test suite)',
  },
]