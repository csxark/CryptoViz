/**
 * Bacon's Cipher — steganographic substitution cipher using binary
 * encoding represented by two distinct symbols.
 *
 * @see CIPHER_ENGINE.md section 1.x (Steganographic ciphers)
 *
 * Francis Bacon (1561–1626) devised this cipher to hide secret messages
 * within seemingly innocent text. Each letter of the plaintext is encoded
 * as a 5-bit binary sequence using two symbols (default: 'A' and 'B').
 * The ciphertext is then transcribed using those symbols, creating a
 * hidden message embedded in any carrier text.
 *
 * Standard Bacon's cipher (24 letters, I/J and U/V merged):
 *   A=AAAAA  B=AAAAB  C=AAABA  D=AAABB  E=AABAA
 *   F=AABAB  G=AABBA  H=AABBB  I/J=ABAAA  K=ABAAB
 *   L=ABABA  M=ABABB  N=ABBAA  O=ABBAB  P=ABBBA
 *   Q=ABBBB  R=BAAAA  S=BAAAB  T=BAABA  U/V=BAABB
 *   W=BABAA  X=BABAB  Y=BABBA  Z=BABBB
 *
 * Extended Bacon's cipher (26 letters, no merging):
 *   Includes all 26 letters with 5-bit encoding.
 *
 * Non-alphabetic characters in the input are stripped before processing
 * (same convention as Bifid in this repo).
 */

import type { CipherResult, CipherStep, CipherOptions, TestVector } from '../types'
import { CipherError, validateInput } from '../../utils/errors'

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

const METADATA = {
  name: "Bacon's Cipher",
  securityStatus: 'broken' as const,
  breakingComplexity:
    'Trivially broken: fixed 5-bit encoding with only 24/26 possible symbols; frequency analysis of the A/B distribution reveals the plaintext.',
  yearDesigned: 1623,
  standardBody: 'Classical steganography',
  securityWarning:
    "Bacon's cipher is a steganographic cipher, not an encryption cipher. It hides a message in plain sight rather than scrambling it. It provides no meaningful security.",
}

// ---------------------------------------------------------------------------
// Encoding tables
// ---------------------------------------------------------------------------

/** Standard Bacon alphabet (I/J merged, U/V merged) — 24 letters → 5-bit */
const BACON_STANDARD = 'ABCDEFGHIKLMNOPQRSTU VWXYZ'
/** Extended Bacon alphabet (all 26 letters) — 26 letters → 5-bit */
const BACON_EXTENDED = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

function getAlphabet(useExtended: boolean): string {
  return useExtended ? BACON_EXTENDED : BACON_STANDARD
}

/** Map a letter to its 5-bit Bacon code (array of 0s and 1s). */
function letterToCode(letter: string, useExtended: boolean): number[] {
  const alpha = getAlphabet(useExtended)
  const idx = alpha.indexOf(letter)
  if (idx === -1) return []
  return [
    (idx >> 4) & 1,
    (idx >> 3) & 1,
    (idx >> 2) & 1,
    (idx >> 1) & 1,
    idx & 1,
  ]
}

/** Map a 5-bit code (array of 0s and 1s) back to a letter. */
function codeToLetter(code: number[], useExtended: boolean): string {
  const alpha = getAlphabet(useExtended)
  const idx = (code[0] << 4) | (code[1] << 3) | (code[2] << 2) | (code[3] << 1) | code[4]
  return alpha[idx] ?? '?'
}

// ---------------------------------------------------------------------------
// Input cleaning
// ---------------------------------------------------------------------------

function cleanInput(input: string, useExtended: boolean): string {
  const alpha = getAlphabet(useExtended)
  const alphaSet = new Set(alpha)
  return input
    .toUpperCase()
    .split('')
    .filter(ch => alphaSet.has(ch))
    .join('')
}

// ---------------------------------------------------------------------------
// Instrumented path
// ---------------------------------------------------------------------------

