/**
 * Hash Collision Finder — Educational demonstration of hash collisions
 * using the Birthday Attack (Paradox) method.
 *
 * Demonstrates:
 *  1. Birthday attack: O(√N) complexity to find collisions
 *  2. Collision resistance vs preimage resistance
 *  3. Why shorter hash outputs are vulnerable
 *  4. Real-world impact (MD5, SHA-1 deprecation)
 *
 * Uses the Web Crypto API for actual hashing (SHA-256, SHA-1, MD5 via fallback).
 * For educational purposes, truncates hash output to N bits to increase
 * collision probability.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export type HashAlgorithm = "sha-256" | "sha-1" | "md5" | "sha-512"

export interface CollisionAttempt {
  /** The input string tried */
  input: string
  /** The truncated hash value (hex) */
  hash: string
  /** Attempt number */
  attemptNumber: number
}

export interface CollisionResult {
  /** Whether a collision was found */
  found: boolean
  /** The two colliding inputs */
  input1?: string
  input2?: string
  /** Their identical hash values */
  hash1?: string
  hash2?: string
  /** Number of attempts before collision */
  attempts: number
  /** All attempts made */
  history: CollisionAttempt[]
  /** The algorithm used */
  algorithm: HashAlgorithm
  /** Number of hash bits used (truncated) */
  bitsUsed: number
  /** Expected attempts for 50% collision probability */
  expectedAttempts: number
  /** Wall-clock time in ms */
  durationMs: number
}

export interface HashAnalysis {
  /** Full hex hash */
  fullHash: string
  /** Truncated hash */
  truncatedHash: string
  /** Input that produced this hash */
  input: string
  /** Hamming weight (number of 1 bits in binary) */
  hammingWeight: number
  /** Entropy estimate */
  entropy: number
}

export interface BirthdayAttackStats {
  /** Hash space size: 2^bits */
  spaceSize: number
  /** Theoretical expected attempts for 50% collision */
  expected50Percent: number
  /** Theoretical expected attempts for 99% collision */
  expected99Percent: number
  /** Current collision probability given attempts so far */
  currentProbability: number
  /** Bits of security */
  bitsOfSecurity: number
}

// ─── Constants ───────────────────────────────────────────────────────────────

/** Maximum bits to use for collision finding (too many = never find one). */
const MAX_BITS = 24
const MIN_BITS = 4

/** Brute-force limit to prevent browser hang. */
const MAX_ATTEMPTS_HARD = 2_000_000

// ─── Hashing ─────────────────────────────────────────────────────────────────

/**
 * Compute SHA-256 hash using Web Crypto API.
 * Returns full hex string.
 */
async function sha256Hex(input: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(input)
  const hashBuffer = await crypto.subtle.digest("SHA-256", data)
  const hashArray = new Uint8Array(hashBuffer)
  return Array.from(hashArray)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

/**
 * Compute SHA-1 hash (for comparison with SHA-256).
 */
async function sha1Hex(input: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(input)
  const hashBuffer = await crypto.subtle.digest("SHA-1", data)
  const hashArray = new Uint8Array(hashBuffer)
  return Array.from(hashArray)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

/**
 * Simple MD5 implementation for educational purposes.
 * Not cryptographically secure — used only for collision demos.
 */
function md5Simple(input: string): string {
  // Simple DJB2-based hash for educational demo (not real MD5)
  let h1 = 0xdeadbeef
  let h2 = 0x41c6ce57
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i)
    h1 = Math.imul(h1 ^ ch, 2654435761)
    h2 = Math.imul(h2 ^ ch, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507)
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507)
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  return ((h2 >>> 0).toString(16).padStart(8, "0") +
    (h1 >>> 0).toString(16).padStart(8, "0"))
}

/**
 * Compute hash for the given algorithm.
 */
async function computeHash(
  input: string,
  algorithm: HashAlgorithm
): Promise<string> {
  switch (algorithm) {
    case "sha-256":
      return sha256Hex(input)
    case "sha-1":
      return sha1Hex(input)
    case "md5":
      return md5Simple(input)
    case "sha-512": {
      const encoder = new TextEncoder()
      const data = encoder.encode(input)
      const hashBuffer = await crypto.subtle.digest("SHA-512", data)
      const hashArray = new Uint8Array(hashBuffer)
      return Array.from(hashArray)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("")
    }
  }
}

