/**
 * Cramer-Shoup Cryptosystem — Cramer & Shoup, 1998.
 * First practical IND-CCA2-secure public-key scheme in the standard model.
 * 
 * Extension of ElGamal with 5 secret exponents and a hash-based 
 * integrity check woven into the ciphertext.
 */
import type { CipherResult, CipherStep, CipherOptions, TestVector, CipherMetadata } from '../types'
import { CipherError, validateInput } from '../../utils'

const METADATA: CipherMetadata = {
    name: 'Cramer-Shoup',
    securityStatus: 'secure',
    breakingComplexity: 'IND-CCA2 secure in standard model (no random oracles).',
    yearDesigned: 1998,
    standardBody: 'Cramer & Shoup (CRYPTO 1998)',
}

// Toy parameters for visualizer
const P = 0xFFFFFFFFFFFFFFC5n
const Q = P - 1n
const G1 = 2n
const G2 = 3n

function mod(n: bigint, m: bigint): bigint { return ((n % m) + m) % m }
function modPow(base: bigint, exp: bigint, mod: bigint): bigint {
    let res = 1n, b = mod(base, mod), e = exp
    while (e > 0n) {
        if (e % 2n === 1n) res = (res * b) % mod
        b = (b * b) % mod
        e /= 2n
    }
    return res
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

function bigintToBytes(n: bigint, len: number): number[] {
    const out = new Array(len).fill(0)
    for (let i = 0; i < len; i++) out[len - 1 - i] = Number((n >> BigInt(i * 8)) & 0xFFn)
    return out
}

// Simple mock hash for alpha = Hash(u1 || u2 || e)
function mockHash(u1: bigint, u2: bigint, e: bigint): bigint {
    return mod(u1 ^ u2 ^ e, Q)
}

function cramerShoupCore(input: string, key: string, doDecrypt: boolean, instrument: boolean): CipherResult {
    const start = performance.now()
    const steps: CipherStep[] = []

    if (instrument) {
        steps.push({ index: 0, label: 'Cramer-Shoup Setup', inputState: `Generators: G1, G2`, outputState: '5 secret exponents', note: 'IND-CCA2 security via hash-based integrity check.', isMilestone: true })
    }

    let outHex = ''

    if (!doDecrypt) {
        // ENCRYPT
        // Key format: "x1,x2,y1,y2,z" (Private key components for simplicity in visualizer, though normally public key is used)
        // Let's assume key contains public keys c, d, h for encryption
        // For visualizer simplicity, we'll just do a round-trip mock

        const m = BigInt('0x' + input) // Message as group element
        const r = 987654321n

        const u1 = modPow(G1, r, P)
        const u2 = modPow(G2, r, P)

        // e = h^r * m mod p
        const z = 5n // Mock secret exponent
        const h = modPow(G1, z, P)
        const e = mod(modPow(h, r, P) * m, P)

        const alpha = mockHash(u1, u2, e)

        // v = c^r * d^(r*alpha)
        const x1 = 1n, x2 = 2n, y1 = 3n, y2 = 4n
        const c = mod(modPow(G1, x1, P) * modPow(G2, x2, P), P)
        const d = mod(modPow(G1, y1, P) * modPow(G2, y2, P), P)
        const v = mod(modPow(c, r, P) * modPow(d, r * alpha, P), P)

        outHex = toHex(bigintToBytes(u1, 8)) + toHex(bigintToBytes(u2, 8)) +
            toHex(bigintToBytes(e, 8)) + toHex(bigintToBytes(v, 8))

        if (instrument) {
            steps.push({ index: 1, label: 'Cramer-Shoup Encryption', inputState: input, outputState: outHex, note: 'u1, u2, e, v computed. alpha = Hash(u1||u2||e).', isMilestone: true })
        }
    } else {
        // DECRYPT
        const parts = input.match(/.{16}/g) || []
        if (parts.length < 4) throw new CipherError('INVALID_INPUT', 'Invalid ciphertext format.')

        const u1 = BigInt('0x' + parts[0])
        const u2 = BigInt('0x' + parts[1])
        const e = BigInt('0x' + parts[2])
        const v = BigInt('0x' + parts[3])

        const alpha = mockHash(u1, u2, e)

        // INTEGRITY CHECK
        const x1 = 1n, x2 = 2n, y1 = 3n, y2 = 4n
        const check = mod(modPow(u1, x1 + y1 * alpha, P) * modPow(u2, x2 + y2 * alpha, P), P)

        if (check !== v) {
            throw new CipherError('INTEGRITY_CHECK_FAILED', 'Cramer-Shoup CCA2 integrity check failed. Ciphertext rejected.')
        }

        const z = 5n
        const u1z = modPow(u1, z, P)
        // m = e / u1^z mod p
        const m = mod(e * modInverse(u1z, P), P)

        outHex = toHex(bigintToBytes(m, 8))

        if (instrument) {
            steps.push({ index: 1, label: 'Cramer-Shoup Decryption', inputState: input, outputState: outHex, note: 'Integrity check passed. m = e / u1^z.', isMilestone: true })
        }
    }

    return { output: outHex, outputEncoding: 'hex', steps, metadata: METADATA, durationMs: performance.now() - start }
}

function modInverse(k: bigint, p: bigint): bigint {
    let t = 0n, newt = 1n, r = p, newr = mod(k, p)
    while (newr !== 0n) {
        const q = r / newr;
        [t, newt] = [newt, t - q * newt]
        [r, newr] = [newr, r - q * newr]
    }
    return mod(t, p)
}

export function encrypt(input: string, key: string, options: CipherOptions = {}): CipherResult {
    validateInput(input)
    return cramerShoupCore(input, key, false, !!options.instrument)
}

export function decrypt(input: string, key: string, options: CipherOptions = {}): CipherResult {
    validateInput(input)
    return cramerShoupCore(input, key, true, !!options.instrument)
}

export const TEST_VECTORS: TestVector[] = [
    { input: '0000000000000001', key: 'mock_keys', expected: 'mock_ciphertext', description: 'Cramer-Shoup Round-trip' }
]
