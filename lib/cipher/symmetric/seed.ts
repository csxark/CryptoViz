/**
 * SEED-128 — KISA / Korea Information Security Agency, 1998.
 * RFC 4269 (2005); ISO/IEC 18033-3. Korean national block cipher.
 * 128-bit block (two 64-bit halves L‖R), 128-bit key, 16-round Feistel.
 * Round function uses the G-function: 4 extended SS-box lookups XOR-mixed
 * (RFC 4269 §2.2), with the subkey mixed in via XOR and modular addition.
 *
 * S-boxes and test vectors from RFC 4269.
 * RFC 4269 test vector (Appendix B.1):
 *   key = 00000000000000000000000000000000
 *   pt  = 00010203040506070809 0a0b0c0d0e0f
 *   ct  = 5ebac6e0054e166819aff1cc6d346cdb
 */

import type { CipherResult, CipherStep, CipherOptions, TestVector, CipherMetadata } from '../types'
import { CipherError, validateInput, validateKey } from '../../utils'

const METADATA: CipherMetadata = {
    name: 'SEED-128',
    keySize: 128,
    blockSize: 128,
    rounds: 16,
    securityStatus: 'legacy',
    breakingComplexity: 'No practical attack; deprecated in Korea in favour of LEA for new systems',
    yearDesigned: 1998,
    standardBody: 'KISA; RFC 4269 (2005); ISO/IEC 18033-3',
}

// ── S-boxes (RFC 4269, Appendix A.1) ─────────────────────────────────────────
// Two 8-bit substitution boxes S0 and S1, 256 entries each.
const S0 = new Uint8Array([
    0xa9, 0x85, 0xd6, 0xd3, 0x54, 0x1d, 0xac, 0x25, 0x5d, 0x43, 0x18, 0x1e, 0x51, 0xfc, 0xca, 0x63,
    0x28, 0x44, 0x20, 0x9d, 0xe0, 0xe2, 0xc8, 0x17, 0xa5, 0x8f, 0x03, 0x7b, 0xbb, 0x13, 0xd2, 0xee,
    0x70, 0x8c, 0x3f, 0xa8, 0x32, 0xdd, 0xf6, 0x74, 0xec, 0x95, 0x0b, 0x57, 0x5c, 0x5b, 0xbd, 0x01,
    0x24, 0x1c, 0x73, 0x98, 0x10, 0xcc, 0xf2, 0xd9, 0x2c, 0xe7, 0x72, 0x83, 0x9b, 0xd1, 0x86, 0xc9,
    0x60, 0x50, 0xa3, 0xeb, 0x0d, 0xb6, 0x9e, 0x4f, 0xb7, 0x5a, 0xc6, 0x78, 0xa6, 0x12, 0xaf, 0xd5,
    0x61, 0xc3, 0xb4, 0x41, 0x52, 0x7d, 0x8d, 0x08, 0x1f, 0x99, 0x00, 0x19, 0x04, 0x53, 0xf7, 0xe1,
    0xfd, 0x76, 0x2f, 0x27, 0xb0, 0x8b, 0x0e, 0xab, 0xa2, 0x6e, 0x93, 0x4d, 0x69, 0x7c, 0x09, 0x0a,
    0xbf, 0xef, 0xf3, 0xc5, 0x87, 0x14, 0xfe, 0x64, 0xde, 0x2e, 0x4b, 0x1a, 0x06, 0x21, 0x6b, 0x66,
    0x02, 0xf5, 0x92, 0x8a, 0x0c, 0xb3, 0x7e, 0xd0, 0x7a, 0x47, 0x96, 0xe5, 0x26, 0x80, 0xad, 0xdf,
    0xa1, 0x30, 0x37, 0xae, 0x36, 0x15, 0x22, 0x38, 0xf4, 0xa7, 0x45, 0x4c, 0x81, 0xe9, 0x84, 0x97,
    0x35, 0xcb, 0xce, 0x3c, 0x71, 0x11, 0xc7, 0x89, 0x75, 0xfb, 0xda, 0xf8, 0x94, 0x59, 0x82, 0xc4,
    0xff, 0x49, 0x39, 0x67, 0xc0, 0xcf, 0xd7, 0xb8, 0x0f, 0x8e, 0x42, 0x23, 0x91, 0x6c, 0xdb, 0xa4,
    0x34, 0xf1, 0x48, 0xc2, 0x6f, 0x3d, 0x2d, 0x40, 0xbe, 0x3e, 0xbc, 0xc1, 0xaa, 0xba, 0x4e, 0x55,
    0x3b, 0xdc, 0x68, 0x7f, 0x9c, 0xd8, 0x4a, 0x56, 0x77, 0xa0, 0xed, 0x46, 0xb5, 0x2b, 0x65, 0xfa,
    0xe3, 0xb9, 0xb1, 0x9f, 0x5e, 0xf9, 0xe6, 0xb2, 0x31, 0xea, 0x6d, 0x5f, 0xe4, 0xf0, 0xcd, 0x88,
    0x16, 0x3a, 0x58, 0xd4, 0x62, 0x29, 0x07, 0x33, 0xe8, 0x1b, 0x05, 0x79, 0x90, 0x6a, 0x2a, 0x9a,
])

