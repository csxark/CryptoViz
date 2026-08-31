/**
 * Twofish — Schneier, Kelsey, Whiting, Wagner, Hall, Ferguson, 1998.
 * AES finalist. 128-bit block, 128/192/256-bit key, 16-round Feistel.
 * Key-dependent S-boxes (derived via RS matrix), MDS matrix diffusion,
 * Pseudo-Hadamard Transform (PHT), 40 32-bit subkeys.
 *
 * Test vector (128-bit zero key):
 *   key = 00000000000000000000000000000000
 *   pt  = 00000000000000000000000000000000
 *   ct  = 9f589f5cf6122c32b6bfec2f2ae8c35a
 */

import type { CipherResult, CipherStep, CipherOptions, TestVector, CipherMetadata } from '../types'
import { CipherError, validateInput, validateKey } from '../../utils'

const METADATA: CipherMetadata = {
    name: 'Twofish',
    keySize: 256,
    blockSize: 128,
    rounds: 16,
    securityStatus: 'secure',
    breakingComplexity: 'No practical attacks; used in GnuPG and VeraCrypt. Best known: 2^251 on reduced rounds.',
    yearDesigned: 1998,
    standardBody: 'Schneier et al.; NESSIE evaluated; no NIST standard (lost AES competition to Rijndael)',
}

// ── GF(2^8) arithmetic ────────────────────────────────────────────────────────
function gfMul(a: number, b: number, poly: number): number {
    let p = 0
    let aa = a & 0xff
    let bb = b & 0xff
    for (let i = 0; i < 8; i++) {
        if (bb & 1) p ^= aa
        const carry = aa & 0x80
        aa = (aa << 1) & 0xff
        if (carry) aa ^= (poly & 0xff)
        bb >>= 1
    }
    return p & 0xff
}

const MDS_POLY = 0x69  // x^8+x^6+x^3+x^2+1 reduced mod x^8 (lower 8 bits of 0x169)
const RS_POLY = 0x4d  // x^8+x^6+x^3+x^2+1 reduced mod x^8 (lower 8 bits of 0x14d)

// ── MDS matrix (4×4, Table 3 of Twofish spec) ────────────────────────────────
// Coefficients: 01, 5B, EF in GF(2^8) with polynomial 0x169
const MDS = [
    [0x01, 0xEF, 0x5B, 0x5B],
    [0x5B, 0xEF, 0xEF, 0x01],
    [0xEF, 0x5B, 0x01, 0xEF],
    [0xEF, 0x01, 0xEF, 0x5B],
]

// ── RS matrix (4×8, Table 4 of Twofish spec) ─────────────────────────────────
// Used to derive S-box material from raw key bytes
const RS = [
    [0x01, 0xA4, 0x55, 0x87, 0x5A, 0x58, 0xDB, 0x9E],
    [0xA4, 0x56, 0x82, 0xF3, 0x1E, 0xC6, 0x68, 0xE5],
    [0x02, 0xA1, 0xFC, 0xC1, 0x47, 0xAE, 0x3D, 0x19],
    [0xA4, 0x55, 0x87, 0x5A, 0x58, 0xDB, 0x9E, 0x03],
]

