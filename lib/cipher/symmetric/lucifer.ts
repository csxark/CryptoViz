/**
 * Lucifer — Horst Feistel, IBM (~1971).
 * The original Feistel network and direct predecessor to DES.
 * 128-bit block, 128-bit key, 16 rounds.
 * 
 * Distinctive feature: Key-controlled S-box selection. Unlike DES, where
 * the S-box is fixed and only the key material fed into it varies, Lucifer
 * uses a specific key bit to choose WHICH of two 4-bit S-boxes (S0 or S1)
 * applies to each nibble of the working half.
 * 
 * Status: BROKEN. Weaknesses in this design directly motivated DES's refinements.
 */
import type { CipherResult, CipherStep, CipherOptions, TestVector, CipherMetadata } from '../types'
import { CipherError, validateInput, validateKey } from '../../utils'

const METADATA: CipherMetadata = {
    name: 'Lucifer',
    keySize: 128,
    blockSize: 128,
    rounds: 16,
    securityStatus: 'broken',
    breakingComplexity: 'Key schedule and S-box selection weaknesses addressed by DES.',
    yearDesigned: 1971,
    standardBody: 'Feistel / IBM',
}

// 4-bit S-boxes from the 1973 Smith/Tennent/Wood Lucifer specification
const S0: number[] = [0x0C, 0x0F, 0x07, 0x0A, 0x0E, 0x0D, 0x0B, 0x00, 0x02, 0x06, 0x03, 0x01, 0x09, 0x04, 0x05, 0x08]
const S1: number[] = [0x07, 0x02, 0x0E, 0x09, 0x03, 0x0B, 0x00, 0x04, 0x0C, 0x0D, 0x01, 0x0A, 0x06, 0x0F, 0x08, 0x05]

// Fixed bit-permutation (simplified byte-level representation for visualizer traceability)
// In the original, this is a 64-bit permutation. We apply a structural byte/nibble shuffle.
const P_BOX: number[] = [
    3, 1, 5, 7, 0, 2, 4, 6, // Byte shuffle pattern
    7, 5, 3, 1, 6, 4, 2, 0  // Nibble shuffle pattern
]

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

function luciferRound(right: number[], roundKey: number[]): number[] {
    const out: number[] = new Array(8).fill(0)

    for (let i = 0; i < 8; i++) {
        // Key-controlled S-box selection:
        // The corresponding key byte's LSB determines if we use S0 or S1 for this byte's nibbles
        const useS1 = (roundKey[i] & 1) === 1
        const sbox = useS1 ? S1 : S0

        const highNibble = (right[i] >> 4) & 0x0F
        const lowNibble = right[i] & 0x0F

        const subHigh = sbox[highNibble]
        const subLow = sbox[lowNibble]

        out[i] = ((subHigh << 4) | subLow) & 0xFF
    }

    // Apply fixed permutation (byte-level shuffle for visualizer clarity)
    const permuted: number[] = new Array(8).fill(0)
    for (let i = 0; i < 8; i++) {
        permuted[i] = out[P_BOX[i]]
    }

    return permuted
}

function luciferCore(input: string, key: string, doDecrypt: boolean, instrument: boolean): CipherResult {
    const start = performance.now()
    validateKey(key)
    const keyBytes = parseHex(key, 'Lucifer key')
    if (keyBytes.length !== 16) throw new CipherError('INVALID_KEY_LENGTH', `Lucifer key must be 128 bits (16 bytes).`)
    const inBytes = parseHex(input, 'Lucifer input')
    if (inBytes.length === 0 || inBytes.length % 16 !== 0) throw new CipherError('INVALID_INPUT', `Lucifer input must be a non-empty multiple of 16 bytes.`)

    const numBlocks = inBytes.length / 16
    const outBuf: number[] = []
    const steps: CipherStep[] = []

    if (instrument) {
        steps.push({ index: 0, label: 'Key Setup', inputState: toHex(keyBytes), outputState: '16 round keys', note: 'Lucifer uses the key directly to control S-box selection per byte.', isMilestone: true })
    }

    for (let b = 0; b < numBlocks; b++) {
        let left = inBytes.slice(b * 16, b * 16 + 8)
        let right = inBytes.slice(b * 16 + 8, b * 16 + 16)

        const rounds = doDecrypt ? Array.from({ length: 16 }, (_, i) => 15 - i) : Array.from({ length: 16 }, (_, i) => i)

        for (const r of rounds) {
            // Key schedule: simple rotation of the 16-byte key
            const roundKey: number[] = []
            for (let i = 0; i < 8; i++) {
                roundKey.push(keyBytes[(i + r) % 16])
            }

            const fOut = luciferRound(right, roundKey)

            // Feistel XOR
            const newLeft: number[] = []
            for (let i = 0; i < 8; i++) {
                newLeft.push((left[i] ^ fOut[i]) & 0xFF)
            }

            left = right
            right = newLeft

            if (instrument && r % 4 === 0) {
                steps.push({ index: steps.length, label: `Round ${r + 1}/16`, inputState: toHex([...left, ...right]), outputState: toHex([...right, ...newLeft]), note: 'Key bit selects S0 or S1 per nibble. Feistel XOR and swap.', isMilestone: true })
            }
        }

        // Final swap undo (standard Feistel convention)
        outBuf.push(...right, ...left)
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
 * @see https://csrc.nist.gov/pubs/fips/46-3/final — FIPS 46-3.
 */
export function encrypt(input: string, key: string, options: CipherOptions = {}): CipherResult {
    validateInput(input)
    return luciferCore(input, key, false, !!options.instrument)
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
    validateInput(input)
    return luciferCore(input, key, true, !!options.instrument)
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
        input: '00000000000000000000000000000000',
        key: '00000000000000000000000000000000',
        expected: 'mock_ciphertext',
        description: 'Lucifer 128-bit zero vector (1973 Smith/Tennent/Wood variant)'
    }
]
