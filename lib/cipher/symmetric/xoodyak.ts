/**
 * Xoodyak — NIST LWC Finalist (Daemen, Hoffert, Peeters, Van Assche, Van Keer)
 * Built on the Xoodoo permutation (384-bit state, 12 rounds).
 * Cyclist mode AEAD: 128-bit key, 128-bit nonce, 128-bit tag.
 */
import type { CipherResult, CipherStep, CipherOptions, TestVector, CipherMetadata } from '../types'
import { CipherError } from '../../utils/errors'

const METADATA: CipherMetadata = {
    name: 'Xoodyak',
    keySize: 128,
    blockSize: 128,
    securityStatus: 'secure',
    breakingComplexity: 'NIST LWC top-10 finalist. No known practical attacks.',
    yearDesigned: 2018,
    standardBody: 'NIST LWC',
}

// Xoodoo round constants (12 rounds)
const RC: readonly number[] = [
    0x00000058, 0x00000038, 0x000003C0, 0x000000D0, 0x00000120, 0x00000014,
    0x00000060, 0x0000002C, 0x00000380, 0x000000F0, 0x000001A0, 0x00000012
]

function u32(n: number): number { return n >>> 0 }
function rotl32(x: number, n: number): number { return u32((x << n) | (x >>> (32 - n))) }

/**
 * Xoodoo permutation: 384-bit state (12 x 32-bit lanes).
 * Organized as 3 planes of 4 lanes: state[4*y + x] = A[y][x]
 */
function xoodoo(state: number[]): void {
    for (let r = 0; r < 12; r++) {
        // Theta (column mixing)
        const P = new Array(4)
        for (let i = 0; i < 4; i++) P[i] = state[i] ^ state[4 + i] ^ state[8 + i]
        const E = new Array(4)
        for (let i = 0; i < 4; i++) {
            E[i] = rotl32(P[(i + 3) % 4], 5) ^ rotl32(P[(i + 3) % 4], 14)
        }
        for (let i = 0; i < 12; i++) state[i] ^= E[i % 4]

        // Rho-west (plane shifts)
        for (let i = 0; i < 4; i++) state[4 + i] = rotl32(state[4 + i], 1)
        const t11 = state[11]
        state[11] = state[10]; state[10] = state[9]; state[9] = state[8]; state[8] = t11

        // Iota (round constant)
        state[0] ^= RC[r]

        // Chi (non-linear step)
        const a = new Array(12)
        for (let i = 0; i < 12; i++) {
            a[i] = state[i] ^ (~state[(i + 4) % 12] & state[(i + 8) % 12])
        }
        for (let i = 0; i < 12; i++) state[i] = a[i]

        // Rho-east (plane rotations)
        for (let i = 0; i < 4; i++) state[4 + i] = rotl32(state[4 + i], 8)
        const t8 = state[8], t9 = state[9], t10 = state[10], t11_2 = state[11]
        state[8] = rotl32(t10, 8)
        state[9] = rotl32(t11_2, 8)
        state[10] = rotl32(t8, 8)
        state[11] = rotl32(t9, 8)
    }
}

// Cyclist mode domain separation constants
const CD_KEY = 0x02, CD_NONCE = 0x01, CD_AD = 0x03, CD_AD_PARTIAL = 0x07
const CD_MSG = 0x0B, CD_TAG = 0x40

function parseHex(s: string, lbl: string): Uint8Array {
    const c = s.replace(/\s+/g, '').toLowerCase()
    if (!/^[0-9a-f]*$/.test(c) || c.length % 2 !== 0) throw new CipherError('INVALID_INPUT', `${lbl} must be hex.`)
    const o = new Uint8Array(c.length / 2)
    for (let i = 0; i < c.length; i += 2) o[i / 2] = parseInt(c.slice(i, i + 2), 16)
    return o
}
function toHex(b: Uint8Array | number[]): string {
    return Array.from(b).map(x => x.toString(16).padStart(2, '0')).join('')
}

function absorb(state: number[], data: Uint8Array, rate: number, cd: number): void {
    let offset = 0
    while (offset < data.length) {
        const blockLen = Math.min(rate, data.length - offset)
        const isPartial = blockLen < rate

        for (let i = 0; i < blockLen; i++) {
            state[i] ^= data[offset + i]
        }
        if (isPartial) state[blockLen] ^= 0x01 // Padding

        state[rate] ^= (isPartial ? cd | 0x04 : cd) // Domain separation
        xoodoo(state)
        offset += rate
    }

    if (data.length === 0) {
        state[rate] ^= cd
        xoodoo(state)
    }
}

function constantTimeCompare(a: Uint8Array, b: Uint8Array): boolean {
    if (a.length !== b.length) return false
    let diff = 0
    for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i]
    return diff === 0
}

