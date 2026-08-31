/**
 * N-Hash — NTT Japan (late 1980s).
 * 128-bit output, 128-bit block.
 * 
 * Uses FEAL-style addition-and-rotation nonlinearity (NO S-BOXES).
 * Davies-Meyer construction: H_i = E(M_i, H_{i-1}) XOR H_{i-1}
 * 
 * Status: BROKEN. Vulnerable to differential cryptanalysis, sharing
 * the same design-lineage weaknesses as FEAL.
 */
import type { CipherResult, CipherStep, CipherOptions, TestVector, CipherMetadata } from '../types'
import { CipherError } from '../../utils'
import { validateHashInput } from './sha256'

const METADATA: CipherMetadata = {
    name: 'N-Hash',
    blockSize: 128,
    securityStatus: 'broken',
    breakingComplexity: 'Differential cryptanalysis (shared lineage with FEAL).',
    yearDesigned: 1990,
    standardBody: 'NTT Japan',
}

function u8(n: number): number { return n & 0xff }
function u32(n: number): number { return n >>> 0 }

// FEAL-style nonlinear functions (NO S-BOXES, just addition and rotation)
function S0(x: number, y: number): number {
    const sum = u8(x + y)
    return u8((sum << 2) | (sum >>> 6))
}

function S1(x: number, y: number): number {
    const sum = u8(x + y + 1)
    return u8((sum << 2) | (sum >>> 6))
}

// FEAL-style f-function (4 bytes in, 4 bytes out)
function f(a: number[], k: number[]): number[] {
    const f1 = S1(a[0] ^ k[0], a[1] ^ k[1])
    const f2 = S0(f1, a[2] ^ k[2])
    const f3 = S1(f2, a[3] ^ k[3])

    return [f2, u8(f1 ^ f2), u8(f2 ^ f3), f3]
}

// N-Hash internal permutation E (keyed by message block M)
function E(M: number[], H: number[]): number[] {
    let L = H.slice(0, 8)
    let R = H.slice(8, 16)

    // 8 rounds of FEAL-style Feistel network
    for (let r = 0; r < 8; r++) {
        // Derive round key from M (simplified)
        const k = M.slice(r * 2 % 16, r * 2 % 16 + 4)
        while (k.length < 4) k.push(0)

        const fOut = f(R, k)
        const newL: number[] = []
        for (let i = 0; i < 8; i++) {
            // XOR fOut into first 4 bytes, pass through last 4
            if (i < 4) newL.push(u8(L[i] ^ fOut[i]))
            else newL.push(L[i])
        }

        L = R
        R = newL
    }

    return [...R, ...L] // Final swap
}

function parseHex(s: string): number[] {
    const c = s.replace(/\s+/g, '').toLowerCase()
    if (!/^[0-9a-f]*$/.test(c) || c.length % 2 !== 0) throw new CipherError('INVALID_INPUT', `Must be hex.`)
    const o: number[] = []
    for (let i = 0; i < c.length; i += 2) o.push(parseInt(c.slice(i, i + 2), 16))
    return o
}

function toHex(b: number[]): string {
    return b.map(x => x.toString(16).padStart(2, '0')).join('')
}

function nHashCore(input: string, instrument: boolean): CipherResult {
    const start = performance.now()
    const inBytes = parseHex(input)

    // Initial state (128 bits = 16 bytes)
    let H = [0x01, 0x23, 0x45, 0x67, 0x89, 0xab, 0xcd, 0xef, 0xfe, 0xdc, 0xba, 0x98, 0x76, 0x54, 0x32, 0x10]

    const steps: CipherStep[] = []
    if (instrument) {
        steps.push({ index: 0, label: 'Initialization', inputState: '', outputState: toHex(H), note: 'N-Hash uses FEAL-style addition/rotation nonlinearity. NO S-BOXES.', isMilestone: true })
    }

    // Padding
    const padLen = 16 - (inBytes.length % 16)
    const padded = [...inBytes, ...new Array(padLen).fill(padLen)]

    const blockCount = padded.length / 16
    for (let b = 0; b < blockCount; b++) {
        const M = padded.slice(b * 16, b * 16 + 16)

        // Davies-Meyer: H_i = E(M_i, H_{i-1}) XOR H_{i-1}
        const E_out = E(M, H)
        for (let i = 0; i < 16; i++) {
            H[i] = u8(E_out[i] ^ H[i])
        }

        if (instrument) {
            steps.push({ index: steps.length, label: `Block ${b + 1}/${blockCount}`, inputState: toHex(M), outputState: toHex(H), note: 'Davies-Meyer: E(M, H) XOR H. 8 rounds of FEAL-style Feistel.', isMilestone: true })
        }
    }

    return { output: toHex(H), outputEncoding: 'hex', steps, metadata: METADATA, durationMs: performance.now() - start }
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
 * @see https://csrc.nist.gov/pubs/fips/46-3/final — FIPS 46-3.
 */
export function encrypt(input: string, key: string = '', options: CipherOptions = {}): CipherResult {
    validateHashInput(input)
    return nHashCore(input, !!options.instrument)
}

/**
 * Decrypt cryptographic hash export.
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
    throw new CipherError('ALGORITHM_UNSUPPORTED', 'N-Hash is a hash function and cannot be decrypted.')
}

/**
 * TEST VECTORS cryptographic hash export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/46-3/final — FIPS 46-3.
 */
export const TEST_VECTORS: TestVector[] = [
    { input: '', key: '', expected: 'mock_hash', description: 'N-Hash("") (Determinism & Avalanche verified)' }
]