// ── q0 and q1: fixed 8×8 permutations (Twofish spec, Section 4.3.1) ──────────
const Q0 = new Uint8Array([
    0xA9, 0x67, 0xB3, 0xE8, 0x04, 0xFD, 0xA3, 0x76, 0x9A, 0x92, 0x80, 0x78, 0xE4, 0xDD, 0xD1, 0x38,
    0x0D, 0xC6, 0x35, 0x98, 0x18, 0xF7, 0xEC, 0x6C, 0x43, 0x75, 0x37, 0x26, 0xFA, 0x13, 0x94, 0x48,
    0xF2, 0xD0, 0x8B, 0x30, 0x84, 0x54, 0xDF, 0x23, 0x19, 0x5B, 0x3D, 0x59, 0xF3, 0xAE, 0xA2, 0x82,
    0x63, 0x01, 0x83, 0x2E, 0xD9, 0x51, 0x9B, 0x7C, 0xA6, 0xEB, 0xA5, 0xBE, 0x16, 0x0C, 0xE3, 0x61,
    0xC0, 0x8C, 0x3A, 0xF5, 0x73, 0x2C, 0x25, 0x0B, 0xBB, 0x4E, 0x89, 0x6B, 0x53, 0x6A, 0xB4, 0xF1,
    0xE1, 0xE6, 0xBD, 0x45, 0xE2, 0xF4, 0xB6, 0x66, 0xCC, 0x95, 0x03, 0x56, 0xD4, 0x1C, 0x1E, 0xD7,
    0xFB, 0xC3, 0x8E, 0xB5, 0xE9, 0xCF, 0xBF, 0xBA, 0xEA, 0x77, 0x39, 0xAF, 0x33, 0xC9, 0x62, 0x71,
    0x81, 0x79, 0x09, 0xAD, 0x24, 0xCD, 0xF9, 0xD8, 0xE5, 0xC5, 0xB9, 0x4D, 0x44, 0x08, 0x86, 0xE7,
    0xA1, 0x1D, 0xAA, 0xED, 0x06, 0x70, 0xB2, 0xD2, 0x41, 0x7B, 0xA0, 0x11, 0x31, 0xC2, 0x27, 0x90,
    0x20, 0xF6, 0x60, 0xFF, 0x96, 0x5C, 0xB1, 0xAB, 0x9E, 0x9C, 0x52, 0x1B, 0x5F, 0x93, 0x0A, 0xEF,
    0x91, 0x85, 0x49, 0xEE, 0x2D, 0x4F, 0x8F, 0x3B, 0x47, 0x87, 0x6D, 0x46, 0xD6, 0x3E, 0x69, 0x64,
    0x2A, 0xCE, 0xCB, 0x2F, 0xFC, 0x97, 0x05, 0x7A, 0xAC, 0x7F, 0xD5, 0x1A, 0x4B, 0x0E, 0xA7, 0x5A,
    0x28, 0x14, 0x3F, 0x29, 0x88, 0x3C, 0x4C, 0x02, 0xB8, 0xDA, 0xB0, 0x17, 0x55, 0x1F, 0x8A, 0x7D,
    0x57, 0xC7, 0x8D, 0x74, 0xB7, 0xC4, 0x9F, 0x72, 0x7E, 0x15, 0x22, 0x12, 0x58, 0x07, 0x99, 0x34,
    0x6E, 0x50, 0xDE, 0x68, 0x65, 0xBC, 0xDB, 0xF8, 0xC8, 0xA8, 0x2B, 0x40, 0xDC, 0xFE, 0x32, 0xA4,
    0xCA, 0x10, 0x21, 0xF0, 0xD3, 0x5D, 0x0F, 0x00, 0x6F, 0x9D, 0x36, 0x42, 0x4A, 0x5E, 0xC1, 0xE0,
])

const Q1 = new Uint8Array([
    0x75, 0xF3, 0xC6, 0xF4, 0xDB, 0x7B, 0xFB, 0xC8, 0x4A, 0xD3, 0xE6, 0x6B, 0x45, 0x7D, 0xE8, 0x4B,
    0xD6, 0x32, 0xD8, 0xFD, 0x37, 0x71, 0xF1, 0xE1, 0x30, 0x0F, 0xF8, 0x1B, 0x87, 0xFA, 0x06, 0x3F,
    0x5E, 0xBA, 0xAE, 0x5B, 0x8A, 0x00, 0xBC, 0x9D, 0x6D, 0xC1, 0xB1, 0x0E, 0x80, 0x5D, 0xD2, 0xD5,
    0xA0, 0x84, 0x07, 0x14, 0xB5, 0x90, 0x2C, 0xA3, 0xB2, 0x73, 0x4C, 0x54, 0x92, 0x74, 0x36, 0x51,
    0x38, 0xB0, 0xBD, 0x5A, 0xFC, 0x60, 0x62, 0x96, 0x6C, 0x42, 0xF7, 0x10, 0x7C, 0x28, 0x27, 0x8C,
    0x13, 0x95, 0x9C, 0xC7, 0x24, 0x46, 0x3B, 0x70, 0xCA, 0xE3, 0x85, 0xCB, 0x11, 0xD0, 0x93, 0xB8,
    0xA6, 0x83, 0x20, 0xFF, 0x9F, 0x77, 0xC3, 0xCC, 0x03, 0x6F, 0x08, 0xBF, 0x40, 0xE7, 0x2B, 0xE2,
    0x79, 0x0C, 0xAA, 0x82, 0x41, 0x3A, 0xEA, 0xB9, 0xE4, 0x9A, 0xA4, 0x97, 0x7E, 0xDA, 0x7A, 0x17,
    0x66, 0x94, 0xA1, 0x1D, 0x3D, 0xF0, 0xDE, 0xB3, 0x0B, 0x72, 0xA7, 0x1C, 0xEF, 0xD1, 0x53, 0x3E,
    0x8F, 0x33, 0x26, 0x5F, 0xEC, 0x76, 0x2A, 0x49, 0x81, 0x88, 0xEE, 0x21, 0xC4, 0x1A, 0xEB, 0xD9,
    0xC5, 0x39, 0x99, 0xCD, 0xAD, 0x31, 0x8B, 0x01, 0x18, 0x23, 0xDD, 0x1F, 0x4E, 0x2D, 0xF9, 0x48,
    0x4F, 0xF2, 0x65, 0x8E, 0x78, 0x5C, 0x58, 0x19, 0x8D, 0xE5, 0x98, 0x57, 0x67, 0x7F, 0x05, 0x64,
    0xAF, 0x63, 0xB6, 0xFE, 0xF5, 0xB7, 0x3C, 0xA5, 0xCE, 0xE9, 0x68, 0x44, 0xE0, 0x4D, 0x43, 0x69,
    0x29, 0x2E, 0xAC, 0x15, 0x59, 0xA8, 0x0A, 0x9E, 0x6E, 0x47, 0xDF, 0x34, 0x35, 0x6A, 0xCF, 0xDC,
    0x22, 0xC9, 0xC0, 0x9B, 0x89, 0xD4, 0xED, 0xAB, 0x12, 0xA2, 0x0D, 0x52, 0xBB, 0x02, 0x2F, 0xA9,
    0xD7, 0x61, 0x1E, 0xB4, 0x50, 0x04, 0xF6, 0xC2, 0x16, 0x25, 0x86, 0x56, 0x55, 0x09, 0xBE, 0x91,
])

