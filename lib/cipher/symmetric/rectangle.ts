/**
 * RECTANGLE — Zhang et al., IEEE TIFS 2015
 * Lightweight 64-bit SPN block cipher with 4×16 bit-matrix state.
 * Variants: RECT80 (80-bit key) and RECT128 (128-bit key), 25 rounds.
 *
 * Distinctive: Bit-level W-layer row rotations [0, 1, 12, 13].
 */
import type { CipherResult, CipherStep, CipherOptions, TestVector, CipherMetadata } from '../types'
import { CipherError } from '../../utils/errors'

const METADATA: CipherMetadata = {
    name: 'RECTANGLE',
    keySize: 80,
    blockSize: 64,
    rounds: 25,
    securityStatus: 'secure',
    breakingComplexity: 'No practical attack on full 25-round version.',
    yearDesigned: 2015,
    standardBody: 'IEEE TIFS 2015',
}

// RECTANGLE 4-bit S-box (hex nibbles, verified against reference paper Table 1)
const SBOX: readonly number[] = [0x6, 0x5, 0xC, 0xA, 0x1, 0xE, 0x7, 0x9, 0xB, 0x0, 0x3, 0xD, 0x8, 0xF, 0x4, 0x2]
const SBOX_INV: readonly number[] = (() => {
    const inv = new Array(16).fill(0)
    SBOX.forEach((v, i) => inv[v] = i)
    return inv
})()

// 25 round constants from 5-bit LFSR with feedback x^5 + x^2 + 1
const RC: readonly number[] = [
    0x01, 0x02, 0x04, 0x08, 0x10, 0x05, 0x0A, 0x14, 0x09, 0x12,
    0x01, 0x02, 0x04, 0x08, 0x10, 0x05, 0x0A, 0x14, 0x09, 0x12,
    0x01, 0x02, 0x04, 0x08, 0x10
]

// W-layer bit rotation offsets per row (4 rows)
const W_ROT: readonly number[] = [0, 1, 12, 13]

