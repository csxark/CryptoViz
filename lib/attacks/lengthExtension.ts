/**
 * SHA-256 Length Extension Attack.
 * Demonstrates why `H(secret || message)` is an unsafe MAC construction:
 * given only H(secret || message) and the length of message (not secret's
 * content, only its byte length), an attacker can compute
 * H(secret || message || glue_padding || attacker_data) without ever
 * knowing `secret`.
 *
 * This module ships its own minimal, state-injectable SHA-256 core
 * (independent from lib/cipher/hash/sha256.ts) because the attack requires
 * resuming compression from an arbitrary intermediate digest state, which
 * @noble/hashes does not expose.
 * @see CIPHER_ENGINE.md "Attack simulators" conventions
 */

import { CipherError } from '../utils/errors'

export interface LengthExtensionStep {
  label: string
  detail: string
}

export interface ForgeResult {
  /** The bytes an attacker must send to the verifier: original message || glue padding || appended data */
  forgedMessage: Uint8Array
  /** Hex-encoded forged MAC: H(secret || forgedMessage) — computed without knowing `secret` */
  forgedHashHex: string
  /** The glue padding bytes inserted between the original message and the appended data */
  gluePadding: Uint8Array
  steps: LengthExtensionStep[]
}

const K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
])

const H_INIT = new Uint32Array([
  0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
  0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
])

function rotr(x: number, n: number): number {
  return ((x >>> n) | (x << (32 - n))) >>> 0
}

/** Compress one or more 64-byte blocks into the given 8-word state (mutates and returns it). */
function compressBlocks(state: Uint32Array, blocks: Uint8Array): Uint32Array {
  const h = state.slice()
  const w = new Uint32Array(64)

  for (let offset = 0; offset < blocks.length; offset += 64) {
    for (let i = 0; i < 16; i++) {
      const o = offset + i * 4
      w[i] = ((blocks[o] << 24) | (blocks[o + 1] << 16) | (blocks[o + 2] << 8) | blocks[o + 3]) >>> 0
    }
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3)
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10)
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0
    }

    let [a, b, c, d, e, f, g, hh] = h

    for (let i = 0; i < 64; i++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)
      const ch = (e & f) ^ (~e & g)
      const temp1 = (hh + S1 + ch + K[i] + w[i]) >>> 0
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)
      const maj = (a & b) ^ (a & c) ^ (b & c)
      const temp2 = (S0 + maj) >>> 0

      hh = g; g = f; f = e; e = (d + temp1) >>> 0
      d = c; c = b; b = a; a = (temp1 + temp2) >>> 0
    }

    h[0] = (h[0] + a) >>> 0; h[1] = (h[1] + b) >>> 0; h[2] = (h[2] + c) >>> 0; h[3] = (h[3] + d) >>> 0
    h[4] = (h[4] + e) >>> 0; h[5] = (h[5] + f) >>> 0; h[6] = (h[6] + g) >>> 0; h[7] = (h[7] + hh) >>> 0
  }

  return h
}

/**
 * Standard SHA-256 Merkle–Damgård padding for a message of `totalLenBytes`
 * total bytes processed so far (i.e. the length to encode in the 64-bit
 * length suffix), applied to `tailBytes` (usually the final partial block).
 */
export function computeMdPadding(totalLenBytes: number): Uint8Array {
  const bitLen = BigInt(totalLenBytes) * 8n
  const tailLen = totalLenBytes % 64
  const zeroPadCount = tailLen < 56 ? 56 - tailLen - 1 : 120 - tailLen - 1
  const padding = new Uint8Array(1 + zeroPadCount + 8)
  padding[0] = 0x80
  const lenOffset = padding.length - 8
  for (let i = 0; i < 8; i++) {
    padding[lenOffset + i] = Number((bitLen >> BigInt((7 - i) * 8)) & 0xffn)
  }
  return padding
}

function sha256(message: Uint8Array): Uint32Array {
  const padding = computeMdPadding(message.length)
  const padded = new Uint8Array(message.length + padding.length)
  padded.set(message)
  padded.set(padding, message.length)
  return compressBlocks(H_INIT, padded)
}

