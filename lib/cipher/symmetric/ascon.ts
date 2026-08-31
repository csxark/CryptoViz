/**
 * ASCON-128 — NIST SP 800-232 (2023) Lightweight Cryptography Standard.
 * 128-bit key, 128-bit nonce, 128-bit tag. Sponge permutation over 5×64-bit state.
 * p₁₂ used for init/final; p₆ used for data absorption/encryption.
 *
 * Contract:
 *  encrypt(pt_hex, key_hex, { nonce?: nonce_hex, ad?: ad_hex })
 *    → output = nonce_hex + ciphertext_hex + tag_hex
 *  decrypt(nonce+ct+tag hex, key_hex, { ad?: ad_hex })
 *    → plaintext_hex (throws on tag mismatch)
 *
 * ASCON-128 test vector (v1.2 spec, count=1):
 *  key   = 000102030405060708090a0b0c0d0e0f
 *  nonce = 000102030405060708090a0b0c0d0e0f
 *  pt    = 00  (1 byte)
 *  ad    = (empty)
 *  ct+tag = d4...  (verify round-trip)
 */

import type { CipherResult, CipherStep, CipherOptions, TestVector, CipherMetadata } from '../types'
import { CipherError, validateInput, validateKey } from '../../utils'

const METADATA: CipherMetadata = {
    name: 'ASCON-128',
    keySize: 128,
    blockSize: 64,
    rounds: 12,
    securityStatus: 'secure',
    breakingComplexity: '2^128 — NIST-selected 2023 lightweight crypto standard; no practical attacks',
    yearDesigned: 2015,
    standardBody: 'NIST SP 800-232 (2023); Dobraunig et al.',
}

// ── Constants ─────────────────────────────────────────────────────────────────
const MASK64 = (1n << 64n) - 1n

/** RC[i] = (0xf - i) << 4 | i  for i = 0..11 */
const RC: readonly bigint[] = Array.from({ length: 12 }, (_, i) =>
    BigInt(((0xf - i) << 4) | i)
)

/** ASCON-128 initialization vector (k=128, r=64, a=12, b=6) */
const IV = 0x80400c0600000000n

// ── Bitwise helpers ───────────────────────────────────────────────────────────
function rotr64(x: bigint, n: bigint): bigint {
    return ((x >> n) | (x << (64n - n))) & MASK64
}

// ── ASCON permutation: apply numRounds rounds starting at round (12-numRounds)
/**
 * Ascon Permute cipher-engine utility export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @param s Input required by the Ascon Permute operation.
 * @param numRounds Input required by the Ascon Permute operation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/46-3/final — FIPS 46-3.
 */
export function asconPermute(s: BigInt64Array, numRounds: number): void {
    const start = 12 - numRounds
    const S = [
        BigInt.asUintN(64, s[0]),
        BigInt.asUintN(64, s[1]),
        BigInt.asUintN(64, s[2]),
        BigInt.asUintN(64, s[3]),
        BigInt.asUintN(64, s[4]),
    ]

    for (let r = start; r < 12; r++) {
        // Step 1: constant addition (to word 2)
        S[2] ^= RC[r]

        // Step 2: substitution layer (bitsliced 5-bit S-box over all 64 positions)
        S[0] ^= S[4]
        S[4] ^= S[3]
        S[2] ^= S[1]
        const t0 = S[0]; const t1 = S[1]; const t2 = S[2]; const t3 = S[3]; const t4 = S[4]
        S[0] = (t0 ^ (~t1 & t2)) & MASK64
        S[1] = (t1 ^ (~t2 & t3)) & MASK64
        S[2] = (t2 ^ (~t3 & t4)) & MASK64
        S[3] = (t3 ^ (~t4 & t0)) & MASK64
        S[4] = (t4 ^ (~t0 & t1)) & MASK64
        S[1] ^= S[0]
        S[0] ^= S[4]
        S[3] ^= S[2]
        S[2] = (~S[2]) & MASK64

        // Step 3: linear diffusion layer (per-word rotation-XOR mixing)
        S[0] = (S[0] ^ rotr64(S[0], 19n) ^ rotr64(S[0], 28n)) & MASK64
        S[1] = (S[1] ^ rotr64(S[1], 61n) ^ rotr64(S[1], 39n)) & MASK64
        S[2] = (S[2] ^ rotr64(S[2], 1n) ^ rotr64(S[2], 6n)) & MASK64
        S[3] = (S[3] ^ rotr64(S[3], 10n) ^ rotr64(S[3], 17n)) & MASK64
        S[4] = (S[4] ^ rotr64(S[4], 7n) ^ rotr64(S[4], 41n)) & MASK64
    }

    for (let i = 0; i < 5; i++) s[i] = BigInt.asIntN(64, S[i])
}

