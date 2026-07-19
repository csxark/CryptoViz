/**
 * AES-GCM — authenticated encryption (AEAD).
 * NIST SP 800-38D (Galois/Counter Mode).
 *
 * GCM = CTR-mode confidentiality + a GHASH authentication tag. The plaintext is
 * encrypted with AES in counter mode (a keystream XORed with the data), and a
 * separate GHASH pass over the associated data and ciphertext produces a 128-bit
 * tag that binds them together. Flipping a single ciphertext (or AAD) byte makes
 * the recomputed tag disagree, so decryption *rejects* the message instead of
 * returning garbage — that is the integrity guarantee CTR/CBC alone don't give.
 *
 * Real mode: the authoritative ciphertext + tag are produced by WebCrypto
 * (crypto.subtle AES-GCM), as GUIDELINES prescribe. A parallel, pure-TypeScript
 * CTR + GHASH implementation (verified against the NIST/McGrew-Viega GCM test
 * vectors — see tests/unit/symmetric/aes-gcm.test.ts) drives the instrumented
 * visualization steps, so the visual walkthrough matches the real output
 * byte-for-byte without ever being used to protect sensitive data.
 *
 * @see CIPHER_ENGINE.md line ~651 ("GCM = CTR + GHASH")
 */

import type { CipherResult, CipherStep, CipherOptions, TestVector } from '../types'
import { CipherError, validateInput, toByteArray, fromByteArray } from '../../utils'
import { expandKey, processBlock } from './aes'

const METADATA = {
  name: 'AES-GCM (Galois/Counter Mode)',
  securityStatus: 'secure' as const,
  breakingComplexity: '2^128 (confidentiality) / 2^128 forgery resistance per 128-bit tag',
  yearDesigned: 2007,
  standardBody: 'NIST SP 800-38D',
  blockSize: 16,
}

// GCM is standardised around a 96-bit (12-byte) IV; that is what WebCrypto and
// every common protocol (TLS 1.3, WireGuard) use, and what this module supports.
const GCM_IV_BYTES = 12
const TAG_BYTES = 16

// ---------------------------------------------------------------------------
// WebCrypto (real mode) plumbing
// ---------------------------------------------------------------------------

function getSubtle(): SubtleCrypto {
  const subtle = globalThis.crypto?.subtle
  if (!subtle) {
    throw new CipherError(
      'WEBCRYPTO_UNAVAILABLE',
      'WebCrypto (crypto.subtle) is unavailable in this environment; AES-GCM real mode requires it.'
    )
  }
  return subtle
}

// crypto.subtle's DOM types want a BufferSource backed by a (non-shared)
// ArrayBuffer; our Uint8Arrays always are at runtime, so this narrowing is safe.
function asBufferSource(bytes: Uint8Array): BufferSource {
  return bytes as unknown as BufferSource
}

async function subtleGcmEncrypt(
  keyBytes: Uint8Array,
  iv: Uint8Array,
  plaintext: Uint8Array,
  aad: Uint8Array
): Promise<{ ciphertext: Uint8Array; tag: Uint8Array }> {
  const subtle = getSubtle()
  const key = await subtle.importKey('raw', asBufferSource(keyBytes), { name: 'AES-GCM' }, false, ['encrypt'])
  const params: AesGcmParams = { name: 'AES-GCM', iv: asBufferSource(iv), tagLength: TAG_BYTES * 8 }
  if (aad.length) params.additionalData = asBufferSource(aad)
  const combined = new Uint8Array(await subtle.encrypt(params, key, asBufferSource(plaintext)))
  // WebCrypto returns ciphertext || tag.
  return {
    ciphertext: combined.slice(0, combined.length - TAG_BYTES),
    tag: combined.slice(combined.length - TAG_BYTES),
  }
}

