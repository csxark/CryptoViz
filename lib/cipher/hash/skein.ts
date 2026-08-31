/**
 * Skein-256 (Skein-256-256) — Ferguson, Lucks, Schneier et al., 2010.
 * SHA-3 finalist. Threefish-256-based UBI (Unique Block Iteration) chaining.
 * 256-bit output. 4×64-bit internal state. 32-byte blocks.
 *
 * Pipeline: Config (type=4) → Message (type=48) → Output (type=63).
 * UBI step: Threefish256(key=chainState, tweak, block) XOR block.
 *
 * Tweak T[1] bit layout (Skein v1.3 spec §2.1.1):
 *   bits 56-61: type field (Config=4, Message=48, Output=63)
 *   bit 62: isFirst block flag
 *   bit 63: isFinal block flag
 *
 * Threefish-256 constants:
 *   C240 = 0x1BD11BDAA9FC1A22 (key schedule injection constant)
 *   Word permutation π = [0,3,2,1]
 *   72 rounds, subkey inject every 4 rounds (19 total injections s=0..18)
 *
 * Test vectors (Skein v1.3 spec):
 *   Skein-256-256("") = c8877087da56e072870daa843f176e9453115929094c3a40c463a196c29bf7ba
 *   Skein-256-256(0xff) = 0b98dcd198ea0e50a7a244c444e25c23da30c10fc9a1f270a6637f1f34e67ed2
 */

import type { CipherResult, CipherStep, CipherOptions, TestVector, CipherMetadata } from '../types'
import { CipherError } from '../../utils'

const METADATA: CipherMetadata = {
    name: 'Skein-256',
    keySize: 0,
    blockSize: 256,
    rounds: 72,
    securityStatus: 'secure',
    breakingComplexity: 'No practical attacks; 256-bit collision and pre-image resistance',
    yearDesigned: 2008,
    standardBody: 'Skein v1.3 (2010); SHA-3 finalist — not standardised (NIST selected Keccak)',
}

// ── Threefish-256 constants ───────────────────────────────────────────────────
const MASK64 = (1n << 64n) - 1n
const C240 = 0x1BD11BDAA9FC1A22n

// Rotation constants ROT[d%8] = [r_pair0, r_pair1]
const ROT: readonly [number, number][] = [
    [14, 16], [52, 57], [23, 40], [5, 37],
    [25, 33], [46, 12], [58, 22], [32, 32],
]

function rotl64(x: bigint, n: bigint): bigint {
    return ((x << n) | (x >> (64n - n))) & MASK64
}

// ── Byte ↔ word helpers (little-endian 64-bit) ───────────────────────────────
function bytesToWords(b: Uint8Array): bigint[] {
    const words: bigint[] = []
    for (let i = 0; i < b.length; i += 8) {
        let w = 0n
        for (let j = 0; j < 8; j++) w |= BigInt(b[i + j] ?? 0) << BigInt(j * 8)
        words.push(w & MASK64)
    }
    return words
}

function wordsToBytes(words: bigint[]): Uint8Array {
    const b = new Uint8Array(words.length * 8)
    for (let i = 0; i < words.length; i++) {
        let w = words[i] & MASK64
        for (let j = 0; j < 8; j++) { b[i * 8 + j] = Number(w & 0xffn); w >>= 8n }
    }
    return b
}

