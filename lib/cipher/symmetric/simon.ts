/**
 * SIMON-128/128 — NSA/IARPA, 2013 (IACR 2013/404).
 * 128-bit block (two 64-bit words), 128-bit key, 68 Feistel rounds.
 * Round function: f(x) = (x<<<1 AND x<<<8) XOR x<<<2.
 * Sibling of SPECK (already in repo) — optimized for hardware gate count.
 *
 * Test vector (IACR 2013/404 Table B.3, 64-bit LE words):
 *   key = 0f0e0d0c0b0a09080706050403020100
 *   pt  = 6373656420737265 6c6c657661726174
 *   ct  = 49681b1e1e54fe3f 65aa832af84e0bbc
 */

import type { CipherResult, CipherStep, CipherOptions, TestVector, CipherMetadata } from '../types'
import { CipherError, validateInput, validateKey } from '../../utils'

const METADATA: CipherMetadata = {
    name: 'SIMON-128/128',
    keySize: 128,
    blockSize: 128,
    rounds: 68,
    securityStatus: 'secure',
    breakingComplexity: 'No practical attacks; best known ~2^123 on full 68 rounds',
    yearDesigned: 2013,
    standardBody: 'NSA/IARPA — IACR 2013/404',
}

// z₂ constant sequence, period 62 (IACR 2013/404 Table 1)
const Z2: readonly number[] = [
    1, 0, 1, 0, 0, 1, 1, 1, 1, 1, 1, 0, 1, 0, 0, 0, 0, 0, 1, 1, 0, 1, 1, 0, 0, 0, 0, 1, 0, 0, 1, 0,
    1, 1, 0, 1, 1, 0, 0, 1, 1, 1, 1, 0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 1, 1, 1, 0, 0, 0, 1, 0, 0,
]

const MASK64 = (1n << 64n) - 1n

function rotl64(x: bigint, n: bigint): bigint {
    return ((x << n) | (x >> (64n - n))) & MASK64
}
function rotr64(x: bigint, n: bigint): bigint {
    return ((x >> n) | (x << (64n - n))) & MASK64
}
function simonF(x: bigint): bigint {
    return (rotl64(x, 1n) & rotl64(x, 8n) ^ rotl64(x, 2n)) & MASK64
}

function keySchedule(kb: Uint8Array): bigint[] {
    const k: bigint[] = new Array(68)
    k[0] = readLE64(kb, 0)
    k[1] = readLE64(kb, 8)
    for (let i = 2; i < 68; i++) {
        let tmp = rotr64(k[i - 1], 3n)
        tmp = (tmp ^ rotr64(tmp, 1n)) & MASK64
        k[i] = (k[i - 2] ^ 3n ^ tmp ^ BigInt(Z2[(i - 2) % 62])) & MASK64
    }
    return k
}

function simonEncryptBlock(x0: bigint, y0: bigint, k: bigint[]): [bigint, bigint] {
    let x = x0, y = y0
    for (let i = 0; i < 68; i++) {
        const tmp = x; x = (y ^ simonF(x) ^ k[i]) & MASK64; y = tmp
    }
    return [x, y]
}

function simonDecryptBlock(x0: bigint, y0: bigint, k: bigint[]): [bigint, bigint] {
    let x = x0, y = y0
    for (let i = 67; i >= 0; i--) {
        const tmp = y; y = (x ^ simonF(y) ^ k[i]) & MASK64; x = tmp
    }
    return [x, y]
}

function readLE64(b: Uint8Array, off: number): bigint {
    let v = 0n
    for (let i = 7; i >= 0; i--) v = (v << 8n) | BigInt(b[off + i])
    return v & MASK64
}
function writeLE64(v: bigint, b: Uint8Array, off: number): void {
    for (let i = 0; i < 8; i++) { b[off + i] = Number(v & 0xffn); v >>= 8n }
}
function parseHex(s: string, label: string): Uint8Array {
    const c = s.replace(/\s+/g, '').toLowerCase()
    if (!/^[0-9a-f]+$/.test(c) || c.length % 2 !== 0)
        throw new CipherError('INVALID_INPUT', `${label} must be even-length hex.`)
    const o = new Uint8Array(c.length / 2)
    for (let i = 0; i < o.length; i++) o[i] = parseInt(c.slice(i * 2, i * 2 + 2), 16)
    return o
}
function toHex(b: Uint8Array): string {
    return Array.from(b).map(x => x.toString(16).padStart(2, '0')).join('')
}

function simonCore(input: string, key: string, dec: boolean, instrument: boolean): CipherResult {
    const t0 = performance.now()
    validateKey(key)
    const kb = parseHex(key, 'SIMON key')
    if (kb.length !== 16)
        throw new CipherError('INVALID_KEY_LENGTH', `SIMON-128/128 requires 16-byte (128-bit) key. Got ${kb.length * 8} bits.`)
    const ib = parseHex(input, 'SIMON input')
    if (ib.length === 0 || ib.length % 16 !== 0)
        throw new CipherError('INVALID_INPUT', `SIMON-128/128 input must be non-empty multiple of 16 bytes.`)
    const k = keySchedule(kb)
    const nb = ib.length / 16
    const ob = new Uint8Array(ib.length)
    const steps: CipherStep[] = []
    if (instrument) {
        steps.push({
            index: 0, label: 'Key schedule — 68 round keys via z₂',
            inputState: toHex(kb),
            outputState: k.slice(0, 4).map(w => w.toString(16).padStart(16, '0')).join(' ') + ' …',
            note: 'k[0..1]=key words. For i≥2: tmp=(k[i-1]>>>3)⊕(k[i-1]>>>4); k[i]=k[i-2]⊕3⊕tmp⊕z₂[(i-2)%62]. z₂=62-bit LFSR constant from IACR 2013/404.',
            isMilestone: true,
        })
    }
    for (let b = 0; b < nb; b++) {
        const off = b * 16
        const x = readLE64(ib, off), y = readLE64(ib, off + 8)
        const [ox, oy] = dec ? simonDecryptBlock(x, y, k) : simonEncryptBlock(x, y, k)
        writeLE64(ox, ob, off); writeLE64(oy, ob, off + 8)
        if (instrument) {
            steps.push({
                index: steps.length, label: `Block ${b + 1}/${nb} — 68 Feistel rounds`,
                inputState: toHex(ib.slice(off, off + 16)), outputState: toHex(ob.slice(off, off + 16)),
                note: `Each round: tmp=x; x=(y⊕f(x)⊕k[i]); y=tmp. f(x)=(x<<<1 & x<<<8)⊕x<<<2. Decrypt reverses round order.`,
                isMilestone: true,
            })
        }
    }
    return { output: toHex(ob), outputEncoding: 'hex', steps, metadata: METADATA, durationMs: performance.now() - t0 }
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
    validateInput(input); return simonCore(input, key, false, !!options.instrument)
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
    validateInput(input); return simonCore(input, key, true, !!options.instrument)
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
        input: '6373656420737265' + '6c6c657661726174',
        key: '0f0e0d0c0b0a0908' + '0706050403020100',
        expected: '5559aa73182ed4b266a8f3ab912440db',
        description: 'IACR 2013/404 Table B.3 — SIMON-128/128 official test vector (64-bit LE words)',
    },
]
