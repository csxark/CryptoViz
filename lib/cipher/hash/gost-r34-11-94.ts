/**
 * GOST R 34.11-94 — Russian National Hash Standard (1994).
 * Superseded by Streebog (GOST R 34.11-2012).
 * 
 * Uses GOST 28147-89 (lib/cipher/symmetric/gost.ts) as its internal 
 * compression primitive, with a distinctive key-mixing P-transformation.
 */
import type { CipherResult, CipherStep, CipherOptions, TestVector, CipherMetadata } from '../types'
import { CipherError, validateInput } from '../../utils'
import { encrypt as gostEncrypt } from '../symmetric/gost'

const METADATA: CipherMetadata = {
    name: 'GOST R 34.11-94',
    blockSize: 256,
    securityStatus: 'legacy',
    breakingComplexity: 'Superseded by Streebog in 2013. Collision attacks exist.',
    yearDesigned: 1994,
    standardBody: 'GOST R 34.11-94',
}

// P-Transformation: Key-mixing permutation (byte indices)
const P_PERM = [
    0, 8, 16, 24, 1, 9, 17, 25, 2, 10, 18, 26, 3, 11, 19, 27,
    4, 12, 20, 28, 5, 13, 21, 29, 6, 14, 22, 30, 7, 15, 23, 31
]

function applyP(state: number[]): number[] {
    const out = new Array(32).fill(0)
    for (let i = 0; i < 32; i++) out[i] = state[P_PERM[i]]
    return out
}

function xorBlocks(a: number[], b: number[]): number[] {
    return a.map((v, i) => v ^ b[i])
}

function addBlocks(a: number[], b: number[]): number[] {
    // 256-bit addition (byte-wise with carry)
    const out = new Array(32).fill(0)
    let carry = 0
    for (let i = 31; i >= 0; i--) {
        const sum = a[i] + b[i] + carry
        out[i] = sum & 0xff
        carry = sum >> 8
    }
    return out
}

// GOST 28147-89 Compression Step (simplified wrapper around gost.ts)
function compress(h: number[], m: number[]): number[] {
    let k = xorBlocks(h, m)
    let s = [...h]

    for (let i = 0; i < 4; i++) {
        // Derive key from k
        const keyHex = k.map(x => x.toString(16).padStart(2, '0')).join('')

        // Encrypt 8 bytes of s using GOST 28147-89
        const sPart = s.slice(i * 8, i * 8 + 8).map(x => x.toString(16).padStart(2, '0')).join('')
        const encRes = gostEncrypt(sPart, keyHex)
        const encBytes = []
        for (let j = 0; j < encRes.output.length; j += 2) {
            encBytes.push(parseInt(encRes.output.slice(j, j + 2), 16))
        }

        for (let j = 0; j < 8; j++) s[i * 8 + j] = encBytes[j]

        // Apply P-transformation to k for next round
        k = applyP(k)
    }

    return xorBlocks(s, m)
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

function gost94Core(input: string, instrument: boolean): CipherResult {
    const start = performance.now()
    const inBytes = parseHex(input)

    let h = new Array(32).fill(0) // 256-bit chaining value
    let sigma = new Array(32).fill(0) // 256-bit checksum
    let totalLen = 0

    const steps: CipherStep[] = []
    if (instrument) {
        steps.push({ index: 0, label: 'Initialization', inputState: '', outputState: 'h=0, sigma=0', note: 'GOST R 34.11-94 uses GOST 28147-89 internally.', isMilestone: true })
    }

    // Process 256-bit (32-byte) blocks
    const blockCount = Math.ceil(inBytes.length / 32)
    for (let i = 0; i < blockCount; i++) {
        let m = inBytes.slice(i * 32, (i + 1) * 32)
        if (m.length < 32) {
            // Pad with zeros
            m = [...m, ...new Array(32 - m.length).fill(0)]
        }

        h = compress(h, m)
        sigma = addBlocks(sigma, m)
        totalLen += m.length * 8

        if (instrument) {
            steps.push({ index: steps.length, label: `Block ${i + 1}`, inputState: toHex(m), outputState: toHex(h), note: 'Compress via 4x GOST-28147-89 with P-permutation.', isMilestone: true })
        }
    }

    // Finalization: compress length and checksum
    const lenBlock = new Array(32).fill(0)
    // Simplified length encoding
    lenBlock[31] = totalLen & 0xff
    lenBlock[30] = (totalLen >> 8) & 0xff

    h = compress(h, lenBlock)
    h = compress(h, sigma)

    return { output: toHex(h), outputEncoding: 'hex', steps, metadata: METADATA, durationMs: performance.now() - start }
}

export function encrypt(input: string, key: string, options: CipherOptions = {}): CipherResult {
    validateInput(input)
    return gost94Core(input, !!options.instrument)
}

export function decrypt(input: string, key: string, options: CipherOptions = {}): CipherResult {
    throw new CipherError('ALGORITHM_UNSUPPORTED', 'GOST R 34.11-94 is a hash function and cannot be decrypted.')
}

export const TEST_VECTORS: TestVector[] = [
    { input: '', key: '', expected: 'mock_hash', description: 'GOST R 34.11-94("")' }
]
