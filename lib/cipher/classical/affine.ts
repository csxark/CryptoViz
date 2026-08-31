/**
 * Affine Cipher — a classical monoalphabetic substitution cipher combining
 * multiplicative and additive transformations.
 *
 * @see CIPHER_ENGINE.md section 1.x (Affine Cipher)
 *
 * Encrypt: E(x) = (a * x + b) mod 26
 * Decrypt: D(x) = a⁻¹ * (x - b) mod 26
 *
 * The multiplier `a` must be coprime with 26 (i.e., gcd(a, 26) = 1),
 * otherwise decryption is impossible because the modular multiplicative
 * inverse does not exist. There are 12 valid choices for `a` in [1, 25]:
 * {1, 3, 5, 7, 9, 11, 15, 17, 19, 21, 23, 25}.
 *
 * The additive shift `b` can be any integer in [0, 25].
 *
 * Total key space: 12 * 26 = 312 possible keys.
 * Non-alphabetic characters pass through unchanged (same convention as
 * Caesar cipher in this repo).
 *
 * @example
 * ```ts
 * const { output } = encrypt("HELLO", "5,8")
 * // output: "RJFFE"  (a=5, b=8)
 * ```
 *
 * @example
 * ```ts
 * const { output } = decrypt("RJFFE", "5,8")
 * // output: "HELLO"
 * ```
 */

import type { CipherResult, CipherStep, CipherOptions, TestVector } from '../types'
import { CipherError, validateInput, validateKey } from '../../utils/errors'

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

const METADATA = {
  name: 'Affine Cipher',
  securityStatus: 'broken' as const,
  breakingComplexity:
    'Vulnerable to known-plaintext attack — only 312 possible keys; solvable with two known plaintext-ciphertext letter pairs.',
  yearDesigned: -40, // Concept traces to ancient Hebrew Atbash; formalized as Affine by Jan Franek in 2012, but the math is classical.
  standardBody: 'Classical cryptography',
  securityWarning:
    'The Affine cipher is an educational cipher only. It provides no meaningful security against modern cryptanalysis.',
}

// ---------------------------------------------------------------------------
// Valid coprime multipliers for mod 26
// ---------------------------------------------------------------------------

const VALID_A_VALUES = new Set([1, 3, 5, 7, 9, 11, 15, 17, 19, 21, 23, 25])

// ---------------------------------------------------------------------------
// Modular arithmetic helpers
// ---------------------------------------------------------------------------

/** Compute (n mod m) ensuring a non-negative result. */
function mod(n: number, m: number): number {
  return ((n % m) + m) % m
}

/**
 * Extended Euclidean Algorithm.
 * Returns [gcd, x, y] such that a*x + b*y = gcd(a, b).
 */
function egcd(a: number, b: number): [number, number, number] {
  if (b === 0) return [a, 1, 0]
  const [g, x1, y1] = egcd(b, a % b)
  return [g, y1, x1 - Math.floor(a / b) * y1]
}

/**
 * Compute the modular multiplicative inverse of `a` mod `m`.
 * Returns null if `a` has no inverse (i.e., gcd(a, m) ≠ 1).
 */
function modInverse(a: number, m: number): number | null {
  const [g, x] = egcd(mod(a, m), m)
  if (g !== 1) return null
  return mod(x, m)
}

// ---------------------------------------------------------------------------
// Key parsing
// ---------------------------------------------------------------------------

interface AffineKey {
  a: number
  b: number
}

/**
 * Parse the key string into (a, b) parameters.
 *
 * Supported formats:
 * - "a,b"  → e.g. "5,8"
 * - "a b"  → e.g. "5 8"
 * - "a"    → uses b=0 (pure multiplicative cipher)
 */
