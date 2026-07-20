/**
 * Salsa20 — Daniel J. Bernstein, 2005. ARX stream cipher, 20 rounds
 * of add-rotate-XOR quarter-rounds over a 4x4 32-bit state matrix.
 * This implementation is built from scratch to avoid external dependencies.
 * @see CIPHER_ENGINE.md Part 2 pattern (instrumented vs fast path, §5.6)
 */

import type { CipherResult, CipherStep, CipherOptions, TestVector } from '../types'
import { CipherError, validateInput, validateKey, toByteArray, fromByteArray } from '../../utils'

const METADATA = {
  name: 'Salsa20',
  keySize: 256,
  securityStatus: 'secure' as const,
  yearDesigned: 2005,
  standardBody: 'eSTREAM portfolio',
}

/** Key format: "<64-char hex key>|<16-char hex nonce>" */
function parseKeyAndNonce(key: string): { keyBytes: Uint8Array; nonce: Uint8Array } {
  validateKey(key)
  const parts = key.split('|')
  if (parts.length !== 2) {
    throw new CipherError('INVALID_KEY', 'Salsa20 key must be formatted as "<64-char hex key>|<16-char hex nonce>".')
  }
  const [keyHex, nonceHex] = parts
  if (!/^[0-9a-fA-F]{64}$/.test(keyHex)) {
    throw new CipherError('INVALID_KEY_LENGTH', `Salsa20 key must be 32 bytes (64 hex chars), got ${keyHex.length}.`)
  }
  if (!/^[0-9a-fA-F]{16}$/.test(nonceHex)) {
    throw new CipherError('INVALID_IV', `Salsa20 nonce must be 8 bytes (16 hex chars), got ${nonceHex.length}.`)
  }
  return { keyBytes: toByteArray(keyHex, 'hex'), nonce: toByteArray(nonceHex, 'hex') }
}

function rotl(x: number, n: number): number {
  return ((x << n) | (x >>> (32 - n))) >>> 0
}

function quarterRound(y0: number, y1: number, y2: number, y3: number): [number, number, number, number] {
  y1 = (y1 ^ rotl((y0 + y3) >>> 0, 7)) >>> 0
  y2 = (y2 ^ rotl((y1 + y0) >>> 0, 9)) >>> 0
  y3 = (y3 ^ rotl((y2 + y1) >>> 0, 13)) >>> 0
  y0 = (y0 ^ rotl((y3 + y2) >>> 0, 18)) >>> 0
  return [y0, y1, y2, y3]
}

function salsa20Block(key: Uint8Array, nonce: Uint8Array, counter: Uint8Array): Uint8Array {
  const state = new Uint32Array(16)
  const constants = [0x61707865, 0x3320646e, 0x79622d32, 0x6b206574]
  
  // Constants
  state[0] = constants[0]; state[5] = constants[1]; state[10] = constants[2]; state[15] = constants[3]
  
  // Key (32 bytes)
  for (let i = 0; i < 4; i++) {
    state[1 + i] = key[i * 4] | (key[i * 4 + 1] << 8) | (key[i * 4 + 2] << 16) | (key[i * 4 + 3] << 24)
    state[11 + i] = key[16 + i * 4] | (key[16 + i * 4 + 1] << 8) | (key[16 + i * 4 + 2] << 16) | (key[16 + i * 4 + 3] << 24)
  }
  
  // Nonce (8 bytes)
  state[6] = nonce[0] | (nonce[1] << 8) | (nonce[2] << 16) | (nonce[3] << 24)
  state[7] = nonce[4] | (nonce[5] << 8) | (nonce[6] << 16) | (nonce[7] << 24)
  
  // Counter (8 bytes)
  state[8] = counter[0] | (counter[1] << 8) | (counter[2] << 16) | (counter[3] << 24)
  state[9] = counter[4] | (counter[5] << 8) | (counter[6] << 16) | (counter[7] << 24)

  const working = new Uint32Array(state)
  for (let i = 0; i < 20; i += 2) {
    // Column rounds
    [working[0], working[4], working[8], working[12]] = quarterRound(working[0], working[4], working[8], working[12]);
    [working[5], working[9], working[13], working[1]] = quarterRound(working[5], working[9], working[13], working[1]);
    [working[10], working[14], working[2], working[6]] = quarterRound(working[10], working[14], working[2], working[6]);
    [working[15], working[3], working[7], working[11]] = quarterRound(working[15], working[3], working[7], working[11]);
    // Row rounds
    [working[0], working[1], working[2], working[3]] = quarterRound(working[0], working[1], working[2], working[3]);
    [working[5], working[6], working[7], working[4]] = quarterRound(working[5], working[6], working[7], working[4]);
    [working[10], working[11], working[8], working[9]] = quarterRound(working[10], working[11], working[8], working[9]);
    [working[15], working[12], working[13], working[14]] = quarterRound(working[15], working[12], working[13], working[14]);
  }

  const out = new Uint8Array(64)
  for (let i = 0; i < 16; i++) {
    const val = (working[i] + state[i]) >>> 0
    out[i * 4] = val & 0xff
    out[i * 4 + 1] = (val >>> 8) & 0xff
    out[i * 4 + 2] = (val >>> 16) & 0xff
    out[i * 4 + 3] = (val >>> 24) & 0xff
  }
  return out
}

