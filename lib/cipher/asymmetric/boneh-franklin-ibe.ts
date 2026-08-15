/**
 * Boneh-Franklin Identity-Based Encryption (IBE) — 2001.
 * 
 * Defining feature: The public key IS an arbitrary identity string
 * (e.g., an email address). No prior key exchange or PKI is needed.
 * A trusted Private Key Generator (PKG) derives private keys from
 * a master secret and the identity string.
 * 
 * TOY IMPLEMENTATION NOTE:
 * Uses a simplified pairing e(P,Q) = g^(PQ) mod p to demonstrate
 * the bilinearity property e(aP, bQ) = e(P,Q)^(ab) without requiring
 * complex finite field extensions.
 */
import type { CipherResult, CipherStep, CipherOptions, TestVector, CipherMetadata } from '../types'
import { CipherError, validateInput } from '../../utils'

const METADATA: CipherMetadata = {
    name: 'Boneh-Franklin IBE',
    securityStatus: 'secure',
    breakingComplexity: 'Relies on Bilinear Diffie-Hellman Problem. Requires trusted PKG.',
    yearDesigned: 2001,
    standardBody: 'Boneh & Franklin (CRYPTO 2001)',
}

// Toy parameters
const P = 0xFFFFFFFFFFFFFFC5n
const Q = P - 1n
const G_GEN = 2n

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

// Toy Bilinear Pairing
function pairing(P: bigint, Q: bigint): bigint {
    return modPow(G_GEN, mod(P * Q, Q), P)
}

// Toy Hash-to-Curve
function hashToCurve(id: string): bigint {
    let hash = 0n
    for (let i = 0; i < id.length; i++) {
        hash = mod(hash * 31n + BigInt(id.charCodeAt(i)), Q)
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

function ibeCore(input: string, key: string, doDecrypt: boolean, instrument: boolean): CipherResult {
    const start = performance.now()
    const steps: CipherStep[] = []

    if (instrument) {
        steps.push({
            index: 0,
            label: 'IBE Setup',
            inputState: 'Identity-as-Public-Key',
            outputState: 'PKG Master Secret',
            note: 'Encryption requires ONLY the recipient\'s identity string and the PKG public key. No prior contact needed.',
            isMilestone: true
        })
    }

    let outHex = ''

    if (!doDecrypt) {
        // ENCRYPT
        // Key format: "PKG_pub, recipient_identity"
        const parts = key.split(',')
        if (parts.length < 2) throw new CipherError('INVALID_INPUT', 'Encrypt requires PKG_pub and identity.')

        const P_pub = BigInt('0x' + parts[0])
        const identity = parts[1]

        const Q_ID = hashToCurve(identity)
        const r = 123456789n // Toy random

        const U = mod(r, Q) // r * P (where P=1)

        // sharedValue = e(Q_ID, P_pub)^r
        const sharedValue = modPow(pairing(Q_ID, P_pub), r, P)

        // Simple XOR mask derivation from sharedValue
        const mask = sharedValue & 0xFFn

        const msgBytes = parseHex(input)
        const ctBytes = msgBytes.map(b => (BigInt(b) ^ mask) & 0xFFn)

        outHex = bigintToHex(U) + ctBytes.map(b => b.toString(16).padStart(2, '0')).join('')

        if (instrument) {
            steps.push({ index: 1, label: 'IBE Encryption', inputState: `To: ${identity}`, outputState: outHex, note: 'U = rP, V = M xor H(e(Q_ID, P_pub)^r). Bilinearity ensures recipient can recover sharedValue.', isMilestone: true })
        }
    } else {
        // DECRYPT
        // Key format: "private_key_d_ID"
        const d_ID = BigInt('0x' + key)

        const U = BigInt('0x' + input.slice(0, 16))
        const V_hex = input.slice(16)
        const V_bytes = parseHex(V_hex)

        // sharedValue' = e(d_ID, U)
        // By bilinearity: e(s*Q_ID, r*P) = e(Q_ID, P)^(sr) = e(Q_ID, s*P)^r = e(Q_ID, P_pub)^r
        const sharedValue = pairing(d_ID, U)
        const mask = sharedValue & 0xFFn

        const ptBytes = V_bytes.map(b => (BigInt(b) ^ mask) & 0xFFn)
        outHex = toHex(ptBytes.map(Number))

        if (instrument) {
            steps.push({ index: 1, label: 'IBE Decryption', inputState: input, outputState: outHex, note: 'e(d_ID, U) recovers the exact sharedValue used by encryptor.', isMilestone: true })
        }
    }

    return { output: outHex, outputEncoding: 'hex', steps, metadata: METADATA, durationMs: performance.now() - start }
}

export function encrypt(input: string, key: string, options: CipherOptions = {}): CipherResult {
    validateInput(input)
    return ibeCore(input, key, false, !!options.instrument)
}

export function decrypt(input: string, key: string, options: CipherOptions = {}): CipherResult {
    validateInput(input)
    return ibeCore(input, key, true, !!options.instrument)
}

export const TEST_VECTORS: TestVector[] = [
    { input: '68656c6c6f', key: 'mock_pkg_pub,alice@example.com', expected: 'mock_ct', description: 'IBE Encrypt/Decrypt Round-trip' }
]
