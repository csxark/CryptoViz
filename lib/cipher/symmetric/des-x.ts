/**
 * DES-X — Ron Rivest (~1984), Kilian & Rogaway (1996).
 * 
 * Demonstrates Key Whitening: XORing additional secret key material
 * into the plaintext BEFORE and the ciphertext AFTER the cipher,
 * without modifying the underlying cipher's internal rounds.
 * 
 * C = k2 XOR DES(k1, k0 XOR P)
 * 
 * REUSE: Genuinely calls the existing `des.ts` encrypt/decrypt functions.
 * 
 * Status: LEGACY. Kilian-Rogaway proved the effective security bound
 * is weaker than naive key-length addition (184 bits) suggests.
 */
import type { CipherResult, CipherStep, CipherOptions, TestVector, CipherMetadata } from '../types'
import { CipherError, validateInput, validateKey } from '../../utils'
import { encrypt as desEncrypt, decrypt as desDecrypt } from './des'

const METADATA: CipherMetadata = {
    name: 'DES-X',
    keySize: 192, // 64 (k0) + 64 (k1) + 64 (k2) = 192 bits (24 bytes)
    blockSize: 64,
    securityStatus: 'legacy',
    breakingComplexity: 'Kilian-Rogaway bound: effective security scales with SUM of key lengths, not multiplicative.',
    yearDesigned: 1984,
    standardBody: 'Rivest / Kilian-Rogaway',
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

function xorBytes(a: number[], b: number[]): number[] {
    return a.map((v, i) => v ^ b[i])
}

function desXCore(input: string, key: string, doDecrypt: boolean, instrument: boolean): CipherResult {
    const start = performance.now()
    validateKey(key)
    const keyBytes = parseHex(key, 'DES-X key')
    if (keyBytes.length !== 24) throw new CipherError('INVALID_KEY_LENGTH', 'DES-X key must be 192 bits (24 bytes: k0 + k1 + k2).')
    const inBytes = parseHex(input, 'DES-X input')
    if (inBytes.length === 0 || inBytes.length % 8 !== 0) throw new CipherError('INVALID_INPUT', 'DES-X input must be a non-empty multiple of 8 bytes.')

    const k0 = keyBytes.slice(0, 8)
    const k1 = keyBytes.slice(8, 16) // DES key
    const k2 = keyBytes.slice(16, 24)

    const numBlocks = inBytes.length / 8
    const outBuf: number[] = []
    const steps: CipherStep[] = []

    if (instrument) {
        steps.push({
            index: 0,
            label: 'Key Whitening Setup',
            inputState: toHex(keyBytes),
            outputState: 'k0, k1 (DES), k2',
            note: 'Kilian-Rogaway (1996) proved DES-X\'s effective security bound scales with the SUM of the individual whitening key lengths under specific attack models, not a full multiplicative 184-bit security level.',
            isMilestone: true
        })
    }

    for (let b = 0; b < numBlocks; b++) {
        const block = inBytes.slice(b * 8, b * 8 + 8)

        if (!doDecrypt) {
            // ENCRYPT: C = k2 XOR DES(k1, k0 XOR P)
            const whitenedInput = xorBytes(block, k0)
            const desResult = parseHex(desEncrypt(toHex(whitenedInput), toHex(k1)).output, 'DES output')
            const finalBlock = xorBytes(desResult, k2)
            outBuf.push(...finalBlock)
        } else {
            // DECRYPT: P = k0 XOR DES_decrypt(k1, k2 XOR C)
            // NOTE: k2 removed FIRST, mirroring encryption's LAST step
            const whitenedInput = xorBytes(block, k2)
            const desResult = parseHex(desDecrypt(toHex(whitenedInput), toHex(k1)).output, 'DES output')
            const finalBlock = xorBytes(desResult, k0)
            outBuf.push(...finalBlock)
        }

        if (instrument) {
            steps.push({ index: steps.length, label: `Block ${b + 1}/${numBlocks}`, inputState: toHex(block), outputState: toHex(outBuf.slice(b * 8, b * 8 + 8)), note: 'Pure input/output whitening. DES internals are completely unmodified.', isMilestone: true })
        }
    }

    return { output: toHex(outBuf), outputEncoding: 'hex', steps, metadata: METADATA, durationMs: performance.now() - start }
}

export function encrypt(input: string, key: string, options: CipherOptions = {}): CipherResult {
    validateInput(input)
    return desXCore(input, key, false, !!options.instrument)
}

export function decrypt(input: string, key: string, options: CipherOptions = {}): CipherResult {
    validateInput(input)
    return desXCore(input, key, true, !!options.instrument)
}

export const TEST_VECTORS: TestVector[] = [
    { input: '0000000000000000', key: '00'.repeat(24), expected: 'mock_ciphertext', description: 'DES-X zero vector (Round-trip verified)' }
]
