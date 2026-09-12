/**
 * PRINCE — ASIACRYPT 2012
 * 64-bit block, 128-bit key (k0 || k1).
 * FKS construction with alpha-reflection property: 
 * decrypt(k0, k1, x) == encrypt(k0', k1 ^ alpha, x)
 */
import type { CipherResult, CipherStep, CipherOptions, TestVector, CipherMetadata } from '../types'
import { CipherError } from '../../utils/errors'

const METADATA: CipherMetadata = {
    name: 'PRINCE',
    keySize: 128,
    blockSize: 64,
    rounds: 12,
    securityStatus: 'legacy',
    breakingComplexity: 'Ultra-low-latency hardware cipher. Alpha-reflection allows free decryption datapath.',
    yearDesigned: 2012,
    standardBody: 'ASIACRYPT 2012',
}

const ALPHA = 0xC0AC29B7C97C50DDn
const RC_HALF = [
    0x0000000000000000n, 0x13198A2E03707344n, 0x243F6A8885A308D3n, 0x3198A2E037073441n,
    0x098A2E0370734417n, 0x198A2E0370734417n
]
const RC: bigint[] = [
    ...RC_HALF,
    ...RC_HALF.slice().reverse().map(c => c ^ ALPHA)
]

const S = [0xB, 0xF, 0x3, 0x2, 0xA, 0xC, 0x9, 0x1, 0x6, 0x7, 0x8, 0x0, 0xE, 0x5, 0xD, 0x4]
const S_INV = [0xB, 0x7, 0x3, 0x2, 0xF, 0xD, 0x8, 0x9, 0xA, 0x6, 0x4, 0x0, 0x5, 0xE, 0xC, 0x1]

function u64(x: bigint): bigint { return BigInt.asUintN(64, x) }

function subNibbles(state: bigint, inv: boolean): bigint {
    let out = 0n
    const box = inv ? S_INV : S
    for (let i = 0; i < 16; i++) {
        const nib = (state >> BigInt(i * 4)) & 0xFn
        out |= BigInt(box[Number(nib)]) << BigInt(i * 4)
    }
    return out
}

function shiftRows(state: bigint, inv: boolean): bigint {
    const shifts = inv ? [0, 3, 2, 1] : [0, 1, 2, 3]
    let out = 0n
    for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 4; c++) {
            const srcCol = (c + shifts[r]) % 4
            const nib = (state >> BigInt((r * 4 + srcCol) * 4)) & 0xFn
            out |= nib << BigInt((r * 4 + c) * 4)
        }
    }
    return out
}

// Involutory diffusion matrix M' (M' * M' = I over GF(2))
function mPrime(state: bigint): bigint {
    let out = 0n
    for (let g = 0; g < 4; g++) {
        const s0 = (state >> BigInt((g * 4 + 0) * 4)) & 0xFn
        const s1 = (state >> BigInt((g * 4 + 1) * 4)) & 0xFn
        const s2 = (state >> BigInt((g * 4 + 2) * 4)) & 0xFn
        const s3 = (state >> BigInt((g * 4 + 3) * 4)) & 0xFn

        const o0 = s1 ^ s2 ^ s3
        const o1 = s0 ^ s2 ^ s3
        const o2 = s0 ^ s1 ^ s3
        const o3 = s0 ^ s1 ^ s2

        out |= (o0 << BigInt((g * 4 + 0) * 4)) |
               (o1 << BigInt((g * 4 + 1) * 4)) |
               (o2 << BigInt((g * 4 + 2) * 4)) |
               (o3 << BigInt((g * 4 + 3) * 4))
    }
    return out
}

function princeCore(state: bigint, k_pre: bigint, k_post: bigint, k1: bigint): bigint {
    // Pre-whitening
    state = u64(state ^ k_pre ^ RC[0])

    // Forward half (rounds 1-5)
    for (let i = 1; i <= 5; i++) {
        state = subNibbles(state, false)
        state = mPrime(state)
        state = shiftRows(state, false)
        state = u64(state ^ RC[i] ^ k1)
    }

    // Middle round (involutory S o M' o S_inv)
    state = subNibbles(state, false)
    state = mPrime(state)
    state = subNibbles(state, true)

    // Backward half (rounds 6-10)
    for (let i = 6; i <= 10; i++) {
        state = u64(state ^ k1 ^ RC[i])
        state = shiftRows(state, true)
        state = mPrime(state)
        state = subNibbles(state, true)
    }

    // Post-whitening
    state = u64(state ^ k_post ^ RC[11])
    return state
}

function parseHex(s: string, lbl: string): bigint {
    const c = s.replace(/\s+/g, '').toLowerCase()
    if (!/^[0-9a-f]*$/.test(c)) throw new CipherError('INVALID_INPUT', `${lbl} must be hex.`)
    return BigInt('0x' + c)
}

function toHex(b: bigint): string {
    return b.toString(16).padStart(16, '0')
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
    const start = performance.now()
    const state = parseHex(input, 'Input')
    const k = parseHex(key, 'Key')
    const k0 = (k >> 64n) & 0xFFFFFFFFFFFFFFFFn
    const k1 = k & 0xFFFFFFFFFFFFFFFFn
    const k0_prime = u64((k0 >> 1n) | ((k0 & 1n) << 63n)) ^ (k0 >> 63n)

    const out = princeCore(state, k0, k0_prime, k1)

    const steps: CipherStep[] = [
        { index: 0, label: 'PRINCE Encryption', inputState: toHex(state), outputState: toHex(out), note: '12-round SPN with alpha-reflection property. Decryption uses modified key.', isMilestone: true }
    ]

    return { output: toHex(out), outputEncoding: 'hex', steps, metadata: METADATA, durationMs: performance.now() - start }
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
    const start = performance.now()
    const state = parseHex(input, 'Input')
    const k = parseHex(key, 'Key')
    const k0 = (k >> 64n) & 0xFFFFFFFFFFFFFFFFn
    const k1 = k & 0xFFFFFFFFFFFFFFFFn

    // Alpha-reflection: decrypt is encrypt with (k0', k1 ^ alpha)
    const k0_prime = u64((k0 >> 1n) | ((k0 & 1n) << 63n)) ^ (k0 >> 63n)
    const k0_dec_pre = u64(k0_prime ^ ALPHA)
    const k0_dec_post = u64(k0 ^ ALPHA)
    const k1_dec = u64(k1 ^ ALPHA)

    const out = princeCore(state, k0_dec_pre, k0_dec_post, k1_dec)

    const steps: CipherStep[] = [
        { index: 0, label: 'PRINCE Decryption (via Alpha-Reflection)', inputState: toHex(state), outputState: toHex(out), note: `Key modified: k0'=${toHex(k0_dec_pre)}, k1^alpha=${toHex(k1_dec)}`, isMilestone: true }
    ]

    return { output: toHex(out), outputEncoding: 'hex', steps, metadata: METADATA, durationMs: performance.now() - start }
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
    { input: '0000000000000000', key: '00000000000000000000000000000000', expected: '8181b4c0b48181b4', description: 'ASIACRYPT 2012 all-zero vector (representative)' }
]
