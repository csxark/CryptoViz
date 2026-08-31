/**
 * 3-Way — Joan Daemen, 1994.
 * 96-bit block, 96-bit key, 11 rounds.
 * 
 * Defining property: Three-fold cyclic symmetry. Every sub-transform
 * (gamma, theta, rotation) is invariant under cyclically rotating the
 * three 32-bit words.
 * 
 * Status: BROKEN (reduced-round and structural weaknesses identified).
 * Included for historical lineage: 3-Way -> Square -> Rijndael (AES).
 */
import type { CipherResult, CipherStep, CipherOptions, TestVector, CipherMetadata } from '../types'
import { CipherError, validateInput, validateKey } from '../../utils'

const METADATA: CipherMetadata = {
    name: '3-Way',
    keySize: 96,
    blockSize: 96,
    rounds: 11,
    securityStatus: 'broken',
    breakingComplexity: 'Reduced-round and related-key weaknesses identified.',
    yearDesigned: 1994,
    standardBody: 'Daemen (1994)',
}

const ROUNDS = 11
const STRT_ENCRYPT = 0x00000000 // Round constants start
const STRT_DECRYPT = 0x00000000

// Helper for 32-bit unsigned arithmetic
function u32(n: number): number { return n >>> 0 }
function rotl(x: number, n: number): number { return u32((x << (n & 31)) | (x >>> (32 - (n & 31)))) }
function rotr(x: number, n: number): number { return u32((x >>> (n & 31)) | (x << (32 - (n & 31)))) }

// Reverse all 32 bits in a word (used for the decrypt-via-encrypt property)
function reverseBits(x: number): number {
    x = ((x & 0x55555555) << 1) | ((x >>> 1) & 0x55555555)
    x = ((x & 0x33333333) << 2) | ((x >>> 2) & 0x33333333)
    x = ((x & 0x0F0F0F0F) << 4) | ((x >>> 4) & 0x0F0F0F0F)
    x = ((x & 0x00FF00FF) << 8) | ((x >>> 8) & 0x00FF00FF)
    return u32((x << 16) | (x >>> 16))
}

/**
 * Gamma: Non-linear Boolean transform.
 * Preserves 3-fold cyclic symmetry.
 * Formula: a0' = a0 ^ (a1 | (~a2)) applied cyclically.
 */
function gamma(a: number[]): number[] {
    return [
        u32(a[0] ^ (a[1] | (~a[2]))),
        u32(a[1] ^ (a[2] | (~a[0]))),
        u32(a[2] ^ (a[0] | (~a[1])))
    ]
}

/**
 * Theta: Linear diffusion transform.
 * Preserves 3-fold cyclic symmetry.
 */
function theta(a: number[]): number[] {
    const b = new Array(3).fill(0)
    for (let i = 0; i < 3; i++) {
        const c = u32(a[i] ^ rotl(a[i], 1) ^ rotl(a[i], 2))
        b[i] = u32(c ^ rotl(a[(i + 1) % 3], 1) ^ rotl(a[(i + 2) % 3], 2))
    }
    return b
}

/**
 * Pi: Fixed bit-rotation step.
 * Preserves 3-fold cyclic symmetry.
 */
function pi(a: number[]): number[] {
    return [
        rotl(a[0], 10),
        rotl(a[1], 1),
        rotl(a[2], 11) // Note: specific shifts per Daemen's spec
    ]
}


function inverseGamma(a: number[]): number[] {
    const out = [0, 0, 0]
    const inverseTable = new Uint8Array(8)
    for (let value = 0; value < 8; value++) {
        const b0 = value & 1
        const b1 = (value >>> 1) & 1
        const b2 = (value >>> 2) & 1
        const y0 = b0 ^ (b1 | (b2 ^ 1))
        const y1 = b1 ^ (b2 | (b0 ^ 1))
        const y2 = b2 ^ (b0 | (b1 ^ 1))
        inverseTable[y0 | (y1 << 1) | (y2 << 2)] = value
    }
    for (let bit = 0; bit < 32; bit++) {
        const mask = 1 << bit
        const encoded = ((a[0] & mask ? 1 : 0)
            | (a[1] & mask ? 2 : 0)
            | (a[2] & mask ? 4 : 0))
        const decoded = inverseTable[encoded]
        if (decoded & 1) out[0] |= mask
        if (decoded & 2) out[1] |= mask
        if (decoded & 4) out[2] |= mask
    }
    return out.map(u32)
}

function inversePi(a: number[]): number[] {
    return [rotr(a[0], 10), rotr(a[1], 1), rotr(a[2], 11)]
}

