/**
 * RC2 — Ron Rivest, 1987. Published as RFC 2268.
 * 64-bit block (four 16-bit words), variable key (1–128 bytes),
 * variable effective key bits (1–1024). Mix-and-mash round structure.
 * Historically deployed in SSL 2/3, TLS, S/MIME, early Microsoft products.
 *
 * RFC 2268 test vector:
 *   key = 0000000000000000, effectiveBits = 63
 *   pt  = 0000000000000000
 *   ct  = ebb773f993278eff
 */

import type { CipherResult, CipherStep, CipherOptions, TestVector, CipherMetadata } from '../types'
import { CipherError, validateInput, validateKey } from '../../utils'

const METADATA: CipherMetadata = {
    name: 'RC2',
    keySize: 128,
    blockSize: 64,
    rounds: 18,
    securityStatus: 'broken',
    breakingComplexity: 'Broken at ≤40-bit effective key; 64-bit block vulnerable to birthday attacks',
    yearDesigned: 1987,
    standardBody: 'RFC 2268 (1998); Ron Rivest / RSA Security',
}

// ── PI table: RFC 2268 Table 1 (256 bytes derived from π) ───────────────────
const PI = new Uint8Array([
    0xd9, 0x78, 0xf9, 0xc4, 0x19, 0xdd, 0xb5, 0xed, 0x28, 0xe9, 0xfd, 0x79, 0x4a, 0xa0, 0xd8, 0x9d,
    0xc6, 0x7e, 0x37, 0x83, 0x2b, 0x76, 0x53, 0x8e, 0x62, 0x4c, 0x64, 0x88, 0x44, 0x8b, 0xfb, 0xa2,
    0x17, 0x9a, 0x59, 0xf5, 0x87, 0xb3, 0x4f, 0x13, 0x61, 0x45, 0x6d, 0x8d, 0x09, 0x81, 0x7d, 0x32,
    0xbd, 0x8f, 0x40, 0xeb, 0x86, 0xb7, 0x7b, 0x0b, 0xf0, 0x95, 0x21, 0x22, 0x5c, 0x6b, 0x4e, 0x82,
    0x54, 0xd6, 0x65, 0x93, 0xce, 0x60, 0xb2, 0x1c, 0x73, 0x56, 0xc0, 0x14, 0xa7, 0x8c, 0xf1, 0xdc,
    0x12, 0x75, 0xca, 0x1f, 0x3b, 0xbe, 0xe4, 0xd1, 0x42, 0x3d, 0xd4, 0x30, 0xa3, 0x3c, 0xb6, 0x26,
    0x6f, 0xbf, 0x0e, 0xda, 0x46, 0x69, 0x07, 0x57, 0x27, 0xf2, 0x1d, 0x9b, 0xbc, 0x94, 0x43, 0x03,
    0xf8, 0x11, 0xc7, 0xf6, 0x90, 0xef, 0x3e, 0xe7, 0x06, 0xc3, 0xd5, 0x2f, 0xc8, 0x66, 0x1e, 0xd7,
    0x08, 0xe8, 0xea, 0xde, 0x80, 0x52, 0xee, 0xf7, 0x84, 0xaa, 0x72, 0xac, 0x35, 0x4d, 0x6a, 0x2a,
    0x96, 0x1a, 0xd2, 0x71, 0x5a, 0x15, 0x49, 0x74, 0x4b, 0x9f, 0xd0, 0x5e, 0x04, 0x18, 0xa4, 0xec,
    0xc2, 0xe0, 0x41, 0x6e, 0x0f, 0x51, 0xcb, 0xcc, 0x24, 0x91, 0xaf, 0x50, 0xa1, 0xf4, 0x70, 0x39,
    0x99, 0x7c, 0x3a, 0x85, 0x23, 0xb8, 0xb4, 0x7a, 0xfc, 0x02, 0x36, 0x5b, 0x25, 0x55, 0x97, 0x31,
    0x2d, 0x5d, 0xfa, 0x98, 0xe3, 0x8a, 0x92, 0xae, 0x05, 0xdf, 0x29, 0x10, 0x67, 0x6c, 0xba, 0xc9,
    0xd3, 0x00, 0xe6, 0xcf, 0xe1, 0x9e, 0xa8, 0x2c, 0x63, 0x16, 0x01, 0x3f, 0x58, 0xe2, 0x89, 0xa9,
    0x0d, 0x38, 0x34, 0x1b, 0xab, 0x33, 0xff, 0xb0, 0xbb, 0x48, 0x0c, 0x5f, 0xb9, 0xb1, 0xcd, 0x2e,
    0xc5, 0xf3, 0xdb, 0x47, 0xe5, 0xa5, 0x9c, 0x77, 0x0a, 0xa6, 0x20, 0x68, 0xfe, 0x7f, 0xc1, 0xad,
])

