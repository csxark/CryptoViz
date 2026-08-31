/**
 * Classic McEliece — Code-based Post-Quantum KEM.
 * NIST PQC Finalist. Binary Goppa codes.
 *
 * NOTE: This implementation uses small pedagogical parameters (n=15, k=7, t=2)
 * for visualizer clarity. These parameters are NOT cryptographically secure.
 * Production McEliece requires n >= 3488.
 *
 * Round-trip correctness: deterministic key generation seeded from key string
 * so that encrypt() and decrypt() agree on the same scrambling matrices.
 */
import type { CipherResult, CipherStep, CipherOptions, TestVector, CipherMetadata } from '../types'
import { CipherError, validateInput } from '../../utils'

const METADATA: CipherMetadata = {
    name: 'Classic McEliece',
    securityStatus: 'secure',
    breakingComplexity: 'Pedagogical params (n=15) are insecure; production McEliece (n>=3488) resists quantum attacks.',
    yearDesigned: 1978,
    standardBody: 'NIST PQC Finalist',
}

type Matrix = number[][]

// ---------------------------------------------------------------------------
// Seeded LCG PRNG for deterministic key generation
// ---------------------------------------------------------------------------
function makeLcg(seed: number): () => number {
    let s = seed >>> 0
    return () => {
        s = (Math.imul(1664525, s) + 1013904223) >>> 0
        return s / 0x100000000
    }
}

function seedFromString(key: string): number {
    let h = 0x811c9dc5
    for (let i = 0; i < key.length; i++) {
        h ^= key.charCodeAt(i)
        h = Math.imul(h, 0x01000193) >>> 0
    }
    return h
}

// ---------------------------------------------------------------------------
// GF(2) arithmetic
// ---------------------------------------------------------------------------
function gf2MatMul(A: Matrix, B: Matrix): Matrix {
    const rows = A.length, cols = B[0].length, inner = B.length
    const C: Matrix = Array.from({ length: rows }, () => new Array(cols).fill(0))
    for (let i = 0; i < rows; i++)
        for (let j = 0; j < cols; j++) {
            let sum = 0
            for (let k = 0; k < inner; k++) sum ^= (A[i][k] & B[k][j])
            C[i][j] = sum
        }
    return C
}

function gf2VecMatMul(v: number[], A: Matrix): number[] {
    const cols = A[0].length
    const out: number[] = new Array(cols).fill(0)
    for (let j = 0; j < cols; j++) {
        let sum = 0
        for (let i = 0; i < v.length; i++) sum ^= (v[i] & A[i][j])
        out[j] = sum
    }
    return out
}

function gf2MatVecMul(A: Matrix, v: number[]): number[] {
    const out: number[] = new Array(A.length).fill(0)
    for (let i = 0; i < A.length; i++) {
        let sum = 0
        for (let j = 0; j < v.length; j++) sum ^= (A[i][j] & v[j])
        out[i] = sum
    }
    return out
}

function gf2Inv(A: Matrix): Matrix | null {
    const n = A.length
    const M = A.map((row, i) => [...row, ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))])
    for (let i = 0; i < n; i++) {
        let pivot = i
        while (pivot < n && M[pivot][i] === 0) pivot++
        if (pivot === n) return null
        if (pivot !== i) [M[i], M[pivot]] = [M[pivot], M[i]]
        for (let j = 0; j < n; j++) {
            if (j !== i && M[j][i] === 1)
                for (let k = 0; k < 2 * n; k++) M[j][k] ^= M[i][k]
        }
    }
    return M.map(row => row.slice(n))
}

function randomInvertibleMatrixSeeded(n: number, rng: () => number): Matrix {
    for (let attempt = 0; attempt < 1000; attempt++) {
        const M: Matrix = Array.from({ length: n }, () =>
            Array.from({ length: n }, () => (rng() < 0.5 ? 0 : 1))
        )
        if (gf2Inv(M)) return M
    }
    return Array.from({ length: n }, (_, i) =>
        Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))
    )
}

function randomPermutationMatrixSeeded(n: number, rng: () => number): Matrix {
    const perm = Array.from({ length: n }, (_, i) => i)
    for (let i = n - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [perm[i], perm[j]] = [perm[j], perm[i]]
    }
    return perm.map((_, i) => Array.from({ length: n }, (_, j) => (perm[j] === i ? 1 : 0)))
}