// ── Threefish-256: 4-word, 72-round block cipher ─────────────────────────────
function threefish256(
    key: readonly bigint[],  // 4 words (the current chain value)
    tweak: readonly bigint[],  // 2 words [t0=byteCount, t1=typeFlags]
    plaintext: readonly bigint[],  // 4 words (message block)
): bigint[] {
    // Extended key: k[4] = C240 XOR k[0] XOR k[1] XOR k[2] XOR k[3]
    const k: bigint[] = [...key, (C240 ^ key[0] ^ key[1] ^ key[2] ^ key[3]) & MASK64]
    // Extended tweak: t[2] = t[0] XOR t[1]
    const t: bigint[] = [...tweak, (tweak[0] ^ tweak[1]) & MASK64]

    let v: bigint[] = [...plaintext]

    // Inject subkey at injection point s
    function inject(s: number): void {
        v[0] = (v[0] + k[s % 5]) & MASK64
        v[1] = (v[1] + k[(s + 1) % 5] + t[s % 3]) & MASK64
        v[2] = (v[2] + k[(s + 2) % 5] + t[(s + 1) % 3]) & MASK64
        v[3] = (v[3] + k[(s + 3) % 5] + BigInt(s)) & MASK64
    }

    inject(0) // Initial injection before round 0

    for (let d = 0; d < 72; d++) {
        const [r0, r1] = ROT[d % 8]
        // MIX pair (0,1)
        v[0] = (v[0] + v[1]) & MASK64
        v[1] = (rotl64(v[1], BigInt(r0)) ^ v[0]) & MASK64
        // MIX pair (2,3)
        v[2] = (v[2] + v[3]) & MASK64
        v[3] = (rotl64(v[3], BigInt(r1)) ^ v[2]) & MASK64
            // Word permutation π=[0,3,2,1]: new[0]=v[0], new[1]=v[3], new[2]=v[2], new[3]=v[1]
            ;[v[0], v[1], v[2], v[3]] = [v[0], v[3], v[2], v[1]]
        // Inject subkey after every 4th round
        if ((d + 1) % 4 === 0) inject((d + 1) / 4)
    }

    return v
}

// ── UBI chaining mode ─────────────────────────────────────────────────────────
// T[1] = (BigInt(type) << 24n) | (isFirst ? 1n<<62n : 0n) | (isFinal ? 1n<<63n : 0n)
function ubi(G: bigint[], msg: Uint8Array, type: number): bigint[] {
    const BLOCK = 32
    const total = msg.length
    const numBlocks = Math.max(1, Math.ceil(total / BLOCK))

    for (let bi = 0; bi < numBlocks; bi++) {
        const isFirst = bi === 0
        const isLast = bi === numBlocks - 1
        const off = bi * BLOCK
        const take = Math.min(BLOCK, total - off)

        const chunk = new Uint8Array(BLOCK) // zero-padded
        if (take > 0) chunk.set(msg.slice(off, off + take))

        const t0 = BigInt(off + take)  // cumulative byte count
        const t1 = (BigInt(type) << 56n)
            | (isFirst ? (1n << 62n) : 0n)
            | (isLast ? (1n << 63n) : 0n)

        const M = bytesToWords(chunk)
        const cipher = threefish256(G, [t0, t1], M)
        G = cipher.map((w, i) => (w ^ M[i]) & MASK64)
    }
    return G
}

// ── Skein-256-256 full pipeline ───────────────────────────────────────────────
function skein256(message: Uint8Array): Uint8Array {
    // Config block (32 bytes):
    // [0..3]  = schema "SHA3" = 0x53,0x48,0x41,0x33
    // [4..5]  = version = 0x01,0x00
    // [6..7]  = reserved = 0x00,0x00
    // [8..15] = output length in bits = 256 = 0x0100 (LE64): [0x00,0x01,0x00,...,0x00]
    // [16..31]= tree params + reserved = all 0x00 (sequential mode)
    const cfg = new Uint8Array(32)
    cfg[0] = 0x53; cfg[1] = 0x48; cfg[2] = 0x41; cfg[3] = 0x33  // "SHA3"
    cfg[4] = 0x01                                           // version 1
    cfg[8] = 0x00; cfg[9] = 0x01                              // 256 bits output (LE)

    // Step 1: Config (initial chain = all zeros, type=4)
    let state = ubi([0n, 0n, 0n, 0n], cfg, 4)

    // Step 2: Message (type=48)
    state = ubi(state, message, 48)

    // Step 3: Output transform (type=63) — 8-byte zero counter, padded to 32 bytes by ubi
    state = ubi(state, new Uint8Array(8), 63)

    return wordsToBytes(state)
}

