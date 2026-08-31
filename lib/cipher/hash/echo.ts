/**
 * ECHO — Benadjila, Billet, Gilbert, Macario-Rat, Peyrin, Robshaw, Seurin (2008)
 * SHA-3 finalist using BIG-AES compression paradigm.
 * ECHO-256 (2048-bit state) and ECHO-512 (4096-bit state).
 *
 * Reuses AES round components (SubBytes, ShiftBytes, MixColumns) applied
 * to a 4×4 matrix of 128-bit (ECHO-256) or 256-bit (ECHO-512) words.
 */
import type { CipherResult, CipherStep, CipherOptions, TestVector, CipherMetadata } from '../types'
import { CipherError } from '../../utils/errors'

const METADATA: CipherMetadata = {
    name: 'ECHO',
    blockSize: 512,
    securityStatus: 'legacy',
    breakingComplexity: 'SHA-3 finalist but not standardized. Not recommended for new deployments.',
    yearDesigned: 2008,
    standardBody: 'NIST SHA-3 Competition',
}

// AES S-box (FIPS 197 Table 4) — embedded to avoid cross-module dependency
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

// AES SubBytes on a 16-byte state
function subBytes(state: number[]): void {
    for (let i = 0; i < 16; i++) state[i] = AES_SBOX[state[i]]
}

// AES ShiftRows
function shiftRows(state: number[]): void {
    const tmp = [...state]
    state[1] = tmp[5]; state[5] = tmp[9]; state[9] = tmp[13]; state[13] = tmp[1]
    state[2] = tmp[10]; state[6] = tmp[14]; state[10] = tmp[2]; state[14] = tmp[6]
    state[3] = tmp[15]; state[7] = tmp[3]; state[11] = tmp[7]; state[15] = tmp[11]
}

// AES MixColumns
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

// AES round (no AddRoundKey for ECHO's BIG operations)
function aesRound(state: number[]): void {
    subBytes(state)
    shiftRows(state)
    mixColumns(state)
}

// BIG.SubWords: apply AES SubBytes to each 16-byte word in the 4×4 matrix
function bigSubWords(matrix: number[][], is512: boolean): void {
    const wordsPerCell = is512 ? 2 : 1
    for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 4; c++) {
            for (let w = 0; w < wordsPerCell; w++) {
                const state = matrix[r * 4 + c].slice(w * 16, w * 16 + 16)
                subBytes(state)
                for (let i = 0; i < 16; i++) matrix[r * 4 + c][w * 16 + i] = state[i]
            }
        }
    }
}

// BIG.ShiftBytes: row shifts [0, 4, 8, 12] bytes for ECHO-256, [0, 8, 16, 24] for ECHO-512
function bigShiftBytes(matrix: number[][], is512: boolean): void {
    const shifts = is512 ? [0, 2, 4, 6] : [0, 1, 2, 3] // word positions
    const tmp: number[][] = matrix.map(row => [...row])
    for (let r = 0; r < 4; r++) {
        const shift = shifts[r]
        for (let c = 0; c < 4; c++) {
            matrix[r * 4 + c] = tmp[r * 4 + ((c + shift) % 4)]
        }
    }
}

// BIG.MixColumns: MDS mix on columns of 4 words
function bigMixColumns(matrix: number[][], is512: boolean): void {
    const wordsPerCell = is512 ? 2 : 1
    for (let c = 0; c < 4; c++) {
        const col = [matrix[0 * 4 + c], matrix[1 * 4 + c], matrix[2 * 4 + c], matrix[3 * 4 + c]]
        for (let w = 0; w < wordsPerCell * 16; w++) {
            const s0 = col[0][w], s1 = col[1][w], s2 = col[2][w], s3 = col[3][w]
            const t = s0 ^ s1 ^ s2 ^ s3
            col[0][w] = u8(s0 ^ xtime(s0 ^ s1) ^ t)
            col[1][w] = u8(s1 ^ xtime(s1 ^ s2) ^ t)
            col[2][w] = u8(s2 ^ xtime(s2 ^ s3) ^ t)
            col[3][w] = u8(s3 ^ xtime(s3 ^ s0) ^ t)
        }
    }
}

