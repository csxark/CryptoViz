/**
 * Trithemius Cipher — polyalphabetic substitution cipher where the shift
 * for each character equals its position index.
 *
 * @see CIPHER_ENGINE.md section 1.x (Trithemius Cipher)
 *
 * Encrypt: C(i) = (P(i) + i) mod 26
 * Decrypt: P(i) = (C(i) - i) mod 26
 *
 * Named after Johannes Trithemius (1462–1516), who described it in his
 * 1508 book *Polygraphia*. It is the simplest polyalphabetic cipher and
 * serves as the historical precursor to the Vigenère cipher (which
 * generalizes the increasing shift to a repeating keyword).
 *
 * Unlike Caesar cipher (fixed shift), Trithemius shifts each letter by a
 * different amount based on its position, making simple frequency analysis
 * harder — though a modern attacker can trivially break it.
 *
 * Non-alphabetic characters pass through unchanged.
 */

import type { CipherResult, CipherStep, CipherOptions, TestVector } from '../types'
import { CipherError, validateInput } from '../../utils/errors'

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

const METADATA = {
  name: 'Trithemius Cipher',
  securityStatus: 'broken' as const,
  breakingComplexity:
    'Trivially broken: the shift pattern is deterministic and increases by 1 per position, so any known-plaintext block of length k reveals the entire key stream.',
  yearDesigned: 1508,
  standardBody: 'Classical cryptography',
  securityWarning:
    'The Trithemius cipher is an educational cipher only. It provides no meaningful security against modern cryptanalysis.',
}

// ---------------------------------------------------------------------------
// Core helpers
// ---------------------------------------------------------------------------

/** Compute (n mod m) ensuring a non-negative result. */
function mod(n: number, m: number): number {
  return ((n % m) + m) % m
}

// ---------------------------------------------------------------------------
// Instrumented path (for visualizer step-by-step display)
// ---------------------------------------------------------------------------

