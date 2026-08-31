/**
 * SM4 — Chinese national standard symmetric block cipher.
 * GB/T 32907-2016; ISO/IEC 18033-3 Amendment 1; RFC 8998 (TLS 1.3).
 * 128-bit block, 128-bit key, 32-round SPN.
 *
 * Official test vector (GB/T 32907-2016):
 *   key = 0123456789abcdeffedcba9876543210
 *   pt  = 0123456789abcdeffedcba9876543210
 *   ct  = 681edf34d206965e86b3e94f536e4246
 */

import type { CipherResult, CipherStep, CipherOptions, TestVector, CipherMetadata } from '../types'
import { CipherError, validateInput, validateKey } from '../../utils'

const METADATA: CipherMetadata = {
    name: 'SM4',
    keySize: 128,
    blockSize: 128,
    rounds: 32,
    securityStatus: 'secure',
    breakingComplexity: 'No practical attacks on full 32-round SM4; 2^128 key search',
    yearDesigned: 2006,
    standardBody: 'OSCCA (China); GB/T 32907-2016; ISO/IEC 18033-3; RFC 8998',
}

// ── SM4 S-box (τ: 256-byte substitution, GB/T 32907-2016 Appendix A) ────────
const SBOX = new Uint8Array([
    0xD6, 0x90, 0xE9, 0xFE, 0xCC, 0xE1, 0x3D, 0xB7, 0x16, 0xB6, 0x14, 0xC2, 0x28, 0xFB, 0x2C, 0x05,
    0x2B, 0x67, 0x9A, 0x76, 0x2A, 0xBE, 0x04, 0xC3, 0xAA, 0x44, 0x13, 0x26, 0x49, 0x86, 0x06, 0x99,
    0x9C, 0x42, 0x50, 0xF4, 0x91, 0xEF, 0x98, 0x7A, 0x33, 0x54, 0x0B, 0x43, 0xED, 0xCF, 0xAC, 0x62,
    0xE4, 0xB3, 0x1C, 0xA9, 0xC9, 0x08, 0xE8, 0x95, 0x80, 0xDF, 0x94, 0xFA, 0x75, 0x8F, 0x3F, 0xA6,
    0x47, 0x07, 0xA7, 0xFC, 0xF3, 0x73, 0x17, 0xBA, 0x83, 0x59, 0x3C, 0x19, 0xE6, 0x85, 0x4F, 0xA8,
    0x68, 0x6B, 0x81, 0xB2, 0x71, 0x64, 0xDA, 0x8B, 0xF8, 0xEB, 0x0F, 0x4B, 0x70, 0x56, 0x9D, 0x35,
    0x1E, 0x24, 0x0E, 0x5E, 0x63, 0x58, 0xD1, 0xA2, 0x25, 0x22, 0x7C, 0x3B, 0x01, 0x21, 0x78, 0x87,
    0xD4, 0x00, 0x46, 0x57, 0x9F, 0xD3, 0x27, 0x52, 0x4C, 0x36, 0x02, 0xE7, 0xA0, 0xC4, 0xC8, 0x9E,
    0xEA, 0xBF, 0x8A, 0xD2, 0x40, 0xC7, 0x38, 0xB5, 0xA3, 0xF7, 0xF2, 0xCE, 0xF9, 0x61, 0x15, 0xA1,
    0xE0, 0xAE, 0x5D, 0xA4, 0x9B, 0x34, 0x1A, 0x55, 0xAD, 0x93, 0x32, 0x30, 0xF5, 0x8C, 0xB1, 0xE3,
    0x1D, 0xF6, 0xE2, 0x2E, 0x82, 0x66, 0xCA, 0x60, 0xC0, 0x29, 0x23, 0xAB, 0x0D, 0x53, 0x4E, 0x6F,
    0xD5, 0xDB, 0x37, 0x45, 0xDE, 0xFD, 0x8E, 0x2F, 0x03, 0xFF, 0x6A, 0x72, 0x6D, 0x6C, 0x5B, 0x51,
    0x8D, 0x1B, 0xAF, 0x92, 0xBB, 0xDD, 0xBC, 0x7F, 0x11, 0xD9, 0x5C, 0x41, 0x1F, 0x10, 0x5A, 0xD8,
    0x0A, 0xC1, 0x31, 0x88, 0xA5, 0xCD, 0x7B, 0xBD, 0x2D, 0x74, 0xD0, 0x12, 0xB8, 0xE5, 0xB4, 0xB0,
    0x89, 0x69, 0x97, 0x4A, 0x0C, 0x96, 0x77, 0x7E, 0x65, 0xB9, 0xF1, 0x09, 0xC5, 0x6E, 0xC6, 0x84,
    0x18, 0xF0, 0x7D, 0xEC, 0x3A, 0xDC, 0x4D, 0x20, 0x79, 0xEE, 0x5F, 0x3E, 0xD7, 0xCB, 0x39, 0x48,
])

