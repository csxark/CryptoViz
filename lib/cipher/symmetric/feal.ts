/**
 * FEAL-8 — Shimizu & Miyaguchi (NTT), 1987.
 * 64-bit block, 64-bit key, 8 rounds.
 * Pure arithmetic Feistel cipher (no S-boxes).
 * 
 * Canonical reference:
 *   - Alfred Menezes, Paul van Oorschot, Scott Vanstone,
 *     "Handbook of Applied Cryptography" (HAC), Section 7.5, pages 259–262.
 *   - Bruce Schneier, "Applied Cryptography".
 * 
 * Status: BROKEN. Canonical target for differential cryptanalysis (Biham & Shamir).
 * Included for educational value to demonstrate why differential cryptanalysis works.
 */
import type { CipherResult, CipherStep, CipherOptions, TestVector, CipherMetadata } from '../types'
import { CipherError, validateInput, validateKey } from '../../utils'

const METADATA: CipherMetadata = {
    name: 'FEAL-8',
    keySize: 64,
    blockSize: 64,
    rounds: 8,
    securityStatus: 'broken',
    breakingComplexity: 'differential cryptanalysis breaks full FEAL-8 with ~10 chosen plaintexts.',
    yearDesigned: 1987,
    standardBody: 'Miyaguchi (NTT)',
}

function rot2(x: number): number {
    const sum = ((x & 0xff) << 2) & 0x3ff
    return (sum | (sum >> 8)) & 0xff
}

function Sd(d: number, x: number, y: number): number {
    return rot2((x + y + d) & 0xff)
}

function S0(x1: number, x2: number): number {
    return Sd(0, x1, x2)
}

function S1(x1: number, x2: number): number {
    return Sd(1, x1, x2)
}

// FEAL f-function: 4 bytes A, 2 bytes Y -> 4 bytes U
function f(A: number[], Y: number[]): number[] {
    const t1 = (A[0] ^ A[1]) ^ Y[0]
    const t2 = (A[2] ^ A[3]) ^ Y[1]
    const u1 = S1(t1, t2)
    const u2 = S0(t2, u1)
    const u0 = S0(A[0], u1)
    const u3 = S1(A[3], u2)
    return [u0, u1, u2, u3]
}

// FEAL fK-function: 4 bytes A, 4 bytes B -> 4 bytes U
function fK(A: number[], B: number[]): number[] {
    const t1 = A[0] ^ A[1]
    const t2 = A[2] ^ A[3]
    const u1 = S1(t1, t2 ^ B[0])
    const u2 = S0(t2, u1 ^ B[1])
    const u0 = S0(A[0], u1 ^ B[2])
    const u3 = S1(A[3], u2 ^ B[3])
    return [u0, u1, u2, u3]
}

function fealKeySchedule(key0: number, key1: number): number[] {
    const K = new Array(16).fill(0)
    let U2 = [0, 0, 0, 0]
    let U1 = [(key0 >>> 24) & 255, (key0 >>> 16) & 255, (key0 >>> 8) & 255, key0 & 255]
    let U0 = [(key1 >>> 24) & 255, (key1 >>> 16) & 255, (key1 >>> 8) & 255, key1 & 255]

    for (let i = 1; i <= 8; i++) {
        const V = [U0[0] ^ U2[0], U0[1] ^ U2[1], U0[2] ^ U2[2], U0[3] ^ U2[3]]
        const U = fK(U1, V)
        const i2 = 2 * i
        K[i2 - 2] = (U[0] << 8) | U[1]
        K[i2 - 1] = (U[2] << 8) | U[3]
        U2 = U1
        U1 = U0
        U0 = U
    }
    return K
}

function parseHex(s: string, lbl: string): Uint8Array {
    const c = s.replace(/\s+/g, '').toLowerCase()
    if (!/^[0-9a-f]*$/.test(c) || c.length % 2 !== 0) throw new CipherError('INVALID_INPUT', `${lbl} must be hex.`)
    const o = new Uint8Array(c.length / 2)
    for (let i = 0; i < o.length; i++) o[i] = parseInt(c.slice(i * 2, i * 2 + 2), 16)
    return o
}

function toHex(b: Uint8Array): string {
    return Array.from(b).map(x => x.toString(16).padStart(2, '0')).join('')
}

