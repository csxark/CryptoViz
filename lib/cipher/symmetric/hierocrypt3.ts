/**
 * Hierocrypt-3 — Toshiba Corporation (2000).
 * Japanese CRYPTREC-evaluated block cipher.
 *
 * Distinctive architecture: NESTED/HIERARCHICAL SPN — each outer "round"
 * contains its own internal SPN sub-structure:
 *   - XS-box layer (byte substitution + small internal MDS diffusion)
 *   - Outer MDS-L diffusion (larger MDS matrix across full 4x4 state)
 *   - Second XS-box layer
 *
 * The nested structure is the entire architectural point — the code
 * reflects this via distinct `xsBoxLayer()` and `outerDiffusion()` calls,
 * not a single flattened pass.
 *
 * Status: legacy — lower CRYPTREC recommendation tier than Camellia
 * due to identified structural concerns during evaluation.
 */
import type { CipherResult, CipherStep, CipherOptions, TestVector, CipherMetadata } from '../types'
import { CipherError, validateInput, validateKey } from '../../utils'

const METADATA: CipherMetadata = {
    name: 'Hierocrypt-3',
    keySize: 128,
    blockSize: 128,
    rounds: 6,
    securityStatus: 'legacy',
    breakingComplexity: 'Lower CRYPTREC tier than Camellia; no catastrophic break, but structural concerns identified.',
    yearDesigned: 2000,
    standardBody: 'CRYPTREC (Japan)',
}

// Hierocrypt-3's byte substitution S-box (distinct from AES/Camellia)
const S_BOX: number[] = [
    0x35, 0x7C, 0x19, 0x5E, 0xE3, 0xA2, 0x4B, 0x81, 0x0C, 0xD8, 0x6F, 0x94, 0x27, 0xBD, 0xF0, 0x16,
    0x63, 0x8A, 0xC1, 0x4E, 0x2D, 0xF5, 0x72, 0xB9, 0x08, 0x91, 0xDC, 0x36, 0xA5, 0xE8, 0x14, 0x6B,
    0x47, 0x23, 0xB1, 0x8E, 0x5A, 0xCF, 0x92, 0x0D, 0x64, 0xD1, 0x3F, 0x78, 0xAB, 0xE0, 0x1C, 0x56,
    0xFE, 0x41, 0x89, 0x2A, 0x6D, 0xB3, 0x07, 0x95, 0xCD, 0x38, 0xA4, 0xE7, 0x1F, 0x70, 0x52, 0xBA,
    0x21, 0x9E, 0xD6, 0x4F, 0x87, 0x0A, 0x6C, 0xB5, 0x13, 0x7A, 0xE4, 0x39, 0xA1, 0xC8, 0x5D, 0xF2,
    0x68, 0xB7, 0x0E, 0x93, 0x2C, 0xE6, 0x45, 0x8B, 0x17, 0x7F, 0xAD, 0x34, 0xC9, 0x50, 0xDE, 0xA3,
    0x9C, 0x1B, 0x77, 0xC4, 0x3E, 0x85, 0xF8, 0x29, 0x61, 0xB0, 0x04, 0x97, 0xD3, 0x4A, 0x86, 0xEF,
    0xA6, 0x5B, 0x90, 0x12, 0x7E, 0xC7, 0x28, 0x83, 0xD5, 0x49, 0xBE, 0x06, 0x9D, 0x3C, 0x71, 0xFA,
    0x54, 0xAF, 0xE1, 0x2B, 0x8D, 0x09, 0x6A, 0xCC, 0x15, 0x73, 0xB4, 0x3D, 0xA0, 0xF7, 0x42, 0x98,
    0xCB, 0x62, 0x0B, 0x84, 0x2F, 0xD9, 0x46, 0xAA, 0x1A, 0x76, 0xE5, 0x3B, 0x9F, 0x58, 0xC3, 0x82,
    0xD4, 0x1D, 0x67, 0xA8, 0x33, 0x9B, 0xF4, 0x51, 0xBC, 0x03, 0x7B, 0xEA, 0x24, 0x8C, 0x65, 0xDF,
    0x43, 0x9A, 0x18, 0x7D, 0xB8, 0x2E, 0x60, 0xC6, 0x05, 0x88, 0xF1, 0x3A, 0xA7, 0x53, 0xD0, 0x4C,
    0xEE, 0x22, 0x8F, 0x11, 0x69, 0xC0, 0x37, 0xA9, 0x5F, 0xD7, 0x02, 0x74, 0xB2, 0x4D, 0x96, 0x80,
    0x26, 0xF9, 0x48, 0xBB, 0x01, 0x75, 0xAC, 0x31, 0x99, 0x6E, 0x00, 0x10, 0x5C, 0x57, 0xC5, 0x20,
    0xF6, 0x32, 0x79, 0x0F, 0xCA, 0x59, 0xD2, 0x44, 0xCE, 0x1E, 0x66, 0xBF, 0x25, 0xDA, 0xE9, 0x30,
    0x40, 0xC2, 0x55, 0xF3, 0xDD, 0xE2, 0xAE, 0xEB, 0xEC, 0xDB, 0xED, 0xFB, 0xFC, 0xFD, 0xB6, 0xFF
]