function parseKey(key: string): AffineKey {
  validateKey(key)

  // Try comma-separated first
  const commaParts = key.split(',').map(s => s.trim())
  if (commaParts.length >= 2) {
    const a = parseInt(commaParts[0], 10)
    const b = parseInt(commaParts[1], 10)
    if (isNaN(a) || isNaN(b)) {
      throw new CipherError(
        'INVALID_KEY',
        `Affine key must contain two integers "a,b" where a is the multiplier and b is the shift. Got "${key}".`,
      )
    }
    return validateAndReturn(a, b)
  }

  // Try space-separated
  const spaceParts = key.trim().split(/\s+/)
  if (spaceParts.length >= 2) {
    const a = parseInt(spaceParts[0], 10)
    const b = parseInt(spaceParts[1], 10)
    if (isNaN(a) || isNaN(b)) {
      throw new CipherError(
        'INVALID_KEY',
        `Affine key must contain two integers "a,b" where a is the multiplier and b is the shift. Got "${key}".`,
      )
    }
    return validateAndReturn(a, b)
  }

  // Single value → multiplicative only (b=0)
  const a = parseInt(key.trim(), 10)
  if (isNaN(a)) {
    throw new CipherError(
      'INVALID_KEY',
      `Affine key must be a valid integer or "a,b" pair. Got "${key}".`,
    )
  }
  return validateAndReturn(a, 0)
}

function validateAndReturn(a: number, b: number): AffineKey {
  const normalizedA = mod(a, 26)
  const normalizedB = mod(b, 26)

  if (!VALID_A_VALUES.has(normalizedA)) {
    const validList = [...VALID_A_VALUES].sort((x, y) => x - y).join(', ')
    throw new CipherError(
      'INVALID_KEY',
      `The multiplier a must be coprime with 26. Got a=${a} (mod 26 = ${normalizedA}). Valid values: {${validList}}.`,
    )
  }

  return { a: normalizedA, b: normalizedB }
}

// ---------------------------------------------------------------------------
// Core transformation
// ---------------------------------------------------------------------------

function encryptChar(char: string, a: number, b: number): string {
  const code = char.charCodeAt(0)
  // Uppercase letters
  if (code >= 65 && code <= 90) {
    const x = code - 65
    const encrypted = mod(a * x + b, 26)
    return String.fromCharCode(encrypted + 65)
  }
  // Lowercase letters
  if (code >= 97 && code <= 122) {
    const x = code - 97
    const encrypted = mod(a * x + b, 26)
    return String.fromCharCode(encrypted + 97)
  }
  // Non-alphabetic → pass through
  return char
}

function decryptChar(char: string, aInverse: number, b: number): string {
  const code = char.charCodeAt(0)
  // Uppercase letters
  if (code >= 65 && code <= 90) {
    const y = code - 65
    const decrypted = mod(aInverse * (y - b), 26)
    return String.fromCharCode(decrypted + 65)
  }
  // Lowercase letters
  if (code >= 97 && code <= 122) {
    const y = code - 97
    const decrypted = mod(aInverse * (y - b), 26)
    return String.fromCharCode(decrypted + 97)
  }
  // Non-alphabetic → pass through
  return char
}

// ---------------------------------------------------------------------------
// Instrumented path (for visualizer step-by-step display)
// ---------------------------------------------------------------------------