export function sha256Hex(message: Uint8Array): string {
  return wordsToHex(sha256(message))
}

function wordsToHex(words: Uint32Array): string {
  return Array.from(words).map((w) => w.toString(16).padStart(8, '0')).join('')
}

function hexToWords(hex: string): Uint32Array {
  if (!/^[0-9a-fA-F]{64}$/.test(hex)) {
    throw new CipherError('INVALID_INPUT', 'Digest must be exactly 64 hex characters (256 bits).')
  }
  const words = new Uint32Array(8)
  for (let i = 0; i < 8; i++) {
    words[i] = parseInt(hex.slice(i * 8, i * 8 + 8), 16)
  }
  return words
}

/**
 * Simulates the vulnerable server-side check `H(secret || message) === providedMac`.
 * Used only by the demo UI/tests to prove the forged MAC is accepted — the
 * attack itself (`forgeLengthExtension`) never touches `secret`.
 */
export class VulnerableMac {
  constructor(private readonly secret: Uint8Array) {}

  sign(message: Uint8Array): string {
    const combined = new Uint8Array(this.secret.length + message.length)
    combined.set(this.secret)
    combined.set(message, this.secret.length)
    return sha256Hex(combined)
  }

  verify(message: Uint8Array, macHex: string): boolean {
    return this.sign(message) === macHex.toLowerCase()
  }
}

/**
 * Forge a valid MAC for `originalMessage || gluePadding || appendData` given
 * only:
 *  - `knownMacHex`: H(secret || originalMessage)
 *  - `secretLengthGuess`: attacker's guess at `secret`'s byte length
 *  - `originalMessage` / `appendData`
 * No knowledge of `secret`'s bytes is required or used.
 */
export function forgeLengthExtension(
  knownMacHex: string,
  secretLengthGuess: number,
  originalMessage: Uint8Array,
  appendData: Uint8Array
): ForgeResult {
  if (secretLengthGuess < 0 || !Number.isInteger(secretLengthGuess)) {
    throw new CipherError('INVALID_INPUT', 'secretLengthGuess must be a non-negative integer.')
  }
  const steps: LengthExtensionStep[] = []

  const knownState = hexToWords(knownMacHex)
  steps.push({
    label: 'Parse leaked MAC',
    detail: `Loaded H(secret || message) = ${knownMacHex} as the 8-word internal SHA-256 state — this is all the attacker ever needed from the leaked digest.`,
  })

  const originalTotalLen = secretLengthGuess + originalMessage.length
  const gluePadding = computeMdPadding(originalTotalLen)
  steps.push({
    label: 'Reconstruct glue padding',
    detail: `Guessed secret length = ${secretLengthGuess} bytes, so secret||message = ${originalTotalLen} bytes. Standard SHA-256 padding for that length is reproducible without the secret: ${gluePadding.length} bytes (0x80, zero fill, 64-bit bit-length).`,
  })

  const forgedMessage = new Uint8Array(originalMessage.length + gluePadding.length + appendData.length)
  forgedMessage.set(originalMessage)
  forgedMessage.set(gluePadding, originalMessage.length)
  forgedMessage.set(appendData, originalMessage.length + gluePadding.length)

  const processedSoFar = originalTotalLen + gluePadding.length
  const appendPadding = computeMdPadding(processedSoFar + appendData.length)
  const finalBlock = new Uint8Array(appendData.length + appendPadding.length)
  finalBlock.set(appendData)
  finalBlock.set(appendPadding, appendData.length)

  steps.push({
    label: 'Resume compression from leaked state',
    detail: `Fed attacker_data (${appendData.length} bytes) plus its own SHA-256 padding into the compression function, continuing from the leaked state instead of H_INIT — the "extension" step.`,
  })

  const forgedState = compressBlocks(knownState, finalBlock)
  const forgedHashHex = wordsToHex(forgedState)

  steps.push({
    label: 'Forged MAC produced',
    detail: `H(secret || forgedMessage) = ${forgedHashHex}, computed with zero knowledge of \`secret\`'s contents.`,
  })

  return { forgedMessage, forgedHashHex, gluePadding, steps }
}
