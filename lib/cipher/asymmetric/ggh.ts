/**
 * GGH Cryptosystem — Goldreich, Goldwasser, Halevi (1997).
 * 
 * Early lattice-based public-key encryption.
 * Private key: "Good" basis (short, near-orthogonal vectors).
 * Public key: "Bad" basis (long, skewed vectors generating the SAME lattice).
 * 
 * Status: BROKEN. Nguyen's 1999 attack showed the specific error-vector
 * distribution leaked structural information, making the closest-vector
 * problem trivial in practice for GGH challenge instances.
 */
import type { CipherResult, CipherStep, CipherOptions, TestVector, CipherMetadata } from '../types'
import { CipherError, validateInput } from '../../utils'

const METADATA: CipherMetadata = {
    name: 'GGH',
    securityStatus: 'broken',
    breakingComplexity: 'Nguyen (1999) broke it via structural error-vector leakage.',
    yearDesigned: 1997,
    standardBody: 'Goldreich, Goldwasser, Halevi (CRYPTO 1997)',
}

type Matrix = number[][]

function matMul(A: Matrix, B: Matrix): Matrix {
    const rows = A.length, cols = B[0].length, inner = B.length
    const C: Matrix = Array.from({ length: rows }, () => new Array(cols).fill(0))
    for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
            let sum = 0
            for (let k = 0; k < inner; k++) sum += A[i][k] * B[k][j]
            C[i][j] = sum
        }
    }
    return C
}

function determinant(M: Matrix): number {
    const n = M.length
    if (n === 1) return M[0][0]
    if (n === 2) return M[0][0] * M[1][1] - M[0][1] * M[1][0]
    let det = 0
    for (let j = 0; j < n; j++) {
        const sub: Matrix = []
        for (let i = 1; i < n; i++) {
            sub.push(M[i].filter((_, col) => col !== j))
        }
        det += (j % 2 === 0 ? 1 : -1) * M[0][j] * determinant(sub)
    }
    return det
}

function transpose(M: Matrix): Matrix {
    return M[0].map((_, i) => M.map(row => row[i]))
}

function invert(M: Matrix): Matrix {
    const n = M.length
    const det = determinant(M)
    if (det === 0) throw new Error('Singular matrix')

    if (n === 2) {
        return [
            [M[1][1] / det, -M[0][1] / det],
            [-M[1][0] / det, M[0][0] / det]
        ]
    }

    // General inverse via cofactors (simplified for small n)
    const cofactors: Matrix = Array.from({ length: n }, () => new Array(n).fill(0))
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
            const sub: Matrix = []
            for (let r = 0; r < n; r++) {
                if (r === i) continue
                sub.push(M[r].filter((_, c) => c !== j))
            }
            cofactors[i][j] = ((i + j) % 2 === 0 ? 1 : -1) * determinant(sub)
        }
    }
    const adj = transpose(cofactors)
    return adj.map(row => row.map(v => v / det))
}

function parseHex(s: string): number[] {
    const c = s.replace(/\s+/g, '').toLowerCase()
    if (!/^[0-9a-f]*$/.test(c) || c.length % 2 !== 0) throw new CipherError('INVALID_INPUT', `Must be hex.`)
    const o: number[] = []
    for (let i = 0; i < c.length; i += 2) o.push(parseInt(c.slice(i, i + 2), 16))
    return o
}

function toHex(b: number[]): string {
    return b.map(x => (x & 0xFF).toString(16).padStart(2, '0')).join('')
}

function gghCore(input: string, key: string, doDecrypt: boolean, instrument: boolean): CipherResult {
    const start = performance.now()
    const steps: CipherStep[] = []

    // Toy parameters: n=2 lattice dimension
    // Good basis B (near orthogonal)
    const B: Matrix = [[10, 1], [-2, 8]]
    // Unimodular matrix U (det = 1)
    const U: Matrix = [[3, 2], [1, 1]] // det = 3*1 - 2*1 = 1
    // Bad basis B' = U * B
    const B_bad = matMul(U, B)

    if (instrument) {
        steps.push({
            index: 0,
            label: 'GGH Basis Setup',
            inputState: `det(U) = ${determinant(U)}`,
            outputState: 'Good (private) & Bad (public) bases',
            note: 'Nguyen (1999) broke GGH because the specific error-vector distribution leaked structural information, making CVP trivial. This break is structural, not just scale-dependent.',
            isMilestone: true
        })
    }

    let outHex = ''

    if (!doDecrypt) {
        // ENCRYPT using Bad basis
        const msgBytes = parseHex(input)
        const m: Matrix = [[msgBytes[0] || 0, msgBytes[1] || 0]]

        // Small error vector e
        const e: Matrix = [[1, -1]]

        // c = m * B' + e
        const c_mat = matMul(m, B_bad)
        const c: number[] = [c_mat[0][0] + e[0][0], c_mat[0][1] + e[0][1]]

        outHex = toHex(c.map(v => v & 0xFF))

        if (instrument) {
            steps.push({ index: 1, label: 'GGH Encryption', inputState: input, outputState: outHex, note: 'c = m*B\' + e. Point near lattice, obscured by noise.', isMilestone: true })
        }
    } else {
        // DECRYPT using Good basis (Babai's rounding)
        // c = m * B_bad + e  where B_bad = U * B
        // Step 1: apply B^{-1} to c to get coordinates relative to B
        const c_bytes = parseHex(input)
        const c: Matrix = [[c_bytes[0], c_bytes[1]]]

        const B_inv = invert(B)
        const v = matMul(c, B_inv)

        // Step 2: Round to nearest integer — this removes the noise e
        const m_in_B: Matrix = [[Math.round(v[0][0]), Math.round(v[0][1])]]

        // Step 3: Undo the unimodular transform U.
        // Since B_bad = U * B, the message m satisfies: m_in_B = m * U
        // So m = m_in_B * U^{-1}
        // U = [[3, 2], [1, 1]], det(U) = 1
        // U^{-1} = [[1, -2], [-1, 3]]
        const U_inv: Matrix = [[1, -2], [-1, 3]]
        const m_recovered = matMul(m_in_B, U_inv)

        const msg = [m_recovered[0][0] & 0xFF, m_recovered[0][1] & 0xFF]
        outHex = toHex(msg)

        if (instrument) {
            steps.push({ index: 1, label: 'GGH Decryption (Babai)', inputState: input, outputState: outHex, note: 'Good basis B allows easy CVP via Babai rounding; unimodular undo (U⁻¹) recovers original message coordinates.', isMilestone: true })
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
    return gghCore(input, key, false, !!options.instrument)
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
    return gghCore(input, key, true, !!options.instrument)
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
    { input: '050a', key: 'mock_keys', expected: 'mock_ct', description: 'GGH Round-trip (Toy n=2)' }
]
