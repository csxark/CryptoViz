/**
 * Streebog-256 — GOST R 34.11-2012 (RFC 6986).
 * Russian national hash function. 512-bit internal state, Miyaguchi-Preneel-like
 * compression using a 12-round Kuznyechik-family SPN.
 *
 * Test vector (RFC 6986 Section 10.1.2):
 * M1 = 3231303938373635343332313039383736353433323130393837363534333231
 *      30393837363534333231303938373635343332313039383736353433323130 (252 bits)
 * Hash = 00557be5e584fd52a449b16b0251d05d27f94ab76cbaa6da890b59d8ef1e159d
 */
import type { CipherResult, CipherStep, CipherOptions, TestVector, CipherMetadata } from '../types'
import { CipherError } from '../../utils'
import { validateHashInput } from './sha256'

const METADATA: CipherMetadata = {
    name: 'Streebog-256',
    blockSize: 512,
    securityStatus: 'secure',
    breakingComplexity: 'No practical attacks; Russian government standard.',
    yearDesigned: 2012,
    standardBody: 'GOST R 34.11-2012; RFC 6986',
}

type Bytes = Uint8Array<ArrayBufferLike>

// ── Shared Pi S-box with Kuznyechik ──────────────────────────────────────────
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

// ── Streebog Tau Byte Permutation ────────────────────────────────────────────
const Tau: number[] = [
    0, 8, 16, 24, 32, 40, 48, 56, 1, 9, 17, 25, 33, 41, 49, 57,
    2, 10, 18, 26, 34, 42, 50, 58, 3, 11, 19, 27, 35, 43, 51, 59,
    4, 12, 20, 28, 36, 44, 52, 60, 5, 13, 21, 29, 37, 45, 53, 61,
    6, 14, 22, 30, 38, 46, 54, 62, 7, 15, 23, 31, 39, 47, 55, 63
]

// ── Streebog 64x64 L-transform Matrix A (16 strings of 64 hex digits) ────────
const A_rows_str: string[] = [
    "8e20faa72ba0b470", "47107ddd9b505a38", "ad08b0e0c3282d1c", "d8045870ef14980e",
    "6c022c38f90a4c07", "3601161cf205268d", "1b8e0b0e798c13c8", "83478b07b2468764",
    "a011d380818e8f40", "5086e740ce47c920", "2843fd2067adea10", "14aff010bdd87508",
    "0ad97808d06cb404", "05e23c0468365a02", "8c711e02341b2d01", "46b60f011a83988e",
    "90dab52a387ae76f", "486dd4151c3dfdb9", "24b86a840e90f0d2", "125c354207487869",
    "092e94218d243cba", "8a174a9ec8121e5d", "4585254f64090fa0", "accc9ca9328a8950",
    "9d4df05d5f661451", "c0a878a0a1330aa6", "60543c50de970553", "302a1e286fc58ca7",
    "18150f14b9ec46dd", "0c84890ad27623e0", "0642ca05693b9f70", "0321658cba93c138",
    "86275df09ce8aaa8", "439da0784e745554", "afc0503c273aa42a", "d960281e9d1d5215",
    "e230140fc0802984", "71180a8960409a42", "b60c05ca30204d21", "5b068c651810a89e",
    "456c34887a3805b9", "ac361a443d1c8cd2", "561b0d22900e4669", "2b838811480723ba",
    "9bcf4486248d9f5d", "c3e9224312c8c1a0", "effa11af0964ee50", "f97d86d98a327728",
    "e4fa2054a80b329c", "727d102a548b194e", "39b008152acb8227", "9258048415eb419d",
    "492c024284fbaec0", "aa16012142f35760", "550b8e9e21f7a530", "a48b474f9ef5dc18",
    "70a6a56e2440598e", "3853dc371220a247", "1ca76e95091051ad", "0edd37c48a08a6d8",
    "07e095624504536c", "8d70c431ac02a736", "c83862965601dd1b", "641c314b2b8ee083"
]
const A_rows: bigint[] = A_rows_str.map(h => BigInt('0x' + h))

function l_word(b: Uint8Array, offset: number): bigint {
    // Read 8 bytes as Big Endian 64-bit BigInt
    let b_val = 0n
    for (let j = 0; j < 8; j++) {
        b_val |= BigInt(b[offset + j]) << BigInt((7 - j) * 8)
    }
    let c_val = 0n
    for (let j = 0; j < 64; j++) {
        if ((b_val >> BigInt(63 - j)) & 1n) {
            c_val ^= A_rows[j]
        }
    }
    return c_val
}

function S(state: Bytes): Bytes {
    const out: Bytes = new Uint8Array(64)
    for (let i = 0; i < 64; i++) out[i] = Pi[state[i]]
    return out
}

function P(state: Bytes): Bytes {
    const out: Bytes = new Uint8Array(64)
    for (let i = 0; i < 64; i++) out[i] = state[Tau[i]]
    return out
}

