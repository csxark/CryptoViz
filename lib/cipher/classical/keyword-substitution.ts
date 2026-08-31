/**
 * Keyword Substitution Cipher — a monoalphabetic substitution cipher where
 * a keyword is used to generate a mixed alphabet for the substitution table.
 *
 * @see CIPHER_ENGINE.md section 1.x (Monoalphabetic substitution)
 *
 * The keyword is used to build a scrambled alphabet: first the unique
 * letters of the keyword (in order of first appearance), then the
 * remaining letters of the alphabet in normal order. This scrambled
 * alphabet becomes the substitution table mapping A→first letter,
 * B→second letter, etc.
 *
 * Example with keyword "SECRET":
 *   Standard: A B C D E F G H I J K L M N O P Q R S T U V W X Y Z
 *   Keyed:    S E C R T A B D F G H I J K L M N O P Q U V W X Y Z
 *   A→S, B→E, C→C, D→R, E→T, ...
 *
 * Unlike Playfair/Bifid which merge I/J, this cipher uses the full
 * 26-letter alphabet — each letter maps uniquely.
 *
 * Encrypt: Look up the plaintext letter in the standard alphabet,
 *          output the corresponding letter from the keyed alphabet.
 * Decrypt: Look up the ciphertext letter in the keyed alphabet,
 *          output the corresponding letter from the standard alphabet.
 *
 * Non-alphabetic characters pass through unchanged.
 */

import type { CipherResult, CipherStep, CipherOptions, TestVector } from '../types'
import { CipherError, validateInput, validateKey } from '../../utils/errors'

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

const METADATA = {
  name: 'Keyword Substitution Cipher',
  securityStatus: 'broken' as const,
  breakingComplexity:
    'Broken by frequency analysis — the substitution is monoalphabetic, so letter frequencies in the ciphertext match the plaintext language distribution.',
  yearDesigned: -400,
  standardBody: 'Classical cryptography',
  securityWarning:
    'The Keyword Substitution cipher is an educational cipher only. It provides no meaningful security against frequency analysis.',
}

// ---------------------------------------------------------------------------
// Alphabet construction
// ---------------------------------------------------------------------------

const STANDARD_ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

function buildKeyedAlphabet(keyword: string): string {
  const cleaned = keyword
    .toUpperCase()
    .replace(/[^A-Z]/g, '')

  const seen = new Set<string>()
  let keyed = ''

  // First pass: unique letters from keyword in order
  for (const ch of cleaned) {
    if (!seen.has(ch)) {
      seen.add(ch)
      keyed += ch
    }
  }

  // Second pass: remaining alphabet letters in standard order
  for (const ch of STANDARD_ALPHA) {
    if (!seen.has(ch)) {
      keyed += ch
    }
  }

  return keyed // 26 letters, each unique
}

// ---------------------------------------------------------------------------
// Instrumented path
// ---------------------------------------------------------------------------