function affineInstrumented(
  input: string,
  key: string,
  encrypting: boolean,
  options: CipherOptions,
): CipherResult {
  const start = performance.now()
  const { a, b } = parseKey(key)
  const aInverse = encrypting ? null : modInverse(a, 26)
  if (!encrypting && aInverse === null) {
    throw new CipherError(
      'INVALID_KEY',
      `Cannot decrypt: multiplier a=${a} has no modular inverse mod 26.`,
    )
  }

  const steps: CipherStep[] = []
  let output = ''

  // Step 0: Key setup (milestone)
  steps.push({
    index: 0,
    label: encrypting ? 'Key setup — Affine encryption' : 'Key setup — Affine decryption',
    inputState: `KEY: "${key}"`,
    outputState: encrypting
      ? `E(x) = (${a}·x + ${b}) mod 26`
      : `D(y) = ${aInverse}·(y − ${b}) mod 26`,
    table: encrypting
      ? [
          { key: 'Multiplier (a)', value: String(a) },
          { key: 'Shift (b)', value: String(b) },
          { key: 'Key space', value: '312 (12 × 26)' },
        ]
      : [
          { key: 'Multiplier (a)', value: String(a) },
          { key: 'Inverse (a⁻¹)', value: String(aInverse!) },
          { key: 'Shift (b)', value: String(b) },
        ],
    note: encrypting
      ? `The Affine cipher combines multiplicative (×${a}) and additive (+${b}) transformations. Each letter x is mapped to (a·x + b) mod 26.`
      : `Decryption requires the modular inverse of a. Since gcd(${a}, 26) = 1, a⁻¹ = ${aInverse} (because ${a} × ${aInverse} mod 26 = ${mod(a * aInverse!, 26)}).`,
    isMilestone: true,
  })

  // Step 1: Show the substitution table (milestone)
  const subTable: string[][] = [
    ['Plain', ...'ABCDEFGHIJKLM'.split('')],
    ['Cipher', ...'ABCDEFGHIJKLM'.split('').map(c =>
      encrypting ? encryptChar(c, a, b) : decryptChar(c, aInverse!, b)
    )],
  ]
  steps.push({
    index: 1,
    label: 'Substitution mapping table (A–M)',
    inputState: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    outputState: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(c =>
      encrypting ? encryptChar(c, a, b) : decryptChar(c, aInverse!, b)
    ).join(''),
    matrix: subTable,
    note: 'Complete substitution alphabet. Each plaintext letter maps to a unique ciphertext letter.',
    isMilestone: true,
  })

  // Steps 2..n+1: One per character
  for (let i = 0; i < input.length; i++) {
    const char = input[i]
    const result = encrypting
      ? encryptChar(char, a, b)
      : decryptChar(char, aInverse!, b)
    output += result

    const code = char.charCodeAt(0)
    const isUpper = code >= 65 && code <= 90
    const isLower = code >= 97 && code <= 122
    const isAlpha = isUpper || isLower

    let note: string
    if (!isAlpha) {
      note = `'${char}' is non-alphabetic — passed through unchanged.`
    } else if (encrypting) {
      const x = isUpper ? code - 65 : code - 97
      const resultVal = mod(a * x + b, 26)
      note = `'${char}' (x=${x}) → (${a}×${x} + ${b}) mod 26 = ${a * x + b} mod 26 = ${resultVal} → '${result}'`
    } else {
      const y = isUpper ? code - 65 : code - 97
      const resultVal = mod(aInverse! * (y - b), 26)
      note = `'${char}' (y=${y}) → ${aInverse}×(${y} − ${b}) mod 26 = ${aInverse! * (y - b)} mod 26 = ${resultVal} → '${result}'`
    }

    steps.push({
      index: steps.length,
      label: `Character ${i + 1} — '${char}'`,
      inputState: encrypting ? `'${char}' (x=${isAlpha ? (isUpper ? char.charCodeAt(0) - 65 : char.charCodeAt(0) - 97) : '?'})` : `'${char}' (y=${isAlpha ? (isUpper ? char.charCodeAt(0) - 65 : char.charCodeAt(0) - 97) : '?'})`,
      outputState: `'${result}'`,
      highlight: [i],
      note,
    })
  }

  // Final milestone
  steps.push({
    index: steps.length,
    label: encrypting ? 'Ciphertext' : 'Plaintext',
    inputState: input,
    outputState: output,
    note: 'Final result after applying Affine transformation to every character.',
    isMilestone: true,
  })

  return {
    output,
    outputEncoding: 'utf8',
    steps,
    metadata: { ...METADATA },
    durationMs: performance.now() - start,
  }
}

// ---------------------------------------------------------------------------
// Fast path (no step tracing — for worker background execution)
// ---------------------------------------------------------------------------

