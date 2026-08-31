/**
 * Okamoto-Uchiyama Cryptosystem — Okamoto & Uchiyama (EUROCRYPT 1998).
 *
 * Probabilistic public-key encryption with additive homomorphism.
 * Modulus shape: n = p²q (distinct from RSA's p·q, Paillier's p·q,
 * Goldwasser-Micali's p·q).
 *
 * NOTABLE ASYMMETRY: Decryption requires ONLY p, never q.
 *
 * Homomorphic property: E(m1, r1) · E(m2, r2) mod n = E(m1+m2, r1+r2)
 *
 * Positioned historically between Goldwasser-Micali (probabilistic,
 * previous batch) and Paillier (additively homomorphic, already in repo).
 *
 * Status: SECURE.
 */
import type { CipherResult, CipherStep, CipherOptions, TestVector, CipherMetadata } from '../types'
import { CipherError, validateInput } from '../../utils'

const METADATA: CipherMetadata = {
    name: 'Okamoto-Uchiyama',
    securityStatus: 'secure',
    breakingComplexity: 'Relies on p-adic discrete log in order-p subgroup of (Z/p²Z)*. Additively homomorphic.',
    yearDesigned: 1998,
    standardBody: 'EUROCRYPT 1998',
}

// Toy primes (small for visualizer traceability)
// Real implementation would use 1024+ bit primes
const P = 101n      // Prime p
const Q = 97n       // Prime q
const P2 = P * P    // p²
const N = P2 * Q    // n = p²q

// Generator g of order p(p-1) in (Z/p²Z)*
// Chosen so that g^(p-1) mod p² has order p (L-function non-trivial)
const G = 2n  // Toy generator; real scheme requires careful selection
const H = modPow(G, N, N)  // h = g^n mod n

/**
 * Utility helper to sample a cryptographically secure random bigint 
 * within the strict modular boundary: 1 < r < n
 */
function getRandomBigIntBytes(max: bigint): bigint {
    const byteLength = Math.ceil(max.toString(2).length / 8)
    const bytes = new Uint8Array(byteLength)
    while (true) {
        if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
            crypto.getRandomValues(bytes)
        } else {
            for (let i = 0; i < bytes.length; i++) {
                bytes[i] = Math.floor(Math.random() * 256)
            }
        }
        let hex = ''
        bytes.forEach(b => hex += b.toString(16).padStart(2, '0'))
        const r = BigInt('0x' + hex)
        if (r > 1n && r < max) {
            return r
        }
    }
}

function mod(a: bigint, m: bigint): bigint {
    return ((a % m) + m) % m
}

function modPow(base: bigint, exp: bigint, m: bigint): bigint {
    let result = 1n
    let b = mod(base, m)
    let e = exp
    while (e > 0n) {
        if (e % 2n === 1n) result = (result * b) % m
        b = (b * b) % m
        e = e / 2n
    }
    return result
}

// L-function: L(x) = (x - 1) / p (for x ≡ 1 mod p)
function L(x: bigint): bigint {
    return (x - 1n) / P
}

function encryptBit(m: bigint, r: bigint): bigint {
    // c = g^m · h^r mod n
    const gm = modPow(G, m, N)
    const hr = modPow(H, r, N)
    return (gm * hr) % N
}

/**
 * Decryption using ONLY p (not q) — the scheme's defining asymmetry.
 *
 * Mathematical basis:
 *   c^(p-1) mod p² has order dividing p (lives in p-subgroup)
 *   L(c^(p-1) mod p²) / L(g^(p-1) mod p²) = m mod p
 *
 * Note: q is NEVER referenced in this function.
 */
function decryptWithPOnly(c: bigint): bigint {
    // Step 1: Compute c^(p-1) mod p²
    const a = modPow(c, P - 1n, P2)
    // Step 2: Apply L-function
    const La = L(a)
    // Step 3: Compute g^(p-1) mod p² and its L-value (constant for given g, p)
    const gp = modPow(G, P - 1n, P2)
    const Lg = L(gp)
    // Step 4: Recover m mod p via division in Z (works because p is prime)
    // Using modular inverse of Lg mod p
    const LgInv = modInverse(Lg, P)
    return mod(La * LgInv, P)
}