function L(state: Bytes): Bytes {
    const out: Bytes = new Uint8Array(64)
    for (let i = 0; i < 8; i++) {
        const offset = i * 8
        const c_val = l_word(state, offset)
        for (let j = 0; j < 8; j++) {
            out[offset + j] = Number((c_val >> BigInt((7 - j) * 8)) & 0xFFn)
        }
    }
    return out
}

function X(a: Bytes, b: Bytes): Bytes {
    const out: Bytes = new Uint8Array(64)
    for (let i = 0; i < 64; i++) out[i] = a[i] ^ b[i]
    return out
}

// ── Iteration Constants C[1..12] ─────────────────────────────────────────────
const C_iter_str: string[] = [
    "b1085bda1ecadae9ebcb2f81c0657c1f2f6a76432e45d016714eb88d7585c4fc4b7ce09192676901a2422a08a460d31505767436cc744d23dd806559f2a64507",
    "6fa3b58aa99d2f1a4fe39d460f70b5d7f3feea720a232b9861d55e0f16b501319ab5176b12d699585cb561c2db0aa7ca55dda21bd7cbcd56e679047021b19bb7",
    "f574dcac2bce2fc70a39fc286a3d843506f15e5f529c1f8bf2ea7514b1297b7bd3e20fe490359eb1c1c93a376062db09c2b6f443867adb31991e96f50aba0ab2",
    "ef1fdfb3e81566d2f948e1a05d71e4dd488e857e335c3c7d9d721cad685e353fa9d72c82ed03d675d8b71333935203be3453eaa193e837f1220cbebc84e3d12e",
    "4bea6bacad4747999a3f410c6ca923637f151c1f1686104a359e35d7800fffbbfcd1747253af5a3dfff00b723271a167a56a27ea9ea63f5601758fd7c6cfe57",
    "ae4faeae1d3ad3d96fa4c33b7a3039c02d66c4f95142a46c187f9ab49af08ec6cffaa6b71c9ab7b40af21f66c2bec6b6bf71c57236904f35fa68407a46647d6e",
    "f4c70e16eeaac5ec51ac86febf240954399ec6c7e6bf87c9d3473e33197a93c90992abc52d822c3706476983284a05043517454ca23c4af38886564d3a14d493",
    "9b1f5b424d93c9a703e7aa020c6e41414eb7f8719c36de1e89b4443b4ddbc49af4892bcb929b069069d18d2bd1a5c42f36acc2355951a8d9a47f0dd4bf02e71e",
    "378f5a541631229b944c9ad8ec165fde3a7d3a1b258942243cd955b7e00d0984800a440bdbb2ceb17b2b8a9aa6079c540e38dc92cb1f2a607261445183235adb",
    "abbedea680056f52382ae548b2e4f3f38941e71cff8a78db1fffe18a1b3361039fe76702af69334b7a1e6c303b7652f43698fad1153bb6c374b4c7fb98459ced",
    "7bcd9ed0efc889fb3002c6cd635afe94d8fa6bbbebab076120018021148466798a1d71efea48b9caefbacd1d7d476e98dea2594ac06fd85d6bcaa4cd81f32d1b",
    "378ee767f11631bad21380b00449b17acda43c32bcdf1d77f82012d430219f9b5d80ef9d1891cc86e71da4aa88e12852faf417d5d9b21b9948bc924af11bd720"
]
const C_iter: Bytes[] = C_iter_str.map(h => {
    const arr: Bytes = new Uint8Array(64)
    for (let i = 0; i < 64; i++) arr[i] = parseInt(h.slice(i * 2, i * 2 + 2), 16)
    return arr
})

// ── 12-round Key Schedule for E ──────────────────────────────────────────────
function E_KeySchedule(K: Bytes): Bytes[] {
    const keys: Bytes[] = [new Uint8Array(K)]
    let curr: Bytes = new Uint8Array(K)
    for (let i = 0; i < 12; i++) {
        curr = L(P(S(X(curr, C_iter[i]))))
        keys.push(new Uint8Array(curr))
    }
    return keys // Returns 13 keys: K[1]..K[13]
}

function E_Encrypt(keys: Bytes[], m: Bytes): Bytes {
    let state: Bytes = new Uint8Array(m)
    for (let i = 1; i <= 12; i++) {
        state = X(state, keys[i - 1]) // keys[0] is K[1]
        state = L(P(S(state)))
    }
    state = X(state, keys[12]) // K[13]
    return state
}

function g_N(h: Bytes, m: Bytes, N: Bytes): Bytes {
    const K_base = X(h, N)
    const K = L(P(S(K_base)))
    const keys = E_KeySchedule(K)
    const E_out = E_Encrypt(keys, m)
    return X(X(E_out, h), m)
}