// ---------------------------------------------------------------------------
// Toy Goppa/BCH-like generator matrix G_TOY (k=7, n=15) — systematic [I_k | P]
// ---------------------------------------------------------------------------
const K = 7
const N = 15
const T = 2

const G_TOY: Matrix = [
    [1, 0, 0, 0, 0, 0, 0,  1, 1, 0, 1, 0, 0, 0, 1],
    [0, 1, 0, 0, 0, 0, 0,  0, 1, 1, 0, 1, 0, 0, 1],
    [0, 0, 1, 0, 0, 0, 0,  0, 0, 1, 1, 0, 1, 0, 1],
    [0, 0, 0, 1, 0, 0, 0,  0, 0, 0, 1, 1, 0, 1, 1],
    [0, 0, 0, 0, 1, 0, 0,  1, 0, 0, 0, 1, 1, 0, 0],
    [0, 0, 0, 0, 0, 1, 0,  0, 1, 0, 0, 0, 1, 1, 0],
    [0, 0, 0, 0, 0, 0, 1,  0, 0, 1, 0, 0, 0, 1, 1],
]

// Parity-check matrix H_TOY: H·c=0 for every codeword c. H=[P^T | I_{n-k}]
const H_TOY: Matrix = (() => {
    const nk = N - K
    const Pt = Array.from({ length: nk }, (_, i) =>
        Array.from({ length: K }, (_, j) => G_TOY[j][K + i])
    )
    const Ink = Array.from({ length: nk }, (_, i) =>
        Array.from({ length: nk }, (_, j) => (i === j ? 1 : 0))
    )
    return Pt.map((row, i) => [...row, ...Ink[i]])
})()

// ---------------------------------------------------------------------------
// Key generation (seeded for determinism)
// ---------------------------------------------------------------------------
interface McElieceKeys {
    G_pub: Matrix   // Scrambled generator matrix G' = S * G_TOY * P
    S_inv: Matrix   // S^{-1}
    P_inv: Matrix   // P^T (= P^{-1} for permutation matrices)
}

function generateKeys(key: string): McElieceKeys {
    const rng = makeLcg(seedFromString(key))
    const S = randomInvertibleMatrixSeeded(K, rng)
    const S_inv = gf2Inv(S)!
    const P = randomPermutationMatrixSeeded(N, rng)
    const P_inv = P[0].map((_, i) => P.map(row => row[i])) // P^T
    const G_pub = gf2MatMul(gf2MatMul(S, G_TOY), P)
    return { G_pub, S_inv, P_inv }
}

// ---------------------------------------------------------------------------
// Error vector: deterministic weight-T injection for round-trip testability
// ---------------------------------------------------------------------------
function addDeterministicError(c: number[], seed: number): number[] {
    const rng = makeLcg(seed)
    const positions: number[] = []
    while (positions.length < T) {
        const pos = Math.floor(rng() * N)
        if (!positions.includes(pos)) positions.push(pos)
    }
    const out = [...c]
    for (const p of positions) out[p] ^= 1
    return out
}