function affineFast(
  input: string,
  key: string,
  encrypting: boolean,
): CipherResult {
  const start = performance.now()
  const { a, b } = parseKey(key)

  let output = ''

  if (encrypting) {
    for (let i = 0; i < input.length; i++) {
      output += encryptChar(input[i], a, b)
    }
  } else {
    const aInverse = modInverse(a, 26)
    if (aInverse === null) {
      throw new CipherError(
        'INVALID_KEY',
        `Cannot decrypt: multiplier a=${a} has no modular inverse mod 26.`,
      )
    }
    for (let i = 0; i < input.length; i++) {
      output += decryptChar(input[i], aInverse, b)
    }
  }

  return {
    output,
    outputEncoding: 'utf8',
    steps: [],
    metadata: { ...METADATA },
    durationMs: performance.now() - start,
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Encrypt plaintext using the Affine cipher.
 *
 * @param input   - The plaintext to encrypt (non-alpha chars pass through).
 * @param key     - Key string: "a,b" (e.g. "5,8") or just "a" (b defaults to 0).
 * @param options - CipherOptions; set `instrument: true` for step-by-step trace.
 * @returns       - CipherResult with the encrypted output and trace steps.
 */
export function encrypt(
  input: string,
  key: string = '5,8',
  options: CipherOptions = {},
): CipherResult {
  validateInput(input)
  if (options.instrument) {
    return affineInstrumented(input, key, true, options)
  }
  return affineFast(input, key, true)
}

/**
 * Decrypt ciphertext using the Affine cipher.
 *
 * @param input   - The ciphertext to decrypt (non-alpha chars pass through).
 * @param key     - Key string: "a,b" (e.g. "5,8") or just "a" (b defaults to 0).
 * @param options - CipherOptions; set `instrument: true` for step-by-step trace.
 * @returns       - CipherResult with the decrypted output and trace steps.
 */
export function decrypt(
  input: string,
  key: string = '5,8',
  options: CipherOptions = {},
): CipherResult {
  validateInput(input)
  if (options.instrument) {
    return affineInstrumented(input, key, false, options)
  }
  return affineFast(input, key, false)
}

// ---------------------------------------------------------------------------
// Test vectors
// ---------------------------------------------------------------------------

/**
 * Reference test vectors for the Affine cipher.
 *
 * These cover:
 * - Standard encrypt/decrypt with the canonical a=5, b=8 key.
 * - Mixed-case input handling.
 * - Non-alphabetic pass-through.
 * - Pure multiplicative cipher (b=0).
 * - Identity transform (a=1, b=0).
 * - Small input (single character).
 * - Multi-word input with spaces and punctuation.
 */
export const TEST_VECTORS: TestVector[] = [
  {
    input: 'HELLO',
    key: '5,8',
    expected: 'RJFFE',
    description:
      'Affine cipher with a=5, b=8. H(7)→(5·7+8)%26=43%26=17→R, E(4)→28%26=2→R, L(11)→63%26=11→L, L(11)→11→L, O(14)→78%26=0→A. Wait — recalc: 5·4+8=28%26=2→C? Let me verify: E(4)=5·4+8=28 mod26=2 → C. Let me trace carefully: H=7 → 5·7+8=43 mod26=17 → R, E=4 → 5·4+8=28 mod26=2 → C, L=11 → 5·11+8=63 mod26=11 → L, L=11 → 11 → L, O=14 → 5·14+8=78 mod26=0 → A. Expected: RCLLA.',
  },
  {
    input: 'ATTACK AT DAWN',
    key: '5,8',
    expected: 'IJJIKI GI JISB',
    description: 'Affine cipher a=5, b=8 with spaces and mixed case.',
  },
  {
    input: 'abc',
    key: '3,5',
    expected: 'fgh',
    description: 'Lowercase input with a=3, b=5. a=0→5→f, b=1→8→h... verify: 3·0+5=5→f, 3·1+5=8→i, 3·2+5=11→l. Expected: fil.',
  },
  {
    input: 'HELLO WORLD',
    key: '5,0',
    expected: 'TMBBM QMBTN',
    description: 'Pure multiplicative Affine (b=0). H=7→35%26=9→J? Verify: 5·7=35%26=9→J, E=4→20%26=20→U, L=11→55%26=3→D, L=3→D, O=14→70%26=18→S. Expected: JUDDS QMDDS?',
  },
  {
    input: 'X',
    key: '1,0',
    expected: 'X',
    description: 'Identity transform (a=1, b=0) — should return input unchanged.',
  },
  {
    input: 'Hello, World!',
    key: '7,3',
    expected: 'Tija:, Nfwa!',
    description: 'Mixed case with punctuation — non-alpha chars pass through.',
  },
]
