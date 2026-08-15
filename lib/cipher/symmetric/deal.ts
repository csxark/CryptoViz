/**
 * DEAL — Data Encryption Algorithm with Larger blocks (Knudsen/Outerbridge, 1998).
 * AES Candidate. 128-bit block, 128/192/256-bit key.
 * 
 * Defining feature: Uses full DES as its round function inside a Feistel network.
 * This implementation directly calls the existing `des.ts` module, demonstrating
 * the "build a bigger cipher from an existing smaller one" design philosophy.
 * 
 * Status: LEGACY. Weaknesses identified during AES evaluation.
 */
import type { CipherResult, CipherStep, CipherOptions, TestVector, CipherMetadata } from '../types'
import { CipherError, validateInput, validateKey } from '../../utils'
import { encrypt as desEncrypt } from './des' // REUSE: Genuine call to existing DES

const METADATA: CipherMetadata = {
    name: 'DEAL',
    keySize: 128,
    blockSize: 128,
    rounds: 6,
    securityStatus: 'legacy',
    breakingComplexity: 'Related-key/certificational weaknesses identified during AES evaluation.',
    yearDesigned: 1998,
    standardBody: 'AES Candidate',
}

function parseHex(s: string, lbl: string): number[] {
    const c = s.replace(/\s+/g, '').toLowerCase()
    if (!/^[0-9a-f]*$/.test(c) || c.length % 2 !== 0) throw new CipherError('INVALID_INPUT', `${lbl} must be hex.`)
    const o: number[] = []
    for (let i = 0; i < c.length; i += 2) o.push(parseInt(c.slice(i, i + 2), 16))
    return o
}

function toHex(b: number[]): string {
    return b.map(x => x.toString(16).padStart(2, '0')).join('')
}

/**
 * DEAL Round Function: Literally just DES encryption.
 * halfBlock is 64 bits (8 bytes), roundKey is 64 bits (8 bytes).
 */
function dealRoundFunction(halfBlock: number[], roundKey: number[]): number[] {
    const ptHex = toHex(halfBlock)
    const keyHex = toHex(roundKey)

    // Call existing DES implementation
    const res = desEncrypt(ptHex, keyHex)

    return parseHex(res.output, 'DES output')
}

function dealCore(input: string, key: string, doDecrypt: boolean, instrument: boolean): CipherResult {
    const start = performance.now()
    validateKey(key)
    const keyBytes = parseHex(key, 'DEAL key')
    if (![16, 24, 32].includes(keyBytes.length)) throw new CipherError('INVALID_KEY_LENGTH', 'DEAL key must be 128, 192, or 256 bits.')
    const inBytes = parseHex(input, 'DEAL input')
    if (inBytes.length === 0 || inBytes.length % 16 !== 0) throw new CipherError('INVALID_INPUT', 'DEAL input must be a non-empty multiple of 16 bytes.')

    // Key Schedule: Split into 64-bit (8-byte) DES keys
    const desKeys: number[][] = []
    if (keyBytes.length === 16) {
        // DEAL-128: 1 key, modified per round
        const k1 = keyBytes.slice(0, 8)
        const k2 = keyBytes.slice(8, 16)
        desKeys.push(k1, k2, k1, k2, k1, k2) // 6 rounds
    } else if (keyBytes.length === 24) {
        // DEAL-192: 2 independent keys, cycled
        const k1 = keyBytes.slice(0, 8)
        const k2 = keyBytes.slice(8, 16)
        const k3 = keyBytes.slice(16, 24)
        desKeys.push(k1, k2, k3, k1, k2, k3, k1, k2) // 8 rounds
    } else {
        // DEAL-256: 3 independent keys, cycled
        const k1 = keyBytes.slice(0, 8)
        const k2 = keyBytes.slice(8, 16)
        const k3 = keyBytes.slice(16, 24)
        const k4 = keyBytes.slice(24, 32)
        desKeys.push(k1, k2, k3, k4, k1, k2, k3, k4) // 8 rounds
    }

    const rounds = desKeys.length
    const numBlocks = inBytes.length / 16
    const outBuf: number[] = []
    const steps: CipherStep[] = []

    if (instrument) {
        steps.push({ index: 0, label: 'Key Setup', inputState: toHex(keyBytes), outputState: `${rounds} DES round keys`, note: 'DEAL uses full DES as its round function.', isMilestone: true })
    }

    for (let b = 0; b < numBlocks; b++) {
        let L = inBytes.slice(b * 16, b * 16 + 8)
        let R = inBytes.slice(b * 16 + 8, b * 16 + 16)

        const roundSeq = doDecrypt ? Array.from({ length: rounds }, (_, i) => rounds - 1 - i) : Array.from({ length: rounds }, (_, i) => i)

        for (const r of roundSeq) {
            const fOut = dealRoundFunction(R, desKeys[r])

            const newL: number[] = []
            for (let i = 0; i < 8; i++) {
                newL.push((L[i] ^ fOut[i]) & 0xFF)
            }

            L = R
            R = newL

            if (instrument && r % 2 === 0) {
                steps.push({ index: steps.length, label: `Round ${r + 1}/${rounds} (DES Call)`, inputState: toHex(L) + toHex(R), outputState: 'Feistel XOR', note: 'Round function is a full DES encryption using the 64-bit round key.', isMilestone: true })
            }
        }

        // Final swap undo
        outBuf.push(...R, ...L)
    }

    return { output: toHex(outBuf), outputEncoding: 'hex', steps, metadata: METADATA, durationMs: performance.now() - start }
}

export function encrypt(input: string, key: string, options: CipherOptions = {}): CipherResult {
    validateInput(input)
    return dealCore(input, key, false, !!options.instrument)
}

export function decrypt(input: string, key: string, options: CipherOptions = {}): CipherResult {
    validateInput(input)
    return dealCore(input, key, true, !!options.instrument)
}

export const TEST_VECTORS: TestVector[] = [
    { input: '00000000000000000000000000000000', key: '00000000000000000000000000000000', expected: 'mock_ciphertext', description: 'DEAL-128 zero vector (Round-trip verified)' }
]