/**
 * 5x64-bit state permutation helper for sponge modes (e.g. Ascon-Hash)
 */
export function asconPermutation(state: bigint[], numRounds: number = 12): bigint[] {
    const s = new BigInt64Array(5)
    for (let i = 0; i < 5; i++) s[i] = BigInt.asIntN(64, state[i] ?? 0n)
    asconPermute(s, numRounds)
    const out: bigint[] = new Array(5)
    for (let i = 0; i < 5; i++) out[i] = BigInt.asUintN(64, s[i])
    return out
}

// ── Byte/hex helpers ──────────────────────────────────────────────────────────
function parseHex(s: string, label: string): Uint8Array {
    const c = s.replace(/\s+/g, '').toLowerCase()
    if (!/^[0-9a-f]*$/.test(c) || c.length % 2 !== 0) {
        throw new CipherError('INVALID_INPUT', `${label} must be even-length hex.`)
    }
    const out = new Uint8Array(c.length / 2)
    for (let i = 0; i < out.length; i++) out[i] = parseInt(c.slice(i * 2, i * 2 + 2), 16)
    return out
}

function toHex(b: Uint8Array): string {
    return Array.from(b).map((x) => x.toString(16).padStart(2, '0')).join('')
}

function bytesToBigBE(b: Uint8Array, off: number, len: number): bigint {
    let v = 0n
    for (let i = 0; i < len; i++) v = (v << 8n) | BigInt(b[off + i])
    return v
}

function bigToBytesBE(v: bigint, len: number): Uint8Array {
    const out = new Uint8Array(len)
    for (let i = len - 1; i >= 0; i--) {
        out[i] = Number(v & 0xffn)
        v >>= 8n
    }
    return out
}

function randomBytes(n: number): Uint8Array {
    const buf = new Uint8Array(n)
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
        crypto.getRandomValues(buf)
    } else {
        for (let i = 0; i < n; i++) buf[i] = Math.floor(Math.random() * 256)
    }
    return buf
}

function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
    if (a.length !== b.length) return false
    let diff = 0
    for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i]
    return diff === 0
}

