/**
 * ACORN v3 — CAESAR Finalist (Hongjun Wu)
 * 293-bit NLFSR stream cipher with majority/choose nonlinear combiners.
 * 128-bit key, 128-bit nonce, 128-bit tag.
 */
import type { CipherResult, CipherStep, CipherOptions, TestVector, CipherMetadata } from '../types'
import { CipherError } from '../../utils/errors'

const METADATA: CipherMetadata = {
    name: 'ACORN v3',
    keySize: 128,
    blockSize: 128,
    securityStatus: 'secure',
    breakingComplexity: 'CAESAR finalist. No practical attacks on v3.',
    yearDesigned: 2016,
    standardBody: 'CAESAR Competition',
}

// 293-bit state stored as 10 x 32-bit words (320 bits total, top 27 bits unused)
// Tap positions (from MSB of s0): 0, 12, 23, 61, 66, 107, 111, 154, 160, 193, 196, 230, 235, 244, 292

function getBit(state: number[], i: number): number {
    const wordIdx = i >>> 5
    const bitIdx = i & 31
    return (state[wordIdx] >>> bitIdx) & 1
}

function setBit(state: number[], i: number, val: number): void {
    const wordIdx = i >>> 5
    const bitIdx = i & 31
    if (val) state[wordIdx] |= (1 << bitIdx)
    else state[wordIdx] &= ~(1 << bitIdx)
}

function shiftRight(state: number[], newBit: number): void {
    for (let i = 0; i < 9; i++) {
        state[i] = (state[i] >>> 1) | ((state[i + 1] & 1) << 31)
    }
    state[9] = (state[9] >>> 1) | (newBit << 26) // Only 27 bits used in top word
}

function maj(a: number, b: number, c: number): number { return (a & b) ^ (a & c) ^ (b & c) }
function ch(a: number, b: number, c: number): number { return (a & b) ^ (~a & c) }

function acornKeystream(state: number[]): number {
    const s12 = getBit(state, 12)
    const s154 = getBit(state, 154)
    const s235 = getBit(state, 235)
    const s61 = getBit(state, 61)
    const s193 = getBit(state, 193)
    const s230 = getBit(state, 230)
    const s111 = getBit(state, 111)
    const s66 = getBit(state, 66)
    return (s12 ^ s154 ^ maj(s235, s61, s193) ^ ch(s230, s111, s66)) & 1
}

function acornStep(state: number[], ca: number, cb: number, k_t: number): number {
    const s0 = getBit(state, 0)
    const s23 = getBit(state, 23)
    const s107 = getBit(state, 107)
    const s160 = getBit(state, 160)
    const s196 = getBit(state, 196)
    const s244 = getBit(state, 244)

    const keystream = acornKeystream(state)
    const feedback = s0 ^ (s107 ^ 1) ^ maj(s244, s23, s160) ^ (ca & s196) ^ (cb & k_t)

    shiftRight(state, feedback & 1)
    return keystream
}

function parseHex(s: string, lbl: string): Uint8Array {
    const c = s.replace(/\s+/g, '').toLowerCase()
    if (!/^[0-9a-f]*$/.test(c) || c.length % 2 !== 0) throw new CipherError('INVALID_INPUT', `${lbl} must be hex.`)
    const o = new Uint8Array(c.length / 2)
    for (let i = 0; i < c.length; i += 2) o[i / 2] = parseInt(c.slice(i, i + 2), 16)
    return o
}
function toHex(b: Uint8Array | number[]): string {
    return Array.from(b).map(x => x.toString(16).padStart(2, '0')).join('')
}

function constantTimeCompare(a: Uint8Array, b: Uint8Array): boolean {
    if (a.length !== b.length) return false
    let diff = 0
    for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i]
    return diff === 0
}

/**
 * Encrypt cipher-engine utility export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @param plaintext Input required by the Encrypt operation.
 * @param key Input required by the Encrypt operation.
 * @param options Input required by the Encrypt operation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/197/final — FIPS 197.
 */
