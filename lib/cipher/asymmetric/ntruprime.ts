/**
 * Streamlined NTRU Prime (sntrup761)
 * NIST PQC Round 4 Candidate KEM.
 * Ring: Z[x]/(x^761 - x - 1), Modulus q = 4591.
 */
import type { CipherResult, CipherStep, CipherOptions, TestVector, CipherMetadata } from '../types'
import { CipherError } from '../../utils/errors'

const METADATA: CipherMetadata = {
    name: 'Streamlined NTRU Prime',
    securityStatus: 'experimental',
    breakingComplexity: 'NIST PQC Round 4. Resistant to subfield attacks via irreducible polynomial x^761 - x - 1.',
    yearDesigned: 2016,
    standardBody: 'NIST PQC',
}

const P = 761
const Q = 4591

function centeredMod(c: number, q: number): number {
    return c - q * Math.round(c / q)
}

function polyAdd(a: number[], b: number[]): number[] {
    return a.map((v, i) => centeredMod(v + (b[i] || 0), Q))
}

function polyMul(a: number[], b: number[]): number[] {
    const res = new Array(P * 2 - 1).fill(0)
    for (let i = 0; i < P; i++) {
        if (a[i] === 0) continue
        for (let j = 0; j < P; j++) {
            if (b[j] === 0) continue
            res[i + j] = centeredMod(res[i + j] + a[i] * b[j], Q)
        }
    }
    // Reduction modulo x^761 - x - 1
    for (let i = P * 2 - 2; i >= P; i--) {
        res[i - P + 1] = centeredMod(res[i - P + 1] + res[i], Q)
        res[i - P] = centeredMod(res[i - P] + res[i], Q)
        res[i] = 0
    }
    return res.slice(0, P)
}

function parseHex(s: string, lbl: string): number[] {
    const c = s.replace(/\s+/g, '').toLowerCase()
    if (!/^[0-9a-f]*$/.test(c)) throw new CipherError('INVALID_INPUT', `${lbl} must be hex.`)
    // Simplified parsing for visualizer
    return new Array(P).fill(0).map((_, i) => parseInt(c.slice(i * 2, i * 2 + 2) || '00', 16) % Q)
}
function toHex(b: number[]): string {
    return b.map(x => (x < 0 ? x + Q : x).toString(16).padStart(2, '0')).join('')
}

function ntruprimeCore(input: string, key: string, doDecrypt: boolean, instrument: boolean): CipherResult {
    const start = performance.now()
    const steps: CipherStep[] = []

    const privKey = parseHex(key || '00', 'sntrup private key')
    const pubKey = parseHex(input || '00', 'sntrup public key')

    // Mock encapsulation/decapsulation for visualizer
    const shared = polyMul(pubKey, privKey)
    const outHex = toHex(shared.slice(0, 32)) // Truncate for shared key

    if (instrument) {
        steps.push({
            index: 0,
            label: 'sntrup761 KEM',
            inputState: `Ring: x^761 - x - 1, q=4591`,
            outputState: `Shared: ${outHex}`,
            note: `Polynomial multiplication in Z_q[x]/(Φ).`,
            isMilestone: true
        })
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
    return ntruprimeCore(input, key, false, !!options.instrument)
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
    return ntruprimeCore(input, key, true, !!options.instrument)
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
    { input: '00', key: '00', expected: '00', description: 'sntrup761 mock KEM' }
]
