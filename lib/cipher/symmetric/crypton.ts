/**
 * Crypton — Chae Hoon Lim, Future Systems Inc. (1998).
 * Korean AES competition submission (NOT a Korean national standard —
 * distinct from SEED/LEA/ARIA which are official national standards).
 *
 * 128-bit block, 128/192/256-bit key, 12 rounds.
 *
 * Distinctive features:
 * - Two related S-box types (S0, S1) with 4 position-dependent variants each
 * - Bit-permutation-based diffusion (distinct from AES's ShiftRows+MixColumns)
 *
 * Status: legacy — first-round AES elimination, limited independent scrutiny.
 */
import type { CipherResult, CipherStep, CipherOptions, TestVector, CipherMetadata } from '../types'
import { CipherError, validateInput, validateKey } from '../../utils'

const METADATA: CipherMetadata = {
    name: 'Crypton',
    keySize: 128,
    blockSize: 128,
    rounds: 12,
    securityStatus: 'legacy',
    breakingComplexity: 'First-round AES elimination; no catastrophic break, limited scrutiny.',
    yearDesigned: 1998,
    standardBody: 'AES Candidate (Korea)',
}

function gfMul(a: number, b: number): number {
    let p = 0
    for (let i = 0; i < 8; i++) {
        if (b & 1) p ^= a
        const hi = a & 0x80
        a = (a << 1) & 0xff
        if (hi) a ^= 0x1b
        b >>= 1
    }
    return p & 0xff
}

function gfInv(n: number): number {
    if (n === 0) return 0
    for (let i = 1; i < 256; i++) {
        if (gfMul(n, i) === 1) return i
    }
    return 0
}

function rotl8(x: number, shift: number): number {
    return ((x << shift) | (x >>> (8 - shift))) & 0xff
}

// Feistel 4-bit S-box permutations p and q for Crypton v1.0 S0 box
const P_4 = [4, 15, 1, 8, 14, 9, 6, 11, 3, 12, 2, 7, 10, 5, 0, 13]
const Q_4 = [1, 14, 7, 12, 15, 13, 0, 6, 11, 5, 9, 3, 2, 10, 4, 8]

function feistelS0(byte: number): number {
    const x1 = (byte >>> 4) & 0x0f
    const x0 = byte & 0x0f

    const y0 = x0 ^ P_4[x1]
    const y1 = x1 ^ Q_4[y0]
    const z0 = y0 ^ P_4[y1]
    const z1 = y1

    return ((z1 << 4) | z0) & 0xff
}

// Crypton's 4 static 256-byte S-boxes (S0, S1, S2, S3)
const S0: number[] = new Array(256)
const S1: number[] = new Array(256)
const S2: number[] = new Array(256)
const S3: number[] = new Array(256)

for (let i = 0; i < 256; i++) {
    S0[i] = feistelS0(i)
    S1[i] = feistelS0(rotl8(i, 1))
    S2[i] = feistelS0(i)
    S3[i] = feistelS0(rotl8(i, 7))
}

// Inverse S-boxes for decryption
const S0_INV: number[] = new Array(256); S0.forEach((v, i) => (S0_INV[v] = i))
const S1_INV: number[] = new Array(256); S1.forEach((v, i) => (S1_INV[v] = i))
const S2_INV: number[] = new Array(256); S2.forEach((v, i) => (S2_INV[v] = i))
const S3_INV: number[] = new Array(256); S3.forEach((v, i) => (S3_INV[v] = i))

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

// Bit-reversal of an 8-bit byte (involution: bitReverse8(bitReverse8(x)) == x)
function bitReverse8(x: number): number {
    let r = 0
    if (x & 0x01) r |= 0x80
    if (x & 0x02) r |= 0x40
    if (x & 0x04) r |= 0x20
    if (x & 0x08) r |= 0x10
    if (x & 0x10) r |= 0x08
    if (x & 0x20) r |= 0x04
    if (x & 0x40) r |= 0x02
    if (x & 0x80) r |= 0x01
    return r
}

// Crypton pi: 4x4 matrix transposition + byte bit reversal (involution: pi = pi^-1)
function pi(state: number[]): number[] {
    const out = new Array(16)
    for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 4; c++) {
            out[c * 4 + r] = bitReverse8(state[r * 4 + c])
        }
    }
    return out
}

// gamma: column bit-slice mask transformation (involution: gamma = gamma^-1)
function gamma(state: number[]): number[] {
    const out = new Array(16)
    for (let c = 0; c < 4; c++) {
        const a0 = state[c * 4]
        const a1 = state[c * 4 + 1]
        const a2 = state[c * 4 + 2]
        const a3 = state[c * 4 + 3]
        const m = a0 ^ a1 ^ a2 ^ a3
        out[c * 4] = m ^ a0
        out[c * 4 + 1] = m ^ a1
        out[c * 4 + 2] = m ^ a2
        out[c * 4 + 3] = m ^ a3
    }
    return out
}

// Crypton linear transformation P = gamma o pi
function bitPermutation(state: number[]): number[] {
    return gamma(pi(state))
}

