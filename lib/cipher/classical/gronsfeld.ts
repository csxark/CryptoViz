/**
 * Gronsfeld Cipher — a numeric variant of the Vigenère cipher where the
 * key is a sequence of digits (0-9) instead of letters.
 *
 * @see CIPHER_ENGINE.md section 1.x (Vigenère family)
 *
 * The Gronsfeld cipher was invented by Count Johann Franz Koninski von
 * Gronsfeld in the early 17th century. It is structurally identical to
 * the Vigenère cipher but uses a numeric key, which simplifies both
 * encryption and cryptanalysis (only 10 possible shifts per position
 * instead of 26).
 *
 * Encrypt: C(i) = (P(i) + key[i % keyLen]) mod 26
 * Decrypt: P(i) = (C(i) - key[i % keyLen] + 26) mod 26
 *
 * Non-alphabetic characters pass through unchanged but the key position
 * counter does NOT advance (same convention as Vigenère in this repo).
 */

import type { CipherResult, CipherStep, CipherOptions, TestVector } from '../types'
import { CipherError, validateInput, validateKey } from '../../utils/errors'

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

const METADATA = {
  name: 'Gronsfeld Cipher',
  securityStatus: 'broken' as const,
  breakingComplexity:
    'Vulnerable to Kasiski examination and frequency analysis. With only 10 possible shifts per position, the effective key space is 10^k for a k-digit key — far smaller than Vigenère.',
  yearDesigned: 1620,
  standardBody: 'Classical cryptography',
  securityWarning:
    'The Gronsfeld cipher is an educational cipher only. Its numeric key makes it weaker than Vigenère.',
}

// ---------------------------------------------------------------------------
// Key parsing
// ---------------------------------------------------------------------------

function parseKey(key: string): number[] {
  validateKey(key)
  const digits = key
    .replace(/[^0-9]/g, '')
    .split('')
    .map(Number)

  if (digits.length === 0) {
    throw new CipherError(
      'INVALID_KEY',
      `Gronsfeld key must contain at least one digit (0-9). Got "${key}".`,
    )
  }
  return digits
}

// ---------------------------------------------------------------------------
// Core helpers
// ---------------------------------------------------------------------------

function mod(n: number, m: number): number {
  return ((n % m) + m) % m
}

// ---------------------------------------------------------------------------
// Instrumented path
// ---------------------------------------------------------------------------