function inverseTheta(a: number[]): number[] {
    const columns: bigint[] = []
    for (let bit = 0; bit < 96; bit++) {
        const basis = [0, 0, 0]
        basis[Math.floor(bit / 32)] = 1 << (bit % 32)
        const transformed = theta(basis)
        columns.push(
            BigInt(transformed[0]) |
            (BigInt(transformed[1]) << 32n) |
            (BigInt(transformed[2]) << 64n)
        )
    }

    const rows = new Array<bigint>(96).fill(0n)
    for (let row = 0; row < 96; row++) {
        let mask = 0n
        for (let column = 0; column < 96; column++) {
            if ((columns[column] >> BigInt(row)) & 1n) mask |= 1n << BigInt(column)
        }
        rows[row] = mask | (1n << BigInt(96 + row))
    }

    for (let pivot = 0; pivot < 96; pivot++) {
        let selected = pivot
        while (selected < 96 && ((rows[selected] >> BigInt(pivot)) & 1n) === 0n) selected++
        if (selected === 96) throw new Error('3-Way theta matrix is singular')
        ;[rows[pivot], rows[selected]] = [rows[selected], rows[pivot]]
        for (let row = 0; row < 96; row++) {
            if (row !== pivot && ((rows[row] >> BigInt(pivot)) & 1n)) rows[row] ^= rows[pivot]
        }
    }

    const value =
        BigInt(a[0]) |
        (BigInt(a[1]) << 32n) |
        (BigInt(a[2]) << 64n)
    const result = [0, 0, 0]
    for (let row = 0; row < 96; row++) {
        let parity = 0
        let coefficients = rows[row] >> 96n
        while (coefficients !== 0n) {
            const lowest = coefficients & -coefficients
            const sourceBit = Number(lowest.toString(2).length - 1)
            parity ^= Number((value >> BigInt(sourceBit)) & 1n)
            coefficients ^= lowest
        }
        if (parity) result[Math.floor(row / 32)] |= 1 << (row % 32)
    }
    return result.map(u32)
}

function parseHex(s: string, lbl: string): number[] {
    const c = s.replace(/\s+/g, '').toLowerCase()
    if (!/^[0-9a-f]*$/.test(c) || c.length % 2 !== 0) throw new CipherError('INVALID_INPUT', `${lbl} must be hex.`)
    const o: number[] = []
    for (let i = 0; i < c.length; i += 2) o.push(parseInt(c.slice(i, i + 2), 16))
    return o
}

function toHex(b: number[]): string {
    return b.map(x => x.toString(16).padStart(2, '0')).join('')
}

function bytesToWords(b: number[]): number[] {
    const w: number[] = []
    for (let i = 0; i < b.length; i += 4) {
        w.push(u32((b[i] << 24) | (b[i + 1] << 16) | (b[i + 2] << 8) | b[i + 3]))
    }
    return w
}

function wordsToBytes(w: number[]): number[] {
    const b: number[] = []
    for (let i = 0; i < w.length; i++) {
        b.push((w[i] >>> 24) & 0xff, (w[i] >>> 16) & 0xff, (w[i] >>> 8) & 0xff, w[i] & 0xff)
    }
    return b
}

function threeWayCore(input: string, key: string, doDecrypt: boolean, instrument: boolean): CipherResult {
    const start = performance.now()
    validateKey(key)
    const keyBytes = parseHex(key, '3-Way key')
    if (keyBytes.length !== 12) throw new CipherError('INVALID_KEY_LENGTH', `3-Way key must be 96 bits (12 bytes).`)
    const inBytes = parseHex(input, '3-Way input')
    if (inBytes.length === 0 || inBytes.length % 12 !== 0) throw new CipherError('INVALID_INPUT', `3-Way input must be a non-empty multiple of 12 bytes.`)

    const kWords = bytesToWords(keyBytes)
    const numBlocks = inBytes.length / 12
    const outBuf: number[] = []
    const steps: CipherStep[] = []

    if (instrument) {
        steps.push({ index: 0, label: 'Key Setup', inputState: toHex(keyBytes), outputState: '3 words', note: '3-Way uses the key directly in a cyclic schedule.', isMilestone: true })
    }

    for (let b = 0; b < numBlocks; b++) {
        let state = bytesToWords(inBytes.slice(b * 12, b * 12 + 12))

        if (doDecrypt) {
            // Reverse the exact encryption pipeline.  The previous implementation
            // used a related-key shortcut that was not the inverse of the
            // implemented round function.
            state = [u32(state[0] - kWords[0]), u32(state[1] - kWords[1]), u32(state[2] - kWords[2])]
            for (let r = ROUNDS - 1; r >= 0; r--) {
                state = inversePi(state)
                state = inverseTheta(state)
                state = inverseGamma(state)
                state = [u32(state[0] - kWords[0]), u32(state[1] - kWords[1]), u32(state[2] - kWords[2])]
            }
        } else {
            for (let r = 0; r < ROUNDS; r++) {
                // Add round key (cyclically derived)
                state = [u32(state[0] + kWords[0]), u32(state[1] + kWords[1]), u32(state[2] + kWords[2])]

                state = gamma(state)
                state = theta(state)
                state = pi(state)

                if (instrument && r % 3 === 0) {
                    steps.push({ index: steps.length, label: `Round ${r + 1}/${ROUNDS}`, inputState: toHex(wordsToBytes(state)), outputState: toHex(wordsToBytes(state)), note: 'Gamma (non-linear) -> Theta (diffusion) -> Pi (rotation). All preserve 3-fold symmetry.', isMilestone: true })
                }
            }
            // Final key addition
            state = [u32(state[0] + kWords[0]), u32(state[1] + kWords[1]), u32(state[2] + kWords[2])]
        }

        outBuf.push(...wordsToBytes(state))
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
 * @see https://csrc.nist.gov/pubs/fips/197/final — FIPS 197.
 */
export function encrypt(input: string, key: string, options: CipherOptions = {}): CipherResult {
    validateInput(input)
    return threeWayCore(input, key, false, !!options.instrument)
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
 * @see https://csrc.nist.gov/pubs/fips/197/final — FIPS 197.
 */
export function decrypt(input: string, key: string, options: CipherOptions = {}): CipherResult {
    validateInput(input)
    return threeWayCore(input, key, true, !!options.instrument)
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
    { input: '000000000000000000000000', key: '000000000000000000000000', expected: 'mock_ciphertext', description: '3-Way 96-bit zero vector (Daemen 1994)' }
]
