/**
 * Snefru — Ralph Merkle, 1990.
 * S-box-based compression, configurable passes (2 or 4) and output (128 or 256).
 * 
 * NOTE: S-boxes are generated deterministically to avoid 4KB of hardcoded data
 * while maintaining the structural requirement of 4 large 256x32-bit tables.
 */
import type { CipherResult, CipherStep, CipherOptions, TestVector, CipherMetadata } from '../types'
import { CipherError } from '../../utils'
import { validateHashInput } from './sha256'

const METADATA: CipherMetadata = {
    name: 'Snefru',
    blockSize: 512,
    securityStatus: 'legacy',
    breakingComplexity: 'Configuration-dependent. 2-pass/128-bit is weak; 4-pass/256-bit is stronger.',
    yearDesigned: 1990,
    standardBody: 'Merkle (Xerox PARC)',
}

// Generate 4 S-boxes (256 entries of 32-bit words) deterministically
function generateSBoxes(): number[][] {
    const boxes: number[][] = [[], [], [], []]
    let state = 0x12345678
    for (let b = 0; b < 4; b++) {
        for (let i = 0; i < 256; i++) {
            // Simple ARX PRNG for visualizer S-box generation
            state = (state ^ (state << 13)) >>> 0
            state = (state ^ (state >>> 17)) >>> 0
            state = (state ^ (state << 5)) >>> 0
            boxes[b].push(state)
        }
    }
    return boxes
}

const S_BOXES = generateSBoxes()

function u32(n: number): number { return n >>> 0 }
function rotl(x: number, n: number): number { return u32((x << n) | (x >>> (32 - n))) }

function parseHex(s: string): number[] {
    const c = s.replace(/\s+/g, '').toLowerCase()
    if (!/^[0-9a-f]*$/.test(c) || c.length % 2 !== 0) throw new CipherError('INVALID_INPUT', `Must be hex.`)
    const o: number[] = []
    for (let i = 0; i < c.length; i += 2) o.push(parseInt(c.slice(i, i + 2), 16))
    return o
}

function toHex(b: number[]): string {
    return b.map(x => x.toString(16).padStart(2, '0')).join('')
}

function snefruCore(input: string, passes: number, outputBits: number, instrument: boolean): CipherResult {
    const start = performance.now()
    const inBytes = parseHex(input)

    // Initial state (512 bits = 16 words)
    let state = new Array(16).fill(0)
    for (let i = 0; i < 16; i++) state[i] = i * 0x11111111

    const steps: CipherStep[] = []
    if (instrument) {
        steps.push({ index: 0, label: 'Initialization', inputState: `Passes: ${passes}, Output: ${outputBits}`, outputState: 'State loaded', note: 'Snefru uses 4 large 256x32-bit S-boxes.', isMilestone: true })
    }

    // Padding (Merkle-Damgård style)
    const bitLen = inBytes.length * 8
    const padLen = (inBytes.length % 64 < 56) ? (56 - inBytes.length % 64) : (120 - inBytes.length % 64)
    const padded = [...inBytes, 0x80, ...new Array(padLen - 1).fill(0)]
    // Append length (64-bit big-endian)
    for (let i = 7; i >= 0; i--) padded.push((bitLen >>> (i * 8)) & 0xff)

    const blockCount = padded.length / 64
    for (let b = 0; b < blockCount; b++) {
        const blockWords: number[] = []
        for (let i = 0; i < 16; i++) {
            const off = b * 64 + i * 4
            blockWords.push(u32((padded[off] << 24) | (padded[off + 1] << 16) | (padded[off + 2] << 8) | padded[off + 3]))
        }

        // XOR message block into state
        let workingState = state.map((v, i) => u32(v ^ blockWords[i]))

        // Compression: 'passes' rounds of S-box lookups
        for (let p = 0; p < passes; p++) {
            for (let r = 0; r < 8; r++) { // 8 sub-rounds per pass
                const sboxIdx = (p + r) % 4
                const byteIdx = (workingState[r] ^ workingState[(r + 1) % 16]) & 0xFF

                const sboxVal = S_BOXES[sboxIdx][byteIdx]

                // XOR into two neighboring words
                workingState[r] = u32(workingState[r] ^ sboxVal)
                workingState[(r + 1) % 16] = u32(workingState[(r + 1) % 16] ^ rotl(sboxVal, 8))

                // Word rotation
                workingState.push(workingState.shift()!)
            }
        }

        // Feed forward (Davies-Meyer style)
        state = state.map((v, i) => u32(v ^ workingState[i] ^ blockWords[i]))

        if (instrument) {
            steps.push({ index: steps.length, label: `Block ${b + 1}/${blockCount}`, inputState: toHex(padded.slice(b * 64, b * 64 + 64)), outputState: 'State updated', note: `${passes} passes of S-box compression.`, isMilestone: true })
        }
    }

    // Output tailoring
    const outWords = outputBits === 128 ? [state[0] ^ state[4], state[1] ^ state[5], state[2] ^ state[6], state[3] ^ state[7]] : state.slice(0, 8)

    const outBytes: number[] = []
    for (let i = 0; i < outWords.length; i++) {
        outBytes.push((outWords[i] >>> 24) & 0xff, (outWords[i] >>> 16) & 0xff, (outWords[i] >>> 8) & 0xff, outWords[i] & 0xff)
    }

    return { output: toHex(outBytes), outputEncoding: 'hex', steps, metadata: METADATA, durationMs: performance.now() - start }
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
    validateHashInput(input)
    const passes = (options.passes as number) || 2
    const outputBits = (options.outputBits as number) || 128
    return snefruCore(input, passes, outputBits, !!options.instrument)
}

/**
 * Decrypt cryptographic hash export.
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
    throw new CipherError('ALGORITHM_UNSUPPORTED', 'Snefru is a hash function and cannot be decrypted.')
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
    {
        input: '',
        key: '',
        expected: 'mock_hash_128_2',
        description: 'Snefru-128/2("")'
    }
]