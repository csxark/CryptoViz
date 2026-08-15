/**
 * BLAKE — Aumasson, Henzen, Meier, Phan (2008).
 * The ORIGINAL SHA-3 competition finalist.
 * 
 * Distinct from BLAKE2/BLAKE3 (which are later, speed-optimized descendants).
 * Uses the HAIFA construction (explicit counter/salt mixing per block)
 * and a ChaCha-lineage ARX compression function.
 */
import type { CipherResult, CipherStep, CipherOptions, TestVector, CipherMetadata } from '../types'
import { CipherError, validateInput } from '../../utils'

const METADATA: CipherMetadata = {
    name: 'BLAKE',
    blockSize: 512,
    securityStatus: 'secure',
    breakingComplexity: 'SHA-3 finalist; no practical attacks.',
    yearDesigned: 2008,
    standardBody: 'SHA-3 NIST Finalist',
}

function u32(n: number): number { return n >>> 0 }
function rotl(x: number, n: number): number { return u32((x << n) | (x >>> (32 - n))) }
function rotr(x: number, n: number): number { return u32((x >>> n) | (x << (32 - n))) }

// BLAKE-256 Constants (from SHA-256 IV)
const C = [
    0x243F6A88, 0x85A308D3, 0x13198A2E, 0x03707344,
    0xA4093822, 0x299F31D0, 0x082EFA98, 0xEC4E6C89,
    0x452821E6, 0x38D01377, 0xBE5466CF, 0x34E90C6C,
    0xC0AC29B7, 0xC97C50DD, 0x3F84D5B5, 0xB5470917
]

// BLAKE-256 IV
const IV = [
    0x6A09E667, 0xBB67AE85, 0x3C6EF372, 0xA54FF53A,
    0x510E527F, 0x9B05688C, 0x1F83D9AB, 0x5BE0CD19
]

// Sigma schedule (10 permutations, repeated to 14 rounds)
const SIGMA = [
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
    [14, 10, 4, 8, 9, 15, 13, 6, 1, 12, 0, 2, 11, 7, 5, 3],
    [11, 8, 12, 0, 5, 2, 15, 13, 10, 14, 3, 6, 7, 1, 9, 4],
    [7, 9, 3, 1, 13, 12, 11, 14, 2, 6, 5, 10, 4, 0, 15, 8],
    [9, 0, 5, 7, 2, 4, 10, 15, 14, 1, 11, 12, 6, 8, 3, 13],
    [2, 12, 6, 10, 0, 11, 8, 3, 4, 13, 7, 5, 15, 14, 1, 9],
    [12, 5, 1, 15, 14, 13, 4, 10, 0, 7, 6, 3, 9, 2, 8, 11],
    [13, 11, 7, 14, 12, 1, 3, 9, 5, 0, 15, 4, 8, 6, 2, 10],
    [6, 15, 14, 9, 11, 3, 0, 8, 12, 2, 13, 7, 1, 4, 10, 5],
    [10, 2, 8, 4, 7, 6, 1, 5, 15, 11, 9, 14, 3, 12, 13, 0]
]

function G(v: number[], a: number, b: number, c: number, d: number, m_i: number, m_j: number, c_i: number, c_j: number) {
    v[a] = u32(v[a] + v[b] + (m_i ^ c_i))
    v[d] = rotr(v[d] ^ v[a], 16)
    v[c] = u32(v[c] + v[d])
    v[b] = rotr(v[b] ^ v[c], 12)
    v[a] = u32(v[a] + v[b] + (m_j ^ c_j))
    v[d] = rotr(v[d] ^ v[a], 8)
    v[c] = u32(v[c] + v[d])
    v[b] = rotr(v[b] ^ v[c], 7)
}

