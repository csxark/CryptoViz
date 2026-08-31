/**
 * TWINE — NTT Japan, IEICE 2013
 * Ultra-compact Type-2 Generalised Feistel cipher.
 * 64-bit block (16 nibbles), 36 rounds, 4-bit S-box.
 * TWINE-80 (80-bit key) and TWINE-128 (128-bit key).
 */
import type { CipherResult, CipherStep, CipherOptions, TestVector, CipherMetadata } from '../types'
import { CipherError } from '../../utils/errors'

const METADATA: CipherMetadata = {
    name: 'TWINE',
    keySize: 80,
    blockSize: 64,
    rounds: 36,
    securityStatus: 'legacy',
    breakingComplexity: 'Ultra-lightweight Type-2 GFN. Targets < 2000 GE hardware.',
    yearDesigned: 2013,
    standardBody: 'IEICE 2013',
}

const S = [0xC, 0x0, 0xF, 0xA, 0x2, 0xB, 0x9, 0x5, 0x8, 0x3, 0xD, 0x7, 0x1, 0xE, 0x6, 0x4]
const S_INV = new Array(16).fill(0)
S.forEach((v, i) => S_INV[v] = i)

// Nibble permutation P
const P = [5, 0, 1, 4, 7, 12, 3, 8, 13, 2, 15, 6, 11, 10, 9, 14]
const P_INV = new Array(16).fill(0)
P.forEach((v, i) => P_INV[v] = i)

function u4(n: number): number { return n & 0xF }

function parseHex(s: string, lbl: string): number[] {
    const c = s.replace(/\s+/g, '').toLowerCase()
    if (!/^[0-9a-f]*$/.test(c) || c.length % 2 !== 0) throw new CipherError('INVALID_INPUT', `${lbl} must be hex.`)
    const o: number[] = []
    for (let i = 0; i < c.length; i += 2) o.push(parseInt(c.slice(i, i + 2), 16))
    return o
}
function toHex(b: number[]): string { return b.map(x => x.toString(16).padStart(2, '0')).join('') }

function bytesToNibbles(bytes: number[]): number[] {
    const nibbles: number[] = []
    for (const b of bytes) {
        nibbles.push((b >> 4) & 0xF)
        nibbles.push(b & 0xF)
    }
    return nibbles
}
function nibblesToBytes(nibbles: number[]): number[] {
    const bytes: number[] = []
    for (let i = 0; i < nibbles.length; i += 2) {
        bytes.push((nibbles[i] << 4) | nibbles[i + 1])
    }
    return bytes
}

function keySchedule(keyBytes: number[], keySize: number): number[][] {
    const wk = bytesToNibbles(keyBytes)
    const rk: number[][] = []

    // Simplified key schedule for visualizer (extracts 8 nibbles per round)
    for (let r = 0; r < 36; r++) {
        const roundKeys: number[] = []
        for (let i = 0; i < 8; i++) {
            roundKeys.push(wk[(r + i) % wk.length])
        }
        rk.push(roundKeys)

        // Update key register (simplified permutation)
        const tmp = wk.shift()!
        wk.push(u4(tmp ^ r))
    }
    return rk
}

function twineCore(input: string, key: string, doDecrypt: boolean, options: CipherOptions): CipherResult {
    const start = performance.now()
    const keySize = parseInt((options.keySize as string) || '80')
    const keyBytes = parseHex(key, 'TWINE key')
    if (keyBytes.length !== keySize / 8) throw new CipherError('INVALID_KEY_LENGTH', `Key must be ${keySize / 8} bytes.`)
    const inBytes = parseHex(input, 'TWINE input')
    if (inBytes.length !== 8) throw new CipherError('INVALID_INPUT', 'Input must be 8 bytes.')

    const rk = keySchedule(keyBytes, keySize)
    let x = bytesToNibbles(inBytes)

    const steps: CipherStep[] = []
    const seq = doDecrypt ? Array.from({ length: 36 }, (_, i) => 35 - i) : Array.from({ length: 36 }, (_, i) => i)

    for (const r of seq) {
        const roundKeys = rk[r]

        if (!doDecrypt) {
            // 8 F-functions in parallel
            for (let i = 0; i < 8; i++) {
                const fOut = u4(S[u4(x[2 * i + 1] ^ roundKeys[i])] ^ x[2 * i])
                x[2 * i] = fOut // Type-2 GFN: XOR even nibble with F(odd nibble)
            }
            // Permutation P (except last round)
            if (r < 35) {
                const tmp = new Array(16)
                for (let i = 0; i < 16; i++) tmp[i] = x[P[i]]
                x = tmp
            }
        } else {
            // Inverse Permutation (except last round in decryption sequence, which is round 0)
            if (r < 35) {
                const tmp = new Array(16)
                for (let i = 0; i < 16; i++) tmp[i] = x[P_INV[i]]
                x = tmp
            }
            // Inverse F-functions
            for (let i = 0; i < 8; i++) {
                const fOut = u4(S[u4(x[2 * i + 1] ^ roundKeys[i])] ^ x[2 * i])
                x[2 * i] = fOut
            }
        }

        if (r % 9 === 0) {
            steps.push({ index: steps.length, label: `Round ${r + 1} — Type-2 GFN`, inputState: toHex(inBytes), outputState: toHex(nibblesToBytes(x)), note: `8 parallel F-functions + nibble permutation P.` })
        }
    }

    return { output: toHex(nibblesToBytes(x)), outputEncoding: 'hex', steps, metadata: METADATA, durationMs: performance.now() - start }
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
    return twineCore(input, key, false, options)
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
    return twineCore(input, key, true, options)
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
    { input: '0011223344556677', key: '00112233445566778899', expected: 'mock_twine_80', description: 'TWINE-80 representative vector' }
]
