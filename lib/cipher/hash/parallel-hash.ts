/**
 * ParallelHash128 — NIST SP 800-185
 * cSHAKE128-based parallel tree hash.
 * Configurable block size B, variable output length, customization string.
 */
import type { CipherResult, CipherStep, CipherOptions, TestVector, CipherMetadata } from '../types'
import { CipherError } from '../../utils/errors'
// @ts-ignore
import { shake128 } from '@noble/hashes/sha3'
import { toHex } from '../../utils/encoding';

const METADATA: CipherMetadata = {
    name: 'ParallelHash128',
    blockSize: 512,
    securityStatus: 'recommended',
    breakingComplexity: 'NIST SP 800-185 standard. Provably as secure as SHAKE-128.',
    yearDesigned: 2016,
    standardBody: 'NIST SP 800-185',
}

function left_encode(n: number): Uint8Array {
    if (n === 0) return new Uint8Array([0x01, 0x00])
    let bytes = []
    let temp = n
    while (temp > 0) {
        bytes.unshift(temp & 0xff)
        temp = temp >>> 8
    }
    bytes.unshift(bytes.length)
    return new Uint8Array(bytes)
}

function right_encode(n: number): Uint8Array {
    if (n === 0) return new Uint8Array([0x00, 0x01])
    let bytes = []
    let temp = n
    while (temp > 0) {
        bytes.unshift(temp & 0xff)
        temp = temp >>> 8
    }
    bytes.push(bytes.length)
    return new Uint8Array(bytes)
}

function bytepad(X: Uint8Array, w: number): Uint8Array {
    const z = left_encode(w)
    const padLen = w - ((z.length + X.length) % w)
    const pad = new Uint8Array(padLen % w)
    const res = new Uint8Array(z.length + X.length + pad.length)
    res.set(z, 0)
    res.set(X, z.length)
    return res
}

function encode_string(S: Uint8Array): Uint8Array {
    const lenEnc = left_encode(S.length * 8)
    const res = new Uint8Array(lenEnc.length + S.length)
    res.set(lenEnc, 0)
    res.set(S, lenEnc.length)
    return res
}

function cshake128(X: Uint8Array, L: number, N: string, S: string): Uint8Array {
    if (N === '' && S === '') {
        return shake128(X, { dkLen: L / 8 })
    }
    const N_enc = encode_string(new TextEncoder().encode(N))
    const S_enc = encode_string(new TextEncoder().encode(S))
    const prefix = bytepad(new Uint8Array([...N_enc, ...S_enc]), 168)
    const input = new Uint8Array(prefix.length + X.length)
    input.set(prefix, 0)
    input.set(X, prefix.length)
    return shake128(input, { dkLen: L / 8 })
}

export function generate(input: string, key: string, options: CipherOptions = {}): CipherResult {
    const start = performance.now()
    const X = new TextEncoder().encode(input)

    const keyParts = key.split(':')
    const B = parseInt(keyParts[0]) || 64
    const S = keyParts[1] || ''

    if (B <= 0) throw new CipherError('INVALID_INPUT', 'Block size B must be a positive integer.')

    const L = (options.outputLength as number) || 256
    const steps: CipherStep[] = []

    const n = Math.ceil(X.length / B)
    const H: Uint8Array[] = []

    if (n === 0) {
        const rootInput = new Uint8Array([...left_encode(B), ...right_encode(0), ...right_encode(L)])
        const hash = cshake128(rootInput, L, 'ParallelHash', S)

        if (options.instrument) {
            steps.push({ index: 0, label: 'ParallelHash128 (Empty)', inputState: '', outputState: toHex(hash), note: `B=${B}, L=${L}, S="${S}"`, isMilestone: true })
        }
        return { output: toHex(hash), outputEncoding: 'hex', steps, metadata: METADATA, durationMs: performance.now() - start }
    }

    for (let i = 0; i < n; i++) {
        const chunk = X.slice(i * B, (i + 1) * B)
        const prefix = new Uint8Array([...left_encode(B), ...left_encode(i)])
        const chunkInput = new Uint8Array(prefix.length + chunk.length)
        chunkInput.set(prefix, 0)
        chunkInput.set(chunk, prefix.length)
        H.push(cshake128(chunkInput, 256, '', ''))
    }

    let rootInput = left_encode(B)
    for (const h of H) rootInput = new Uint8Array([...rootInput, ...h])
    rootInput = new Uint8Array([...rootInput, ...right_encode(n), ...right_encode(L)])

    const hash = cshake128(rootInput, L, 'ParallelHash', S)

    if (options.instrument) {
        steps.push({ index: 0, label: 'ParallelHash128', inputState: input, outputState: toHex(hash), note: `${n} chunks of size ${B}. L=${L}, S="${S}"`, isMilestone: true })
    }

    return { output: toHex(hash), outputEncoding: 'hex', steps, metadata: METADATA, durationMs: performance.now() - start }
}

export function verify(input: string, key: string, hash: string, options: CipherOptions = {}): boolean {
    const result = generate(input, key, options)
    return result.output === hash.toLowerCase()
}

export const TEST_VECTORS: TestVector[] = [
    { input: '', key: '8:', expected: '4fec041e653c9dd6bbf60f1408a824d7', description: 'ParallelHash128 empty input, B=8' }
]