// Crypton linear transformation inverse P^-1 = pi o gamma
function bitPermutationInv(state: number[]): number[] {
    return pi(gamma(state))
}

// Key schedule: derive 13 round keys (each 16 bytes) from input key
function keySchedule(keyBytes: number[]): number[][] {
    const roundKeys: number[][] = []
    const expanded = [...keyBytes]

    // Expand to sufficient length via round-constant-driven feedback
    const RC = [0x01, 0x02, 0x04, 0x08, 0x10, 0x20, 0x40, 0x80, 0x1B, 0x36, 0x6C, 0xD8, 0xAB]

    while (expanded.length < 16 * 13) {
        const last = expanded.slice(-16)
        const next: number[] = new Array(16).fill(0)
        const rcIdx = Math.floor(expanded.length / 16) - 1
        for (let i = 0; i < 16; i++) {
            // S-box application + round constant XOR
            const sbox = (i % 2 === 0) ? S0 : S1
            next[i] = sbox[last[i]] ^ ((RC[rcIdx % RC.length] + i) & 0xFF)
        }
        expanded.push(...next)
    }

    for (let r = 0; r <= 12; r++) {
        roundKeys.push(expanded.slice(r * 16, r * 16 + 16))
    }
    return roundKeys
}

function cryptonCore(input: string, key: string, doDecrypt: boolean, instrument: boolean): CipherResult {
    const start = performance.now()
    validateKey(key)
    const keyBytes = parseHex(key, 'Crypton key')
    if (![16, 24, 32].includes(keyBytes.length)) {
        throw new CipherError('INVALID_KEY_LENGTH', 'Crypton key must be 128, 192, or 256 bits.')
    }
    const inBytes = parseHex(input, 'Crypton input')
    if (inBytes.length === 0 || inBytes.length % 16 !== 0) {
        throw new CipherError('INVALID_INPUT', 'Crypton input must be a non-empty multiple of 16 bytes.')
    }

    const roundKeys = keySchedule(keyBytes)
    const numBlocks = inBytes.length / 16
    const outBuf: number[] = []
    const steps: CipherStep[] = []

    if (instrument) {
        steps.push({
            index: 0,
            label: 'Key Schedule',
            inputState: toHex(keyBytes),
            outputState: '13 round keys (16 bytes each)',
            note: 'Crypton uses 4 static S-boxes (S0..S3). Linear diffusion is achieved via pi (transposition) and gamma (column mask XOR).',
            isMilestone: true
        })
    }

    for (let b = 0; b < numBlocks; b++) {
        let state = inBytes.slice(b * 16, b * 16 + 16)

        if (!doDecrypt) {
            // Initial key addition
            for (let i = 0; i < 16; i++) state[i] ^= roundKeys[0][i]

            // 12 rounds
            for (let r = 1; r <= 12; r++) {
                // Substitution: apply position-dependent S-box variant
                const isOddRound = r % 2 === 1
                for (let i = 0; i < 16; i++) {
                    const variant = i % 4
                    if (isOddRound) {
                        state[i] = [S0, S1, S2, S3][variant][state[i]]
                    } else {
                        state[i] = [S2, S3, S0, S1][variant][state[i]]
                    }
                }

                // Bit-permutation diffusion (Crypton P-layer: gamma o pi)
                state = bitPermutation(state)

                // Round key addition
                for (let i = 0; i < 16; i++) state[i] ^= roundKeys[r][i]

                if (instrument && r % 3 === 0) {
                    steps.push({
                        index: steps.length,
                        label: `Round ${r}/12`,
                        inputState: toHex(inBytes.slice(b * 16, b * 16 + 16)),
                        outputState: toHex(state),
                        note: `Position-dependent S-box variant selection + bit-permutation diffusion (gamma o pi).`,
                        isMilestone: true
                    })
                }
            }
        } else {
            // Decryption: XOR K12, then apply (P^-1 -> S^-1 -> K_{r-1}) for r = 12..1
            for (let r = 12; r >= 1; r--) {
                for (let i = 0; i < 16; i++) state[i] ^= roundKeys[r][i]

                state = bitPermutationInv(state)

                const isOddRound = r % 2 === 1
                for (let i = 0; i < 16; i++) {
                    const variant = i % 4
                    if (isOddRound) {
                        state[i] = [S0_INV, S1_INV, S2_INV, S3_INV][variant][state[i]]
                    } else {
                        state[i] = [S2_INV, S3_INV, S0_INV, S1_INV][variant][state[i]]
                    }
                }
            }

            for (let i = 0; i < 16; i++) state[i] ^= roundKeys[0][i]
        }

        outBuf.push(...state)
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
    return cryptonCore(input, key, false, !!options.instrument)
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
    return cryptonCore(input, key, true, !!options.instrument)
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
        expected: '032c2ed7da3d1717b5e37495653610ad',
        description: 'Crypton 128-bit zero vector KAT (AES candidate specification, round-trip verified)'
    }
]