// MIX rotation amounts per word index (RFC 2268 §2)
const ROTL_AMOUNTS = [1, 2, 3, 5]

function rotl16(x: number, n: number): number {
    return ((x << n) | (x >>> (16 - n))) & 0xffff
}
function rotr16(x: number, n: number): number {
    return ((x >>> n) | (x << (16 - n))) & 0xffff
}
function u16(n: number): number { return n & 0xffff }

// ── Key expansion (RFC 2268 §2) ───────────────────────────────────────────────
function expandKey(keyBytes: Uint8Array, effectiveBits: number): Uint16Array {
    const T = keyBytes.length        // raw key length in bytes (1–128)
    const T8 = Math.ceil(effectiveBits / 8)  // effective key length in bytes
    const TM = 0xff >> (-(effectiveBits) & 7) // mask for last effective byte

    // Step 1: copy key into L[0..T-1]
    const L = new Uint8Array(128)
    L.set(keyBytes.slice(0, Math.min(T, 128)))

    // Step 2: expand to 128 bytes
    for (let i = T; i < 128; i++) {
        L[i] = PI[(L[i - 1] + L[i - T]) & 0xff]
    }

    // Step 3: apply effective key bits mask
    L[128 - T8] = PI[L[128 - T8] & TM]
    for (let i = 127 - T8; i >= 0; i--) {
        L[i] = PI[L[i + 1] ^ L[i + T8]]
    }

    // Step 4: pack into 64 little-endian 16-bit words K[0..63]
    const K = new Uint16Array(64)
    for (let i = 0; i < 64; i++) {
        K[i] = u16(L[2 * i] | (L[2 * i + 1] << 8))
    }
    return K
}

// ── MIX round (one pass over R[0..3]) ─────────────────────────────────────────
function mixRound(R: Uint16Array, K: Uint16Array, j: number): number {
    // R[i] += K[j] + mix_function; rotl by ROTL_AMOUNTS[i]
    R[0] = u16(rotl16(u16(R[0] + K[j] + ((R[3] & R[2]) | (~R[3] & R[1]))), ROTL_AMOUNTS[0])); j++
    R[1] = u16(rotl16(u16(R[1] + K[j] + ((R[0] & R[3]) | (~R[0] & R[2]))), ROTL_AMOUNTS[1])); j++
    R[2] = u16(rotl16(u16(R[2] + K[j] + ((R[1] & R[0]) | (~R[1] & R[3]))), ROTL_AMOUNTS[2])); j++
    R[3] = u16(rotl16(u16(R[3] + K[j] + ((R[2] & R[1]) | (~R[2] & R[0]))), ROTL_AMOUNTS[3])); j++
    return j
}

// ── MASH round ────────────────────────────────────────────────────────────────
function mashRound(R: Uint16Array, K: Uint16Array): void {
    R[0] = u16(R[0] + K[R[3] & 63])
    R[1] = u16(R[1] + K[R[0] & 63])
    R[2] = u16(R[2] + K[R[1] & 63])
    R[3] = u16(R[3] + K[R[2] & 63])
}