// ── Helpers ───────────────────────────────────────────────────────────────────
function u32(n: number): number { return n >>> 0 }
function rotl32(x: number, n: number): number { return u32((x << n) | (x >>> (32 - n))) }
function rotr32(x: number, n: number): number { return u32((x >>> n) | (x << (32 - n))) }

function readLE32(b: Uint8Array, off: number): number {
    return u32(b[off] | (b[off + 1] << 8) | (b[off + 2] << 16) | (b[off + 3] << 24))
}
function writeLE32(n: number, b: Uint8Array, off: number): void {
    b[off] = n & 0xff; b[off + 1] = (n >> 8) & 0xff; b[off + 2] = (n >> 16) & 0xff; b[off + 3] = (n >> 24) & 0xff
}

function parseHex(s: string, lbl: string): Uint8Array {
    const c = s.replace(/\s+/g, '').toLowerCase()
    if (!/^[0-9a-f]+$/.test(c) || c.length % 2 !== 0) throw new CipherError('INVALID_INPUT', `${lbl} must be hex.`)
    const o = new Uint8Array(c.length / 2)
    for (let i = 0; i < o.length; i++) o[i] = parseInt(c.slice(i * 2, i * 2 + 2), 16)
    return o
}
function toHex(b: Uint8Array): string {
    return Array.from(b).map(x => x.toString(16).padStart(2, '0')).join('')
}

// ── RS multiply: derive sboxKeys from raw key bytes ───────────────────────────
// Each 8-byte group of key produces one 32-bit S-box word via RS matrix
function rsMul(keyBytes: Uint8Array): Uint32Array {
    const k = keyBytes.length / 8  // number of 64-bit key words: 2, 3, or 4
    const sboxKeys = new Uint32Array(k)
    for (let i = 0; i < k; i++) {
        const base = i * 8
        let word = 0
        for (let row = 0; row < 4; row++) {
            let acc = 0
            for (let col = 0; col < 8; col++) {
                acc ^= gfMul(RS[row][col], keyBytes[base + col], RS_POLY)
            }
            word |= (acc & 0xff) << (row * 8)
        }
        sboxKeys[k - 1 - i] = u32(word)
    }
    return sboxKeys
}

// ── MDS column multiply: one byte through one MDS column ──────────────────────
function mdsColumnMul(x: number, col: number): number {
    let result = 0
    for (let row = 0; row < 4; row++) {
        result |= gfMul(MDS[row][col], x, MDS_POLY) << (row * 8)
    }
    return u32(result)
}

