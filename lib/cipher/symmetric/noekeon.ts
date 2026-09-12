/**
 * NOEKEON — Daemen, Peeters, Van Assche, Van Dijk (2000).
 * NESSIE submission. 128-bit block, 128-bit key, 16-round SPN.
 * Unique property: Zero lookup tables. Gamma uses 5 bitwise operations.
 *
 * Output format:
 *   encrypt(pt_hex, key_hex) → ct_hex
 *   decrypt(ct_hex, key_hex) → pt_hex
 */

import type { CipherResult, CipherStep, CipherOptions, TestVector, CipherMetadata } from '../types'
import { CipherError, validateInput, validateKey } from '../../utils'

const METADATA: CipherMetadata = {
    name: 'NOEKEON',
    keySize: 128,
    blockSize: 128,
    rounds: 16,
    securityStatus: 'secure',
    breakingComplexity: 'No practical attacks on full 16-round direct mode',
    yearDesigned: 2000,
    standardBody: 'NESSIE Project Submission',
}

function u32(n: number): number { return n >>> 0 }
function rotl32(x: number, n: number): number { return u32((x << n) | (x >>> (32 - n))) }

// Theta: Linear diffusion layer (involution)
function theta(a: Uint32Array, k: Uint32Array) {
    let tmp = a[0] ^ a[2]
    tmp = u32(tmp ^ (rotl32(tmp, 8) ^ rotl32(tmp, 24)))
    a[1] = u32(a[1] ^ tmp)
    a[3] = u32(a[3] ^ tmp)

    a[0] = u32(a[0] ^ k[0])
    a[1] = u32(a[1] ^ k[1])
    a[2] = u32(a[2] ^ k[2])
    a[3] = u32(a[3] ^ k[3])

    tmp = a[1] ^ a[3]
    tmp = u32(tmp ^ (rotl32(tmp, 8) ^ rotl32(tmp, 24)))
    a[0] = u32(a[0] ^ tmp)
    a[2] = u32(a[2] ^ tmp)
}

// Pi1: Cyclic left rotations
function pi1(a: Uint32Array) {
    a[1] = rotl32(a[1], 1)
    a[2] = rotl32(a[2], 5)
    a[3] = rotl32(a[3], 2)
}

// Pi2: Cyclic right rotations (Inverse of Pi1)
function pi2(a: Uint32Array) {
    a[1] = rotl32(a[1], 31)
    a[2] = rotl32(a[2], 27)
    a[3] = rotl32(a[3], 30)
}

// Gamma: Non-linear layer (involution, 5 bitwise operations, NO lookup tables)
function gamma(a: Uint32Array) {
    a[1] = u32(a[1] ^ (~a[3] & ~a[2]))
    a[0] = u32(a[0] ^ (a[2] & a[1]))

    const tmp = a[3]
    a[3] = a[0]
    a[0] = tmp
    a[2] = u32(a[2] ^ a[0] ^ a[1] ^ a[3])

    a[1] = u32(a[1] ^ (~a[3] & ~a[2]))
    a[0] = u32(a[0] ^ (a[2] & a[1]))
}

function rcShiftRegFwd(rc: number): number {
    return (rc & 0x80) ? (((rc << 1) ^ 0x1b) & 0xff) : ((rc << 1) & 0xff)
}

function rcShiftRegBwd(rc: number): number {
    return (rc & 0x01) ? (((rc >> 1) ^ 0x8d) & 0xff) : ((rc >> 1) & 0xff)
}

function parseHex(s: string, lbl: string): Uint8Array {
    const c = s.replace(/\s+/g, '').toLowerCase()
    if (!/^[0-9a-f]*$/.test(c) || c.length % 2 !== 0)
        throw new CipherError('INVALID_INPUT', `${lbl} must be even-length hex.`)
    const o = new Uint8Array(c.length / 2)
    for (let i = 0; i < o.length; i++) o[i] = parseInt(c.slice(i * 2, i * 2 + 2), 16)
    return o
}
function toHex(b: Uint8Array): string {
    return Array.from(b).map(x => x.toString(16).padStart(2, '0')).join('')
}

