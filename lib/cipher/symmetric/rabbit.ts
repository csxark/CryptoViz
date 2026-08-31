/**
 * Rabbit — Boesgaard, Vesterager, Christensen, Zenner, 2003.
 * eSTREAM Portfolio Phase 3, RFC 4503.
 * 128-bit key, 64-bit optional IV. Synchronous stream cipher using a non-linear
 * counter system (8 state words, 8 counter words) and a squaring g-function.
 *
 * Test vector (RFC 4503 Appendix A.1, no IV):
 * key = 00000000000000000000000000000000
 * S0  = b15754f036a5d6ecf56b45261c4af702
 */
import type { CipherResult, CipherStep, CipherOptions, TestVector, CipherMetadata } from '../types'
import { CipherError, validateInput, validateKey } from '../../utils'

const METADATA: CipherMetadata = {
    name: 'Rabbit',
    keySize: 128,
    blockSize: 128,
    securityStatus: 'secure',
    breakingComplexity: 'No practical attacks; eSTREAM software profile portfolio.',
    yearDesigned: 2003,
    standardBody: 'RFC 4503; eSTREAM Portfolio',
}

const A: number[] = [
    0x4D34D34D, 0xD34D34D3, 0x34D34D34, 0x4D34D34D,
    0xD34D34D3, 0x34D34D34, 0x4D34D34D, 0xD34D34D3
]

function u32(n: number): number { return n >>> 0 }
function rotl(x: number, n: number): number { return u32((x << n) | (x >>> (32 - n))) }

function parseHex(s: string, lbl: string): Uint8Array {
    const c = s.replace(/\s+/g, '').toLowerCase()
    if (!/^[0-9a-f]*$/.test(c) || c.length % 2 !== 0) throw new CipherError('INVALID_INPUT', `${lbl} must be hex.`)
    const o = new Uint8Array(c.length / 2)
    for (let i = 0; i < o.length; i++) o[i] = parseInt(c.slice(i * 2, i * 2 + 2), 16)
    return o
}

function toHex(b: Uint8Array): string {
    return Array.from(b).map(x => x.toString(16).padStart(2, '0')).join('')
}

function g(u: number, v: number): number {
    // 64-bit precision required for squaring
    const sum = BigInt(u32(u + v))
    const sq = sum * sum
    const lsw = Number(sq & 0xFFFFFFFFn)
    const msw = Number((sq >> 32n) & 0xFFFFFFFFn)
    return u32(lsw ^ msw)
}

interface RabbitState {
    X: number[]
    C: number[]
    b: number
}

function nextSystemState(state: RabbitState): RabbitState {
    const { X, C, b: oldB } = state
    const newC = [...C]
    let b = oldB

    // Counter update
    for (let j = 0; j < 8; j++) {
        const temp = BigInt(newC[j]) + BigInt(A[j]) + BigInt(b)
        b = Number((temp >> 32n) & 1n)
        newC[j] = Number(temp & 0xFFFFFFFFn)
    }

    // Next state function
    const G = new Array(8)
    for (let j = 0; j < 8; j++) {
        G[j] = g(X[j], newC[j])
    }

    const newX = [
        u32(G[0] + rotl(G[7], 16) + rotl(G[6], 16)),
        u32(G[1] + rotl(G[0], 8) + G[7]),
        u32(G[2] + rotl(G[1], 16) + rotl(G[0], 16)),
        u32(G[3] + rotl(G[2], 8) + G[1]),
        u32(G[4] + rotl(G[3], 16) + rotl(G[2], 16)),
        u32(G[5] + rotl(G[4], 8) + G[3]),
        u32(G[6] + rotl(G[5], 16) + rotl(G[4], 16)),
        u32(G[7] + rotl(G[6], 8) + G[5])
    ]

    return { X: newX, C: newC, b }
}

function extractS(X: number[]): Uint8Array {
    const s0 = u32((X[0] & 0xFFFF) ^ ((X[5] >>> 16) & 0xFFFF))
    const s1 = u32(((X[0] >>> 16) & 0xFFFF) ^ (X[3] & 0xFFFF))
    const s2 = u32((X[2] & 0xFFFF) ^ ((X[7] >>> 16) & 0xFFFF))
    const s3 = u32(((X[2] >>> 16) & 0xFFFF) ^ (X[5] & 0xFFFF))
    const s4 = u32((X[4] & 0xFFFF) ^ ((X[1] >>> 16) & 0xFFFF))
    const s5 = u32(((X[4] >>> 16) & 0xFFFF) ^ (X[7] & 0xFFFF))
    const s6 = u32((X[6] & 0xFFFF) ^ ((X[3] >>> 16) & 0xFFFF))
    const s7 = u32(((X[6] >>> 16) & 0xFFFF) ^ (X[1] & 0xFFFF))

    const out = new Uint8Array(16)
    // Big Endian extraction per I2OSP
    out[0] = (s7 >>> 8) & 0xFF; out[1] = s7 & 0xFF
    out[2] = (s6 >>> 8) & 0xFF; out[3] = s6 & 0xFF
    out[4] = (s5 >>> 8) & 0xFF; out[5] = s5 & 0xFF
    out[6] = (s4 >>> 8) & 0xFF; out[7] = s4 & 0xFF
    out[8] = (s3 >>> 8) & 0xFF; out[9] = s3 & 0xFF
    out[10] = (s2 >>> 8) & 0xFF; out[11] = s2 & 0xFF
    out[12] = (s1 >>> 8) & 0xFF; out[13] = s1 & 0xFF
    out[14] = (s0 >>> 8) & 0xFF; out[15] = s0 & 0xFF
    return out
}