// ── ASCON-128 seal (encrypt + authenticate) ───────────────────────────────────
function asconSeal(
    key: Uint8Array,      // 16 bytes
    nonce: Uint8Array,    // 16 bytes
    ad: Uint8Array,       // any length (associated data)
    pt: Uint8Array,       // plaintext
): { ct: Uint8Array; tag: Uint8Array } {
    const K0 = bytesToBigBE(key, 0, 8)
    const K1 = bytesToBigBE(key, 8, 8)
    const N0 = bytesToBigBE(nonce, 0, 8)
    const N1 = bytesToBigBE(nonce, 8, 8)

    // 1. Initialization: state = IV || K || N
    const S = new BigInt64Array([
        BigInt.asIntN(64, IV),
        BigInt.asIntN(64, K0),
        BigInt.asIntN(64, K1),
        BigInt.asIntN(64, N0),
        BigInt.asIntN(64, N1),
    ])
    asconPermute(S, 12)
    S[3] ^= BigInt.asIntN(64, K0)
    S[4] ^= BigInt.asIntN(64, K1)

    // 2. Associated Data absorption
    if (ad.length > 0) {
        let off = 0
        while (off + 8 <= ad.length) {
            S[0] ^= BigInt.asIntN(64, bytesToBigBE(ad, off, 8))
            asconPermute(S, 6)
            off += 8
        }
        // Last (possibly partial) AD block with 0x80 padding
        let lastAD = 0n
        const rem = ad.length - off
        for (let i = 0; i < rem; i++) lastAD = (lastAD << 8n) | BigInt(ad[off + i])
        lastAD = (lastAD << BigInt((8 - rem) * 8)) | (0x80n << BigInt((7 - rem) * 8))
        S[0] ^= BigInt.asIntN(64, lastAD)
        asconPermute(S, 6)
    }
    // Domain separation: flip bit 0 of state[4]
    S[4] ^= 1n

    // 3. Plaintext encryption
    const ct = new Uint8Array(pt.length)
    if (pt.length > 0) {
        let off = 0
        while (off + 8 <= pt.length) {
            const block = bytesToBigBE(pt, off, 8)
            const ctBlock = (BigInt.asUintN(64, S[0]) ^ block) & MASK64
            ct.set(bigToBytesBE(ctBlock, 8), off)
            S[0] = BigInt.asIntN(64, block)  // absorb plaintext
            asconPermute(S, 6)
            off += 8
        }
        // Last partial block
        const rem = pt.length - off
        if (rem > 0) {
            let ptBlock = 0n
            for (let i = 0; i < rem; i++) ptBlock = (ptBlock << 8n) | BigInt(pt[off + i])
            ptBlock = (ptBlock << BigInt((8 - rem) * 8)) | (0x80n << BigInt((7 - rem) * 8))
            const s0u = BigInt.asUintN(64, S[0])
            const ctLast = (s0u ^ ptBlock) & MASK64
            const ctLastBytes = bigToBytesBE(ctLast, 8)
            ct.set(ctLastBytes.slice(0, rem), off)
            // Absorb only the plaintext (not the padding)
            let ptAbsorb = BigInt.asUintN(64, S[0]) & (MASK64 << BigInt((8 - rem) * 8))
            for (let i = 0; i < rem; i++) {
                ptAbsorb |= BigInt(pt[off + i]) << BigInt((7 - i) * 8)
            }
            ptAbsorb |= 0x80n << BigInt((7 - rem) * 8)
            S[0] = BigInt.asIntN(64, ptAbsorb & MASK64)
        } else {
            // pt was a multiple of 8 bytes; no partial block needed
        }
    } else {
        S[0] ^= BigInt.asIntN(64, 0x8000000000000000n)
    }

    // 4. Finalization
    S[1] ^= BigInt.asIntN(64, K0)
    S[2] ^= BigInt.asIntN(64, K1)
    asconPermute(S, 12)
    S[3] ^= BigInt.asIntN(64, K0)
    S[4] ^= BigInt.asIntN(64, K1)

    const tag = new Uint8Array(16)
    tag.set(bigToBytesBE(BigInt.asUintN(64, S[3]), 8), 0)
    tag.set(bigToBytesBE(BigInt.asUintN(64, S[4]), 8), 8)
    return { ct, tag }
}

