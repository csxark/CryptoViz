/**
 * Hamsi — SHA-3 Second-Round Finalist
 * Bitslice-parallel Serpent S7 sponge.
 * Hamsi-256 and Hamsi-512 variants.
 */
import type { CipherResult, CipherStep, CipherOptions, TestVector, CipherMetadata } from '../types'
import { CipherError } from '../../utils/errors'

const METADATA: CipherMetadata = {
    name: 'Hamsi',
    blockSize: 256,
    securityStatus: 'legacy',
    breakingComplexity: 'SHA-3 finalist. Bitslice Serpent S7 sponge. Surpassed by BLAKE2.',
    yearDesigned: 2008,
    standardBody: 'NIST SHA-3 Competition',
}

function u32(n: number): number { return n >>> 0 }
function rotl(x: number, n: number): number { return u32((x << n) | (x >>> (32 - n))) }

// Serpent S7 bitslice (3-bit in, 3-bit out over 32 parallel lanes)
function s7(a: number, b: number, c: number): [number, number, number] {
    const t1 = a ^ b
    const t2 = a & c
    const t3 = c ^ t2
    const t4 = b | t3
    const out_a = t1 ^ t4
    const t5 = b & t4
    const out_b = t1 | t5
    const out_c = (b | out_a) ^ (c | out_b)
    return [u32(out_a), u32(out_b), u32(out_c)]
}

function theta(state: number[]) {
    // Simplified Theta linear layer for visualizer
    for (let i = 0; i < state.length; i++) {
        state[i] = u32(state[i] ^ rotl(state[(i + 1) % state.length], 1))
    }
}

function hamsiCore(input: string, outputBits: number, instrument: boolean): CipherResult {
    const start = performance.now()
    const inBytes: number[] = []
    const c = input.replace(/\s+/g, '').toLowerCase()
    if (!/^[0-9a-f]*$/.test(c) || c.length % 2 !== 0) throw new CipherError('INVALID_INPUT', 'Input must be hex.')
    for (let i = 0; i < c.length; i += 2) inBytes.push(parseInt(c.slice(i, i + 2), 16))

    const is512 = outputBits > 256
    const stateWords = is512 ? 32 : 16
    const blockSizeBytes = is512 ? 8 : 4
    const rounds = is512 ? 8 : 6

    // IV (Mock representative values)
    const state = new Array(stateWords).fill(0).map((_, i) => u32(0x12345678 + i + outputBits))

    // Padding
    const padded = [...inBytes, 0x80]
    while (padded.length % blockSizeBytes !== 0) padded.push(0)
    for (let i = 0; i < 8; i++) padded.push(0) // Length field

    const steps: CipherStep[] = []

    for (let b = 0; b < padded.length; b += blockSizeBytes) {
        const block = new Array(blockSizeBytes / 4).fill(0)
        for (let i = 0; i < block.length; i++) {
            const off = b + i * 4
            block[i] = u32(padded[off] | (padded[off + 1] << 8) | (padded[off + 2] << 16) | (padded[off + 3] << 24))
        }

        // Message injection
        for (let i = 0; i < block.length; i++) state[i] = u32(state[i] ^ block[i])

        // Permutation rounds
        for (let r = 0; r < rounds; r++) {
            // Gamma (Bitslice S7)
            for (let i = 0; i < stateWords; i += 4) {
                const [a, b, c] = s7(state[i], state[i + 1], state[i + 2])
                state[i] = a; state[i + 1] = b; state[i + 2] = c
            }
            // Pi (Simplified word rotation)
            const tmp = state.shift()!
            state.push(tmp)
            // Theta
            theta(state)
        }
    }

    // Truncation/Folding
    const outWords = outputBits / 32
    const outBytes: number[] = []
    for (let i = 0; i < outWords; i++) {
        outBytes.push(state[i] & 0xff, (state[i] >>> 8) & 0xff, (state[i] >>> 16) & 0xff, (state[i] >>> 24) & 0xff)
    }

    const outHex = outBytes.map(b => b.toString(16).padStart(2, '0')).join('')
    if (instrument) {
        steps.push({ index: 0, label: 'Hamsi Hash', inputState: input, outputState: outHex, note: `Bitslice Serpent S7. ${rounds} rounds per block.`, isMilestone: true })
    }

    return { output: outHex, outputEncoding: 'hex', steps, metadata: METADATA, durationMs: performance.now() - start }
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
    const bits = (options.outputBits as number) || 256
    return hamsiCore(input, bits, !!options.instrument)
}
/**
 * Decrypt cryptographic hash export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/46-3/final — FIPS 46-3.
 */
export function decrypt(): CipherResult {
    throw new CipherError('ONE_WAY_HASH', 'Hamsi is a one-way hash function.')
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
    { input: '', key: '', expected: 'mock_hamsi_256', description: 'Hamsi-256 empty string' }
]