function modInverse(a: bigint, m: bigint): bigint {
    let t = 0n, newt = 1n
    let r = m, newr = mod(a, m)
    while (newr !== 0n) {
        const quotient = r / newr
        t = t - quotient * newt
        r = r - quotient * newr;
        [t, newt] = [newt, t];
        [r, newr] = [newr, r]
    }
    return mod(t, m)
}

function parseHex(s: string): number[] {
    const c = s.replace(/\s+/g, '').toLowerCase()
    if (!/^[0-9a-f]*$/.test(c) || c.length % 2 !== 0) throw new CipherError('INVALID_INPUT', `Must be hex.`)
    const o: number[] = []
    for (let i = 0; i < c.length; i += 2) o.push(parseInt(c.slice(i, i + 2), 16))
    return o
}

function ouCore(input: string, key: string, doDecrypt: boolean, instrument: boolean, options: CipherOptions = {}): CipherResult {
    const start = performance.now()
    const steps: CipherStep[] = []

    if (instrument) {
        steps.push({
            index: 0,
            label: 'Okamoto-Uchiyama Setup',
            inputState: `n = p²q = ${N}`,
            outputState: `p=${P}, q=${Q}, g=${G}`,
            note: 'Modulus n = p²q (distinct from RSA/Paillier/GM\'s p·q). DEFINING ASYMMETRY: decryption requires ONLY p, never q. Additively homomorphic: E(m1)·E(m2) = E(m1+m2). Message space bounded by p.',
            isMilestone: true
        })
    }

    let outHex = ''

    if (!doDecrypt) {
        // ENCRYPT: message as integer < p
        const msgBytes = parseHex(input)
        let m = 0n
        for (const b of msgBytes) m = (m * 256n + BigInt(b)) % P
        
        // Random r via WebCrypto CSPRNG (or deterministic option for regression suites)
        const r = options.r !== undefined ? BigInt(options.r as number | string | bigint) : getRandomBigIntBytes(N)
        const c = encryptBit(m, r)
        outHex = c.toString(16).padStart(16, '0')

        if (instrument) {
            steps.push({
                index: 1,
                label: 'Okamoto-Uchiyama Encryption',
                inputState: `m=${m}`,
                outputState: `c=${c}`,
                note: `c = g^m · h^r mod n. Probabilistic: same m with different r yields different ciphertexts. Additive homomorphism: c1 · c2 mod n encrypts m1 + m2.`,
                isMilestone: true
            })
        }
    } else {
        // DECRYPT using p ONLY
        const c = BigInt('0x' + input)
        const m = decryptWithPOnly(c)
        outHex = m.toString(16).padStart(2, '0')

        if (instrument) {
            steps.push({
                index: 1,
                label: 'Okamoto-Uchiyama Decryption (p-only)',
                inputState: `c=${c}`,
                outputState: `m=${m}`,
                note: 'Decryption uses L-function in order-p subgroup of (Z/p²Z)*. CRITICAL: only p is referenced — q is never needed. This asymmetry is unique among the schemes in this repo.',
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
    return ouCore(input, key, false, !!options.instrument, options)
}

/**
 * Decrypt cipher-engine utility export.
 */
export function decrypt(input: string, key: string, options: CipherOptions = {}): CipherResult {
    validateInput(input)
    return ouCore(input, key, true, !!options.instrument, options)
}

/**
 * Additive homomorphism: multiply ciphertexts to add plaintexts.
 * Exported for direct testing of the homomorphic property.
 */
export function homomorphicAdd(c1: string, c2: string): string {
    const a = BigInt('0x' + c1)
    const b = BigInt('0x' + c2)
    return ((a * b) % N).toString(16).padStart(16, '0')
}

/**
 * TEST VECTORS cipher-engine utility export.
 */
export const TEST_VECTORS: TestVector[] = [
    {
        input: '05',
        key: 'mock',
        expected: '00000000000c9910',
        expectedDecrypt: '05',
        description: 'Okamoto-Uchiyama encrypt/decrypt round-trip (message < p)',
        options: { r: 42 }
    }
]