// ── h function: apply q permutations + key material XOR + MDS ─────────────────
function h(x: number, L: Uint32Array, k: number): number {
    let b0 = x & 0xff, b1 = (x >> 8) & 0xff, b2 = (x >> 16) & 0xff, b3 = (x >> 24) & 0xff

    if (k >= 4) {
        b0 = Q1[b0] ^ (L[3] & 0xff)
        b1 = Q0[b1] ^ ((L[3] >> 8) & 0xff)
        b2 = Q0[b2] ^ ((L[3] >> 16) & 0xff)
        b3 = Q1[b3] ^ ((L[3] >> 24) & 0xff)
    }
    if (k >= 3) {
        b0 = Q1[b0] ^ (L[2] & 0xff)
        b1 = Q1[b1] ^ ((L[2] >> 8) & 0xff)
        b2 = Q0[b2] ^ ((L[2] >> 16) & 0xff)
        b3 = Q0[b3] ^ ((L[2] >> 24) & 0xff)
    }
    // k>=2 always (minimum key is 128-bit = 2 × 64-bit words)
    b0 = Q1[Q0[Q0[b0] ^ (L[0] & 0xff)] ^ (L[1] & 0xff)]
    b1 = Q0[Q0[Q1[b1] ^ ((L[0] >> 8) & 0xff)] ^ ((L[1] >> 8) & 0xff)]
    b2 = Q1[Q1[Q0[b2] ^ ((L[0] >> 16) & 0xff)] ^ ((L[1] >> 16) & 0xff)]
    b3 = Q0[Q1[Q1[b3] ^ ((L[0] >> 24) & 0xff)] ^ ((L[1] >> 24) & 0xff)]

    return u32(
        mdsColumnMul(b0, 0) ^
        mdsColumnMul(b1, 1) ^
        mdsColumnMul(b2, 2) ^
        mdsColumnMul(b3, 3)
    )
}

// ── Key schedule: produce 40 subkeys K[0..39] ─────────────────────────────────
interface TwofishCtx {
    K: Uint32Array       // 40 subkeys
    sboxKeys: Uint32Array // k words (k=2,3,4)
    k: number
}

function keySchedule(keyBytes: Uint8Array): TwofishCtx {
    const N = keyBytes.length  // 16, 24, or 32
    const k = N / 8            // 2, 3, or 4

    // Split key into even (Me) and odd (Mo) 32-bit words
    const Me = new Uint32Array(k)
    const Mo = new Uint32Array(k)
    for (let i = 0; i < k; i++) {
        Me[i] = readLE32(keyBytes, i * 8)
        Mo[i] = readLE32(keyBytes, i * 8 + 4)
    }

    const sboxKeys = rsMul(keyBytes)

    const K = new Uint32Array(40)
    const rho = 0x01010101  // 2^24 + 2^16 + 2^8 + 1
    for (let i = 0; i < 20; i++) {
        const Ai = h(u32(2 * i * rho), Me, k)
        const Bi = rotl32(h(u32((2 * i + 1) * rho), Mo, k), 8)
        K[2 * i] = u32(Ai + Bi)
        K[2 * i + 1] = rotl32(u32(Ai + 2 * Bi), 9)
    }

    return { K, sboxKeys, k }
}

// ── g function: uses pre-computed S-box material (sboxKeys) ──────────────────
function g(x: number, ctx: TwofishCtx): number {
    return h(x, ctx.sboxKeys, ctx.k)
}

// ── F function: two g() calls + PHT + shift ───────────────────────────────────
function F(R0: number, R1: number, r: number, ctx: TwofishCtx): [number, number] {
    const T0 = g(R0, ctx)
    const T1 = g(rotl32(R1, 8), ctx)
    const F0 = u32(T0 + T1 + ctx.K[2 * r + 8])
    const F1 = u32(T0 + 2 * T1 + ctx.K[2 * r + 9])
    return [F0, F1]
}

// ── Block encrypt ─────────────────────────────────────────────────────────────
function twofishEncrypt(block: Uint8Array, ctx: TwofishCtx): Uint8Array {
    let R0 = u32(readLE32(block, 0) ^ ctx.K[0])
    let R1 = u32(readLE32(block, 4) ^ ctx.K[1])
    let R2 = u32(readLE32(block, 8) ^ ctx.K[2])
    let R3 = u32(readLE32(block, 12) ^ ctx.K[3])

    for (let r = 0; r < 16; r++) {
        const [F0, F1] = F(R0, R1, r, ctx)
        R2 = u32(rotr32(u32(R2 ^ F0), 1))
        R3 = u32(rotl32(R3, 1) ^ F1)
            ;[R0, R1, R2, R3] = [R2, R3, R0, R1]
    }
    // Undo last swap and apply output whitening
    const out = new Uint8Array(16)
    writeLE32(u32(R2 ^ ctx.K[4]), out, 0)
    writeLE32(u32(R3 ^ ctx.K[5]), out, 4)
    writeLE32(u32(R0 ^ ctx.K[6]), out, 8)
    writeLE32(u32(R1 ^ ctx.K[7]), out, 12)
    return out
}

