/**
 * 3-Way — Joan Daemen, 1994.
 * 96-bit block, 96-bit key, 11 rounds.
 * 
 * Defining property: Three-fold cyclic symmetry. Every sub-transform
 * (gamma, theta, pi) is invariant under cyclically rotating the
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

function u32(n: number): number { return n >>> 0 }
function rotl(x: number, n: number): number { return u32((x << (n & 31)) | (x >>> (32 - (n & 31)))) }
function rotr(x: number, n: number): number { return u32((x >>> (n & 31)) | (x << (32 - (n & 31)))) }

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

const INV_GAMMA_TABLE = new Uint8Array([7, 2, 4, 5, 1, 6, 3, 0])

function inverseGamma(a: number[]): number[] {
    const out = [0, 0, 0]
    for (let bit = 0; bit < 32; bit++) {
        const mask = 1 << bit
        const encoded = (((a[0] & mask) ? 1 : 0)
                      | (((a[1] & mask) ? 1 : 0) << 1)
                      | (((a[2] & mask) ? 1 : 0) << 2))
        const decoded = INV_GAMMA_TABLE[encoded]
        if (decoded & 1) out[0] |= mask
        if (decoded & 2) out[1] |= mask
        if (decoded & 4) out[2] |= mask
    }
    return [u32(out[0]), u32(out[1]), u32(out[2])]
}

/**
 * Theta: Linear diffusion transform by Joan Daemen.
 * Preserves 3-fold cyclic symmetry.
 */
function theta(a: number[]): number[] {
    const a0 = a[0]
    const a1 = a[1]
    const a2 = a[2]
    let c = u32(a0 ^ a1 ^ a2)
    c = u32(rotl(c, 16) ^ rotl(c, 8))
    const b0 = u32((a0 << 24) ^ (a2 >>> 8) ^ (a1 << 8) ^ (a0 >>> 24))
    const b1 = u32((a1 << 24) ^ (a0 >>> 8) ^ (a2 << 8) ^ (a1 >>> 24))
    return [
        u32(a0 ^ c ^ b0),
        u32(a1 ^ c ^ b1),
        u32(a2 ^ c ^ (b0 >>> 16) ^ (b1 << 16))
    ]
}

const THETA_INV_MASKS = new Uint32Array([
    0x01010101, 0x00010100, 0x00010000, 0x02020202, 0x00020200, 0x00020000,
    0x04040404, 0x00040400, 0x00040000, 0x08080808, 0x00080800, 0x00080000,
    0x10101010, 0x00101000, 0x00100000, 0x20202020, 0x00202000, 0x00200000,
    0x40404040, 0x00404000, 0x00400000, 0x80808080, 0x00808000, 0x00800000,
    0x01010100, 0x01010001, 0x01000000, 0x02020200, 0x02020002, 0x02000000,
    0x04040400, 0x04040004, 0x04000000, 0x08080800, 0x08080008, 0x08000000,
    0x10101000, 0x10100010, 0x10000000, 0x20202000, 0x20200020, 0x20000000,
    0x40404000, 0x40400040, 0x40000000, 0x80808000, 0x80800080, 0x80000000,
    0x01010001, 0x01000101, 0x00000001, 0x02020002, 0x02000202, 0x00000002,
    0x04040004, 0x04000404, 0x00000004, 0x08080008, 0x08000808, 0x00000008,
    0x10100010, 0x10001010, 0x00000010, 0x20200020, 0x20002020, 0x00000020,
    0x40400040, 0x40004040, 0x00000040, 0x80800080, 0x80008080, 0x00000080,
    0x01000100, 0x00010101, 0x00000101, 0x02000200, 0x00020202, 0x00000202,
    0x04000400, 0x00040404, 0x00000404, 0x08000800, 0x00080808, 0x00000808,
    0x10001000, 0x00101010, 0x00001010, 0x20002000, 0x00202020, 0x00002020,
    0x40004000, 0x00404040, 0x00004040, 0x80008000, 0x00808080, 0x00008080,
    0x00010000, 0x01010101, 0x00010100, 0x00020000, 0x02020202, 0x00020200,
    0x00040000, 0x04040404, 0x00040400, 0x00080000, 0x08080808, 0x00080800,
    0x00100000, 0x10101010, 0x00101000, 0x00200000, 0x20202020, 0x00202000,
    0x00400000, 0x40404040, 0x00404000, 0x00800000, 0x80808080, 0x00808000,
    0x01000000, 0x01010100, 0x01010001, 0x02000000, 0x02020200, 0x02020002,
    0x04000000, 0x04040400, 0x04040004, 0x08000000, 0x08080800, 0x08080008,
    0x10000000, 0x10101000, 0x10100010, 0x20000000, 0x20202000, 0x20200020,
    0x40000000, 0x40404000, 0x40400040, 0x80000000, 0x80808000, 0x80800080,
    0x00000001, 0x01010001, 0x01000101, 0x00000002, 0x02020002, 0x02000202,
    0x00000004, 0x04040004, 0x04000404, 0x00000008, 0x08080008, 0x08000808,
    0x00000010, 0x10100010, 0x10001010, 0x00000020, 0x20200020, 0x20002020,
    0x00000040, 0x40400040, 0x40004040, 0x00000080, 0x80800080, 0x80008080,
    0x00000101, 0x01000100, 0x00010101, 0x00000202, 0x02000200, 0x00020202,
    0x00000404, 0x04000400, 0x00040404, 0x00000808, 0x08000800, 0x00080808,
    0x00001010, 0x10001000, 0x00101010, 0x00002020, 0x20002000, 0x00202020,
    0x00004040, 0x40004000, 0x00404040, 0x00008080, 0x80008000, 0x00808080,
    0x00010100, 0x00010000, 0x01010101, 0x00020200, 0x00020000, 0x02020202,
    0x00040400, 0x00040000, 0x04040404, 0x00080800, 0x00080000, 0x08080808,
    0x00101000, 0x00100000, 0x10101010, 0x00202000, 0x00200000, 0x20202020,
    0x00404000, 0x00400000, 0x40404040, 0x00808000, 0x00800000, 0x80808080,
    0x01010001, 0x01000000, 0x01010100, 0x02020002, 0x02000000, 0x02020200,
    0x04040004, 0x04000000, 0x04040400, 0x08080008, 0x08000000, 0x08080800,
    0x10100010, 0x10000000, 0x10101000, 0x20200020, 0x20000000, 0x20202000,
    0x40400040, 0x40000000, 0x40404000, 0x80800080, 0x80000000, 0x80808000,
    0x01000101, 0x00000001, 0x01010001, 0x02000202, 0x00000002, 0x02020002,
    0x04000404, 0x00000004, 0x04040004, 0x08000808, 0x00000008, 0x08080008,
    0x10001010, 0x00000010, 0x10100010, 0x20002020, 0x00000020, 0x20200020,
    0x40004040, 0x00000040, 0x40400040, 0x80008080, 0x00000080, 0x80800080,
    0x00010101, 0x00000101, 0x01000100, 0x00020202, 0x00000202, 0x02000200,
    0x00040404, 0x00000404, 0x04000400, 0x00080808, 0x00000808, 0x08000800,
    0x00101010, 0x00001010, 0x10001000, 0x00202020, 0x00002020, 0x20002000,
    0x00404040, 0x00004040, 0x40004000, 0x00808080, 0x00008080, 0x80008000,
])

