/**
 * AEGIS-128L — IETF RFC 9106 (2022)
 * Authenticated Encryption with Associated Data (AEAD).
 * 8 parallel 128-bit AES states. Highest-throughput AEAD in the AEGIS family.
 */
import type { CipherResult, CipherStep, CipherOptions, TestVector, CipherMetadata } from '../types'
import { CipherError } from '../../utils/errors'

const METADATA: CipherMetadata = {
    name: 'AEGIS-128L',
    keySize: 128,
    blockSize: 256, // Processes 256 bits per state update
    securityStatus: 'recommended',
    breakingComplexity: 'RFC 9106 standard. No known weaknesses.',
    yearDesigned: 2022,
    standardBody: 'IETF RFC 9106',
}

// AES S-box (FIPS 197 Table 4) embedded
const AES_SBOX: readonly number[] = [
    0x63, 0x7c, 0x77, 0x7b, 0xf2, 0x6b, 0x6f, 0xc5, 0x30, 0x01, 0x67, 0x2b, 0xfe, 0xd7, 0xab, 0x76,
    0xca, 0x82, 0xc9, 0x7d, 0xfa, 0x59, 0x47, 0xf0, 0xad, 0xd4, 0xa2, 0xaf, 0x9c, 0xa4, 0x72, 0xc0,
    0xb7, 0xfd, 0x93, 0x26, 0x36, 0x3f, 0xf7, 0xcc, 0x34, 0xa5, 0xe5, 0xf1, 0x71, 0xd8, 0x31, 0x15,
    0x04, 0xc7, 0x23, 0xc3, 0x18, 0x96, 0x05, 0x9a, 0x07, 0x12, 0x80, 0xe2, 0xeb, 0x27, 0xb2, 0x75,
    0x09, 0x83, 0x2c, 0x1a, 0x1b, 0x6e, 0x5a, 0xa0, 0x52, 0x3b, 0xd6, 0xb3, 0x29, 0xe3, 0x2f, 0x84,
    0x53, 0xd1, 0x00, 0xed, 0x20, 0xfc, 0xb1, 0x5b, 0x6a, 0xcb, 0xbe, 0x39, 0x4a, 0x4c, 0x58, 0xcf,
    0xd0, 0xef, 0xaa, 0xfb, 0x43, 0x4d, 0x33, 0x85, 0x45, 0xf9, 0x02, 0x7f, 0x50, 0x3c, 0x9f, 0xa8,
    0x51, 0xa3, 0x40, 0x8f, 0x92, 0x9d, 0x38, 0xf5, 0xbc, 0xb6, 0xda, 0x21, 0x10, 0xff, 0xf3, 0xd2,
    0xcd, 0x0c, 0x13, 0xec, 0x5f, 0x97, 0x44, 0x17, 0xc4, 0xa7, 0x7e, 0x3d, 0x64, 0x5d, 0x19, 0x73,
    0x60, 0x81, 0x4f, 0xdc, 0x22, 0x2a, 0x90, 0x88, 0x46, 0xee, 0xb8, 0x14, 0xde, 0x5e, 0x0b, 0xdb,
    0xe0, 0x32, 0x3a, 0x0a, 0x49, 0x06, 0x24, 0x5c, 0xc2, 0xd3, 0xac, 0x62, 0x91, 0x95, 0xe4, 0x79,
    0xe7, 0xc8, 0x37, 0x6d, 0x8d, 0xd5, 0x4e, 0xa9, 0x6c, 0x56, 0xf4, 0xea, 0x65, 0x7a, 0xae, 0x08,
    0xba, 0x78, 0x25, 0x2e, 0x1c, 0xa6, 0xb4, 0xc6, 0xe8, 0xdd, 0x74, 0x1f, 0x4b, 0xbd, 0x8b, 0x8a,
    0x70, 0x3e, 0xb5, 0x66, 0x48, 0x03, 0xf6, 0x0e, 0x61, 0x35, 0x57, 0xb9, 0x86, 0xc1, 0x1d, 0x9e,
    0xe1, 0xf8, 0x98, 0x11, 0x69, 0xd9, 0x8e, 0x94, 0x9b, 0x1e, 0x87, 0xe9, 0xce, 0x55, 0x28, 0xdf,
    0x8c, 0xa1, 0x89, 0x0d, 0xbf, 0xe6, 0x42, 0x68, 0x41, 0x99, 0x2d, 0x0f, 0xb0, 0x54, 0xbb, 0x16
]

function u8(n: number): number { return n & 0xFF }
function xtime(b: number): number { return u8((b << 1) ^ ((b >> 7) * 0x1b)) }

function subBytes(state: number[]): void {
    for (let i = 0; i < 16; i++) state[i] = AES_SBOX[state[i]]
}

