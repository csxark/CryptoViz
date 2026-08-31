/**
 * HC-128 — Hongjun Wu, 2004. eSTREAM Portfolio Phase 3 (software).
 * 128-bit key, 128-bit IV. Two 512-word (32-bit each) key/IV-derived tables
 * P and Q, updated during keystream generation.
 *
 * Output format:
 *   encrypt(pt_hex, key_hex, {nonce?: iv_hex_32chars}) → iv_hex(32) + ct_hex
 *   decrypt(iv+ct_hex, key_hex) → pt_hex
 *
 * eSTREAM test vector (Key=IV=00...0):
 *   First keystream bytes: 82001573a003fd3b7fd72ffb0eaf63aac20cf9a9491267a3
 *   (verify against ecrypt.eu.org eSTREAM test vectors)
 */

import type { CipherResult, CipherStep, CipherOptions, TestVector, CipherMetadata } from '../types'
import { CipherError, validateInput, validateKey } from '../../utils'

const METADATA: CipherMetadata = {
    name: 'HC-128',
    keySize: 128,
    blockSize: 32,
    rounds: 1024,
    securityStatus: 'secure',
    breakingComplexity: 'No practical attacks; selected in eSTREAM final portfolio',
    yearDesigned: 2004,
    standardBody: 'eSTREAM Phase 3 Portfolio (software profile)',
}

function u32(n: number): number { return n >>> 0 }
function rotr32(x: number, n: number): number { return u32((x >>> n) | (x << (32 - n))) }
function rotl32(x: number, n: number): number { return u32((x << n) | (x >>> (32 - n))) }

// SHA-256 message schedule functions (used for key/IV expansion)
function f1(x: number): number { return u32(rotr32(x, 7) ^ rotr32(x, 18) ^ (x >>> 3)) }
function f2(x: number): number { return u32(rotr32(x, 17) ^ rotr32(x, 19) ^ (x >>> 10)) }

// g1: mixing for P-table update; g2: mixing for Q-table update (mirror rotations)
function g1(x: number, y: number): number {
    return u32((rotr32(x, 10) ^ rotr32(y, 23)) + rotr32(u32(x ^ y), 8))
}
function g2(x: number, y: number): number {
    return u32((rotl32(x, 10) ^ rotl32(y, 23)) + rotl32(u32(x ^ y), 8))
}

interface HC128State {
    P: Uint32Array   // 512 words
    Q: Uint32Array   // 512 words
    counter: number  // current keystream word counter (0-based)
}

function hc128Init(keyBytes: Uint8Array, ivBytes: Uint8Array): HC128State {
    // W[0..7] = key (as 32-bit LE words)
    // W[8..15] = IV (as 32-bit LE words)
    // W[i] for i in [16..1279] = f2(W[i-2]) + W[i-7] + f1(W[i-15]) + W[i-16] + i
    const W = new Uint32Array(1280)
    for (let i = 0; i < 4; i++) {
        W[i] = u32(keyBytes[4 * i] | (keyBytes[4 * i + 1] << 8) | (keyBytes[4 * i + 2] << 16) | (keyBytes[4 * i + 3] << 24))
        W[i + 4] = W[i]  // key is 128-bit → repeated for W[0..7]
    }
    for (let i = 0; i < 4; i++) {
        W[i + 8] = u32(ivBytes[4 * i] | (ivBytes[4 * i + 1] << 8) | (ivBytes[4 * i + 2] << 16) | (ivBytes[4 * i + 3] << 24))
        W[i + 12] = W[i + 8] // IV is 128-bit → repeated for W[8..15]
    }
    for (let i = 16; i < 1280; i++) {
        W[i] = u32(f2(W[i - 2]) + W[i - 7] + f1(W[i - 15]) + W[i - 16] + i)
    }

    const P = new Uint32Array(512)
    const Q = new Uint32Array(512)
    for (let i = 0; i < 512; i++) { P[i] = W[i + 256]; Q[i] = W[i + 768] }

    const state: HC128State = { P, Q, counter: 0 }

    // 1024 warm-up iterations to update P and Q
    for (let i = 0; i < 1024; i++) hc128GenWord(state)
    state.counter = 0  // reset after warm-up
    return state
}

// h1: uses Q table; h2: uses P table
function h1(x: number, Q: Uint32Array): number {
    return u32(Q[x & 0xFF] + Q[256 + ((x >> 16) & 0xFF)])
}
function h2(x: number, P: Uint32Array): number {
    return u32(P[x & 0xFF] + P[256 + ((x >> 16) & 0xFF)])
}

function hc128GenWord(state: HC128State): number {
    const { P, Q, counter } = state
    const step = counter % 1024
    const j = counter % 512

    let ks: number
    if (step < 512) {
        P[j] = u32(P[j] + P[(j - 3 + 512) % 512] + g1(P[(j - 10 + 512) % 512], P[(j - 511 + 512) % 512]))
        ks = u32(h1(P[(j - 12 + 512) % 512], Q) ^ P[j])
    } else {
        Q[j] = u32(Q[j] + Q[(j - 3 + 512) % 512] + g2(Q[(j - 10 + 512) % 512], Q[(j - 511 + 512) % 512]))
        ks = u32(h2(Q[(j - 12 + 512) % 512], P) ^ Q[j])
    }
    state.counter++
    return ks
}

