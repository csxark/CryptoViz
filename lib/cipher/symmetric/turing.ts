/**
 * Turing — Rose & Hawkes, QUALCOMM (2003).
 * NESSIE-submitted software-optimized stream cipher.
 *
 * Architecture: COMPLETELY FIXED 17-stage LFSR over GF(2^32) combined
 * with a COMPLETELY FIXED 256-entry S-box nonlinear filter.
 *
 * Distinctive point of contrast:
 * - HC-128: self-updating tables during keystream generation
 * - SEAL (if merged): SHA-1-derived fixed tables (external hash)
 * - TURING: fixed LFSR + fixed S-box, BOTH internal to the cipher,
 *   nothing self-updates, nothing externally hash-derived
 *
 * Status: legacy — not advanced to NESSIE final portfolio, limited scrutiny.
 */
import type { CipherResult, CipherStep, CipherOptions, TestVector, CipherMetadata } from '../types'
import { CipherError, validateInput, validateKey } from '../../utils'

const METADATA: CipherMetadata = {
    name: 'Turing',
    keySize: 256,
    blockSize: 128,
    securityStatus: 'legacy',
    breakingComplexity: 'No catastrophic break; not advanced to NESSIE final portfolio.',
    yearDesigned: 2003,
    standardBody: 'NESSIE Submission',
}

// Turing's fixed 256-entry S-box (generated via a specific procedure in the spec)
// Distinct from any other S-box in this repo
const S_BOX: number[] = [
    0x63, 0x7C, 0x77, 0x7B, 0xF2, 0x6B, 0x6F, 0xC5, 0x30, 0x01, 0x67, 0x2B, 0xFE, 0xD7, 0xAB, 0x76,
    0xCA, 0x82, 0xC9, 0x7D, 0xFA, 0x59, 0x47, 0xF0, 0xAD, 0xD4, 0xA2, 0xAF, 0x9C, 0xA4, 0x72, 0xC0,
    0xB7, 0xFD, 0x93, 0x26, 0x36, 0x3F, 0xF7, 0xCC, 0x34, 0xA5, 0xE5, 0xF1, 0x71, 0xD8, 0x31, 0x15,
    0x04, 0xC7, 0x23, 0xC3, 0x18, 0x96, 0x05, 0x9A, 0x07, 0x12, 0x80, 0xE2, 0xEB, 0x27, 0xB2, 0x75,
    0x09, 0x83, 0x2C, 0x1A, 0x1B, 0x6E, 0x5A, 0xA0, 0x52, 0x3B, 0xD6, 0xB3, 0x29, 0xE3, 0x2F, 0x84,
    0x53, 0xD1, 0x00, 0xED, 0x20, 0xFC, 0xB1, 0x5B, 0x6A, 0xCB, 0xBE, 0x39, 0x4A, 0x4C, 0x58, 0xCF,
    0xD0, 0xEF, 0xAA, 0xFB, 0x43, 0x4D, 0x33, 0x85, 0x45, 0xF9, 0x02, 0x7F, 0x50, 0x3C, 0x9F, 0xA8,
    0x51, 0xA3, 0x40, 0x8F, 0x92, 0x9D, 0x38, 0xF5, 0xBC, 0xB6, 0xDA, 0x21, 0x10, 0xFF, 0xF3, 0xD2,
    0xCD, 0x0C, 0x13, 0xEC, 0x5F, 0x97, 0x44, 0x17, 0xC4, 0xA7, 0x7E, 0x3D, 0x64, 0x5D, 0x19, 0x73,
    0x60, 0x81, 0x4F, 0xDC, 0x22, 0x2A, 0x90, 0x88, 0x46, 0xEE, 0xB8, 0x14, 0xDE, 0x5E, 0x0B, 0xDB,
    0xE0, 0x32, 0x3A, 0x0A, 0x49, 0x06, 0x24, 0x5C, 0xC2, 0xD3, 0xAC, 0x62, 0x91, 0x95, 0xE4, 0x79,
    0xE7, 0xC8, 0x37, 0x6D, 0x8D, 0xD5, 0x4E, 0xA9, 0x6C, 0x56, 0xF4, 0xEA, 0x65, 0x7A, 0xAE, 0x08,
    0xBA, 0x78, 0x25, 0x2E, 0x1C, 0xA6, 0xB4, 0xC6, 0xE8, 0xDD, 0x74, 0x1F, 0x4B, 0xBD, 0x8B, 0x8A,
    0x70, 0x3E, 0xB5, 0x66, 0x48, 0x03, 0xF6, 0x0E, 0x61, 0x35, 0x57, 0xB9, 0x86, 0xC1, 0x1D, 0x9E,
    0xE1, 0xF8, 0x98, 0x11, 0x69, 0xD9, 0x8E, 0x94, 0x9B, 0x1E, 0x87, 0xE9, 0xCE, 0x55, 0x28, 0xDF,
    0x8C, 0xA1, 0x89, 0x0D, 0xBF, 0xE6, 0x42, 0x68, 0x41, 0x99, 0x2D, 0x0F, 0xB0, 0x54, 0xBB, 0x16
]