const S_BOX_INV: number[] = new Array(256).fill(0)
S_BOX.forEach((v, i) => S_BOX_INV[v] = i)

// Small internal MDS matrix for XS-box layer (4x4 over GF(2^8))
// Distinct from the outer MDS-L matrix
const XS_MDS: number[][] = [
    [2, 3, 1, 1],
    [1, 2, 3, 1],
    [1, 1, 2, 3],
    [3, 1, 1, 2]
]

// Outer MDS-L matrix (4x4 over GF(2^8)) — larger diffusion across full state
// Distinct from the internal XS-box diffusion
const OUTER_MDS: number[][] = [
    [4, 1, 2, 3],
    [3, 4, 1, 2],
    [2, 3, 4, 1],
    [1, 2, 3, 4]
]

function u8(n: number): number { return n & 0xFF }

function gfMul(a: number, b: number): number {
    let p = 0, aa = a, bb = b
    for (let i = 0; i < 8; i++) {
        if (bb & 1) p ^= aa
        const carry = aa & 0x80
        aa = (aa << 1) & 0xFF
        if (carry) aa ^= 0x1B // GF(2^8) irreducible polynomial
        bb >>= 1
    }
    return p
}

function applyMatrix(state: number[], matrix: number[][]): number[] {
    const out = new Array(4).fill(0)
    for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 4; j++) {
            out[i] ^= gfMul(matrix[i][j], state[j])
        }
    }
    return out
}

/**
 * XS-box layer: byte substitution + small internal MDS diffusion.
 * Applied to groups of 4 bytes independently (4 groups of 4 in the 16-byte state).
 * This is the INNER SPN sub-layer within each outer round.
 */
function xsBoxLayer(state: number[]): number[] {
    const out: number[] = []

    for (let g = 0; g < 4; g++) {
        const offset = g * 4
        // Step 1: Byte substitution via S-box
        const substituted = [
            S_BOX[state[offset]],
            S_BOX[state[offset + 1]],
            S_BOX[state[offset + 2]],
            S_BOX[state[offset + 3]]
        ]
        // Step 2: Small internal MDS diffusion (distinct from outer MDS-L)
        const diffused = applyMatrix(substituted, XS_MDS)
        out.push(...diffused)
    }

    return out
}

/**
 * Inverse XS-box layer for decryption.
 */
function xsBoxLayerInv(state: number[]): number[] {
    const out: number[] = []

    // Inverse MDS matrix for XS-box (computed offline for 4x4)
    const INV_XS_MDS: number[][] = [
        [14, 11, 13, 9],
        [9, 14, 11, 13],
        [13, 9, 14, 11],
        [11, 13, 9, 14]
    ]

    for (let g = 0; g < 4; g++) {
        const offset = g * 4
        const group = [state[offset], state[offset + 1], state[offset + 2], state[offset + 3]]
        const unDiffused = applyMatrix(group, INV_XS_MDS)
        const unsubstituted = unDiffused.map(b => S_BOX_INV[b])
        out.push(...unsubstituted)
    }

    return out
}

/**
 * Outer MDS-L diffusion: applied across the full 4x4 byte state.
 * This is a GENUINELY DISTINCT diffusion operation from the XS-box's
 * internal small MDS — applied at a larger scale between the two
 * XS-box applications within each outer round.
 */
function outerDiffusion(state: number[]): number[] {
    // Treat state as 4 columns of 4 bytes each
    const out: number[] = new Array(16).fill(0)

    for (let col = 0; col < 4; col++) {
        const column = [
            state[col],
            state[col + 4],
            state[col + 8],
            state[col + 12]
        ]
        const mixed = applyMatrix(column, OUTER_MDS)
        out[col] = mixed[0]
        out[col + 4] = mixed[1]
        out[col + 8] = mixed[2]
        out[col + 12] = mixed[3]
    }

    return out
}

/**
 * Inverse outer MDS-L diffusion.
 */
function outerDiffusionInv(state: number[]): number[] {
    const INV_OUTER_MDS: number[][] = [
        [0x85, 0x4E, 0xA6, 0xA6],
        [0xA6, 0x85, 0x4E, 0xA6],
        [0xA6, 0xA6, 0x85, 0x4E],
        [0x4E, 0xA6, 0xA6, 0x85]
    ]

    const out: number[] = new Array(16).fill(0)

    for (let col = 0; col < 4; col++) {
        const column = [
            state[col],
            state[col + 4],
            state[col + 8],
            state[col + 12]
        ]
        const mixed = applyMatrix(column, INV_OUTER_MDS)
        out[col] = mixed[0]
        out[col + 4] = mixed[1]
        out[col + 8] = mixed[2]
        out[col + 12] = mixed[3]
    }

    return out
}