export function encrypt(plaintext: string, key: string, options: CipherOptions = {}): CipherResult {
    const start = performance.now()
    const keyNonce = parseHex(key, 'Xoodyak key+nonce')
    if (keyNonce.length !== 32) throw new CipherError('INVALID_KEY_LENGTH', 'Key must be 32 bytes (16-byte key + 16-byte nonce).')

    const K = keyNonce.slice(0, 16)
    const N = keyNonce.slice(16, 32)
    const ad = parseHex((options.ad as string) || '', 'AD')
    const ptBytes = parseHex(plaintext, 'plaintext')

    const state = new Array(12).fill(0)
    const steps: CipherStep[] = []
    const Rhash = 16, Rkin = 24

    // Initialize
    absorb(state, K, Rhash, CD_KEY)
    absorb(state, N, Rhash, CD_NONCE)

    // Absorb AD
    if (ad.length > 0) {
        absorb(state, ad, Rhash, CD_AD)
    } else {
        state[Rhash] ^= CD_AD
        xoodoo(state)
    }

    // Encrypt
    const ctBytes = new Uint8Array(ptBytes.length)
    let offset = 0
    while (offset < ptBytes.length) {
        const blockLen = Math.min(Rkin, ptBytes.length - offset)
        const isPartial = blockLen < Rkin

        for (let i = 0; i < blockLen; i++) {
            ctBytes[offset + i] = ptBytes[offset + i] ^ state[i]
        }

        if (isPartial) state[blockLen] ^= 0x01
        state[Rkin] ^= (isPartial ? CD_MSG | 0x04 : CD_MSG)

        // Update state with plaintext
        for (let i = 0; i < blockLen; i++) state[i] ^= ptBytes[offset + i]
        xoodoo(state)
        offset += Rkin
    }

    if (ptBytes.length === 0) {
        state[Rkin] ^= CD_MSG
        xoodoo(state)
    }

    // Tag generation
    state[Rkin] ^= CD_TAG
    xoodoo(state)
    const tag = new Uint8Array(16)
    for (let i = 0; i < 16; i++) tag[i] = state[i]

    if (options.instrument) {
        steps.push({ index: 0, label: 'Xoodyak AEAD', inputState: plaintext, outputState: toHex([...ctBytes, ...tag]), note: 'Xoodoo permutation Cyclist mode. Constant-time tag verification.', isMilestone: true })
    }

    return { output: toHex([...ctBytes, ...tag]), outputEncoding: 'hex', steps, metadata: METADATA, durationMs: performance.now() - start }
}

export function decrypt(ciphertext: string, key: string, options: CipherOptions = {}): CipherResult {
    const start = performance.now()
    const keyNonce = parseHex(key, 'Xoodyak key+nonce')
    if (keyNonce.length !== 32) throw new CipherError('INVALID_KEY_LENGTH', 'Key must be 32 bytes.')

    const K = keyNonce.slice(0, 16)
    const N = keyNonce.slice(16, 32)
    const ad = parseHex((options.ad as string) || '', 'AD')
    const ctBytes = parseHex(ciphertext, 'ciphertext')

    if (ctBytes.length < 16) throw new CipherError('INVALID_INPUT', 'Ciphertext too short for tag.')
    const ctOnly = ctBytes.slice(0, ctBytes.length - 16)
    const receivedTag = ctBytes.slice(ctBytes.length - 16)

    const state = new Array(12).fill(0)
    const Rhash = 16, Rkin = 24

    absorb(state, K, Rhash, CD_KEY)
    absorb(state, N, Rhash, CD_NONCE)

    if (ad.length > 0) {
        absorb(state, ad, Rhash, CD_AD)
    } else {
        state[Rhash] ^= CD_AD
        xoodoo(state)
    }

    const ptBytes = new Uint8Array(ctOnly.length)
    let offset = 0
    while (offset < ctOnly.length) {
        const blockLen = Math.min(Rkin, ctOnly.length - offset)
        const isPartial = blockLen < Rkin

        for (let i = 0; i < blockLen; i++) {
            ptBytes[offset + i] = ctOnly[offset + i] ^ state[i]
        }

        if (isPartial) state[blockLen] ^= 0x01
        state[Rkin] ^= (isPartial ? CD_MSG | 0x04 : CD_MSG)

        // Update state with recovered plaintext
        for (let i = 0; i < blockLen; i++) state[i] ^= ptBytes[offset + i]
        xoodoo(state)
        offset += Rkin
    }

    if (ctOnly.length === 0) {
        state[Rkin] ^= CD_MSG
        xoodoo(state)
    }

    state[Rkin] ^= CD_TAG
    xoodoo(state)
    const expectedTag = new Uint8Array(16)
    for (let i = 0; i < 16; i++) expectedTag[i] = state[i]

    if (!constantTimeCompare(expectedTag, receivedTag)) {
        throw new CipherError('AUTH_TAG_MISMATCH', 'Xoodyak authentication tag mismatch.')
    }

    return { output: toHex(ptBytes), outputEncoding: 'hex', steps: [], metadata: METADATA, durationMs: performance.now() - start }
}

export const TEST_VECTORS: TestVector[] = [
    { input: '00000000000000000000000000000000', key: '00'.repeat(32), expected: 'mock_ct_tag', description: 'Xoodyak empty AD, 16-byte zero plaintext' }
]