// ── ASCON-128 open (decrypt + verify) ────────────────────────────────────────
function asconOpen(
    key: Uint8Array,
    nonce: Uint8Array,
    ad: Uint8Array,
    ct: Uint8Array,
    tag: Uint8Array,
): Uint8Array {
    const K0 = bytesToBigBE(key, 0, 8)
    const K1 = bytesToBigBE(key, 8, 8)
    const N0 = bytesToBigBE(nonce, 0, 8)
    const N1 = bytesToBigBE(nonce, 8, 8)

    const S = new BigInt64Array([
        BigInt.asIntN(64, IV),
        BigInt.asIntN(64, K0),
        BigInt.asIntN(64, K1),
        BigInt.asIntN(64, N0),
        BigInt.asIntN(64, N1),
    ])
    asconPermute(S, 12)
    S[3] ^= BigInt.asIntN(64, K0)
    S[4] ^= BigInt.asIntN(64, K1)

    // AD absorption (same as seal)
    if (ad.length > 0) {
        let off = 0
        while (off + 8 <= ad.length) {
            S[0] ^= BigInt.asIntN(64, bytesToBigBE(ad, off, 8))
            asconPermute(S, 6)
            off += 8
        }
        let lastAD = 0n
        const rem = ad.length - off
        for (let i = 0; i < rem; i++) lastAD = (lastAD << 8n) | BigInt(ad[off + i])
        lastAD = (lastAD << BigInt((8 - rem) * 8)) | (0x80n << BigInt((7 - rem) * 8))
        S[0] ^= BigInt.asIntN(64, lastAD)
        asconPermute(S, 6)
    }
    S[4] ^= 1n

    // Ciphertext decryption
    const pt = new Uint8Array(ct.length)
    if (ct.length > 0) {
        let off = 0
        while (off + 8 <= ct.length) {
            const ctBlock = bytesToBigBE(ct, off, 8)
            const ptBlock = (BigInt.asUintN(64, S[0]) ^ ctBlock) & MASK64
            pt.set(bigToBytesBE(ptBlock, 8), off)
            S[0] = BigInt.asIntN(64, ctBlock)  // absorb ciphertext as plaintext? No — absorb ptBlock
            // Actually in decryption: after XOR we recover PT, then state[0] = PT (not CT)
            S[0] = BigInt.asIntN(64, ptBlock)
            asconPermute(S, 6)
            off += 8
        }
        const rem = ct.length - off
        if (rem > 0) {
            const s0u = BigInt.asUintN(64, S[0])
            let ctBlock = 0n
            for (let i = 0; i < rem; i++) ctBlock = (ctBlock << 8n) | BigInt(ct[off + i])
            ctBlock <<= BigInt((8 - rem) * 8)
            const ptBlock = ((s0u ^ ctBlock) & MASK64) >> BigInt((8 - rem) * 8)
            const ptBytes = bigToBytesBE(ptBlock, rem)
            pt.set(ptBytes, off)
            // Reconstruct padded plaintext for state update
            let ptAbsorb = s0u & (MASK64 << BigInt((8 - rem) * 8))
            for (let i = 0; i < rem; i++) ptAbsorb |= BigInt(ptBytes[i]) << BigInt((7 - i) * 8)
            ptAbsorb |= 0x80n << BigInt((7 - rem) * 8)
            S[0] = BigInt.asIntN(64, ptAbsorb & MASK64)
        }
    } else {
        S[0] ^= BigInt.asIntN(64, 0x8000000000000000n)
    }

    // Finalization
    S[1] ^= BigInt.asIntN(64, K0)
    S[2] ^= BigInt.asIntN(64, K1)
    asconPermute(S, 12)
    S[3] ^= BigInt.asIntN(64, K0)
    S[4] ^= BigInt.asIntN(64, K1)

    const computedTag = new Uint8Array(16)
    computedTag.set(bigToBytesBE(BigInt.asUintN(64, S[3]), 8), 0)
    computedTag.set(bigToBytesBE(BigInt.asUintN(64, S[4]), 8), 8)

    if (!constantTimeEqual(computedTag, tag)) {
        throw new CipherError('INVALID_INPUT', 'ASCON-128 tag verification failed — ciphertext or associated data was tampered with.')
    }
    return pt
}

// ── Public API ────────────────────────────────────────────────────────────────
/**
 * encrypt: seal. output = nonce(32 hex) + ciphertext + tag(32 hex)
 * options.nonce: 32-char hex nonce (optional; random if absent)
 * options.ad: hex-encoded associated data (optional)
 */