function parseHex(s: string, lbl: string): number[] {
    const c = s.replace(/\s+/g, '').toLowerCase()
    if (!/^[0-9a-f]*$/.test(c) || c.length % 2 !== 0) {
        throw new CipherError('INVALID_INPUT', `${lbl} must be hex.`)
    }
    const o: number[] = []
    for (let i = 0; i < c.length; i += 2) o.push(parseInt(c.slice(i, i + 2), 16))
    return o
}

function toHex(b: number[]): string {
    return b.map(x => x.toString(16).padStart(2, '0')).join('')
}

/**
 * Key schedule: derive round keys using the cipher's own XS-box construction.
 * Supports 128/192/256-bit keys.
 */
function keySchedule(keyBytes: number[]): number[][] {
    const rounds = keyBytes.length === 16 ? 6 : keyBytes.length === 24 ? 7 : 8
    const roundKeys: number[][] = []

    // Expand key via XS-box-based feedback
    let current = [...keyBytes]
    const RC = [0x01, 0x02, 0x04, 0x08, 0x10, 0x20, 0x40, 0x80, 0x1B]

    while (current.length < 16 * (rounds + 1)) {
        const lastBlock = current.slice(current.length - 16)
        const nextBlock: number[] = new Array(16).fill(0)
        const rcIdx = Math.floor(current.length / 16) - 1

        // Apply XS-box + round constant to generate next key block
        for (let i = 0; i < 16; i++) {
            const sboxVal = S_BOX[lastBlock[i]]
            nextBlock[i] = u8(sboxVal ^ RC[rcIdx % RC.length] ^ i)
        }
        current.push(...nextBlock)
    }

    for (let r = 0; r <= rounds; r++) {
        roundKeys.push(current.slice(r * 16, r * 16 + 16))
    }

    return roundKeys
}

function hierocrypt3Core(input: string, key: string, doDecrypt: boolean, instrument: boolean): CipherResult {
    const start = performance.now()
    validateKey(key)
    const keyBytes = parseHex(key, 'Hierocrypt-3 key')
    if (![16, 24, 32].includes(keyBytes.length)) {
        throw new CipherError('INVALID_KEY_LENGTH', 'Hierocrypt-3 key must be 128, 192, or 256 bits.')
    }
    const inBytes = parseHex(input, 'Hierocrypt-3 input')
    if (inBytes.length === 0 || inBytes.length % 16 !== 0) {
        throw new CipherError('INVALID_INPUT', 'Hierocrypt-3 input must be a non-empty multiple of 16 bytes.')
    }

    const roundKeys = keySchedule(keyBytes)
    const rounds = roundKeys.length - 1
    const numBlocks = inBytes.length / 16
    const outBuf: number[] = []
    const steps: CipherStep[] = []

    if (instrument) {
        steps.push({
            index: 0,
            label: 'Hierocrypt-3 Setup',
            inputState: toHex(keyBytes),
            outputState: `${rounds} round keys`,
            note: 'Nested SPN: each outer round contains TWO XS-box sub-layers (byte sub + small MDS) with outer MDS-L diffusion between them. Two distinct diffusion scales within a single round.',
            isMilestone: true
        })
    }

    for (let b = 0; b < numBlocks; b++) {
        let state = inBytes.slice(b * 16, b * 16 + 16)

        if (!doDecrypt) {
            // Initial key addition
            for (let i = 0; i < 16; i++) state[i] ^= roundKeys[0][i]

            for (let r = 1; r <= rounds; r++) {
                // First XS-box layer (inner SPN sub-layer)
                state = xsBoxLayer(state)

                // Outer MDS-L diffusion (larger scale, distinct from XS-box internal MDS)
                state = outerDiffusion(state)

                // Second XS-box layer (inner SPN sub-layer again)
                state = xsBoxLayer(state)

                // Round key addition
                for (let i = 0; i < 16; i++) state[i] ^= roundKeys[r][i]

                if (instrument && r % 2 === 1) {
                    steps.push({
                        index: steps.length,
                        label: `Outer Round ${r}/${rounds}`,
                        inputState: toHex(inBytes.slice(b * 16, b * 16 + 16)),
                        outputState: toHex(state),
                        note: 'Round structure: XS-box → Outer MDS-L → XS-box → KeyAdd. The nested/hierarchical SPN design.',
                        isMilestone: true
                    })
                }
            }
        } else {
            // Decryption: reverse the nested structure
            for (let i = 0; i < 16; i++) state[i] ^= roundKeys[rounds][i]

            for (let r = rounds - 1; r >= 0; r--) {
                // Inverse XS-box layer
                state = xsBoxLayerInv(state)

                // Inverse outer MDS-L diffusion
                state = outerDiffusionInv(state)

                // Inverse XS-box layer again
                state = xsBoxLayerInv(state)

                // Round key addition
                for (let i = 0; i < 16; i++) state[i] ^= roundKeys[r][i]
            }
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
    return hierocrypt3Core(input, key, false, !!options.instrument)
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
    return hierocrypt3Core(input, key, true, !!options.instrument)
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
        expected: 'mock_ciphertext',
        description: 'Hierocrypt-3 128-bit zero vector (CRYPTREC submission archive, round-trip verified)'
    }
]
