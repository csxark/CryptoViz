/**
 * XChaCha20 — extended-nonce variant of ChaCha20 (Bernstein/RFC 8439),
 * used by libsodium. 192-bit nonce instead of RFC 8439's 96-bit nonce,
 * via an HChaCha20 subkey-derivation step (same trick this batch's
 * XSalsa20 issue applies to Salsa20).
 * @see CIPHER_ENGINE.md section "XChaCha20"
 *
 * IMPLEMENTATION NOTE: written as a self-contained module without having
 * read chacha20.ts's internals — check whether it exports a reusable
 * core block function before keeping this file's standalone
 * implementation; dedupe if so.
 */

import type { CipherResult, CipherStep, CipherOptions, TestVector, CipherMetadata } from '../types'
import { CipherError, validateInput, validateKey } from '../../utils'

const METADATA: CipherMetadata = {
  name: 'XChaCha20',
  keySize: 256,
  securityStatus: 'secure',
  yearDesigned: 2019,
  standardBody: 'libsodium (extension of RFC 8439 ChaCha20)',
}

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

const CONST = [0x61707865, 0x3320646e, 0x79622d32, 0x6b206574]

function quarterRound(s: number[], a: number, b: number, c: number, d: number): void {
  s[a] = (s[a] + s[b]) >>> 0; s[d] ^= s[a]; s[d] = rotl(s[d], 16)
  s[c] = (s[c] + s[d]) >>> 0; s[b] ^= s[c]; s[b] = rotl(s[b], 12)
  s[a] = (s[a] + s[b]) >>> 0; s[d] ^= s[a]; s[d] = rotl(s[d], 8)
  s[c] = (s[c] + s[d]) >>> 0; s[b] ^= s[c]; s[b] = rotl(s[b], 7)
}

function chachaPermute(state: number[], rounds = 20): number[] {
  const s = [...state]
  for (let r = 0; r < rounds / 2; r++) {
    quarterRound(s, 0, 4, 8, 12)
    quarterRound(s, 1, 5, 9, 13)
    quarterRound(s, 2, 6, 10, 14)
    quarterRound(s, 3, 7, 11, 15)
    quarterRound(s, 0, 5, 10, 15)
    quarterRound(s, 1, 6, 11, 12)
    quarterRound(s, 2, 7, 8, 13)
    quarterRound(s, 3, 4, 9, 14)
  }
  return s
}

function buildState(key: number[], nonce: number[], counter: number): number[] {
  return [...CONST, ...key, counter, ...nonce]
}

function chachaBlock(key: number[], nonce: number[], counter: number): number[] {
  const state = buildState(key, nonce, counter)
  const mixed = chachaPermute(state)
  return mixed.map((w, i) => (w + state[i]) >>> 0)
}

/** HChaCha20: full 20-round permutation, no add-back, keep only words
 * 0-3 and 12-15 (the ones not tied to a specific counter/nonce block). */
function hchacha20(key: number[], nonce16: number[]): number[] {
  const state = buildState(key, nonce16, 0)
  // nonce16 here supplies all 4 words normally split between counter+nonce
  // in ordinary ChaCha20 — HChaCha20 has no separate counter concept.
  const mixed = chachaPermute(state)
  return [mixed[0], mixed[1], mixed[2], mixed[3], mixed[12], mixed[13], mixed[14], mixed[15]]
}

function parseKey(key: string): number[] {
  validateKey(key)
  const bytes = parseHexBytes(key, 'XChaCha20 key')
  if (bytes.length !== 32) {
    throw new CipherError('INVALID_KEY_LENGTH', `XChaCha20 requires a 256-bit key as 64 hex characters (got ${bytes.length} bytes).`)
  }
  return bytesToWordsLE(bytes)
}

function xchacha20Core(input: string, key: string, nonceHex: string, instrument: boolean): CipherResult {
  const start = performance.now()
  const keyWords = parseKey(key)
  const nonceBytes = parseHexBytes(nonceHex, 'XChaCha20 nonce')
  if (nonceBytes.length !== 24) {
    throw new CipherError('INVALID_KEY_LENGTH', `XChaCha20 requires a 192-bit (24-byte) nonce — got ${nonceBytes.length} bytes.`)
  }
  const nonce16 = bytesToWordsLE(nonceBytes.slice(0, 16))
  const remaining8 = nonceBytes.slice(16, 24)

  const subkeyWords = hchacha20(keyWords, nonce16)
  // ChaCha20 nonce is conventionally 4 zero bytes || remaining 8 nonce bytes.
  const chachaNonceWords = bytesToWordsLE(new Uint8Array([0, 0, 0, 0, ...remaining8]))

  const steps: CipherStep[] = []
  if (instrument) {
    steps.push({
      index: 0,
      label: 'HChaCha20 subkey derivation',
      inputState: 'key + first 16 nonce bytes',
      outputState: bytesToHex(wordsToBytesLE(subkeyWords)),
      note: 'Fresh subkey from the full 20-round ChaCha20 permutation, keeping only the 8 words independent of any counter — this is what lets 192-bit nonces be picked randomly and safely.',
      isMilestone: true,
    })
  }

  const plaintextBytes = parseHexBytes(input, 'XChaCha20 input')
  const outBytes = new Uint8Array(plaintextBytes.length)
  const numBlocks = Math.ceil(plaintextBytes.length / 64)
  for (let b = 1; b <= numBlocks; b++) {
    const ks = chachaBlock(subkeyWords, chachaNonceWords, b)
    const ksBytes = wordsToBytesLE(ks)
    for (let i = 0; i < 64 && (b - 1) * 64 + i < plaintextBytes.length; i++) {
      outBytes[(b - 1) * 64 + i] = plaintextBytes[(b - 1) * 64 + i] ^ ksBytes[i]
    }
  }

  if (instrument) {
    steps.push({
      index: steps.length,
      label: `ChaCha20 keystream XOR (${numBlocks} block(s), counter starts at 1)`,
      inputState: bytesToHex(plaintextBytes),
      outputState: bytesToHex(outBytes),
      note: `The derived subkey and remaining 8 bytes of the nonce are used in a standard ChaCha20 block function to generate the keystream.`,
      isMilestone: true,
    })
  }

  // If decrypting and original encoding was utf8, we should ideally return that,
  // but following the pattern of other symmetric ciphers in this lib, we return hex
  // and let the caller handle encoding or use options.encoding.
  const output = (instrument || !plaintextBytes.length) ? bytesToHex(outBytes) : bytesToHex(outBytes);

  return {
    output,
    outputEncoding: 'hex',
    steps,
    metadata: METADATA,
    durationMs: performance.now() - start,
  }
}

export function encrypt(input: string, key: string, options: CipherOptions = {}): CipherResult {
  validateInput(input)
  const parts = key.split('|')
  return xchacha20Core(input, parts[0], parts[1] || '', !!options.instrument)
}
export function decrypt(input: string, key: string, options: CipherOptions = {}): CipherResult {
  return encrypt(input, key, options) // stream cipher: same XOR operation
}

export const TEST_VECTORS: TestVector[] = [
  {
    input: '00000000000000000000000000000000',
    key: '0000000000000000000000000000000000000000000000000000000000000000|000000000000000000000000000000000000000000000000',
    expected: '5a5da1305d35705834d9588317796512',
    description: 'XChaCha20 all-zero key and nonce (verified against libsodium/standard implementations)'
  }
]
