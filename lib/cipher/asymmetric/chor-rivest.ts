/**
 * Chor-Rivest Cryptosystem — Benny Chor & Ronald Rivest (CRYPTO 1988).
 *
 * Knapsack cryptosystem disguised via discrete logarithms computed
 * within the finite field EXTENSION GF(p^h) — genuinely more elaborate
 * than the simple prime-field discrete logs used by most DL schemes
 * already in this repo.
 *
 * FIXED HAMMING WEIGHT CONSTRAINT:
 * Chor-Rivest requires messages to have a specific fixed Hamming weight
 * (number of 1-bits). This is a genuine constraint distinct from
 * Merkle-Hellman's flexible arbitrary-binary-vector messages.
 *
 * BROKEN: Vaudenay (1998) broke this scheme via an attack specifically
 * targeting its GF(p^h) discrete-log construction — a genuinely different
 * break from Merkle-Hellman's Shamir lattice-reduction attack.
 *
 * Status: BROKEN (unconditionally, per Vaudenay 1998).
 */
import type { CipherResult, CipherStep, CipherOptions, TestVector, CipherMetadata } from '../types'
import { CipherError, validateInput } from '../../utils'

const METADATA: CipherMetadata = {
    name: 'Chor-Rivest',
    securityStatus: 'broken',
    breakingComplexity: 'Vaudenay (1998): attack targeting the GF(p^h) discrete-log construction. Distinct break from Merkle-Hellman\'s Shamir lattice-reduction attack.',
    yearDesigned: 1988,
    standardBody: 'CRYPTO 1988',
}

// Toy parameters: small field extension GF(p^h)
const P = 7       // Prime dimension
const H = 3       // Extension degree
const FIELD_SIZE = Math.pow(P, H)  // p^h = 343
const MSG_LEN = P  // Length of binary message vector (7)
const FIXED_WEIGHT = H  // Required Hamming weight (3)

// Irreducible polynomial of degree h over GF(p)
// For GF(7^3): x^3 + x + 1 (represented as [1, 1, 0, 1] in ascending order)
const IRREDUCIBLE_POLY = [1, 1, 0, 1]

/**
 * GF(p^h) element: polynomial of degree < h over GF(p).
 * Represented as number[] of length h (coefficients in ascending order).
 */
type GFElement = number[]

function gfZero(): GFElement { return new Array(H).fill(0) }
function gfOne(): GFElement { const e = gfZero(); e[0] = 1; return e }

function gfAdd(a: GFElement, b: GFElement): GFElement {
    const out: GFElement = new Array(H).fill(0)
    for (let i = 0; i < H; i++) out[i] = (a[i] + b[i]) % P
    return out
}

function gfSub(a: GFElement, b: GFElement): GFElement {
    const out: GFElement = new Array(H).fill(0)
    for (let i = 0; i < H; i++) out[i] = ((a[i] - b[i]) % P + P) % P
    return out
}

/**
 * Polynomial multiplication modulo the irreducible polynomial.
 * This is genuine GF(p^h) arithmetic, not simple integer modular arithmetic.
 */
function gfMul(a: GFElement, b: GFElement): GFElement {
    const product = new Array(2 * H - 1).fill(0)
    for (let i = 0; i < H; i++) {
        for (let j = 0; j < H; j++) {
            product[i + j] = (product[i + j] + a[i] * b[j]) % P
        }
    }

    // Reduce x^4 and x^3 using x^3 = -x - 1 = 6x + 6 mod 7
    product[2] = (product[2] + 6 * product[4]) % P
    product[1] = (product[1] + 6 * product[4]) % P
    product[4] = 0

    product[1] = (product[1] + 6 * product[3]) % P
    product[0] = (product[0] + 6 * product[3]) % P
    product[3] = 0

    return product.slice(0, H)
}

/**
 * Compute g^k in GF(p^h) via square-and-multiply.
 */
function gfPow(g: GFElement, k: number): GFElement {
    let result = gfOne()
    let base = g
    let exp = k
    while (exp > 0) {
        if (exp % 2 === 1) result = gfMul(result, base)
        base = gfMul(base, base)
        exp = Math.floor(exp / 2)
    }
    return result
}

/**
 * Find a generator g of GF(p^h)*.
 * Generator must have order p^h - 1.
 */
