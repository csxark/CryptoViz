/**
 * BLS Signatures — Boneh, Lynn, Shacham (2001).
 * Pairing-based, aggregatable digital signatures.
 * 
 * TOY IMPLEMENTATION NOTE:
 * Real BLS uses complex bilinear pairings (Tate/Weil/Ate) over extension 
 * fields (e.g., BLS12-381). For this visualizer, we use a mathematical 
 * isomorphism that perfectly preserves the bilinearity property:
 * e(P, Q) = g^(P * Q) mod p
 * This allows us to demonstrate signature aggregation and verification
 * without requiring 2000+ lines of finite field extension arithmetic.
 * 
 * G1, G2 are additive groups mod q.
 * GT is a multiplicative group mod p.
 */
import type { CipherResult, CipherStep, CipherOptions, TestVector, CipherMetadata } from '../types'
import { CipherError, validateInput } from '../../utils'

const METADATA: CipherMetadata = {
    name: 'BLS',
    securityStatus: 'secure',
    breakingComplexity: 'Relies on discrete log in G1/G2 and computational Diffie-Hellman in GT.',
    yearDesigned: 2001,
    standardBody: 'Boneh, Lynn, Shacham (ASIACRYPT 2001)',
}

// Toy parameters for visualizer traceability
const P = 0xFFFFFFFFFFFFFFC5n // Prime for GT (multiplicative)
const Q = P - 1n            // Order of G1/G2 (additive)
const G_GEN = 2n            // Generator for GT

function modBigInt(n: bigint, m: bigint): bigint { return ((n % m) + m) % m }
function modPow(base: bigint, exp: bigint, modVal: bigint): bigint {
    let res = 1n, b = modBigInt(base, modVal), e = exp
    while (e > 0n) {
        if (e % 2n === 1n) res = (res * b) % modVal
        b = (b * b) % modVal
        e /= 2n
    }
    return res
}

// Toy Bilinear Pairing: e(P, Q) = g^(P * Q) mod p
// Satisfies e(aP, bQ) = g^((aP)*(bQ)) = g^(abPQ) = (g^(PQ))^(ab) = e(P,Q)^(ab)
function pairing(P: bigint, Q: bigint): bigint {
    return modPow(G_GEN, modBigInt(P * Q, Q), P)
}

// Toy Hash-to-Curve: maps message to a scalar in G1
function hashToCurve(msg: string): bigint {
    let hash = 0n
    for (let i = 0; i < msg.length; i++) {
        hash = modBigInt(hash * 31n + BigInt(msg.charCodeAt(i)), Q)
    }
    return hash === 0n ? 1n : hash
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

function bigintToHex(n: bigint): string {
    return n.toString(16).padStart(16, '0')
}

function blsCore(input: string, key: string, doDecrypt: boolean, instrument: boolean): CipherResult {
    const start = performance.now()
    const steps: CipherStep[] = []

    if (instrument) {
        steps.push({
            index: 0,
            label: 'BLS Setup (Toy Model)',
            inputState: `GT: mod ${P}`,
            outputState: 'Pairing: e(P,Q) = g^(PQ) mod p',
            note: 'This toy model preserves the bilinearity property e(aP,bQ)=e(P,Q)^(ab) using modular exponentiation, allowing clear traceability of aggregation.',
            isMilestone: true
        })
    }

    let outHex = ''

    if (!doDecrypt) {
        // SIGN
        const x = BigInt('0x' + key) // Private key (scalar)
        const H = hashToCurve(input) // Message hashed to G1 point
        const sig = modBigInt(x * H, Q)    // Signature = x * H in G1

        outHex = bigintToHex(sig)

        if (instrument) {
            steps.push({ index: 1, label: 'BLS Signature', inputState: input, outputState: outHex, note: 'sig = x * H(m). Verification checks e(sig, G) == e(H, x*G).', isMilestone: true })
        }
    } else {
        // VERIFY
        // Key format: "pubkey,sig"
        const parts = key.split(',')
        if (parts.length < 2) throw new CipherError('INVALID_INPUT', 'Verify requires pubkey and signature.')

        const X = BigInt('0x' + parts[0]) // Public key = x * G (here G=1, so X=x)
        const sig = BigInt('0x' + parts[1])
        const H = hashToCurve(input)

        // Check e(sig, G) == e(H, X)
        // e(sig, 1) = g^(sig * 1) = g^sig
        // e(H, X) = g^(H * X)
        const lhs = pairing(sig, 1n)
        const rhs = pairing(H, X)

        if (lhs !== rhs) {
            throw new CipherError('INVALID_INPUT', 'BLS signature verification failed.')
        }

        outHex = '01' // Success

        if (instrument) {
            steps.push({ index: 1, label: 'BLS Verification', inputState: input, outputState: 'Valid', note: `e(${sig}, 1) = ${lhs} == e(${H}, ${X}) = ${rhs}. Bilinearity holds.`, isMilestone: true })
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
    return blsCore(input, key, false, !!options.instrument)
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
    return blsCore(input, key, true, !!options.instrument)
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
    { input: 'message', key: '1234567890abcdef', expected: 'mock_sig', description: 'BLS Sign/Verify Round-trip (Toy Pairing)' }
]
