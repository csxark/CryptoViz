/**
 * SIMD — SHA-3 Finalist (Peyrin, Gilbert, Muller, Robshaw, 2008)
 * Quasi-cyclic LDPC message expansion over Z/257Z.
 * 4-pipe ARX compression. SIMD-256 / SIMD-512 variants.
 */
import type { CipherResult, CipherStep, CipherOptions, TestVector, CipherMetadata } from '../types'
import { CipherError } from '../../utils/errors'

const METADATA: CipherMetadata = {
    name: 'SIMD',
    blockSize: 512,
    securityStatus: 'legacy',
    breakingComplexity: 'SHA-3 finalist. Algebraically interesting LDPC expansion. Not standardized.',
    yearDesigned: 2008,
    standardBody: 'NIST SHA-3 Competition',
}

// Quasi-cyclic first row for SIMD-256 (128 elements in Z/257Z)
// Simplified representative values for visualizer structure
const Q_FIRST_ROW = new Array(128).fill(0).map((_, i) => (i * 3 + 1) % 257)

function u32(n: number): number { return n >>> 0 }
function rotl(x: number, n: number): number { return u32((x << n) | (x >>> (32 - n))) }

function parseHex(s: string, lbl: string): number[] {
    const c = s.replace(/\s+/g, '').toLowerCase()
    if (!/^[0-9a-f]*$/.test(c) || c.length % 2 !== 0) throw new CipherError('INVALID_INPUT', `${lbl} must be hex.`)
    const o: number[] = []
    for (let i = 0; i < c.length; i += 2) o.push(parseInt(c.slice(i, i + 2), 16))
    return o
}
function toHex(b: number[]): string { return b.map(x => x.toString(16).padStart(2, '0')).join('') }

function simdCore(input: string, outputBits: number, instrument: boolean): CipherResult {
    const start = performance.now()
    const inBytes = parseHex(input, 'SIMD input')

    const is512 = outputBits > 256
    const blockSize = is512 ? 128 : 64

    // 4 pipes of 4 words = 16 words state
    let state = new Array(16).fill(0).map((_, i) => u32(i + outputBits))

    // Padding
    const padded = [...inBytes, 0x80]
    while (padded.length % blockSize !== (blockSize - 8)) padded.push(0)
    const bitLen = BigInt(inBytes.length * 8)
    for (let i = 7; i >= 0; i--) padded.push(Number((bitLen >> BigInt(i * 8)) & 0xFFn))

    const steps: CipherStep[] = []

    for (let b = 0; b < padded.length; b += blockSize) {
        const block = padded.slice(b, b + blockSize)

        // Message expansion over Z/257Z
        const W = new Array(128).fill(0)
        for (let i = 0; i < 128; i++) {
            let sum = 0
            for (let j = 0; j < 16; j++) {
                const mVal = block[j] === 0 ? 256 : block[j] // Bijection 0x00 <-> 256
                sum += Q_FIRST_ROW[(i + j) % 128] * mVal
            }
            let w = sum % 257
            if (w > 128) w -= 257 // Center in [-128, +127]
            W[i] = w & 0xFF // Truncate to 8 bits for compression
        }

        // 4-pipe ARX compression (32 steps)
        for (let s = 0; s < 32; s++) {
            // AddConst, RotateWords, AddWords, Mix (simplified representation)
            for (let p = 0; p < 4; p++) {
                state[4 * p] = u32(state[4 * p] + W[s * 4 + p] + s)
                state[4 * p] = rotl(state[4 * p], 7)
            }
            // Mix butterfly (simplified cross-pipe diffusion)
            const tmp = [...state]
            for (let p = 0; p < 4; p++) {
                state[p] = u32(tmp[p] ^ tmp[4 + p] ^ tmp[8 + p] ^ tmp[12 + p])
            }
        }

        if (instrument && b % blockSize === 0) {
            steps.push({
                index: steps.length,
                label: `SIMD-${outputBits} Block ${Math.floor(b / blockSize) + 1}`,
                inputState: toHex(block),
                outputState: toHex(state.map(v => v & 0xFF).slice(0, 16)),
                note: `Quasi-cyclic LDPC expansion over Z/257Z. 4-pipe ARX compression.`,
                isMilestone: true
            })
        }
    }

    const outLen = outputBits / 8
    return { output: toHex(state.map(v => v & 0xFF).slice(0, outLen)), outputEncoding: 'hex', steps, metadata: METADATA, durationMs: performance.now() - start }
}

export function encrypt(input: string, key: string, options: CipherOptions = {}): CipherResult {
    const bits = (options.outputBits as number) || 256
    return simdCore(input, bits, !!options.instrument)
}
export function decrypt(): CipherResult {
    throw new CipherError('ONE_WAY_HASH', 'SIMD is a one-way hash function.')
}

export const TEST_VECTORS: TestVector[] = [
    { input: '', key: '', expected: 'mock_simd_256_empty', description: 'SIMD-256 empty string' }
]