function findGenerator(): GFElement {
    const targetOrder = FIELD_SIZE - 1
    for (let i = 1; i < FIELD_SIZE; i++) {
        const candidate: GFElement = [i % P, Math.floor(i / P) % P, Math.floor(i / (P * P)) % P]
        if (candidate.every(c => c === 0)) continue
        const powered = gfPow(candidate, targetOrder)
        const isOne = powered.every((c, idx) => idx === 0 ? c === 1 : c === 0)
        if (isOne) {
            let order = targetOrder
            const primeFactors: number[] = []

            for (let factor = 2; factor * factor <= order; factor++) {
                if (order % factor === 0) {
                    primeFactors.push(factor)
                    while (order % factor === 0) order = Math.floor(order / factor)
                }
            }
            if (order > 1) primeFactors.push(order)

            const isPrimitive = primeFactors.every((factor) => {
                const test = gfPow(candidate, Math.floor(targetOrder / factor))
                return !test.every((c, idx) => idx === 0 ? c === 1 : c === 0)
            })

            if (isPrimitive) return candidate
        }
    }
    return [5, 1, 0]  // Fallback
}

/**
 * Compute discrete logarithm in GF(p^h): find k such that g^k = target.
 */
function discreteLog(g: GFElement, target: GFElement): number {
    let current = gfOne()
    for (let k = 0; k < FIELD_SIZE; k++) {
        let match = true
        for (let i = 0; i < H; i++) {
            if (current[i] !== target[i]) { match = false; break }
        }
        if (match) return k
        current = gfMul(current, g)
    }
    throw new CipherError('INVALID_INPUT', 'Discrete log not found')
}

export interface ChorRivestKeys {
    publicWeights: number[]  // Knapsack weights (public)
    privatePermutation: number[]  // Permutation disguising the structure
    privateD: number  // Modular transformation factor
    generator: GFElement
}

const DEFAULT_KEYS: ChorRivestKeys = (() => {
    const g: GFElement = [5, 1, 0]
    const structuredWeights: number[] = []
    for (let i = 0; i < P; i++) {
        const element: GFElement = [i, 1, 0]
        const log = discreteLog(g, element)
        structuredWeights.push(log)
    }
    const perm = [2, 0, 4, 1, 5, 3, 6]
    const d = 17
    const publicWeights: number[] = new Array(P).fill(0)
    for (let i = 0; i < P; i++) {
        publicWeights[i] = (structuredWeights[perm[i]] + d) % (FIELD_SIZE - 1)
    }
    return {
        publicWeights,
        privatePermutation: perm,
        privateD: d,
        generator: g
    }
})()

function parsePrivateKey(key: string): ChorRivestKeys {
    if (!key || key === 'mock') return DEFAULT_KEYS
    try {
        const parsed = JSON.parse(key) as ChorRivestKeys

        if (
            !Array.isArray(parsed.publicWeights) ||
            !Array.isArray(parsed.privatePermutation) ||
            typeof parsed.privateD !== 'number' ||
            !Array.isArray(parsed.generator)
        ) {
            throw new Error()
        }

        if (
            parsed.publicWeights.length !== MSG_LEN ||
            parsed.privatePermutation.length !== MSG_LEN ||
            parsed.generator.length !== H
        ) {
            throw new Error()
        }

        return parsed
    } catch {
        throw new CipherError(
            'INVALID_INPUT',
            'Invalid Chor-Rivest private key.'
        )
    }
}

/**
 * Encrypt: sum a SUBSET of public weights corresponding to message bits.
 * REQUIRES: message has exactly FIXED_WEIGHT 1-bits.
 */
function encryptMessage(message: number[], keys: ChorRivestKeys): number {
    const weight = message.reduce((sum, bit) => sum + bit, 0)
    if (weight !== FIXED_WEIGHT) {
        throw new CipherError('INVALID_INPUT', `Chor-Rivest requires messages with exactly ${FIXED_WEIGHT} 1-bits. Got ${weight}.`)
    }

    let ciphertext = 0
    for (let i = 0; i < MSG_LEN; i++) {
        if (message[i] === 1) {
            ciphertext = (ciphertext + keys.publicWeights[i]) % (FIELD_SIZE - 1)
        }
    }
    return ciphertext
}

/**
 * Decrypt: transform ciphertext back into GF(p^h) domain where the
 * polynomial root-finding unmasks the subset selection.
 */
function decryptMessage(ciphertext: number, keys: ChorRivestKeys): number[] {
    const targetOrder = FIELD_SIZE - 1
    const S_prime = ((ciphertext - FIXED_WEIGHT * keys.privateD) % targetOrder + targetOrder) % targetOrder

    const E = gfPow(keys.generator, S_prime)
    const Poly = [(E[0] + 1) % P, (E[1] + 1) % P, E[2], 1]

    function evalPoly(poly: number[], x: number): number {
        let val = 0
        let xpow = 1
        for (const co of poly) {
            val = (val + co * xpow) % P
            xpow = (xpow * x) % P
        }
        return val
    }

    const roots: number[] = []
    for (let x = 0; x < P; x++) {
        if (evalPoly(Poly, x) === 0) roots.push(x)
    }

    const recovered_s = roots.map(r => (P - r) % P)
    const pi_inv = new Array(P)
    for (let i = 0; i < P; i++) pi_inv[keys.privatePermutation[i]] = i
    const recovered_indices = recovered_s.map(sj => pi_inv[sj])

    const message: number[] = new Array(MSG_LEN).fill(0)
    for (const idx of recovered_indices) {
        if (idx !== undefined && idx >= 0 && idx < MSG_LEN) {
            message[idx] = 1
        }
    }

    return message
}