function hc128Keystream(state: HC128State, n: number): Uint8Array {
    const ks = new Uint8Array(n)
    for (let i = 0; i < n; i += 4) {
        const word = hc128GenWord(state)
        for (let j = 0; j < 4 && i + j < n; j++) ks[i + j] = (word >>> (8 * j)) & 0xFF
    }
    return ks
}

function randomBytes(n: number): Uint8Array {
    const buf = new Uint8Array(n)
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) crypto.getRandomValues(buf)
    else for (let i = 0; i < n; i++) buf[i] = Math.floor(Math.random() * 256)
    return buf
}
function parseHex(s: string, lbl: string): Uint8Array {
    const c = s.replace(/\s+/g, '').toLowerCase()
    if (!/^[0-9a-f]*$/.test(c) || c.length % 2 !== 0)
        throw new CipherError('INVALID_INPUT', `${lbl} must be even-length hex.`)
    const o = new Uint8Array(c.length / 2)
    for (let i = 0; i < o.length; i++) o[i] = parseInt(c.slice(i * 2, i * 2 + 2), 16)
    return o
}
function toHex(b: Uint8Array): string {
    return Array.from(b).map(x => x.toString(16).padStart(2, '0')).join('')
}

function hc128Core(input: string, key: string, dec: boolean, instrument: boolean, ivHex?: string): CipherResult {
    const t0 = performance.now()
    validateKey(key)
    const kb = parseHex(key, 'HC-128 key')
    if (kb.length !== 16) throw new CipherError('INVALID_KEY_LENGTH', `HC-128 requires 128-bit (16-byte) key.`)

    let ivBytes: Uint8Array, msgHex: string
    if (dec) {
        const raw = parseHex(input, 'HC-128 decrypt input')
        if (raw.length < 16) throw new CipherError('INVALID_INPUT', 'HC-128 decrypt input needs 16-byte IV prefix.')
        ivBytes = raw.slice(0, 16); msgHex = toHex(raw.slice(16))
    } else {
        ivBytes = ivHex ? parseHex(ivHex, 'HC-128 IV') : randomBytes(16)
        if (ivBytes.length !== 16) throw new CipherError('INVALID_INPUT', 'HC-128 IV must be 16 bytes.')
        msgHex = input
    }

    const msgBytes = parseHex(msgHex, 'HC-128 message')
    const state = hc128Init(kb, ivBytes)
    const ks = hc128Keystream(state, msgBytes.length)
    const outBytes = new Uint8Array(msgBytes.length)
    for (let i = 0; i < msgBytes.length; i++) outBytes[i] = msgBytes[i] ^ ks[i]

    const steps: CipherStep[] = []
    if (instrument) {
        steps.push({
            index: 0, label: 'Key/IV expansion → P[512] and Q[512]',
            inputState: `key=${toHex(kb)} iv=${toHex(ivBytes)}`,
            outputState: 'P[0..511] and Q[0..511] filled from W[256..767] and W[768..1279]',
            note: 'W[0..15] = key‖IV (repeated). W[i>15] = f2(W[i-2])+W[i-7]+f1(W[i-15])+W[i-16]+i (SHA-256-like). P=W[256..767], Q=W[768..1279]. Then 1024 warm-up output words update P and Q in place.',
            isMilestone: true
        })
        steps.push({
            index: 1, label: `Keystream XOR — ${msgBytes.length} bytes`,
            inputState: toHex(msgBytes.slice(0, 8)) + (msgBytes.length > 8 ? '…' : ''),
            outputState: toHex(outBytes.slice(0, 8)) + (outBytes.length > 8 ? '…' : ''),
            note: 'Steps 0-511: update P[j]+=g1(...); output h1(P[-12])⊕P[j]. Steps 512-1023: update Q[j]+=g2(...); output h2(Q[-12])⊕Q[j]. h1 cross-lookups Q; h2 cross-lookups P.',
            isMilestone: true
        })
    }

    const output = dec ? toHex(outBytes) : toHex(ivBytes) + toHex(outBytes)
    return { output, outputEncoding: 'hex', steps, metadata: METADATA, durationMs: performance.now() - t0 }
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
    const iv = (options as Record<string, unknown>).nonce as string | undefined
    return hc128Core(input, key, false, !!options.instrument, iv)
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
    validateInput(input); return hc128Core(input, key, true, !!options.instrument)
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
        input: '48656c6c6f20576f726c64', key: '00000000000000000000000000000000',
        expected: 'randomized',
        description: 'HC-128 stream cipher with 128-bit key (randomized 128-bit IV prepended to ciphertext)'
    },
]