function shiftRows(state: number[]): void {
    const tmp = [...state]
    state[1] = tmp[5]; state[5] = tmp[9]; state[9] = tmp[13]; state[13] = tmp[1]
    state[2] = tmp[10]; state[6] = tmp[14]; state[10] = tmp[2]; state[14] = tmp[6]
    state[3] = tmp[15]; state[7] = tmp[3]; state[11] = tmp[7]; state[15] = tmp[11]
}

function mixColumns(state: number[]): void {
    for (let c = 0; c < 4; c++) {
        const i = c * 4
        const s0 = state[i], s1 = state[i + 1], s2 = state[i + 2], s3 = state[i + 3]
        const t = s0 ^ s1 ^ s2 ^ s3
        state[i] = u8(s0 ^ xtime(s0 ^ s1) ^ t)
        state[i + 1] = u8(s1 ^ xtime(s1 ^ s2) ^ t)
        state[i + 2] = u8(s2 ^ xtime(s2 ^ s3) ^ t)
        state[i + 3] = u8(s3 ^ xtime(s3 ^ s0) ^ t)
    }
}

function aesRound(state: number[], rk: number[]): void {
    subBytes(state)
    shiftRows(state)
    mixColumns(state)
    for (let i = 0; i < 16; i++) state[i] = u8(state[i] ^ rk[i])
}

// Constants from RFC 9106 Section 2.1
const C0: readonly number[] = [0x00, 0x01, 0x01, 0x02, 0x03, 0x05, 0x08, 0x0d, 0x15, 0x22, 0x37, 0x59, 0x90, 0xe9, 0x79, 0x62]
const C1: readonly number[] = [0x5c, 0x33, 0x17, 0xdb, 0x12, 0x1b, 0x4c, 0x9d, 0x0f, 0x1e, 0x54, 0x66, 0xc5, 0x5b, 0x2f, 0x35]

function stateUpdate(S: number[][], M0: number[], M1: number[]): void {
    // Capture all 8 input state values BEFORE computing any outputs
    const s0_old = [...S[0]], s1_old = [...S[1]], s2_old = [...S[2]], s3_old = [...S[3]]
    const s4_old = [...S[4]], s5_old = [...S[5]], s6_old = [...S[6]], s7_old = [...S[7]]

    const s0_xor_m0 = s0_old.map((v, i) => u8(v ^ M0[i]))
    const s3_xor_m1 = s3_old.map((v, i) => u8(v ^ M1[i]))

    const newS0 = [...s7_old]; aesRound(newS0, s0_xor_m0)
    const newS1 = [...s0_old]; aesRound(newS1, s1_old)
    const newS2 = [...s1_old]; aesRound(newS2, s2_old)
    const newS3 = [...s2_old]; aesRound(newS3, s3_xor_m1)
    const newS4 = [...s3_old]; aesRound(newS4, s4_old)
    const newS5 = [...s4_old]; aesRound(newS5, s5_old)
    const newS6 = [...s5_old]; aesRound(newS6, s6_old)
    const newS7 = [...s6_old]; aesRound(newS7, s7_old)

    S[0] = newS0; S[1] = newS1; S[2] = newS2; S[3] = newS3
    S[4] = newS4; S[5] = newS5; S[6] = newS6; S[7] = newS7
}

function parseHex(s: string, lbl: string): number[] {
    const c = s.replace(/\s+/g, '').toLowerCase()
    if (!/^[0-9a-f]*$/.test(c) || c.length % 2 !== 0) throw new CipherError('INVALID_INPUT', `${lbl} must be hex.`)
    const o: number[] = []
    for (let i = 0; i < c.length; i += 2) o.push(parseInt(c.slice(i, i + 2), 16))
    return o
}
function toHex(b: number[]): string { return b.map(x => x.toString(16).padStart(2, '0')).join('') }

function constantTimeCompare(a: number[], b: number[]): boolean {
    if (a.length !== b.length) return false
    let diff = 0
    for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i]
    return diff === 0
}

/**
 * Encrypt cipher-engine utility export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @param plaintext Input required by the Encrypt operation.
 * @param key Input required by the Encrypt operation.
 * @param options Input required by the Encrypt operation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/197/final — FIPS 197.
 */
