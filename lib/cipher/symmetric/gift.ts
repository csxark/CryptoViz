/**
 * GIFT-64 — Banik et al., CHES 2017.
 * Ultra-lightweight 64-bit block cipher, 128-bit key, 28-round SPN.
 * Underlying permutation of NIST Lightweight Finalist GIFT-COFB.
 *
 * Official Reference Test Vectors (giftcipher.github.io):
 *   Key: 00000000000000000000000000000000
 *   PT:  0000000000000000
 *   CT:  f62bc3ef34f775ac (Vector 1)
 *
 *   Key: fedcba9876543210fedcba9876543210
 *   PT:  fedcba9876543210
 *   CT:  c1b71f66160ff587 (Vector 2)
 */

import type { CipherResult, CipherStep, CipherOptions, TestVector, CipherMetadata } from '../types'
import { CipherError, validateInput, validateKey } from '../../utils'

const METADATA: CipherMetadata = {
    name: 'GIFT-64',
    keySize: 128,
    blockSize: 64,
    rounds: 28,
    securityStatus: 'secure',
    breakingComplexity: 'No practical attacks; state-of-the-art lightweight cipher',
    yearDesigned: 2017,
    standardBody: 'CHES 2017; NIST Lightweight Cryptography (GIFT-COFB)',
}

// 4-bit S-box: [1, a, 4, c, 6, f, 3, 9, 2, d, b, 7, 5, 0, 8, e]
const SBOX = new Uint8Array([1, 10, 4, 12, 6, 15, 3, 9, 2, 13, 11, 7, 5, 0, 8, 14])
const SBOX_INV = new Uint8Array([13, 0, 8, 6, 2, 12, 4, 11, 14, 7, 1, 10, 3, 9, 15, 5])

// 64-bit permutation mapping
const P64 = new Uint8Array([
    0, 17, 34, 51, 48, 1, 18, 35, 32, 49, 2, 19, 16, 33, 50, 3,
    4, 21, 38, 55, 52, 5, 22, 39, 36, 53, 6, 23, 20, 37, 54, 7,
    8, 25, 42, 59, 56, 9, 26, 43, 40, 57, 10, 27, 24, 41, 58, 11,
    12, 29, 46, 63, 60, 13, 30, 47, 44, 61, 14, 31, 28, 45, 62, 15
])

const P64_INV = new Uint8Array([
    0, 5, 10, 15, 16, 21, 26, 31, 32, 37, 42, 47, 48, 53, 58, 63,
    12, 1, 6, 11, 28, 17, 22, 27, 44, 33, 38, 43, 60, 49, 54, 59,
    8, 13, 2, 7, 24, 29, 18, 23, 40, 45, 34, 39, 56, 61, 50, 55,
    4, 9, 14, 3, 20, 25, 30, 19, 36, 41, 46, 35, 52, 57, 62, 51
])

// 6-bit LFSR round constants from official CHES 2017 reference
const RC = new Uint8Array([
    0x01, 0x03, 0x07, 0x0F, 0x1F, 0x3E, 0x3D, 0x3B, 0x37, 0x2F,
    0x1E, 0x3C, 0x39, 0x33, 0x27, 0x0E, 0x1D, 0x3A, 0x35, 0x2B,
    0x16, 0x2C, 0x18, 0x30, 0x21, 0x02, 0x05, 0x0B, 0x17, 0x2E,
    0x1C, 0x38, 0x31, 0x23, 0x06, 0x0D, 0x1B, 0x36, 0x2D, 0x1A,
    0x34, 0x29, 0x12, 0x24, 0x08, 0x11, 0x22, 0x04, 0x09, 0x13,
    0x26, 0x0C, 0x19, 0x32, 0x25, 0x0A, 0x15, 0x2A, 0x14, 0x28,
    0x10, 0x20
])

function parseHex(s: string, lbl: string): Uint8Array {
    const c = s.replace(/\s+/g, '').toLowerCase()
    if (!/^[0-9a-f]*$/.test(c) || c.length % 2 !== 0)
        throw new CipherError('INVALID_INPUT', `${lbl} must be even-length hex.`)
    const o = new Uint8Array(c.length / 2)
    for (let i = 0; i < o.length; i++) o[i] = parseInt(c.slice(i * 2, i * 2 + 2), 16)
    return o
}

function nibblesToHex(nibbles: Uint8Array): string {
    let s = ''
    for (let i = 0; i < 16; i++) {
        s += nibbles[15 - i].toString(16)
    }
    return s
}

