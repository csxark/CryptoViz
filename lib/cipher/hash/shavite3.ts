/**
 * SHAvite-3 — Eli Biham, Orr Dunkelman (SHA-3 Finalist)
 * HAIFA construction with AES-based compression and counter injection.
 * SHAvite-3-256 and SHAvite-3-512 variants.
 */
import type { CipherResult, CipherStep, CipherOptions, TestVector, CipherMetadata } from '../types'
import { CipherError } from '../../utils/errors'

const METADATA: CipherMetadata = {
    name: 'SHAvite-3',
    blockSize: 512,
    securityStatus: 'legacy',
    breakingComplexity: 'SHA-3 finalist. HAIFA construction is sound but not standardized.',
    yearDesigned: 2008,
    standardBody: 'NIST SHA-3 Competition',
}

// AES S-box (FIPS 197 Table 4) embedded to avoid cross-module dependency
const AES_SBOX: readonly number[] = [
    0x63, 0x7c, 0x77, 0x7b, 0xf2, 0x6b, 0x6f, 0xc5, 0x30, 0x01, 0x67, 0x2b, 0xfe, 0xd7, 0xab, 0x76,
    0xca, 0x82, 0xc9, 0x7d, 0xfa, 0x59, 0x47, 0xf0, 0xad, 0xd4, 0xa2, 0xaf, 0x9c, 0xa4, 0x72, 0xc0,
    0xb7, 0xfd, 0x93, 0x26, 0x36, 0x3f, 0xf7, 0xcc, 0x34, 0xa5, 0xe5, 0xf1, 0x71, 0xd8, 0x31, 0x15,
    0x04, 0xc7, 0x23, 0xc3, 0x18, 0x96, 0x05, 0x9a, 0x07, 0x12, 0x80, 0xe2, 0xeb, 0x27, 0xb2, 0x75,
    0x09, 0x83, 0x2c, 0x1a, 0x1b, 0x6e, 0x5a, 0xa0, 0x52, 0x3b, 0xd6, 0xb3, 0x29, 0xe3, 0x2f, 0x84,
    0x53, 0xd1, 0x00, 0xed, 0x20, 0xfc, 0xb1, 0x5b, 0x6a, 0xcb, 0xbe, 0x39, 0x4a, 0x4c, 0x58, 0xcf,
    0xd0, 0xef, 0xaa, 0xfb, 0x43, 0x4d, 0x33, 0x85, 0x45, 0xf9, 0x02, 0x7f, 0x50, 0x3c, 0x9f, 0xa8,
    0x51, 0xa3, 0x40, 0x8f, 0x92, 0x9d, 0x38, 0xf5, 0xbc, 0xb6, 0xda, 0x21, 0x10, 0xff, 0xf3, 0xd2,
    0xcd, 0x0c, 0x13, 0xec, 0x5f, 0x97, 0x44, 0x17, 0xc4, 0xa7, 0x7e, 0x3d, 0x64, 0x5d, 0x19, 0x73,
    0x60, 0x81, 0x4f, 0xdc, 0x22, 0x2a, 0x90, 0x88, 0x46, 0xee, 0xb8, 0x14, 0xde, 0x5e, 0x0b, 0xdb,
    0xe0, 0x32, 0x3a, 0x0a, 0x49, 0x06, 0x24, 0x5c, 0xc2, 0xd3, 0xac, 0x62, 0x91, 0x95, 0xe4, 0x79,
    0xe7, 0xc8, 0x37, 0x6d, 0x8d, 0xd5, 0x4e, 0xa9, 0x6c, 0x56, 0xf4, 0xea, 0x65, 0x7a, 0xae, 0x08,
    0xba, 0x78, 0x25, 0x2e, 0x1c, 0xa6, 0xb4, 0xc6, 0xe8, 0xdd, 0x74, 0x1f, 0x4b, 0xbd, 0x8b, 0x8a,
    0x70, 0x3e, 0xb5, 0x66, 0x48, 0x03, 0xf6, 0x0e, 0x61, 0x35, 0x57, 0xb9, 0x86, 0xc1, 0x1d, 0x9e,
    0xe1, 0xf8, 0x98, 0x11, 0x69, 0xd9, 0x8e, 0x94, 0x9b, 0x1e, 0x87, 0xe9, 0xce, 0x55, 0x28, 0xdf,
    0x8c, 0xa1, 0x89, 0x0d, 0xbf, 0xe6, 0x42, 0x68, 0x41, 0x99, 0x2d, 0x0f, 0xb0, 0x54, 0xbb, 0x16
]

function u8(n: number): number { return n & 0xFF }
function u32(n: number): number { return n >>> 0 }
function xtime(b: number): number { return u8((b << 1) ^ ((b >> 7) * 0x1b)) }

function subBytes(state: number[]): void {
    for (let i = 0; i < 16; i++) state[i] = AES_SBOX[state[i]]
}

function shiftRows(state: number[]): void {
    const tmp = [...state]
    state[1] = tmp[5]; state[5] = tmp[9]; state[9] = tmp[13]; state[13] = tmp[1]
    state[2] = tmp[10]; state[6] = tmp[14]; state[10] = tmp[2]; state[14] = tmp[6]
    state[3] = tmp[15]; state[7] = tmp[3]; state[11] = tmp[7]; state[15] = tmp[11]
}

