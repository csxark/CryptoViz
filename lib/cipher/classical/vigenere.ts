/**
 * Vigenère Cipher — polyalphabetic substitution.
 * @see CIPHER_ENGINE.md section 1.3
 *
 * Key is repeated to match plaintext length (key stream).
 * Encrypt: C(i) = (P(i) + K(i mod |key|)) mod 26
 * Decrypt: P(i) = (C(i) - K(i mod |key|) + 26) mod 26
 */

import type { CipherResult, CipherStep, CipherOptions, TestVector } from '../types'
import { CipherError } from '../../utils/errors'
import { normalizeAsciiText, validateRequiredInput } from '../../utils/cipherValidation'
import { validateKey } from '../../utils/errors'

const METADATA = {
  name: 'Vigenère Cipher',
  securityStatus: 'broken' as const,
  breakingComplexity: 'Kasiski examination + frequency analysis',
  yearDesigned: 1553,
}

function validateVigenereKey(key: string): string {
  const cleaned = normalizeAsciiText(key, { uppercase: true, stripNonAlpha: true })
  if (cleaned.length === 0) {
    throw new CipherError('INVALID_KEY', 'Vigenère key must contain at least one letter (A-Z).')
  }
  return cleaned
}

function charToHex(char: string): string {
  return '0x' + char.charCodeAt(0).toString(16).padStart(2, '0')
}

function vigenereInstrumented(
  input: string,
  key: string,
  decrypt: boolean
): CipherResult {
  const start = performance.now()
  const cleanKey = validateVigenereKey(key)

  const steps: CipherStep[] = []

  // Build key stream
  let keyStream = ''
  let keyIdx = 0
  for (let i = 0; i < input.length; i++) {
    if (/[a-zA-Z]/.test(input[i])) {
      keyStream += cleanKey[keyIdx % cleanKey.length]
      keyIdx++
    } else {
      keyStream += ' '
    }
  }

  // Step 0: Key setup (milestone)
  steps.push({
    index: 0,
    label: 'Key setup',
    inputState: `KEY: "${key}"`,
    outputState: `CLEAN KEY: "${cleanKey}"`,
    note: `Key "${cleanKey}" will be repeated to match input length.`,
    isMilestone: true,
  })

  // Step 1: Key stream display
  steps.push({
    index: 1,
    label: 'Key stream generation',
    inputState: cleanKey,
    outputState: keyStream.replace(/ /g, '·'),
    note: `Key stream aligned to alphabetic positions: "${keyStream.replace(/ /g, '·')}"`,
  })

  // Steps 2..n+1: Per character
  let output = ''
  keyIdx = 0
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
    keyIdx++

    let resultIdx: number
    if (decrypt) {
      resultIdx = (p - k + 26) % 26
    } else {
      resultIdx = (p + k) % 26
    }

    const resultChar = String.fromCharCode(resultIdx + base)
    output += resultChar

    steps.push({
      index: steps.length,
      label: `Character ${i + 1} — '${char}'`,
      inputState: charToHex(char),
      outputState: charToHex(resultChar),
      highlight: [i],
      note: `'${char}' (${p}) ${decrypt ? '-' : '+'} '${cleanKey[(keyIdx - 1) % cleanKey.length]}' (${k}) = ${resultIdx} = '${resultChar}' (mod 26)`,
    })
  }

  // Final step: alignment table (milestone)
  const plainChars = input.split('')
  const keyChars = keyStream.split('').map((c) => (c === ' ' ? '·' : c))
  const outChars = output.split('')

  steps.push({
    index: steps.length,
    label: 'Vigenère table alignment',
    inputState: input,
    outputState: output,
    matrix: [
      ['P:', ...plainChars],
      ['K:', ...keyChars],
      ['C:', ...outChars],
    ],
    note: 'Each column shows the letter-to-letter transformation.',
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

function vigenereFast(
  input: string,
  key: string,
  decrypt: boolean
): CipherResult {
  const start = performance.now()
  const cleanKey = validateVigenereKey(key)

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

    const resultIdx = decrypt ? (p - k + 26) % 26 : (p + k) % 26
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

export function encrypt(
  input: string,
  key: string,
  options: CipherOptions = {}
): CipherResult {
  validateRequiredInput(input)
  validateKey(key)
  if (options.instrument) return vigenereInstrumented(input, key, false)
  return vigenereFast(input, key, false)
}

export function decrypt(
  input: string,
  key: string,
  options: CipherOptions = {}
): CipherResult {
  validateRequiredInput(input)
  validateKey(key)
  if (options.instrument) return vigenereInstrumented(input, key, true)
  return vigenereFast(input, key, true)
}

export const TEST_VECTORS: TestVector[] = [
  { input: 'ATTACKATDAWN', key: 'LEMON', expected: 'LXFOPVEFRNHR' },
  { input: 'HELLO', key: 'KEY', expected: 'RIJVS' },
]