function baconInstrumented(
  input: string,
  key: string,
  encrypting: boolean,
  instrument: boolean,
): CipherResult {
  const start = performance.now()
  const useExtended = key.toLowerCase().includes('extended') || key.toLowerCase().includes('26')
  const symbolA = 'A'
  const symbolB = 'B'

  const steps: CipherStep[] = []

  // Step 0: Key setup (milestone)
  steps.push({
    index: 0,
    label: encrypting ? "Key setup — Bacon's encryption" : "Key setup — Bacon's decryption",
    inputState: `KEY: "${key || 'standard'}"`,
    outputState: useExtended ? 'Extended alphabet (26 letters)' : 'Standard alphabet (I/J merged, U/V merged)',
    table: [
      { key: 'Cipher type', value: 'Steganographic substitution' },
      { key: 'Alphabet', value: useExtended ? '26 letters (5-bit)' : '24 letters (I/J, U/V merged)' },
      { key: 'Symbol A', value: `'${symbolA}' = 0` },
      { key: 'Symbol B', value: `'${symbolB}' = 1` },
      { key: 'Code length', value: '5 bits per letter' },
    ],
    note: encrypting
      ? "Bacon's cipher encodes each letter as a 5-bit binary string, then transcribes 0→A and 1→B. The result appears as a sequence of A's and B's that can be hidden in any carrier text."
      : "Bacon's decryption reads A/B pairs as 5-bit codes and maps them back to plaintext letters.",
    isMilestone: true,
  })

  if (encrypting) {
    const clean = cleanInput(input, useExtended)

    if (clean.length === 0) {
      throw new CipherError('INVALID_INPUT', 'Input must contain at least one valid letter.')
    }

    // Step 1: Show the encoding table (milestone)
    const alpha = getAlphabet(useExtended)
    const tableRows: string[][] = [
      ['Letter', ...alpha.slice(0, 13).split('')],
      ['Code', ...alpha.slice(0, 13).split('').map(c => letterToCode(c, useExtended).join(''))],
    ]
    steps.push({
      index: 1,
      label: 'Bacon encoding table (first half)',
      inputState: alpha.slice(0, 13),
      outputState: alpha.slice(0, 13).map(c => letterToCode(c, useExtended).join('')).join(' '),
      matrix: tableRows,
      note: 'Each letter maps to a unique 5-bit binary code. 0=A, 1=B.',
      isMilestone: true,
    })

    // Step 2: Convert letters to bits
    const allBits: number[] = []
    for (const ch of clean) {
      const code = letterToCode(ch, useExtended)
      allBits.push(...code)
    }
    steps.push({
      index: 2,
      label: `Convert ${clean.length} letters to ${allBits.length} bits`,
      inputState: clean,
      outputState: allBits.join(''),
      note: `Each of the ${clean.length} letters produced 5 bits, for a total of ${allBits.length} bits.`,
      isMilestone: true,
    })

    // Step 3: Transcribe bits to A/B symbols
    const bitsStr = allBits.map(b => b.toString()).join('')
    let output = ''
    for (let i = 0; i < allBits.length; i++) {
      const sym = allBits[i] === 0 ? symbolA : symbolB
      output += sym

      if (instrument) {
        steps.push({
          index: steps.length,
          label: `Bit ${i + 1}/${allBits.length}: ${allBits[i]} → '${sym}'`,
          inputState: bitsStr[i],
          outputState: sym,
          highlight: [i],
          note: `Bit value ${allBits[i]} maps to symbol '${sym}'.`,
        })
      }
    }

    // Final milestone
    steps.push({
      index: steps.length,
      label: 'Ciphertext (A/B symbols)',
      inputState: input,
      outputState: output,
      note: `Encoded ${clean.length} letters into ${output.length} A/B symbols. This can be embedded in any carrier text by substituting A for the first variant and B for the second.`,
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

  // Decryption path
  const clean = cleanInput(input, useExtended)

  if (clean.length === 0) {
    throw new CipherError('INVALID_INPUT', 'Input must contain at least A or B symbols.')
  }

  if (clean.length % 5 !== 0) {
    throw new CipherError(
      'INVALID_INPUT',
      `Bacon's cipher ciphertext length must be a multiple of 5 (got ${clean.length}).`,
    )
  }

  // Step 1: Group into 5-symbol blocks
  const blocks: string[] = []
  for (let i = 0; i < clean.length; i += 5) {
    blocks.push(clean.slice(i, i + 5))
  }
  steps.push({
    index: 1,
    label: `Group ${clean.length} symbols into ${blocks.length} blocks of 5`,
    inputState: clean,
    outputState: blocks.join(' | '),
    note: `Divided the A/B symbol stream into 5-symbol groups, each representing one letter.`,
    isMilestone: true,
  })

  // Step 2: Decode each block
  let output = ''
  for (let b = 0; b < blocks.length; b++) {
    const block = blocks[b]
    const code = block.split('').map(ch => (ch === 'B' ? 1 : 0))
    const letter = codeToLetter(code, useExtended)
    output += letter

    if (instrument) {
      steps.push({
        index: steps.length,
        label: `Block ${b + 1}: '${block}' → '${letter}'`,
        inputState: block,
        outputState: letter,
        highlight: [b * 5, b * 5 + 1, b * 5 + 2, b * 5 + 3, b * 5 + 4],
        note: `Binary ${code.join('')} = decimal ${parseInt(code.join(''), 2)} → '${letter}'`,
      })
    }
  }

  // Final milestone
  steps.push({
    index: steps.length,
    label: 'Plaintext',
    inputState: input,
    outputState: output,
    note: `Decoded ${blocks.length} 5-symbol blocks into ${output.length} plaintext letters.`,
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

function baconFast(input: string, key: string, encrypting: boolean): CipherResult {
  const start = performance.now()
  const useExtended = key.toLowerCase().includes('extended') || key.toLowerCase().includes('26')
  const symbolA = 'A'
  const symbolB = 'B'

  if (encrypting) {
    const clean = cleanInput(input, useExtended)
    if (clean.length === 0) {
      throw new CipherError('INVALID_INPUT', 'Input must contain at least one valid letter.')
    }

    let output = ''
    for (const ch of clean) {
      const code = letterToCode(ch, useExtended)
      for (const bit of code) {
        output += bit === 0 ? symbolA : symbolB
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

  // Decryption
  const clean = cleanInput(input, useExtended)
  if (clean.length === 0) {
    throw new CipherError('INVALID_INPUT', 'Input must contain at least A or B symbols.')
  }
  if (clean.length % 5 !== 0) {
    throw new CipherError(
      'INVALID_INPUT',
      `Ciphertext length must be a multiple of 5 (got ${clean.length}).`,
    )
  }

  let output = ''
  for (let i = 0; i < clean.length; i += 5) {
    const block = clean.slice(i, i + 5)
    const code = block.split('').map(ch => (ch === 'B' ? 1 : 0))
    output += codeToLetter(code, useExtended)
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
 * Encrypt plaintext using Bacon's cipher.
 * Each letter is encoded as a 5-bit binary string using A and B symbols.
 *
 * @param input   - The plaintext to encode.
 * @param key     - "extended" or "26" for 26-letter alphabet; default is standard 24-letter.
 * @param options - CipherOptions; set `instrument: true` for step-by-step trace.
 */
export function encrypt(
  input: string,
  key: string = '',
  options: CipherOptions = {},
): CipherResult {
  validateInput(input)
  if (options.instrument) {
    return baconInstrumented(input, key, true, true)
  }
  return baconFast(input, key, true)
}

/**
 * Decrypt Bacon's cipher ciphertext.
 * Reads 5-symbol A/B blocks and maps them back to plaintext letters.
 *
 * @param input   - The A/B symbol ciphertext.
 * @param key     - "extended" or "26" for 26-letter alphabet; default is standard 24-letter.
 * @param options - CipherOptions; set `instrument: true` for step-by-step trace.
 */
export function decrypt(
  input: string,
  key: string = '',
  options: CipherOptions = {},
): CipherResult {
  validateInput(input)
  if (options.instrument) {
    return baconInstrumented(input, key, false, true)
  }
  return baconFast(input, key, false)
}

// ---------------------------------------------------------------------------
// Test vectors
// ---------------------------------------------------------------------------

/**
 * Reference test vectors for Bacon's cipher.
 *
 * Standard (I/J merged, U/V merged):
 *   A=AAAAA, B=AAAAB, C=AAABA, D=AAABB, E=AABAA
 *   F=AABAB, G=AABBA, H=AABBB, I/J=ABAAA, K=ABAAB
 *   L=ABABA, M=ABABB, N=ABBAA, O=ABBAB, P=ABBBA
 *   Q=ABBBB, R=BAAAA, S=BAAAB, T=BAABA, U/V=BAABB
 *   W=BABAA, X=BABAB, Y=BABBA, Z=BABBB
 *
 * HELP: H=AABBB, E=AABAA, L=ABABA, P=ABBBA
 *     = AABBB AABAA ABABA ABBBA = AABBBAAAABAABAABBBA
 */
export const TEST_VECTORS: TestVector[] = [
  {
    input: 'HELP',
    key: '',
    expected: 'AABBBAAAABAABAABBBA',
    description:
      "Standard Bacon's: H=AABBB, E=AABAA, L=ABABA, P=ABBBA",
  },
  {
    input: 'A',
    key: '',
    expected: 'AAAAA',
    description: 'Single letter A = all zeros.',
  },
  {
    input: 'B',
    key: '',
    expected: 'AAAAB',
    description: 'Single letter B = 00001.',
  },
  {
    input: 'Z',
    key: '',
    expected: 'BABBB',
    description: 'Single letter Z = 10111.',
  },
  {
    input: 'ABC',
    key: '',
    expected: 'AAAAA AAAAB AAABA',
    description: 'First three letters of the alphabet.',
  },
  {
    input: 'HELLO',
    key: '',
    expected: 'AABBBAAAABAABAABBBAAABBA',
    description: "Standard Bacon's with H=E=L=L=O — note L repeats.",
  },
]