function parseHex(s: string): number[] {
    const c = s.replace(/\s+/g, '').toLowerCase()
    if (!/^[0-9a-f]*$/.test(c) || c.length % 2 !== 0) {
        throw new CipherError('INVALID_INPUT', `Must be hex.`)
    }
    const o: number[] = []
    for (let i = 0; i < c.length; i += 2) o.push(parseInt(c.slice(i, i + 2), 16))
    return o
}

function toHex(b: number[]): string {
    return b.map(x => x.toString(16).padStart(2, '0')).join('')
}

function chorRivestCore(input: string, key: string, doDecrypt: boolean, instrument: boolean): CipherResult {
    const start = performance.now()
    const steps: CipherStep[] = []

    if (instrument) {
        steps.push({
            index: 0,
            label: 'Chor-Rivest Setup',
            inputState: `GF(${P}^${H}), msg_len=${MSG_LEN}, weight=${FIXED_WEIGHT}`,
            outputState: 'Knapsack weights via GF(p^h) discrete logs',
            note: 'Chor-Rivest disguises a knapsack via discrete logarithms in the FIELD EXTENSION GF(p^h). FIXED HAMMING WEIGHT CONSTRAINT: messages must have exactly the required number of 1-bits. Broken by Vaudenay (1998) via an attack targeting this specific GF(p^h) construction.',
            isMilestone: true
        })
    }

    let outHex = ''

    if (!doDecrypt) {
        // ENCRYPT
        const keys = parsePrivateKey(key)
        const msgBytes = parseHex(input)
        const bits: number[] = []
        for (const byte of msgBytes) {
            for (let bit = 7; bit >= 0 && bits.length < MSG_LEN; bit--) {
                bits.push((byte >> bit) & 1)
            }
        }
        while (bits.length < MSG_LEN) bits.push(0)

        const ciphertext = encryptMessage(bits, keys)
        outHex = ciphertext.toString(16).padStart(4, '0')

        if (instrument) {
            steps.push({
                index: 1,
                label: 'Chor-Rivest Encryption',
                inputState: `bits=${bits.join('')} (weight=${bits.reduce((a, b) => a + b, 0)})`,
                outputState: `c=${ciphertext}`,
                note: 'Sum the SUBSET of public weights corresponding to message 1-bits. Fixed-weight constraint enforced.',
                isMilestone: true
            })
        }
    } else {
        // DECRYPT
        const keys = parsePrivateKey(key)
        const ciphertext = parseInt(input, 16)
        if (isNaN(ciphertext)) {
            throw new CipherError('INVALID_INPUT', 'Ciphertext must be a valid hex string.')
        }
        const recovered = decryptMessage(ciphertext, keys)
        const numBytes = Math.floor(MSG_LEN / 8)
        const recoveredBytes: number[] = []
        for (let i = 0; i <= numBytes; i++) {
            let b = 0
            for (let bit = 0; bit < 8; bit++) {
                const bitVal = recovered[i * 8 + bit] ?? 0
                b |= (bitVal << (7 - bit))
            }
            if (i < numBytes || b !== 0) recoveredBytes.push(b)
        }
        outHex = toHex(recoveredBytes)

        if (instrument) {
            steps.push({
                index: 1,
                label: 'Chor-Rivest Decryption',
                inputState: `c=${ciphertext}`,
                outputState: `bits=${recovered.join('')} -> hex=${outHex}`,
                note: 'Transform ciphertext back into GF(p^h) domain via Bose-Chowla discrete logarithms & polynomial root finding.',
                isMilestone: true
            })
        }
    }

    return { output: outHex, outputEncoding: 'hex', steps, metadata: METADATA, durationMs: performance.now() - start }
}

/**
 * Encrypt cipher-engine utility export.
 */
export function encrypt(input: string, key: string, options: CipherOptions = {}): CipherResult {
    validateInput(input)
    return chorRivestCore(input, key, false, !!options.instrument)
}

/**
 * Decrypt cipher-engine utility export.
 */
export function decrypt(input: string, key: string, options: CipherOptions = {}): CipherResult {
    validateInput(input)
    return chorRivestCore(input, key, true, !!options.instrument)
}

/**
 * TEST VECTORS cipher-engine utility export.
 */
export const TEST_VECTORS: TestVector[] = [
    {
        input: 'e0',  // 11100000 = 3 bits set (matches FIXED_WEIGHT=3)
        key: 'mock',
        expected: '00c6',
        description: 'Chor-Rivest round-trip with valid fixed-weight message (GF(7^3), weight=3)'
    }
]
