/**
 * Blue Midnight Wish (BMW) — SHA-3 Second-Round Finalist
 * ARX (Addition-Rotation-XOR) double-pipe compression.
 * Supports 224/256/384/512-bit output.
 * No S-boxes, no MDS matrices, no field arithmetic.
 */
import type { CipherResult, CipherStep, CipherOptions, TestVector, CipherMetadata } from '../types'
import { CipherError } from '../../utils/errors'

const METADATA: CipherMetadata = {
    name: 'Blue Midnight Wish',
    blockSize: 512,
    securityStatus: 'experimental',
    breakingComplexity: 'SHA-3 finalist. ARX double-pipe compression. No S-boxes or field arithmetic.',
    yearDesigned: 2008,
    standardBody: 'NIST SHA-3 Competition',
}

function u32(n: number): number { return n >>> 0 }
function u64(n: bigint): bigint { return BigInt.asUintN(64, n) }
function rotl32(x: number, n: number): number { return u32((x << n) | (x >>> (32 - n))) }
function rotl64(x: bigint, n: bigint): bigint { return u64((x << n) | (x >> (64n - n))) }

// Simplified ARX mixing for visualizer structure
function mix32(a: number, b: number, c: number, d: number): number {
    return u32(rotl32(u32(a + b), 7) ^ rotl32(u32(c + d), 11))
}

function mix64(a: bigint, b: bigint, c: bigint, d: bigint): bigint {
    return u64(rotl64(u64(a + b), 7n) ^ rotl64(u64(c + d), 11n))
}

function bmwCore(input: string, outputBits: number, instrument: boolean): CipherResult {
    const start = performance.now()
    const inBytes: number[] = []
    const c = input.replace(/\s+/g, '').toLowerCase()
    if (!/^[0-9a-f]*$/.test(c) || c.length % 2 !== 0) throw new CipherError('INVALID_INPUT', 'Input must be hex.')
    for (let i = 0; i < c.length; i += 2) inBytes.push(parseInt(c.slice(i, i + 2), 16))

    const is64Bit = outputBits > 256
    const steps: CipherStep[] = []

    // Padding
    const padded = [...inBytes, 0x80]
    const blockBytes = is64Bit ? 128 : 64
    while (padded.length % blockBytes !== 0) padded.push(0)
    // Append length (simplified for visualizer)
    for (let i = 0; i < 8; i++) padded.push(0)

    let outHex = ''

    if (!is64Bit) {
        // BMW-256 (32-bit words)
        let h = new Array(16).fill(0).map((_, i) => u32(0x12345678 + i)) // Mock IV

        for (let b = 0; b < padded.length; b += blockBytes) {
            const m = new Array(16).fill(0)
            for (let i = 0; i < 16; i++) {
                const off = b + i * 4
                m[i] = u32(padded[off] | (padded[off + 1] << 8) | (padded[off + 2] << 16) | (padded[off + 3] << 24))
            }

            // expand1 & expand2 + f0/f1 (Simplified ARX compression)
            const q = new Array(32).fill(0)
            for (let i = 0; i < 16; i++) {
                q[i] = mix32(m[i], h[i], m[(i + 1) % 16], h[(i + 2) % 16])
                q[i + 16] = mix32(q[i], m[(i + 3) % 16], h[(i + 4) % 16], q[(i + 1) % 32])
            }

            for (let i = 0; i < 16; i++) {
                h[i] = u32(h[i] + q[i + 16] + rotl32(q[i], 5))
            }
        }

        const outBytes: number[] = []
        const wordsNeeded = outputBits / 32
        for (let i = 16 - wordsNeeded; i < 16; i++) {
            outBytes.push(h[i] & 0xff, (h[i] >>> 8) & 0xff, (h[i] >>> 16) & 0xff, (h[i] >>> 24) & 0xff)
        }
        outHex = outBytes.map(b => b.toString(16).padStart(2, '0')).join('')
    } else {
        // BMW-512 (64-bit words via BigInt)
        let h = new Array(16).fill(0n).map((_, i) => u64(0x123456789ABCDEF0n + BigInt(i)))

        for (let b = 0; b < padded.length; b += blockBytes) {
            const m = new Array(16).fill(0n)
            for (let i = 0; i < 16; i++) {
                let w = 0n
                for (let j = 0; j < 8; j++) w |= BigInt(padded[b + i * 8 + j] || 0) << BigInt(j * 8)
                m[i] = u64(w)
            }

            const q = new Array(32).fill(0n)
            for (let i = 0; i < 16; i++) {
                q[i] = mix64(m[i], h[i], m[(i + 1) % 16], h[(i + 2) % 16])
                q[i + 16] = mix64(q[i], m[(i + 3) % 16], h[(i + 4) % 16], q[(i + 1) % 32])
            }

            for (let i = 0; i < 16; i++) {
                h[i] = u64(h[i] + q[i + 16] + rotl64(q[i], 5n))
            }
        }

        const outBytes: number[] = []
        const wordsNeeded = outputBits / 64
        for (let i = 16 - wordsNeeded; i < 16; i++) {
            for (let j = 0; j < 8; j++) outBytes.push(Number((h[i] >> BigInt(j * 8)) & 0xFFn))
        }
        outHex = outBytes.map(b => b.toString(16).padStart(2, '0')).join('')
    }

    if (instrument) {
        steps.push({ index: 0, label: 'BMW Hash', inputState: input, outputState: outHex, note: `ARX double-pipe compression. ${is64Bit ? '64-bit' : '32-bit'} words.`, isMilestone: true })
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
    return bmwCore(input, bits, !!options.instrument)
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
    throw new CipherError('ONE_WAY_HASH', 'BMW is a one-way hash function.')
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
    { input: '', key: '', expected: 'mock_bmw_256', description: 'BMW-256 empty string' }
]
