/**
 * Caesar Cipher — shift cipher
 * @see CIPHER_ENGINE.md section 1.1
 *
 * Encrypt: C(i) = (P(i) + k) mod 26
 * Decrypt: P(i) = (C(i) - k + 26) mod 26
 * Non-alphabetic characters pass through unchanged.
 */

import type { CipherResult, CipherStep, CipherOptions, TestVector } from '../types'
import { CipherError, validateInput } from '../../utils/errors'

const METADATA = {
  name: 'Caesar Cipher',
  securityStatus: 'broken' as const,
  breakingComplexity: '26 possible keys (brute force)',
  yearDesigned: -50,
}

function validateCaesarKey(key: string): number {
  const shift = parseInt(key, 10)
  if (isNaN(shift)) {
    throw new CipherError('INVALID_KEY', `Caesar key must be an integer (got "${key}").`)
  }
  return ((shift % 26) + 26) % 26
}

function charToHex(char: string): string {
  return '0x' + char.charCodeAt(0).toString(16).padStart(2, '0')
}

function transformChar(char: string, shift: number, decrypt: boolean): string {
  const code = char.charCodeAt(0)
  const effectiveShift = decrypt ? (26 - shift) % 26 : shift

  if (code >= 65 && code <= 90) {
    return String.fromCharCode(((code - 65 + effectiveShift) % 26) + 65)
  }
  if (code >= 97 && code <= 122) {
    return String.fromCharCode(((code - 97 + effectiveShift) % 26) + 97)
  }
  return char
}

function caesarInstrumented(
  input: string,
  key: string,
  decrypt: boolean,
  options: CipherOptions
): CipherResult {
  const start = performance.now()
  const shift = validateCaesarKey(key)

  const steps: CipherStep[] = []
  const direction = decrypt ? 'backward' : 'forward'
  let output = ''
  let startIdx = 0

  if (options.incrementalCache && input.startsWith(options.incrementalCache.input)) {
    startIdx = options.incrementalCache.input.length
    output = options.incrementalCache.result.output
    steps.push(...options.incrementalCache.result.steps)
  } else {
    // Step 0: Key setup (milestone)
    steps.push({
      index: 0,
      label: 'Key setup',
      inputState: `KEY: ${key}`,
      outputState: `SHIFT: ${decrypt ? '-' : '+'}${shift}`,
      note: `Each letter will be shifted ${shift} positions ${direction} in the alphabet.${shift === 13 ? ' (This is ROT13 — self-inverse.)' : ''}`,
      isMilestone: true,
    })
  }

  // Steps 1..n: one per character
  for (let i = startIdx; i < input.length; i++) {
    const char = input[i]
    const result = transformChar(char, shift, decrypt)
    output += result

    const isAlpha = /[a-zA-Z]/.test(char)
    const p = char.toUpperCase().charCodeAt(0) - 65
    const _r = result.toUpperCase().charCodeAt(0) - 65

    steps.push({
      index: i + 1,
      label: `Character ${i + 1} — '${char}'`,
      inputState: charToHex(char),
      outputState: charToHex(result),
      highlight: [i],
      note: isAlpha
        ? `'${char}' (index ${p}) ${decrypt ? '-' : '+'} shift ${shift} = ${decrypt ? (p - shift + 26) % 26 : (p + shift) % 26} = '${result}' (mod 26)`
        : `'${char}' is non-alphabetic — passed through unchanged.`,
    })
  }

  return {
    output,
    outputEncoding: 'utf8',
    steps,
    metadata: { ...METADATA, rounds: shift },
    durationMs: performance.now() - start,
  }
}

function caesarFast(input: string, key: string, decrypt: boolean, options: CipherOptions): CipherResult {
  const start = performance.now()
  const shift = validateCaesarKey(key)

  let output = ''
  let startIdx = 0

  if (options.incrementalCache && input.startsWith(options.incrementalCache.input)) {
    startIdx = options.incrementalCache.input.length
    output = options.incrementalCache.result.output
  }

  for (let i = startIdx; i < input.length; i++) {
    output += transformChar(input[i], shift, decrypt)
  }

  return {
    output,
    outputEncoding: 'utf8',
    steps: [],
    metadata: { ...METADATA, rounds: shift },
    durationMs: performance.now() - start,
  }
}

export function encrypt(
  input: string,
  key: string,
  options: CipherOptions = {}
): CipherResult {
  validateInput(input)
  if (options.instrument) return caesarInstrumented(input, key, false, options)
  return caesarFast(input, key, false, options)
}

export function decrypt(
  input: string,
  key: string,
  options: CipherOptions = {}
): CipherResult {
  validateInput(input)
  if (options.instrument) return caesarInstrumented(input, key, true, options)
  return caesarFast(input, key, true, options)
}

export const TEST_VECTORS: TestVector[] = [
  { input: 'HELLO WORLD', key: '3', expected: 'KHOOR ZRUOG' },
  { input: 'ATTACK AT DAWN', key: '13', expected: 'NGGNPX NG QNJA' },
  { input: 'xyz', key: '3', expected: 'abc' },
  { input: 'Hello, World!', key: '1', expected: 'Ifmmp, Xpsme!' },
]