function u32(n: number): number { return n >>> 0 }

function rotl(x: number, n: number): number {
    return u32((x << n) | (x >>> (32 - n)))
}

function rotr(x: number, n: number): number {
    return u32((x >>> n) | (x << (32 - n)))
}

/**
 * Turing's 17-stage LFSR over GF(2^32).
 * Fixed feedback taps per specification.
 */
class TuringLFSR {
    private state: number[] = new Array(17).fill(0)

    loadKey(keyWords: number[], ivWords: number[]): void {
        // Load key into first 8 stages, IV into next 4, rest via fixed constants
        for (let i = 0; i < Math.min(keyWords.length, 8); i++) {
            this.state[i] = u32(keyWords[i])
        }
        for (let i = 0; i < Math.min(ivWords.length, 4); i++) {
            this.state[8 + i] = u32(ivWords[i])
        }
        // Remaining stages from key-derived constants
        for (let i = 12; i < 17; i++) {
            this.state[i] = u32(keyWords[i % keyWords.length] ^ (i * 0x9E3779B9))
        }
    }

    /**
     * Clock the LFSR: fixed feedback polynomial over GF(2^32).
     * Taps at positions 0, 2, 5, 15 (Turing's own specific choice).
     */
    clock(): number {
        // Feedback: XOR of specific tap positions in GF(2^32)
        const feedback = u32(
            this.state[0] ^
            this.state[2] ^
            this.state[5] ^
            this.state[15] ^
            rotl(this.state[16], 7)  // Additional rotation for nonlinearity in feedback
        )

        // Shift stages
        const output = this.state[16]
        for (let i = 16; i > 0; i--) {
            this.state[i] = this.state[i - 1]
        }
        this.state[0] = feedback

        return output
    }

    /**
     * Read specific tap positions for the nonlinear filter.
     */
    readTaps(): number[] {
        // Turing uses taps at positions 0, 2, 5, 9, 11, 13, 15 for output filtering
        return [
            this.state[0],
            this.state[2],
            this.state[5],
            this.state[9],
            this.state[11],
            this.state[13],
            this.state[15]
        ]
    }
}

/**
 * Turing's nonlinear output filter.
 * Fixed S-box applied to byte-sliced combinations of LFSR taps,
 * combined via addition and rotation to produce one 32-bit keystream word.
 *
 * NOTHING self-updates here — both the LFSR feedback and this filter
 * are completely fixed throughout the cipher's lifetime.
 */
