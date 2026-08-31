/**
 * HMAC_DRBG — a deterministic random bit generator (NIST SP 800-90A) over
 * HMAC-SHA-256.
 *
 * A DRBG turns a short, high-entropy seed into an arbitrarily long stream of
 * bits that is computationally indistinguishable from random. HMAC_DRBG is the
 * CSPRNG behind RFC 6979 deterministic ECDSA and many TLS stacks. Its whole
 * state is two 256-bit values, `K` (an HMAC key) and `V` (a running value),
 * evolved only through HMAC calls:
 *
 *   Update(data): K = HMAC(K, V ‖ 0x00 ‖ data); V = HMAC(K, V)
 *                 if data ≠ ∅: K = HMAC(K, V ‖ 0x01 ‖ data); V = HMAC(K, V)
 *
 * Instantiate seeds (K,V) from entropy ‖ nonce ‖ personalization; Generate emits
 * V = HMAC(K, V) blocks and then runs Update again (backtracking resistance);
 * Reseed folds fresh entropy back in (prediction resistance). The same seed
 * always reproduces the same stream — the property RFC 6979 relies on.
 *
 * Verified against the NIST DRBGVS HMAC_DRBG/SHA-256 known-answer test.
 */
import { hmac } from '@noble/hashes/hmac.js'
import { sha256 } from '@noble/hashes/sha2.js'

const OUTLEN = 32 // SHA-256 output, in bytes
/** NIST cap on a single Generate request (2^19 bits = 65536 bytes). */
export const MAX_BYTES_PER_REQUEST = 65536

function mac(key: Uint8Array, ...parts: Uint8Array[]): Uint8Array {
  // noble's hmac takes a single message; concatenate the parts first.
  const total = parts.reduce((n, p) => n + p.length, 0)
  const msg = new Uint8Array(total)
  let o = 0
  for (const p of parts) {
    msg.set(p, o)
    o += p.length
  }
  return hmac(sha256, key, msg)
}

export function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

/** One recorded state transition, for the visualizer. */
export interface DrbgStep {
  label: string
  detail: string
  K: string
  V: string
}

export class HmacDrbg {
  private K: Uint8Array
  private V: Uint8Array
  reseedCounter = 0
  readonly steps: DrbgStep[] = []

  constructor(entropy: Uint8Array, nonce: Uint8Array, personalization: Uint8Array = new Uint8Array(0)) {
    if (entropy.length < 16) {
      throw new Error('Entropy input should be at least 128 bits for a 256-bit security strength.')
    }
    // Instantiate: K = 0x00…, V = 0x01…, then Update(entropy ‖ nonce ‖ perso).
    this.K = new Uint8Array(OUTLEN).fill(0x00)
    this.V = new Uint8Array(OUTLEN).fill(0x01)
    this.record('Instantiate — seed K=0x00…, V=0x01…', 'Fixed starting state before any seed material is folded in.')
    this.update(concat(entropy, nonce, personalization))
    this.reseedCounter = 1
    this.record('Instantiate — Update(entropy ‖ nonce ‖ personalization)', 'The seed material is folded into (K, V). The generator is now ready.')
  }

  /** The core (K, V) update. Runs the HMAC ladder once, or twice if data is non-empty. */
  private update(providedData: Uint8Array): void {
    this.K = mac(this.K, this.V, Uint8Array.of(0x00), providedData)
    this.V = mac(this.K, this.V)
    if (providedData.length > 0) {
      this.K = mac(this.K, this.V, Uint8Array.of(0x01), providedData)
      this.V = mac(this.K, this.V)
    }
  }

  /** Fold fresh entropy back into the state — prediction resistance. */
  reseed(entropy: Uint8Array, additionalInput: Uint8Array = new Uint8Array(0)): void {
    if (entropy.length < 16) {
      throw new Error('Reseed entropy should be at least 128 bits.')
    }
    this.update(concat(entropy, additionalInput))
    this.reseedCounter = 1
    this.record('Reseed — Update(entropy ‖ additional input)', 'Fresh entropy is mixed in, so state captured before now no longer predicts future output.')
  }

  /** Emit `numBytes` pseudorandom bytes and advance the state. */
  generate(numBytes: number, additionalInput: Uint8Array = new Uint8Array(0)): Uint8Array {
    if (numBytes <= 0) throw new Error('Requested byte count must be positive.')
    if (numBytes > MAX_BYTES_PER_REQUEST) {
      throw new Error(`A single request may not exceed ${MAX_BYTES_PER_REQUEST} bytes.`)
    }

    if (additionalInput.length > 0) {
      this.update(additionalInput)
      this.record('Generate — Update(additional input)', 'Optional additional input is folded in before output is produced.')
    }

    const out = new Uint8Array(numBytes)
    let filled = 0
    while (filled < numBytes) {
      this.V = mac(this.K, this.V) // V = HMAC(K, V)
      const take = Math.min(OUTLEN, numBytes - filled)
      out.set(this.V.subarray(0, take), filled)
      filled += take
    }
    this.record('Generate — emit V = HMAC(K, V) blocks', `Produced ${numBytes} byte(s) by chaining V through HMAC.`)

    // Backtracking resistance: a final Update so the emitted bytes can't be
    // recovered from the state that remains.
    this.update(additionalInput)
    this.reseedCounter += 1
    this.record('Generate — final Update (backtracking resistance)', 'The state is advanced after output so a later state compromise cannot reveal the bytes just produced.')

    return out
  }

  get state(): { K: string; V: string; reseedCounter: number } {
    return { K: toHex(this.K), V: toHex(this.V), reseedCounter: this.reseedCounter }
  }

  private record(label: string, detail: string): void {
    this.steps.push({ label, detail, K: toHex(this.K), V: toHex(this.V) })
  }
}

function concat(...parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((n, p) => n + p.length, 0)
  const out = new Uint8Array(total)
  let o = 0
  for (const p of parts) {
    out.set(p, o)
    o += p.length
  }
  return out
}
