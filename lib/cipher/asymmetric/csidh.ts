/**
 * CSIDH (Commutative Supersingular Isogeny Diffie-Hellman) - Educational Simulation
 * 
 * WARNING: This is a pedagogical demonstration model. It simulates the ideal class group 
 * action using trivial scalar modular addition [(peerPub + privKey) % P] instead of 
 * executing actual small-parameter Montgomery curve isogeny evaluations (e.g., Vélu's formulas).
 * DO NOT use this in production environments.
 */
import type { CipherResult, CipherStep, CipherOptions, TestVector, CipherMetadata } from '../types'
import { CipherError } from '../../utils/errors'

export const CSIDH_METADATA = {
  isSimulation: true,
  type: "Pedagogical Demonstration",
  description: "Simulates CSIDH class group action via simplified modular addition for educational visualization."
};

export function computeSharedSecret(peerPub: bigint, privKey: bigint, P: bigint): bigint {
  // Pedagogical simulation of the commutative group action
  return (peerPub + privKey) % P;
}

const METADATA: CipherMetadata = {
    name: 'CSIDH',
    securityStatus: 'experimental',
    breakingComplexity: 'Pedagogical simulation using an integer addition mockup. Real CSIDH requires supersingular curve class group actions over GF(p).',
    yearDesigned: 2018,
    standardBody: 'ASIACRYPT 2018',
    securityWarning: 'PEDAGOGICAL SIMULATION: This visualizer uses a mock integer addition class group action for educational demonstration. It is not real CSIDH math.',
}

// CSIDH-512 Prime (511 bits)
const CSIDH_P = BigInt("0x65b48e8f740f89bffc8ab0d15e3e4c4ab42d083aedc88c425afbffa" +
    "b58d8d24c107e2e04fdb74b43dad1e0b59d09fb5b1b9ce9e98b33fa6dac")

// First 74 odd primes
const PRIMES = [3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79, 83, 89, 97, 101, 103, 107, 109, 113, 127, 131, 137, 139, 149, 151, 157, 163, 167, 173, 179, 181, 191, 193, 197, 199, 211, 223, 227, 229, 233, 239, 241, 251, 257, 263, 269, 271, 277, 281, 283, 293, 307, 311, 313, 317, 331, 337, 347, 349, 353, 359, 367, 373]

function mod(a: bigint, m: bigint): bigint { return ((a % m) + m) % m }
function modPow(base: bigint, exp: bigint, m: bigint): bigint {
    let res = 1n, b = mod(base, m), e = exp
    while (e > 0n) {
        if (e % 2n === 1n) res = mod(res * b, m)
        b = mod(b * b, m)
        e = e / 2n
    }
    return res
}
function modInv(a: bigint, m: bigint): bigint { return modPow(a, m - 2n, m) }

function parseHex(s: string, lbl: string): bigint {
    const c = s.replace(/\s+/g, '').toLowerCase()
    if (!/^[0-9a-f]*$/.test(c)) throw new CipherError('INVALID_INPUT', `${lbl} must be hex.`)
    return BigInt('0x' + c)
}
function toHex(b: bigint, bytes: number = 64): string {
    return b.toString(16).padStart(bytes * 2, '0')
}

function csidhCore(input: string, key: string, instrument: boolean): CipherResult {    const start = performance.now()
    const steps: CipherStep[] = []

    // Mock CSIDH class group action for visualizer
    // Real implementation requires Montgomery ladder and Vélu's formulas
    const privKey = parseHex(key || '00', 'CSIDH private key')
    const peerPub = parseHex(input || '00', 'CSIDH peer public key')

    // Simplified action: shared_secret = (peerPub + privKey) mod P
    const shared = computeSharedSecret(peerPub, privKey, CSIDH_P)

    const outHex = toHex(shared)

    if (instrument) {
        steps.push({
            index: 0,
            label: '⚠️ Educational Simulation Disclaimer',
            inputState: 'Simulation Mode',
            outputState: 'Mock Class Group Action',
            note: 'PEDAGOGICAL SIMULATION: This implementation uses a simplified integer addition mockup (peerPub + privKey mod P) to illustrate commutative group action properties. Real CSIDH computes supersingular elliptic curve isogenies over GF(p) using Montgomery ladders and Vélu formulas.',
            isMilestone: true,
        })
        steps.push({
            index: 1,
            label: 'CSIDH Commutative Key Exchange',
            inputState: `Peer A: ${toHex(peerPub)}`,
            outputState: `Shared: ${outHex}`,
            note: `Commutative class group action. Alice.apply(Bob) == Bob.apply(Alice). (Simulated via integer addition mod P).`,
            isMilestone: true
        })
    }

    return { output: outHex, outputEncoding: 'hex', steps, metadata: METADATA, durationMs: performance.now() - start }
}

/**
 * Evaluates pedagogical CSIDH mathematical parameters for educational visualization.
 */
export function describeCsidhGroupAction(peerPubHex: string, privKeyHex: string): {
    simulatedSharedHex: string;
    isIdentity: boolean;
    primeBits: number;
    explanation: string;
} {
    const privKey = parseHex(privKeyHex || '00', 'CSIDH private key')
    const peerPub = parseHex(peerPubHex || '00', 'CSIDH peer public key')
    const shared = mod(peerPub + privKey, CSIDH_P)
    const simulatedSharedHex = toHex(shared)
    const isIdentity = shared === 0n

    return {
        simulatedSharedHex,
        isIdentity,
        primeBits: 511,
        explanation: 'CSIDH utilizes ideal class group actions of O = Z[sqrt(-p)] acting on supersingular curves E over GF(p). Due to commutative property [a]([b]E) = [b]([a]E), Alice and Bob compute isomorphic target curves.',
    }
}

export function encrypt(input: string, key: string, options: CipherOptions = {}): CipherResult {
    return csidhCore(input, key, !!options.instrument)
}

export function decrypt(input: string, key: string, options: CipherOptions = {}): CipherResult {
    return csidhCore(input, key, !!options.instrument)
}

export const TEST_VECTORS: TestVector[] = [
  { input: '00', key: '00', expected: '00'.repeat(64), description: 'CSIDH identity element' },
  { input: '0a', key: '05', expected: '00'.repeat(63) + '0f', description: 'Pedagogical addition mockup vector (0a + 05 = 0f)' },
]
