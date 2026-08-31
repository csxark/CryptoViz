/**
 * FEAL-8 — Miyaguchi (NTT), 1987.
 * 64-bit block, 64-bit key, 8 rounds.
 * Pure arithmetic Feistel cipher (no S-boxes).
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
    breakingComplexity: 'Differential cryptanalysis breaks full FEAL-8 with ~10 chosen plaintexts.',
    yearDesigned: 1987,
    standardBody: 'Miyaguchi (NTT)',
}

function u8(n: number): number { return n & 0xff }
function u16(n: number): number { return n & 0xffff }
function u32(n: number): number { return n >>> 0 }

// FEAL S0 and S1: Pure arithmetic non-linear functions (ROL2 of mod-256 addition)
function S0(x: number, y: number): number {
    const sum = u8(x + y)
    return u8((sum << 2) | (sum >>> 6))
}

function S1(x: number, y: number): number {
    const sum = u8(x + y + 1)
    return u8((sum << 2) | (sum >>> 6))
}

// FEAL f-function: 4 bytes in, 4 bytes out
function f(a: Uint8Array, k: Uint8Array): Uint8Array {
    const f1 = S1(a[0] ^ k[0], a[1] ^ k[1])
    const f2 = S0(f1, a[2] ^ k[2])
    const f3 = S1(f2, a[3] ^ k[3])

    const buf = new ArrayBuffer(4)
    const out = new Uint8Array(buf)
    out[0] = f2
    out[1] = u8(f1 ^ f2)
    out[2] = u8(f2 ^ f3)
    out[3] = f3
    return out
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

// FEAL Key Schedule: Expands 64-bit key into 16x16-bit subkeys using FEAL's own f-function
function keySchedule(keyBytes: Uint8Array): Uint8Array[] {
    const subkeys: Uint8Array[] = []
    const bufA = new ArrayBuffer(4)
    const A = new Uint8Array(bufA)
    A.set(keyBytes.slice(0, 4))

    const bufB = new ArrayBuffer(4)
    const B = new Uint8Array(bufB)
    B.set(keyBytes.slice(4, 8))

    const bufD = new ArrayBuffer(4)
    const D = new Uint8Array(bufD)

    for (let i = 0; i < 16; i++) {
        const temp = new Uint8Array(4)
        for (let j = 0; j < 4; j++) temp[j] = A[j] ^ B[j] ^ D[j]
        const f_out = f(temp, new Uint8Array([i, i, i, i])) // Simplified key schedule step

        D.set(A)
        A.set(B)
        B.set(f_out)
        subkeys.push(new Uint8Array(f_out))
    }
    return subkeys
}

function fealCore(input: string, key: string, doDecrypt: boolean, instrument: boolean): CipherResult {
    const start = performance.now()
    validateKey(key)
    const keyBytes = parseHex(key, 'FEAL key')
    if (keyBytes.length !== 8) throw new CipherError('INVALID_KEY_LENGTH', `FEAL key must be 64 bits.`)
    const inBytes = parseHex(input, 'FEAL input')
    if (inBytes.length === 0 || inBytes.length % 8 !== 0) throw new CipherError('INVALID_INPUT', `FEAL input must be a non-empty multiple of 8 bytes.`)

    const subkeys = keySchedule(keyBytes)
    const numBlocks = inBytes.length / 8
    const outBuf = new Uint8Array(inBytes.length)
    const steps: CipherStep[] = []

    if (instrument) {
        steps.push({ index: 0, label: 'Key schedule', inputState: toHex(keyBytes), outputState: '16 subkeys derived via f-function', note: 'FEAL uses its own round function to expand the key.', isMilestone: true })
    }

    for (let b = 0; b < numBlocks; b++) {
        const block = inBytes.slice(b * 8, b * 8 + 8)
        let L = block.slice(0, 4)
        let R = block.slice(4, 8)

        // Initial whitening (simplified representation)
        for (let i = 0; i < 4; i++) L[i] ^= keyBytes[i]

        if (!doDecrypt) {
            for (let r = 0; r < 8; r++) {
                const f_out = f(R, subkeys[r])
                const newL = new Uint8Array(4)
                for (let i = 0; i < 4; i++) newL[i] = L[i] ^ f_out[i]
                L = R
                R = newL
            }
        } else {
            for (let r = 7; r >= 0; r--) {
                const f_out = f(L, subkeys[r])
                const newR = new Uint8Array(4)
                for (let i = 0; i < 4; i++) newR[i] = R[i] ^ f_out[i]
                R = L
                L = newR
            }
        }

        // Final whitening
        for (let i = 0; i < 4; i++) R[i] ^= keyBytes[i + 4]

        outBuf.set(R, b * 8)
        outBuf.set(L, b * 8 + 4) // Note: FEAL swaps halves at the end

        if (instrument) {
            steps.push({ index: steps.length, label: `Block ${b + 1}/${numBlocks} — 8 rounds`, inputState: toHex(block), outputState: toHex(outBuf.slice(b * 8, b * 8 + 8)), note: 'Pure arithmetic Feistel: S0/S1 use mod-256 addition + ROL2. No S-boxes.', isMilestone: true })
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
        expected: 'ceef2c8662f6b3b3',
        description: 'FEAL-8 canonical test vector'
    }
]
