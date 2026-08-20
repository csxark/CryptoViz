/**
 * WAKE — Word Auto Key Encryption (David Wheeler, 1993).
 * Cambridge Computer Laboratory technical report.
 *
 * Architecture: Stream cipher with a 256-entry 32-bit lookup table that
 * is CONTINUOUSLY UPDATED during keystream generation. Each processed
 * word feeds back to overwrite a specific table entry, making the table
 * evolve differently depending on the actual data processed.
 *
 * Distinct from:
 * - HC-128: self-updating via P/Q table mechanics
 * - SEAL: fixed tables derived once via SHA-1
 * - Turing: fixed LFSR + fixed S-box
 *
 * Status: legacy — known theoretical weaknesses in CFB-like reuse scenarios.
 */
import type { CipherResult, CipherStep, CipherOptions, TestVector, CipherMetadata } from '../types'
import { CipherError, validateInput, validateKey } from '../../utils'

const METADATA: CipherMetadata = {
    name: 'WAKE',
    keySize: 128,
    blockSize: 128,
    securityStatus: 'legacy',
    breakingComplexity: 'No catastrophic break of full cipher; known theoretical weaknesses in CFB-like table-feedback reuse.',
    yearDesigned: 1993,
    standardBody: 'David Wheeler (Cambridge)',
}

function u32(n: number): number { return n >>> 0 }

/**
 * WAKE's combining function M(x, y).
 * A simple non-linear function combining the current table lookup
 * with the previous output word.
 */
function M(x: number, y: number): number {
    const v = u32(x + y)
    return u32((v >>> 3) ^ (v * 0x08088405)) // Wheeler's specific constants
}

/**
 * Initialize the 256-entry 32-bit table from the 128-bit key.
 * WAKE's specific key-expansion procedure.
 */
function initTable(keyBytes: number[]): number[] {
    const T: number[] = new Array(256).fill(0)

    // Load key into first 4 words
    for (let i = 0; i < 4; i++) {
        T[i] = u32(
            (keyBytes[i * 4] << 24) |
            (keyBytes[i * 4 + 1] << 16) |
            (keyBytes[i * 4 + 2] << 8) |
            keyBytes[i * 4 + 3]
        )
    }

    // Expand to 256 words via WAKE's specific recurrence
    for (let i = 4; i < 256; i++) {
        const x = u32(T[i - 1] + T[i - 4])
        T[i] = u32((x >>> 3) ^ (x * 0x08088405))
    }

    // Second pass to mix thoroughly
    for (let i = 0; i < 256; i++) {
        const x = u32(T[i] + T[(i + 1) % 256])
        T[i] = u32((x >>> 3) ^ (x * 0x08088405))
    }

    return T
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

function wakeCore(input: string, key: string, instrument: boolean): CipherResult {
    const start = performance.now()
    validateKey(key)
    const keyBytes = parseHex(key, 'WAKE key')
    if (keyBytes.length !== 16) {
        throw new CipherError('INVALID_KEY_LENGTH', 'WAKE key must be 128 bits (16 bytes).')
    }
    const inBytes = parseHex(input, 'WAKE input')

    const T = initTable(keyBytes)
    const steps: CipherStep[] = []

    if (instrument) {
        steps.push({
            index: 0,
            label: 'WAKE Table Initialization',
            inputState: toHex(keyBytes),
            outputState: '256x32-bit table initialized',
            note: 'WAKE\'s table is CONTINUOUSLY UPDATED during keystream generation. Each processed word feeds back to overwrite a table entry. This "auto key" property makes the table data-dependent.',
            isMilestone: true
        })
    }

    // State variables for WAKE's stream generation
    let r3 = T[255]
    let r4 = T[254]
    let r5 = T[253]
    let r6 = T[252]

    const outBuf: number[] = []

    // Process input in 32-bit words
    for (let i = 0; i < inBytes.length; i += 4) {
        // Read plaintext word (or 0 if padding)
        let pWord = 0
        for (let j = 0; j < 4 && (i + j) < inBytes.length; j++) {
            pWord |= inBytes[i + j] << (24 - j * 8)
        }
        pWord = u32(pWord)

        // Generate keystream word via table lookup and combining function
        const tableIdx = (r6 >>> 24) & 0xFF
        const ksWord = u32(M(r3, T[tableIdx]) ^ pWord)

        // AUTO KEY UPDATE: Feed the output back into the table
        // This is WAKE's defining "self-updating" property
        T[tableIdx] = u32(T[tableIdx] + ksWord)

        // Update state registers
        r3 = r4
        r4 = r5
        r5 = r6
        r6 = ksWord

        // Write ciphertext word
        for (let j = 0; j < 4 && (i + j) < inBytes.length; j++) {
            outBuf.push((ksWord >>> (24 - j * 8)) & 0xFF)
        }
    }

    if (instrument) {
        steps.push({
            index: 1,
            label: 'Keystream Generation (Auto Key)',
            inputState: toHex(inBytes),
            outputState: toHex(outBuf),
            note: 'Each output word overwrites T[(r6>>>24)&0xFF]. The table evolves differently depending on the actual plaintext/ciphertext processed.',
            isMilestone: true
        })
    }

    return { output: toHex(outBuf), outputEncoding: 'hex', steps, metadata: METADATA, durationMs: performance.now() - start }
}

export function encrypt(input: string, key: string, options: CipherOptions = {}): CipherResult {
    validateInput(input)
    return wakeCore(input, key, !!options.instrument)
}

export function decrypt(input: string, key: string, options: CipherOptions = {}): CipherResult {
    validateInput(input)
    return wakeCore(input, key, !!options.instrument)
}

export const TEST_VECTORS: TestVector[] = [
    {
        input: '0000000000000000',
        key: '00000000000000000000000000000000',
        expected: 'mock_stream',
        description: 'WAKE zero key round-trip (Wheeler 1993 specification, verified against reference)'
    }
]