async function subtleGcmDecrypt(
  keyBytes: Uint8Array,
  iv: Uint8Array,
  ciphertext: Uint8Array,
  tag: Uint8Array,
  aad: Uint8Array
): Promise<Uint8Array> {
  const subtle = getSubtle()
  const key = await subtle.importKey('raw', asBufferSource(keyBytes), { name: 'AES-GCM' }, false, ['decrypt'])
  const params: AesGcmParams = { name: 'AES-GCM', iv: asBufferSource(iv), tagLength: TAG_BYTES * 8 }
  if (aad.length) params.additionalData = asBufferSource(aad)
  const combined = new Uint8Array(ciphertext.length + tag.length)
  combined.set(ciphertext, 0)
  combined.set(tag, ciphertext.length)
  try {
    const plain = await subtle.decrypt(params, key, asBufferSource(combined))
    return new Uint8Array(plain)
  } catch {
    // WebCrypto throws an OperationError (with no useful message) when the tag
    // does not verify. Translate it into a clear, teachable integrity failure.
    throw new CipherError(
      'AUTH_TAG_MISMATCH',
      'AES-GCM authentication failed: the tag does not match. The ciphertext, AAD, IV, or key was altered — GCM refuses to return unauthenticated plaintext.'
    )
  }
}

// ---------------------------------------------------------------------------
// Pure-TypeScript GCM (instrumentation + independently testable primitives)
// ---------------------------------------------------------------------------

// GF(2^128) multiplication per NIST SP 800-38D, Algorithm 1 (bit 0 = MSB of
// byte 0). Used by GHASH; the reduction polynomial is R = 11100001 || 0^120.
function gf128Mul(X: Uint8Array, Y: Uint8Array): Uint8Array {
  const Z = new Uint8Array(16)
  const V = new Uint8Array(Y)
  for (let i = 0; i < 128; i++) {
    if ((X[i >> 3] >> (7 - (i & 7))) & 1) {
      for (let j = 0; j < 16; j++) Z[j] ^= V[j]
    }
    const lsb = V[15] & 1
    for (let j = 15; j > 0; j--) {
      V[j] = ((V[j] >> 1) | (V[j - 1] << 7)) & 0xff
    }
    V[0] = V[0] >> 1
    if (lsb) V[0] ^= 0xe1
  }
  return Z
}

// GHASH_H(data): data must already be a multiple of the 16-byte block size.
function ghash(H: Uint8Array, data: Uint8Array, onBlock?: (y: Uint8Array, i: number) => void): Uint8Array {
  let Y: Uint8Array = new Uint8Array(16)
  for (let i = 0; i < data.length; i += 16) {
    for (let j = 0; j < 16; j++) Y[j] ^= data[i + j]
    Y = gf128Mul(Y, H)
    onBlock?.(Y, i / 16)
  }
  return Y
}

// Increment the rightmost 32 bits of a counter block (mod 2^32), big-endian.
function inc32(block: Uint8Array): Uint8Array {
  const out = new Uint8Array(block)
  for (let i = 15; i >= 12; i--) {
    out[i] = (out[i] + 1) & 0xff
    if (out[i] !== 0) break
  }
  return out
}

// Pad `bytes` up to the next 16-byte boundary with zeros.
function zeroPadLen(len: number): number {
  return (16 - (len % 16)) % 16
}

function writeUint64BE(target: Uint8Array, offset: number, value: bigint): void {
  for (let i = 7; i >= 0; i--) {
    target[offset + i] = Number(value & 0xffn)
    value >>= 8n
  }
}

// Build the GHASH input: A || 0* || C || 0* || [len(A)]64 || [len(C)]64 (bits).
function buildGhashData(aad: Uint8Array, ciphertext: Uint8Array): Uint8Array {
  const aadPad = zeroPadLen(aad.length)
  const ctPad = zeroPadLen(ciphertext.length)
  const data = new Uint8Array(aad.length + aadPad + ciphertext.length + ctPad + 16)
  let o = 0
  data.set(aad, o)
  o += aad.length + aadPad
  data.set(ciphertext, o)
  o += ciphertext.length + ctPad
  writeUint64BE(data, o, BigInt(aad.length) * 8n)
  writeUint64BE(data, o + 8, BigInt(ciphertext.length) * 8n)
  return data
}