export function encrypt(plaintext: string, key: string, options: CipherOptions = {}): CipherResult {
    const start = performance.now()
    const keyNonce = parseHex(key, 'ACORN key+nonce')
    if (keyNonce.length !== 32) throw new CipherError('INVALID_KEY_LENGTH', 'INVALID_KEY_LENGTH: Key must be 32 bytes (16-byte key + 16-byte nonce).')

    const K = keyNonce.slice(0, 16)
    const N = keyNonce.slice(16, 32)
    const ad = parseHex((options.ad as string) || '', 'AD')
    const ptBytes = parseHex(plaintext, 'plaintext');
    const outBytes = new Uint8Array(ptBytes.length + 16);

    const state = new Array(10).fill(0)
    const steps: CipherStep[] = []

    // Initialization: load key and nonce
    for (let i = 0; i < 128; i++) setBit(state, i, (K[i >>> 3] >>> (7 - (i & 7))) & 1)
    for (let i = 0; i < 128; i++) setBit(state, 128 + i, (N[i >>> 3] >>> (7 - (i & 7))) & 1)
    for (let i = 256; i < 260; i++) setBit(state, i, 1)

    // Run 1792 initialization cycles
    for (let i = 0; i < 1792; i++) {
        const k_i = (K[i >>> 3] >>> (7 - (i & 7))) & 1
        acornStep(state, 1, 1, k_i ^ 1) // XOR constant 1 during init
    }

    // AD processing
    for (let i = 0; i < ad.length * 8; i++) {
        const ad_bit = (ad[i >>> 3] >>> (7 - (i & 7))) & 1
        acornStep(state, 1, 0, ad_bit)
    }

    // Encryption
    let ctBitIdx = 0
    for (let i = 0; i < ptBytes.length * 8; i++) {
        const pt_bit = (ptBytes[i >>> 3] >>> (7 - (i & 7))) & 1
        const ks = acornStep(state, 0, 1, pt_bit)
        const ct_bit = pt_bit ^ ks

        const byteIdx = ctBitIdx >>> 3
        const bitIdx = 7 - (ctBitIdx & 7)
        outBytes[byteIdx] |= (ct_bit << bitIdx)
        ctBitIdx++
    }

    // Tag generation (768 cycles)
    for (let i = 0; i < 768; i++) acornStep(state, 1, 1, 0)

    // Read 128 tag bits
    for (let i = 0; i < 128; i++) {
        const ks = acornStep(state, 1, 1, 0)
        const byteIdx = (ptBytes.length * 8 + i) >>> 3
        const bitIdx = 7 - (i & 7)
        outBytes[byteIdx] |= (ks << bitIdx)
    }

    if (options.instrument) {
        steps.push({ index: 0, label: 'ACORN v3 AEAD', inputState: plaintext, outputState: toHex(outBytes), note: '293-bit NLFSR. Majority/choose combiners.', isMilestone: true })
    }

    return { output: toHex(outBytes), outputEncoding: 'hex', steps, metadata: METADATA, durationMs: performance.now() - start }
}

/**
 * Decrypt cipher-engine utility export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @param ciphertext Input required by the Decrypt operation.
 * @param key Input required by the Decrypt operation.
 * @param options Input required by the Decrypt operation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/197/final — FIPS 197.
 */
export function decrypt(ciphertext: string, key: string, options: CipherOptions = {}): CipherResult {
    const start = performance.now()
    const keyNonce = parseHex(key, 'ACORN key+nonce')
    if (keyNonce.length !== 32) throw new CipherError('INVALID_KEY_LENGTH', 'INVALID_KEY_LENGTH: Key must be 32 bytes (16-byte key + 16-byte nonce).')

    const K = keyNonce.slice(0, 16)
    const N = keyNonce.slice(16, 32)
    const ad = parseHex((options.ad as string) || '', 'AD')
    const ctBytesWithTag = parseHex(ciphertext, 'ciphertext')
    if (ctBytesWithTag.length < 16) throw new CipherError('INVALID_INPUT', 'Ciphertext too short for tag.')

    const ptLen = ctBytesWithTag.length - 16
    const ctBytes = ctBytesWithTag.slice(0, ptLen)
    const receivedTag = ctBytesWithTag.slice(ptLen)
    const ptBytes = new Uint8Array(ptLen)

    const state = new Array(10).fill(0)
    const steps: CipherStep[] = []

    // Initialization: load key and nonce
    for (let i = 0; i < 128; i++) setBit(state, i, (K[i >>> 3] >>> (7 - (i & 7))) & 1)
    for (let i = 0; i < 128; i++) setBit(state, 128 + i, (N[i >>> 3] >>> (7 - (i & 7))) & 1)
    for (let i = 256; i < 260; i++) setBit(state, i, 1)

    // Run 1792 initialization cycles
    for (let i = 0; i < 1792; i++) {
        const k_i = (K[i >>> 3] >>> (7 - (i & 7))) & 1
        acornStep(state, 1, 1, k_i ^ 1)
    }

    // AD processing
    for (let i = 0; i < ad.length * 8; i++) {
        const ad_bit = (ad[i >>> 3] >>> (7 - (i & 7))) & 1
        acornStep(state, 1, 0, ad_bit)
    }

    // Decryption
    for (let i = 0; i < ptLen * 8; i++) {
        const ct_bit = (ctBytes[i >>> 3] >>> (7 - (i & 7))) & 1
        const ks = acornKeystream(state)
        const pt_bit = ct_bit ^ ks
        acornStep(state, 0, 1, pt_bit)

        const byteIdx = i >>> 3
        const bitIdx = 7 - (i & 7)
        ptBytes[byteIdx] |= (pt_bit << bitIdx)
    }

    // Tag generation (768 cycles)
    for (let i = 0; i < 768; i++) acornStep(state, 1, 1, 0)

    // Read 128 tag bits
    const expectedTag = new Uint8Array(16)
    for (let i = 0; i < 128; i++) {
        const ks = acornStep(state, 1, 1, 0)
        const byteIdx = i >>> 3
        const bitIdx = 7 - (i & 7)
        expectedTag[byteIdx] |= (ks << bitIdx)
    }

    if (!constantTimeCompare(expectedTag, receivedTag)) {
        throw new CipherError('AUTH_TAG_MISMATCH', 'AUTH_TAG_MISMATCH: ACORN authentication tag mismatch.')
    }

    return { output: toHex(ptBytes), outputEncoding: 'hex', steps, metadata: METADATA, durationMs: performance.now() - start }
}

/**
 * TEST VECTORS cipher-engine utility export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/197/final — FIPS 197.
 */
export const TEST_VECTORS: TestVector[] = [
    { input: '00000000000000000000000000000000', key: '00'.repeat(32), expected: 'mock_ct_tag', description: 'ACORN v3 empty AD' }
]