function u16(n: number): number { return n & 0xFFFF }
function rotl16(x: number, n: number): number {
    return u16((x << n) | (x >>> (16 - n)))
}
function rotr16(x: number, n: number): number {
    return u16((x >>> n) | (x << (16 - n)))
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

// SubColumn: apply S-box column-wise across 4×16 bit-matrix
// State represented as 4 rows of 16 bits each
function subColumn(rows: number[], inv: boolean): void {
    const box = inv ? SBOX_INV : SBOX
    for (let col = 0; col < 16; col++) {
        // Extract nibble from each row at column position
        // Column col uses bit (15 - col) from each row
        const bitPos = 15 - col
        const nibble =
            ((rows[0] >> bitPos) & 1) << 3 |
            ((rows[1] >> bitPos) & 1) << 2 |
            ((rows[2] >> bitPos) & 1) << 1 |
            ((rows[3] >> bitPos) & 1)
        const out = box[nibble]
        // Write back
        const mask = ~(1 << bitPos)
        rows[0] = u16((rows[0] & mask) | (((out >> 3) & 1) << bitPos))
        rows[1] = u16((rows[1] & mask) | (((out >> 2) & 1) << bitPos))
        rows[2] = u16((rows[2] & mask) | (((out >> 1) & 1) << bitPos))
        rows[3] = u16((rows[3] & mask) | ((out & 1) << bitPos))
    }
}

// W-layer: bit-level row rotations
function wLayer(rows: number[], inv: boolean): void {
    for (let i = 0; i < 4; i++) {
        rows[i] = inv ? rotr16(rows[i], W_ROT[i]) : rotl16(rows[i], W_ROT[i])
    }
}

// AddRoundKey: XOR round key (4×16 bits) into state
function addRoundKey(rows: number[], rk: number[]): void {
    for (let i = 0; i < 4; i++) rows[i] = u16(rows[i] ^ rk[i])
}

// Extract 64-bit round key from key state (leftmost 64 bits = first 4 rows of 16 bits)
function extractRoundKey(keyState: number[]): number[] {
    return [keyState[0], keyState[1], keyState[2], keyState[3]]
}

// RECT80 key schedule evolution
function evolveKey80(keyState: number[], rc: number): void {
    // Apply S-box to leftmost 16-bit sub-column (column 0)
    const bitPos = 15
    const nibble =
        ((keyState[0] >> bitPos) & 1) << 3 |
        ((keyState[1] >> bitPos) & 1) << 2 |
        ((keyState[2] >> bitPos) & 1) << 1 |
        ((keyState[3] >> bitPos) & 1)
    const out = SBOX[nibble]
    const mask = ~(1 << bitPos)
    keyState[0] = u16((keyState[0] & mask) | (((out >> 3) & 1) << bitPos))
    keyState[1] = u16((keyState[1] & mask) | (((out >> 2) & 1) << bitPos))
    keyState[2] = u16((keyState[2] & mask) | (((out >> 1) & 1) << bitPos))
    keyState[3] = u16((keyState[3] & mask) | ((out & 1) << bitPos))

    // XOR 5-bit round constant into lowest 5 bits of key register
    // Key register is 80 bits = 5 × 16-bit rows
    // Lowest 5 bits are in keyState[4] (bits 0-4 of the 80-bit register)
    keyState[4] = u16(keyState[4] ^ rc)

    // Left rotate key state by 16 bits (one row)
    const tmp = keyState[0]
    for (let i = 0; i < 4; i++) keyState[i] = keyState[i + 1]
    keyState[4] = tmp
}

// RECT128 key schedule evolution (wider key state: 8 × 16-bit rows)
function evolveKey128(keyState: number[], rc: number): void {
    // Apply S-box to leftmost 32-bit (two 16-bit sub-columns)
    for (let col = 0; col < 2; col++) {
        const bitPos = 15 - col
        const nibble =
            ((keyState[0] >> bitPos) & 1) << 3 |
            ((keyState[1] >> bitPos) & 1) << 2 |
            ((keyState[2] >> bitPos) & 1) << 1 |
            ((keyState[3] >> bitPos) & 1)
        const out = SBOX[nibble]
        const mask = ~(1 << bitPos)
        keyState[0] = u16((keyState[0] & mask) | (((out >> 3) & 1) << bitPos))
        keyState[1] = u16((keyState[1] & mask) | (((out >> 2) & 1) << bitPos))
        keyState[2] = u16((keyState[2] & mask) | (((out >> 1) & 1) << bitPos))
        keyState[3] = u16((keyState[3] & mask) | ((out & 1) << bitPos))
    }

    // XOR 5-bit round constant into lowest 5 bits
    keyState[7] = u16(keyState[7] ^ rc)

    // Left rotate by 16 bits
    const tmp = keyState[0]
    for (let i = 0; i < 7; i++) keyState[i] = keyState[i + 1]
    keyState[7] = tmp
}

function rectangleCore(input: string, key: string, doDecrypt: boolean, options: CipherOptions): CipherResult {
    const start = performance.now()
    const keyBytes = parseHex(key, 'RECTANGLE key')
    if (keyBytes.length !== 10 && keyBytes.length !== 16) {
        throw new CipherError('INVALID_KEY_LENGTH', 'RECTANGLE key must be 80 or 128 bits (10 or 16 bytes).')
    }
    const inBytes = parseHex(input, 'RECTANGLE input')
    if (inBytes.length === 0) {
        return { output: '', outputEncoding: 'hex', steps: [], metadata: METADATA, durationMs: performance.now() - start }
    }

    const is128 = keyBytes.length === 16
    const variant = is128 ? 'RECT128' : 'RECT80'

    // PKCS#7 padding for sub-8-byte inputs
    let padded = [...inBytes]
    if (padded.length % 8 !== 0) {
        const padLen = 8 - (padded.length % 8)
        for (let i = 0; i < padLen; i++) padded.push(padLen)
    }

    // Initialize key state
    const keyStateLen = is128 ? 8 : 5
    const keyState: number[] = new Array(keyStateLen).fill(0)
    for (let i = 0; i < keyBytes.length; i += 2) {
        const rowIdx = Math.floor(i / 2)
        keyState[rowIdx] = u16((keyBytes[i] << 8) | keyBytes[i + 1])
    }

    // Derive all 25 round keys upfront
    const roundKeys: number[][] = []
    for (let r = 0; r < 25; r++) {
        roundKeys.push(extractRoundKey(keyState))
        if (is128) evolveKey128(keyState, RC[r])
        else evolveKey80(keyState, RC[r])
    }

    const steps: CipherStep[] = []
    const outBytes: number[] = []

    for (let b = 0; b < padded.length; b += 8) {
        const block = padded.slice(b, b + 8)
        const rows = [
            u16((block[0] << 8) | block[1]),
            u16((block[2] << 8) | block[3]),
            u16((block[4] << 8) | block[5]),
            u16((block[6] << 8) | block[7])
        ]

        const roundSeq = doDecrypt ? Array.from({ length: 25 }, (_, i) => 24 - i) : Array.from({ length: 25 }, (_, i) => i)

        for (const r of roundSeq) {
            if (!doDecrypt) {
                addRoundKey(rows, roundKeys[r])
                subColumn(rows, false)
                wLayer(rows, false)
            } else {
                wLayer(rows, true)
                subColumn(rows, true)
                addRoundKey(rows, roundKeys[r])
            }

            if (r % 5 === 0) {
                steps.push({
                    index: steps.length,
                    label: `${variant} Round ${r + 1}/25`,
                    inputState: toHex(block),
                    outputState: toHex([
                        (rows[0] >> 8) & 0xFF, rows[0] & 0xFF,
                        (rows[1] >> 8) & 0xFF, rows[1] & 0xFF,
                        (rows[2] >> 8) & 0xFF, rows[2] & 0xFF,
                        (rows[3] >> 8) & 0xFF, rows[3] & 0xFF
                    ]),
                    note: `W-layer bit rotations: [0, 1, 12, 13].`,
                    isMilestone: r === 0 || r === 24
                })
            }
        }

        outBytes.push(
            (rows[0] >> 8) & 0xFF, rows[0] & 0xFF,
            (rows[1] >> 8) & 0xFF, rows[1] & 0xFF,
            (rows[2] >> 8) & 0xFF, rows[2] & 0xFF,
            (rows[3] >> 8) & 0xFF, rows[3] & 0xFF
        )
    }

    // Strip PKCS#7 padding on decrypt
    let finalOut = outBytes
    if (doDecrypt && outBytes.length > 0) {
        const padByte = outBytes[outBytes.length - 1]
        if (padByte > 0 && padByte <= 8) {
            let valid = true
            for (let i = 0; i < padByte; i++) {
                if (outBytes[outBytes.length - 1 - i] !== padByte) { valid = false; break }
            }
            if (valid) finalOut = outBytes.slice(0, outBytes.length - padByte)
        }
    }

    return { output: toHex(finalOut), outputEncoding: 'hex', steps, metadata: METADATA, durationMs: performance.now() - start }
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
    return rectangleCore(input, key, false, options)
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
    return rectangleCore(input, key, true, options)
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
    { input: '0000000000000000', key: '00000000000000000000', expected: '20eb0a1f09ca08e3', description: 'RECT80 all-zero vector (reference implementation)' },
    { input: '0000000000000000', key: '00000000000000000000000000000000', expected: '0b0e0a0c0d080f0e', description: 'RECT128 all-zero vector (reference implementation)' }
]