const S1 = new Uint8Array([
    0x38, 0xe8, 0x2d, 0xa6, 0xcf, 0xde, 0xb3, 0xb8, 0xaf, 0x60, 0x55, 0xc7, 0x44, 0x6f, 0x6b, 0x5b,
    0xc3, 0x62, 0x33, 0xb5, 0x29, 0xa0, 0xe2, 0xa7, 0xd3, 0x91, 0x11, 0x06, 0x1c, 0xbc, 0x36, 0x4b,
    0xef, 0x88, 0x6c, 0xa8, 0x17, 0xc4, 0x16, 0xf4, 0xc2, 0x45, 0xe1, 0xd6, 0x3f, 0x3d, 0x8e, 0x98,
    0x28, 0x4e, 0xf6, 0x3e, 0xa5, 0xf9, 0x0d, 0xdf, 0xd8, 0x2b, 0x66, 0x7a, 0x27, 0x2f, 0xf1, 0x72,
    0x42, 0xd4, 0x41, 0xc0, 0x73, 0x67, 0xac, 0x8b, 0xf7, 0xad, 0x80, 0x1f, 0xca, 0x2c, 0xaa, 0x34,
    0xd2, 0x0b, 0xee, 0xe9, 0x5d, 0x94, 0x18, 0xf8, 0x57, 0xae, 0x08, 0xc5, 0x13, 0xcd, 0x86, 0xb9,
    0xff, 0x7d, 0xc1, 0x31, 0xf5, 0x8a, 0x6a, 0xb1, 0xd1, 0x20, 0xd7, 0x02, 0x22, 0x04, 0x68, 0x71,
    0x07, 0xdb, 0x9d, 0x99, 0x61, 0xbe, 0xe6, 0x59, 0xdd, 0x51, 0x90, 0xdc, 0x9a, 0xa3, 0xab, 0xd0,
    0x81, 0x0f, 0x47, 0x1a, 0xe3, 0xec, 0x8d, 0xbf, 0x96, 0x7b, 0x5c, 0xa2, 0xa1, 0x63, 0x23, 0x4d,
    0xc8, 0x9e, 0x9c, 0x3a, 0x0c, 0x2e, 0xba, 0x6e, 0x9f, 0x5a, 0xf2, 0x92, 0xf3, 0x49, 0x78, 0xcc,
    0x15, 0xfb, 0x70, 0x75, 0x7f, 0x35, 0x10, 0x03, 0x64, 0x6d, 0xc6, 0x74, 0xd5, 0xb4, 0xea, 0x09,
    0x76, 0x19, 0xfe, 0x40, 0x12, 0xe0, 0xbd, 0x05, 0xfa, 0x01, 0xf0, 0x2a, 0x5e, 0xa9, 0x56, 0x43,
    0x85, 0x14, 0x89, 0x9b, 0xb0, 0xe5, 0x48, 0x79, 0x97, 0xfc, 0x1e, 0x82, 0x21, 0x8c, 0x1b, 0x5f,
    0x77, 0x54, 0xb2, 0x1d, 0x25, 0x4f, 0x00, 0x46, 0xed, 0x58, 0x52, 0xeb, 0x7e, 0xda, 0xc9, 0xfd,
    0x30, 0x95, 0x65, 0x3c, 0xb6, 0xe4, 0xbb, 0x7c, 0x0e, 0x50, 0x39, 0x26, 0x32, 0x84, 0x69, 0x93,
    0x37, 0xe7, 0x24, 0xa4, 0xcb, 0x53, 0x0a, 0x87, 0xd9, 0x4c, 0x83, 0x8f, 0xce, 0x3b, 0x4a, 0xb7,
])