// ── FK system parameters (4 words, GB/T 32907-2016 §7.3) ────────────────────
const FK = new Uint32Array([0xA3B1BAC6, 0x56AA3350, 0x677D9197, 0xB27022DC])

// ── CK round constants: CK[i][j] = (4i+j)*7 mod 256, packed as big-endian u32
const CK = new Uint32Array([
    0x00070E15, 0x1C232A31, 0x383F464D, 0x545B6269,
    0x70777E85, 0x8C939AA1, 0xA8AFB6BD, 0xC4CBD2D9,
    0xE0E7EEF5, 0xFC030A11, 0x181F262D, 0x343B4249,
    0x50575E65, 0x6C737A81, 0x888F969D, 0xA4ABB2B9,
    0xC0C7CED5, 0xDCE3EAF1, 0xF8FF060D, 0x141B2229,
    0x30373E45, 0x4C535A61, 0x686F767D, 0x848B9299,
    0xA0A7AEB5, 0xBCC3CAD1, 0xD8DFE6ED, 0xF4FB0209,
    0x10171E25, 0x2C333A41, 0x484F565D, 0x646B7279,
])

// ── helpers ──────────────────────────────────────────────────────────────────
function u32(n: number): number { return n >>> 0 }

function rotl32(x: number, n: number): number {
    return u32((x << n) | (x >>> (32 - n)))
}

/** τ: byte-wise S-box substitution on a 32-bit word */
function tau(A: number): number {
    return (
        (SBOX[(A >>> 24) & 0xff] << 24) |
        (SBOX[(A >>> 16) & 0xff] << 16) |
        (SBOX[(A >>> 8) & 0xff] << 8) |
        SBOX[A & 0xff]
    ) >>> 0
}

/** L: linear transform for data encryption */
function L(B: number): number {
    return u32(B ^ rotl32(B, 2) ^ rotl32(B, 10) ^ rotl32(B, 18) ^ rotl32(B, 24))
}

/** L': linear transform for key expansion */
function Lprime(B: number): number {
    return u32(B ^ rotl32(B, 13) ^ rotl32(B, 23))
}

/** T transform for data (round function component) */
function T(A: number): number { return L(tau(A)) }

/** T' transform for key expansion */
function Tprime(A: number): number { return Lprime(tau(A)) }

function bytesToU32BE(b: Uint8Array, off: number): number {
    return u32(((b[off] << 24) | (b[off + 1] << 16) | (b[off + 2] << 8) | b[off + 3]))
}

function u32ToBytesBE(n: number, out: Uint8Array, off: number): void {
    out[off] = (n >>> 24) & 0xff
    out[off + 1] = (n >>> 16) & 0xff
    out[off + 2] = (n >>> 8) & 0xff
    out[off + 3] = n & 0xff
}

function parseHex(s: string, label: string): Uint8Array {
    const c = s.replace(/\s+/g, '').toLowerCase()
    if (!/^[0-9a-f]+$/.test(c) || c.length % 2 !== 0) {
        throw new CipherError('INVALID_INPUT', `${label} must be a hex string.`)
    }
    const out = new Uint8Array(c.length / 2)
    for (let i = 0; i < out.length; i++) out[i] = parseInt(c.slice(i * 2, i * 2 + 2), 16)
    return out
}

function toHex(b: Uint8Array): string {
    return Array.from(b).map((x) => x.toString(16).padStart(2, '0')).join('')
}

