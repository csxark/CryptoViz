/**
 * Luffa — NEC Europe, SHA-3 Second-Round Finalist
 * Multi-channel message queue sponge.
 * 3-5 parallel 256-bit chains, Q permutation (SubCrumb + MixWord).
 * Supports 224/256/384/512-bit output.
 */
import type { CipherResult, CipherStep, CipherOptions, TestVector, CipherMetadata } from '../types'
import { CipherError } from '../../utils/errors'

const METADATA: CipherMetadata = {
    name: 'Luffa',
    blockSize: 256,
    securityStatus: 'experimental',
    breakingComplexity: 'SHA-3 finalist. Multi-channel message queue sponge.',
    yearDesigned: 2008,
    standardBody: 'NIST SHA-3 Competition',
}

function u32(n: number): number { return n >>> 0 }
function rotl(x: number, n: number): number { return u32((x << n) | (x >>> (32 - n))) }

// SubCrumb S-box (applied to 4x32-bit words via bitwise operations)
function subCrumb(v: number[], offset: number) {
    const t = v[offset]
    v[offset] |= v[offset + 1]
    v[offset + 2] ^= v[offset + 3]
    v[offset + 1] = ~v[offset + 1]
    v[offset] ^= v[offset + 3]
    v[offset + 3] &= t
    v[offset + 1] ^= v[offset + 3]
    v[offset + 3] ^= v[offset + 2]
    v[offset + 2] &= v[offset]
    v[offset] = ~v[offset]
    v[offset + 2] ^= v[offset + 1]
    v[offset + 1] |= v[offset + 3]
    v[offset] ^= v[offset + 1]
    v[offset + 3] ^= v[offset + 2]
    v[offset + 2] &= v[offset + 1]
    v[offset + 1] ^= v[offset]
    v[offset] = t
}

function mixWord(v: number[], a: number, b: number) {
    v[b] ^= v[a]
    v[a] = rotl(v[a], 2) ^ v[b]
    v[b] = rotl(v[b], 14) ^ v[a]
    v[a] ^= rotl(v[b], 10)
    v[b] ^= rotl(v[a], 1)
}

function qPermutation(chain: number[]) {
    // 8 rounds of Q
    for (let r = 0; r < 8; r++) {
        // AddConstants (simplified for visualizer)
        chain[0] = u32(chain[0] ^ (r + 1))

        // SubCrumb on (v0,v1,v2,v3) and (v4,v5,v6,v7)
        subCrumb(chain, 0)
        subCrumb(chain, 4)

        // MixWord on pairs (v0,v4), (v1,v5), (v2,v6), (v3,v7)
        mixWord(chain, 0, 4)
        mixWord(chain, 1, 5)
        mixWord(chain, 2, 6)
        mixWord(chain, 3, 7)
    }
}

function luffaCore(input: string, outputBits: number, instrument: boolean): CipherResult {
    const start = performance.now()
    const inBytes: number[] = []
    const c = input.replace(/\s+/g, '').toLowerCase()
    if (!/^[0-9a-f]*$/.test(c) || c.length % 2 !== 0) throw new CipherError('INVALID_INPUT', 'Input must be hex.')
    for (let i = 0; i < c.length; i += 2) inBytes.push(parseInt(c.slice(i, i + 2), 16))

    const chains = outputBits <= 256 ? 3 : outputBits === 384 ? 4 : 5

    // Initialize chains (mock IVs for visualizer)
    const state: number[][] = Array.from({ length: chains }, () => new Array(8).fill(0))
    for (let j = 0; j < chains; j++) {
        for (let i = 0; i < 8; i++) state[j][i] = u32((j + 1) * 0x12345678 + i)
    }

    const steps: CipherStep[] = []

    // Padding
    const padded = [...inBytes, 0x80]
    while (padded.length % 32 !== 0) padded.push(0)

    // Absorption
    for (let i = 0; i < padded.length; i += 32) {
        const block: number[] = []
        for (let j = 0; j < 8; j++) {
            block.push(u32(padded[i + j * 4] | (padded[i + j * 4 + 1] << 8) | (padded[i + j * 4 + 2] << 16) | (padded[i + j * 4 + 3] << 24)))
        }

        // Message injection (Tweak + XOR) into all chains
        for (let j = 0; j < chains; j++) {
            for (let k = 0; k < 8; k++) {
                state[j][k] = u32(state[j][k] ^ block[(k + j) % 8]) // Staggered injection
            }
            qPermutation(state[j])
        }
    }

    // Finalization (Blank rounds)
    const blankRounds = outputBits <= 256 ? 8 : outputBits === 384 ? 16 : 32
    for (let r = 0; r < blankRounds; r++) {
        for (let j = 0; j < chains; j++) {
            qPermutation(state[j])
        }
    }

    // Output extraction
    const outWords: number[] = []
    const wordsNeeded = outputBits / 32
    for (let i = 0; i < wordsNeeded; i++) {
        outWords.push(state[i % chains][i % 8])
    }

    const outBytes: number[] = []
    for (const w of outWords) {
        outBytes.push(w & 0xff, (w >>> 8) & 0xff, (w >>> 16) & 0xff, (w >>> 24) & 0xff)
    }

    if (instrument) {
        steps.push({ index: 0, label: 'Luffa Hash', inputState: input, outputState: outBytes.map(b => b.toString(16).padStart(2, '0')).join(''), note: `${chains} chains, ${blankRounds} blank rounds.`, isMilestone: true })
    }

    return { output: outBytes.map(b => b.toString(16).padStart(2, '0')).join(''), outputEncoding: 'hex', steps, metadata: METADATA, durationMs: performance.now() - start }
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
    return luffaCore(input, bits, !!options.instrument)
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
    throw new CipherError('ONE_WAY_HASH', 'Luffa is a one-way hash function.')
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
    { input: '', key: '', expected: 'mock_luffa_256', description: 'Luffa-256 empty string' }
]