function keywordSubInstrumented(
  input: string,
  keyword: string,
  decrypting: boolean,
): CipherResult {
  const start = performance.now()
  const keyedAlpha = buildKeyedAlphabet(keyword)
  const steps: CipherStep[] = []
  let output = ''

  // Step 0: Key setup (milestone)
  steps.push({
    index: 0,
    label: decrypting
      ? 'Key setup — Keyword substitution decryption'
      : 'Key setup — Keyword substitution encryption',
    inputState: `KEYWORD: "${keyword}"`,
    outputState: keyedAlpha,
    table: [
      { key: 'Cipher type', value: 'Monoalphabetic substitution' },
      { key: 'Keyword', value: keyword.toUpperCase().replace(/[^A-Z]/g, '') },
      { key: 'Alphabet size', value: '26 letters (full alphabet)' },
      { key: 'Keyed alphabet', value: keyedAlpha },
    ],
    note: decrypting
      ? 'Decryption reverses the substitution: each ciphertext letter is looked up in the keyed alphabet, and the corresponding standard alphabet letter is the plaintext.'
      : 'The keyword creates a scrambled alphabet. Unique keyword letters come first, then remaining alphabet letters in order. This keyed alphabet replaces the standard A→Z mapping.',
    isMilestone: true,
  })

  // Step 1: Show the substitution table (milestone)
  const tableRows: string[][] = [
    ['Plain', ...STANDARD_ALPHA.split('')],
    ['Cipher', ...keyedAlpha.split('')],
  ]
  steps.push({
    index: 1,
    label: 'Substitution mapping table',
    inputState: STANDARD_ALPHA,
    outputState: keyedAlpha,
    matrix: tableRows,
    note: 'Complete substitution table. The top row is the standard alphabet (plaintext), the bottom row is the keyed alphabet (ciphertext).',
    isMilestone: true,
  })

  // Per-character steps
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

    let result: string
    let note: string

    if (decrypting) {
      const pos = keyedAlpha.indexOf(char.toUpperCase())
      if (pos === -1) {
        result = char
        note = `'${char}' not found in keyed alphabet — passed through unchanged.`
      } else {
        result = String.fromCharCode((isUpper ? 65 : 97) + pos)
        note = `'${char}' found at position ${pos} in keyed alphabet → standard[${pos}] = '${result}'`
      }
    } else {
      const pos = STANDARD_ALPHA.indexOf(char.toUpperCase())
      if (pos === -1) {
        result = char
        note = `'${char}' not found in standard alphabet — passed through unchanged.`
      } else {
        const mapped = keyedAlpha[pos]
        result = isLower ? mapped.toLowerCase() : mapped
        note = `'${char}' at position ${pos} in standard alphabet → keyed[${pos}] = '${result}'`
      }
    }

    output += result

    steps.push({
      index: steps.length,
      label: `Position ${i} — '${char}'`,
      inputState: `'${char}' (pos=${decrypting ? keyedAlpha.indexOf(char.toUpperCase()) : STANDARD_ALPHA.indexOf(char.toUpperCase())})`,
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
    note: 'Final result after applying keyword substitution to every character.',
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

function keywordSubFast(
  input: string,
  keyword: string,
  decrypting: boolean,
): CipherResult {
  const start = performance.now()
  const keyedAlpha = buildKeyedAlphabet(keyword)
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

    if (decrypting) {
      const pos = keyedAlpha.indexOf(char.toUpperCase())
      if (pos === -1) { output += char; continue }
      output += String.fromCharCode((isUpper ? 65 : 97) + pos)
    } else {
      const pos = STANDARD_ALPHA.indexOf(char.toUpperCase())
      if (pos === -1) { output += char; continue }
      const mapped = keyedAlpha[pos]
      output += isLower ? mapped.toLowerCase() : mapped
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

export function encrypt(
  input: string,
  key: string = 'SECRET',
  options: CipherOptions = {},
): CipherResult {
  validateInput(input)
  validateKey(key)
  if (options.instrument) return keywordSubInstrumented(input, key, false)
  return keywordSubFast(input, key, false)
}

export function decrypt(
  input: string,
  key: string = 'SECRET',
  options: CipherOptions = {},
): CipherResult {
  validateInput(input)
  validateKey(key)
  if (options.instrument) return keywordSubInstrumented(input, key, true)
  return keywordSubFast(input, key, true)
}

// ---------------------------------------------------------------------------
// Test vectors
// ---------------------------------------------------------------------------

/**
 * Keyword "SECRET" builds keyed alphabet:
 *   S E C R T A B D F G H I J K L M N O P Q U V W X Y Z
 *
 * Standard: A B C D E F G H I J K L M N O P Q R S T U V W X Y Z
 * Keyed:    S E C R T A B D F G H I J K L M N O P Q U V W X Y Z
 *
 * HELLO: H(7)→F, E(4)→T, L(11)→L, L(11)→L, O(14)→N = FTLLN
 * ATTACK: A(0)→S, T(19)→Q, T(19)→Q, A(0)→S, C(2)→C, K(10)→I = SQQSCI
 *
 * Keyword "KEY" builds keyed alphabet:
 *   K E Y A B C D F G H I J L M N O P Q R S T U V W X Z
 *
 * HELLO: H(7)→G, E(4)→A, L(11)→N, L(11)→N, O(14)→R = GANNR
 */
export const TEST_VECTORS: TestVector[] = [
  {
    input: 'HELLO',
    key: 'SECRET',
    expected: 'FTLLN',
    description: 'H(7)→F, E(4)→T, L(11)→L, L(11)→L, O(14)→N',
  },
  {
    input: 'ATTACK',
    key: 'SECRET',
    expected: 'SQQSCI',
    description: 'A(0)→S, T(19)→Q, T(19)→Q, A(0)→S, C(2)→C, K(10)→I',
  },
  {
    input: 'HELLO',
    key: 'KEY',
    expected: 'GANNR',
    description: 'Keyed: KEYABCDFGHIJLMNOPQRSTUVWXZ. H(7)→G, E(4)→A, L(11)→N, O(14)→R',
  },
  {
    input: 'A',
    key: 'B',
    expected: 'B',
    description: 'Keyed: BACDEFGHIJKLMNOPQRSTUVWXYZ. A(0)→B.',
  },
  {
    input: 'HELLO WORLD',
    key: 'CIPHER',
    expected: 'XOLLA ALARW',
    description: 'With spaces — non-alpha chars pass through.',
  },
  {
    input: 'THE',
    key: 'PHOENIX',
    expected: 'QDN',
    description: 'Keyed: PHOENIXABCDFGJKLQRSTUVWYZ. T(19)→Q, H(7)→D, E(4)→N',
  },
]
