/**
 * CRAFT — TCHES 2019 (Beierle, Leander, Moradi, Peyrin)
 * Lightweight tweakable block cipher with reflection decryption property.
 * 64-bit block, 128-bit key, 64-bit tweak, 32 rounds.
 */
import type { CipherResult, CipherStep, CipherOptions, TestVector, CipherMetadata } from '../types'
import { CipherError } from '../../utils/errors'

const METADATA: CipherMetadata = {
    name: 'CRAFT',
    keySize: 128,
    blockSize: 64,
    securityStatus: 'secure',
    breakingComplexity: 'No practical attack on full 32-round version. Reflection decryption via tweak.',
    yearDesigned: 2019,
    standardBody: 'TCHES 2019',
}

// CRAFT S-box (MIDORI/CRAFT involutory S-box from TCHES 2019 Table 1)
const SBOX: readonly number[] = [0xC, 0xA, 0xD, 0x3, 0xE, 0xB, 0xF, 0x7, 0x8, 0x9, 0x1, 0x5, 0x0, 0x2, 0x4, 0x6]

// PermuteNibbles (involutory permutation from TCHES 2019 Section 3)
const PN: readonly number[] = [15, 12, 13, 14, 10, 9, 8, 11, 6, 5, 4, 7, 1, 2, 3, 0]

// Tweak permutation Q (TCHES 2019 Section 3)
const Q: readonly number[] = [12, 10, 15, 5, 14, 8, 9, 2, 11, 3, 7, 4, 6, 0, 1, 13]

// Round constants (RC_i = (a, b) from TCHES 2019 Table 2)
const RC: readonly [number, number][] = [
    [0x1, 0x1], [0x8, 0x4], [0x4, 0x2], [0x2, 0x5], [0x9, 0x6], [0xc, 0x7], [0x6, 0x3], [0xb, 0x1],
    [0x5, 0x4], [0xa, 0x2], [0xd, 0x5], [0xe, 0x6], [0xf, 0x7], [0x7, 0x3], [0x3, 0x1], [0x1, 0x4],
    [0x8, 0x2], [0x4, 0x5], [0x2, 0x6], [0x9, 0x7], [0xc, 0x3], [0x6, 0x1], [0xb, 0x4], [0x5, 0x2],
    [0xa, 0x5], [0xd, 0x6], [0xe, 0x7], [0xf, 0x3], [0x7, 0x1], [0x3, 0x4], [0x1, 0x2], [0x8, 0x5]
]

function applyMC(state: number[]): number[] {
    const out = [...state]
    for (let c = 0; c < 4; c++) {
        const r0 = state[c]
        const r1 = state[c + 4]
        const r2 = state[c + 8]
        const r3 = state[c + 12]
        out[c]      = (r0 ^ r2 ^ r3) & 0xF
        out[c + 4]  = (r1 ^ r3) & 0xF
        out[c + 8]  = r2 & 0xF
        out[c + 12] = r3 & 0xF
    }
    return out
}

function applyPN(state: number[]): number[] {
    const out = new Array(16)
    for (let i = 0; i < 16; i++) {
        out[PN[i]] = state[i]
    }
    return out
}

function applySB(state: number[]): number[] {
    return state.map(x => SBOX[x & 0xF])
}

function permuteQ(tweak: number[]): number[] {
    const out = new Array(16)
    for (let i = 0; i < 16; i++) {
        out[i] = tweak[Q[i]]
    }
    return out
}

function parseHexNibbles(s: string, expectedLen: number, lbl: string): number[] {
    const c = s.replace(/\s+/g, '').toLowerCase()
    if (!/^[0-9a-f]*$/.test(c)) throw new CipherError('INVALID_INPUT', `${lbl} must be hex.`)
    if (c.length !== expectedLen) {
        if (lbl.includes('key')) {
            throw new CipherError('INVALID_KEY_LENGTH', `INVALID_KEY_LENGTH: ${lbl} must be ${expectedLen / 2} bytes.`)
        }
        throw new CipherError('INVALID_INPUT', `${lbl} must be ${expectedLen / 2} bytes.`)
    }
    return Array.from(c).map(ch => parseInt(ch, 16))
}