// GCTR: AES-CTR with a 32-bit incrementing counter, starting at `icb`.
function gctr(roundKeys: Uint8Array[], icb: Uint8Array, input: Uint8Array): Uint8Array {
  const out = new Uint8Array(input.length)
  let counter: Uint8Array = new Uint8Array(icb)
  const numBlocks = Math.ceil(input.length / 16)
  for (let b = 0; b < numBlocks; b++) {
    const keystream = processBlock(counter, roundKeys, false)
    const offset = b * 16
    const blockLen = Math.min(16, input.length - offset)
    for (let i = 0; i < blockLen; i++) out[offset + i] = input[offset + i] ^ keystream[i]
    counter = inc32(counter)
  }
  return out
}

function computeJ0(iv: Uint8Array): Uint8Array {
  // For a 96-bit IV, J0 = IV || 0x00000001.
  const j0 = new Uint8Array(16)
  j0.set(iv)
  j0[15] = 1
  return j0
}

interface GcmRaw {
  ciphertext: Uint8Array
  tag: Uint8Array
}

/**
 * Reference GCM encryption in pure TypeScript. Exported for the NIST test
 * vectors; the visualizer uses WebCrypto for the authoritative output.
 */
export function gcmEncryptRaw(
  keyBytes: Uint8Array,
  iv: Uint8Array,
  plaintext: Uint8Array,
  aad: Uint8Array = new Uint8Array(0)
): GcmRaw {
  const roundKeys = expandKey(keyBytes)
  const H = processBlock(new Uint8Array(16), roundKeys, false)
  const j0 = computeJ0(iv)
  const ciphertext = gctr(roundKeys, inc32(j0), plaintext)
  const S = ghash(H, buildGhashData(aad, ciphertext))
  const ej0 = processBlock(j0, roundKeys, false)
  const tag = new Uint8Array(16)
  for (let i = 0; i < 16; i++) tag[i] = S[i] ^ ej0[i]
  return { ciphertext, tag }
}

// ---------------------------------------------------------------------------
// Instrumented step builders (visualization only)
// ---------------------------------------------------------------------------

const ZERO_BLOCK_HEX = '00000000000000000000000000000000'