// ── I/O ──────────────────────────────────────────────────────────────────────
function parseHex(s: string, lbl: string): Uint8Array {
    const c = s.replace(/\s+/g, '').toLowerCase()
    if (!/^[0-9a-f]*$/.test(c) || c.length % 2 !== 0)
        throw new CipherError('INVALID_INPUT', `${lbl} must be even-length hex (may be empty for empty-message hash).`)
    const o = new Uint8Array(c.length / 2)
    for (let i = 0; i < o.length; i++) o[i] = parseInt(c.slice(i * 2, i * 2 + 2), 16)
    return o
}
function toHex(b: Uint8Array): string {
    return Array.from(b).map(x => x.toString(16).padStart(2, '0')).join('')
}

function skeinCore(input: string, instrument: boolean): CipherResult {
    const t0 = performance.now()
    const msg = parseHex(input, 'Skein-256 input')
    const out = skein256(msg)
    const steps: CipherStep[] = []

    if (instrument) {
        steps.push({
            index: 0, label: 'Step 1 — Config block (type=4)',
            inputState: 'Initial chain: [0,0,0,0]',
            outputState: 'New chain value after Config UBI',
            note: 'Config (32 bytes): schema "SHA3"+version 1+256-bit output length. UBI: Threefish256(key=zeros, tweak=[32, type=4|first|final], config) XOR config.',
            isMilestone: true,
        })
        steps.push({
            index: 1, label: `Step 2 — Message (type=48, ${msg.length} bytes)`,
            inputState: input.slice(0, 32) + (input.length > 32 ? '…' : ''),
            outputState: 'New chain value after message UBI',
            note: `${Math.max(1, Math.ceil(msg.length / 32))} block(s). Each: Threefish256(key=chain, tweak=[byteCount, type=48|flags], block) XOR block.`,
            isMilestone: true,
        })
        steps.push({
            index: 2, label: 'Step 3 — Output transform (type=63)',
            inputState: '8-byte zero counter (padded to 32 bytes)',
            outputState: toHex(out),
            note: 'Counter=0 block → Threefish256(key=msgChain, tweak=[8, type=63|first|final], zeroBlock) XOR zeroBlock → 32-byte hash.',
            isMilestone: true,
        })
    }

    return { output: toHex(out), outputEncoding: 'hex', steps, metadata: METADATA, durationMs: performance.now() - t0 }
}

// key param unused for plain hash; both encrypt and decrypt compute the hash
/**
 * Encrypt cryptographic hash export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @param input Input required by the Encrypt operation.
 * @param _key Input required by the Encrypt operation.
 * @param options Input required by the Encrypt operation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/46-3/final — FIPS 46-3.
 */
export function encrypt(input: string, _key: string = '', options: CipherOptions = {}): CipherResult {
    if (input === null || input === undefined) {
        throw new CipherError('INPUT_REQUIRED', 'Input text is required.')
    }
    return skeinCore(input, !!options.instrument)
}
/**
 * Decrypt cryptographic hash export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @param input Input required by the Decrypt operation.
 * @param _key Input required by the Decrypt operation.
 * @param options Input required by the Decrypt operation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/46-3/final — FIPS 46-3.
 */
export function decrypt(input: string, _key: string = '', options: CipherOptions = {}): CipherResult {
    if (input === null || input === undefined) {
        throw new CipherError('INPUT_REQUIRED', 'Input text is required.')
    }
    return skeinCore(input, !!options.instrument)
}

/**
 * TEST VECTORS cryptographic hash export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/46-3/final — FIPS 46-3.
 */
export const TEST_VECTORS: TestVector[] = [
    {
        input: '',
        key: '',
        expected: 'c8877087da56e072870daa843f176e9453115929094c3a40c463a196c29bf7ba',
        description: 'Skein v1.3 spec: Skein-256-256 of empty message',
    },
    {
        input: 'ff',
        key: '',
        expected: '0b98dcd198ea0e50a7a244c444e25c23da30c10fc9a1f270a6637f1f34e67ed2',
        description: 'Skein v1.3 spec: Skein-256-256 of single byte 0xff',
    },
]
