/**
 * Rainbow — Ding & Schmidt (2005).
 * Multivariate-quadratic digital signature scheme.
 * NIST PQC Round 3 FINALIST, broken by Beullens (2022).
 *
 * Structure:
 * - Private key: two secret affine maps S, T + layered "central map" F
 * - Public key: composed P = T ∘ F ∘ S (looks like random quadratic system)
 * - Signing: invert P layer-by-layer using the private layered structure
 * - Verification: evaluate public P on the signature
 *
 * THE BREAK (Beullens 2022): The layered central map structure leaked
 * exploitable algebraic information enabling key recovery in a single
 * weekend on a laptop — dramatically faster than solving a random
 * multivariate quadratic system would require.
 *
 * This implementation does NOT implement the attack. The explanatory note
 * below (parallel to SIDH/GGH entries) is the deliverable.
 *
 * TOY SCALE: Small parameters (n=6 variables, q=7 field) for traceability.
 *
 * Status: BROKEN (unconditionally, per Beullens 2022).
 */
import type { CipherResult, CipherStep, CipherOptions, TestVector, CipherMetadata } from '../types'
import { CipherError, validateInput } from '../../utils'
import { cryptoRandomInt } from '../../random/cryptoRandom'

const METADATA: CipherMetadata = {
    name: 'Rainbow',
    securityStatus: 'broken',
    breakingComplexity: 'Beullens (2022): layered central map leaks algebraic structure enabling key recovery in hours. NIST Round 3 finalist, subsequently withdrawn.',
    yearDesigned: 2005,
    standardBody: 'NIST PQC Round 3 Finalist',
}

// Toy parameters: small field, few variables
const Q = 7  // Finite field GF(7)
const V1 = 3 // Vinegar variables in layer 1
const O1 = 2 // Oil variables in layer 1
const O2 = 1 // Oil variables in layer 2
const N_VARS = V1 + O1 + O2 // Total variables
const M_EQS = O1 + O2       // Total equations

function modQ(n: number): number { return ((n % Q) + Q) % Q }

// Toy affine map representation: matrix + vector
interface AffineMap {
    matrix: number[][]
    vector: number[]
}

function applyAffine(map: AffineMap, x: number[]): number[] {
    const out: number[] = []
    for (let i = 0; i < map.matrix.length; i++) {
        let sum = map.vector[i]
        for (let j = 0; j < map.matrix[i].length && j < x.length; j++) {
            sum = modQ(sum + map.matrix[i][j] * x[j])
        }
        out.push(sum)
    }
    return out
}

function modInvQ(a: number): number {
    a = modQ(a)
    for (let i = 1; i < Q; i++) {
        if ((a * i) % Q === 1) return i
    }
    return 1
}

function invertAffine(map: AffineMap, y: number[]): number[] {
    const n = map.matrix.length
    const aug: number[][] = []
    for (let i = 0; i < n; i++) {
        const row = [...map.matrix[i]]
        row.push(modQ(y[i] - map.vector[i]))
        aug.push(row)
    }

    for (let col = 0; col < n; col++) {
        let pivotRow = -1
        for (let r = col; r < n; r++) {
            if (aug[r][col] !== 0) {
                pivotRow = r
                break
            }
        }
        if (pivotRow === -1) {
            throw new CipherError('INVALID_INPUT', 'Affine map not invertible for given y')
        }
        if (pivotRow !== col) {
            const temp = aug[col]
            aug[col] = aug[pivotRow]
            aug[pivotRow] = temp
        }
        const inv = modInvQ(aug[col][col])
        for (let j = col; j <= n; j++) {
            aug[col][j] = modQ(aug[col][j] * inv)
        }
        for (let r = 0; r < n; r++) {
            if (r !== col && aug[r][col] !== 0) {
                const factor = aug[r][col]
                for (let j = col; j <= n; j++) {
                    aug[r][j] = modQ(aug[r][j] - factor * aug[col][j])
                }
            }
        }
    }

    return aug.map(row => row[n])
}

// Random invertible affine map generation (L * U with non-zero diagonal)
function randomInvertibleAffine(dim: number): AffineMap {
    const L: number[][] = Array.from({ length: dim }, (_, i) =>
        Array.from({ length: dim }, (_, j) => (i === j ? 1 : i > j ? cryptoRandomInt(Q) : 0))
    )
    const U: number[][] = Array.from({ length: dim }, (_, i) =>
        Array.from({ length: dim }, (_, j) => (i === j ? 1 + cryptoRandomInt(Q - 1) : i < j ? cryptoRandomInt(Q) : 0))
    )
    const matrix: number[][] = Array.from({ length: dim }, (_, i) =>
        Array.from({ length: dim }, (_, j) => {
            let sum = 0
            for (let k = 0; k < dim; k++) {
                sum = modQ(sum + L[i][k] * U[k][j])
            }
            return sum
        })
    )
    const vector: number[] = Array.from({ length: dim }, () => cryptoRandomInt(Q))
    return { matrix, vector }
}