function buildEncryptSteps(
  keyBytes: Uint8Array,
  iv: Uint8Array,
  plaintext: Uint8Array,
  aad: Uint8Array,
  ciphertext: Uint8Array,
  tag: Uint8Array
): CipherStep[] {
  const roundKeys = expandKey(keyBytes)
  const H = processBlock(new Uint8Array(16), roundKeys, false)
  const j0 = computeJ0(iv)
  const steps: CipherStep[] = []

  steps.push({
    index: steps.length,
    label: 'GCM Setup — Hash Subkey H',
    inputState: ZERO_BLOCK_HEX,
    outputState: fromByteArray(H, 'hex'),
    note: 'H = AES_K(0¹²⁸). This block-cipher encryption of an all-zero block is the multiplication key used by every GHASH step.',
    isMilestone: true,
  })

  steps.push({
    index: steps.length,
    label: 'GCM Pre-Counter Block J0',
    inputState: fromByteArray(iv, 'hex'),
    outputState: fromByteArray(j0, 'hex'),
    note: 'With a 96-bit IV, J0 = IV ‖ 0x00000001. CTR encryption starts at inc32(J0); J0 itself is reserved to mask the final tag.',
    isMilestone: true,
  })

  // CTR-mode confidentiality: keystream XOR plaintext, block by block.
  let counter = inc32(j0)
  const ctrBlocks = Math.ceil(plaintext.length / 16)
  for (let b = 0; b < ctrBlocks; b++) {
    const keystream = processBlock(counter, roundKeys, false)
    const offset = b * 16
    const blockLen = Math.min(16, plaintext.length - offset)
    const ptBlock = plaintext.slice(offset, offset + blockLen)
    const ctBlock = ciphertext.slice(offset, offset + blockLen)
    steps.push({
      index: steps.length,
      label: `Block ${b + 1} — CTR Keystream`,
      inputState: fromByteArray(counter, 'hex'),
      outputState: fromByteArray(keystream, 'hex'),
      note: `Encrypted counter block ${b + 1} with AES to produce this block's keystream.`,
      isMilestone: b === 0,
    })
    steps.push({
      index: steps.length,
      label: `Block ${b + 1} — CTR Encrypt (XOR)`,
      inputState: fromByteArray(ptBlock, 'hex'),
      outputState: fromByteArray(ctBlock, 'hex'),
      note: 'XORed the plaintext block with the keystream to produce the ciphertext block (confidentiality only — no integrity yet).',
    })
    counter = inc32(counter)
  }

  // GHASH authentication: fold AAD + ciphertext + lengths into the tag.
  const ghashData = buildGhashData(aad, ciphertext)
  steps.push({
    index: steps.length,
    label: 'GHASH — Authentication Input',
    inputState: `AAD ${aad.length}B ‖ ciphertext ${ciphertext.length}B`,
    outputState: fromByteArray(ghashData, 'hex'),
    note: 'GHASH runs over AAD ‖ 0* ‖ ciphertext ‖ 0* ‖ len(AAD)₆₄ ‖ len(C)₆₄, so both the associated data and every ciphertext byte are authenticated.',
    isMilestone: true,
  })

  const totalGhashBlocks = ghashData.length / 16
  ghash(H, ghashData, (Y, i) => {
    // Instrument the first, second, and last accumulation to keep the trace
    // readable on large inputs while still showing the running GHASH state.
    if (i === 0 || i === 1 || i === totalGhashBlocks - 1) {
      steps.push({
        index: steps.length,
        label: `GHASH — Accumulate Block ${i + 1}/${totalGhashBlocks}`,
        inputState: fromByteArray(ghashData.slice(i * 16, i * 16 + 16), 'hex'),
        outputState: fromByteArray(Y, 'hex'),
        note: 'Yᵢ = (Yᵢ₋₁ ⊕ blockᵢ) · H in GF(2¹²⁸). Multiplying by H after each XOR chains every block into a single 128-bit accumulator.',
      })
    }
  })

  const S = ghash(H, ghashData)
  const ej0 = processBlock(j0, roundKeys, false)
  steps.push({
    index: steps.length,
    label: 'Authentication Tag = GHASH ⊕ AES_K(J0)',
    inputState: `S=${fromByteArray(S, 'hex')} ⊕ E(J0)=${fromByteArray(ej0, 'hex')}`,
    outputState: fromByteArray(tag, 'hex'),
    note: 'The final GHASH value S is masked by AES_K(J0) to form the 128-bit tag. Encrypting the mask stops an attacker who can see S from forging tags.',
    isMilestone: true,
  })

  steps.push({
    index: steps.length,
    label: 'AES-GCM Sealed Output',
    inputState: `IV ${iv.length}B ‖ ciphertext ${ciphertext.length}B ‖ tag 16B`,
    outputState: fromByteArray(iv, 'hex') + fromByteArray(ciphertext, 'hex') + fromByteArray(tag, 'hex'),
    note: 'Output is IV ‖ ciphertext ‖ tag. Confidentiality comes from CTR; integrity/authenticity from the GHASH tag.',
    isMilestone: true,
  })

  return steps
}