// ---------------------------------------------------------------------------
// Syndrome decoding (brute-force for toy t=2)
// ---------------------------------------------------------------------------
function systematicDecode(received: number[]): number[] | null {
    const syn = gf2MatVecMul(H_TOY, received)
    if (syn.every(b => b === 0)) return received.slice(0, K)

    // Single error
    for (let i = 0; i < N; i++) {
        const t = [...received]; t[i] ^= 1
        if (gf2MatVecMul(H_TOY, t).every(b => b === 0)) return t.slice(0, K)
    }
    // Double error
    for (let i = 0; i < N - 1; i++) {
        for (let j = i + 1; j < N; j++) {
            const t = [...received]; t[i] ^= 1; t[j] ^= 1
            if (gf2MatVecMul(H_TOY, t).every(b => b === 0)) return t.slice(0, K)
        }
    }
    return null
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function parseHex(s: string, lbl: string): Uint8Array {
    const c = s.replace(/\s+/g, '').toLowerCase()
    if (!/^[0-9a-f]*$/.test(c) || c.length % 2 !== 0) throw new CipherError('INVALID_INPUT', `${lbl} must be hex.`)
    const o = new Uint8Array(c.length / 2)
    for (let i = 0; i < o.length; i++) o[i] = parseInt(c.slice(i * 2, i * 2 + 2), 16)
    return o
}

function toHex(b: Uint8Array | number[]): string {
    return Array.from(b).map(x => (x & 0xff).toString(16).padStart(2, '0')).join('')
}

function bytesToBits(bytes: Uint8Array, numBits: number): number[] {
    const bits: number[] = new Array(numBits).fill(0)
    for (let i = 0; i < numBits; i++) {
        const byteIdx = Math.floor(i / 8)
        const bitIdx = i % 8  // LSB-first: bit 0 = LSB of byte 0
        bits[i] = byteIdx < bytes.length ? ((bytes[byteIdx] >> bitIdx) & 1) : 0
    }
    return bits
}

function bitsToBytes(bits: number[], byteLen: number): Uint8Array {
    const out = new Uint8Array(byteLen)
    for (let i = 0; i < bits.length; i++) {
        const byteIdx = Math.floor(i / 8)
        const bitIdx = i % 8  // LSB-first: bit 0 = LSB of byte 0
        if (bits[i] && byteIdx < byteLen) out[byteIdx] |= (1 << bitIdx)
    }
    return out
}

// ---------------------------------------------------------------------------
// Core logic
// ---------------------------------------------------------------------------
function mcelieceCore(input: string, key: string, doDecrypt: boolean, instrument: boolean): CipherResult {
    const start = performance.now()
    const steps: CipherStep[] = []

    if (instrument) {
        steps.push({
            index: 0,
            label: 'Parameter Setup',
            inputState: `n=${N}, k=${K}, t=${T}`,
            outputState: 'Binary Goppa Code (Toy)',
            note: 'WARNING: Toy parameters for teaching. Production McEliece requires n>=3488.',
            isMilestone: true
        })
    }

    const keys = generateKeys(key)
    let outHex = ''

    if (!doDecrypt) {
        const msgBytes = parseHex(input, 'McEliece message')
        // Pad or truncate to exactly K bits
        const m = bytesToBits(msgBytes, K)

        // c_pub = m * G_pub (row-vector × matrix)
        const c_pub = gf2VecMatMul(m, keys.G_pub)

        // Deterministic error (seeded from key + ciphertext)
        const errSeed = seedFromString(key + toHex(c_pub))
        const c_err = addDeterministicError(c_pub, errSeed)

        // Pack N-bit vector into bytes
        const ctBytes = bitsToBytes(c_err, Math.ceil(N / 8))
        outHex = toHex(ctBytes)

        if (instrument) {
            steps.push({
                index: 1,
                label: 'McEliece Encryption',
                inputState: `m=[${m.join(',')}]`,
                outputState: `c=[${c_err.join(',')}]`,
                note: `c = m·G' + e (||e||=${T}). Public key G'=S·G_toy·P obscures the code structure.`,
                isMilestone: true
            })
        }
    } else {
        const ctBytes = parseHex(input, 'McEliece ciphertext')
        const c_prime = bytesToBits(ctBytes, N)

        // Undo permutation: c = c' * P^{-1}  (P^{-1} = P^T for permutation matrices)
        const c = gf2VecMatMul(c_prime, keys.P_inv)

        // Error-correct in the G_TOY space
        const m_bits = systematicDecode(c)
        if (!m_bits) {
            throw new CipherError('INVALID_INPUT', 'McEliece decoding failed: too many errors or wrong key.')
        }

        // Undo scrambling: m_orig = m_decoded * S^{-1}
        const m_orig = gf2VecMatMul(m_bits, keys.S_inv)

        // Pad recovered bits back to original byte count
        const origByteLen = parseHex(input, 'ct').length === Math.ceil(N / 8)
            ? Math.ceil(K / 8)
            : Math.ceil(K / 8)
        const msgOut = bitsToBytes(m_orig, origByteLen)
        outHex = toHex(msgOut)

        if (instrument) {
            steps.push({
                index: 1,
                label: 'McEliece Decryption',
                inputState: `c=[${c.join(',')}]`,
                outputState: `m=[${m_orig.join(',')}]`,
                note: 'Undo permutation P⁻¹, syndrome-decode to correct t errors, then undo scrambling S⁻¹.',
                isMilestone: true
            })
        }
    }

    return { output: outHex, outputEncoding: 'hex', steps, metadata: METADATA, durationMs: performance.now() - start }
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
    return mcelieceCore(input, key, false, !!options.instrument)
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
    return mcelieceCore(input, key, true, !!options.instrument)
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
        input: '01',
        key: 'pub,priv',
        expected: '01',
        description: 'Round-trip test with pedagogical parameters (n=15, t=2)'
    }
]
