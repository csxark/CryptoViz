/**
 * Rail Fence Cipher — transposition cipher using a zigzag pattern.
 * @see CIPHER_ENGINE.md section 1.5
 */

import type { CipherResult, CipherStep, CipherOptions, TestVector } from '../types'
import { CipherError, validateInput, validateKey } from '../../utils'

const METADATA = {
  name: 'Rail Fence Cipher',
  securityStatus: 'broken' as const,
  breakingComplexity: 'Factoring text length, brute forcing rail count (usually < 20)',
  yearDesigned: -100, // Ancient Greek scytale / historical
}

function validateRailsKey(key: string, _inputLength: number, options: CipherOptions = {}): number {
  const rawValue = options.rails !== undefined ? String(options.rails) : key
  const rails = Number(rawValue)
  if (isNaN(rails) || !Number.isInteger(rails) || rails < 2) {
    throw new CipherError('INVALID_KEY', 'Rail Fence key must be an integer >= 2.')
  }
  return rails
}

function getRailPattern(length: number, rails: number): number[] {
  const pattern: number[] = []
  if (rails <= 1) {
    return new Array(length).fill(0)
  }
  let rail = 0
  let direction = 1
  for (let i = 0; i < length; i++) {
    pattern.push(rail)
    if (rail === 0) {
      direction = 1
    } else if (rail === rails - 1) {
      direction = -1
    }
    rail += direction
  }
  return pattern
}

