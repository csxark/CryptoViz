/**
 * Kuznyechik — GOST R 34.12-2015 (RFC 7801).
 * Russian national block cipher replacing the 1989 GOST.
 * 128-bit block, 256-bit key, 9-round SPN with a fixed 256-byte S-box (Pi)
 * and a linear transformation (l) built from 16 rounds of GF(2^8) multiply-accumulate.
 *
 * Test vector (RFC 7801 Section 5.1):
 * key = 8899aabbccddeeff0011223344556677fedcba98765432100123456789abcdef
 * pt  = 1122334455667700ffeeddccbbaa9988
 * ct  = 7f679d90bebc24305a468d42b9d4edcd
 */
import type { CipherResult, CipherStep, CipherOptions, TestVector, CipherMetadata } from '../types'
import { CipherError, validateInput, validateKey } from '../../utils'

const METADATA: CipherMetadata = {
    name: 'Kuznyechik',
    keySize: 256,
    blockSize: 128,
    rounds: 9,
    securityStatus: 'secure',
    breakingComplexity: 'No practical attacks; Russian government standard.',
    yearDesigned: 2015,
    standardBody: 'GOST R 34.12-2015; RFC 7801',
}

type Bytes = Uint8Array<ArrayBufferLike>

// ── Pi S-box (RFC 7801 Section 4.1) ──────────────────────────────────────────
const Pi: number[] = [
    252, 238, 221, 17, 207, 110, 49, 22, 251, 196, 250, 218, 35, 197, 4, 77, 233, 119, 240, 219, 147, 46,
    153, 186, 23, 54, 241, 187, 20, 205, 95, 193, 249, 24, 101, 90, 226, 92, 239, 33, 129, 28, 60, 66,
    139, 1, 142, 79, 5, 132, 2, 174, 227, 106, 143, 160, 6, 11, 237, 152, 127, 212, 211, 31, 235, 52,
    44, 81, 234, 200, 72, 171, 242, 42, 104, 162, 253, 58, 206, 204, 181, 112, 14, 86, 8, 12, 118, 18,
    191, 114, 19, 71, 156, 183, 93, 135, 21, 161, 150, 41, 16, 123, 154, 199, 243, 145, 120, 111, 157, 158,
    178, 177, 50, 117, 25, 61, 255, 53, 138, 126, 109, 84, 198, 128, 195, 189, 13, 87, 223, 245, 36, 169,
    62, 168, 67, 201, 215, 121, 214, 246, 124, 34, 185, 3, 224, 15, 236, 222, 122, 148, 176, 188, 220, 232,
    40, 80, 78, 51, 10, 74, 167, 151, 96, 115, 30, 0, 98, 68, 26, 184, 56, 130, 100, 159, 38, 65,
    173, 69, 70, 146, 39, 94, 85, 47, 140, 163, 165, 125, 105, 213, 149, 59, 7, 88, 179, 64, 134, 172,
    29, 247, 48, 55, 107, 228, 136, 217, 231, 137, 225, 27, 131, 73, 76, 63, 248, 254, 141, 83, 170, 144,
    202, 216, 133, 97, 32, 113, 103, 164, 45, 43, 9, 91, 203, 155, 37, 208, 190, 229, 108, 82, 89, 166,
    116, 210, 230, 244, 180, 192, 209, 102, 175, 194, 57, 75, 99, 182
]

const Pi_inv = new Array(256).fill(0)
for (let i = 0; i < 256; i++) Pi_inv[Pi[i]] = i

// ── GF(2^8) arithmetic ───────────────────────────────────────────────────────
// Polynomial: x^8 + x^7 + x^6 + x + 1 (0x1C3)
function gfMul(a: number, b: number): number {
    let p = 0
    let aa = a & 0xff
    let bb = b & 0xff
    for (let i = 0; i < 8; i++) {
        if (bb & 1) p ^= aa
        const carry = aa & 0x80
        aa = (aa << 1) & 0xff
        if (carry) aa ^= 0xC3
        bb >>= 1
    }
    return p & 0xff
}

