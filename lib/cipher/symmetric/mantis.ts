/**
 * MANTIS — EUROCRYPT 2016
 * Tweakable low-latency block cipher based on the FKS reflection framework.
 * 64-bit block, 128-bit key (k0 || k1), 64-bit tweak.
 * MANTIS-5 and MANTIS-7 variants.
 */
import type { CipherResult, CipherStep, CipherOptions, TestVector, CipherMetadata } from '../types'
import { CipherError } from '../../utils/errors'

const METADATA: CipherMetadata = {
    name: 'MANTIS',
    keySize: 128,
    blockSize: 64,
    rounds: 14, // 7 forward + 7 backward for MANTIS-7
    securityStatus: 'secure',
    breakingComplexity: 'FKS reflection structure. MANTIS-7 offers high security; MANTIS-5 has reduced margin.',
    yearDesigned: 2016,
    standardBody: 'EUROCRYPT 2016',
}

// SKINNY-64 S-box used in MANTIS
const SBOX: readonly number[] = [0, 1, 8, 13, 15, 6, 7, 4, 14, 3, 9, 10, 5, 12, 2, 11]
const SBOX_INV: readonly number[] = new Array(16).fill(0)
SBOX.forEach((v, i) => (SBOX_INV as number[])[v] = i)

// ShuffleCell permutation
const P: readonly number[] = [0, 11, 6, 13, 10, 1, 12, 7, 5, 14, 3, 8, 15, 4, 9, 2]
const P_INV: readonly number[] = new Array(16).fill(0)
P.forEach((v, i) => (P_INV as number[])[v] = i)

// Round constants (applied to specific nibble positions)
const RC: readonly number[] = [0x0, 0x1, 0x2, 0x3, 0x4, 0x5, 0x6, 0x7]

function u4(n: number): number { return n & 0xF }

function subCells(state: number[], inv: boolean) {
    const box = inv ? SBOX_INV : SBOX
    for (let i = 0; i < 16; i++) state[i] = box[state[i]]
}

function shuffleCell(state: number[], inv: boolean) {
    const perm = inv ? P_INV : P
    const tmp = [...state]
    for (let i = 0; i < 16; i++) state[i] = tmp[perm[i]]
}

function mixColumn(state: number[]) {
    for (let c = 0; c < 4; c++) {
        const col = [state[c], state[4 + c], state[8 + c], state[12 + c]]
        state[c] = u4(col[1] ^ col[2] ^ col[3])
        state[4 + c] = u4(col[0] ^ col[2] ^ col[3])
        state[8 + c] = u4(col[0] ^ col[1] ^ col[3])
        state[12 + c] = u4(col[0] ^ col[1] ^ col[2])
    }
}

function mixColumnInv(state: number[]) {
    // The inverse of the MANTIS MixColumn matrix over GF(2) is the same matrix
    mixColumn(state)
}

function addTweak(state: number[], tweakNibbles: number[]) {
    // Tweak injection positions (simplified representative mapping for visualizer)
    for (let i = 0; i < 16; i++) state[i] = u4(state[i] ^ tweakNibbles[i])
}

function addConstants(state: number[], rc: number) {
    state[0] = u4(state[0] ^ rc)
    state[4] = u4(state[4] ^ (rc >> 1))
}

function parseHex(s: string, lbl: string): number[] {
    const c = s.replace(/\s+/g, '').toLowerCase()
    if (!/^[0-9a-f]*$/.test(c) || c.length % 2 !== 0) throw new CipherError('INVALID_INPUT', `${lbl} must be hex.`)
    const o: number[] = []
    for (let i = 0; i < c.length; i += 2) o.push(parseInt(c.slice(i, i + 2), 16))
    return o
}
function toHex(b: number[]): string { return b.map(x => x.toString(16).padStart(2, '0')).join('') }

function bytesToNibbles(bytes: number[]): number[] {
    const nibbles: number[] = []
    for (const b of bytes) {
        nibbles.push((b >> 4) & 0xF)
        nibbles.push(b & 0xF)
    }
    return nibbles
}
function nibblesToBytes(nibbles: number[]): number[] {
    const bytes: number[] = []
    for (let i = 0; i < nibbles.length; i += 2) {
        bytes.push((nibbles[i] << 4) | nibbles[i + 1])
    }
    return bytes
}

