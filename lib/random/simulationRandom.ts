/**
 * NON-CRYPTOGRAPHIC randomness for simulations/attacks/educational demos.
 * Do NOT use for keys, IVs, nonces, or anything under lib/cipher's secure path.
 * Use cryptoRandomBytes() from ./cryptoRandom for that.
 */
export function simulationRandom(seed?: number): () => number {
    let s = seed ?? Date.now()
    return function next() {
        s |= 0; s = (s + 0x6D2B79F5) | 0
        let t = Math.imul(s ^ (s >>> 15), 1 | s)
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
}