/**
 * MD2 — Ronald Rivest, 1989 (RFC 1319).
 * Earliest MD-family member. Byte-oriented, non-word-based.
 * 
 * Distinctive feature: Appends a 16-byte checksum block computed via
 * a running S-box substitution before the main compression pass.
 * 
 * Status: BROKEN. Severe collision and preimage weaknesses.
 */
import type { CipherResult, CipherStep, CipherOptions, TestVector, CipherMetadata } from '../types'
import { CipherError } from '../../utils'
import { validateHashInput } from './sha256'

const METADATA: CipherMetadata = {
    name: 'MD2',
    blockSize: 128, // 16 bytes
    securityStatus: 'broken',
    breakingComplexity: 'Severe practical collision and preimage attacks.',
    yearDesigned: 1989,
    standardBody: 'RFC 1319',
}

// S-box derived from digits of PI (RFC 1319 Appendix A)
const PI_SBOX: number[] = [
    41, 46, 67, 201, 162, 216, 124, 1, 61, 54, 84, 161, 236, 240, 6, 19,
    98, 167, 5, 243, 192, 199, 115, 140, 152, 147, 43, 217, 188, 76, 130, 202,
    30, 155, 87, 60, 253, 212, 224, 22, 103, 66, 111, 24, 138, 23, 229, 18,
    190, 78, 196, 214, 218, 158, 222, 73, 160, 251, 245, 142, 187, 47, 238, 122,
    169, 104, 121, 145, 21, 178, 7, 63, 148, 194, 16, 137, 11, 34, 95, 33,
    128, 127, 93, 154, 90, 144, 50, 39, 53, 62, 204, 231, 191, 247, 151, 3,
    255, 25, 48, 179, 72, 165, 181, 209, 215, 94, 146, 42, 172, 86, 170, 198,
    79, 184, 56, 210, 150, 164, 125, 182, 118, 252, 107, 226, 156, 116, 4, 241,
    69, 157, 112, 89, 100, 113, 135, 32, 134, 91, 207, 101, 230, 45, 168, 2,
    27, 96, 37, 173, 174, 176, 185, 246, 28, 70, 97, 105, 52, 64, 126, 15,
    85, 71, 163, 35, 221, 81, 175, 58, 195, 92, 249, 206, 186, 197, 234, 38,
    44, 83, 13, 110, 133, 40, 132, 9, 211, 223, 205, 244, 65, 129, 77, 82,
    106, 220, 55, 200, 108, 193, 171, 250, 36, 225, 123, 8, 12, 189, 177, 74,
    120, 136, 149, 139, 227, 99, 232, 109, 233, 203, 213, 254, 59, 0, 29, 57,
    242, 239, 183, 14, 102, 88, 208, 228, 166, 119, 114, 248, 235, 117, 75, 10,
    49, 68, 80, 180, 143, 237, 31, 26, 219, 153, 141, 51, 159, 17, 131, 20
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

function md2Core(input: string, instrument: boolean): CipherResult {
    const start = performance.now()
    const inBytes = parseHex(input)

    // 1. Checksum Computation (16 bytes)
    const C = new Array(16).fill(0)
    let L = 0
    for (let i = 0; i < inBytes.length; i++) {
        const byte = inBytes[i]
        const idx = byte ^ L
        // Update C cyclically
        for (let j = 0; j < 16; j++) {
            C[j] = C[j] ^ PI_SBOX[(inBytes[i - (i % 16) + j] || 0) ^ L] // Simplified block-wise
            // Actually, RFC says: for j=0..15: C[j] ^= S[M_i[j] ^ L]; L = C[j]
        }
        // Correct RFC implementation per block:
        if (i % 16 === 0) L = 0 // Reset L per block? NO! "L persists across blocks" is the gotcha.
        // Let's do it strictly per byte as RFC implies, but L persists.
    }

    // Strict RFC 1319 Checksum:
    let L_rfc = 0
    const C_rfc = new Array(16).fill(0)
    const blockCount = Math.ceil(inBytes.length / 16)
    for (let i = 0; i < blockCount; i++) {
        const block = inBytes.slice(i * 16, i * 16 + 16)
        while (block.length < 16) block.push(0) // Pad last block for checksum? RFC says "append padding first".
        // Actually, padding is appended BEFORE checksum computation.
    }

    // Let's do Padding FIRST
    const padLen = 16 - (inBytes.length % 16)
    const padded = [...inBytes, ...new Array(padLen).fill(padLen)]

    // Now Checksum over padded message
    let L_chk = 0
    const C_chk = new Array(16).fill(0)
    for (let i = 0; i < padded.length; i += 16) {
        for (let j = 0; j < 16; j++) {
            const c = padded[i + j] ^ L_chk
            C_chk[j] = C_chk[j] ^ PI_SBOX[c]
            L_chk = C_chk[j]
        }
    }

    // Append checksum to padded message
    const fullMsg = [...padded, ...C_chk]

    const steps: CipherStep[] = []
    if (instrument) {
        steps.push({ index: 0, label: 'Padding & Checksum', inputState: toHex(inBytes), outputState: toHex(fullMsg), note: `Appended ${padLen} padding bytes + 16-byte checksum block.`, isMilestone: true })
    }

    // 2. Main Compression
    let state = new Array(16).fill(0) // 128-bit state
    const totalBlocks = fullMsg.length / 16

    for (let b = 0; b < totalBlocks; b++) {
        const block = fullMsg.slice(b * 16, b * 16 + 16)

        // Extend to 48-byte buffer
        const X = new Array(48).fill(0)
        for (let i = 0; i < 16; i++) {
            X[i] = state[i]
            X[i + 16] = block[i]
            X[i + 32] = state[i] ^ block[i]
        }

        // 18 rounds
        let t = 0
        for (let round = 0; round < 18; round++) {
            for (let j = 0; j < 48; j++) {
                X[j] = X[j] ^ PI_SBOX[t]
                t = X[j]
            }
            t = (t + round) & 0xFF
        }

        // Update state
        for (let i = 0; i < 16; i++) {
            state[i] = X[i]
        }

        if (instrument) {
            steps.push({ index: steps.length, label: `Block ${b + 1}/${totalBlocks}`, inputState: toHex(block), outputState: toHex(state), note: '48-byte buffer, 18 rounds of S-box substitution.', isMilestone: true })
        }
    }

    return { output: toHex(state), outputEncoding: 'hex', steps, metadata: METADATA, durationMs: performance.now() - start }
}

/**
 * Encrypt cryptographic hash export.
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
    validateHashInput(input)
    return md2Core(input, !!options.instrument)
}

/**
 * Decrypt cryptographic hash export.
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
    throw new CipherError('ALGORITHM_UNSUPPORTED', 'MD2 is a hash function and cannot be decrypted.')
}

/**
 * TEST VECTORS cryptographic hash export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/46-3/final — FIPS 46-3.
 */
export const TEST_VECTORS: TestVector[] = [
    { input: '', key: '', expected: '8350e5a3e24c153df2275c9f80692773', description: 'MD2("")' },
    { input: '61', key: '', expected: '32ec01ec4a6dac72c0ab96fb34c0b5d1', description: 'MD2("a")' },
    { input: '616263', key: '', expected: 'da853b0d3f88d99b30283a69e6ded6bb', description: 'MD2("abc")' }
]
