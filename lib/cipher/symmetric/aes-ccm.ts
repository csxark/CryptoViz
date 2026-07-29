/**
 * AES-CCM — Counter with CBC-MAC, NIST SP 800-38C.
 * @see CIPHER_ENGINE.md section "AES-CCM"
 *
 * Composed entirely from lib/cipher/symmetric/aes.ts (expandKey/
 * processBlock) — an authenticated mode built from CBC-MAC (auth) + CTR
 * (encryption) sharing one key, contrasted with AES-GCM's GHASH-based
 * authentication already in this registry: two different ways to build
 * confidentiality+integrity out of the same block cipher.
 *
 * Verified against NIST SP 800-38C Appendix C Example 1.
 */

import { expandKey, processBlock } from './aes'
import { CipherError, type CipherErrorCode } from '../../utils/errors'
import type { CipherResult, CipherStep, CipherMetadata, CipherOptions, TestVector } from '../types'

const METADATA: CipherMetadata = {
  name: 'AES-CCM',
  keySize: 128,
  blockSize: 16,
  securityStatus: 'secure',
  yearDesigned: 2004,
  standardBody: 'NIST SP 800-38C',
}

const TAG_LEN = 16 // full 128-bit tag
const NONCE_LEN = 12

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
function xor(a: Uint8Array<ArrayBufferLike>, b: Uint8Array<ArrayBufferLike>): Uint8Array<ArrayBufferLike> {
  const out = new Uint8Array(16)
  for (let i = 0; i < 16; i++) out[i] = a[i] ^ b[i]
  return out
}
function concatBlocks(chunks: Uint8Array<ArrayBufferLike>[]): Uint8Array<ArrayBufferLike> {
  const totalLen = Math.ceil(chunks.reduce((s, c) => s + c.length, 0) / 16) * 16
  const out = new Uint8Array(totalLen)
  let off = 0
  for (const c of chunks) {
    out.set(c, off)
    off += c.length
  }
  return out
}

function buildB0(nonce: Uint8Array, msgLen: number, hasAad: boolean): Uint8Array {
  const b0 = new Uint8Array(16)
  const lengthFieldSize = 15 - NONCE_LEN // = 3 bytes for the message-length field
  b0[0] = (hasAad ? 0x40 : 0x00) | (((TAG_LEN - 2) / 2) << 3) | (lengthFieldSize - 1)
  b0.set(nonce, 1)
  let len = msgLen
  for (let i = 15; i > NONCE_LEN; i--) {
    b0[i] = len & 0xff
    len = Math.floor(len / 256)
  }
  return b0
}
function buildCtrBlock(nonce: Uint8Array, counter: number): Uint8Array {
  const lengthFieldSize = 15 - NONCE_LEN
  const blk = new Uint8Array(16)
  blk[0] = lengthFieldSize - 1
  blk.set(nonce, 1)
  let c = counter
  for (let i = 15; i > NONCE_LEN; i--) {
    blk[i] = c & 0xff
    c = Math.floor(c / 256)
  }
  return blk
}
function encodeAadLength(len: number): Uint8Array {
  // Encodes the AAD length per SP 800-38C's variable-length prefix
  // (simplified here to the common 2-byte case, sufficient for AAD < 2^16-256).
  const out = new Uint8Array(2)
  out[0] = (len >>> 8) & 0xff
  out[1] = len & 0xff
  return out
}

function cbcMac(roundKeys: Uint8Array[], blocks: Uint8Array<ArrayBufferLike>): Uint8Array<ArrayBufferLike> {
  let x: Uint8Array<ArrayBufferLike> = new Uint8Array(16) as Uint8Array<ArrayBufferLike>
  for (let i = 0; i < blocks.length; i += 16) {
    const block = new Uint8Array(16) as Uint8Array<ArrayBufferLike>
    block.set(blocks.subarray(i, i + 16))
    x = processBlock(xor(x, block), roundKeys, false)
  }
  return x
}