function railfenceInstrumented(
  input: string,
  key: string,
  decrypt: boolean,
  options: CipherOptions = {}
): CipherResult {
  const start = performance.now()
  const rails = validateRailsKey(key, input.length, options)

  const steps: CipherStep[] = []
  const pattern = getRailPattern(input.length, rails)

  // Step 0: setup
  steps.push({
    index: 0,
    label: 'Key setup',
    inputState: `INPUT LENGTH: ${input.length}`,
    outputState: `RAILS: ${rails}`,
    note: `Constructing a zigzag rail pattern across ${rails} rails.`,
    isMilestone: true,
  })

  // Construct rail grid visualization (N rows, each row has chars or dots)
  const railGrid: string[][] = Array.from({ length: rails }, () =>
    new Array(input.length).fill('.')
  )

  let output = ''

  if (!decrypt) {
    // Write plaintext in zigzag
    for (let i = 0; i < input.length; i++) {
      railGrid[pattern[i]][i] = input[i]
    }

    steps.push({
      index: 1,
      label: 'Rail layout visualization',
      inputState: input,
      outputState: railGrid.map((row) => row.join('')).join('\n'),
      matrix: railGrid,
      note: `Plaintext written in a zigzag pattern across ${rails} rails.`,
      isMilestone: true,
    })

    // Read off each rail
    for (let r = 0; r < rails; r++) {
      const indicesOnRail: number[] = []
      let railContent = ''
      for (let i = 0; i < input.length; i++) {
        if (pattern[i] === r) {
          indicesOnRail.push(i)
          railContent += input[i]
        }
      }
      output += railContent

      steps.push({
        index: steps.length,
        label: `Reading rail ${r}`,
        inputState: input,
        outputState: output,
        highlight: indicesOnRail,
        note: `Rail ${r} contains: "${railContent}"`,
      })
    }
  } else {
    // Decrypting
    // We need to reconstruct the zigzag grid with the ciphertext characters in their proper rail positions.
    // First, find how many characters are on each rail
    const railSizes = new Array(rails).fill(0)
    for (let i = 0; i < input.length; i++) {
      railSizes[pattern[i]]++
    }

    // Distribute ciphertext characters to the rails
    const railStrings: string[] = []
    let curr = 0
    for (let r = 0; r < rails; r++) {
      railStrings.push(input.slice(curr, curr + railSizes[r]))
      curr += railSizes[r]
    }

    // Reconstruct the zigzag grid and read off column by column
    const railPtrs = new Array(rails).fill(0)
    const outChars: string[] = []

    // Populate grid for visualization
    for (let i = 0; i < input.length; i++) {
      const r = pattern[i]
      const char = railStrings[r][railPtrs[r]++]
      railGrid[r][i] = char
      outChars.push(char)
    }

    output = outChars.join('')

    steps.push({
      index: 1,
      label: 'Reconstructing rail layout',
      inputState: input,
      outputState: railGrid.map((row) => row.join('')).join('\n'),
      matrix: railGrid,
      note: `Ciphertext characters distributed back to their respective rails according to the zigzag pattern.`,
      isMilestone: true,
    })

    // Read off zigzag
    for (let i = 0; i < input.length; i++) {
      const r = pattern[i]
      steps.push({
        index: steps.length,
        label: `Read character ${i + 1} — '${output[i]}'`,
        inputState: input,
        outputState: output.slice(0, i + 1),
        highlight: [i],
        note: `Reading from rail ${r}, column ${i}: '${output[i]}'`,
      })
    }
  }

  // Final milestone
  steps.push({
    index: steps.length,
    label: 'Final Result',
    inputState: input,
    outputState: output,
    note: `Rail Fence transposition complete.`,
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

function railfenceFast(
  input: string,
  key: string,
  decrypt: boolean,
  options: CipherOptions = {}
): CipherResult {
  const start = performance.now()
  const rails = validateRailsKey(key, input.length, options)
  const pattern = getRailPattern(input.length, rails)

  let output = ''

  if (!decrypt) {
    const railBuckets = Array.from({ length: rails }, () => '')
    for (let i = 0; i < input.length; i++) {
      railBuckets[pattern[i]] += input[i]
    }
    output = railBuckets.join('')
  } else {
    const railSizes = new Array(rails).fill(0)
    for (let i = 0; i < input.length; i++) {
      railSizes[pattern[i]]++
    }

    const railStrings: string[] = []
    let curr = 0
    for (let r = 0; r < rails; r++) {
      railStrings.push(input.slice(curr, curr + railSizes[r]))
      curr += railSizes[r]
    }

    const railPtrs = new Array(rails).fill(0)
    const outChars: string[] = []
    for (let i = 0; i < input.length; i++) {
      const r = pattern[i]
      outChars.push(railStrings[r][railPtrs[r]++])
    }
    output = outChars.join('')
  }

  return {
    output,
    outputEncoding: 'utf8',
    steps: [],
    metadata: METADATA,
    durationMs: performance.now() - start,
  }
}

/**
 * Encrypt cipher-engine utility export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/46-3/final — FIPS 46-3.
 */
export function encrypt(
  input: string,
  key: string,
  options: CipherOptions = {}
): CipherResult {
  validateInput(input)
  validateKey(key)
  if (options.instrument) return railfenceInstrumented(input, key, false, options)
  return railfenceFast(input, key, false, options)
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
  key: string,
  options: CipherOptions = {}
): CipherResult {
  validateInput(input)
  validateKey(key)
  if (options.instrument) return railfenceInstrumented(input, key, true, options)
  return railfenceFast(input, key, true, options)
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
  // This example uses the 26-character input WEAREDISCOVEREDFLEEAATONCE.
  // Some sources cite a 25-character variant (omitting the trailing E), which produces a different
  // ciphertext. This vector uses the full 26-character form and has been verified against
  // encryptFast. The encrypt->decrypt round-trip is confirmed correct.
  {
    input: 'WEAREDISCOVEREDFLEEAATONCE',
    key: '3',
    expected: 'WECRLACERDSOEEFEATNEAIVDEO',
  },
  // Unambiguous short vector - trivially verifiable by hand with 2 rails:
  //   Rail 0 (positions 0,2,4,6,8):   H L O O L  ->  HLOOL
  //   Rail 1 (positions 1,3,5,7,9):   E L W R D  ->  ELWRD
  //   Ciphertext: HLOOLELWRD
  {
    input: 'HELLOWORLD',
    key: '2',
    expected: 'HLOOLELWRD',
  },
  // Unambiguous short vector - trivially verifiable by hand with 3 rails:
  //   Rail 0 (positions 0,4,8):         A C D        ->  ACD
  //   Rail 1 (positions 1,3,5,7,9,11):  T A K T A N  ->  TAKTAN
  //   Rail 2 (positions 2,6,10):        T A W        ->  TAW
  //   Ciphertext: ACDTAKTANTAW
  {
    input: 'ATTACKATDAWN',
    key: '3',
    expected: 'ACDTAKTANTAW',
  },
]
