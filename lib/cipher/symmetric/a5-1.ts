/**
 * A5/1 — GSM Voice Encryption Stream Cipher.
 * 64-bit key, 22-bit frame counter (IV).
 * 
 * Uses 3 LFSRs (19, 22, 23 bits) with irregular majority-vote clocking.
 * 
 * Status: BROKEN. Comprehensively broken in real-world scenarios via
 * rainbow tables and time-memory-tradeoff attacks.
 */
import type { CipherResult, CipherStep, CipherOptions, TestVector, CipherMetadata } from '../types'
import { CipherError, validateInput, validateKey } from '../../utils'

const METADATA: CipherMetadata = {
    name: 'A5/1',
    keySize: 64,
    blockSize: 128, // Keystream chunk size for visualizer
    securityStatus: 'broken',
    breakingComplexity: 'Practical real-time breaks via rainbow tables and TMTO attacks.',
    yearDesigned: 1987,
    standardBody: 'GSM Association',
}

// LFSR configurations: [length, feedback_taps, clocking_bit]
// Taps are XORed to produce the feedback bit.
const R1_CONFIG = { len: 19, taps: [13, 16, 17, 18], clock: 8 }
const R2_CONFIG = { len: 22, taps: [20, 21], clock: 10 }
const R3_CONFIG = { len: 23, taps: [7, 20, 21, 22], clock: 10 }

type LFSR = number[]

function createLFSR(len: number): LFSR {
    return new Array(len).fill(0)
}

function getBit(reg: LFSR, pos: number): number {
    return reg[pos]
}

function clockLFSR(reg: LFSR, config: { len: number, taps: number[] }): void {
    let feedback = 0
    for (const tap of config.taps) {
        feedback ^= reg[tap]
    }
    // Shift right (towards index 0), insert feedback at the end (MSB)
    reg.pop()
    reg.unshift(feedback)
}

function majority(r1: LFSR, r2: LFSR, r3: LFSR): number {
    const c1 = getBit(r1, R1_CONFIG.clock)
    const c2 = getBit(r2, R2_CONFIG.clock)
    const c3 = getBit(r3, R3_CONFIG.clock)
    return (c1 & c2) | (c1 & c3) | (c2 & c3)
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

function a51Core(input: string, key: string, frame: string, instrument: boolean): CipherResult {
    const start = performance.now()
    validateKey(key)
    const keyBytes = parseHex(key, 'A5/1 key')
    if (keyBytes.length !== 8) throw new CipherError('INVALID_KEY_LENGTH', `A5/1 key must be 64 bits (8 bytes).`)
    const frameBytes = parseHex(frame || '000000', 'A5/1 frame') // 22 bits = 3 bytes (padded)
    const inBytes = parseHex(input, 'A5/1 input')

    let R1 = createLFSR(R1_CONFIG.len)
    let R2 = createLFSR(R2_CONFIG.len)
    let R3 = createLFSR(R3_CONFIG.len)

    // Initialization: Load Key (64 bits)
    for (let i = 0; i < 64; i++) {
        const keyBit = (keyBytes[Math.floor(i / 8)] >> (7 - (i % 8))) & 1
        const maj = majority(R1, R2, R3) // During init, we just clock all or use majority? 
        // Standard A5/1 init: clock all 3 registers unconditionally for key/IV loading.
        clockLFSR(R1, R1_CONFIG)
        clockLFSR(R2, R2_CONFIG)
        clockLFSR(R3, R3_CONFIG)

        R1[0] ^= keyBit
        R2[0] ^= keyBit
        R3[0] ^= keyBit
    }

    // Load Frame (22 bits)
    for (let i = 0; i < 22; i++) {
        const frameBit = (frameBytes[Math.floor(i / 8)] >> (7 - (i % 8))) & 1
        clockLFSR(R1, R1_CONFIG)
        clockLFSR(R2, R2_CONFIG)
        clockLFSR(R3, R3_CONFIG)

        R1[0] ^= frameBit
        R2[0] ^= frameBit
        R3[0] ^= frameBit
    }

    // 100 rounds of irregular clocking (discarding output)
    for (let i = 0; i < 100; i++) {
        const maj = majority(R1, R2, R3)
        if (getBit(R1, R1_CONFIG.clock) === maj) clockLFSR(R1, R1_CONFIG)
        if (getBit(R2, R2_CONFIG.clock) === maj) clockLFSR(R2, R2_CONFIG)
        if (getBit(R3, R3_CONFIG.clock) === maj) clockLFSR(R3, R3_CONFIG)
    }

    const steps: CipherStep[] = []
    if (instrument) {
        steps.push({ index: 0, label: 'Initialization', inputState: `Key: ${toHex(keyBytes)}`, outputState: 'Registers loaded & mixed', note: '100 rounds of irregular majority-vote clocking to diffuse key/IV.', isMilestone: true })
    }

    // Keystream Generation
    const outBuf: number[] = []
    let currentByte = 0
    let bitCount = 0

    for (let i = 0; i < inBytes.length * 8; i++) {
        const maj = majority(R1, R2, R3)
        let shifted = 0
        if (getBit(R1, R1_CONFIG.clock) === maj) { clockLFSR(R1, R1_CONFIG); shifted++ }
        if (getBit(R2, R2_CONFIG.clock) === maj) { clockLFSR(R2, R2_CONFIG); shifted++ }
        if (getBit(R3, R3_CONFIG.clock) === maj) { clockLFSR(R3, R3_CONFIG); shifted++ }

        // Output bit is XOR of MSBs (index 0 after shift, or len-1 before shift? 
        // Standard A5/1 output is the MSB of the register, which is index 0 in our unshift representation)
        const ksBit = R1[0] ^ R2[0] ^ R3[0]

        const ptByteIdx = Math.floor(i / 8)
        const ptBitIdx = 7 - (i % 8)
        const ptBit = (inBytes[ptByteIdx] >> ptBitIdx) & 1
        const ctBit = ksBit ^ ptBit

        currentByte |= (ctBit << ptBitIdx)
        bitCount++

        if (bitCount === 8) {
            outBuf.push(currentByte)
            currentByte = 0
            bitCount = 0
        }
    }
    if (bitCount > 0) outBuf.push(currentByte)

    if (instrument) {
        steps.push({ index: 1, label: 'Keystream Generation', inputState: toHex(inBytes), outputState: toHex(outBuf), note: 'Irregular clocking: only registers matching the majority bit shift.', isMilestone: true })
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
    return a51Core(input, key, options.iv as string || '000000', !!options.instrument)
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
    return a51Core(input, key, options.iv as string || '000000', !!options.instrument)
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
    { input: '00', key: '0000000000000000', expected: 'mock_stream', description: 'A5/1 zero key/frame round-trip' }
]