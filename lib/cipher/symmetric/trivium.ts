/**
 * Trivium — De Cannière & Preneel, 2005. eSTREAM Phase 3 Portfolio.
 * ISO/IEC 29192-3. 288-bit state (three coupled NLFSRs).
 * 80-bit key, 80-bit IV (nonce). 1152 warm-up rounds. XOR stream cipher.
 *
 * Output format:
 *   encrypt(pt_hex, key_hex, {nonce?: iv_hex_20chars}) → nonce_hex(20) + ct_hex
 *   decrypt(nonce+ct_hex, key_hex) → pt_hex
 *
 * State layout (1-indexed bits):
 *   A register: s[1..93]   (93 bits)
 *   B register: s[94..177] (84 bits)
 *   C register: s[178..288] (111 bits)
 *
 * Init: A[1..80]=key, B[94..173]=IV, C[286]=C[287]=C[288]=1, else 0.
 */

import type { CipherResult, CipherStep, CipherOptions, TestVector, CipherMetadata } from '../types'
import { CipherError, validateInput, validateKey } from '../../utils'
import { getSecureRandomValues } from '@/lib/utils/secureRandom';

const ivBytes = getSecureRandomValues(16);
const METADATA: CipherMetadata = {
    name: 'Trivium',
    keySize: 80,
    blockSize: 8,
    rounds: 1152,
    securityStatus: 'legacy',
    breakingComplexity: 'No break on full 1152-init version; 80-bit key limits exhaustive search',
    yearDesigned: 2005,
    standardBody: 'eSTREAM Phase 3 Portfolio; ISO/IEC 29192-3',
}

function triviumInit(keyBytes: Uint8Array, ivBytes: Uint8Array): Uint8Array {
    const s = new Uint8Array(289) // 1-indexed
    for (let i = 0; i < 80; i++) s[1 + i] = (keyBytes[i >> 3] >> (i & 7)) & 1
    for (let i = 0; i < 80; i++) s[94 + i] = (ivBytes[i >> 3] >> (i & 7)) & 1
    s[286] = 1; s[287] = 1; s[288] = 1
    for (let i = 0; i < 1152; i++) triviumClock(s)
    return s
}

function triviumClock(s: Uint8Array): number {
    const t1 = s[66] ^ s[93]
    const t2 = s[162] ^ s[177]
    const t3 = s[243] ^ s[288]
    const z = t1 ^ t2 ^ t3
    const fb1 = t1 ^ (s[91] & s[92]) ^ s[171]
    const fb2 = t2 ^ (s[175] & s[176]) ^ s[264]
    const fb3 = t3 ^ (s[286] & s[287]) ^ s[69]
    for (let i = 93; i > 1; i--) s[i] = s[i - 1]
    for (let i = 177; i > 94; i--) s[i] = s[i - 1]
    for (let i = 288; i > 178; i--) s[i] = s[i - 1]
    s[1] = fb3; s[94] = fb1; s[178] = fb2
    return z
}

function triviumKeystream(s: Uint8Array, n: number): Uint8Array {
    const ks = new Uint8Array(n)
    for (let b = 0; b < n; b++) {
        let byte = 0
        for (let bit = 0; bit < 8; bit++) byte |= triviumClock(s) << bit
        ks[b] = byte
    }
    return ks
}

function randomBytes(n: number): Uint8Array {
    const buf = new Uint8Array(n)
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) crypto.getRandomValues(buf)
    else for (let i = 0; i < n; i++) buf[i] = Math.floor(Math.random() * 256)
    return buf
}

function parseHex(s: string, lbl: string): Uint8Array {
    const c = s.replace(/\s+/g, '').toLowerCase()
    if (!/^[0-9a-f]*$/.test(c) || c.length % 2 !== 0)
        throw new CipherError('INVALID_INPUT', `${lbl} must be even-length hex.`)
    const o = new Uint8Array(c.length / 2)
    for (let i = 0; i < o.length; i++) o[i] = parseInt(c.slice(i * 2, i * 2 + 2), 16)
    return o
}
function toHex(b: Uint8Array): string {
    return Array.from(b).map(x => x.toString(16).padStart(2, '0')).join('')
}