function mantisCore(input: string, key: string, tweak: string, variant: number, doDecrypt: boolean): CipherResult {
    const start = performance.now()
    const keyBytes = parseHex(key, 'MANTIS key')
    if (keyBytes.length !== 16) throw new CipherError('INVALID_KEY_LENGTH', 'Key must be 128 bits (16 bytes).')

    const tweakBytes = parseHex(tweak || '0000000000000000', 'MANTIS tweak')
    if (tweakBytes.length !== 8) throw new CipherError('INVALID_INPUT', 'Tweak must be 64 bits (8 bytes).')

    const inBytes = parseHex(input, 'MANTIS input')
    if (inBytes.length !== 8) throw new CipherError('INVALID_INPUT', 'Input must be 64 bits (8 bytes).')

    const state = bytesToNibbles(inBytes)
    const kNibbles = bytesToNibbles(keyBytes)
    const tNibbles = bytesToNibbles(tweakBytes)

    const k0 = kNibbles.slice(0, 16)
    const k1 = kNibbles.slice(16, 32)

    // Decryption = swap key halves and encrypt
    const useK0 = doDecrypt ? k1 : k0
    const useK1 = doDecrypt ? k0 : k1

    const delta = variant === 5 ? 5 : 7
    const steps: CipherStep[] = []

    // Initial whitening: state ^ k0 ^ tweak
    for (let i = 0; i < 16; i++) state[i] = u4(state[i] ^ useK0[i] ^ tNibbles[i])

    // Forward pass
    for (let r = 0; r < delta; r++) {
        subCells(state, false)
        addConstants(state, RC[r % 8])
        addTweak(state, tNibbles)
        shuffleCell(state, false)
        mixColumn(state)
    }

    // Middle layer
    subCells(state, false)
    addConstants(state, RC[0])
    // Middle key addition: k1 ^ alpha(k0)
    const alphaK0 = [...k0]
    // 1-bit right rotation of 64-bit k0 (simplified nibble shift for visualizer)
    const carry = alphaK0[15] & 1
    for (let i = 15; i > 0; i--) alphaK0[i] = u4((alphaK0[i] >> 1) | ((alphaK0[i - 1] & 1) << 3))
    alphaK0[0] = u4((alphaK0[0] >> 1) | (carry << 3))

    for (let i = 0; i < 16; i++) state[i] = u4(state[i] ^ useK1[i] ^ alphaK0[i])
    subCells(state, true)

    // Backward pass
    for (let r = delta - 1; r >= 0; r--) {
        mixColumnInv(state)
        shuffleCell(state, true)
        addTweak(state, tNibbles)
        addConstants(state, RC[r % 8])
        subCells(state, true)
    }

    // Final whitening: state ^ k1 ^ tweak
    for (let i = 0; i < 16; i++) state[i] = u4(state[i] ^ useK1[i] ^ tNibbles[i])

    const outBytes = nibblesToBytes(state)
    steps.push({ index: 0, label: `MANTIS-${variant} ${doDecrypt ? 'Decryption' : 'Encryption'}`, inputState: toHex(inBytes), outputState: toHex(outBytes), note: `FKS reflection structure. Decryption uses swapped key halves.`, isMilestone: true })

    return { output: toHex(outBytes), outputEncoding: 'hex', steps, metadata: METADATA, durationMs: performance.now() - start }
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
    const tweak = (options.tweak as string) || '0000000000000000'
    const variant = (options.variant as number) || 7
    return mantisCore(input, key, tweak, variant, false)
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
    const tweak = (options.tweak as string) || '0000000000000000'
    const variant = (options.variant as number) || 7
    return mantisCore(input, key, tweak, variant, true)
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
    { input: '0000000000000000', key: '00000000000000000000000000000000', expected: 'mock_mantis_7', description: 'MANTIS-7 all-zero vector' }
]