function salsaCore(input: string, key: string, decrypt: boolean, instrument: boolean): CipherResult {
  const start = performance.now()
  const { keyBytes, nonce } = parseKeyAndNonce(key)
  const inputBytes = decrypt ? toByteArray(input, 'hex') : toByteArray(input, 'utf8')

  const outputBytes = new Uint8Array(inputBytes.length)
  const counter = new Uint8Array(8)
  
  for (let i = 0; i < inputBytes.length; i += 64) {
    const keystream = salsa20Block(keyBytes, nonce, counter)
    for (let j = 0; j < 64 && i + j < inputBytes.length; j++) {
      outputBytes[i + j] = inputBytes[i + j] ^ keystream[j]
    }
    // Increment 64-bit counter
    for (let k = 0; k < 8; k++) {
      if (++counter[k] !== 0) break
    }
  }

  const steps: CipherStep[] = []
  if (instrument) {
    steps.push({
      index: 0,
      label: 'Key + nonce setup',
      inputState: fromByteArray(keyBytes, 'hex'),
      outputState: fromByteArray(nonce, 'hex'),
      note: `256-bit key and 64-bit nonce loaded into the 4x4 state matrix alongside the "expand 32-byte k" constants.`,
      isMilestone: true,
    })
    const [a, b, c, d] = quarterRound(0x61707865, 0x3320646e, 0x79622d32, 0x6b206574)
    steps.push({
      index: 1,
      label: 'Quarter-round diffusion (illustrative)',
      inputState: '61707865 3320646e 79622d32 6b206574',
      outputState: `${a.toString(16)} ${b.toString(16)} ${c.toString(16)} ${d.toString(16)}`,
      note: 'Each quarter-round applies 4 ADD-ROTATE-XOR steps; the full block runs 8 column+row rounds (20 total) across all 16 state words.',
    })

    steps.push({
      index: steps.length,
      label: 'Keystream XOR',
      inputState: fromByteArray(inputBytes, 'hex'),
      outputState: fromByteArray(outputBytes, 'hex'),
      note: `${decrypt ? 'Decrypted' : 'Encrypted'} by XORing input with the generated Salsa20 keystream (self-inverse — same operation both directions).`,
      isMilestone: true,
    })
  }

  return {
    output: decrypt ? fromByteArray(outputBytes, 'utf8') : fromByteArray(outputBytes, 'hex'),
    outputEncoding: decrypt ? 'utf8' : 'hex',
    steps,
    metadata: METADATA,
    durationMs: performance.now() - start,
  }
}

export function encrypt(input: string, key: string, options: CipherOptions = {}): CipherResult {
  validateInput(input)
  return salsaCore(input, key, false, !!options.instrument)
}

export function decrypt(input: string, key: string, options: CipherOptions = {}): CipherResult {
  validateInput(input)
  return salsaCore(input, key, true, !!options.instrument)
}

// PLACEHOLDER — replace with a real ECRYPT Salsa20 test vector, verified
// locally against @noble/ciphers output, before opening the PR.
export const TEST_VECTORS: TestVector[] = [
  {
    input: '0000000000000000',
    key: '0100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000|0000000000000000',
    expected: 'REPLACE_ME_WITH_VERIFIED_OUTPUT',
    description: 'PLACEHOLDER — run locally and replace with a real ECRYPT vector before merging.',
  },
]