// ── 512-bit addition (mod 2^512) ─────────────────────────────────────────────
function add512(a: Bytes, b: Bytes): Bytes {
    // We use BigInt for simple 512-bit addition
    let a_val = 0n
    let b_val = 0n
    for (let i = 0; i < 64; i++) {
        a_val |= BigInt(a[i]) << BigInt((63 - i) * 8)
        b_val |= BigInt(b[i]) << BigInt((63 - i) * 8)
    }
    let sum = (a_val + b_val) & ((1n << 512n) - 1n)
    const out = new Uint8Array(64)
    for (let i = 0; i < 64; i++) {
        out[i] = Number((sum >> BigInt((63 - i) * 8)) & 0xFFn)
    }
    return out
}

function parseHex(s: string, lbl: string): Bytes {
    const c = s.replace(/\s+/g, '').toLowerCase()
    if (!/^[0-9a-f]*$/.test(c) || c.length % 2 !== 0) throw new CipherError('INVALID_INPUT', `${lbl} must be hex.`)
    const o = new Uint8Array(c.length / 2)
    for (let i = 0; i < o.length; i++) o[i] = parseInt(c.slice(i * 2, i * 2 + 2), 16)
    return o
}

function toHex(b: Bytes): string {
    return Array.from(b).map(x => x.toString(16).padStart(2, '0')).join('')
}

function streebogCore(input: string, instrument: boolean): CipherResult {
    const start = performance.now()
    const inBytes = parseHex(input, 'Streebog input')

    let h: Bytes = new Uint8Array(64)
    // Streebog-256 IV is (00000001)^64 bytes! (i.e. 0x01 for all 64 bytes)
    for (let i = 0; i < 64; i++) h[i] = 0x01

    let N: Bytes = new Uint8Array(64)
    let EPSILON: Bytes = new Uint8Array(64)

    const steps: CipherStep[] = []
    if (instrument) {
        steps.push({
            index: 0,
            label: 'Initialization',
            inputState: '',
            outputState: toHex(h),
            note: `Streebog-256 IV is 64 bytes of 0x01. N=0, EPSILON=0.`,
            isMilestone: true,
        })
    }

    let remaining: Bytes = inBytes
    while (remaining.length >= 64) {
        // Process from the end of the message
        const m: Bytes = remaining.slice(remaining.length - 64)
        remaining = remaining.slice(0, remaining.length - 64)
        h = g_N(h, m, N)

        const lenBlock: Bytes = new Uint8Array(64)
        lenBlock[63] = 0x02 // 512 = 0x200. Big Endian: 64 bytes. The lowest byte is 0x00, next is 0x02.
        // Wait, 512 is 0x0200. In Big Endian, byte 62 is 0x02, byte 63 is 0x00.
        lenBlock[62] = 0x02

        N = add512(N, lenBlock)
        EPSILON = add512(EPSILON, m)

        if (instrument) {
            steps.push({
                index: steps.length,
                label: `Compression (512-bit block)`,
                inputState: toHex(m),
                outputState: toHex(h),
                note: `g_N(h, m) = E(LPS(h XOR N), m) XOR h XOR m`,
                isMilestone: true,
            })
        }
    }

    // Padding
    const m_last: Bytes = new Uint8Array(64)
    const L = remaining.length
    // m_last = 0...01 || remaining
    // So the last L bytes are the remaining message.
    m_last.set(remaining, 64 - L)
    // The byte before the message is 0x01
    m_last[63 - L] = 0x01

    h = g_N(h, m_last, N)

    const lenLast: Bytes = new Uint8Array(64)
    const bits = L * 8
    lenLast[62] = (bits >> 8) & 0xFF
    lenLast[63] = bits & 0xFF
    N = add512(N, lenLast)
    EPSILON = add512(EPSILON, m_last)

    h = g_N(h, N, new Uint8Array(64) as Bytes)
    h = g_N(h, EPSILON, new Uint8Array(64) as Bytes)

    // Truncate to 256 bits (first 32 bytes of h)
    const finalHash = h.slice(0, 32)

    return { output: toHex(finalHash), outputEncoding: 'hex', steps, metadata: METADATA, durationMs: performance.now() - start }
}

/**
 * Encrypt cryptographic hash export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @param input Input required by the Encrypt operation.
 * @param key Input required by the Encrypt operation.
 * @param options Input required by the Encrypt operation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/46-3/final — FIPS 46-3.
 */
export function encrypt(input: string, key: string = '', options: CipherOptions = {}): CipherResult {
    validateHashInput(input)
    return streebogCore(input, !!options.instrument)
}

// Hashes do not decrypt
/**
 * Decrypt cryptographic hash export.
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
    throw new CipherError('ALGORITHM_UNSUPPORTED', 'Streebog is a hash function and cannot be decrypted.')
}

/**
 * TEST VECTORS cryptographic hash export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/46-3/final — FIPS 46-3.
 */
export const TEST_VECTORS: TestVector[] = [
    {
        input: '323130393837363534333231303938373635343332313039383736353433323130393837363534333231303938373635343332313039383736353433323130',
        key: '',
        expected: '00557be5e584fd52a449b16b0251d05d27f94ab76cbaa6da890b59d8ef1e159d',
        description: 'RFC 6986 Section 10.1.2: M1 (252 bits)',
    }
]