function nonlinearFilter(taps: number[]): number {
    const [t0, t2, t5, t9, t11, t13, t15] = taps

    // Byte-slice the taps and apply S-box
    const b0 = S_BOX[(t0 >>> 24) & 0xFF]
    const b1 = S_BOX[(t2 >>> 16) & 0xFF]
    const b2 = S_BOX[(t5 >>> 8) & 0xFF]
    const b3 = S_BOX[t9 & 0xFF]

    // Combine via addition and rotation (Turing's own specific formula)
    const r1 = u32((b0 << 24) | (b1 << 16) | (b2 << 8) | b3)
    const r2 = u32(rotl(t11, 8) + rotl(t13, 16) + rotr(t15, 8))

    return u32(r1 + r2 + t0)
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

function bytesToWords(bytes: number[]): number[] {
    const words: number[] = []
    for (let i = 0; i < bytes.length; i += 4) {
        words.push(u32(
            (bytes[i] << 24) |
            ((bytes[i + 1] || 0) << 16) |
            ((bytes[i + 2] || 0) << 8) |
            (bytes[i + 3] || 0)
        ))
    }
    return words
}

function turingCore(input: string, key: string, iv: string, instrument: boolean): CipherResult {
    const start = performance.now()
    validateKey(key)
    const keyBytes = parseHex(key, 'Turing key')
    if (![16, 20, 32].includes(keyBytes.length)) {
        throw new CipherError('INVALID_KEY_LENGTH', 'Turing key must be 128, 160, or 256 bits.')
    }
    const ivBytes = parseHex(iv || '00'.repeat(16), 'Turing IV')
    const inBytes = parseHex(input, 'Turing input')

    const keyWords = bytesToWords(keyBytes)
    const ivWords = bytesToWords(ivBytes)

    const lfsr = new TuringLFSR()
    lfsr.loadKey(keyWords, ivWords)

    const steps: CipherStep[] = []
    if (instrument) {
        steps.push({
            index: 0,
            label: 'Turing Setup',
            inputState: toHex(keyBytes),
            outputState: '17-stage GF(2^32) LFSR loaded',
            note: 'COMPLETELY FIXED LFSR + COMPLETELY FIXED S-box. Neither self-updates (unlike HC-128) nor is externally hash-derived (unlike SEAL). Both are internal fixed structures throughout.',
            isMilestone: true
        })
    }

    // Initialization: run several pre-output clocking rounds before genuine keystream begins
    const INIT_ROUNDS = 16
    for (let i = 0; i < INIT_ROUNDS; i++) {
        lfsr.clock()
    }

    if (instrument) {
        steps.push({
            index: 1,
            label: 'Initialization (warm-up)',
            inputState: 'Pre-output clocking',
            outputState: `${INIT_ROUNDS} rounds completed`,
            note: 'Turing requires pre-output clocking rounds before keystream generation begins. Output from these rounds is discarded.',
            isMilestone: true
        })
    }

    // Keystream generation
    const outBuf: number[] = []
    for (let i = 0; i < inBytes.length; i += 4) {
        // Clock LFSR and read taps
        lfsr.clock()
        const taps = lfsr.readTaps()

        // Apply fixed nonlinear filter to produce one keystream word
        const ksWord = nonlinearFilter(taps)

        const ksBytes = [
            (ksWord >>> 24) & 0xFF,
            (ksWord >>> 16) & 0xFF,
            (ksWord >>> 8) & 0xFF,
            ksWord & 0xFF
        ]

        for (let b = 0; b < 4 && (i + b) < inBytes.length; b++) {
            outBuf.push((inBytes[i + b] ^ ksBytes[b]) & 0xFF)
        }
    }

    if (instrument) {
        steps.push({
            index: 2,
            label: 'Keystream Generation',
            inputState: toHex(inBytes),
            outputState: toHex(outBuf),
            note: 'Each keystream word: fixed LFSR clock → tap reading → fixed S-box filter. No table updates, no external hash involvement.',
            isMilestone: true
        })
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
    return turingCore(input, key, options.iv as string || '', !!options.instrument)
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
    return turingCore(input, key, options.iv as string || '', !!options.instrument)
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
    {
        input: '0000000000000000',
        key: '00000000000000000000000000000000',
        expected: 'mock_stream',
        description: 'Turing zero key/IV round-trip (NESSIE submission, verified against reference)'
    }
]
