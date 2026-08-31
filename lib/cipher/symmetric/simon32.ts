/**
 * SIMON-32/64 — NSA / IARPA, 2013.
 * Lightweight 32-bit block cipher, 64-bit key, 32-round Feistel.
 * Uses 16-bit words, targeting 8/16-bit microcontrollers and RFID tags.
 *
 * IACR 2013/404 Appendix B Test Vector:
 *   Key: 1918111009080100
 *   PT:  65656877
 *   CT:  c69be9bb
 */

import type { CipherResult, CipherStep, CipherOptions, TestVector, CipherMetadata } from '../types'
import { CipherError, validateInput, validateKey } from '../../utils'

const METADATA: CipherMetadata = {
    name: 'SIMON-32/64',
    keySize: 64,
    blockSize: 32,
    rounds: 32,
    securityStatus: 'secure',
    breakingComplexity: 'No practical attacks on full 32-round version',
    yearDesigned: 2013,
    standardBody: 'IACR 2013/404 (NSA/IARPA)',
}

// z0 sequence (62-bit period) from IACR 2013/404 Table 1
// Binary: 11111010001001010110000111001101111101000100101011000011100110
const Z0 = new Uint8Array([
    1, 1, 1, 1, 1, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 1, 0, 1, 1, 0, 0, 0, 0, 1, 1, 1, 0, 0, 1, 1, 0, 1,
    1, 1, 1, 1, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 1, 0, 1, 1, 0, 0, 0, 0, 1, 1, 1, 0, 0, 1, 1, 0
])

function u16(n: number): number { return n & 0xFFFF }
function rotl16(x: number, n: number): number { return u16((x << n) | (x >>> (16 - n))) }
function rotr16(x: number, n: number): number { return u16((x >>> n) | (x << (16 - n))) }

// SIMON Round Function
function f(x: number): number {
    return u16((rotl16(x, 1) & rotl16(x, 8)) ^ rotl16(x, 2))
}

// Key Schedule
function keySchedule(k: Uint16Array): Uint16Array {
    const rk = new Uint16Array(32)
    rk[0] = k[0]; rk[1] = k[1]; rk[2] = k[2]; rk[3] = k[3]

    for (let i = 4; i < 32; i++) {
        let tmp = rotr16(rk[i - 1], 3)
        tmp = u16(tmp ^ rk[i - 3])
        tmp = u16(tmp ^ rotr16(tmp, 1))
        rk[i] = u16(~rk[i - 4] ^ tmp ^ Z0[(i - 4) % 62] ^ 3)
    }
    return rk
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

function simon32Core(input: string, key: string, dec: boolean, instrument: boolean): CipherResult {
    const t0 = performance.now()
    validateKey(key)
    const kb = parseHex(key, 'SIMON-32/64 key')
    if (kb.length !== 8) throw new CipherError('INVALID_KEY_LENGTH', 'SIMON-32/64 requires 64-bit (8-byte) key.')

    const ib = parseHex(input, 'SIMON-32/64 input')
    if (ib.length % 4 !== 0 || ib.length === 0)
        throw new CipherError('INVALID_INPUT', 'SIMON-32/64 input must be non-empty multiple of 4 bytes (32 bits).')

    // Load 64-bit key as four 16-bit words (Little-Endian per spec)
    const K = new Uint16Array(4)
    for (let i = 0; i < 4; i++) K[i] = u16(kb[i * 2] | (kb[i * 2 + 1] << 8))

    const rk = keySchedule(K)
    const outBytes = new Uint8Array(ib.length)
    const steps: CipherStep[] = []

    if (instrument) {
        steps.push({
            index: 0, label: 'Key Schedule (z0 sequence)',
            inputState: toHex(kb), outputState: Array.from(rk.slice(0, 4)).map(w => w.toString(16).padStart(4, '0')).join(' ') + ' ...',
            note: '64-bit key split into four 16-bit words. Expanded to 32 round keys using NSA z0 LFSR sequence.', isMilestone: true
        })
    }

    const blocks = ib.length / 4
    for (let b = 0; b < blocks; b++) {
        const off = b * 4
        // Little-endian 16-bit word loading
        let x = u16(ib[off] | (ib[off + 1] << 8))
        let y = u16(ib[off + 2] | (ib[off + 3] << 8))

        if (!dec) {
            for (let r = 0; r < 32; r++) {
                const tmp = x
                x = u16(y ^ f(x) ^ rk[r])
                y = tmp
            }
        } else {
            for (let r = 31; r >= 0; r--) {
                const tmp = y
                y = u16(x ^ f(y) ^ rk[r])
                x = tmp
            }
        }

        outBytes[off] = x & 0xFF
        outBytes[off + 1] = (x >>> 8) & 0xFF
        outBytes[off + 2] = y & 0xFF
        outBytes[off + 3] = (y >>> 8) & 0xFF

        if (instrument) {
            steps.push({
                index: steps.length, label: `Block ${b + 1}/${blocks} — 32 Feistel Rounds`,
                inputState: toHex(ib.slice(off, off + 4)), outputState: toHex(outBytes.slice(off, off + 4)),
                note: 'Round function: f(x) = (x<<<1 & x<<<8) ^ x<<<2. Feistel swap applied 32 times with 16-bit masking.', isMilestone: true
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
    validateInput(input); return simon32Core(input, key, false, !!options.instrument)
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
    validateInput(input); return simon32Core(input, key, true, !!options.instrument)
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
        input: '65656877', key: '1918111009080100',
        expected: 'c69be9bb',
        description: 'IACR 2013/404 Appendix B Table B.1 test vector.'
    },
]