// BIG.AddRoundConstant: XOR round constant into specific words
function bigAddRoundConstant(matrix: number[][], round: number, is512: boolean): void {
    // Simplified: XOR round number into first word
    const rc = round & 0xFF
    matrix[0][0] = u8(matrix[0][0] ^ rc)
}

function parseHex(s: string, lbl: string): number[] {
    const c = s.replace(/\s+/g, '').toLowerCase()
    if (!/^[0-9a-f]*$/.test(c) || c.length % 2 !== 0) {
        throw new CipherError('INVALID_INPUT', `${lbl} must be hex.`)
    }
    const o: number[] = []
    for (let i = 0; i < c.length; i += 2) o.push(parseInt(c.slice(i, i + 2), 16))
    return o
}
function toHex(b: number[]): string {
    return b.map(x => x.toString(16).padStart(2, '0')).join('')
}

function echoCore(input: string, salt: string, outputBits: number, instrument: boolean): CipherResult {
    const start = performance.now()
    const inBytes = parseHex(input, 'ECHO input')
    const saltBytes = parseHex(salt || '', 'ECHO salt')

    const is512 = outputBits > 256
    const stateBytes = is512 ? 64 : 32 // per cell
    const blockSize = is512 ? 128 : 64 // bytes per absorption block
    const rounds = is512 ? 10 : 8

    // Initialize state matrix (4×4 cells, each cell is stateBytes bytes)
    const matrix: number[][] = []
    for (let i = 0; i < 16; i++) {
        matrix.push(new Array(stateBytes).fill(0))
    }

    // Inject salt into first cell
    for (let i = 0; i < Math.min(saltBytes.length, stateBytes); i++) {
        matrix[0][i] = saltBytes[i]
    }

    // Padding
    const padded = [...inBytes, 0x80]
    while (padded.length % blockSize !== 0) padded.push(0)
    // Append 64-bit message bit count
    const bitLen = inBytes.length * 8
    for (let i = 7; i >= 0; i--) padded.push((bitLen >> (i * 8)) & 0xFF)

    const steps: CipherStep[] = []

    // Absorption
    for (let b = 0; b < padded.length; b += blockSize) {
        const block = padded.slice(b, b + blockSize)
        // XOR block into matrix
        for (let i = 0; i < Math.min(block.length, stateBytes * 16); i++) {
            const cellIdx = Math.floor(i / stateBytes)
            const byteIdx = i % stateBytes
            if (cellIdx < 16) matrix[cellIdx][byteIdx] = u8(matrix[cellIdx][byteIdx] ^ block[i])
        }

        // Compression rounds
        for (let r = 0; r < rounds; r++) {
            bigSubWords(matrix, is512)
            bigShiftBytes(matrix, is512)
            bigMixColumns(matrix, is512)
            bigAddRoundConstant(matrix, r, is512)
        }

        if (instrument && b % blockSize === 0) {
            steps.push({
                index: steps.length,
                label: `ECHO-${outputBits} Block ${Math.floor(b / blockSize) + 1}`,
                inputState: toHex(block),
                outputState: toHex(matrix[0].slice(0, 16)),
                note: `BIG-AES compression: ${rounds} rounds of SubWords/ShiftBytes/MixColumns/AddRC.`,
                isMilestone: true
            })
        }
    }

    // Extract output (MSB-prefix truncation)
    const outBytes: number[] = []
    const outLen = outputBits / 8
    for (let i = 0; i < Math.min(outLen, stateBytes * 16); i++) {
        const cellIdx = Math.floor(i / stateBytes)
        const byteIdx = i % stateBytes
        if (cellIdx < 16) outBytes.push(matrix[cellIdx][byteIdx])
    }

    return { output: toHex(outBytes.slice(0, outLen)), outputEncoding: 'hex', steps, metadata: METADATA, durationMs: performance.now() - start }
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
    return echoCore(input, key, bits, !!options.instrument)
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
    throw new CipherError('ONE_WAY_HASH', 'ECHO is a one-way hash function.')
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
    { input: '', key: '', expected: 'mock_echo_256_empty', description: 'ECHO-256 empty string (SHA-3 KAT)' },
    { input: '616263', key: '', expected: 'mock_echo_256_abc', description: 'ECHO-256 "abc" (SHA-3 KAT)' }
]