function gronsfeldInstrumented(
  input: string,
  key: string,
  decrypting: boolean,
): CipherResult {
  const start = performance.now()
  const keyDigits = parseKey(key)
  const steps: CipherStep[] = []
  let output = ''

  // Step 0: Key setup (milestone)
  steps.push({
    index: 0,
    label: decrypting ? 'Key setup — Gronsfeld decryption' : 'Key setup — Gronsfeld encryption',
    inputState: `KEY: "${key}"`,
    outputState: `DIGITS: [${keyDigits.join(', ')}]`,
    table: [
      { key: 'Cipher type', value: 'Numeric polyalphabetic substitution' },
      { key: 'Key digits', value: keyDigits.join(' ') },
      { key: 'Key length', value: `${keyDigits.length} digits` },
      { key: 'Shift range', value: '0–9 (only 10 possible shifts per position)' },
      { key: 'Relation', value: 'Numeric variant of Vigenère cipher' },
    ],
    note: decrypting
      ? `Gronsfeld decryption subtracts each key digit from the corresponding ciphertext letter: P(i) = (C(i) - key[i mod ${keyDigits.length}] + 26) mod 26.`
      : `Gronsfeld encryption adds each key digit to the corresponding plaintext letter: C(i) = (P(i) + key[i mod ${keyDigits.length}]) mod 26.`,
    isMilestone: true,
  })

  // Step 1: Show repeating key pattern (milestone)
  const alphaCount = input.split('').filter(ch => /[a-zA-Z]/.test(ch)).length
  const keyStream = Array.from({ length: alphaCount }, (_, i) => keyDigits[i % keyDigits.length])

  steps.push({
    index: 1,
    label: 'Repeating numeric key stream',
    inputState: `Key: [${keyDigits.join(',')}]`,
    outputState: `Stream: [${keyStream.slice(0, Math.min(20, keyStream.length)).join(',')}${keyStream.length > 20 ? ', …' : ''}]`,
    note: `The ${keyDigits.length}-digit key repeats to cover all ${alphaCount} alphabetic characters.`,
    isMilestone: true,
  })

  // Per-character steps
  let alphaIdx = 0
  for (let i = 0; i < input.length; i++) {
    const char = input[i]
    const code = char.charCodeAt(0)
    const isUpper = code >= 65 && code <= 90
    const isLower = code >= 97 && code <= 122

    if (!isUpper && !isLower) {
      output += char
      steps.push({
        index: steps.length,
        label: `Position ${i} — '${char}'`,
        inputState: `'${char}'`,
        outputState: `'${char}'`,
        highlight: [i],
        note: `'${char}' is non-alphabetic — passed through unchanged.`,
      })
      continue
    }

    const x = isUpper ? code - 65 : code - 97
    const shift = keyDigits[alphaIdx % keyDigits.length]
    const keyPos = alphaIdx % keyDigits.length

    let result: string
    let note: string

    if (decrypting) {
      const val = mod(x - shift, 26)
      result = String.fromCharCode((isUpper ? 65 : 97) + val)
      note = `'${char}' (x=${x}) - key[${keyPos}]=${shift} → (${x} − ${shift} + 26) mod 26 = ${val} → '${result}'`
    } else {
      const val = mod(x + shift, 26)
      result = String.fromCharCode((isUpper ? 65 : 97) + val)
      note = `'${char}' (x=${x}) + key[${keyPos}]=${shift} → (${x} + ${shift}) mod 26 = ${val} → '${result}'`
    }

    output += result

    steps.push({
      index: steps.length,
      label: `Position ${i} — '${char}'  (key[${keyPos}]=${shift})`,
      inputState: `'${char}' (x=${x})`,
      outputState: `'${result}'`,
      highlight: [i],
      note,
    })

    alphaIdx++
  }

  // Final milestone
  steps.push({
    index: steps.length,
    label: decrypting ? 'Plaintext' : 'Ciphertext',
    inputState: input,
    outputState: output,
    note: 'Final result after applying Gronsfeld numeric shift to every alphabetic character.',
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
// Fast path
// ---------------------------------------------------------------------------

function gronsfeldFast(
  input: string,
  key: string,
  decrypting: boolean,
): CipherResult {
  const start = performance.now()
  const keyDigits = parseKey(key)
  let output = ''
  let alphaIdx = 0

  for (let i = 0; i < input.length; i++) {
    const char = input[i]
    const code = char.charCodeAt(0)
    const isUpper = code >= 65 && code <= 90
    const isLower = code >= 97 && code <= 122

    if (!isUpper && !isLower) {
      output += char
      continue
    }

    const x = isUpper ? code - 65 : code - 97
    const shift = keyDigits[alphaIdx % keyDigits.length]

    if (decrypting) {
      output += String.fromCharCode((isUpper ? 65 : 97) + mod(x - shift, 26))
    } else {
      output += String.fromCharCode((isUpper ? 65 : 97) + mod(x + shift, 26))
    }

    alphaIdx++
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

export function encrypt(
  input: string,
  key: string = '31415',
  options: CipherOptions = {},
): CipherResult {
  validateInput(input)
  if (options.instrument) return gronsfeldInstrumented(input, key, false)
  return gronsfeldFast(input, key, false)
}

export function decrypt(
  input: string,
  key: string = '31415',
  options: CipherOptions = {},
): CipherResult {
  validateInput(input)
  if (options.instrument) return gronsfeldInstrumented(input, key, true)
  return gronsfeldFast(input, key, true)
}

// ---------------------------------------------------------------------------
// Test vectors
// ---------------------------------------------------------------------------

/**
 * Gronsfeld = Vigenère with numeric key.
 *
 * ATTACK, key=31415:
 *   A(0)+3→D, T(19)+1→U, T(19)+4→X, A(0)+1→B, C(2)+5→H, K(10)+3→N
 *   = DUXBHN
 *
 * HELLO, key=123:
 *   H(7)+1→I, E(4)+2→G, L(11)+3→O, L(11)+1→M, O(14)+2→Q
 *   = IGOMQ
 *
 * HELLO WORLD, key=31415:
 *   H(7)+3→K, E(4)+1→F, L(11)+4→P, L(11)+1→M, O(14)+5→T,
 *   space, W(22)+3→Z, O(14)+1→P, R(17)+4→V, L(11)+1→M, D(3)+5→I
 *   = KFPMT ZPVM
 */
export const TEST_VECTORS: TestVector[] = [
  {
    input: 'ATTACK',
    key: '31415',
    expected: 'DUXBHN',
    description:
      'A(0)+3=D, T(19)+1=U, T(19)+4=X, A(0)+1=B, C(2)+5=H, K(10)+3=N',
  },
  {
    input: 'HELLO',
    key: '123',
    expected: 'IGOMQ',
    description:
      'H(7)+1=I, E(4)+2=G, L(11)+3=O, L(11)+1=M, O(14)+2=Q',
  },
  {
    input: 'HELLO',
    key: '00000',
    expected: 'HELLO',
    description: 'All-zero key = identity transform.',
  },
  {
    input: 'A',
    key: '5',
    expected: 'F',
    description: 'Single letter: A(0)+5=5→F.',
  },
  {
    input: 'ABC',
    key: '1',
    expected: 'BCD',
    description: 'Shift 1 everywhere — equivalent to Caesar k=1.',
  },
  {
    input: 'HELLO WORLD',
    key: '31415',
    expected: 'KFPMT ZPVM',
    description: 'With spaces — non-alpha chars pass through.',
  },
]
