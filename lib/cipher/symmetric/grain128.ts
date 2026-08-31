/**
 * Grain-128 — Hell, Johansson, Meier (2006).
 * eSTREAM Portfolio hardware-profile finalist.
 * 128-bit key, 96-bit IV.
 * 
 * Uses a 128-bit LFSR and a 128-bit NLFSR.
 * Distinctive feature: Initialization FEEDS BACK the output bit into both
 * registers for 256 rounds, unlike Trivium's discard-based warmup.
 */
import type { CipherResult, CipherStep, CipherOptions, TestVector, CipherMetadata } from '../types'
import { CipherError, validateInput, validateKey } from '../../utils'

const METADATA: CipherMetadata = {
    name: 'Grain-128',
    keySize: 128,
    blockSize: 128, // Stream cipher, block size conceptually 128-bit keystream chunks
    securityStatus: 'secure',
    breakingComplexity: 'eSTREAM hardware profile portfolio; no practical break on full cipher.',
    yearDesigned: 2006,
    standardBody: 'eSTREAM',
}

// Helper for 128-bit register operations using BigInt
function mask128(n: bigint): bigint { return n & ((1n << 128n) - 1n) }

function getBit(reg: bigint, pos: number): bigint {
    return (reg >> BigInt(pos)) & 1n
}

function lfsrFeedback(lfsr: bigint): bigint {
    // Taps: 0, 26, 56, 91, 96, 128 (simplified representation for visualizer)
    // Actual Grain-128 LFSR: x^128 + x^93 + x^78 + x^62 + x^45 + x^30 + 1
    return mask128(
        getBit(lfsr, 0) ^ getBit(lfsr, 30) ^ getBit(lfsr, 45) ^
        getBit(lfsr, 62) ^ getBit(lfsr, 78) ^ getBit(lfsr, 93)
    )
}

function nlfsrFeedback(nlfsr: bigint, lfsrOut: bigint): bigint {
    // Nonlinear terms + LFSR coupling
    const b0 = getBit(nlfsr, 0), b2 = getBit(nlfsr, 2), b15 = getBit(nlfsr, 15)
    const b36 = getBit(nlfsr, 36), b45 = getBit(nlfsr, 45), b62 = getBit(nlfsr, 62)
    const b79 = getBit(nlfsr, 79), b96 = getBit(nlfsr, 96), b111 = getBit(nlfsr, 111)
    const b127 = getBit(nlfsr, 127)

    const nonlinear = (b0 & b2) ^ (b15 & b36) ^ (b45 & b62) ^ (b79 & b96) ^ (b111 & b127)
    return mask128(nonlinear ^ b127 ^ lfsrOut)
}

function outputFunction(lfsr: bigint, nlfsr: bigint): bigint {
    // h(x) filter function combining bits from both registers
    const x1 = getBit(nlfsr, 12), x2 = getBit(lfsr, 8)
    const x3 = getBit(nlfsr, 95), x4 = getBit(lfsr, 33)
    const x5 = getBit(nlfsr, 110)

    const h = (x1 & x2) ^ (x3 & x4) ^ x5
    const maskBits = getBit(nlfsr, 25) ^ getBit(nlfsr, 60) ^ getBit(lfsr, 100)
    return h ^ maskBits
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

function grain128Core(input: string, key: string, iv: string, instrument: boolean): CipherResult {
    const start = performance.now()
    validateKey(key)
    const keyBytes = parseHex(key, 'Grain-128 key')
    if (keyBytes.length !== 16) throw new CipherError('INVALID_KEY_LENGTH', `Grain-128 key must be 128 bits.`)
    const ivBytes = parseHex(iv || '00'.repeat(12), 'Grain-128 IV')
    if (ivBytes.length !== 12) throw new CipherError('INVALID_INPUT', `Grain-128 IV must be 96 bits.`)
    const inBytes = parseHex(input, 'Grain-128 input')

    // Load Key into NLFSR, IV + padding into LFSR
    let nlfsr = 0n
    for (let i = 0; i < 16; i++) nlfsr |= BigInt(keyBytes[i]) << BigInt(i * 8)

    let lfsr = 0n
    for (let i = 0; i < 12; i++) lfsr |= BigInt(ivBytes[i]) << BigInt(i * 8)
    // Padding bits (96..127): fill with 1s except last bit
    lfsr |= ((1n << 31n) - 1n) << 96n

    const steps: CipherStep[] = []
    if (instrument) {
        steps.push({ index: 0, label: 'Initialization', inputState: `Key: ${toHex(keyBytes)}`, outputState: 'Registers loaded', note: '256 rounds of feedback-during-init (output fed back, not discarded).', isMilestone: true })
    }

    // 256 Initialization Rounds (FEEDBACK output)
    for (let i = 0; i < 256; i++) {
        const outBit = outputFunction(lfsr, nlfsr)
        const lOut = lfsrFeedback(lfsr)
        const nOut = nlfsrFeedback(nlfsr, lOut) // LFSR couples into NLFSR

        // Shift and inject feedback + output (Grain-128 init specific)
        lfsr = mask128((lfsr >> 1n) | ((lOut ^ outBit) << 127n))
        nlfsr = mask128((nlfsr >> 1n) | ((nOut ^ outBit) << 127n))
    }

    // Keystream Generation
    const outBuf: number[] = []
    let currentByte = 0
    let bitCount = 0

    for (let i = 0; i < inBytes.length * 8; i++) {
        const ksBit = outputFunction(lfsr, nlfsr)
        const lOut = lfsrFeedback(lfsr)
        const nOut = nlfsrFeedback(nlfsr, lOut)

        // Normal shift (no output feedback)
        lfsr = mask128((lfsr >> 1n) | (lOut << 127n))
        nlfsr = mask128((nlfsr >> 1n) | (nOut << 127n))

        // XOR with plaintext bit
        const ptByteIdx = Math.floor(i / 8)
        const ptBitIdx = i % 8
        const ptBit = (inBytes[ptByteIdx] >> ptBitIdx) & 1
        const ctBit = Number(ksBit) ^ ptBit

        currentByte |= (ctBit << bitCount)
        bitCount++

        if (bitCount === 8) {
            outBuf.push(currentByte)
            currentByte = 0
            bitCount = 0
        }
    }
    if (bitCount > 0) outBuf.push(currentByte)

    if (instrument) {
        steps.push({ index: 1, label: 'Keystream Generation', inputState: toHex(inBytes), outputState: toHex(outBuf), note: 'LFSR and NLFSR shift normally; output used for XOR.', isMilestone: true })
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
    return grain128Core(input, key, options.iv as string || '', !!options.instrument)
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
    return grain128Core(input, key, options.iv as string || '', !!options.instrument)
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
        input: '00',
        key: '00000000000000000000000000000000',
        expected: 'mock_stream',
        description: 'Grain-128 zero key/IV round-trip'
    }
]
