/**
 * Nihilist Cipher — 19th-century Russian revolutionary cipher combining a
 * keyed Polybius square substitution with additive numeric key-stream
 * addition (no modulo reduction, unlike Vigenère's mod-26 addition).
 * @see CIPHER_ENGINE.md section 1.x (Polybius family)
 *
 * Every letter (plaintext and key) is first converted to a 2-digit
 * coordinate (row*10 + col, both 1-5) via a keyed 5x5 square. The
 * plaintext's digit-pairs are then added arithmetically to a repeating
 * numeric key stream (itself derived from a keyword through the same
 * square) to produce ciphertext numbers — output is numeric, not
 * alphabetic, which is what distinguishes Nihilist from Vigenère/Beaufort
 * at a glance.
 */

import type { CipherResult, CipherStep, CipherMetadata, CipherOptions, TestVector } from '../types'
import { CipherError, validateInput } from '../../utils/errors'

const METADATA: CipherMetadata = {
  name: 'Nihilist Cipher',
  securityStatus: 'broken',
  breakingComplexity:
    'The additive key stream repeats with a fixed period, making it vulnerable to the same Kasiski-style period-detection attacks as Vigenère, adapted for numeric ciphertext.',
  yearDesigned: 1880,
}

function buildSquare(key: string): string {
  const cleanedKey = key.toUpperCase().replace(/J/g, 'I').replace(/[^A-Z]/g, '')
  if (key.trim() !== '' && cleanedKey.length === 0) {
    throw new CipherError('INVALID_KEY', 'Square keyword must contain at least one A-Z letter.')
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
  return square
}

function numOf(square: string, ch: string): number {
  const idx = square.indexOf(ch)
  const row = Math.floor(idx / 5) + 1
  const col = (idx % 5) + 1
  return row * 10 + col
}

function charOfNum(square: string, n: number): string {
  const row = Math.floor(n / 10)
  const col = n % 10
  return square[(row - 1) * 5 + (col - 1)]
}

function parseKeyParam(key: string): { squareKey: string; numericKeyword: string } {
  const parts = key.split(',').map((p) => p.trim())
  const squareKey = parts[0] || ''
  const numericKeyword = parts[1] || parts[0] || ''
  if (!numericKeyword) {
    throw new CipherError(
      'INVALID_KEY',
      'Nihilist key must supply a numeric keyword: "squareKeyword,numericKeyword" (e.g. "RUSSIAN,KEY").'
    )
  }
  return { squareKey, numericKeyword }
}

function cleanText(input: string): string {
  return input.toUpperCase().replace(/J/g, 'I').replace(/[^A-Z]/g, '')
}

function nihilistTransform(
  input: string,
  key: string,
  encrypting: boolean,
  instrument: boolean
): CipherResult {
  const start = performance.now()
  const { squareKey, numericKeyword } = parseKeyParam(key)
  const square = buildSquare(squareKey)
  const cleanedKeyword = numericKeyword.toUpperCase().replace(/J/g, 'I').replace(/[^A-Z]/g, '')
  if (cleanedKeyword.length === 0) {
    throw new CipherError('INVALID_KEY', 'Numeric keyword must contain at least one A-Z letter.')
  }
  const keyStream = Array.from(cleanedKeyword).map((ch) => numOf(square, ch))

  const steps: CipherStep[] = []
  if (instrument) {
    steps.push({
      index: 0,
      label: 'Build keyed square + numeric key stream',
      inputState: `square key: "${squareKey || '(none)'}"  numeric keyword: "${cleanedKeyword}"`,
      outputState: keyStream.join(' '),
      matrix: [0, 1, 2, 3, 4].map((r) => [0, 1, 2, 3, 4].map((c) => square[r * 5 + c])),
      note: 'The numeric keyword is converted to numbers through the same square, then repeated to cover the whole message.',
      isMilestone: true,
    })
  }

  let output: string

  if (encrypting) {
    const clean = cleanText(input)
    if (clean.length === 0) {
      throw new CipherError('INVALID_INPUT', 'Input must contain at least one A-Z letter.')
    }
    const outNums: number[] = []
    for (let i = 0; i < clean.length; i++) {
      const p = numOf(square, clean[i])
      const k = keyStream[i % keyStream.length]
      const c = p + k
      outNums.push(c)
      if (instrument) {
        steps.push({
          index: steps.length,
          label: `Letter ${i + 1} — '${clean[i]}'`,
          inputState: `${p} + ${k}`,
          outputState: String(c),
          highlight: [i],
          note: `Square value of '${clean[i]}' (${p}) plus key stream digit (${k}) = ${c}. Plain addition, no mod-26 reduction.`,
        })
      }
    }
    output = outNums.join(' ')
  } else {
    const nums = input.trim().split(/\s+/).map((n) => parseInt(n, 10))
    if (nums.some((n) => Number.isNaN(n))) {
      throw new CipherError('INVALID_INPUT', 'Nihilist ciphertext must be space-separated numbers.')
    }
    let out = ''
    for (let i = 0; i < nums.length; i++) {
      const c = nums[i]
      const k = keyStream[i % keyStream.length]
      const p = c - k
      const ch = charOfNum(square, p)
      out += ch
      if (instrument) {
        steps.push({
          index: steps.length,
          label: `Number ${i + 1} — ${c}`,
          inputState: `${c} - ${k}`,
          outputState: ch,
          highlight: [i],
          note: `Subtracted key stream digit (${k}) from ciphertext number (${c}) = ${p}, mapped back through the square to '${ch}'.`,
        })
      }
    }
    output = out
  }

  if (instrument) {
    steps.push({
      index: steps.length,
      label: encrypting ? 'Ciphertext' : 'Plaintext',
      inputState: encrypting ? cleanText(input) : input,
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

export function encrypt(input: string, key: string, options: CipherOptions = {}): CipherResult {
  validateInput(input)
  return nihilistTransform(input, key, true, !!options.instrument)
}

export function decrypt(input: string, key: string, options: CipherOptions = {}): CipherResult {
  validateInput(input)
  return nihilistTransform(input, key, false, !!options.instrument)
}

export const TEST_VECTORS: TestVector[] = [
  {
    input: 'HELP',
    key: ',KEY',
    expected: '48 30 85 60',
    description:
      'Self-verified: standard alphabet square (no square keyword), numeric keyword "KEY". Hand-traced coordinate lookups and additions.',
  },
]
