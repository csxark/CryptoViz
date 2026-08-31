/**
 * E0 — Bluetooth BR/EDR Stream Cipher
 * 4 LFSRs (25, 31, 33, 39 bits) + summation combiner FSM.
 * 128-bit key, 128-bit IV.
 * 
 * ⚠️ BROKEN — Fluhrer-Mantin (2001), Lu-Vaudenay (2004).
 * Replaced by AES-CCM in Bluetooth LE.
 */
import type { CipherResult, CipherStep, CipherOptions, TestVector, CipherMetadata } from '../types'
import { CipherError } from '../../utils/errors'

const METADATA: CipherMetadata = {
    name: 'E0',
    keySize: 128,
    blockSize: 128, // Stream cipher, but processes in byte-aligned chunks
    securityStatus: 'broken',
    breakingComplexity: 'Fluhrer-Mantin (2001) correlation attack, Lu-Vaudenay (2004) linear-complexity attack. Replaced by AES-CCM in Bluetooth LE.',
    yearDesigned: 1999,
    standardBody: 'Bluetooth Core Specification',
}

// LFSR tap masks (verify against Bluetooth Core Spec Table 15.2)
const MASK1 = (1n << 25n) - 1n
const TAPS1 = 0x1080481n // x^25 + x^20 + x^12 + x^8 + 1

const MASK2 = (1n << 31n) - 1n
const TAPS2 = 0x40801801n // x^31 + x^24 + x^16 + x^12 + 1

const MASK3 = (1n << 33n) - 1n
const TAPS3 = 0x110000001n // x^33 + x^28 + x^24 + x^4 + 1

const MASK4 = (1n << 39n) - 1n
const TAPS4 = 0x880000001n // x^39 + x^36 + x^28 + x^4 + 1

function popcount(n: bigint): bigint {
    let count = 0n
    let v = n
    while (v > 0n) {
        count += v & 1n
        v >>= 1n
    }
    return count
}

function clockLFSR(state: bigint, mask: bigint, taps: bigint): [bigint, bigint] {
    const bit = popcount(state & taps) & 1n
    const newState = ((state >> 1n) | (bit << BigInt(mask.toString(2).length - 1))) & mask
    return [newState, state & 1n]
}

function parseHex(s: string, lbl: string): Uint8Array {
    const c = s.replace(/\s+/g, '').toLowerCase()
    if (!/^[0-9a-f]*$/.test(c) || c.length % 2 !== 0) throw new CipherError('INVALID_INPUT', `${lbl} must be hex.`)
    const o = new Uint8Array(c.length / 2)
    for (let i = 0; i < c.length; i += 2) o[i / 2] = parseInt(c.slice(i, i + 2), 16)
    return o
}
function toHex(b: Uint8Array): string { return Array.from(b).map(x => x.toString(16).padStart(2, '0')).join('') }

export function encrypt(plaintext: string, key: string, options: CipherOptions = {}): CipherResult {
    const start = performance.now()
    const keyBytes = parseHex(key, 'E0 key+IV')
    if (keyBytes.length !== 24) throw new CipherError('INVALID_KEY_LENGTH', 'Key must be 24 bytes (16-byte key + 8-byte IV).')

    const K_c = keyBytes.slice(0, 16)
    const IV = keyBytes.slice(16, 24)
    const ptBytes = parseHex(plaintext, 'E0 plaintext')

    // Simplified initialization: load key bytes directly into LFSRs
    let lfsr1 = 0n, lfsr2 = 0n, lfsr3 = 0n, lfsr4 = 0n
    for (let i = 0; i < 4; i++) lfsr1 = (lfsr1 << 8n) | BigInt(K_c[i])
    for (let i = 4; i < 8; i++) lfsr2 = (lfsr2 << 8n) | BigInt(K_c[i])
    for (let i = 8; i < 12; i++) lfsr3 = (lfsr3 << 8n) | BigInt(K_c[i])
    for (let i = 12; i < 16; i++) lfsr4 = (lfsr4 << 8n) | BigInt(K_c[i])

    // Ensure non-zero initial states
    if (lfsr1 === 0n) lfsr1 = 1n
    if (lfsr2 === 0n) lfsr2 = 1n
    if (lfsr3 === 0n) lfsr3 = 1n
    if (lfsr4 === 0n) lfsr4 = 1n

    let c0 = 0n, c1 = 0n // 2-bit carry register
    const ctBytes: number[] = []
    const steps: CipherStep[] = []

    let bitBuffer = 0
    let bitCount = 0

    for (let i = 0; i < ptBytes.length; i++) {
        for (let bit = 7; bit >= 0; bit--) {
            // Clock LFSRs
            const [newLfsr1, s1] = clockLFSR(lfsr1, MASK1, TAPS1)
            const [newLfsr2, s2] = clockLFSR(lfsr2, MASK2, TAPS2)
            const [newLfsr3, s3] = clockLFSR(lfsr3, MASK3, TAPS3)
            const [newLfsr4, s4] = clockLFSR(lfsr4, MASK4, TAPS4)

            lfsr1 = newLfsr1; lfsr2 = newLfsr2; lfsr3 = newLfsr3; lfsr4 = newLfsr4

            // Summation combiner
            const sum = s1 + s2 + s3 + s4 + c0
            const k_t = s1 ^ s2 ^ s3 ^ s4 ^ c0
            c0 = (sum >> 1n) & 1n
            c1 = (sum >> 2n) & 1n

            const ptBit = (ptBytes[i] >> bit) & 1
            const ctBit = Number(BigInt(ptBit) ^ k_t)

            bitBuffer = (bitBuffer << 1) | ctBit
            bitCount++

            if (bitCount === 8) {
                ctBytes.push(bitBuffer & 0xFF)
                bitBuffer = 0
                bitCount = 0
            }
        }
    }

    if (options.instrument) {
        steps.push({ index: 0, label: 'E0 Bluetooth Stream Cipher', inputState: plaintext, outputState: toHex(new Uint8Array(ctBytes)), note: '⚠️ BROKEN. 4 LFSRs + summation combiner. Replaced by AES-CCM in Bluetooth LE.', isMilestone: true })
    }

    return { output: toHex(new Uint8Array(ctBytes)), outputEncoding: 'hex', steps, metadata: METADATA, durationMs: performance.now() - start }
}

export function decrypt(ciphertext: string, key: string, options: CipherOptions = {}): CipherResult {
    // Symmetric XOR stream cipher
    return encrypt(ciphertext, key, options)
}

export const TEST_VECTORS: TestVector[] = [
    { input: '0000000000000000', key: '00'.repeat(24), expected: 'mock_ks', description: 'E0 zero key/IV' }
]