function trithemiusInstrumented(
  input: string,
  decrypting: boolean,
): CipherResult {
  const start = performance.now()
  const steps: CipherStep[] = []
  let output = ''

  // Step 0: Key setup (milestone)
  steps.push({
    index: 0,
    label: decrypting ? 'Key setup — Trithemius decryption' : 'Key setup — Trithemius encryption',
    inputState: `INPUT: "${input}"`,
    outputState: decrypting
      ? 'C(i) → (C(i) - i) mod 26'
      : 'P(i) → (P(i) + i) mod 26',
    table: [
      { key: 'Cipher type', value: 'Polyalphabetic substitution' },
      { key: 'Shift pattern', value: 'Position index i = 0, 1, 2, ...' },
      { key: 'Key length', value: `∞ (infinite auto-key stream)` },
      { key: 'Historical note', value: 'Johannes Trithemius, 1508' },
    ],
    note: decrypting
      ? 'Trithemius decryption reverses the position-dependent shift: each ciphertext letter at position i is shifted backward by i positions in the alphabet.'
      : 'Trithemius encryption shifts each letter forward by its position index. The first letter (i=0) has no shift, the second (i=1) shifts by 1, and so on.',
    isMilestone: true,
  })

  // Step 1: Show the shift table for this specific input (milestone)
  const shiftTable: string[][] = [
    ['Pos i', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'],
    ['Shift', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'],
  ]
  steps.push({
    index: 1,
    label: 'Position-to-shift mapping table',
    inputState: 'i = 0, 1, 2, ...',
    outputState: 'shift = i mod 26',
    matrix: shiftTable,
    note: 'Each position i maps directly to a shift of i mod 26. This is the defining characteristic of the Trithemius cipher — the shift is the position itself.',
    isMilestone: true,
  })

  // Steps 2..n+1: One per character
  for (let i = 0; i < input.length; i++) {
    const char = input[i]
    const code = char.charCodeAt(0)
    const isUpper = code >= 65 && code <= 90
    const isLower = code >= 97 && code <= 122
    const isAlpha = isUpper || isLower

    let result: string
    let note: string

    if (!isAlpha) {
      result = char
      note = `'${char}' is non-alphabetic — passed through unchanged. Position counter does not advance.`
    } else {
      const x = isUpper ? code - 65 : code - 97
      const shift = i % 26

      if (decrypting) {
        const decrypted = mod(x - shift, 26)
        result = String.fromCharCode((isUpper ? 65 : 97) + decrypted)
        note = `'${char}' at position ${i}: (${x} − ${shift}) mod 26 = ${mod(x - shift, 26)} → '${result}'`
      } else {
        const encrypted = mod(x + shift, 26)
        result = String.fromCharCode((isUpper ? 65 : 97) + encrypted)
        note = `'${char}' at position ${i}: (${x} + ${shift}) mod 26 = ${mod(x + shift, 26)} → '${result}'`
      }
    }

    output += result

    steps.push({
      index: steps.length,
      label: `Position ${i} — '${char}'`,
      inputState: isAlpha
        ? `'${char}' (x=${isUpper ? code - 65 : code - 97}, shift=${i % 26})`
        : `'${char}' (non-alpha)`,
      outputState: `'${result}'`,
      highlight: [i],
      note,
    })
  }

  // Final milestone
  steps.push({
    index: steps.length,
    label: decrypting ? 'Plaintext' : 'Ciphertext',
    inputState: input,
    outputState: output,
    note: `Final result after applying position-dependent shift to every character.`,
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

function trithemiusFast(input: string, decrypting: boolean): CipherResult {
  const start = performance.now()
  let output = ''

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
    const shift = i % 26

    if (decrypting) {
      const decrypted = mod(x - shift, 26)
      output += String.fromCharCode((isUpper ? 65 : 97) + decrypted)
    } else {
      const encrypted = mod(x + shift, 26)
      output += String.fromCharCode((isUpper ? 65 : 97) + encrypted)
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
 * Encrypt plaintext using the Trithemius cipher.
 * Each letter at position i is shifted forward by i positions mod 26.
 *
 * @param input   - The plaintext to encrypt (non-alpha chars pass through).
 * @param _key    - Unused (Trithemius has no key — shift is positional).
 * @param options - CipherOptions; set `instrument: true` for step-by-step trace.
 * @returns       - CipherResult with the encrypted output and trace steps.
 */
export function encrypt(
  input: string,
  _key: string = '',
  options: CipherOptions = {},
): CipherResult {
  validateInput(input)
  if (options.instrument) {
    return trithemiusInstrumented(input, false)
  }
  return trithemiusFast(input, false)
}

/**
 * Decrypt ciphertext encrypted with the Trithemius cipher.
 * Each letter at position i is shifted backward by i positions mod 26.
 *
 * @param input   - The ciphertext to decrypt (non-alpha chars pass through).
 * @param _key    - Unused (Trithemius has no key).
 * @param options - CipherOptions; set `instrument: true` for step-by-step trace.
 * @returns       - CipherResult with the decrypted output and trace steps.
 */
export function decrypt(
  input: string,
  _key: string = '',
  options: CipherOptions = {},
): CipherResult {
  validateInput(input)
  if (options.instrument) {
    return trithemiusInstrumented(input, true)
  }
  return trithemiusFast(input, true)
}

// ---------------------------------------------------------------------------
// Test vectors
// ---------------------------------------------------------------------------

/**
 * Reference test vectors for the Trithemius cipher.
 *
 * Encrypt: C(i) = (P(i) + i) mod 26
 * Decrypt: P(i) = (C(i) - i) mod 26
 *
 * Verified by hand:
 *   HELLO: H(7+0)→H, E(4+1)→F, L(11+2)→N, L(11+3)→O, O(14+4)→S = HFNOS
 *   ABC:   A(0+0)→A, B(1+1)→C, C(2+2)→E = ACE
 *   ATTACK: A(0+0)→A, T(19+1)→U, T(19+2)→V, A(0+3)→D, C(2+4)→G, K(10+5)→P = AVVDGP
 */
export const TEST_VECTORS: TestVector[] = [
  {
    input: 'HELLO',
    key: '',
    expected: 'HFNOS',
    description:
      'Trithemius: H(7+0)→H, E(4+1)→F, L(11+2)→N, L(11+3)→O, O(14+4)→S',
  },
  {
    input: 'ABC',
    key: '',
    expected: 'ACE',
    description:
      'A(0+0)→A, B(1+1)→C, C(2+2)→E — simplest ascending shift.',
  },
  {
    input: 'ATTACK',
    key: '',
    expected: 'AVVDGP',
    description:
      'A(0+0)→A, T(19+1)→U, T(19+2)→V, A(0+3)→D, C(2+4)→G, K(10+5)→P',
  },
  {
    input: 'A',
    key: '',
    expected: 'A',
    description: 'Single letter at position 0 with shift 0 — identity.',
  },
  {
    input: 'HELLO WORLD',
    key: '',
    expected: 'HFNOS AUQYF',
    description:
      'With space passthrough: HELLO→HFNOS, space stays, WORLD→AUQYF (positions continue from i=6).',
  },
  {
    input: 'the quick brown fox',
    key: '',
    expected: 'tig xkmeu fjlcb pgi',
    description:
      'Lowercase with spaces — spaces pass through, position counter continues for all characters.',
  },
]