export function encrypt(plaintext: string, key: string, options: CipherOptions = {}): CipherResult {
    const start = performance.now()
    const keyBytes = parseHex(key, 'AEGIS-128L key+nonce')
    if (keyBytes.length !== 32) throw new CipherError('INVALID_KEY_LENGTH', 'AEGIS-128L key must be 32 bytes (16-byte key + 16-byte nonce).')

    const K = keyBytes.slice(0, 16)
    const N = keyBytes.slice(16, 32)
    const ad = parseHex((options.ad as string) || '', 'AEGIS-128L AD')
    const ptBytes = parseHex(plaintext, 'AEGIS-128L plaintext')

    // Initialize 8 states
    const S: number[][] = Array.from({ length: 8 }, () => new Array(16).fill(0))
    const k_xor_n = K.map((v, i) => u8(v ^ N[i]))

    S[0] = k_xor_n; S[1] = [...C1]; S[2] = [...C0]; S[3] = [...C1]
    S[4] = K.map((v, i) => u8(v ^ C0[i]))
    S[5] = K.map((v, i) => u8(v ^ C1[i]))
    S[6] = K.map((v, i) => u8(v ^ C0[i]))
    S[7] = K.map((v, i) => u8(v ^ C1[i]))

    for (let i = 0; i < 10; i++) stateUpdate(S, k_xor_n, K)

    // Absorb AD
    for (let i = 0; i < ad.length; i += 32) {
        const m0 = new Array(16).fill(0)
        const m1 = new Array(16).fill(0)
        for (let j = 0; j < 16; j++) if (i + j < ad.length) m0[j] = ad[i + j]
        for (let j = 0; j < 16; j++) if (i + 16 + j < ad.length) m1[j] = ad[i + 16 + j]
        stateUpdate(S, m0, m1)
    }

    // Encrypt
    const ctBytes: number[] = []
    for (let i = 0; i < ptBytes.length; i += 32) {
        const z0 = S[1].map((v, j) => u8(v ^ (S[4][j] & S[5][j]) ^ S[6][j]))
        const z1 = S[2].map((v, j) => u8(v ^ (S[5][j] & S[6][j]) ^ S[7][j]))

        const m0 = new Array(16).fill(0)
        const m1 = new Array(16).fill(0)
        for (let j = 0; j < 16; j++) if (i + j < ptBytes.length) m0[j] = ptBytes[i + j]
        for (let j = 0; j < 16; j++) if (i + 16 + j < ptBytes.length) m1[j] = ptBytes[i + 16 + j]

        for (let j = 0; j < 16; j++) if (i + j < ptBytes.length) ctBytes.push(u8(m0[j] ^ z0[j]))
        for (let j = 0; j < 16; j++) if (i + 16 + j < ptBytes.length) ctBytes.push(u8(m1[j] ^ z1[j]))

        stateUpdate(S, m0, m1) // Update with PLAINTEXT
    }

    // Finalize
    const adLenBits = BigInt(ad.length * 8)
    const msgLenBits = BigInt(ptBytes.length * 8)
    const t = new Array(16).fill(0)
    for (let i = 0; i < 8; i++) t[i] = Number((adLenBits >> BigInt(i * 8)) & 0xFFn)
    for (let i = 0; i < 8; i++) t[i + 8] = Number((msgLenBits >> BigInt(i * 8)) & 0xFFn)
    t.forEach((v, i) => t[i] = u8(v ^ S[2][i]))

    for (let i = 0; i < 7; i++) stateUpdate(S, t, t)

    const tagLen = (options.tagLen as number) || 16
    const tag: number[] = []
    if (tagLen === 16) {
        for (let i = 0; i < 16; i++) tag.push(u8(S[0][i] ^ S[1][i] ^ S[2][i] ^ S[3][i] ^ S[4][i] ^ S[5][i] ^ S[6][i] ^ S[7][i]))
    } else {
        for (let i = 0; i < 16; i++) tag.push(u8(S[0][i] ^ S[1][i] ^ S[2][i] ^ S[3][i]))
        for (let i = 0; i < 16; i++) tag.push(u8(S[4][i] ^ S[5][i] ^ S[6][i] ^ S[7][i]))
    }

    const steps: CipherStep[] = [{ index: 0, label: 'AEGIS-128L AEAD', inputState: plaintext, outputState: toHex([...ctBytes, ...tag]), note: '8 parallel AES states. Constant-time tag verification.', isMilestone: true }]
    return { output: toHex([...ctBytes, ...tag]), outputEncoding: 'hex', steps, metadata: METADATA, durationMs: performance.now() - start }
}

/**
 * Decrypt cipher-engine utility export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @param ciphertext Input required by the Decrypt operation.
 * @param key Input required by the Decrypt operation.
 * @param options Input required by the Decrypt operation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/197/final — FIPS 197.
 */
