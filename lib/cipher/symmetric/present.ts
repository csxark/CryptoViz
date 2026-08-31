/**
 * PRESENT — Bogdanov et al., 2007. ISO/IEC 29192-2:2012.
 * 64-bit block, 80 or 128-bit key, 31 SPN rounds.
 * S-layer: 4-bit SBOX on 16 nibbles. P-layer: P(i)=16*(i%4)+floor(i/4).
 * Smallest standardised block cipher: 1075 GE for PRESENT-80.
 *
 * ISO/IEC 29192-2 test vectors:
 *   PRESENT-80: key=00×10 pt=00×8 → ct=5579c1387b228445
 *   PRESENT-80: key=ff×10 pt=ff×8 → ct=a112ffc72f68417b
 *   PRESENT-128: key=00×16 pt=00×8 → ct=96db702a2e6900af
 */

import type { CipherResult, CipherStep, CipherOptions, TestVector, CipherMetadata } from '../types'
import { CipherError, validateInput, validateKey } from '../../utils'

const METADATA: CipherMetadata = {
    name: 'PRESENT',
    keySize: 80,
    blockSize: 64,
    rounds: 31,
    securityStatus: 'legacy',
    breakingComplexity: '80-bit key exhaustive search; 64-bit block birthday bound ~4 GB',
    yearDesigned: 2007,
    standardBody: 'ISO/IEC 29192-2:2012',
}

const SBOX = new Uint8Array([0xC, 0x5, 0x6, 0xB, 0x9, 0x0, 0xA, 0xD, 0x3, 0xE, 0xF, 0x8, 0x4, 0x7, 0x1, 0x2])
const SBOX_INV = new Uint8Array([0x5, 0xE, 0xF, 0x8, 0xC, 0x1, 0x2, 0xD, 0xB, 0x4, 0x6, 0x3, 0x0, 0x7, 0x9, 0xA])

// P[i] = 16*(i%4)+floor(i/4); P[63]=63
const PERM = new Uint8Array(64)
const PERM_INV = new Uint8Array(64)
for (let i = 0; i < 64; i++) PERM[i] = i === 63 ? 63 : (16 * (i % 4) + Math.floor(i / 4)) & 63
for (let i = 0; i < 64; i++) PERM_INV[PERM[i]] = i

const MASK64 = (1n << 64n) - 1n

function applyS(state: bigint, sbox: Uint8Array): bigint {
    let out = 0n
    for (let i = 0; i < 16; i++) {
        const shift = BigInt((15 - i) * 4)
        out |= BigInt(sbox[Number((state >> shift) & 0xfn)]) << shift
    }
    return out & MASK64
}

function applyP(state: bigint, perm: Uint8Array): bigint {
    let out = 0n
    for (let i = 0; i < 64; i++) {
        const bit = (state >> BigInt(63 - i)) & 1n
        out |= bit << BigInt(63 - perm[i])
    }
    return out & MASK64
}

function keySchedule80(kb: Uint8Array): bigint[] {
    let K = 0n
    for (let i = 0; i < 10; i++) K = (K << 8n) | BigInt(kb[i])
    const MASK80 = (1n << 80n) - 1n
    const rk: bigint[] = []
    for (let r = 1; r <= 32; r++) {
        rk.push((K >> 16n) & MASK64)
        K = ((K << 61n) | (K >> 19n)) & MASK80
        const top = Number((K >> 76n) & 0xfn)
        K = (K & ~(0xfn << 76n)) | (BigInt(SBOX[top]) << 76n)
        K ^= BigInt(r) << 15n
    }
    return rk
}

function keySchedule128(kb: Uint8Array): bigint[] {
    let K = 0n
    for (let i = 0; i < 16; i++) K = (K << 8n) | BigInt(kb[i])
    const MASK128 = (1n << 128n) - 1n
    const rk: bigint[] = []
    for (let r = 1; r <= 32; r++) {
        rk.push((K >> 64n) & MASK64)
        K = ((K << 61n) | (K >> 67n)) & MASK128
        const n1 = Number((K >> 124n) & 0xfn), n2 = Number((K >> 120n) & 0xfn)
        K = (K & ~(0xffn << 120n)) | (BigInt(SBOX[n1]) << 124n) | (BigInt(SBOX[n2]) << 120n)
        K ^= BigInt(r) << 62n
    }
    return rk
}