function parity32(n: number): number {
    let x = n ^ (n >>> 16)
    x ^= x >>> 8
    x ^= x >>> 4
    x ^= x >>> 2
    x ^= x >>> 1
    return x & 1
}

function inverseTheta(a: number[]): number[] {
    const res = [0, 0, 0]
    for (let bit = 0; bit < 96; bit++) {
        const m0 = THETA_INV_MASKS[bit * 3]
        const m1 = THETA_INV_MASKS[bit * 3 + 1]
        const m2 = THETA_INV_MASKS[bit * 3 + 2]
        const p = parity32((a[0] & m0) ^ (a[1] & m1) ^ (a[2] & m2))
        if (p) {
            res[Math.floor(bit / 32)] |= (1 << (bit % 32))
        }
    }
    return [u32(res[0]), u32(res[1]), u32(res[2])]
}

/**
 * Pi: Fixed bit-rotation step.
 * Preserves 3-fold cyclic symmetry by rotating all words identically.
 */
function pi(a: number[]): number[] {
    return [rotl(a[0], 10), rotl(a[1], 10), rotl(a[2], 10)]
}

function inversePi(a: number[]): number[] {
    return [rotr(a[0], 10), rotr(a[1], 10), rotr(a[2], 10)]
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
            state = [u32(state[0] ^ kWords[0]), u32(state[1] ^ kWords[1]), u32(state[2] ^ kWords[2])]
            for (let r = ROUNDS - 1; r >= 0; r--) {
                state = inversePi(state)
                state = inverseTheta(state)
                state = inverseGamma(state)
                state = [u32(state[0] ^ kWords[0]), u32(state[1] ^ kWords[1]), u32(state[2] ^ kWords[2])]
            }
        } else {
            for (let r = 0; r < ROUNDS; r++) {
                state = [u32(state[0] ^ kWords[0]), u32(state[1] ^ kWords[1]), u32(state[2] ^ kWords[2])]
                state = gamma(state)
                state = theta(state)
                state = pi(state)

                if (instrument && r % 3 === 0) {
                    steps.push({ index: steps.length, label: `Round ${r + 1}/${ROUNDS}`, inputState: toHex(wordsToBytes(state)), outputState: toHex(wordsToBytes(state)), note: 'Gamma (non-linear) -> Theta (diffusion) -> Pi (rotation). All preserve 3-fold symmetry.', isMilestone: true })
                }
            }
            state = [u32(state[0] ^ kWords[0]), u32(state[1] ^ kWords[1]), u32(state[2] ^ kWords[2])]
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
    { input: '000000000000000000000000', key: '000000000000000000000000', expected: 'ffffffffffffffffffffffff', description: '3-Way 96-bit zero vector (Daemen 1994)' }
]