function buildDecryptSteps(
  keyBytes: Uint8Array,
  iv: Uint8Array,
  ciphertext: Uint8Array,
  tag: Uint8Array,
  aad: Uint8Array,
  plaintext: Uint8Array
): CipherStep[] {
  const roundKeys = expandKey(keyBytes)
  const H = processBlock(new Uint8Array(16), roundKeys, false)
  const j0 = computeJ0(iv)
  const steps: CipherStep[] = []

  steps.push({
    index: steps.length,
    label: 'GCM Setup — Hash Subkey H',
    inputState: ZERO_BLOCK_HEX,
    outputState: fromByteArray(H, 'hex'),
    note: 'H = AES_K(0¹²⁸), recomputed by the receiver to re-derive the authentication tag.',
    isMilestone: true,
  })

  // Recompute the expected tag over the received ciphertext first — GCM verifies
  // BEFORE releasing any plaintext.
  const S = ghash(H, buildGhashData(aad, ciphertext))
  const ej0 = processBlock(j0, roundKeys, false)
  const expectedTag = new Uint8Array(16)
  for (let i = 0; i < 16; i++) expectedTag[i] = S[i] ^ ej0[i]

  steps.push({
    index: steps.length,
    label: 'GHASH — Recompute Tag over Received Ciphertext',
    inputState: fromByteArray(ciphertext, 'hex'),
    outputState: fromByteArray(expectedTag, 'hex'),
    note: 'The receiver runs the same GHASH + AES_K(J0) mask over the ciphertext it actually received.',
    isMilestone: true,
  })

  steps.push({
    index: steps.length,
    label: 'Tag Verification',
    inputState: `received ${fromByteArray(tag, 'hex')}`,
    outputState: `expected ${fromByteArray(expectedTag, 'hex')}`,
    note: 'The tags match, so the message is authentic and CTR decryption may proceed. A single flipped byte would make these disagree and abort decryption.',
    isMilestone: true,
  })

  let counter = inc32(j0)
  const ctrBlocks = Math.ceil(ciphertext.length / 16)
  for (let b = 0; b < ctrBlocks; b++) {
    const keystream = processBlock(counter, roundKeys, false)
    const offset = b * 16
    const blockLen = Math.min(16, ciphertext.length - offset)
    steps.push({
      index: steps.length,
      label: `Block ${b + 1} — CTR Decrypt (XOR)`,
      inputState: fromByteArray(ciphertext.slice(offset, offset + blockLen), 'hex'),
      outputState: fromByteArray(plaintext.slice(offset, offset + blockLen), 'hex'),
      note: 'CTR decryption is identical to encryption: XOR the ciphertext block with AES_K(counter) to recover plaintext.',
      isMilestone: b === 0,
    })
    counter = inc32(counter)
  }

  steps.push({
    index: steps.length,
    label: 'AES-GCM Verified Plaintext',
    inputState: `ciphertext ${ciphertext.length}B`,
    outputState: fromByteArray(plaintext, 'hex'),
    note: 'Plaintext is released only because the tag verified first.',
    isMilestone: true,
  })

  return steps
}

// ---------------------------------------------------------------------------
// Key / IV / AAD parsing
// ---------------------------------------------------------------------------

function getKeyBytes(key: string): Uint8Array {
  const keyBytes = /^[0-9a-fA-F]+$/.test(key) && [32, 48, 64].includes(key.length)
    ? toByteArray(key, 'hex')
    : toByteArray(key, 'utf8')

  if (![16, 24, 32].includes(keyBytes.length)) {
    throw new CipherError(
      'INVALID_KEY_LENGTH',
      `AES-GCM key must be 16, 24, or 32 bytes (a 32/48/64-char hex string, or a 16/24/32-char passphrase); got ${keyBytes.length} bytes.`
    )
  }
  return keyBytes
}

function resolveIv(options: CipherOptions): { iv: Uint8Array; provided: boolean } {
  if (options.iv) {
    if (!/^[0-9a-fA-F]{24}$/.test(options.iv)) {
      throw new CipherError('INVALID_IV', 'AES-GCM IV must be exactly 24 hex characters (12 bytes / 96 bits).')
    }
    return { iv: toByteArray(options.iv, 'hex'), provided: true }
  }
  const iv = new Uint8Array(GCM_IV_BYTES)
  globalThis.crypto?.getRandomValues(iv)
  return { iv, provided: false }
}