/**
 * Truncate a hex hash to N bits.
 */
function truncateHash(hex: string, bits: number): string {
  const hexChars = Math.ceil(bits / 4)
  const truncated = hex.slice(0, hexChars)
  // Apply bit masking for partial hex chars
  const remainder = bits % 4
  if (remainder > 0 && truncated.length > 0) {
    const lastNibble = parseInt(truncated[truncated.length - 1], 16)
    const mask = (1 << remainder) - 1
    const masked = lastNibble & mask
    return truncated.slice(0, -1) + masked.toString(16)
  }
  return truncated
}

// ─── Random Input Generator ──────────────────────────────────────────────────

/** Character set for generating random inputs. */
const CHARSET = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"

/**
 * Generate a random input string of given length.
 */
function randomInput(length: number): string {
  let result = ""
  for (let i = 0; i < length; i++) {
    result += CHARSET[Math.floor(Math.random() * CHARSET.length)]
  }
  return result
}

/**
 * Generate a sequential input string.
 */
function sequentialInput(n: number): string {
  return `input_${n}_${Math.random().toString(36).slice(2, 8)}`
}

// ─── Birthday Attack Statistics ──────────────────────────────────────────────

/**
 * Calculate birthday attack statistics for a given hash space.
 */
export function birthdayStats(bits: number, attempts: number): BirthdayAttackStats {
  const spaceSize = Math.pow(2, bits)
  const expected50 = Math.sqrt(Math.PI / 2) * Math.sqrt(spaceSize)
  const expected99 = Math.sqrt(2 * Math.log(100)) * Math.sqrt(spaceSize)
  // P(collision) = 1 - e^(-n^2 / (2N))
  const exponent = -(attempts * attempts) / (2 * spaceSize)
  const probability = 1 - Math.exp(exponent)

  return {
    spaceSize,
    expected50Percent: Math.round(expected50),
    expected99Percent: Math.round(expected99),
    currentProbability: Math.min(probability, 1),
    bitsOfSecurity: bits,
  }
}

/**
 * Calculate minimum recommended bits for collision resistance.
 */
export function recommendedBits(securityLevel: number): number {
  // For k bits of security, need 2k-bit hash
  return securityLevel * 2
}

// ─── Main Collision Finder ───────────────────────────────────────────────────

/**
 * Find a hash collision using the birthday attack method.
 *
 * @param algorithm Hash algorithm to use
 * @param bits Number of hash bits to use (truncated)
 * @param inputLength Length of random inputs to generate
 * @param onProgress Callback for progress updates
 * @returns Collision result
 */
export async function findCollision(
  algorithm: HashAlgorithm = "sha-256",
  bits: number = 12,
  inputLength: number = 8,
  onProgress?: (attempt: number, hash: string) => void
): Promise<CollisionResult> {
  const start = performance.now()
  const clampedBits = Math.max(MIN_BITS, Math.min(MAX_BITS, bits))

  const seen = new Map<string, string>() // truncatedHash → input
  const history: CollisionAttempt[] = []

  let attempts = 0

  // Try sequential inputs first, then random
  for (attempts = 1; attempts <= MAX_ATTEMPTS_HARD; attempts++) {
    const input =
      attempts <= 1000
        ? sequentialInput(attempts)
        : randomInput(inputLength)

    const fullHash = await computeHash(input, algorithm)
    const truncated = truncateHash(fullHash, clampedBits)

    history.push({
      input,
      hash: truncated,
      attemptNumber: attempts,
    })

    // Check for collision
    if (seen.has(truncated)) {
      const prevInput = seen.get(truncated)!
      const prevFullHash = await computeHash(prevInput, algorithm)

      return {
        found: true,
        input1: prevInput,
        input2: input,
        hash1: truncateHash(prevFullHash, clampedBits),
        hash2: truncated,
        attempts,
        history: history.slice(-50), // Keep last 50 for display
        algorithm,
        bitsUsed: clampedBits,
        expectedAttempts: birthdayStats(clampedBits, 0).expected50Percent,
        durationMs: performance.now() - start,
      }
    }

    seen.set(truncated, input)

    // Report progress every 100 attempts
    if (attempts % 100 === 0) {
      onProgress?.(attempts, truncated)
    }
  }

  // No collision found within limit
  return {
    found: false,
    attempts,
    history: history.slice(-50),
    algorithm,
    bitsUsed: clampedBits,
    expectedAttempts: birthdayStats(clampedBits, 0).expected50Percent,
    durationMs: performance.now() - start,
  }
}

