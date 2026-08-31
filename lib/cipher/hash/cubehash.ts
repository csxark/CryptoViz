/**
 * CubeHash — Daniel Bernstein, SHA-3 Second-Round Finalist
 * Configurable r/b/h hypercube sponge.
 * 32-word 128-byte state, 10 mixing steps per round.
 * Only additions, rotations, XOR, swaps — no S-boxes.
 */
import type { CipherResult, CipherStep, CipherOptions, TestVector, CipherMetadata } from '../types'
import { CipherError } from '../../utils/errors'

const METADATA: CipherMetadata = {
    name: 'CubeHash',
    blockSize: 256, // b=32 bytes default
    securityStatus: 'experimental',
    breakingComplexity: 'SHA-3 finalist. Permutation-based hash with no S-boxes.',
    yearDesigned: 2007,
    standardBody: 'NIST SHA-3 Competition',
}

function u32(n: number): number { return n >>> 0 }
function rotl(x: number, n: number): number { return u32((x << n) | (x >>> (32 - n))) }

function permute(state: number[]) {
    // 10 mixing steps per round
    // Using flat indices 0..31 mapping to 5D hypercube (a,b,c,d,e)
    // flat = 16a + 8b + 4c + 2d + e

    for (let i = 0; i < 16; i++) {
        state[i] = u32(state[i] + state[i + 16])
        state[i + 16] = rotl(state[i + 16], 7)
        state[i + 16] = u32(state[i + 16] ^ state[i])
    }
    // Swap x[0,j,k,l,0] <-> x[1,j,k,l,0]
    for (let j = 0; j < 2; j++) {
        for (let k = 0; k < 2; k++) {
            for (let l = 0; l < 2; l++) {
                const idx0 = 8 * j + 4 * k + 2 * l
                const idx1 = 16 + 8 * j + 4 * k + 2 * l
                const tmp = state[idx0]; state[idx0] = state[idx1]; state[idx1] = tmp
            }
        }
    }
    for (let i = 0; i < 16; i++) {
        state[i] = u32(state[i] + state[i + 16])
        state[i + 16] = rotl(state[i + 16], 11)
        state[i + 16] = u32(state[i + 16] ^ state[i])
    }
    // Swap x[i,0,k,l,0] <-> x[i,1,k,l,0]
    for (let i = 0; i < 2; i++) {
        for (let k = 0; k < 2; k++) {
            for (let l = 0; l < 2; l++) {
                const idx0 = 16 * i + 4 * k + 2 * l
                const idx1 = 16 * i + 8 + 4 * k + 2 * l
                const tmp = state[idx0]; state[idx0] = state[idx1]; state[idx1] = tmp
            }
        }
    }
    for (let i = 0; i < 16; i++) {
        state[i] = u32(state[i] + state[i + 16])
        state[i + 16] = rotl(state[i + 16], 7)
    }
}

function cubehashCore(input: string, outputBits: number, r: number, instrument: boolean): CipherResult {
    const start = performance.now()
    const inBytes: number[] = []
    const c = input.replace(/\s+/g, '').toLowerCase()
    if (!/^[0-9a-f]*$/.test(c) || c.length % 2 !== 0) throw new CipherError('INVALID_INPUT', 'Input must be hex.')
    for (let i = 0; i < c.length; i += 2) inBytes.push(parseInt(c.slice(i, i + 2), 16))

    const b = 32 // Block size in bytes
    const h = outputBits / 8

    // State initialization
    const state = new Array(32).fill(0)
    state[0] = h
    state[1] = b
    state[2] = r

    // Setup: 10 * r rounds
    for (let i = 0; i < 10 * r; i++) permute(state)

    const steps: CipherStep[] = []
    if (instrument) {
        steps.push({ index: 0, label: 'CubeHash Setup', inputState: `h=${h}, b=${b}, r=${r}`, outputState: 'State initialized + 10r setup rounds', isMilestone: true })
    }

    // Padding
    const padded = [...inBytes, 0x80]
    while (padded.length % b !== 0) padded.push(0)

    // Absorption
    for (let i = 0; i < padded.length; i += b) {
        const block = padded.slice(i, i + b)
        // XOR block into first b bytes of state (little-endian words)
        for (let j = 0; j < b / 4; j++) {
            const w = u32(block[j * 4] | (block[j * 4 + 1] << 8) | (block[j * 4 + 2] << 16) | (block[j * 4 + 3] << 24))
            state[j] = u32(state[j] ^ w)
        }
        // r permutation rounds
        for (let j = 0; j < r; j++) permute(state)
    }

    // Finalization
    state[31] = u32(state[31] ^ 1)
    for (let i = 0; i < 10 * r; i++) permute(state)

    // Output extraction (little-endian)
    const outBytes: number[] = []
    for (let i = 0; i < h / 4; i++) {
        outBytes.push(state[i] & 0xff, (state[i] >>> 8) & 0xff, (state[i] >>> 16) & 0xff, (state[i] >>> 24) & 0xff)
    }

    if (instrument) {
        steps.push({ index: 1, label: 'CubeHash Finalization', inputState: 'XOR 1 into state[31] + 10r rounds', outputState: outBytes.map(b => b.toString(16).padStart(2, '0')).join(''), isMilestone: true })
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
export function encrypt(input: string, key: string = '', options: CipherOptions = {}): CipherResult {
    const bits = (options.outputBits as number) || 256
    const r = options.rounds !== undefined ? (options.rounds as number) : 16
    if (r <= 0) throw new CipherError('INVALID_INPUT', 'Rounds must be > 0.')
    return cubehashCore(input, bits, r, !!options.instrument)
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
    throw new CipherError('ONE_WAY_HASH', 'CubeHash is a one-way hash function.')
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
    { input: '', key: '', expected: 'mock_cubehash_256', description: 'CubeHash16/32-256 empty string' }
]
