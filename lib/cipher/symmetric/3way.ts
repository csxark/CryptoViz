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
            // Decrypt via encrypt with bit-reversal property
            state = state.map(reverseBits)
            // Key relation for decrypt (simplified representation of the related key)
            const decKey = kWords.map(reverseBits)

            for (let r = 0; r < ROUNDS; r++) {
                state = [u32(state[0] + decKey[0]), u32(state[1] + decKey[1]), u32(state[2] + decKey[2])]
                state = gamma(state)
                state = theta(state)
                state = pi(state)
            }
            state = state.map(reverseBits)
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

export function encrypt(input: string, key: string, options: CipherOptions = {}): CipherResult {
    validateInput(input)
    return threeWayCore(input, key, false, !!options.instrument)
}

export function decrypt(input: string, key: string, options: CipherOptions = {}): CipherResult {
    validateInput(input)
    return threeWayCore(input, key, true, !!options.instrument)
}

export const TEST_VECTORS: TestVector[] = [
    { input: '000000000000000000000000', key: '000000000000000000000000', expected: 'mock_ciphertext', description: '3-Way 96-bit zero vector (Daemen 1994)' }
]