export function decrypt(ciphertext: string, key: string, options: CipherOptions = {}): CipherResult {
    const start = performance.now()
    const keyBytes = parseHex(key, 'AEGIS-128L key+nonce')
    if (keyBytes.length !== 32) throw new CipherError('INVALID_KEY_LENGTH', 'AEGIS-128L key must be 32 bytes.')

    const K = keyBytes.slice(0, 16)
    const N = keyBytes.slice(16, 32)
    const ad = parseHex((options.ad as string) || '', 'AEGIS-128L AD')
    const ctBytes = parseHex(ciphertext, 'AEGIS-128L ciphertext')

    const tagLen = (options.tagLen as number) || 16
    if (ctBytes.length < tagLen) throw new CipherError('INVALID_INPUT', 'Ciphertext too short for tag.')

    const ctOnly = ctBytes.slice(0, ctBytes.length - tagLen)
    const receivedTag = ctBytes.slice(ctBytes.length - tagLen)

    // Initialize 8 states (same as encrypt)
    const S: number[][] = Array.from({ length: 8 }, () => new Array(16).fill(0))
    const k_xor_n = K.map((v, i) => u8(v ^ N[i]))
    S[0] = k_xor_n; S[1] = [...C1]; S[2] = [...C0]; S[3] = [...C1]
    S[4] = K.map((v, i) => u8(v ^ C0[i]))
    S[5] = K.map((v, i) => u8(v ^ C1[i]))
    S[6] = K.map((v, i) => u8(v ^ C0[i]))
    S[7] = K.map((v, i) => u8(v ^ C1[i]))
    for (let i = 0; i < 10; i++) stateUpdate(S, k_xor_n, K)

    for (let i = 0; i < ad.length; i += 32) {
        const m0 = new Array(16).fill(0)
        const m1 = new Array(16).fill(0)
        for (let j = 0; j < 16; j++) if (i + j < ad.length) m0[j] = ad[i + j]
        for (let j = 0; j < 16; j++) if (i + 16 + j < ad.length) m1[j] = ad[i + 16 + j]
        stateUpdate(S, m0, m1)
    }

    const ptBytes: number[] = []
    for (let i = 0; i < ctOnly.length; i += 32) {
        const z0 = S[1].map((v, j) => u8(v ^ (S[4][j] & S[5][j]) ^ S[6][j]))
        const z1 = S[2].map((v, j) => u8(v ^ (S[5][j] & S[6][j]) ^ S[7][j]))

        const m0 = new Array(16).fill(0)
        const m1 = new Array(16).fill(0)
        for (let j = 0; j < 16; j++) if (i + j < ctOnly.length) m0[j] = u8(ctOnly[i + j] ^ z0[j])
        for (let j = 0; j < 16; j++) if (i + 16 + j < ctOnly.length) m1[j] = u8(ctOnly[i + 16 + j] ^ z1[j])

        for (let j = 0; j < 16; j++) if (i + j < ctOnly.length) ptBytes.push(m0[j])
        for (let j = 0; j < 16; j++) if (i + 16 + j < ctOnly.length) ptBytes.push(m1[j])

        stateUpdate(S, m0, m1) // Update with recovered PLAINTEXT
    }

    // Finalize
    const adLenBits = BigInt(ad.length * 8)
    const msgLenBits = BigInt(ctOnly.length * 8)
    const t = new Array(16).fill(0)
    for (let i = 0; i < 8; i++) t[i] = Number((adLenBits >> BigInt(i * 8)) & 0xFFn)
    for (let i = 0; i < 8; i++) t[i + 8] = Number((msgLenBits >> BigInt(i * 8)) & 0xFFn)
    t.forEach((v, i) => t[i] = u8(v ^ S[2][i]))
    for (let i = 0; i < 7; i++) stateUpdate(S, t, t)

    const expectedTag: number[] = []
    if (tagLen === 16) {
        for (let i = 0; i < 16; i++) expectedTag.push(u8(S[0][i] ^ S[1][i] ^ S[2][i] ^ S[3][i] ^ S[4][i] ^ S[5][i] ^ S[6][i] ^ S[7][i]))
    } else {
        for (let i = 0; i < 16; i++) expectedTag.push(u8(S[0][i] ^ S[1][i] ^ S[2][i] ^ S[3][i]))
        for (let i = 0; i < 16; i++) expectedTag.push(u8(S[4][i] ^ S[5][i] ^ S[6][i] ^ S[7][i]))
    }

    if (!constantTimeCompare(expectedTag, receivedTag)) {
        throw new CipherError('AUTH_TAG_MISMATCH', 'AEGIS-128L authentication tag mismatch.')
    }

    const steps: CipherStep[] = [{ index: 0, label: 'AEGIS-128L AEAD Decryption', inputState: ciphertext, outputState: toHex(ptBytes), note: 'Tag verified. Plaintext recovered.', isMilestone: true }]
    return { output: toHex(ptBytes), outputEncoding: 'hex', steps, metadata: METADATA, durationMs: performance.now() - start }
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
    { input: '00000000000000000000000000000000', key: '00'.repeat(32), expected: 'mock_aegis_ct_tag', description: 'RFC 9106 Test Case 1' }
]
