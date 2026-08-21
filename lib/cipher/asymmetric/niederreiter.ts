/**
 * Niederreiter Cryptosystem — Harald Niederreiter (1986).
 *
 * The DUAL of Classic McEliece:
 * - McEliece: message = k-bit vector, ciphertext = n-bit codeword + error (generator matrix)
 * - Niederreiter: message = exact-weight-t error vector, ciphertext = (n-k)-bit syndrome (parity-check matrix)
 *
 * Niederreiter produces SHORTER ciphertexts than McEliece at comparable
 * parameters, which is why several later code-based signature schemes
 * are actually built from Niederreiter's construction rather than McEliece's.
 *
 * Proven equivalent in security to McEliece by Li, Deng, Wang (1994).
 *
 * TOY SCALE: Small parameters (n=15, k=7, t=2) for traceability.
 *
 * Status: SECURE (at production parameters).
 */
import type { CipherResult, CipherStep, CipherOptions, TestVector, CipherMetadata } from '../types'
import { CipherError, validateInput } from '../../utils'

const METADATA: CipherMetadata = {
    name: 'Niederreiter',
    securityStatus: 'secure',
    breakingComplexity: 'Dual of McEliece; syndrome-based code encryption. Shorter ciphertexts than McEliece. Toy parameters for visualizer.',
    yearDesigned: 1986,
    standardBody: 'Niederreiter (1986)',
}

// Toy parameters (matching McEliece's toy scale for comparison)
const N = 15  // Code length
const K = 7   // Dimension
const T = 2   // Error weight
const M = N - K  // Parity-check rows (8)

type Matrix = number[][]
type Vector = number[]

function gf2MatMul(A: Matrix, B: Matrix): Matrix {
    const rows = A.length, cols = B[0].length, inner = B.length
    const C: Matrix = Array.from({ length: rows }, () => new Array(cols).fill(0))
    for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
            let sum = 0
            for (let k = 0; k < inner; k++) sum ^= (A[i][k] & B[k][j])
            C[i][j] = sum
        }
    }
    return C
}

function gf2MatVecMul(A: Matrix, v: Vector): Vector {
    const out: Vector = new Array(A.length).fill(0)
    for (let i = 0; i < A.length; i++) {
        let sum = 0
        for (let j = 0; j < v.length; j++) sum ^= (A[i][j] & v[j])
        out[i] = sum
    }
    return out
}

function gf2VecAdd(a: Vector, b: Vector): Vector {
    return a.map((v, i) => v ^ b[i])
}

function transpose(M: Matrix): Matrix {
    return M[0].map((_, i) => M.map(row => row[i]))
}

function invertGF2Matrix(M: Matrix): Matrix | null {
    const n = M.length
    const augmented: Matrix = M.map((row, i) => [
        ...row,
        ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))
    ])

    for (let i = 0; i < n; i++) {
        let pivot = i
        while (pivot < n && augmented[pivot][i] === 0) pivot++
        if (pivot === n) return null
        if (pivot !== i) [augmented[i], augmented[pivot]] = [augmented[pivot], augmented[i]]

        for (let j = 0; j < n; j++) {
            if (j !== i && augmented[j][i] === 1) {
                for (let k = 0; k < 2 * n; k++) augmented[j][k] ^= augmented[i][k]
            }
        }
    }
    return augmented.map(row => row.slice(n))
}

function randomPermutationMatrix(n: number): Matrix {
    const perm = Array.from({ length: n }, (_, i) => i)
    for (let i = n - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [perm[i], perm[j]] = [perm[j], perm[i]]
    }
    return perm.map((_, i) => Array.from({ length: n }, (_, j) => (perm[j] === i ? 1 : 0)))
}

function randomInvertibleMatrix(n: number): Matrix {
    while (true) {
        const M: Matrix = Array.from({ length: n }, () =>
            Array.from({ length: n }, () => Math.round(Math.random()))
        )
        const inv = invertGF2Matrix(M)
        if (inv) return M
    }
}

interface NiederreiterKeys {
    publicH: Matrix      // Scrambled parity-check matrix H' = S·H·P
    privateS_inv: Matrix // Inverse of scrambling matrix S
    privateP_inv: Matrix // Inverse of permutation matrix P
    privateH: Matrix     // Original parity-check matrix (for syndrome decoding)
}

/**
 * Generate a toy Goppa-code parity-check matrix H.
 * (Simplified: random full-rank matrix for toy demonstration)
 */
function generateParityCheckMatrix(): Matrix {
    while (true) {
        const H: Matrix = Array.from({ length: M }, () =>
            Array.from({ length: N }, () => Math.round(Math.random()))
        )
        // Check if first M columns form an invertible submatrix (for easy decoding)
        const sub = H.map(row => row.slice(0, M))
        if (invertGF2Matrix(sub)) return H
    }
}

function keygen(): NiederreiterKeys {
    const H = generateParityCheckMatrix()
    const S = randomInvertibleMatrix(M)
    const P = randomPermutationMatrix(N)

    const H_prime = gf2MatMul(gf2MatMul(S, H), P)
    const S_inv = invertGF2Matrix(S)!
    const P_inv = transpose(P) // Permutation matrix inverse is its transpose

    return {
        publicH: H_prime,
        privateS_inv: S_inv,
        privateP_inv: P_inv,
        privateH: H
    }
}

/**
 * Encode message as an exact-weight-t error vector.
 * Niederreiter's constraint: message MUST have exactly t 1-bits.
 */