function gift64Core(input: string, key: string, dec: boolean, instrument: boolean): CipherResult {
    const t0 = performance.now()
    validateKey(key)
    const kb = parseHex(key, 'GIFT-64 key')
    if (kb.length !== 16) throw new CipherError('INVALID_KEY_LENGTH', 'GIFT-64 requires 128-bit (16-byte) key.')

    const ib = parseHex(input, 'GIFT-64 input')
    if (ib.length !== 8) throw new CipherError('INVALID_INPUT', 'GIFT-64 requires exactly 8 bytes (64 bits).')

    // Parse input into 16 nibbles where nibble 15 is MSB, nibble 0 is LSB
    const cleanInp = input.replace(/\s+/g, '').toLowerCase()
    const inp = new Uint8Array(16)
    for (let i = 0; i < 16; i++) {
        inp[i] = parseInt(cleanInp[15 - i], 16)
    }

    // Parse key into 32 nibbles where nibble 31 is MSB, nibble 0 is LSB
    const cleanKey = key.replace(/\s+/g, '').toLowerCase()
    const kNibbles = new Uint8Array(32)
    for (let i = 0; i < 32; i++) {
        kNibbles[i] = parseInt(cleanKey[31 - i], 16)
    }

    const steps: CipherStep[] = []
    if (instrument) {
        steps.push({
            index: 0, label: 'Initial State & Key Load',
            inputState: cleanInp, outputState: cleanInp,
            note: '64-bit block loaded into 16 nibbles. 128-bit key loaded into 32 nibbles.', isMilestone: true
        })
    }

    const bits = new Uint8Array(64)
    const permBits = new Uint8Array(64)
    const keyBits = new Uint8Array(128)
    const tempKey = new Uint8Array(32)

    if (!dec) {
        for (let r = 0; r < 28; r++) {
            // 1. SubCells
            for (let i = 0; i < 16; i++) {
                inp[i] = SBOX[inp[i]]
            }

            // 2. PermBits
            for (let i = 0; i < 16; i++) {
                for (let j = 0; j < 4; j++) {
                    bits[4 * i + j] = (inp[i] >> j) & 1
                }
            }
            for (let i = 0; i < 64; i++) {
                permBits[P64[i]] = bits[i]
            }
            for (let i = 0; i < 16; i++) {
                inp[i] = 0
                for (let j = 0; j < 4; j++) {
                    inp[i] ^= (permBits[4 * i + j] << j)
                }
            }

            // 3. AddRoundKey
            for (let i = 0; i < 16; i++) {
                for (let j = 0; j < 4; j++) {
                    bits[4 * i + j] = (inp[i] >> j) & 1
                }
            }
            for (let i = 0; i < 32; i++) {
                for (let j = 0; j < 4; j++) {
                    keyBits[4 * i + j] = (kNibbles[i] >> j) & 1
                }
            }
            let kbc = 0
            for (let i = 0; i < 16; i++) {
                bits[4 * i] ^= keyBits[kbc]
                bits[4 * i + 1] ^= keyBits[kbc + 16]
                kbc++
            }
            bits[3] ^= RC[r] & 1
            bits[7] ^= (RC[r] >> 1) & 1
            bits[11] ^= (RC[r] >> 2) & 1
            bits[15] ^= (RC[r] >> 3) & 1
            bits[19] ^= (RC[r] >> 4) & 1
            bits[23] ^= (RC[r] >> 5) & 1
            bits[63] ^= 1

            for (let i = 0; i < 16; i++) {
                inp[i] = 0
                for (let j = 0; j < 4; j++) {
                    inp[i] ^= (bits[4 * i + j] << j)
                }
            }

            // Key update
            for (let i = 0; i < 32; i++) {
                tempKey[i] = kNibbles[(i + 8) % 32]
            }
            for (let i = 0; i < 24; i++) kNibbles[i] = tempKey[i]
            kNibbles[24] = tempKey[27]
            kNibbles[25] = tempKey[24]
            kNibbles[26] = tempKey[25]
            kNibbles[27] = tempKey[26]
            kNibbles[28] = ((tempKey[28] & 0xc) >> 2) ^ ((tempKey[29] & 0x3) << 2)
            kNibbles[29] = ((tempKey[29] & 0xc) >> 2) ^ ((tempKey[30] & 0x3) << 2)
            kNibbles[30] = ((tempKey[30] & 0xc) >> 2) ^ ((tempKey[31] & 0x3) << 2)
            kNibbles[31] = ((tempKey[31] & 0xc) >> 2) ^ ((tempKey[28] & 0x3) << 2)

            if (instrument && (r === 0 || r === 27)) {
                steps.push({
                    index: r + 1, label: `Round ${r + 1}/28`,
                    inputState: 'SubCells → PermBits → AddRoundKey',
                    outputState: nibblesToHex(inp),
                    note: `Round ${r + 1} complete. Round constant 0x${RC[r].toString(16)} applied.`, isMilestone: true
                })
            }
        }
    } else {
        // Compute all 28 round keys
        const roundKeys: Uint8Array[] = []
        for (let r = 0; r < 28; r++) {
            roundKeys.push(new Uint8Array(kNibbles))
            for (let i = 0; i < 32; i++) {
                tempKey[i] = kNibbles[(i + 8) % 32]
            }
            for (let i = 0; i < 24; i++) kNibbles[i] = tempKey[i]
            kNibbles[24] = tempKey[27]
            kNibbles[25] = tempKey[24]
            kNibbles[26] = tempKey[25]
            kNibbles[27] = tempKey[26]
            kNibbles[28] = ((tempKey[28] & 0xc) >> 2) ^ ((tempKey[29] & 0x3) << 2)
            kNibbles[29] = ((tempKey[29] & 0xc) >> 2) ^ ((tempKey[30] & 0x3) << 2)
            kNibbles[30] = ((tempKey[30] & 0xc) >> 2) ^ ((tempKey[31] & 0x3) << 2)
            kNibbles[31] = ((tempKey[31] & 0xc) >> 2) ^ ((tempKey[28] & 0x3) << 2)
        }

        for (let r = 27; r >= 0; r--) {
            // Inverse AddRoundKey
            for (let i = 0; i < 16; i++) {
                for (let j = 0; j < 4; j++) {
                    bits[4 * i + j] = (inp[i] >> j) & 1
                }
            }
            for (let i = 0; i < 32; i++) {
                for (let j = 0; j < 4; j++) {
                    keyBits[4 * i + j] = (roundKeys[r][i] >> j) & 1
                }
            }
            let kbc = 0
            for (let i = 0; i < 16; i++) {
                bits[4 * i] ^= keyBits[kbc]
                bits[4 * i + 1] ^= keyBits[kbc + 16]
                kbc++
            }
            bits[3] ^= RC[r] & 1
            bits[7] ^= (RC[r] >> 1) & 1
            bits[11] ^= (RC[r] >> 2) & 1
            bits[15] ^= (RC[r] >> 3) & 1
            bits[19] ^= (RC[r] >> 4) & 1
            bits[23] ^= (RC[r] >> 5) & 1
            bits[63] ^= 1
            for (let i = 0; i < 16; i++) {
                inp[i] = 0
                for (let j = 0; j < 4; j++) {
                    inp[i] ^= (bits[4 * i + j] << j)
                }
            }

            // Inverse PermBits
            for (let i = 0; i < 16; i++) {
                for (let j = 0; j < 4; j++) {
                    bits[4 * i + j] = (inp[i] >> j) & 1
                }
            }
            for (let i = 0; i < 64; i++) {
                permBits[P64_INV[i]] = bits[i]
            }
            for (let i = 0; i < 16; i++) {
                inp[i] = 0
                for (let j = 0; j < 4; j++) {
                    inp[i] ^= (permBits[4 * i + j] << j)
                }
            }

            // Inverse SubCells
            for (let i = 0; i < 16; i++) {
                inp[i] = SBOX_INV[inp[i]]
            }

            if (instrument && (r === 27 || r === 0)) {
                steps.push({
                    index: 28 - r, label: `Round ${28 - r}/28 (Inverse)`,
                    inputState: 'InvAddRoundKey → InvPermBits → InvSubCells',
                    outputState: nibblesToHex(inp),
                    note: `Inverse round ${28 - r} complete.`, isMilestone: true
                })
            }
        }
    }

    const outputHex = nibblesToHex(inp)
    return { output: outputHex, outputEncoding: 'hex', steps, metadata: METADATA, durationMs: performance.now() - t0 }
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
    validateInput(input); return gift64Core(input, key, false, !!options.instrument)
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
    validateInput(input); return gift64Core(input, key, true, !!options.instrument)
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
        input: '0000000000000000', key: '00000000000000000000000000000000',
        expected: 'f62bc3ef34f775ac',
        description: 'GIFT-64 official CHES 2017 test vector 1 (zero key/PT).'
    },
    {
        input: 'fedcba9876543210', key: 'fedcba9876543210fedcba9876543210',
        expected: 'c1b71f66160ff587',
        description: 'GIFT-64 official CHES 2017 test vector 2.'
    },
]
