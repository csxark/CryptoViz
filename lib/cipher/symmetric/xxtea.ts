/**
 * XXTEA (Corrected Block TEA) — Wheeler & Needham, 1998.
 * Variable-length block cipher (minimum 2 words / 8 bytes).
 * Operates on the entire message as a single block using an ARX Feistel-like
 * MX mixing function for multiple passes, achieving full diffusion.
 *
 * Canonical validation relies on round-trip correctness across variable word counts,
 * as no single official published test vector exists like TEA/XTEA.
 */
import type { CipherResult, CipherStep, CipherOptions, TestVector, CipherMetadata } from '../types'
import { CipherError, validateInput, validateKey } from '../../utils'

const METADATA: CipherMetadata = {
    name: 'XXTEA',
    keySize: 128,
    blockSize: 64, // minimum block size is 64 bits, but variable
    securityStatus: 'legacy',
    breakingComplexity: 'No known practical break on full-round version, but unauthenticated.',
    yearDesigned: 1998,
    standardBody: 'Wheeler & Needham, Cambridge',
}

const DELTA = 0x9E3779B9

function u32(n: number): number { return n >>> 0 }

function MX(sum: number, y: number, z: number, p: number, e: number, key: number[]): number {
    return u32((((z >>> 5) ^ (y << 2)) + ((y >>> 3) ^ (z << 4))) ^ ((sum ^ y) + (key[(p & 3) ^ e] ^ z)))
}

function parseHex(s: string, lbl: string): Uint8Array {
    const c = s.replace(/\s+/g, '').toLowerCase()
    if (!/^[0-9a-f]*$/.test(c) || c.length % 2 !== 0) throw new CipherError('INVALID_INPUT', `${lbl} must be hex.`)
    const o = new Uint8Array(c.length / 2)
    for (let i = 0; i < o.length; i++) o[i] = parseInt(c.slice(i * 2, i * 2 + 2), 16)
    return o
}

function toHex(b: Uint8Array): string {
    return Array.from(b).map(x => x.toString(16).padStart(2, '0')).join('')
}

function readLE32(b: Uint8Array, off: number): number {
    return u32(b[off] | (b[off + 1] << 8) | (b[off + 2] << 16) | (b[off + 3] << 24))
}

function writeLE32(n: number, b: Uint8Array, off: number): void {
    b[off] = n & 0xff
    b[off + 1] = (n >> 8) & 0xff
    b[off + 2] = (n >> 16) & 0xff
    b[off + 3] = (n >> 24) & 0xff
}

function xxteaEncrypt(v: number[], key: number[]): number[] {
    const n = v.length
    const rounds = 6 + Math.floor(52 / n)
    let sum = 0
    let z = v[n - 1]
    let y: number, e: number, p: number

    for (let r = 0; r < rounds; r++) {
        sum = u32(sum + DELTA)
        e = (sum >>> 2) & 3
        for (p = 0; p < n - 1; p++) {
            y = v[p + 1]
            v[p] = u32(v[p] + MX(sum, y, z, p, e, key))
            z = v[p]
        }
        y = v[0]
        v[n - 1] = u32(v[n - 1] + MX(sum, y, z, n - 1, e, key))
        z = v[n - 1]
    }
    return v
}

function xxteaDecrypt(v: number[], key: number[]): number[] {
    const n = v.length
    const rounds = 6 + Math.floor(52 / n)
    let sum = u32(rounds * DELTA)
    let y = v[0]
    let z: number, e: number, p: number

    for (let r = 0; r < rounds; r++) {
        e = (sum >>> 2) & 3
        for (p = n - 1; p > 0; p--) {
            z = v[p - 1]
            v[p] = u32(v[p] - MX(sum, y, z, p, e, key))
            y = v[p]
        }
        z = v[n - 1]
        v[0] = u32(v[0] - MX(sum, y, z, 0, e, key))
        y = v[0]
        sum = u32(sum - DELTA)
    }
    return v
}

function xxteaCore(input: string, key: string, doDecrypt: boolean, instrument: boolean): CipherResult {
    const start = performance.now()
    validateKey(key)
    const keyBytes = parseHex(key, 'XXTEA key')
    if (keyBytes.length !== 16) {
        throw new CipherError('INVALID_KEY_LENGTH', `XXTEA key must be 128 bits (32 hex chars).`)
    }
    const inBytes = parseHex(input, 'XXTEA input')

    if (inBytes.length === 0 || inBytes.length % 4 !== 0) {
        throw new CipherError('INVALID_INPUT', `XXTEA input must be a non-empty multiple of 4 bytes.`)
    }
    if (inBytes.length < 8) {
        throw new CipherError('INVALID_INPUT', `XXTEA input must be at least 8 bytes (2 words).`)
    }

    const keyWords = [
        readLE32(keyBytes, 0),
        readLE32(keyBytes, 4),
        readLE32(keyBytes, 8),
        readLE32(keyBytes, 12)
    ]

    const n = inBytes.length / 4
    const v: number[] = new Array(n)
    for (let i = 0; i < n; i++) {
        v[i] = readLE32(inBytes, i * 4)
    }

    const steps: CipherStep[] = []
    if (instrument) {
        steps.push({
            index: 0,
            label: 'Variable Block Setup',
            inputState: toHex(inBytes),
            outputState: `${n} words, ${6 + Math.floor(52 / n)} rounds`,
            note: `Treating entire ${inBytes.length}-byte input as a single variable-length block.`,
            isMilestone: true,
        })
    }

    const res = doDecrypt ? xxteaDecrypt([...v], keyWords) : xxteaEncrypt([...v], keyWords)

    const outBuf = new Uint8Array(inBytes.length)
    for (let i = 0; i < n; i++) {
        writeLE32(res[i], outBuf, i * 4)
    }

    if (instrument) {
        steps.push({
            index: steps.length,
            label: `Full-block Diffusion — ${6 + Math.floor(52 / n)} cycles`,
            inputState: toHex(inBytes),
            outputState: toHex(outBuf),
            note: `MX function processes every word in sequence. Decrypt loops in reverse order.`,
            isMilestone: true,
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
    return xxteaCore(input, key, false, !!options.instrument)
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
    return xxteaCore(input, key, true, !!options.instrument)
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
        expected: 'b721660b2c83330d',
        description: 'XXTEA round-trip test (2 words, zero key/input)',
    }
]
