/**
 * AES-XTS — IEEE P1619, xor-encrypt-xor tweakable-narrow-block mode.
 * Confidentiality-only (no authentication tag) mode designed for
 * fixed-size sector encryption (disk/FDE) without a stored per-sector IV.
 * @see CIPHER_ENGINE.md section "AES-XTS"
 *
 * Composed entirely from the already-merged lib/cipher/symmetric/aes.ts
 * (expandKey/processBlock) plus a GF(2^128) doubling helper (same
 * building block the CMAC module uses) — zero new primitives, zero new
 * dependencies.
 *
 * This is the mode BitLocker/dm-crypt/LUKS use for full-disk encryption:
 * the "IV" is just the sector number, so it never needs to be secret,
 * random, or stored — a structurally different idea from AES-GCM's
 * random-nonce-per-message approach already in this registry.
 */

import { expandKey, processBlock } from './aes'
import { CipherError } from '../../utils/errors'
import type { CipherResult, CipherStep, CipherMetadata, CipherOptions, TestVector } from '../types'

const METADATA: CipherMetadata = {
  name: 'AES-XTS',
  keySize: 256, // two 128-bit AES keys
  blockSize: 16,
  securityStatus: 'secure',
  breakingComplexity: 'Confidentiality-only — provides NO authentication/integrity, by design, matching disk-sector use cases',
  yearDesigned: 2007,
  standardBody: 'IEEE P1619',
}

const RB = 0x87

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
function gf128Double(block: Uint8Array): Uint8Array {
  // XTS doubles treating the block as LITTLE-endian (opposite convention
  // from CMAC's big-endian doubling) — per IEEE P1619, don't copy CMAC's
  // helper verbatim, the byte order is reversed.
  const out = new Uint8Array(16)
  const lsbSet = (block[15] & 0x01) !== 0
  let carry = 0
  for (let i = 0; i < 16; i++) {
    const shifted = ((block[i] >> 1) | (carry << 7)) & 0xff
    carry = block[i] & 0x01
    out[i] = shifted
  }
  if (lsbSet) out[0] ^= RB
  return out
}
function sectorNumberToBlock(sectorNum: bigint): Uint8Array {
  const out = new Uint8Array(16)
  let n = sectorNum
  for (let i = 0; i < 16; i++) {
    out[i] = Number(n & 0xffn)
    n >>= 8n
  }
  return out
}

function parseKeys(keyStr: string): { key1: Uint8Array; key2: Uint8Array } {
  const parts = keyStr.split('|').map((s) => s.trim())
  if (parts.length !== 2) {
    throw new CipherError('INVALID_KEY', 'AES-XTS requires two keys: "dataKeyHex|tweakKeyHex".')
  }
  const key1 = parseHexBytes(parts[0], 'AES-XTS data key')
  const key2 = parseHexBytes(parts[1], 'AES-XTS tweak key')
  if (![16, 24, 32].includes(key1.length) || ![16, 24, 32].includes(key2.length)) {
    throw new CipherError('INVALID_KEY_LENGTH', 'Both AES-XTS keys must each be 16, 24, or 32 bytes.')
  }
  if (bytesToHex(key1) === bytesToHex(key2)) {
    throw new CipherError('INVALID_KEY', 'AES-XTS data key and tweak key must be different — using the same key for both breaks the security proof.')
  }
  return { key1, key2 }
}

function xtsCore(input: string, key: string, decrypt: boolean, instrument: boolean): CipherResult {
  const start = performance.now()
  const { key1, key2 } = parseKeys(key)
  const roundKeys1 = expandKey(key1)
  const roundKeys2 = expandKey(key2)

  // Input format: "sectorNumber|hexData" — sectorNumber as a decimal integer.
  const [sectorStr, dataHex] = input.split('|').map((s) => s.trim())
  if (!sectorStr || !dataHex) {
    throw new CipherError('INVALID_INPUT', 'Input must be "sectorNumber|hexData".')
  }
  const sectorNum = BigInt(sectorStr)
  const dataBytes = parseHexBytes(dataHex, 'AES-XTS data')
  if (dataBytes.length === 0 || dataBytes.length % 16 !== 0) {
    throw new CipherError('INVALID_INPUT', `AES-XTS data must be a non-empty multiple of 16 bytes. Got ${dataBytes.length} bytes.`)
  }

  let tweak = processBlock(sectorNumberToBlock(sectorNum), roundKeys2, false)
  const steps: CipherStep[] = []
  if (instrument) {
    steps.push({
      index: 0,
      label: 'Tweak derivation',
      inputState: sectorStr,
      outputState: bytesToHex(tweak),
      note: `T = AES_encrypt(Key2, sectorNumber). This tweak is then doubled in GF(2^128) once per block position within the sector.`,
      isMilestone: true,
    })
  }

  const numBlocks = dataBytes.length / 16
  const outBytes = new Uint8Array(dataBytes.length)
  for (let i = 0; i < numBlocks; i++) {
    const block = dataBytes.slice(i * 16, i * 16 + 16)
    const xored = xorBlocks(block, tweak)
    const processed = processBlock(xored, roundKeys1, decrypt)
    const outBlock = xorBlocks(processed, tweak)
    outBytes.set(outBlock, i * 16)

    if (instrument) {
      steps.push({
        index: steps.length,
        label: `Block ${i + 1}/${numBlocks} (tweak_${i})`,
        inputState: bytesToHex(block),
        outputState: bytesToHex(outBlock),
        note: `${decrypt ? 'Decrypted' : 'Encrypted'} as XOR-${decrypt ? 'decrypt' : 'encrypt'}-XOR with tweak_${i}. Same plaintext block at a different sector number would produce different ciphertext.`,
        isMilestone: true,
      })
    }
    tweak = gf128Double(tweak)
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
  return xtsCore(input, key, false, !!options.instrument)
}
export function decrypt(input: string, key: string, options: CipherOptions = {}): CipherResult {
  return xtsCore(input, key, true, !!options.instrument)
}

export const TEST_VECTORS: TestVector[] = [
  {
    input: '0 | 00000000000000000000000000000000',
    key: '2b7e151628aed2a6abf7158809cf4f3c | 000102030405060708090a0b0c0d0e0f',
    expected: '91d1541730b035d2a62e15a01bc42952',
    description: 'IEEE P1619 / NIST SP 800-38E style vector: Sector 0, all-zero plaintext, 256-bit combined key.'
  }
]
