/**
 * cryptoRandomBytes() — the ONLY approved source of security-sensitive
 * randomness in this codebase (keys, IVs, nonces, salts, ephemeral values).
 * Wraps Web Crypto's crypto.getRandomValues(). Never use Math.random() here.
 */
export function cryptoRandomBytes(length: number): Uint8Array {
    if (!Number.isInteger(length) || length <= 0) {
        throw new RangeError('length must be a positive integer')
    }
    const bytes = new Uint8Array(length)
    const c = typeof crypto !== 'undefined' ? crypto : (globalThis as any).crypto
    if (!c?.getRandomValues) {
        throw new Error('Secure random number generation is unavailable in this environment.')
    }
    c.getRandomValues(bytes)
    return bytes
}

/** Rejection-sampled secure integer in [0, max) — avoids modulo bias. */
export function cryptoRandomInt(max: number): number {
    if (!Number.isInteger(max) || max <= 0 || max > 2 ** 32) {
        throw new RangeError('max must be a positive integer <= 2^32')
    }
    const range = 2 ** 32
    const limit = range - (range % max)
    const buf = new Uint32Array(1)
    let val: number
    do {
        cryptoRandomBytes(4).forEach((b, i) => (buf[0] = (buf[0] << 8) | b)) // or reuse bytes directly
        val = buf[0]
    } while (val >= limit)
    return val % max
}