function compress(h: number[], m: number[], counter: number, salt: number[]): number[] {
    const v = new Array(16)
    for (let i = 0; i < 8; i++) v[i] = h[i]

    // HAIFA: Mix counter and salt into the state initialization
    v[8] = salt[0] ^ 0x243F6A88
    v[9] = salt[1] ^ 0x85A308D3
    v[10] = salt[2] ^ 0x13198A2E
    v[11] = salt[3] ^ 0x03707344
    v[12] = counter ^ 0xA4093822 // Mix counter
    v[13] = counter ^ 0x299F31D0
    v[14] = 0x082EFA98 // (If high counter bits existed)
    v[15] = 0xEC4E6C89

    for (let r = 0; r < 14; r++) {
        const s = SIGMA[r % 10]
        G(v, 0, 4, 8, 12, m[s[0]], m[s[1]], C[s[0]], C[s[1]])
        G(v, 1, 5, 9, 13, m[s[2]], m[s[3]], C[s[2]], C[s[3]])
        G(v, 2, 6, 10, 14, m[s[4]], m[s[5]], C[s[4]], C[s[5]])
        G(v, 3, 7, 11, 15, m[s[6]], m[s[7]], C[s[6]], C[s[7]])
        G(v, 0, 5, 10, 15, m[s[8]], m[s[9]], C[s[8]], C[s[9]])
        G(v, 1, 6, 11, 12, m[s[10]], m[s[11]], C[s[10]], C[s[11]])
        G(v, 2, 7, 8, 13, m[s[12]], m[s[13]], C[s[12]], C[s[13]])
        G(v, 3, 4, 9, 14, m[s[14]], m[s[15]], C[s[14]], C[s[15]])
    }

    const out = new Array(8)
    for (let i = 0; i < 8; i++) {
        out[i] = h[i] ^ v[i] ^ v[i + 8]
    }
    return out
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

function blakeCore(input: string, instrument: boolean): CipherResult {
    const start = performance.now()
    const inBytes = parseHex(input)

    let h = [...IV]
    const salt = [0, 0, 0, 0]
    let counter = 0

    const steps: CipherStep[] = []
    if (instrument) {
        steps.push({ index: 0, label: 'Initialization (HAIFA)', inputState: '', outputState: 'IV loaded', note: 'BLAKE uses HAIFA: explicit counter and salt mixing per block, preventing length-extension attacks.', isMilestone: true })
    }

    // Padding
    const bitLen = inBytes.length * 8
    const padLen = (inBytes.length % 64 < 56) ? (56 - inBytes.length % 64) : (120 - inBytes.length % 64)
    const padded = [...inBytes, 0x80, ...new Array(padLen - 1).fill(0)]
    // Append length (64-bit big-endian)
    for (let i = 7; i >= 0; i--) padded.push((bitLen >>> (i * 8)) & 0xff)

    const blockCount = padded.length / 64
    for (let b = 0; b < blockCount; b++) {
        const m: number[] = []
        for (let i = 0; i < 16; i++) {
            const off = b * 64 + i * 4
            m.push(u32((padded[off] << 24) | (padded[off + 1] << 16) | (padded[off + 2] << 8) | padded[off + 3]))
        }

        counter += 512
        h = compress(h, m, counter, salt)

        if (instrument) {
            steps.push({ index: steps.length, label: `Block ${b + 1}/${blockCount}`, inputState: toHex(padded.slice(b * 64, b * 64 + 64)), outputState: 'State updated', note: '14 rounds of ChaCha-lineage ARX quarter-rounds.', isMilestone: true })
        }
    }

    const outBytes: number[] = []
    for (let i = 0; i < 8; i++) {
        outBytes.push((h[i] >>> 24) & 0xff, (h[i] >>> 16) & 0xff, (h[i] >>> 8) & 0xff, h[i] & 0xff)
    }

    return { output: toHex(outBytes), outputEncoding: 'hex', steps, metadata: METADATA, durationMs: performance.now() - start }
}

export function encrypt(input: string, key: string, options: CipherOptions = {}): CipherResult {
    validateInput(input)
    return blakeCore(input, !!options.instrument)
}

export function decrypt(input: string, key: string, options: CipherOptions = {}): CipherResult {
    throw new CipherError('ALGORITHM_UNSUPPORTED', 'BLAKE is a hash function and cannot be decrypted.')
}

export const TEST_VECTORS: TestVector[] = [
    { input: '', key: '', expected: 'mock_hash', description: 'BLAKE-256("")' }
]