// ── Reverse MIX (r-MIX) ───────────────────────────────────────────────────────
function rMixRound(R: Uint16Array, K: Uint16Array, j: number): number {
    R[3] = u16(rotr16(R[3], ROTL_AMOUNTS[3]) - K[j] - ((R[2] & R[1]) | (~R[2] & R[0]))); j--
    R[2] = u16(rotr16(R[2], ROTL_AMOUNTS[2]) - K[j] - ((R[1] & R[0]) | (~R[1] & R[3]))); j--
    R[1] = u16(rotr16(R[1], ROTL_AMOUNTS[1]) - K[j] - ((R[0] & R[3]) | (~R[0] & R[2]))); j--
    R[0] = u16(rotr16(R[0], ROTL_AMOUNTS[0]) - K[j] - ((R[3] & R[2]) | (~R[3] & R[1]))); j--
    return j
}

// ── Reverse MASH (r-MASH) ────────────────────────────────────────────────────
function rMashRound(R: Uint16Array, K: Uint16Array): void {
    R[3] = u16(R[3] - K[R[2] & 63])
    R[2] = u16(R[2] - K[R[1] & 63])
    R[1] = u16(R[1] - K[R[0] & 63])
    R[0] = u16(R[0] - K[R[3] & 63])
}

// ── Block encrypt (18 rounds) ─────────────────────────────────────────────────
function rc2Encrypt(block: Uint8Array, K: Uint16Array): Uint8Array {
    const R = new Uint16Array(4)
    for (let i = 0; i < 4; i++) R[i] = u16(block[2 * i] | (block[2 * i + 1] << 8))

    let j = 0
    for (let i = 0; i < 5; i++)  j = mixRound(R, K, j)
    mashRound(R, K)
    for (let i = 0; i < 6; i++)  j = mixRound(R, K, j)
    mashRound(R, K)
    for (let i = 0; i < 5; i++)  j = mixRound(R, K, j)

    const out = new Uint8Array(8)
    for (let i = 0; i < 4; i++) { out[2 * i] = R[i] & 0xff; out[2 * i + 1] = (R[i] >> 8) & 0xff }
    return out
}

// ── Block decrypt (18 rounds reversed) ────────────────────────────────────────
function rc2Decrypt(block: Uint8Array, K: Uint16Array): Uint8Array {
    const R = new Uint16Array(4)
    for (let i = 0; i < 4; i++) R[i] = u16(block[2 * i] | (block[2 * i + 1] << 8))

    let j = 63
    for (let i = 0; i < 5; i++)  j = rMixRound(R, K, j)
    rMashRound(R, K)
    for (let i = 0; i < 6; i++)  j = rMixRound(R, K, j)
    rMashRound(R, K)
    for (let i = 0; i < 5; i++)  j = rMixRound(R, K, j)

    const out = new Uint8Array(8)
    for (let i = 0; i < 4; i++) { out[2 * i] = R[i] & 0xff; out[2 * i + 1] = (R[i] >> 8) & 0xff }
    return out
}

function parseHex(s: string, label: string): Uint8Array {
    const c = s.replace(/\s+/g, '').toLowerCase()
    if (!/^[0-9a-f]+$/.test(c) || c.length % 2 !== 0)
        throw new CipherError('INVALID_INPUT', `${label} must be an even-length hex string.`)
    const out = new Uint8Array(c.length / 2)
    for (let i = 0; i < out.length; i++) out[i] = parseInt(c.slice(i * 2, i * 2 + 2), 16)
    return out
}
function toHex(b: Uint8Array): string {
    return Array.from(b).map((x) => x.toString(16).padStart(2, '0')).join('')
}

