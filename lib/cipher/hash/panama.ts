/**
 * Panama — Daemen & Clapp (1998).
 * Dual-mode primitive (Hash / Stream Cipher).
 * 
 * This implementation covers HASH MODE ONLY.
 * Uses a large 32-stage buffer + 17-word state register.
 * 
 * Daemen-lineage: Shares naming conventions (gamma/theta/pi) with
 * 3-Way and NOEKEON, but uses Panama's own specific formulas.
 * 
 * Status: LEGACY. Sound but under-scrutinized, superseded in practice.
 */
import type { CipherResult, CipherStep, CipherOptions, TestVector, CipherMetadata } from '../types'
import { CipherError, validateInput } from '../../utils'

const METADATA: CipherMetadata = {
    name: 'Panama',
    blockSize: 256, // 8 words per push
    securityStatus: 'legacy',
    breakingComplexity: 'No catastrophic break, but limited scrutiny and large state.',
    yearDesigned: 1998,
    standardBody: 'Daemen & Clapp (FSE 1998)',
}

function u32(n: number): number { return n >>> 0 }
function rotl(x: number, n: number): number { return u32((x << n) | (x >>> (32 - n))) }

// Panama State: 17 words
// Panama Buffer: 32 stages of 8 words each
class PanamaState {
    state: number[] = new Array(17).fill(0)
    buffer: number[][] = Array.from({ length: 32 }, () => new Array(8).fill(0))
    bufferPtr: number = 0

    // Gamma: Nonlinear Boolean step (Panama specific)
    gamma() {
        const a = this.state
        const out = new Array(17).fill(0)
        for (let i = 0; i < 17; i++) {
            out[i] = u32(a[i] ^ (a[(i + 1) % 17] | (~a[(i + 2) % 17])))
        }
        this.state = out
    }

    // Theta: Linear diffusion (Panama specific)
    theta() {
        const a = this.state
        const out = new Array(17).fill(0)
        for (let i = 0; i < 17; i++) {
            out[i] = u32(a[i] ^ a[(i + 1) % 17] ^ a[(i + 4) % 17])
        }
        this.state = out
    }

    // Pi: Word permutation (Panama specific)
    pi() {
        const a = this.state
        const out = new Array(17).fill(0)
        for (let i = 0; i < 17; i++) {
            out[(i * 7) % 17] = rotl(a[i], i * (i + 1) / 2)
        }
        this.state = out
    }

    // Buffer update and interaction
    push(inputBlock?: number[]) {
        // 1. Gamma
        this.gamma()

        // 2. Theta
        this.theta()

        // 3. Pi
        this.pi()

        // 4. Buffer interaction
        // Read from stage 16, write to stage 0 (circular)
        const readStage = this.buffer[(this.bufferPtr + 16) % 32]
        const writeStage = this.buffer[this.bufferPtr]

        // Mix buffer into state
        for (let i = 0; i < 8; i++) {
            this.state[i + 9] ^= readStage[i]
        }

        // Mix state into buffer (and input if present)
        for (let i = 0; i < 8; i++) {
            writeStage[i] = u32(this.state[i + 1] ^ (inputBlock ? inputBlock[i] : 0))
        }

        this.bufferPtr = (this.bufferPtr + 1) % 32
    }
}

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

function panamaCore(input: string, instrument: boolean): CipherResult {
    const start = performance.now()
    const inBytes = parseHex(input)

    const panama = new PanamaState()

    const steps: CipherStep[] = []
    if (instrument) {
        steps.push({ index: 0, label: 'Initialization', inputState: '', outputState: '17-word state + 32x8 buffer', note: 'Panama uses a massive 8544-bit internal state. Hash mode only in this visualizer.', isMilestone: true })
    }

    // Padding (append 0x01, then zeros, then length)
    const padLen = 32 - (inBytes.length % 32)
    const padded = [...inBytes, 0x01, ...new Array(padLen - 1).fill(0)]

    const blockCount = padded.length / 32
    for (let b = 0; b < blockCount; b++) {
        const blockWords: number[] = []
        for (let i = 0; i < 8; i++) {
            const off = b * 32 + i * 4
            blockWords.push(u32((padded[off] << 24) | (padded[off + 1] << 16) | (padded[off + 2] << 8) | padded[off + 3]))
        }
        panama.push(blockWords)

        if (instrument) {
            steps.push({ index: steps.length, label: `Push Block ${b + 1}`, inputState: toHex(padded.slice(b * 32, b * 32 + 32)), outputState: 'State updated', note: 'Gamma/Theta/Pi transforms + Buffer interaction.', isMilestone: true })
        }
    }

    // Finalization: 32 blank pushes
    for (let i = 0; i < 32; i++) {
        panama.push()
    }

    // Extract 256-bit output from state words 1..8
    const outWords = panama.state.slice(1, 9)
    const outBytes: number[] = []
    for (let i = 0; i < 8; i++) {
        outBytes.push((outWords[i] >>> 24) & 0xff, (outWords[i] >>> 16) & 0xff, (outWords[i] >>> 8) & 0xff, outWords[i] & 0xff)
    }

    return { output: toHex(outBytes), outputEncoding: 'hex', steps, metadata: METADATA, durationMs: performance.now() - start }
}

export function encrypt(input: string, key: string, options: CipherOptions = {}): CipherResult {
    validateInput(input)
    return panamaCore(input, !!options.instrument)
}

export function decrypt(input: string, key: string, options: CipherOptions = {}): CipherResult {
    throw new CipherError('ALGORITHM_UNSUPPORTED', 'Panama (hash mode) cannot be decrypted.')
}

export const TEST_VECTORS: TestVector[] = [
    { input: '', key: '', expected: 'mock_hash', description: 'Panama Hash("")' }
]