function presentEncrypt(block: Uint8Array, rk: bigint[]): Uint8Array {
    let s = 0n
    for (let i = 0; i < 8; i++) s = (s << 8n) | BigInt(block[i])
    for (let r = 0; r < 31; r++) {
        s ^= rk[r]
        s = applyS(s, SBOX)
        s = applyP(s, PERM)
    }
    s ^= rk[31]
    const out = new Uint8Array(8)
    for (let i = 7; i >= 0; i--) { out[i] = Number(s & 0xffn); s >>= 8n }
    return out
}

function presentDecrypt(block: Uint8Array, rk: bigint[]): Uint8Array {
    let s = 0n
    for (let i = 0; i < 8; i++) s = (s << 8n) | BigInt(block[i])
    s ^= rk[31]
    for (let r = 30; r >= 0; r--) {
        s = applyP(s, PERM_INV)
        s = applyS(s, SBOX_INV)
        s ^= rk[r]
    }
    const out = new Uint8Array(8)
    for (let i = 7; i >= 0; i--) { out[i] = Number(s & 0xffn); s >>= 8n }
    return out
}

function parseHex(s: string, lbl: string): Uint8Array {
    const c = s.replace(/\s+/g, '').toLowerCase()
    if (!/^[0-9a-f]+$/.test(c) || c.length % 2 !== 0) throw new CipherError('INVALID_INPUT', `${lbl} must be even-length hex.`)
    const o = new Uint8Array(c.length / 2)
    for (let i = 0; i < o.length; i++) o[i] = parseInt(c.slice(i * 2, i * 2 + 2), 16)
    return o
}
function toHex(b: Uint8Array): string { return Array.from(b).map(x => x.toString(16).padStart(2, '0')).join('') }

function presentCore(input: string, key: string, dec: boolean, instrument: boolean): CipherResult {
    const t0 = performance.now()
    validateKey(key)
    const kb = parseHex(key, 'PRESENT key')
    if (kb.length !== 10 && kb.length !== 16)
        throw new CipherError('INVALID_KEY_LENGTH', `PRESENT key must be 80 bits (10 bytes) or 128 bits (16 bytes). Got ${kb.length * 8} bits.`)
    const ib = parseHex(input, 'PRESENT input')
    if (ib.length === 0 || ib.length % 8 !== 0)
        throw new CipherError('INVALID_INPUT', `PRESENT input must be non-empty multiple of 8 bytes.`)
    const rk = kb.length === 10 ? keySchedule80(kb) : keySchedule128(kb)
    const variant = kb.length === 10 ? 'PRESENT-80' : 'PRESENT-128'
    const nb = ib.length / 8
    const ob = new Uint8Array(ib.length)
    const steps: CipherStep[] = []
    if (instrument) {
        steps.push({
            index: 0, label: `Key schedule — ${variant}, 32 round keys`,
            inputState: toHex(kb), outputState: rk.slice(0, 4).map(k => k.toString(16).padStart(16, '0')).join(' ') + ' …',
            note: `${variant}: 80/128-bit register rotated left 61 bits, top nibble(s) through SBOX, counter XOR. Extracts 32 × 64-bit round keys from MSB.`, isMilestone: true
        })
    }
    for (let b = 0; b < nb; b++) {
        const off = b * 8
        const bIn = ib.slice(off, off + 8)
        const bOut = dec ? presentDecrypt(bIn, rk) : presentEncrypt(bIn, rk)
        ob.set(bOut, off)
        if (instrument) {
            steps.push({
                index: steps.length, label: `Block ${b + 1}/${nb} — 31 rounds (key XOR + S-layer + P-layer)`,
                inputState: toHex(bIn), outputState: toHex(bOut),
                note: `Each round: XOR 64-bit round key → SBOX on all 16 nibbles → bit perm P(i)=16*(i%4)+⌊i/4⌋. Final round: XOR key only.`, isMilestone: true
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
    validateInput(input); return presentCore(input, key, false, !!options.instrument)
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
    validateInput(input); return presentCore(input, key, true, !!options.instrument)
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
    { input: '0000000000000000', key: '00000000000000000000', expected: '5579c1387b228445', description: 'ISO/IEC 29192-2 PRESENT-80: zero key, zero plaintext' },
    { input: 'ffffffffffffffff', key: 'ffffffffffffffffffff', expected: 'a112ffc72f68417b', description: 'ISO/IEC 29192-2 PRESENT-80: all-ones key+plaintext' },
    { input: '0000000000000000', key: '00000000000000000000000000000000', expected: '96db702a2e6900af', description: 'ISO/IEC 29192-2 PRESENT-128: zero 128-bit key, zero plaintext' },
]
