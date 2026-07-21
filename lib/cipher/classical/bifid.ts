/**
 * Bifid Cipher — Delastelle fractionating cipher combining a Polybius
 * square substitution with a positional transposition.
 * @see CIPHER_ENGINE.md section 1.x (Polybius family)
 *
 * Each letter is first replaced by its (row, col) coordinate pair in a
 * keyed 5x5 Polybius square (I/J merged). All the row digits are then
 * written out followed by all the column digits, and that combined digit
 * stream is re-paired sequentially into new (row, col) coordinates, which
 * are mapped back through the same square to produce the ciphertext. This
 * covers the whole message (classic non-periodic Bifid) — mixing the
 * *positions* of every letter in the text, not just substituting it, is
 * what makes Bifid resist simple frequency analysis despite being a
 * monoalphabetic substitution at its core.
 *
 * Non-alphabetic characters and spaces are stripped before processing
 * (same convention as this repo's columnar-transposition cipher) — Bifid's
 * whole-message fractionation has no well-defined way to pass punctuation
 * through in place without breaking the coordinate alignment.
 */

import type { CipherResult, CipherStep, CipherMetadata, CipherOptions, TestVector } from '../types'
import { CipherError, validateInput } from '../../utils/errors'

const METADATA: CipherMetadata = {
  name: 'Bifid Cipher',
  securityStatus: 'broken',
  breakingComplexity:
    'Vulnerable to ciphertext-only attacks exploiting the fixed whole-message period; broken with frequency analysis combined with hill-climbing key search.',
  yearDesigned: 1901,
}

function buildSquare(key: string): string {
  const cleanedKey = key.toUpperCase().replace(/J/g, 'I').replace(/[^A-Z]/g, '')
  if (key.trim() !== '' && cleanedKey.length === 0) {
    throw new CipherError('INVALID_KEY', 'Keyword must contain at least one A-Z letter.')
  }
  const seen = new Set<string>()
  let square = ''
  for (const ch of cleanedKey) {
    if (!seen.has(ch)) {
      seen.add(ch)
      square += ch
    }
  }
  for (const ch of 'ABCDEFGHIKLMNOPQRSTUVWXYZ') {
    if (!seen.has(ch)) {
      seen.add(ch)
      square += ch
    }
  }
  return square // 25 chars, row-major 5x5
}

function coordsOf(square: string, ch: string): [number, number] {
  const idx = square.indexOf(ch)
  return [Math.floor(idx / 5) + 1, (idx % 5) + 1]
}

function charAt(square: string, row: number, col: number): string {
  return square[(row - 1) * 5 + (col - 1)]
}

function cleanInput(input: string): string {
  return input.toUpperCase().replace(/J/g, 'I').replace(/[^A-Z]/g, '')
}

function bifidTransform(
  input: string,
  key: string,
  encrypting: boolean,
  instrument: boolean
): CipherResult {
  const start = performance.now()
  const square = buildSquare(key)
  const clean = cleanInput(input)

  if (clean.length === 0) {
    throw new CipherError('INVALID_INPUT', 'Input must contain at least one A-Z letter.')
  }

  const steps: CipherStep[] = []
  if (instrument) {
    steps.push({
      index: 0,
      label: 'Build keyed 5x5 square',
      inputState: key || '(no keyword — standard alphabet)',
      outputState: square,
      matrix: [0, 1, 2, 3, 4].map((r) => [0, 1, 2, 3, 4].map((c) => charAt(square, r + 1, c + 1))),
      note: 'I and J share a cell. Keyword letters (deduplicated) fill the square first, followed by the remaining alphabet in order.',
      isMilestone: true,
    })
  }

  let output: string

  if (encrypting) {
    const rowsSeq: number[] = []
    const colsSeq: number[] = []
    for (const ch of clean) {
      const [r, c] = coordsOf(square, ch)
      rowsSeq.push(r)
      colsSeq.push(c)
    }
    if (instrument) {
      steps.push({
        index: steps.length,
        label: 'Convert letters to (row, col) coordinates',
        inputState: clean,
        outputState: `rows: ${rowsSeq.join('')}  cols: ${colsSeq.join('')}`,
        note: "Looked up every letter's position in the square.",
        isMilestone: true,
      })
    }
    const combined = [...rowsSeq, ...colsSeq]
    let out = ''
    for (let i = 0; i < clean.length; i++) {
      const r = combined[2 * i]
      const c = combined[2 * i + 1]
      const ch = charAt(square, r, c)
      out += ch
      if (instrument) {
        steps.push({
          index: steps.length,
          label: `Re-pair digit ${2 * i + 1}/${2 * i + 2} -> letter ${i + 1}`,
          inputState: `(${r}, ${c})`,
          outputState: ch,
          highlight: [i],
          note: `Read the digit stream sequentially in pairs and mapped (${r}, ${c}) back through the square.`,
        })
      }
    }
    output = out
  } else {
    const flat: number[] = []
    for (const ch of clean) {
      const [r, c] = coordsOf(square, ch)
      flat.push(r, c)
    }
    if (instrument) {
      steps.push({
        index: steps.length,
        label: 'Convert ciphertext letters to coordinates, flatten',
        inputState: clean,
        outputState: flat.join(''),
        note: "Flattened every ciphertext letter's (row, col) pair into one long digit stream.",
        isMilestone: true,
      })
    }
    const half = clean.length
    const rowsSeq = flat.slice(0, half)
    const colsSeq = flat.slice(half)
    let out = ''
    for (let i = 0; i < half; i++) {
      const ch = charAt(square, rowsSeq[i], colsSeq[i])
      out += ch
      if (instrument) {
        steps.push({
          index: steps.length,
          label: `Recover plaintext letter ${i + 1}`,
          inputState: `(${rowsSeq[i]}, ${colsSeq[i]})`,
          outputState: ch,
          highlight: [i],
          note: 'Split the digit stream in half (first half = rows, second half = cols) and re-paired by position.',
        })
      }
    }
    output = out
  }

  if (instrument) {
    steps.push({
      index: steps.length,
      label: encrypting ? 'Ciphertext' : 'Plaintext',
      inputState: clean,
      outputState: output,
      note: 'Final result.',
      isMilestone: true,
    })
  }

  return {
    output,
    outputEncoding: 'utf8',
    steps,
    metadata: METADATA,
    durationMs: performance.now() - start,
  }
}

export function encrypt(input: string, key: string = '', options: CipherOptions = {}): CipherResult {
  validateInput(input)
  return bifidTransform(input, key, true, !!options.instrument)
}

export function decrypt(input: string, key: string = '', options: CipherOptions = {}): CipherResult {
  validateInput(input)
  return bifidTransform(input, key, false, !!options.instrument)
}

export const TEST_VECTORS: TestVector[] = [
  {
    input: 'HELP',
    key: '',
    expected: 'FNPE',
    description:
      'Self-verified whole-message-period Bifid, standard alphabet square (no keyword), hand-traced against the 5x5 I/J-merged table.',
  },
]