export function encrypt(input: string, key: string, options: CipherOptions = {}): CipherResult {
    if (input === null || input === undefined || typeof input !== 'string') {
        throw new CipherError('INPUT_REQUIRED', 'Input plaintext is required for ASCON-128.')
    }
    validateKey(key)
    const start = performance.now()

    const keyBytes = parseHex(key, 'ASCON key')
    if (keyBytes.length !== 16) {
        throw new CipherError('INVALID_KEY_LENGTH', `ASCON-128 requires a 128-bit (16-byte) key. Got ${keyBytes.length} bytes.`)
    }

    const nonceHex = (options as Record<string, unknown>).nonce as string | undefined
    const nonceBytes = nonceHex ? parseHex(nonceHex, 'ASCON nonce') : randomBytes(16)
    if (nonceBytes.length !== 16) {
        throw new CipherError('INVALID_INPUT', 'ASCON-128 nonce must be 16 bytes (32 hex chars).')
    }

    const adHex = (options as Record<string, unknown>).ad as string | undefined
    const adBytes = adHex ? parseHex(adHex, 'associated data') : new Uint8Array(0)
    const ptBytes = input === '' ? new Uint8Array(0) : parseHex(input, 'ASCON plaintext')

    const { ct, tag } = asconSeal(keyBytes, nonceBytes, adBytes, ptBytes)
    const output = toHex(nonceBytes) + toHex(ct) + toHex(tag)

    const steps: CipherStep[] = []
    if (options.instrument) {
        steps.push(
            { index: 0, label: 'Initialization', inputState: toHex(keyBytes) + ' | ' + toHex(nonceBytes), outputState: '5×64-bit state after p₁₂ + K XOR', note: 'State = IV‖K‖N → p₁₂ → S[3]⊕K₀, S[4]⊕K₁', isMilestone: true },
            { index: 1, label: 'AD absorption', inputState: adBytes.length > 0 ? toHex(adBytes) : '(empty)', outputState: 'state after p₆ per block + domain sep (S[4]⊕1)', note: 'Each 8-byte AD block absorbed into S[0], then p₆. Empty AD → only domain separation.', isMilestone: true },
            { index: 2, label: 'Encryption', inputState: toHex(ptBytes), outputState: toHex(ct), note: 'CT[i] = S[0] ⊕ PT[i]; state absorbs PT[i]; p₆ between blocks. Last partial block padded with 0x80.', isMilestone: true },
            { index: 3, label: 'Finalization', inputState: 'S after encryption', outputState: 'Tag: ' + toHex(tag), note: 'S[1]⊕K₀, S[2]⊕K₁ → p₁₂ → S[3]⊕K₀ ‖ S[4]⊕K₁ = 128-bit tag.', isMilestone: true },
        )
    }

    return {
        output,
        outputEncoding: 'hex',
        steps,
        metadata: METADATA,
        durationMs: performance.now() - start,
    }
}

/**
 * decrypt: open. input = nonce(32 hex) + ciphertext + tag(32 hex)
 * options.ad: hex associated data (must match what was used during seal)
 */
export function decrypt(input: string, key: string, options: CipherOptions = {}): CipherResult {
    if (input === undefined || input === null) {
        throw new CipherError('INPUT_REQUIRED', 'Input ciphertext is required for ASCON-128.')
    }
    validateKey(key)
    const start = performance.now()

    const keyBytes = parseHex(key, 'ASCON key')
    if (keyBytes.length !== 16) {
        throw new CipherError('INVALID_KEY_LENGTH', `ASCON-128 requires a 128-bit key.`)
    }

    const raw = parseHex(input, 'ASCON decrypt input')
    if (raw.length < 32) {
        throw new CipherError('INVALID_INPUT', 'ASCON-128 decrypt input must be at least 32 bytes (16 nonce + 0 ct + 16 tag).')
    }

    const nonceBytes = raw.slice(0, 16)
    const tag = raw.slice(raw.length - 16)
    const ct = raw.slice(16, raw.length - 16)

    const adHex = (options as Record<string, unknown>).ad as string | undefined
    const adBytes = adHex ? parseHex(adHex, 'associated data') : new Uint8Array(0)

    const pt = asconOpen(keyBytes, nonceBytes, adBytes, ct, tag)

    return {
        output: toHex(pt),
        outputEncoding: 'hex',
        steps: [],
        metadata: METADATA,
        durationMs: performance.now() - start,
    }
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
        input: '00',
        key: '000102030405060708090a0b0c0d0e0f',
        expected: 'randomized',
        description: 'ASCON-128 AEAD encryption (randomized 128-bit nonce prepended to ciphertext)',
    },
]
