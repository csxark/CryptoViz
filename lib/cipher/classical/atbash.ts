/**
 * Atbash Cipher — mirror alphabet.
 * @see CIPHER_ENGINE.md section 1.6
 *
 * Map: A↔Z, B↔Y, C↔X, ...
 * C(i) = 25 - P(i)
 * Self-inverse: Atbash(Atbash(x)) = x
 */

import type { CipherResult, CipherStep, CipherOptions, TestVector } from '../types'
import { validateInput } from '../../utils/errors'

const METADATA = {
  name: 'Atbash Cipher',
  securityStatus: 'broken' as const,
  breakingComplexity: 'Single fixed substitution — trivially reversible',
  yearDesigned: -500,
}

function transformChar(char: string): string {
  const code = char.charCodeAt(0)
  if (code >= 65 && code <= 90) {
    return String.fromCharCode(90 - (code - 65))
  }
  if (code >= 97 && code <= 122) {
    return String.fromCharCode(122 - (code - 97))
  }
  return char
}

function buildMirrorTable(): string[][] {
  const plain: string[] = []
  const cipher: string[] = []
  for (let i = 0; i < 26; i++) {
    plain.push(String.fromCharCode(65 + i))
    cipher.push(String.fromCharCode(90 - i))
  }
  return [plain, cipher]
}

function atbashInstrumented(input: string): CipherResult {
  const start = performance.now()

  const steps: CipherStep[] = []
  const mirrorTable = buildMirrorTable()

  // Single step cipher — show full alphabet mirror table
  steps.push({
    index: 0,
    label: 'Alphabet mirror table',
    inputState: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    outputState: 'ZYXWVUTSRQPONMLKJIHGFEDCBA',
    matrix: [
      ['Plain:', ...mirrorTable[0]],
      ['Cipher:', ...mirrorTable[1]],
    ],
    note: 'Each letter maps to its mirror position. A↔Z, B↔Y, C↔X, etc. Formula: C(i) = 25 - P(i)',
    isMilestone: true,
  })

  let output = ''
  for (let i = 0; i < input.length; i++) {
    const result = transformChar(input[i])
    output += result

    steps.push({
      index: i + 1,
      label: `Character ${i + 1} — '${input[i]}'`,
      inputState: input[i],
      outputState: result,
      highlight: [i],
      note: /[a-zA-Z]/.test(input[i])
        ? `'${input[i]}' → '${result}' (mirror position)`
        : `'${input[i]}' is non-alphabetic — passed through.`,
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

function atbashFast(input: string): CipherResult {
  const start = performance.now()
  let output = ''
  for (let i = 0; i < input.length; i++) {
    output += transformChar(input[i])
  }
  return {
    output,
    outputEncoding: 'utf8',
    steps: [],
    metadata: METADATA,
    durationMs: performance.now() - start,
  }
}

/** Atbash is self-inverse — encrypt and decrypt are identical. */
export function encrypt(
  input: string,
  _key: string = '',
  options: CipherOptions = {}
): CipherResult {
  validateInput(input)
  if (options.instrument) return atbashInstrumented(input)
  return atbashFast(input)
}

/**
 * Decrypt cipher-engine utility export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/46-3/final — FIPS 46-3.
 */
export function decrypt(
  input: string,
  key: string = '',
  options: CipherOptions = {}
): CipherResult {
  return encrypt(input, key, options)
}

/**
 * TEST VECTORS cipher-engine utility export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/46-3/final — FIPS 46-3.
 */
export const TEST_VECTORS: TestVector[] = [
  { input: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', key: '', expected: 'ZYXWVUTSRQPONMLKJIHGFEDCBA' },
  { input: 'HELLO', key: '', expected: 'SVOOL' },
  { input: 'hello', key: '', expected: 'svool' },
  { input: 'Hello, World!', key: '', expected: 'Svool, Dliow!' },
]
