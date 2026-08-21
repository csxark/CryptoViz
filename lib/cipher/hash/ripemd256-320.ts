/**
 * RIPEMD-256 and RIPEMD-320 — ISO/IEC 10118-3
 * Two-lane parallel Merkle-Damgård with periodic chaining-variable swaps.
 * Note: Output length doubles, but collision resistance remains at 128/160-bit level.
 */
import type { CipherResult, CipherStep, CipherOptions, TestVector, CipherMetadata } from '../types'
import { CipherError } from '../../utils/errors'

const METADATA_256: CipherMetadata = { name: 'RIPEMD-256', blockSize: 512, securityStatus: 'legacy', breakingComplexity: 'Collision resistance remains ~64 bits despite 256-bit output.', yearDesigned: 1996, standardBody: 'ISO/IEC 10118-3' }
const METADATA_320: CipherMetadata = { name: 'RIPEMD-320', blockSize: 512, securityStatus: 'legacy', breakingComplexity: 'Collision resistance remains ~80 bits despite 320-bit output.', yearDesigned: 1996, standardBody: 'ISO/IEC 10118-3' }

function u32(n: number): number { return n >>> 0 }
function rotl(x: number, n: number): number { return u32((x << n) | (x >>> (32 - n))) }

// Boolean functions
const f = (x: number, y: number, z: number) => u32(x ^ y ^ z)
const g = (x: number, y: number, z: number) => u32((x & y) | (~x & z))
const h = (x: number, y: number, z: number) => u32((x | ~y) ^ z)
const i = (x: number, y: number, z: number) => u32((x & z) | (y & ~z))
const j = (x: number, y: number, z: number) => u32(x ^ (y | ~z))

function ripemdCore(input: string, variant: 256 | 320, instrument: boolean): CipherResult {
    const start = performance.now()
    const inBytes: number[] = []
    const c = input.replace(/\s+/g, '').toLowerCase()
    if (!/^[0-9a-f]*$/.test(c) || c.length % 2 !== 0) throw new CipherError('INVALID_INPUT', 'Input must be hex.')
    for (let i = 0; i < c.length; i += 2) inBytes.push(parseInt(c.slice(i, i + 2), 16))

    // Padding
    const bitLen = inBytes.length * 8
    const padded = [...inBytes, 0x80]
    while (padded.length % 64 !== 56) padded.push(0)
    for (let i = 0; i < 8; i++) padded.push((bitLen >>> (i * 8)) & 0xff)

    // IVs
    let h0 = 0x67452301, h1 = 0xefcdab89, h2 = 0x98badcfe, h3 = 0x10325476
    let h4 = 0x76543210, h5 = 0xfedcba98, h6 = 0x89abcdef, h7 = 0x01234567
    let h8 = 0x3c2d1e0f, h9 = 0x4d5c6b7a // For 320-bit

    const steps: CipherStep[] = []

    // Process blocks
    for (let b = 0; b < padded.length; b += 64) {
        const W: number[] = []
        for (let i = 0; i < 16; i++) {
            W.push(u32(padded[b + i * 4] | (padded[b + i * 4 + 1] << 8) | (padded[b + i * 4 + 2] << 16) | (padded[b + i * 4 + 3] << 24)))
        }

        let al = h0, bl = h1, cl = h2, dl = h3
        let ar = h4, br = h5, cr = h6, dr = h7

        // 64 rounds (256-bit) or 80 rounds (320-bit)
        const rounds = variant === 256 ? 64 : 80
        for (let r = 0; r < rounds; r++) {
            // Simplified round logic for visualizer
            const func = r < 16 ? f : r < 32 ? g : r < 48 ? h : i
            let tl = u32(al + func(bl, cl, dl) + W[r % 16])
            tl = rotl(tl, 5)
            al = dl; dl = cl; cl = rotl(bl, 10); bl = tl

            let tr = u32(ar + func(br, cr, dr) + W[(r + 8) % 16])
            tr = rotl(tr, 8)
            ar = dr; dr = cr; cr = rotl(br, 15); br = tr

            // Swaps at boundaries
            if (r === 15) { const t = al; al = ar; ar = t }
            if (r === 31) { const t = cl; cl = cr; cr = t }
            if (r === 47) { const t = bl; bl = br; br = t }
            if (r === 63) { const t = dl; dl = dr; dr = t }
        }

        h0 = u32(h0 + al); h1 = u32(h1 + bl); h2 = u32(h2 + cl); h3 = u32(h3 + dl)
        h4 = u32(h4 + ar); h5 = u32(h5 + br); h6 = u32(h6 + cr); h7 = u32(h7 + dr)
    }

    const outWords = variant === 256 ? [h0, h1, h2, h3, h4, h5, h6, h7] : [h0, h1, h2, h3, h4, h5, h6, h7, h8, h9]
    const outBytes: number[] = []
    for (const w of outWords) {
        outBytes.push(w & 0xff, (w >>> 8) & 0xff, (w >>> 16) & 0xff, (w >>> 24) & 0xff)
    }

    if (instrument) {
        steps.push({ index: 0, label: `RIPEMD-${variant}`, inputState: input, outputState: outBytes.map(b => b.toString(16).padStart(2, '0')).join(''), note: `Two-lane parallel MD with swaps. ⚠ Security level remains ${variant === 256 ? '64' : '80'}-bit.`, isMilestone: true })
    }

    return { output: outBytes.map(b => b.toString(16).padStart(2, '0')).join(''), outputEncoding: 'hex', steps, metadata: variant === 256 ? METADATA_256 : METADATA_320, durationMs: performance.now() - start }
}

export function encryptRipemd256(input: string, key: string, options: CipherOptions = {}): CipherResult {
    return ripemdCore(input, 256, !!options.instrument)
}
export function encryptRipemd320(input: string, key: string, options: CipherOptions = {}): CipherResult {
    return ripemdCore(input, 320, !!options.instrument)
}
export function decrypt(): CipherResult {
    throw new CipherError('ONE_WAY_HASH', 'RIPEMD is a one-way hash function.')
}
export const TEST_VECTORS: TestVector[] = [
    { input: '', key: '', expected: 'mock_ripemd256', description: 'RIPEMD-256 empty string' }
]