function rc2Core(input: string, key: string, doDecrypt: boolean, instrument: boolean, effectiveBits: number): CipherResult {
    const start = performance.now()
    validateKey(key)
    const keyBytes = parseHex(key, 'RC2 key')
    if (keyBytes.length < 1 || keyBytes.length > 128)
        throw new CipherError('INVALID_KEY_LENGTH', `RC2 key must be 1–128 bytes. Got ${keyBytes.length}.`)
    if (effectiveBits < 1 || effectiveBits > 1024)
        throw new CipherError('INVALID_INPUT', `RC2 effectiveBits must be 1–1024. Got ${effectiveBits}.`)

    const inBytes = parseHex(input, 'RC2 input')
    if (inBytes.length === 0 || inBytes.length % 8 !== 0)
        throw new CipherError('INVALID_INPUT', `RC2 input must be a non-empty multiple of 8 bytes (64-bit blocks).`)

    const K = expandKey(keyBytes, effectiveBits)
    const numBlocks = inBytes.length / 8
    const outBuf = new Uint8Array(inBytes.length)
    const steps: CipherStep[] = []

    if (instrument) {
        steps.push({ index: 0, label: 'Key expansion', inputState: toHex(keyBytes), outputState: `${effectiveBits}-bit effective key → 64 subkey words via PI table`, note: `Raw key expanded to 128 bytes using the RFC 2268 PI table, then effective-key-bits masking applied. Packed into 64 little-endian 16-bit words K[0..63].`, isMilestone: true })
    }

    for (let b = 0; b < numBlocks; b++) {
        const blockIn = inBytes.slice(b * 8, b * 8 + 8)
        const blockOut = doDecrypt ? rc2Decrypt(blockIn, K) : rc2Encrypt(blockIn, K)
        outBuf.set(blockOut, b * 8)
        if (instrument) {
            steps.push({ index: steps.length, label: `Block ${b + 1} — 5 MIX + MASH + 6 MIX + MASH + 5 MIX`, inputState: toHex(blockIn), outputState: toHex(blockOut), note: `18 rounds: 5 MIX (K[0..19]) → MASH → 6 MIX (K[20..43]) → MASH → 5 MIX (K[44..63]). ${doDecrypt ? 'Decrypt reverses order and operations.' : ''}`, isMilestone: true })
        }
    }

    return { output: toHex(outBuf), outputEncoding: 'hex', steps, metadata: METADATA, durationMs: performance.now() - start }
}

/**
 * Encrypt cipher-engine utility export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @param input Input required by the Encrypt operation.
 * @param key Input required by the Encrypt operation.
 * @param options Input required by the Encrypt operation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/46-3/final — FIPS 46-3.
 */
export function encrypt(input: string, key: string, options: CipherOptions = {}): CipherResult {
    validateInput(input)
    const eb = typeof (options as Record<string, unknown>).effectiveBits === 'number'
        ? (options as Record<string, unknown>).effectiveBits as number : 128
    return rc2Core(input, key, false, !!options.instrument, eb)
}
/**
 * Decrypt cipher-engine utility export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @param input Input required by the Decrypt operation.
 * @param key Input required by the Decrypt operation.
 * @param options Input required by the Decrypt operation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/46-3/final — FIPS 46-3.
 */
export function decrypt(input: string, key: string, options: CipherOptions = {}): CipherResult {
    validateInput(input)
    const eb = typeof (options as Record<string, unknown>).effectiveBits === 'number'
        ? (options as Record<string, unknown>).effectiveBits as number : 128
    return rc2Core(input, key, true, !!options.instrument, eb)
}

/**
 * TEST VECTORS cipher-engine utility export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/46-3/final — FIPS 46-3.
 */
export const TEST_VECTORS: TestVector[] = [
    { input: '0000000000000000', key: '0000000000000000', expected: 'ebb773f993278eff', options: { effectiveBits: 63 }, description: 'RFC 2268 §5 vector 1: 8-byte zero key, effectiveBits=63' },
    { input: 'ffffffffffffffff', key: 'ffffffffffffffff', expected: '278b27e42e2f0d49', options: { effectiveBits: 64 }, description: 'RFC 2268 §5 vector 2: 8-byte 0xff key, effectiveBits=64' },
]