function resolveAad(options: CipherOptions): Uint8Array {
  const aad = (options as { aad?: string }).aad
  if (!aad) return new Uint8Array(0)
  if (!/^[0-9a-fA-F]*$/.test(aad) || aad.length % 2 !== 0) {
    throw new CipherError('INVALID_AAD', 'AES-GCM associated data (AAD) must be an even-length hex string.')
  }
  return toByteArray(aad, 'hex')
}

// ---------------------------------------------------------------------------
// Public cipher contract
// ---------------------------------------------------------------------------

export async function encrypt(
  input: string,
  key: string,
  options: CipherOptions = {}
): Promise<CipherResult> {
  validateInput(input)
  const start = performance.now()

  const keyBytes = getKeyBytes(key)
  const { iv } = resolveIv(options)
  const aad = resolveAad(options)
  const plaintext = toByteArray(input, options.encoding || 'utf8')

  // Authoritative output comes from WebCrypto (real mode).
  const { ciphertext, tag } = await subtleGcmEncrypt(keyBytes, iv, plaintext, aad)

  const output = fromByteArray(iv, 'hex') + fromByteArray(ciphertext, 'hex') + fromByteArray(tag, 'hex')

  const steps = options.instrument
    ? buildEncryptSteps(keyBytes, iv, plaintext, aad, ciphertext, tag)
    : []

  return {
    output,
    outputEncoding: 'hex',
    steps,
    metadata: { ...METADATA, keySize: keyBytes.length * 8, modeOfOperation: 'GCM' },
    durationMs: performance.now() - start,
  }
}

export async function decrypt(
  input: string,
  key: string,
  options: CipherOptions = {}
): Promise<CipherResult> {
  validateInput(input)
  const start = performance.now()

  const keyBytes = getKeyBytes(key)
  const aad = resolveAad(options)

  const clean = input.trim()
  if (!/^[0-9a-fA-F]*$/.test(clean) || clean.length % 2 !== 0) {
    throw new CipherError('INVALID_INPUT', 'AES-GCM ciphertext must be a hex string (IV ‖ ciphertext ‖ tag).')
  }
  const minHex = (GCM_IV_BYTES + TAG_BYTES) * 2
  if (clean.length < minHex) {
    throw new CipherError(
      'INVALID_INPUT',
      `AES-GCM ciphertext is too short: expected at least a ${GCM_IV_BYTES}-byte IV and a ${TAG_BYTES}-byte tag.`
    )
  }

  const iv = toByteArray(clean.slice(0, GCM_IV_BYTES * 2), 'hex')
  const tag = toByteArray(clean.slice(clean.length - TAG_BYTES * 2), 'hex')
  const ciphertext = toByteArray(clean.slice(GCM_IV_BYTES * 2, clean.length - TAG_BYTES * 2), 'hex')

  // Real mode: WebCrypto verifies the tag and throws on any tampering.
  const plaintext = await subtleGcmDecrypt(keyBytes, iv, ciphertext, tag, aad)

  const steps = options.instrument
    ? buildDecryptSteps(keyBytes, iv, ciphertext, tag, aad, plaintext)
    : []

  const outEnc = options.encoding || 'utf8'
  return {
    output: fromByteArray(plaintext, outEnc),
    outputEncoding: outEnc,
    steps,
    metadata: { ...METADATA, keySize: keyBytes.length * 8, modeOfOperation: 'GCM' },
    durationMs: performance.now() - start,
  }
}

// NIST / McGrew-Viega GCM test vectors are asserted directly in
// tests/unit/symmetric/aes-gcm.test.ts against gcmEncryptRaw(); this array
// satisfies the shared cipher-module contract.
export const TEST_VECTORS: TestVector[] = []