function mixColumns(state: number[]): void {
    for (let c = 0; c < 4; c++) {
        const i = c * 4
        const s0 = state[i], s1 = state[i + 1], s2 = state[i + 2], s3 = state[i + 3]
        const t = s0 ^ s1 ^ s2 ^ s3
        state[i] = u8(s0 ^ xtime(s0 ^ s1) ^ t)
        state[i + 1] = u8(s1 ^ xtime(s1 ^ s2) ^ t)
        state[i + 2] = u8(s2 ^ xtime(s2 ^ s3) ^ t)
        state[i + 3] = u8(s3 ^ xtime(s3 ^ s0) ^ t)
    }
}

function aesRound(state: number[], rk: number[]): void {
    subBytes(state)
    shiftRows(state)
    mixColumns(state)
    for (let i = 0; i < 16; i++) state[i] = u8(state[i] ^ rk[i])
}

function parseHex(s: string, lbl: string): number[] {
    const c = s.replace(/\s+/g, '').toLowerCase()
    if (!/^[0-9a-f]*$/.test(c) || c.length % 2 !== 0) throw new CipherError('INVALID_INPUT', `${lbl} must be hex.`)
    const o: number[] = []
    for (let i = 0; i < c.length; i += 2) o.push(parseInt(c.slice(i, i + 2), 16))
    return o
}
function toHex(b: number[]): string { return b.map(x => x.toString(16).padStart(2, '0')).join('') }

function shavite3Core(input: string, salt: string, outputBits: number, instrument: boolean): CipherResult {
    const start = performance.now()
    const inBytes = parseHex(input, 'SHAvite-3 input')
    const saltBytes = parseHex(salt || '', 'SHAvite-3 salt')

    const is512 = outputBits > 256
    const blockSize = is512 ? 128 : 64 // bytes
    const stateWords = is512 ? 16 : 8

    // Initialize chaining value (simplified IV)
    const h = new Array(stateWords * 4).fill(0)
    for (let i = 0; i < h.length; i++) h[i] = u8(i + outputBits)

    // Padding
    const padded = [...inBytes, 0x80]
    while (padded.length % blockSize !== 0) padded.push(0)

    // HAIFA counter (64-bit little-endian)
    let counter = BigInt(padded.length * 8)

    const steps: CipherStep[] = []

    for (let b = 0; b < padded.length; b += blockSize) {
        const block = padded.slice(b, b + blockSize)

        // Initialize Q blocks from chaining value
        const qBlocks: number[][] = []
        for (let i = 0; i < (is512 ? 8 : 4); i++) {
            const q = new Array(16).fill(0)
            for (let j = 0; j < 16; j++) q[j] = h[i * 16 + j] || 0
            qBlocks.push(q)
        }

        // 14 rounds of AES-based compression
        for (let r = 0; r < 14; r++) {
            // Simplified key derivation: mix message words, counter, and salt
            const rk = new Array(16).fill(0)
            for (let i = 0; i < 16; i++) {
                rk[i] = u8(block[i % blockSize] ^ (Number(counter >> BigInt(i * 8)) & 0xFF) ^ (saltBytes[i % (saltBytes.length || 1)] || 0))
            }

            // Apply AES round to Q blocks
            for (const q of qBlocks) {
                aesRound(q, rk)
            }
        }

        // Feed-forward XOR
        for (let i = 0; i < qBlocks.length; i++) {
            for (let j = 0; j < 16; j++) {
                h[i * 16 + j] = u8(h[i * 16 + j] ^ qBlocks[i][j])
            }
        }

        if (instrument && b % blockSize === 0) {
            steps.push({
                index: steps.length,
                label: `SHAvite-3-${outputBits} Block ${Math.floor(b / blockSize) + 1}`,
                inputState: toHex(block),
                outputState: toHex(h.slice(0, 16)),
                note: `HAIFA counter: ${counter}. 14 AES rounds.`,
                isMilestone: true
            })
        }
    }

    const outLen = outputBits / 8
    return { output: toHex(h.slice(0, outLen)), outputEncoding: 'hex', steps, metadata: METADATA, durationMs: performance.now() - start }
}

/**
 * Encrypt cryptographic hash export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @param input Input required by the Encrypt operation.
 * @param key Input required by the Encrypt operation.
 * @param options Input required by the Encrypt operation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/197/final — FIPS 197.
 */
export function encrypt(input: string, key: string, options: CipherOptions = {}): CipherResult {
    const bits = (options.outputBits as number) || 256
    return shavite3Core(input, key, bits, !!options.instrument)
}
/**
 * Decrypt cryptographic hash export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/197/final — FIPS 197.
 */
export function decrypt(): CipherResult {
    throw new CipherError('ONE_WAY_HASH', 'SHAvite-3 is a one-way hash function.')
}

/**
 * TEST VECTORS cryptographic hash export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/197/final — FIPS 197.
 */
export const TEST_VECTORS: TestVector[] = [
    { input: '', key: '', expected: 'mock_shavite3_256_empty', description: 'SHAvite-3-256 empty string' }
]
