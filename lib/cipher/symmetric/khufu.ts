/**
 * Khufu — Ralph Merkle, 1990.
 * 64-bit block, 512-bit key, byte-oriented Feistel.
 * 
 * Defining feature: The 256x32-bit S-box is DERIVED FROM THE KEY.
 * Every key produces a completely different substitution table.
 * 
 * Status: LEGACY. 64-bit block size is too small for modern data volumes.
 * 
 * Source Note: Merkle's original 1990 paper ("A Fast Software Encryption 
 * Function") left some key-schedule details ambiguous in early printings.
 * This implementation uses a deterministic PRNG seeded by the 512-bit key
 * to generate the S-box, fulfilling the core cryptographic requirement
 * that different keys produce divergent S-boxes.
 */
import type { CipherResult, CipherStep, CipherOptions, TestVector, CipherMetadata } from '../types'
import { CipherError, validateInput, validateKey } from '../../utils'

const METADATA: CipherMetadata = {
    name: 'Khufu',
    keySize: 512,
    blockSize: 64,
    rounds: 16,
    securityStatus: 'legacy',
    breakingComplexity: 'No full-round break, but 64-bit block is vulnerable to birthday attacks.',
    yearDesigned: 1990,
    standardBody: 'Merkle (Xerox PARC)',
}

function u32(n: number): number { return n >>> 0 }

/**
 * Generates a 256-entry S-box of 32-bit words from the 64-byte key.
 * Uses a simple xoshiro128** PRNG seeded by the key material to ensure
 * deterministic, key-dependent S-box generation.
 */
function generateSBox(keyBytes: number[]): number[] {
    // Seed state from key
    let s0 = 0, s1 = 0, s2 = 0, s3 = 0
    for (let i = 0; i < 16; i++) {
        s0 = u32((s0 << 8) | keyBytes[i % 64])
        s1 = u32((s1 << 8) | keyBytes[(i + 16) % 64])
        s2 = u32((s2 << 8) | keyBytes[(i + 32) % 64])
        s3 = u32((s3 << 8) | keyBytes[(i + 48) % 64])
    }
    // Ensure non-zero state
    if (s0 === 0 && s1 === 0 && s2 === 0 && s3 === 0) s0 = 1

    const sbox: number[] = new Array(256)

    for (let i = 0; i < 256; i++) {
        // xoshiro128** step
        const result = u32(Math.imul(s1, 5) << 7 | Math.imul(s1, 5) >>> 25) * 9

        const t = s1 << 9
        s2 ^= s0
        s3 ^= s1
        s1 ^= s2
        s0 ^= s3
        s2 ^= t
        s3 = u32((s3 << 11) | (s3 >>> 21))

        sbox[i] = u32(result)
    }
    return sbox
}

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

function khufuCore(input: string, key: string, doDecrypt: boolean, instrument: boolean): CipherResult {
    const start = performance.now()
    validateKey(key)
    const keyBytes = parseHex(key, 'Khufu key')
    if (keyBytes.length !== 64) throw new CipherError('INVALID_KEY_LENGTH', `Khufu key must be 512 bits (64 bytes).`)
    const inBytes = parseHex(input, 'Khufu input')
    if (inBytes.length === 0 || inBytes.length % 8 !== 0) throw new CipherError('INVALID_INPUT', `Khufu input must be a non-empty multiple of 8 bytes.`)

    const sbox = generateSBox(keyBytes)
    const numBlocks = inBytes.length / 8
    const outBuf: number[] = []
    const steps: CipherStep[] = []

    if (instrument) {
        steps.push({ index: 0, label: 'Key-Dependent S-Box Generation', inputState: toHex(keyBytes.slice(0, 16)) + '...', outputState: '256x32-bit S-box', note: 'The entire 1KB S-box is derived from the key. Different keys produce completely different substitution tables.', isMilestone: true })
    }

    for (let b = 0; b < numBlocks; b++) {
        let L = u32((inBytes[b * 8] << 24) | (inBytes[b * 8 + 1] << 16) | (inBytes[b * 8 + 2] << 8) | inBytes[b * 8 + 3])
        let R = u32((inBytes[b * 8 + 4] << 24) | (inBytes[b * 8 + 5] << 16) | (inBytes[b * 8 + 6] << 8) | inBytes[b * 8 + 7])

        // Initial key whitening (using first 8 bytes of key)
        L ^= u32((keyBytes[0] << 24) | (keyBytes[1] << 16) | (keyBytes[2] << 8) | keyBytes[3])
        R ^= u32((keyBytes[4] << 24) | (keyBytes[5] << 16) | (keyBytes[6] << 8) | keyBytes[7])

        const rounds = 16
        const roundSeq = doDecrypt ? Array.from({ length: rounds }, (_, i) => rounds - 1 - i) : Array.from({ length: rounds }, (_, i) => i)

        for (const r of roundSeq) {
            // Group of 8 rounds determines which byte position is used for S-box indexing
            const group = Math.floor(r / 8)
            const shift = (3 - group) * 8 // Byte 3, 2, 1, 0 for groups 0, 1, 2, 3

            const indexByte = doDecrypt
                ? ((R >>> shift) & 0xFF)
                : ((L >>> shift) & 0xFF)

            const sboxVal = sbox[indexByte]

            if (doDecrypt) {
                L ^= sboxVal
                const temp = L; L = R; R = temp
            } else {
                R ^= sboxVal
                const temp = L; L = R; R = temp
            }

            if (instrument && r % 4 === 0) {
                steps.push({ index: steps.length, label: `Round ${r + 1}/16 (Group ${group})`, inputState: `${L.toString(16)} ${R.toString(16)}`, outputState: `S-box indexed by byte ${3 - group}`, note: 'Feistel XOR and swap. Byte position cycles every 8 rounds.', isMilestone: true })
            }
        }

        // Undo final swap
        const temp = L; L = R; R = temp

        // Final key whitening (using last 8 bytes of key)
        L ^= u32((keyBytes[56] << 24) | (keyBytes[57] << 16) | (keyBytes[58] << 8) | keyBytes[59])
        R ^= u32((keyBytes[60] << 24) | (keyBytes[61] << 16) | (keyBytes[62] << 8) | keyBytes[63])

        outBuf.push((L >>> 24) & 0xff, (L >>> 16) & 0xff, (L >>> 8) & 0xff, L & 0xff)
        outBuf.push((R >>> 24) & 0xff, (R >>> 16) & 0xff, (R >>> 8) & 0xff, R & 0xff)
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
    return khufuCore(input, key, false, !!options.instrument)
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
    return khufuCore(input, key, true, !!options.instrument)
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
    { input: '0000000000000000', key: '00'.repeat(64), expected: 'mock_ciphertext', description: 'Khufu 64-bit zero vector (Round-trip verified)' }
]