// ── Extended SS-boxes (RFC 4269, Appendix A.2) ───────────────────────────────
// Four 32-bit tables built from S0/S1 with the masks m0..m3 so that
//   G(x) = SS0[X0] ^ SS1[X1] ^ SS2[X2] ^ SS3[X3]  (X3||X2||X1||X0 = x)
// is byte-permuted XOR exactly as defined in RFC 4269 §2.2.
const M0 = 0xfc, M1 = 0xf3, M2 = 0xcf, M3 = 0x3f
const SS0 = new Uint32Array(256)
const SS1 = new Uint32Array(256)
const SS2 = new Uint32Array(256)
const SS3 = new Uint32Array(256)
for (let v = 0; v < 256; v++) {
    const a = S0[v], b = S1[v]
    SS0[v] = u32(((a & M3) << 24) | ((a & M2) << 16) | ((a & M1) << 8) | (a & M0))
    SS1[v] = u32(((b & M0) << 24) | ((b & M3) << 16) | ((b & M2) << 8) | (b & M1))
    SS2[v] = u32(((a & M1) << 24) | ((a & M0) << 16) | ((a & M3) << 8) | (a & M2))
    SS3[v] = u32(((b & M2) << 24) | ((b & M1) << 16) | ((b & M0) << 8) | (b & M3))
}

// ── Key schedule constants (RFC 4269, Section 2.3) ───────────────────────────
const KC = new Uint32Array([
    0x9e3779b9, 0x3c6ef373, 0x78dde6e6, 0xf1bbcdcc,
    0xe3779b99, 0xc6ef3733, 0x8dde6e67, 0x1bbcdccf,
    0x3779b99e, 0x6ef3733c, 0xdde6e678, 0xbbcdccf1,
    0x779b99e3, 0xef3733c6, 0xde6e678d, 0xbcdccf1b,
])

function u32(n: number): number { return n >>> 0 }

// G function: RFC 4269 §2.2 — Z = SS0(X0) ^ SS1(X1) ^ SS2(X2) ^ SS3(X3)
function G(x: number): number {
    return u32(SS0[x & 0xff] ^ SS1[(x >>> 8) & 0xff] ^ SS2[(x >>> 16) & 0xff] ^ SS3[(x >>> 24) & 0xff])
}

// F-function: RFC 4269 §2.1 — 64-bit block (R0, R1) with subkey (K0, K1).
// T = G(A ^ B), g1 = G(T + A) where A = R0 ^ K0, B = R1 ^ K1, and '+' is
// addition mod 2^32.  R0' = G(g1 + T) + g1,  R1' = G(g1 + T).
function F(R0: number, R1: number, K0: number, K1: number): [number, number] {
    const a = u32(R0 ^ K0)
    const b = u32(R1 ^ K1)
    const t = G(u32(a ^ b))
    const g1 = G(u32(t + a))
    const g2 = G(u32(g1 + t))
    return [u32(g2 + g1), g2]
}

// Key schedule: RFC 4269 §2.3 — 128-bit key → 32 round subkeys (16 pairs).
// Ki0 = G(K0 + K2 - KCi), Ki1 = G(K1 - K3 + KCi); odd rounds rotate the
// (K0, K1) pair right by 8 bits, even rounds rotate (K2, K3) left by 8 bits.
function keySchedule(kb: Uint8Array): Uint32Array {
    const T = new Uint32Array(4)
    for (let i = 0; i < 4; i++) T[i] = (kb[i * 4] << 24) | (kb[i * 4 + 1] << 16) | (kb[i * 4 + 2] << 8) | kb[i * 4 + 3]
    const RK = new Uint32Array(32)
    let A = T[0], B = T[1], C = T[2], D = T[3]
    for (let r = 0; r < 16; r++) {
        RK[r * 2] = G(u32(A + C - KC[r]))
        RK[r * 2 + 1] = G(u32(B - D + KC[r]))
        if (r % 2 === 0) {
            const nA = u32((A >>> 8) | (B << 24))
            const nB = u32((B >>> 8) | (A << 24))
            A = nA; B = nB
        } else {
            const nC = u32((C << 8) | (D >>> 24))
            const nD = u32((D << 8) | (C >>> 24))
            C = nC; D = nD
        }
    }
    return RK
}

function readBE32(b: Uint8Array, o: number): number {
    return u32((b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3])
}
function writeBE32(n: number, b: Uint8Array, o: number): void {
    b[o] = (n >> 24) & 0xff; b[o + 1] = (n >> 16) & 0xff; b[o + 2] = (n >> 8) & 0xff; b[o + 3] = n & 0xff
}
function parseHex(s: string, lbl: string): Uint8Array {
    const c = s.replace(/\s+/g, '').toLowerCase()
    if (!/^[0-9a-f]+$/.test(c) || c.length % 2 !== 0) throw new CipherError('INVALID_INPUT', `${lbl} must be hex.`)
    const o = new Uint8Array(c.length / 2)
    for (let i = 0; i < o.length; i++) o[i] = parseInt(c.slice(i * 2, i * 2 + 2), 16)
    return o
}
function toHex(b: Uint8Array): string { return Array.from(b).map(x => x.toString(16).padStart(2, '0')).join('') }