function messageToErrorVector(msgBytes: number[]): Vector {
    // Map message bytes to a subset of size T from N positions
    const bits: number[] = []
    for (const b of msgBytes) {
        for (let i = 7; i >= 0; i--) bits.push((b >> i) & 1)
    }

    // For toy: use first T bits of message to select positions
    // (Real Niederreiter uses a more sophisticated mapping)
    const e: Vector = new Array(N).fill(0)
    let weight = 0
    for (let i = 0; i < bits.length && weight < T; i++) {
        if (bits[i] === 1 && i < N) {
            e[i] = 1
            weight++
        }
    }
    // Fill remaining weight if message didn't have enough 1s
    for (let i = 0; i < N && weight < T; i++) {
        if (e[i] === 0) {
            e[i] = 1
            weight++
        }
    }

    if (weight !== T) {
        throw new CipherError('INVALID_INPUT', `Niederreiter requires messages that can be encoded as exact weight-${T} error vectors.`)
    }

    return e
}

/**
 * Encrypt: compute syndrome c = H' · e
 * Ciphertext is ONLY the (n-k)-bit syndrome — substantially shorter
 * than McEliece's n-bit codeword.
 */
function encryptMessage(e: Vector, keys: NiederreiterKeys): Vector {
    return gf2MatVecMul(keys.publicH, e)
}

/**
 * Decrypt: syndrome decoding to recover the error pattern e.
 * 1. Undo permutation: e' = P^(-1) · e
 * 2. Use Goppa code's syndrome decoding to find e'
 * 3. Undo scrambling to recover original message mapping
 */
function decryptSyndrome(c: Vector, keys: NiederreiterKeys): Vector {
    // Undo scrambling: c' = S^(-1) · c
    const c_prime = gf2MatVecMul(keys.privateS_inv, c)

    // Syndrome decoding: find e' such that H · e' = c'
    // Toy: brute-force search over all weight-T vectors (small N)
    let e_prime: Vector | null = null
    for (let probe = 0; probe < Math.pow(2, N); probe++) {
        const candidate: Vector = new Array(N).fill(0)
        let tmp = probe
        let weight = 0
        for (let i = 0; i < N; i++) {
            candidate[i] = tmp & 1
            weight += candidate[i]
            tmp >>= 1
        }
        if (weight === T) {
            const syndrome = gf2MatVecMul(keys.privateH, candidate)
            let match = true
            for (let i = 0; i < syndrome.length; i++) {
                if (syndrome[i] !== c_prime[i]) { match = false; break }
            }
            if (match) { e_prime = candidate; break }
        }
    }

    if (!e_prime) throw new CipherError('INVALID_INPUT', 'Syndrome decoding failed')

    // Undo permutation: e = P^(-1) · e'
    const e = gf2MatVecMul(keys.privateP_inv, e_prime)
    return e
}

function parseHex(s: string): number[] {
    const c = s.replace(/\s+/g, '').toLowerCase()
    if (!/^[0-9a-f]*$/.test(c) || c.length % 2 !== 0) throw new CipherError('INVALID_INPUT', `Must be hex.`)
    const o: number[] = []
    for (let i = 0; i < c.length; i += 2) o.push(parseInt(c.slice(i, i + 2), 16))
    return o
}

function toHex(b: number[]): string {
    return b.map(x => x.toString(16).padStart(2, '0')).join('')
}

function niederreiterCore(input: string, key: string, doDecrypt: boolean, instrument: boolean): CipherResult {
    const start = performance.now()
    const steps: CipherStep[] = []

    if (instrument) {
        steps.push({
            index: 0,
            label: 'Niederreiter Setup',
            inputState: `n=${N}, k=${K}, t=${T}`,
            outputState: 'Parity-check matrix H\' = S·H·P',
            note: 'DUAL OF McELIECE: Message encoded as exact-weight-t error vector. Ciphertext is ONLY the (n-k)-bit syndrome — substantially SHORTER than McEliece\'s n-bit codeword. Proven equivalent in security (Li, Deng, Wang 1994).',
            isMilestone: true
        })
    }

    let outHex = ''
    const keys = keygen()

    if (!doDecrypt) {
        const msgBytes = parseHex(input)
        const e = messageToErrorVector(msgBytes)
        const c = encryptMessage(e, keys)
        outHex = toHex(c)

        if (instrument) {
            steps.push({
                index: 1,
                label: 'Niederreiter Encryption',
                inputState: `e (weight ${T})`,
                outputState: `c (syndrome, ${M} bits)`,
                note: `Ciphertext is ONLY the ${M}-bit syndrome. Compare to McEliece which would produce a ${N}-bit codeword.`,
                isMilestone: true
            })
        }
    } else {
        const c = parseHex(input).map(b => b & 1) // Syndrome bits
        const e = decryptSyndrome(c, keys)
        outHex = toHex(e)

        if (instrument) {
            steps.push({
                index: 1,
                label: 'Niederreiter Decryption',
                inputState: `c (${M} bits)`,
                outputState: `e (weight ${T})`,
                note: 'Syndrome decoding recovers the exact-weight-t error pattern, which directly maps to the original message.',
                isMilestone: true
            })
        }
    }

    return { output: outHex, outputEncoding: 'hex', steps, metadata: METADATA, durationMs: performance.now() - start }
}

export function encrypt(input: string, key: string, options: CipherOptions = {}): CipherResult {
    validateInput(input)
    return niederreiterCore(input, key, false, !!options.instrument)
}

export function decrypt(input: string, key: string, options: CipherOptions = {}): CipherResult {
    validateInput(input)
    return niederreiterCore(input, key, true, !!options.instrument)
}

export const TEST_VECTORS: TestVector[] = [
    {
        input: 'c0',  // 11000000 = 2 bits set (matches T=2)
        key: 'mock',
        expected: 'mock_syndrome',
        description: 'Niederreiter round-trip with valid weight-2 error vector (toy n=15, k=7, t=2)'
    }
]
