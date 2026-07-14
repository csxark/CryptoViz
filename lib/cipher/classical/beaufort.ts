/**
 * Beaufort Cipher — polyalphabetic substitution, reverse of Vigenère.
 * @see CIPHER_ENGINE.md section 1.3 (Vigenère family)
 *
 * Key is repeated to match plaintext length (key stream), same as Vigenère.
 * Formula (self-inverse — used for BOTH encrypt and decrypt):
 *   C(i) = (K(i mod |key|) - P(i)) mod 26
 */

import type { CipherResult, CipherStep, CipherOptions, TestVector } from '../types'
import { CipherError, validateInput, validateKey } from '../../utils/errors'

const METADATA = {
  name: 'Beaufort Cipher',
  securityStatus: 'broken' as const,
  breakingComplexity: 'Kasiski examination + frequency analysis (identical to Vigenère)',
  yearDesigned: 1857,
}

function validateBeaufortKey(key: string): string {
  const cleaned = key.toUpperCase().replace(/[^A-Z]/g, '')
  if (cleaned.length === 0) {
    throw new CipherError('INVALID_KEY', 'Beaufort key must contain at least one letter (A-Z).')
  }
  return cleaned
}

function charToHex(char: string): string {
  return '0x' + char.charCodeAt(0).toString(16).padStart(2, '0')
}

function beaufortInstrumented(input: string, key: string): CipherResult {
  const start = performance.now()
  const cleanKey = validateBeaufortKey(key)

  const steps: CipherStep[] = []

  steps.push({
    index: 0,
    label: 'Key setup',
    inputState: `KEY: "${key}"`,
    outputState: `CLEAN KEY: "${cleanKey}"`,
    note: `Key "${cleanKey}" will be repeated to match input length. Beaufort is self-inverse: this same operation decrypts too.`,
    isMilestone: true,
  })

  let output = ''
  let keyIdx = 0

  for (let i = 0; i < input.length; i++) {
    const char = input[i]
    const isAlpha = /[a-zA-Z]/.test(char)
    const isUpper = char >= 'A' && char <= 'Z'
    const base = isUpper ? 65 : 97

    if (!isAlpha) {
      output += char
      steps.push({
        index: steps.length,
        label: `Character ${i + 1} — '${char}'`,
        inputState: charToHex(char),
        outputState: charToHex(char),
        highlight: [i],
        note: `'${char}' is non-alphabetic — passed through unchanged.`,
      })
      continue
    }

    const p = char.toUpperCase().charCodeAt(0) - 65
    const k = cleanKey.charCodeAt(keyIdx % cleanKey.length) - 65
    const resultIdx = (k - p + 26) % 26
    keyIdx++

    const resultChar = String.fromCharCode(resultIdx + base)
    output += resultChar

    steps.push({
      index: steps.length,
      label: `Character ${i + 1} — '${char}'`,
      inputState: charToHex(char),
      outputState: charToHex(resultChar),
      highlight: [i],
      note: `'${cleanKey[(keyIdx - 1) % cleanKey.length]}' (${k}) - '${char}' (${p}) = ${resultIdx} = '${resultChar}' (mod 26)`,
    })
  }

  steps.push({
    index: steps.length,
    label: 'Self-inverse check',
    inputState: input,
    outputState: output,
    note: 'Running this identical formula on the output with the same key recovers the original input.',
    isMilestone: true,
  })

  return {
    output,
    outputEncoding: 'utf8',
    steps,
    metadata: METADATA,
    durationMs: performance.now() - start,
  }
}

function beaufortFast(input: string, key: string): CipherResult {
  const start = performance.now()
  const cleanKey = validateBeaufortKey(key)

  let output = ''
  let keyIdx = 0

  for (let i = 0; i < input.length; i++) {
    const char = input[i]
    const isUpper = char >= 'A' && char <= 'Z'
    const isLower = char >= 'a' && char <= 'z'

    if (!isUpper && !isLower) {
      output += char
      continue
    }

    const base = isUpper ? 65 : 97
    const p = char.toUpperCase().charCodeAt(0) - 65
    const k = cleanKey.charCodeAt(keyIdx % cleanKey.length) - 65
    keyIdx++

    const resultIdx = (k - p + 26) % 26
    output += String.fromCharCode(resultIdx + base)
  }

  return {
    output,
    outputEncoding: 'utf8',
    steps: [],
    metadata: METADATA,
    durationMs: performance.now() - start,
  }
}

// Beaufort is self-inverse: encrypt and decrypt run the identical formula.
export function encrypt(
  input: string,
  key: string,
  options: CipherOptions = {}
): CipherResult {
  validateInput(input)
  validateKey(key)
  if (options.instrument) return beaufortInstrumented(input, key)
  return beaufortFast(input, key)
}

export function decrypt(
  input: string,
  key: string,
  options: CipherOptions = {}
): CipherResult {
  validateInput(input)
  validateKey(key)
  if (options.instrument) return beaufortInstrumented(input, key)
  return beaufortFast(input, key)
}

export const TEST_VECTORS: TestVector[] = [
  { input: 'HELLO', key: 'KEY', expected: 'DANZQ' },
  { input: 'ATTACKATDAWN', key: 'LEMON', expected: 'LLTOLBETLNPR' },
]