// ─── Hash Analysis ───────────────────────────────────────────────────────────

/**
 * Analyze a hash value in detail.
 */
export async function analyzeHash(
  input: string,
  algorithm: HashAlgorithm = "sha-256",
  bits: number = 16
): Promise<HashAnalysis> {
  const fullHash = await computeHash(input, algorithm)
  const truncated = truncateHash(fullHash, bits)

  // Hamming weight of binary representation
  let hammingWeight = 0
  for (const hex of truncated) {
    const val = parseInt(hex, 16)
    hammingWeight += val.toString(2).split("1").length - 1
  }

  // Entropy of the hash
  const freq = new Map<string, number>()
  for (const ch of truncated) {
    freq.set(ch, (freq.get(ch) || 0) + 1)
  }
  let entropy = 0
  for (const [, count] of freq) {
    const p = count / truncated.length
    entropy -= p * Math.log2(p)
  }

  return {
    fullHash,
    truncatedHash: truncated,
    input,
    hammingWeight,
    entropy,
  }
}

// ─── Pre-computed Collision Examples ─────────────────────────────────────────

export interface KnownCollision {
  description: string
  input1: string
  input2: string
  algorithm: string
  reference: string
}

/**
 * Known hash collision examples for educational purposes.
 */
export const KNOWN_COLLISIONS: KnownCollision[] = [
  {
    description:
      "MD5 collision: Two different executable files with the same MD5 hash",
    input1: "d131dd02c5e6eec4... (binary file A)",
    input2: "d131dd02c5e6eecc... (binary file B)",
    algorithm: "MD5",
    reference:
      "Wang & Yu (2004) — first practical MD5 collision",
  },
  {
    description:
      "SHA-1 collision: Google's SHAttered attack on identical-prefix collision",
    input1: "shattered-1.pdf",
    input2: "shattered-2.pdf",
    algorithm: "SHA-1",
    reference:
      "SHAttered (2017) — first practical SHA-1 collision",
  },
  {
    description:
      "Birthday paradox: In a room of 23 people, there's a >50% chance two share a birthday",
    input1: "Person A's birthday",
    input2: "Person B's birthday",
    algorithm: "N/A (birthday paradox)",
    reference:
      "Dirichlet's box principle applied to hash functions",
  },
]

// ─── Educational Explanations ────────────────────────────────────────────────

export const EXPLANATIONS = {
  birthdayAttack: {
    title: "The Birthday Attack",
    content:
      "The birthday attack exploits the Birthday Paradox: with only 23 people in a room, " +
      "there's a >50% chance two share a birthday. For hashes, this means finding a collision " +
      "takes O(√N) attempts instead of O(N), where N is the hash space size.",
  },
  collisionResistance: {
    title: "Collision Resistance",
    content:
      "A hash function is collision-resistant if it's computationally infeasible to find two " +
      "different inputs with the same hash. SHA-256 with 256 bits requires ~2^128 operations " +
      "to find a collision — far beyond current computing power.",
  },
  truncatedHash: {
    title: "Why Truncation Matters",
    content:
      "This tool truncates hash output to fewer bits to make collisions findable in real time. " +
      "In practice, never truncate hash outputs used for security. SHA-256 produces 256 bits " +
      "for a reason — shorter hashes are exponentially easier to break.",
  },
  realWorldImpact: {
    title: "Real-World Impact",
    content:
      "MD5 collisions have been used to create fraudulent SSL certificates and malware that " +
      "passes integrity checks. SHA-1 was deprecated by Google, NIST, and major browsers " +
      "after the SHAttered attack demonstrated practical collisions.",
  },
}