// ── Linear Transformation Constants (l-function) ─────────────────────────────
const K_C: number[] = [148, 32, 133, 16, 194, 192, 1, 251, 1, 192, 194, 16, 133, 32, 148, 1]

function l_transform(state: Bytes): number {
    let val = 0
    for (let i = 0; i < 16; i++) {
        val ^= gfMul(state[i], K_C[i])
    }
    return val
}

function R(state: Bytes): Bytes {
    const out = new Uint8Array(16)
    out[0] = l_transform(state)
    for (let i = 1; i < 16; i++) out[i] = state[i - 1]
    return out
}

function R_inv(state: Bytes): Bytes {
    const out: Bytes = new Uint8Array(16)
    for (let i = 0; i < 15; i++) out[i + 1] = state[i]
    out[0] = state[15]
    out[15] = l_transform(out)
    return out
}

function L(state: Bytes): Bytes {
    let s: Bytes = Uint8Array.from(state)
    for (let i = 0; i < 16; i++) s = R(s)
    return s
}

function L_inv(state: Bytes): Bytes {
    let s: Bytes = Uint8Array.from(state)
    for (let i = 0; i < 16; i++) s = R_inv(s)
    return s
}

function S(state: Bytes): Bytes {
    const out = new Uint8Array(16)
    for (let i = 0; i < 16; i++) out[i] = Pi[state[i]]
    return out
}

function S_inv(state: Bytes): Bytes {
    const out: Bytes = new Uint8Array(16)
    for (let i = 0; i < 16; i++) out[i] = Pi_inv[state[i]]
    return out
}

function X(a: Bytes, b: Bytes): Bytes {
    const out = new Uint8Array(16)
    for (let i = 0; i < 16; i++) out[i] = a[i] ^ b[i]
    return out
}

function parseHex(s: string, lbl: string): Bytes {
    const c = s.replace(/\s+/g, '').toLowerCase()
    if (!/^[0-9a-f]*$/.test(c) || c.length % 2 !== 0) throw new CipherError('INVALID_INPUT', `${lbl} must be hex.`)
    const o: Bytes = new Uint8Array(c.length / 2)
    for (let i = 0; i < o.length; i++) o[i] = parseInt(c.slice(i * 2, i * 2 + 2), 16)
    return o
}

function toHex(b: Bytes): string {
    return Array.from(b).map(x => x.toString(16).padStart(2, '0')).join('')
}

// ── Key Schedule ─────────────────────────────────────────────────────────────
function keySchedule(keyBytes: Bytes): Bytes[] {
    const roundKeys: Bytes[] = []
    const k1: Bytes = keyBytes.slice(0, 16)
    const k2: Bytes = keyBytes.slice(16, 32)
    roundKeys.push(k1)
    roundKeys.push(k2)

    let a: Bytes = Uint8Array.from(k1)
    let b: Bytes = Uint8Array.from(k2)

    // Iteration constants C_i = l(i)
    const C: Bytes[] = new Array(32)
    for (let i = 1; i <= 32; i++) {
        const tmp: Bytes = new Uint8Array(16)
        tmp[15] = i
        C[i - 1] = L(tmp)
    }

    for (let iter = 1; iter <= 4; iter++) {
        for (let j = 1; j <= 8; j++) {
            const cIdx = 8 * (iter - 1) + j - 1
            const tmp = X(a, C[cIdx])
            const sOut = S(tmp)
            const lOut = L(sOut)
            const newB = X(b, lOut)
            a = newB
            b = new Uint8Array(tmp) // swap halves
            // Wait, Feistel round: left_new = right_old, right_new = left_old ^ F(right_old)
            // Let's correct Feistel:
        }
        // The Feistel loop above has a logic flaw in my draft. Let's do it cleanly:
    }

    // Clean Feistel expansion:
    const keys: Bytes[] = [new Uint8Array(k1), new Uint8Array(k2)]
    for (let iter = 1; iter <= 4; iter++) {
        let left: Bytes = new Uint8Array(keys[keys.length - 2])
        let right: Bytes = new Uint8Array(keys[keys.length - 1])
        for (let j = 1; j <= 8; j++) {
            const cIdx = 8 * (iter - 1) + j - 1
            const f_in: Bytes = X(right, C[cIdx])
            const f_out: Bytes = L(S(f_in))
            const newRight: Bytes = X(left, f_out)
            left = right
            right = newRight
        }
        keys.push(left)
        keys.push(right)
    }
    return keys.slice(0, 10)
}