// ── Block decrypt ─────────────────────────────────────────────────────────────
function twofishDecrypt(block: Uint8Array, ctx: TwofishCtx): Uint8Array {
    let R2 = u32(readLE32(block, 0) ^ ctx.K[4])
    let R3 = u32(readLE32(block, 4) ^ ctx.K[5])
    let R0 = u32(readLE32(block, 8) ^ ctx.K[6])
    let R1 = u32(readLE32(block, 12) ^ ctx.K[7])

    for (let r = 15; r >= 0; r--) {
        const [F0, F1] = F(R2, R3, r, ctx)
        const R2_prev = u32(rotl32(R0, 1) ^ F0)
        const R3_prev = u32(rotr32(u32(R1 ^ F1), 1))
        R0 = R2
        R1 = R3
        R2 = R2_prev
        R3 = R3_prev
    }

    const out = new Uint8Array(16)
    writeLE32(u32(R0 ^ ctx.K[0]), out, 0)
    writeLE32(u32(R1 ^ ctx.K[1]), out, 4)
    writeLE32(u32(R2 ^ ctx.K[2]), out, 8)
    writeLE32(u32(R3 ^ ctx.K[3]), out, 12)
    return out
}

// ── Core driver ───────────────────────────────────────────────────────────────
function twofishCore(input: string, key: string, doDecrypt: boolean, instrument: boolean): CipherResult {
    const start = performance.now()
    validateKey(key)
    const keyBytes = parseHex(key, 'Twofish key')
    if (![16, 24, 32].includes(keyBytes.length))
        throw new CipherError('INVALID_KEY_LENGTH', `Twofish key must be 128, 192, or 256 bits. Got ${keyBytes.length * 8} bits.`)
    const inBytes = parseHex(input, 'Twofish input')
    if (inBytes.length === 0 || inBytes.length % 16 !== 0)
        throw new CipherError('INVALID_INPUT', `Twofish input must be a non-empty multiple of 16 bytes.`)

    const ctx = keySchedule(keyBytes)
    const numBlocks = inBytes.length / 16
    const outBuf = new Uint8Array(inBytes.length)
    const steps: CipherStep[] = []

    if (instrument) {
        steps.push({
            index: 0, label: 'Key schedule',
            inputState: toHex(keyBytes),
            outputState: `${ctx.k} S-box words + 40 subkeys K[0..39]`,
            note: `${keyBytes.length * 8}-bit key → RS matrix → ${ctx.k} S-box key words → h() + PHT → 40 subkeys. Input/output whitening: K[0..3], K[4..7]. Round keys: K[8..39].`,
            isMilestone: true,
        })
    }

    for (let b = 0; b < numBlocks; b++) {
        const blockIn = inBytes.slice(b * 16, b * 16 + 16)
        const blockOut = doDecrypt ? twofishDecrypt(blockIn, ctx) : twofishEncrypt(blockIn, ctx)
        outBuf.set(blockOut, b * 16)
        if (instrument) {
            steps.push({
                index: steps.length,
                label: `Block ${b + 1}/${numBlocks} — 16 Feistel rounds`,
                inputState: toHex(blockIn),
                outputState: toHex(blockOut),
                note: `Each round: T0=g(R0), T1=g(R1<<8). PHT: F0=T0+T1+K[2r+8], F1=T0+2T1+K[2r+9]. R2=(R2⊕F0)>>1, R3=(R3<<1)⊕F1. Swap pairs.`,
                isMilestone: true,
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
 * @see https://csrc.nist.gov/pubs/fips/197/final — FIPS 197.
 */
export function encrypt(input: string, key: string, options: CipherOptions = {}): CipherResult {
    validateInput(input)
    return twofishCore(input, key, false, !!options.instrument)
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
 * @see https://csrc.nist.gov/pubs/fips/197/final — FIPS 197.
 */
export function decrypt(input: string, key: string, options: CipherOptions = {}): CipherResult {
    validateInput(input)
    return twofishCore(input, key, true, !!options.instrument)
}

/**
 * TEST VECTORS cipher-engine utility export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/197/final — FIPS 197.
 */
export const TEST_VECTORS: TestVector[] = [
    {
        input: '00000000000000000000000000000000',
        key: '00000000000000000000000000000000',
        expected: '9f589f5cf6122c32b6bfec2f2ae8c35a',
        description: 'Twofish spec: 128-bit zero key, zero plaintext',
    },
]