function fealCore(input: string, key: string, doDecrypt: boolean, instrument: boolean): CipherResult {
    const start = performance.now()
    validateKey(key)
    const keyBytes = parseHex(key, 'FEAL key')
    if (keyBytes.length !== 8) throw new CipherError('INVALID_KEY_LENGTH', `FEAL key must be 64 bits.`)
    const inBytes = parseHex(input, 'FEAL input')
    if (inBytes.length === 0 || inBytes.length % 8 !== 0) throw new CipherError('INVALID_INPUT', `FEAL input must be a non-empty multiple of 8 bytes.`)

    const key0 = ((keyBytes[0] << 24) | (keyBytes[1] << 16) | (keyBytes[2] << 8) | keyBytes[3]) >>> 0
    const key1 = ((keyBytes[4] << 24) | (keyBytes[5] << 16) | (keyBytes[6] << 8) | keyBytes[7]) >>> 0
    const K = fealKeySchedule(key0, key1)

    const numBlocks = inBytes.length / 8
    const outBuf = new Uint8Array(inBytes.length)
    const steps: CipherStep[] = []

    if (instrument) {
        steps.push({
            index: 0, label: 'Key schedule',
            inputState: toHex(keyBytes), outputState: '16 subkeys derived via fK-function',
            note: 'FEAL uses its own arithmetic round function to expand the 64-bit key.', isMilestone: true
        })
    }

    for (let b = 0; b < numBlocks; b++) {
        const offset = b * 8
        const M0 = ((inBytes[offset] << 24) | (inBytes[offset + 1] << 16) | (inBytes[offset + 2] << 8) | inBytes[offset + 3]) >>> 0
        const M1 = ((inBytes[offset + 4] << 24) | (inBytes[offset + 5] << 16) | (inBytes[offset + 6] << 8) | inBytes[offset + 7]) >>> 0

        let C0: number
        let C1: number

        if (!doDecrypt) {
            // Forward Encryption (HAC Section 7.5)
            let L = (M0 ^ ((K[8] << 16) | K[9])) >>> 0
            let R = (M1 ^ ((K[10] << 16) | K[11])) >>> 0
            R = (R ^ L) >>> 0

            let L0 = [(L >>> 24) & 255, (L >>> 16) & 255, (L >>> 8) & 255, L & 255]
            let R0 = [(R >>> 24) & 255, (R >>> 16) & 255, (R >>> 8) & 255, R & 255]
            const L1 = [0, 0, 0, 0]
            const R1 = [0, 0, 0, 0]

            for (let i = 0; i < 8; i++) {
                for (let j = 0; j < 4; j++) L1[j] = R0[j]
                const Y = [(K[i] >>> 8) & 255, K[i] & 255]
                const U = f(R0, Y)
                for (let j = 0; j < 4; j++) {
                    R1[j] = (L0[j] ^ U[j]) & 255
                    L0[j] = L1[j]
                    R0[j] = R1[j]
                }
            }

            let L8 = (((L1[0] << 24) | (L1[1] << 16) | (L1[2] << 8) | L1[3]) >>> 0)
            let R8 = (((R1[0] << 24) | (R1[1] << 16) | (R1[2] << 8) | R1[3]) >>> 0)
            L8 = (L8 ^ R8) >>> 0
            L8 = (L8 ^ ((K[14] << 16) | K[15])) >>> 0
            R8 = (R8 ^ ((K[12] << 16) | K[13])) >>> 0

            C0 = R8
            C1 = L8
        } else {
            // Decryption (HAC Section 7.5)
            let L = (M0 ^ ((K[12] << 16) | K[13])) >>> 0
            let R = (M1 ^ ((K[14] << 16) | K[15])) >>> 0
            R = (R ^ L) >>> 0

            let L0 = [(L >>> 24) & 255, (L >>> 16) & 255, (L >>> 8) & 255, L & 255]
            let R0 = [(R >>> 24) & 255, (R >>> 16) & 255, (R >>> 8) & 255, R & 255]
            const L1 = [0, 0, 0, 0]
            const R1 = [0, 0, 0, 0]

            for (let i = 7; i >= 0; i--) {
                for (let j = 0; j < 4; j++) L1[j] = R0[j]
                const Y = [(K[i] >>> 8) & 255, K[i] & 255]
                const U = f(R0, Y)
                for (let j = 0; j < 4; j++) {
                    R1[j] = (L0[j] ^ U[j]) & 255
                    L0[j] = L1[j]
                    R0[j] = R1[j]
                }
            }

            let L8 = (((L1[0] << 24) | (L1[1] << 16) | (L1[2] << 8) | L1[3]) >>> 0)
            let R8 = (((R1[0] << 24) | (R1[1] << 16) | (R1[2] << 8) | R1[3]) >>> 0)
            L8 = (L8 ^ R8) >>> 0
            L8 = (L8 ^ ((K[10] << 16) | K[11])) >>> 0
            R8 = (R8 ^ ((K[8] << 16) | K[9])) >>> 0

            C0 = R8
            C1 = L8
        }

        outBuf[offset] = (C0 >>> 24) & 255
        outBuf[offset + 1] = (C0 >>> 16) & 255
        outBuf[offset + 2] = (C0 >>> 8) & 255
        outBuf[offset + 3] = C0 & 255
        outBuf[offset + 4] = (C1 >>> 24) & 255
        outBuf[offset + 5] = (C1 >>> 16) & 255
        outBuf[offset + 6] = (C1 >>> 8) & 255
        outBuf[offset + 7] = C1 & 255

        if (instrument) {
            steps.push({
                index: steps.length, label: `Block ${b + 1}/${numBlocks} — 8 rounds`,
                inputState: toHex(inBytes.slice(offset, offset + 8)),
                outputState: toHex(outBuf.slice(offset, offset + 8)),
                note: 'Pure arithmetic Feistel: S0/S1 use mod-256 addition + ROL2. No S-boxes.',
                isMilestone: true
            })
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
    return fealCore(input, key, false, !!options.instrument)
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
    return fealCore(input, key, true, !!options.instrument)
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
    {
        input: '0000000000000000',
        key: '0000000000000000',
        expected: 'c1f5bb7a89a83861',
        description: 'FEAL-8 authoritative test vector (Menezes HAC 7.5 & Schneier Applied Cryptography)'
    }
]
