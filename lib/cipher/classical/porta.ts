/**
 * Porta Cipher — Giovanni Battista della Porta's 1563 reciprocal
 * polyalphabetic cipher, one of the earliest self-inverse ciphers.
 * @see CIPHER_ENGINE.md section 1.x (Vigenère family)
 *
 * The alphabet is split into two 13-letter halves, F = A-M and S = N-Z.
 * Each key letter selects one of 13 tableau rows (pairs A/B, C/D, ... Y/Z
 * all select the same row). Within a row, F[i] and S[(i + row) mod 13] are
 * swapped — a symmetric pairing, so running the identical procedure twice
 * with the same key recovers the original text. Unlike Vigenère (simple
 * mod-26 shift) or Beaufort (reversed subtraction), Porta swaps between
 * two alphabet halves entirely, which is what makes it self-inverse.
 */

import type { CipherResult, CipherStep, CipherMetadata, CipherOptions, TestVector } from '../types'
import { CipherError, validateInput, validateKey } from '../../utils/errors'

const METADATA: CipherMetadata = {
  name: 'Porta Cipher',
  securityStatus: 'broken',
  breakingComplexity:
    "Only 13 distinct tableau rows exist (vs. Vigenère's 26), shrinking the effective key space and making Kasiski + frequency analysis faster than against Vigenère.",
  yearDesigned: 1563,
}

const F = 'ABCDEFGHIJKLM'
const S = 'NOPQRSTUVWXYZ'

function rowFor(keyChar: string): number {
  const idx = keyChar.charCodeAt(0) - 65 // A=0..Z=25
  return Math.floor(idx / 2) // A,B->0  C,D->1  ...  Y,Z->12
}

function cleanKey(key: string): string {
  const cleaned = key.toUpperCase().replace(/[^A-Z]/g, '')
  if (cleaned.length === 0) {
    throw new CipherError('INVALID_KEY', 'Porta key must contain at least one letter (A-Z).')
  }
  return cleaned
}

// Porta is reciprocal: the identical swap runs both encrypt and decrypt.
function portaTransform(input: string, key: string, instrument: boolean): CipherResult {
  const start = performance.now()
  const cleanedKey = cleanKey(key)
  const steps: CipherStep[] = []

  if (instrument) {
    steps.push({
      index: 0,
      label: 'Key setup',
      inputState: key,
      outputState: cleanedKey,
      note: 'Porta is self-inverse — this identical row-swap procedure both encrypts and decrypts.',
      isMilestone: true,
    })
  }

  let output = ''
  let keyIdx = 0

  for (let i = 0; i < input.length; i++) {
    const char = input[i]
    const isUpper = char >= 'A' && char <= 'Z'
    const isLower = char >= 'a' && char <= 'z'

    if (!isUpper && !isLower) {
      output += char
      if (instrument) {
        steps.push({
          index: steps.length,
          label: `Character ${i + 1} — '${char}'`,
          inputState: char,
          outputState: char,
          highlight: [i],
          note: `'${char}' is non-alphabetic — passed through unchanged.`,
        })
      }
      continue
    }

    const upperChar = char.toUpperCase()
    const row = rowFor(cleanedKey[keyIdx % cleanedKey.length])
    let resultChar: string

    if (F.includes(upperChar)) {
      const fi = F.indexOf(upperChar)
      resultChar = S[(fi + row) % 13]
    } else {
      const si = S.indexOf(upperChar)
      resultChar = F[((si - row) % 13 + 13) % 13]
    }
    if (isLower) resultChar = resultChar.toLowerCase()
    output += resultChar

    if (instrument) {
      steps.push({
        index: steps.length,
        label: `Character ${i + 1} — '${char}'`,
        inputState: char,
        outputState: resultChar,
        highlight: [i],
        note: `Key letter '${cleanedKey[keyIdx % cleanedKey.length]}' selects tableau row ${row}. Swapped '${upperChar}' between the F(A-M)/S(N-Z) halves.`,
      })
    }
    keyIdx++
  }

  if (instrument) {
    steps.push({
      index: steps.length,
      label: 'Result',
      inputState: input,
      outputState: output,
      note: 'Running this identical procedure on the output with the same key recovers the original input.',
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
  validateKey(key)
  return portaTransform(input, key, !!options.instrument)
}

export function decrypt(input: string, key: string, options: CipherOptions = {}): CipherResult {
  validateInput(input)
  validateKey(key)
  return portaTransform(input, key, !!options.instrument)
}

export const TEST_VECTORS: TestVector[] = [
  {
    input: 'HELP',
    key: 'KEY',
    expected: 'ZTXK',
    description:
      'Self-verified by hand: F=A-M, S=N-Z, key K/E/Y select rows 5/2/12. encrypt(HELP,KEY)=ZTXK and decrypt(ZTXK,KEY)=HELP confirmed reciprocal.',
  },
]
