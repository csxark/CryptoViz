/**
 * RIPEMD-128 — RIPE project (1996), ISO/IEC 10118-3.
 * 128-bit output sibling of RIPEMD-160.
 * Dual-parallel-line MD4-family design.
 * 
 * NOTE: Uses distinct tables from RIPEMD-160. Not a truncated configuration.
 */
import type { CipherResult, CipherStep, CipherOptions, TestVector, CipherMetadata } from '../types'
import { CipherError, validateInput } from '../../utils'

const METADATA: CipherMetadata = {
    name: 'RIPEMD-128',
    blockSize: 512,
    securityStatus: 'legacy',
    breakingComplexity: '128-bit output is too short for modern collision resistance.',
    yearDesigned: 1996,
    standardBody: 'RIPE / ISO/IEC 10118-3',
}

function u32(n: number): number { return n >>> 0 }
function rotl(x: number, n: number): number { return u32((x << n) | (x >>> (32 - n))) }

// Boolean functions for 4 rounds
function f1(x: number, y: number, z: number): number { return u32(x ^ y ^ z) }
function f2(x: number, y: number, z: number): number { return u32((x & y) | (~x & z)) }
function f3(x: number, y: number, z: number): number { return u32((x | ~y) ^ z) }
function f4(x: number, y: number, z: number): number { return u32((x & z) | (y & ~z)) }

// Message word selection (Left line)
const RL = [
    0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
    7, 4, 13, 1, 10, 6, 15, 3, 12, 0, 9, 5, 2, 14, 11, 8,
    3, 10, 14, 4, 9, 15, 8, 1, 2, 7, 0, 6, 13, 11, 5, 12,
    1, 9, 11, 10, 0, 8, 12, 4, 13, 3, 7, 15, 14, 5, 6, 2
]
// Message word selection (Right line) - DISTINCT
const RR = [
    5, 14, 7, 0, 9, 2, 11, 4, 13, 6, 15, 8, 1, 10, 3, 12,
    6, 11, 3, 7, 0, 13, 5, 10, 14, 15, 8, 12, 4, 9, 1, 2,
    15, 5, 1, 3, 7, 14, 6, 9, 11, 8, 12, 2, 10, 0, 4, 13,
    8, 6, 4, 1, 3, 11, 15, 0, 5, 12, 2, 13, 9, 7, 10, 14
]

// Rotation amounts (Left line)
const SL = [
    11, 14, 15, 12, 5, 8, 7, 9, 11, 13, 14, 15, 6, 7, 9, 8,
    7, 6, 8, 13, 11, 9, 7, 15, 7, 12, 15, 9, 11, 7, 13, 12,
    11, 13, 6, 7, 14, 9, 13, 15, 14, 8, 13, 6, 5, 12, 7, 5,
    11, 12, 14, 15, 14, 15, 9, 8, 9, 14, 5, 6, 8, 6, 5, 12
]
// Rotation amounts (Right line) - DISTINCT
const SR = [
    8, 9, 9, 11, 13, 15, 15, 5, 7, 7, 8, 11, 14, 14, 12, 6,
    9, 13, 15, 7, 12, 8, 9, 11, 7, 7, 12, 7, 6, 15, 13, 11,
    9, 7, 15, 11, 8, 6, 6, 14, 12, 13, 5, 14, 13, 13, 7, 5,
    15, 5, 8, 11, 14, 14, 6, 14, 6, 9, 12, 9, 12, 5, 15, 8
]

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

function ripemd128Core(input: string, instrument: boolean): CipherResult {
    const start = performance.now()
    const inBytes = parseHex(input)

    // Initial state
    let h0 = 0x67452301, h1 = 0xEFCDAB89, h2 = 0x98BADCFE, h3 = 0x10325476

    const steps: CipherStep[] = []
    if (instrument) {
        steps.push({ index: 0, label: 'Initialization', inputState: '', outputState: 'h0..h3', note: 'Dual parallel lines with distinct tables.', isMilestone: true })
    }

    // Padding
    const bitLen = inBytes.length * 8
    const padLen = (inBytes.length % 64 < 56) ? (56 - inBytes.length % 64) : (120 - inBytes.length % 64)
    const padded = [...inBytes, 0x80, ...new Array(padLen - 1).fill(0)]
    // Append length (64-bit little-endian)
    for (let i = 0; i < 8; i++) padded.push((bitLen >>> (i * 8)) & 0xff)

    const blockCount = padded.length / 64
    for (let b = 0; b < blockCount; b++) {
        const W: number[] = []
        for (let i = 0; i < 16; i++) {
            const off = b * 64 + i * 4
            W.push(u32(padded[off] | (padded[off + 1] << 8) | (padded[off + 2] << 16) | (padded[off + 3] << 24)))
        }

        let al = h0, bl = h1, cl = h2, dl = h3
        let ar = h0, br = h1, cr = h2, dr = h3

        // 64 steps (4 rounds of 16)
        const funcs = [f1, f2, f3, f4]
        const funcsR = [f4, f3, f2, f1] // Reversed order for right line

        for (let i = 0; i < 64; i++) {
            const rnd = Math.floor(i / 16)

            // Left line
            let t = u32(al + funcs[rnd](bl, cl, dl) + W[RL[i]])
            al = dl; dl = cl; cl = bl
            bl = rotl(t, SL[i])

            // Right line
            t = u32(ar + funcsR[rnd](br, cr, dr) + W[RR[i]])
            ar = dr; dr = cr; cr = br
            br = rotl(t, SR[i])
        }

        // Final combination (RIPEMD-128 specific)
        const t = u32(h1 + cl + dr)
        h1 = u32(h2 + dl + ar)
        h2 = u32(h3 + al + br)
        h3 = u32(h0 + bl + cr)
        h0 = t

        if (instrument) {
            steps.push({ index: steps.length, label: `Block ${b + 1}`, inputState: toHex(padded.slice(b * 64, b * 64 + 64)), outputState: 'State updated', note: 'Left and right lines diverge via distinct functions/orders.', isMilestone: true })
        }
    }

    const out = [h0, h1, h2, h3]
    const outBytes: number[] = []
    for (let i = 0; i < 4; i++) {
        outBytes.push(out[i] & 0xff, (out[i] >>> 8) & 0xff, (out[i] >>> 16) & 0xff, (out[i] >>> 24) & 0xff)
    }

    return { output: toHex(outBytes), outputEncoding: 'hex', steps, metadata: METADATA, durationMs: performance.now() - start }
}

export function encrypt(input: string, key: string, options: CipherOptions = {}): CipherResult {
    validateInput(input)
    return ripemd128Core(input, !!options.instrument)
}

export function decrypt(input: string, key: string, options: CipherOptions = {}): CipherResult {
    throw new CipherError('ALGORITHM_UNSUPPORTED', 'RIPEMD-128 is a hash function and cannot be decrypted.')
}

export const TEST_VECTORS: TestVector[] = [
    { input: '', key: '', expected: 'cdf26213a150dc3ecb610f18f6b38b46', description: 'RIPEMD-128("")' },
    { input: '616263', key: '', expected: 'c14a12199c66e4ba84636b0f69144c77', description: 'RIPEMD-128("abc")' }
]
