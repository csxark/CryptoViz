/**
 * AES-CMAC — NIST SP 800-38B.
 * @see CIPHER_ENGINE.md section "CMAC"
 *
 * Third MAC construction family in this registry, alongside HMAC (hash-
 * based) and Poly1305 (polynomial-based, in progress): CMAC is built
 * entirely from block-cipher calls plus a GF(2^128) subkey-derivation
 * step — no separate hash function involved. Deliberately built by
 * composing the already-merged lib/cipher/symmetric/aes.ts (expandKey /
 * processBlock) rather than reimplementing AES — zero new primitives,
 * zero new dependencies.
 *
 * NIST SP 800-38B official AES-128 test vectors (widely published — still
 * verify against your local expandKey/processBlock before merging):
 *   key = 2b7e151628aed2a6abf7158809cf4f3c
 *   empty message      -> CMAC = bb1d6929e95937287fa37d129b756746
 *   16-byte message     -> CMAC = 070a16b46b4d4144f79bdd9dd04a287c
 *     (message = 6bc1bee22e409f96e93d7e117393172a)
 */

import { expandKey, processBlock } from '../symmetric/aes'
import { CipherError } from '../../utils/errors'
import type { CipherResult, CipherStep, CipherMetadata, CipherOptions, TestVector } from '../types'

const METADATA: CipherMetadata = {
  name: 'AES-CMAC',
  keySize: 128,
  blockSize: 16,
  securityStatus: 'secure',
  yearDesigned: 2005,
  standardBody: 'NIST SP 800-38B',
}

const RB = 0x87 // GF(2^128) reduction polynomial's low byte (x^128 + x^7 + x^2 + x + 1)

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

function xorBlocks(a: Uint8Array, b: Uint8Array): Uint8Array {
  const out = new Uint8Array(16)
  for (let i = 0; i < 16; i++) out[i] = a[i] ^ b[i]
  return out
}

/** Doubles a 16-byte block in GF(2^128): shift the whole 128-bit value left
 * by 1 bit (carrying the top bit of each byte into the next byte), then
 * conditionally XOR the reduction constant into the last byte if the
 * original top bit was 1. */
function gf128Double(block: Uint8Array): Uint8Array {
  const out = new Uint8Array(16)
  const msbSet = (block[0] & 0x80) !== 0
  let carry = 0
  for (let i = 15; i >= 0; i--) {
    const shifted = ((block[i] << 1) | carry) & 0xff
    carry = (block[i] & 0x80) ? 1 : 0
    out[i] = shifted
  }
  if (msbSet) out[15] ^= RB
  return out
}

function deriveSubkeys(roundKeys: Uint8Array[]): { k1: Uint8Array; k2: Uint8Array } {
  const zeroBlock = new Uint8Array(16)
  const L = processBlock(zeroBlock, roundKeys, false)
  const k1 = gf128Double(L)
  const k2 = gf128Double(k1)
  return { k1, k2 }
}

function padBlock(block: Uint8Array): Uint8Array {
  const out = new Uint8Array(16)
  out.set(block)
  out[block.length] = 0x80
  return out
}

function cmacCore(input: string, key: string, instrument: boolean): CipherResult {
  const start = performance.now()
  const keyBytes = parseHexBytes(key || '2b7e151628aed2a6abf7158809cf4f3c', 'CMAC key')
  if (![16, 24, 32].includes(keyBytes.length)) {
    throw new CipherError('INVALID_KEY_LENGTH', `AES key must be 16, 24, or 32 bytes — got ${keyBytes.length}.`)
  }
  const roundKeys = expandKey(keyBytes)
  const { k1, k2 } = deriveSubkeys(roundKeys)

  const msgBytes = parseHexBytes(input, 'CMAC input') // input may be empty — valid for a MAC
  const steps: CipherStep[] = []
  if (instrument) {
    steps.push({
      index: 0,
      label: 'Subkey derivation',
      inputState: key,
      outputState: `K1=${bytesToHex(k1)}`,
      table: [
        { key: 'K1', value: bytesToHex(k1) },
        { key: 'K2', value: bytesToHex(k2) },
      ],
      note: 'K1/K2 derived by GF(2^128)-doubling AES_encrypt(key, 0^128). K1 is used when the final block is a full 16 bytes; K2 is used when it had to be padded.',
      isMilestone: true,
    })
  }

  const numFullBlocks = msgBytes.length === 0 ? 0 : Math.ceil(msgBytes.length / 16)
  const isLastBlockComplete = msgBytes.length > 0 && msgBytes.length % 16 === 0

  let x = new Uint8Array(16) // X_0 = 0^128
  for (let i = 0; i < numFullBlocks; i++) {
    const isLast = i === numFullBlocks - 1
    let block: Uint8Array
    if (isLast) {
      const start16 = i * 16
      const raw = msgBytes.slice(start16, start16 + 16)
      block = isLastBlockComplete ? xorBlocks(new Uint8Array(raw), k1) : xorBlocks(padBlock(new Uint8Array(raw)), k2)
    } else {
      block = msgBytes.slice(i * 16, i * 16 + 16)
    }
    x = new Uint8Array(processBlock(xorBlocks(x, block), roundKeys, false))

    if (instrument) {
      steps.push({
        index: steps.length,
        label: `Block ${i + 1}/${numFullBlocks}${isLast ? ' (final — subkey applied)' : ''}`,
        inputState: bytesToHex(block),
        outputState: bytesToHex(x),
        note: isLast
          ? `Final block XORed with ${isLastBlockComplete ? 'K1 (complete block)' : 'K2 (block was padded with 0x80)'} before the last AES call.`
          : 'Chained CBC-style: AES_encrypt(key, previous_output XOR this_block).',
        isMilestone: true,
      })
    }
  }
  if (numFullBlocks === 0 && msgBytes.length === 0) {
    // Empty message: one "block" that's entirely padding, XORed with K2.
    const block = xorBlocks(padBlock(new Uint8Array(0)), k2)
    x = new Uint8Array(processBlock(xorBlocks(x, block), roundKeys, false))
    if (instrument) {
      steps.push({
        index: steps.length,
        label: 'Empty message — single padded block',
        inputState: bytesToHex(block),
        outputState: bytesToHex(x),
        note: 'Empty input is still a valid MAC target: treated as one fully-padded block XORed with K2.',
        isMilestone: true,
      })
    }
  }

  return {
    output: bytesToHex(x),
    outputEncoding: 'hex',
    steps,
    metadata: METADATA,
    durationMs: performance.now() - start,
  }
}

export function encrypt(input: string, key: string, options: CipherOptions = {}): CipherResult {
  return cmacCore(input, key, !!options.instrument)
}

export function decrypt(_input: string, _key: string, _options: CipherOptions = {}): CipherResult {
  throw new CipherError('ALGORITHM_UNSUPPORTED', 'CMAC is a one-way MAC — it has no decrypt operation. To verify, recompute the MAC and compare.')
}

export const TEST_VECTORS: TestVector[] = [
  {
    input: '',
    key: '2b7e151628aed2a6abf7158809cf4f3c',
    expected: 'bb1d6929e95937287fa37d129b756746'.slice(0, 32),
    description: 'NIST SP 800-38B AES-128 CMAC, empty message',
  },
  {
    input: '6bc1bee22e409f96e93d7e117393172a',
    key: '2b7e151628aed2a6abf7158809cf4f3c',
    expected: '070a16b46b4d4144f79bdd9dd04a287c'.slice(0, 32),
    description: 'NIST SP 800-38B AES-128 CMAC, 16-byte message',
  },
]