function setup(keyBytes: Uint8Array, ivBytes?: Uint8Array): RabbitState {
    // Read key as Big-Endian 16-bit words from the end
    const K = new Array(8)
    for (let j = 0; j < 8; j++) {
        K[j] = u32((keyBytes[14 - j * 2] << 8) | keyBytes[15 - j * 2])
    }

    const X = new Array(8)
    const C = new Array(8)
    for (let j = 0; j < 8; j++) {
        if (j % 2 === 0) {
            X[j] = u32((K[(j + 1) % 8] << 16) | K[j])
            C[j] = u32((K[(j + 4) % 8] << 16) | K[(j + 5) % 8])
        } else {
            X[j] = u32((K[(j + 5) % 8] << 16) | K[(j + 4) % 8])
            C[j] = u32((K[j] << 16) | K[(j + 1) % 8])
        }
    }
    let b = 0

    let state: RabbitState = { X, C, b }

    // Key setup iterations
    for (let i = 0; i < 4; i++) state = nextSystemState(state)

    // Reinitialize counters
    for (let j = 0; j < 8; j++) state.C[j] = u32(state.C[j] ^ state.X[(j + 4) % 8])

    // IV setup (optional)
    if (ivBytes && ivBytes.length === 8) {
        const IV_words = new Array(4)
        for (let j = 0; j < 4; j++) {
            IV_words[j] = u32((ivBytes[j * 2] << 8) | ivBytes[j * 2 + 1])
        }
        state.C[0] ^= u32((IV_words[2] << 16) | IV_words[3])
        state.C[1] ^= u32((IV_words[0] << 16) | IV_words[2])
        state.C[2] ^= u32((IV_words[0] << 16) | IV_words[1])
        state.C[3] ^= u32((IV_words[1] << 16) | IV_words[3])
        state.C[4] ^= u32((IV_words[2] << 16) | IV_words[3])
        state.C[5] ^= u32((IV_words[0] << 16) | IV_words[2])
        state.C[6] ^= u32((IV_words[0] << 16) | IV_words[1])
        state.C[7] ^= u32((IV_words[1] << 16) | IV_words[3])

        for (let i = 0; i < 4; i++) state = nextSystemState(state)
    }

    return state
}

function rabbitCore(input: string, key: string, iv: string | undefined, instrument: boolean): CipherResult {
    const start = performance.now()
    validateKey(key)
    const keyBytes = parseHex(key, 'Rabbit key')
    if (keyBytes.length !== 16) throw new CipherError('INVALID_KEY_LENGTH', `Rabbit key must be 128 bits (32 hex chars).`)

    const inBytes = parseHex(input, 'Rabbit input')
    let ivBytes: Uint8Array | undefined
    if (iv) {
        ivBytes = parseHex(iv, 'Rabbit IV')
        if (ivBytes.length !== 8) throw new CipherError('INVALID_INPUT', `Rabbit IV must be 64 bits (16 hex chars).`)
    }

    let state = setup(keyBytes, ivBytes)
    const outBuf = new Uint8Array(inBytes.length)
    const steps: CipherStep[] = []

    if (instrument) {
        steps.push({
            index: 0,
            label: 'Key & IV Setup',
            inputState: toHex(keyBytes) + (ivBytes ? '|' + toHex(ivBytes) : ''),
            outputState: `Initialized 512-bit inner state`,
            note: `Counter system driven by fixed A-constants. g(u,v) uses BigInt 64-bit squaring to avoid precision loss.`,
            isMilestone: true,
        })
    }

    let offset = 0
    let blockCount = 0

    while (offset < inBytes.length) {
        state = nextSystemState(state)
        const keystreamBlock = extractS(state.X)
        blockCount++

        const chunkSize = Math.min(16, inBytes.length - offset)
        for (let i = 0; i < chunkSize; i++) {
            outBuf[offset + i] = inBytes[offset + i] ^ keystreamBlock[i]
        }

        if (instrument) {
            steps.push({
                index: steps.length,
                label: `Keystream Block ${blockCount} — XOR`,
                inputState: toHex(inBytes.slice(offset, offset + chunkSize)),
                outputState: toHex(outBuf.slice(offset, offset + chunkSize)),
                note: `Extracted 128-bit keystream via state word XOR combinations.`,
                isMilestone: true,
            })
        }
        offset += chunkSize
    }

    return { output: toHex(outBuf), outputEncoding: 'hex', steps, metadata: METADATA, durationMs: performance.now() - start }
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
    return rabbitCore(input, key, options.iv as string | undefined, !!options.instrument)
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
    return rabbitCore(input, key, options.iv as string | undefined, !!options.instrument)
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
    {
        input: '00000000000000000000000000000000',
        key: '00000000000000000000000000000000',
        expected: 'b15754f036a5d6ecf56b45261c4af702',
        description: 'RFC 4503 Appendix A.1: No IV, zero key, zero plaintext (XOR with keystream)',
    }
]