function triviumCore(input: string, key: string, dec: boolean, instrument: boolean, ivHex?: string): CipherResult {
    const t0 = performance.now()
    validateKey(key)
    const kb = parseHex(key, 'Trivium key')
    if (kb.length !== 10)
        throw new CipherError('INVALID_KEY_LENGTH', `Trivium requires 80-bit (10-byte) key. Got ${kb.length} bytes.`)

    let ivBytes: Uint8Array
    let msgHex: string

    if (dec) {
        const raw = parseHex(input, 'Trivium decrypt input')
        if (raw.length < 10)
            throw new CipherError('INVALID_INPUT', 'Trivium decrypt input must be at least 10-byte IV prefix (20 hex chars).')
        ivBytes = raw.slice(0, 10)
        msgHex = toHex(raw.slice(10))
    } else {
        ivBytes = ivHex ? parseHex(ivHex, 'Trivium IV') : randomBytes(10)
        if (ivBytes.length !== 10)
            throw new CipherError('INVALID_INPUT', 'Trivium IV must be 80 bits (10 bytes).')
        msgHex = input
    }

    const msgBytes = parseHex(msgHex, 'Trivium message')
    const state = triviumInit(kb, ivBytes)
    const ks = triviumKeystream(state, msgBytes.length)
    const outBytes = new Uint8Array(msgBytes.length)
    for (let i = 0; i < msgBytes.length; i++) outBytes[i] = msgBytes[i] ^ ks[i]

    const steps: CipherStep[] = []
    if (instrument) {
        steps.push({
            index: 0, label: 'Initialization — load key/IV + 1152 warm-up clocks',
            inputState: `key=${toHex(kb)} iv=${toHex(ivBytes)}`,
            outputState: '288-bit state ready after warm-up',
            note: 'A[1..80]=key bits (LSB-first). B[94..173]=IV bits. C[286..288]=1. Clock 1152× discarding output.',
            isMilestone: true,
        })
        steps.push({
            index: 1, label: `Keystream generation — ${msgBytes.length} bytes`,
            inputState: toHex(ks.slice(0, Math.min(8, ks.length))) + (ks.length > 8 ? '…' : ''),
            outputState: toHex(outBytes.slice(0, Math.min(8, outBytes.length))) + (outBytes.length > 8 ? '…' : ''),
            note: 'Each bit: z=s₆₆⊕s₉₃⊕s₁₆₂⊕s₁₇₇⊕s₂₄₃⊕s₂₈₈. Feedback: fb₁=t₁⊕(s₉₁&s₉₂)⊕s₁₇₁; fb₂=t₂⊕(s₁₇₅&s₁₇₆)⊕s₂₆₄; fb₃=t₃⊕(s₂₈₆&s₂₈₇)⊕s₆₉.',
            isMilestone: true,
        })
    }

    const output = dec ? toHex(outBytes) : toHex(ivBytes) + toHex(outBytes)
    return { output, outputEncoding: 'hex', steps, metadata: METADATA, durationMs: performance.now() - t0 }
}

export function encrypt(input: string, key: string, options: CipherOptions = {}): CipherResult {
    validateInput(input)
    const iv = (options as Record<string, unknown>).nonce as string | undefined
    return triviumCore(input, key, false, !!options.instrument, iv)
}
export function decrypt(input: string, key: string, options: CipherOptions = {}): CipherResult {
    validateInput(input)
    return triviumCore(input, key, true, !!options.instrument)
}

export const TEST_VECTORS: TestVector[] = [
    {
        input: '48656c6c6f20576f726c64',
        key: '00000000000000000000',
        expected: 'randomized',
        description: 'Trivium stream cipher with 80-bit key (randomized 80-bit IV prepended to ciphertext)',
    },
]