function seedCore(input: string, key: string, dec: boolean, instrument: boolean): CipherResult {
    const t0 = performance.now()
    validateKey(key)
    const kb = parseHex(key, 'SEED key')
    if (kb.length !== 16) throw new CipherError('INVALID_KEY_LENGTH', 'SEED-128 requires 128-bit (16-byte) key.')
    const ib = parseHex(input, 'SEED input')
    if (ib.length === 0 || ib.length % 16 !== 0) throw new CipherError('INVALID_INPUT', 'SEED-128 input must be non-empty multiple of 16 bytes.')
    const RK = keySchedule(kb)
    const nb = ib.length / 16, ob = new Uint8Array(ib.length)
    const steps: CipherStep[] = []
    if (instrument) steps.push({
        index: 0, label: 'Key schedule — 16 pairs of 32-bit round subkeys',
        inputState: toHex(kb), outputState: Array.from(RK.slice(0, 4)).map(w => w.toString(16).padStart(8, '0')).join(' ') + ' …',
        note: 'Per RFC 4269 §2.3: Ki0 = G(A+C-KCi), Ki1 = G(B-D+KCi); odd rounds rotate the (A,B) pair right by 8 bits, even rounds rotate (C,D) left by 8 bits. Produces 16 pairs of 32-bit subkeys.', isMilestone: true
    })
    for (let b = 0; b < nb; b++) {
        const off = b * 16
        let L0 = readBE32(ib, off), L1 = readBE32(ib, off + 4), R0 = readBE32(ib, off + 8), R1 = readBE32(ib, off + 12)
        if (!dec) {
            for (let r = 0; r < 15; r++) {
                const [f0, f1] = F(R0, R1, RK[r * 2], RK[r * 2 + 1])
                const nR0 = u32(L0 ^ f0), nR1 = u32(L1 ^ f1)
                L0 = R0; L1 = R1; R0 = nR0; R1 = nR1
            }
            const [f0, f1] = F(R0, R1, RK[30], RK[31])
            L0 = u32(L0 ^ f0); L1 = u32(L1 ^ f1)
        } else {
            const [h0, h1] = F(R0, R1, RK[30], RK[31])
            L0 = u32(L0 ^ h0); L1 = u32(L1 ^ h1)
            for (let r = 14; r >= 0; r--) {
                const [f0, f1] = F(L0, L1, RK[r * 2], RK[r * 2 + 1])
                const nL0 = u32(R0 ^ f0), nL1 = u32(R1 ^ f1)
                R0 = L0; R1 = L1; L0 = nL0; L1 = nL1
            }
        }
        writeBE32(L0, ob, off); writeBE32(L1, ob, off + 4); writeBE32(R0, ob, off + 8); writeBE32(R1, ob, off + 12)
        if (instrument) steps.push({
            index: steps.length, label: `Block ${b + 1}/${nb} — 16 Feistel rounds`,
            inputState: toHex(ib.slice(off, off + 16)), outputState: toHex(ob.slice(off, off + 16)),
            note: "Rounds 1-15: R = L ^ F(Ki, R), then L = old R (swap). Round 16: L ^= F(K16, R) with no swap. F per RFC 4269 §2.1: T = G((R0^Ki0) ^ (R1^Ki1)); R0' = G(G(T+A)+T) + G(T+A), R1' = G(G(T+A)+T) with A = R0^Ki0 and modular 2^32 additions. G applies SS0/SS1/SS2/SS3 XOR mixing (RFC 4269 §2.2).", isMilestone: true
        })
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
    validateInput(input); return seedCore(input, key, false, !!options.instrument)
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
    validateInput(input); return seedCore(input, key, true, !!options.instrument)
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
        input: '000102030405060708090a0b0c0d0e0f', key: '00000000000000000000000000000000',
        expected: '5ebac6e0054e166819aff1cc6d346cdb',
        description: 'RFC 4269 Appendix B.1 test vector — SEED-128'
    },
    {
        input: '00000000000000000000000000000000', key: '000102030405060708090a0b0c0d0e0f',
        expected: 'c11f22f20140505084483597e4370f43',
        description: 'RFC 4269 Appendix B.2 test vector — SEED-128'
    },
    {
        input: '83a2f8a288641fb9a4e9a5cc2f131c7d', key: '4706480851e61be85d74bfb3fd956185',
        expected: 'ee54d13ebcae706d226bc3142cd40d4a',
        description: 'RFC 4269 Appendix B.3 test vector — SEED-128'
    },
    {
        input: 'b41e6be2eba84a148e2eed84593c5ec7', key: '28dbc3bc49ffd87dcfa509b11d422be7',
        expected: '9b9b7bfcd1813cb95d0b3618f40f5122',
        description: 'RFC 4269 Appendix B.4 test vector — SEED-128'
    },
]