// ── Key expansion: 128-bit key → 32 round keys ───────────────────────────────
function keyExpansion(keyBytes: Uint8Array): Uint32Array {
    const MK = new Uint32Array(4)
    for (let i = 0; i < 4; i++) MK[i] = bytesToU32BE(keyBytes, i * 4)

    const K = new Uint32Array(4)
    for (let i = 0; i < 4; i++) K[i] = u32(MK[i] ^ FK[i])

    const rk = new Uint32Array(32)
    for (let i = 0; i < 32; i++) {
        rk[i] = u32(K[i & 3] ^ Tprime(u32(K[(i + 1) & 3] ^ K[(i + 2) & 3] ^ K[(i + 3) & 3] ^ CK[i])))
        K[i & 3] = rk[i]
    }
    return rk
}

// ── Single 16-byte block (ECB) ────────────────────────────────────────────────
function sm4Block(rk: Uint32Array, block: Uint8Array, reverse: boolean): Uint8Array {
    const X = new Uint32Array(4)
    for (let i = 0; i < 4; i++) X[i] = bytesToU32BE(block, i * 4)

    for (let i = 0; i < 32; i++) {
        const ki = reverse ? rk[31 - i] : rk[i]
        const tmp = u32(X[0] ^ T(u32(X[1] ^ X[2] ^ X[3] ^ ki)))
        X[0] = X[1]; X[1] = X[2]; X[2] = X[3]; X[3] = tmp
    }

    const out = new Uint8Array(16)
    // Output is (X3, X2, X1, X0) — reverse transform
    u32ToBytesBE(X[3], out, 0)
    u32ToBytesBE(X[2], out, 4)
    u32ToBytesBE(X[1], out, 8)
    u32ToBytesBE(X[0], out, 12)
    return out
}

// ── Core driver ──────────────────────────────────────────────────────────────
function sm4Core(
    input: string,
    key: string,
    reverse: boolean,
    instrument: boolean,
): CipherResult {
    const start = performance.now()
    validateKey(key)
    const keyBytes = parseHex(key, 'SM4 key')
    if (keyBytes.length !== 16) {
        throw new CipherError('INVALID_KEY_LENGTH', `SM4 requires exactly a 128-bit (16-byte) key. Got ${keyBytes.length} bytes.`)
    }
    const inBytes = parseHex(input, 'SM4 input')
    if (inBytes.length === 0 || inBytes.length % 16 !== 0) {
        throw new CipherError('INVALID_INPUT', `SM4 input must be a non-empty multiple of 16 bytes. Got ${inBytes.length} bytes.`)
    }

    const rk = keyExpansion(keyBytes)
    const numBlocks = inBytes.length / 16
    const outBuf = new Uint8Array(inBytes.length)
    const steps: CipherStep[] = []

    if (instrument) {
        const rkHex = Array.from(rk).map((w) => w.toString(16).padStart(8, '0')).join(' ')
        steps.push({
            index: 0,
            label: 'Key expansion',
            inputState: toHex(keyBytes),
            outputState: rkHex.slice(0, 80) + '…',
            note: `128-bit key XORed with FK[0..3], then 32 T′ applications produce 32 round keys (each 32-bit). Decrypt uses the same keys in reverse order.`,
            isMilestone: true,
        })
    }

    for (let b = 0; b < numBlocks; b++) {
        const blockIn = inBytes.slice(b * 16, b * 16 + 16)
        const blockOut = sm4Block(rk, blockIn, reverse)
        outBuf.set(blockOut, b * 16)
        if (instrument) {
            steps.push({
                index: steps.length,
                label: `Block ${b + 1}/${numBlocks} — 32 rounds`,
                inputState: toHex(blockIn),
                outputState: toHex(blockOut),
                note: `Each of the 32 rounds: tmp = X0 ⊕ T(X1⊕X2⊕X3⊕RK[i]); shift X left; X3=tmp. Output is (X3,X2,X1,X0).`,
                isMilestone: true,
                sboxInspection: {
                    family: 'sm4',
                    inputValue: `0x${blockIn[0].toString(16).padStart(2, '0')}`,
                },
            })
        }
    }

    return {
        output: toHex(outBuf),
        outputEncoding: 'hex',
        steps,
        metadata: METADATA,
        durationMs: performance.now() - start,
    }
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
    return sm4Core(input, key, false, !!options.instrument)
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
    return sm4Core(input, key, true, !!options.instrument)
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
        input: '0123456789abcdeffedcba9876543210',
        key: '0123456789abcdeffedcba9876543210',
        expected: '681edf34d206965e86b3e94f536e4246',
        description: 'Official GB/T 32907-2016 test vector',
    },
]