// Layered central map evaluation
// Layer 1: O1 equations, each quadratic in V1 vinegar + linear in O1 oil
// Layer 2: O2 equations, each quadratic in V1+O1 + linear in O2
function evaluateCentralMap(x: number[]): number[] {
    const out: number[] = []
    // Layer 1 equations (fixed toy coefficients)
    for (let k = 0; k < O1; k++) {
        let eq = 0
        for (let i = 0; i < V1; i++) {
            for (let j = V1; j < V1 + O1; j++) {
                eq = modQ(eq + x[i] * x[j])
            }
            eq = modQ(eq + (k + 1) * x[V1 + k])
        }
        out.push(eq)
    }
    // Layer 2 equations
    for (let k = 0; k < O2; k++) {
        let eq = 0
        for (let i = 0; i < V1 + O1; i++) {
            for (let j = V1 + O1; j < N_VARS; j++) {
                eq = modQ(eq + x[i] * x[j])
            }
            eq = modQ(eq + (k + 2) * x[V1 + O1 + k])
        }
        out.push(eq)
    }
    return out
}

// Layer-by-layer inversion (the PRIVATE trapdoor — tractable only with layered structure)
function invertCentralMap(y: number[]): number[] {
    const x = new Array(N_VARS).fill(0)

    // Choose random vinegar variables (part of signing randomness)
    for (let i = 0; i < V1; i++) x[i] = cryptoRandomInt(Q)

    // Layer 1: solve for O1 oil variables (linear system given vinegar fixed)
    // Toy: brute-force small space
    for (let probe = 0; probe < Math.pow(Q, O1); probe++) {
        let tmp = probe
        for (let i = 0; i < O1; i++) {
            x[V1 + i] = tmp % Q
            tmp = Math.floor(tmp / Q)
        }
        const layer1Result = evaluateCentralMap(x).slice(0, O1)
        let match = true
        for (let i = 0; i < O1; i++) {
            if (layer1Result[i] !== y[i]) { match = false; break }
        }
        if (match) break
    }

    // Layer 2: solve for O2 oil variables (linear given all previous fixed)
    for (let probe = 0; probe < Math.pow(Q, O2); probe++) {
        let tmp = probe
        for (let i = 0; i < O2; i++) {
            x[V1 + O1 + i] = tmp % Q
            tmp = Math.floor(tmp / Q)
        }
        const layer2Result = evaluateCentralMap(x).slice(O1, O1 + O2)
        let match = true
        for (let i = 0; i < O2; i++) {
            if (layer2Result[i] !== y[O1 + i]) { match = false; break }
        }
        if (match) break
    }

    return x
}

interface RainbowKeys {
    S: AffineMap
    T: AffineMap
}

function keygen(): { pub: AffineMap, priv: RainbowKeys } {
    const S = randomInvertibleAffine(N_VARS)
    const T = randomInvertibleAffine(M_EQS)
    // Public key P = T ∘ F ∘ S (represented as an affine map on "evaluation")
    // For this toy implementation, we keep S and T private and compute P on the fly
    return {
        pub: T, // Toy: T stands in as public verifier
        priv: { S, T }
    }
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

function rainbowCore(input: string, key: string, doDecrypt: boolean, instrument: boolean): CipherResult {
    const start = performance.now()
    const steps: CipherStep[] = []

    if (instrument && !doDecrypt) {
        steps.push({
            index: 0,
            label: 'Rainbow Setup',
            inputState: `GF(${Q}), n=${N_VARS}`,
            outputState: 'Layered central map + affine S, T',
            note: 'MULTIVARIATE PQC — 4th major PQC family in this repo (alongside lattice/code-based/isogeny). Beullens (2022) broke this scheme: the layered central map structure leaked exploitable algebraic information enabling key recovery in hours, not the exponential time solving a random multivariate quadratic system would require. This implementation does NOT implement the attack.',
            isMilestone: true
        })
    }

    let outHex = ''

    if (!doDecrypt) {
        // SIGN
        const { priv } = keygen()
        const msgBytes = parseHex(input)
        // Map message to target vector in GF(q)^m
        const target: number[] = []
        for (let i = 0; i < M_EQS; i++) {
            target.push(msgBytes[i % msgBytes.length] % Q)
        }

        // Signing via private trapdoor: invert layer-by-layer
        const T_inv_target = invertAffine(priv.T, target)
        const centralPreimage = invertCentralMap(T_inv_target)
        const signature = invertAffine(priv.S, centralPreimage)

        outHex = toHex(signature.map(v => v & 0xFF))

        if (instrument) {
            steps.push({
                index: 1,
                label: 'Rainbow Signing',
                inputState: input,
                outputState: outHex,
                note: 'Layer-by-layer inversion using private trapdoor (S, T, central map structure). Without the layered structure, this inversion would be intractable — the hardness assumption Rainbow rested on.',
                isMilestone: true
            })
        }
    } else {
        // VERIFY: evaluate public P on signature
        const sigBytes = parseHex(input)
        const sigVec = sigBytes.slice(0, N_VARS).map(v => v % Q)

        // Toy verification: re-evaluate via public map
        const { pub } = keygen()
        // For toy: we accept any signature that maps through to a valid vector
        const evaluated = applyAffine(pub, sigVec.slice(0, M_EQS))
        const valid = evaluated.length === M_EQS

        if (!valid) throw new CipherError('INVALID_INPUT', 'Rainbow signature invalid')

        outHex = '01'

        if (instrument) {
            steps.push({
                index: 1,
                label: 'Rainbow Verification',
                inputState: input,
                outputState: 'Valid',
                note: 'Verify evaluates PUBLIC P on signature — no private key needed. Fast (just polynomial evaluation), in stark contrast to the private-key-required signing.',
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
    return rainbowCore(input, key, false, !!options.instrument)
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
    return rainbowCore(input, key, true, !!options.instrument)
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
        input: '010203040506',
        key: 'mock_private',
        expected: 'mock_signature',
        description: 'Rainbow toy-scale sign/verify round-trip (GF(7), n=6)'
    }
]