function noekeonCore(input: string, key: string, dec: boolean, instrument: boolean): CipherResult {
    const t0 = performance.now()
    validateKey(key)
    const kb = parseHex(key, 'NOEKEON key')
    if (kb.length !== 16) throw new CipherError('INVALID_KEY_LENGTH', 'NOEKEON requires 128-bit (16-byte) key.')

    const ib = parseHex(input, 'NOEKEON input')
    if (ib.length % 16 !== 0 || ib.length === 0)
        throw new CipherError('INVALID_INPUT', 'NOEKEON input must be non-empty multiple of 16 bytes.')

    // Load Key
    const K = new Uint32Array(4)
    for (let i = 0; i < 4; i++) {
        K[i] = u32((kb[i * 4] << 24) | (kb[i * 4 + 1] << 16) | (kb[i * 4 + 2] << 8) | kb[i * 4 + 3])
    }

    const workingKey = new Uint32Array(K)
    if (dec) {
        const nullKey = new Uint32Array(4)
        theta(workingKey, nullKey)
    }

    const outBytes = new Uint8Array(ib.length)
    const steps: CipherStep[] = []

    if (instrument) {
        steps.push({
            index: 0, label: 'Key Load & Constants',
            inputState: toHex(kb), outputState: Array.from(workingKey).map(w => w.toString(16).padStart(8, '0')).join(' '),
            note: '128-bit key loaded as four 32-bit words. NOEKEON uses direct-key mode (Theta applies key directly).', isMilestone: true
        })
    }

    const blocks = ib.length / 16
    for (let b = 0; b < blocks; b++) {
        const off = b * 16
        const a = new Uint32Array(4)
        for (let i = 0; i < 4; i++) {
            a[i] = u32((ib[off + i * 4] << 24) | (ib[off + i * 4 + 1] << 16) | (ib[off + i * 4 + 2] << 8) | ib[off + i * 4 + 3])
        }

        let rc1 = dec ? 0 : 0x80
        let rc2 = dec ? 0xd4 : 0

        for (let r = 0; r < 16; r++) {
            a[0] = u32(a[0] ^ rc1)
            theta(a, workingKey)
            a[0] = u32(a[0] ^ rc2)
            pi1(a)
            gamma(a)
            pi2(a)
            rc1 = rcShiftRegFwd(rc1)
            rc2 = rcShiftRegBwd(rc2)
        }
        a[0] = u32(a[0] ^ rc1)
        theta(a, workingKey)
        a[0] = u32(a[0] ^ rc2)

        for (let i = 0; i < 4; i++) {
            outBytes[off + i * 4] = (a[i] >>> 24) & 0xFF
            outBytes[off + i * 4 + 1] = (a[i] >>> 16) & 0xFF
            outBytes[off + i * 4 + 2] = (a[i] >>> 8) & 0xFF
            outBytes[off + i * 4 + 3] = a[i] & 0xFF
        }

        if (instrument) {
            steps.push({
                index: steps.length, label: `Block ${b + 1}/${blocks} — 16 Rounds`,
                inputState: toHex(ib.slice(off, off + 16)), outputState: toHex(outBytes.slice(off, off + 16)),
                note: 'Theta (linear diffusion) → Pi1 (rotate) → Gamma (5 bitwise ops) → Pi2 (rotate). Zero memory lookups used.', isMilestone: true
            })
        }
    }

    return { output: toHex(outBytes), outputEncoding: 'hex', steps, metadata: METADATA, durationMs: performance.now() - t0 }
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
    validateInput(input); return noekeonCore(input, key, false, !!options.instrument)
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
    validateInput(input); return noekeonCore(input, key, true, !!options.instrument)
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
        input: '00000000000000000000000000000000', key: '00000000000000000000000000000000',
        expected: 'b1656851699e29fa24b70148503d2dfc', // Authoritative NESSIE direct mode zero vector
        description: 'NOEKEON Direct Mode zero key/PT test vector.'
    },
    {
        input: 'ffffffffffffffffffffffffffffffff', key: 'ffffffffffffffffffffffffffffffff',
        expected: '2a78421b87c7d0924f26113f1d1349b2',
        description: 'NOEKEON Direct Mode all-ones key/PT test vector.'
    },
]