function kuznyechikEncrypt(block: Bytes, roundKeys: Bytes[]): Bytes {
    let state: Bytes = new Uint8Array(block)
    // 9 rounds of (XOR K) -> S -> L
    for (let r = 0; r < 9; r++) {
        state = X(state, roundKeys[r])
        state = S(state)
        state = L(state)
    }
    // Final XOR with K_10
    state = X(state, roundKeys[9])
    return state
}

function kuznyechikDecrypt(block: Bytes, roundKeys: Bytes[]): Bytes {
    let state: Bytes = new Uint8Array(block)
    state = X(state, roundKeys[9])
    for (let r = 8; r >= 0; r--) {
        state = L_inv(state)
        state = S_inv(state)
        state = X(state, roundKeys[r])
    }
    return state
}

function kuznyechikCore(input: string, key: string, doDecrypt: boolean, instrument: boolean): CipherResult {
    const start = performance.now()
    validateKey(key)
    const keyBytes = parseHex(key, 'Kuznyechik key')
    if (keyBytes.length !== 32) {
        throw new CipherError('INVALID_KEY_LENGTH', `Kuznyechik key must be 256 bits (64 hex chars).`)
    }
    const inBytes = parseHex(input, 'Kuznyechik input')
    if (inBytes.length === 0 || inBytes.length % 16 !== 0) {
        throw new CipherError('INVALID_INPUT', `Kuznyechik input must be a non-empty multiple of 16 bytes.`)
    }

    const roundKeys = keySchedule(keyBytes)
    const numBlocks = inBytes.length / 16
    const outBuf = new Uint8Array(inBytes.length)
    const steps: CipherStep[] = []

    if (instrument) {
        steps.push({
            index: 0,
            label: 'Key schedule',
            inputState: toHex(keyBytes),
            outputState: `10 round keys K[1..10]`,
            note: `Feistel-network-based key expansion using 32 iteration constants C_i = l(i).`,
            isMilestone: true,
        })
    }

    for (let b = 0; b < numBlocks; b++) {
        const blockIn = inBytes.slice(b * 16, b * 16 + 16)
        const blockOut = doDecrypt ? kuznyechikDecrypt(blockIn, roundKeys) : kuznyechikEncrypt(blockIn, roundKeys)
        outBuf.set(blockOut, b * 16)
        if (instrument) {
            steps.push({
                index: steps.length,
                label: `Block ${b + 1}/${numBlocks} — 9 rounds`,
                inputState: toHex(blockIn),
                outputState: toHex(blockOut),
                note: `Each round: XOR round key -> Pi S-box substitution -> l linear transform (16x GF(2^8) R-transforms).`,
                isMilestone: true,
            })
        }
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
    return kuznyechikCore(input, key, false, !!options.instrument)
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
    return kuznyechikCore(input, key, true, !!options.instrument)
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
        input: '1122334455667700ffeeddccbbaa9988',
        key: '8899aabbccddeeff0011223344556677fedcba98765432100123456789abcdef',
        expected: '7f679d90bebc24305a468d42b9d4edcd',
        description: 'RFC 7801 Section 5.1',
    }
]