function toHexStr(nibbles: number[]): string {
    return nibbles.map(n => n.toString(16)).join('')
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
 * @see https://csrc.nist.gov/pubs/fips/46-3/final — FIPS 46-3.
 */
export function encrypt(plaintext: string, key: string, options: CipherOptions = {}): CipherResult {
    const start = performance.now()
    const kNibbles = parseHexNibbles(key, 32, 'CRAFT key')
    const tNibbles = parseHexNibbles((options.tweak as string) || '0000000000000000', 16, 'CRAFT tweak')
    const ptNibbles = parseHexNibbles(plaintext, 16, 'CRAFT plaintext')

    const k0 = kNibbles.slice(0, 16)
    const k1 = kNibbles.slice(16, 32)
    const qT = permuteQ(tNibbles)

    const TK = [
        k0.map((v, i) => (v ^ tNibbles[i]) & 0xF),
        k1.map((v, i) => (v ^ tNibbles[i]) & 0xF),
        k0.map((v, i) => (v ^ qT[i]) & 0xF),
        k1.map((v, i) => (v ^ qT[i]) & 0xF)
    ]

    let Y = [...ptNibbles]
    const steps: CipherStep[] = []

    for (let i = 0; i < 32; i++) {
        Y = applyMC(Y)
        Y[4] = (Y[4] ^ RC[i][0]) & 0xF
        Y[5] = (Y[5] ^ RC[i][1]) & 0xF
        const rtk = TK[i % 4]
        for (let j = 0; j < 16; j++) {
            Y[j] = (Y[j] ^ rtk[j]) & 0xF
        }
        if (i !== 31) {
            Y = applyPN(Y)
            Y = applySB(Y)
        }

        if (i % 8 === 0) {
            steps.push({
                index: steps.length,
                label: `CRAFT Round ${i + 1}/32`,
                inputState: plaintext,
                outputState: toHexStr(Y),
                note: `TCHES 2019 CRAFT round. TK${i % 4}.`,
                isMilestone: i === 0 || i === 31
            })
        }
    }

    return { output: toHexStr(Y), outputEncoding: 'hex', steps, metadata: METADATA, durationMs: performance.now() - start }
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
 * @see https://csrc.nist.gov/pubs/fips/46-3/final — FIPS 46-3.
 */
export function decrypt(ciphertext: string, key: string, options: CipherOptions = {}): CipherResult {
    const start = performance.now()
    const kNibbles = parseHexNibbles(key, 32, 'CRAFT key')
    const tNibbles = parseHexNibbles((options.tweak as string) || '0000000000000000', 16, 'CRAFT tweak')
    const ctNibbles = parseHexNibbles(ciphertext, 16, 'CRAFT ciphertext')

    const k0 = kNibbles.slice(0, 16)
    const k1 = kNibbles.slice(16, 32)
    const qT = permuteQ(tNibbles)

    const TK = [
        applyMC(k0.map((v, i) => (v ^ tNibbles[i]) & 0xF)),
        applyMC(k1.map((v, i) => (v ^ tNibbles[i]) & 0xF)),
        applyMC(k0.map((v, i) => (v ^ qT[i]) & 0xF)),
        applyMC(k1.map((v, i) => (v ^ qT[i]) & 0xF))
    ]

    let Y = [...ctNibbles]
    const steps: CipherStep[] = []

    for (let i = 31; i >= 0; i--) {
        Y = applyMC(Y)
        Y[4] = (Y[4] ^ RC[i][0]) & 0xF
        Y[5] = (Y[5] ^ RC[i][1]) & 0xF
        const rtk = TK[i % 4]
        for (let j = 0; j < 16; j++) {
            Y[j] = (Y[j] ^ rtk[j]) & 0xF
        }
        if (i !== 0) {
            Y = applyPN(Y)
            Y = applySB(Y)
        }

        if (i % 8 === 0) {
            steps.push({
                index: steps.length,
                label: `CRAFT Inv Round ${32 - i}/32`,
                inputState: ciphertext,
                outputState: toHexStr(Y),
                note: `TCHES 2019 CRAFT decryption round.`,
                isMilestone: i === 31 || i === 0
            })
        }
    }

    return { output: toHexStr(Y), outputEncoding: 'hex', steps, metadata: METADATA, durationMs: performance.now() - start }
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
    { input: '0000000000000000', key: '00000000000000000000000000000000', expected: 'mock_ct', description: 'CRAFT zero key/tweak/plaintext' }
]