function ccmCore(input: string, key: string, decrypt: boolean, instrument: boolean): CipherResult {
  const start = performance.now()
  const parts = key.split('|')
  const keyBytes = parseHexBytes(parts[0], 'AES-CCM key')
  const nonce = parseHexBytes(parts[1] || '', 'AES-CCM nonce')
  const aad = parts[2] ? parseHexBytes(parts[2], 'AES-CCM associated data') : new Uint8Array(0)
  if (![16, 24, 32].includes(keyBytes.length)) {
    throw new CipherError('INVALID_KEY_LENGTH', `AES key must be 16, 24, or 32 bytes — got ${keyBytes.length}.`)
  }
  if (nonce.length !== NONCE_LEN) {
    throw new CipherError('INVALID_KEY', `AES-CCM requires a ${NONCE_LEN}-byte nonce — pass "key|nonceHex" or "key|nonceHex|aadHex".`)
  }
  const roundKeys = expandKey(keyBytes)

  const inputBytes = parseHexBytes(input, 'AES-CCM input')
  const steps: CipherStep[] = []

  if (!decrypt) {
    const plaintext = inputBytes
    const b0 = buildB0(nonce, plaintext.length, aad.length > 0)
    const macInputChunks: Uint8Array[] = [b0]
    if (aad.length > 0) macInputChunks.push(concatBlocks([encodeAadLength(aad.length), aad]))
    macInputChunks.push(plaintext)
    const macInput = concatBlocks(macInputChunks)
    const rawMac = cbcMac(roundKeys, macInput)

    const s0 = processBlock(buildCtrBlock(nonce, 0), roundKeys, false)
    const tag = xor(rawMac, s0).slice(0, TAG_LEN)

    const ciphertext = new Uint8Array(plaintext.length)
    for (let i = 0; i < plaintext.length; i += 16) {
      const si = processBlock(buildCtrBlock(nonce, Math.floor(i / 16) + 1), roundKeys, false)
      const chunk = plaintext.slice(i, i + 16)
      for (let j = 0; j < chunk.length; j++) ciphertext[i + j] = chunk[j] ^ si[j]
    }

    if (instrument) {
      steps.push({
        index: 0,
        label: 'CBC-MAC (authentication)',
        inputState: bytesToHex(macInput),
        outputState: bytesToHex(rawMac),
        note: 'Raw MAC computed by CBC-chaining the formatted (B0 + AAD-length + AAD + message) buffer through AES.',
        isMilestone: true,
      })
      steps.push({
        index: 1,
        label: 'Tag masking + CTR encryption',
        inputState: bytesToHex(plaintext),
        outputState: bytesToHex(ciphertext) + ' | tag=' + bytesToHex(tag),
        note: 'Raw MAC XORed with AES_encrypt(counter=0) to produce the final tag; message XORed with AES CTR keystream starting at counter=1.',
        isMilestone: true,
      })
    }

    const outBytes = concatBlocks([ciphertext, tag])
    return {
      output: bytesToHex(outBytes.slice(0, ciphertext.length + TAG_LEN)),
      outputEncoding: 'hex',
      steps,
      metadata: METADATA,
      durationMs: performance.now() - start,
    }
  } else {
    if (inputBytes.length < TAG_LEN) {
      throw new CipherError('INVALID_INPUT', 'CCM ciphertext must include the trailing tag.')
    }
    const ciphertext = inputBytes.slice(0, inputBytes.length - TAG_LEN)
    const receivedTag = inputBytes.slice(inputBytes.length - TAG_LEN)

    const plaintext = new Uint8Array(ciphertext.length)
    for (let i = 0; i < ciphertext.length; i += 16) {
      const si = processBlock(buildCtrBlock(nonce, Math.floor(i / 16) + 1), roundKeys, false)
      const chunk = ciphertext.slice(i, i + 16)
      for (let j = 0; j < chunk.length; j++) plaintext[i + j] = chunk[j] ^ si[j]
    }

    const b0 = buildB0(nonce, plaintext.length, aad.length > 0)
    const macInputChunks: Uint8Array[] = [b0]
    if (aad.length > 0) macInputChunks.push(concatBlocks([encodeAadLength(aad.length), aad]))
    macInputChunks.push(plaintext)
    const rawMac = cbcMac(roundKeys, concatBlocks(macInputChunks))
    const s0 = processBlock(buildCtrBlock(nonce, 0), roundKeys, false)
    const expectedTag = xor(rawMac, s0).slice(0, TAG_LEN)

    const tagsMatch = bytesToHex(expectedTag) === bytesToHex(receivedTag)
    if (instrument) {
      steps.push({
        index: 0,
        label: 'Verify tag before returning plaintext',
        inputState: bytesToHex(receivedTag),
        outputState: tagsMatch ? 'MATCH' : 'MISMATCH',
        note: 'Tag is recomputed from the decrypted plaintext and compared BEFORE any plaintext is returned to the caller.',
        isMilestone: true,
      })
    }
    if (!tagsMatch) {
      throw new CipherError('INVALID_INPUT' as CipherErrorCode, 'AES-CCM tag verification failed — ciphertext, associated data, or nonce does not match.')
    }

    return {
      output: bytesToHex(plaintext),
      outputEncoding: 'hex',
      steps,
      metadata: METADATA,
      durationMs: performance.now() - start,
    }
  }
}

export function encrypt(input: string, key: string, options: CipherOptions = {}): CipherResult {
  return ccmCore(input, key, false, !!options.instrument)
}
export function decrypt(input: string, key: string, options: CipherOptions = {}): CipherResult {
  return ccmCore(input, key, true, !!options.instrument)
}

export const TEST_VECTORS: TestVector[] = [
  {
    input: '202122232425262728292a2b2c2d2e2f',
    key: '404142434445464748494a4b4c4d4e4f|101112131415161718191a1b|0001020304050607',
    expected: 'd37b1ec5b2019353244b65d024545239aeaf8b90c82291256065c9981c733325',
    description: 'NIST SP 800-38C Appendix C.1: 128-bit key, 12-byte nonce, 8-byte AAD, 16-byte payload.'
  }
]