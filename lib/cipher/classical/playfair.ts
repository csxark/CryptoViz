/**
 * Playfair Cipher — polygraphic substitution using a 5x5 grid.
 * @see CIPHER_ENGINE.md section 1.4
 */

import type { CipherResult, CipherStep, CipherOptions, TestVector } from '../types'
import { validateKey } from '../../utils/errors'
import { normalizeAsciiText, validateRequiredInput } from '../../utils/cipherValidation'

const METADATA = {
  name: 'Playfair Cipher',
  securityStatus: 'broken' as const,
  breakingComplexity: 'Frequency analysis of digraphs',
  yearDesigned: 1854,
}

// Generate the 5x5 Playfair grid from a key
export function generateGrid(key: string): { grid: string[][]; letterMap: Map<string, { r: number; c: number }> } {
  const cleanKey = normalizeAsciiText(key, { uppercase: true, stripNonAlpha: true }).replace(/J/g, 'I')
  const seen = new Set<string>()
  const flatGrid: string[] = []

  // Add key characters first
  for (const char of cleanKey) {
    if (!seen.has(char)) {
      seen.add(char)
      flatGrid.push(char)
    }
  }

  // Fill in the rest of the alphabet (omitting J)
  for (let code = 65; code <= 90; code++) {
    const char = String.fromCharCode(code)
    if (char === 'J') continue
    if (!seen.has(char)) {
      seen.add(char)
      flatGrid.push(char)
    }
  }

  // Construct the 5x5 grid
  const grid: string[][] = []
  const letterMap = new Map<string, { r: number; c: number }>()
  for (let r = 0; r < 5; r++) {
    const row: string[] = []
    for (let c = 0; c < 5; c++) {
      const char = flatGrid[r * 5 + c]
      row.push(char)
      letterMap.set(char, { r, c })
    }
    grid.push(row)
  }

  return { grid, letterMap }
}

// Prepares plaintext for Playfair encryption
export function preparePlaintext(input: string): string {
  const clean = input.toUpperCase().replace(/J/g, 'I').replace(/[^A-Z]/g, '')
  let prepared = ''
  let i = 0
  while (i < clean.length) {
    const char = clean[i]
    prepared += char
    if (i + 1 < clean.length) {
      if (clean[i + 1] === char) {
        const filler = char === 'X' ? 'Q' : 'X'
        prepared += filler
        i++
      } else {
        prepared += clean[i + 1]
        i += 2
      }
    } else {
      const filler = char === 'X' ? 'Q' : 'X'
      prepared += filler
      i++
    }
  }
  return prepared
}

// Prepares ciphertext for Playfair decryption
export function prepareCiphertext(input: string): string {
  return input.toUpperCase().replace(/J/g, 'I').replace(/[^A-Z]/g, '')
}

function playfairInstrumented(
  input: string,
  key: string,
  decrypt: boolean
): CipherResult {
  const start = performance.now()
  const { grid, letterMap } = generateGrid(key)

  const steps: CipherStep[] = []

  // Step 0: Grid construction
  steps.push({
    index: 0,
    label: 'Key square construction',
    inputState: `KEY: "${key}"`,
    outputState: grid.map((row) => row.join(' ')).join('\n'),
    matrix: grid,
    note: `5x5 grid built from key "${key}" with duplicates removed and J replaced by I.`,
    isMilestone: true,
  })

  // Prepare input text
  const prepared = decrypt ? prepareCiphertext(input) : preparePlaintext(input)
  steps.push({
    index: 1,
    label: decrypt ? 'Ciphertext preparation' : 'Plaintext preparation',
    inputState: input,
    outputState: prepared,
    note: decrypt
      ? `Input cleaned: non-alpha removed, J replaced by I: "${prepared}"`
      : `Input cleaned: non-alpha removed, J replaced by I, X inserted between duplicate letters in bigrams, and padded to even length: "${prepared}"`,
  })

  // Process bigrams
  let output = ''
  const bigramSteps: CipherStep[] = []

  for (let i = 0; i < prepared.length; i += 2) {
    const l1 = prepared[i]
    const l2 = prepared[i + 1]

    const pos1 = letterMap.get(l1)!
    const pos2 = letterMap.get(l2)!

    let r1 = pos1.r, c1 = pos1.c
    let r2 = pos2.r, c2 = pos2.c
    let rule = ''

    let n1 = '', n2 = ''

    if (r1 === r2) {
      // Same row
      rule = 'Same row'
      const shift = decrypt ? 4 : 1
      c1 = (c1 + shift) % 5
      c2 = (c2 + shift) % 5
      n1 = grid[r1][c1]
      n2 = grid[r2][c2]
    } else if (c1 === c2) {
      // Same column
      rule = 'Same column'
      const shift = decrypt ? 4 : 1
      r1 = (r1 + shift) % 5
      r2 = (r2 + shift) % 5
      n1 = grid[r1][c1]
      n2 = grid[r2][c2]
    } else {
      // Rectangle
      rule = 'Rectangle'
      n1 = grid[r1][c2]
      n2 = grid[r2][c1]
    }

    output += n1 + n2

    const highlightIdx1 = pos1.r * 5 + pos1.c
    const highlightIdx2 = pos2.r * 5 + pos2.c
    const highlightIdxNew1 = r1 * 5 + c1
    const highlightIdxNew2 = r2 * 5 + c2

    // Step 1 for this bigram: Lookup
    bigramSteps.push({
      index: steps.length + bigramSteps.length,
      label: `Bigram ${i / 2 + 1} — '${l1}${l2}' Lookup`,
      inputState: `${l1}${l2}`,
      outputState: `${l1}${l2}`,
      matrix: grid,
      highlight: [highlightIdx1, highlightIdx2],
      note: `Locating '${l1}' at (${pos1.r}, ${pos1.c}) and '${l2}' at (${pos2.r}, ${pos2.c}) in the grid.`,
    })

    // Step 2 for this bigram: Replace
    bigramSteps.push({
      index: steps.length + bigramSteps.length,
      label: `Bigram ${i / 2 + 1} — '${l1}${l2}' → '${n1}${n2}'`,
      inputState: `${l1}${l2}`,
      outputState: `${n1}${n2}`,
      matrix: grid,
      highlight: [highlightIdxNew1, highlightIdxNew2],
      note: `${rule} rule: '${l1}' (${pos1.r},${pos1.c}) and '${l2}' (${pos2.r},${pos2.c}) ${decrypt ? 'decrypted' : 'encrypted'} to '${n1}' (${r1},${c1}) and '${n2}' (${r2},${c2}).`,
    })
  }

  // Push bigram steps
  steps.push(...bigramSteps)

  // Final milestone
  steps.push({
    index: steps.length,
    label: 'Final Result',
    inputState: prepared,
    outputState: output,
    note: `Playfair ${decrypt ? 'decryption' : 'encryption'} complete. Output: ${output}`,
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

function playfairFast(
  input: string,
  key: string,
  decrypt: boolean
): CipherResult {
  const start = performance.now()
  const { grid, letterMap } = generateGrid(key)
  const prepared = decrypt ? prepareCiphertext(input) : preparePlaintext(input)

  let output = ''
  for (let i = 0; i < prepared.length; i += 2) {
    const l1 = prepared[i]
    const l2 = prepared[i + 1]

    const pos1 = letterMap.get(l1)!
    const pos2 = letterMap.get(l2)!

    let r1 = pos1.r, c1 = pos1.c
    let r2 = pos2.r, c2 = pos2.c

    if (r1 === r2) {
      const shift = decrypt ? 4 : 1
      c1 = (c1 + shift) % 5
      c2 = (c2 + shift) % 5
      output += grid[r1][c1] + grid[r2][c2]
    } else if (c1 === c2) {
      const shift = decrypt ? 4 : 1
      r1 = (r1 + shift) % 5
      r2 = (r2 + shift) % 5
      output += grid[r1][c1] + grid[r2][c2]
    } else {
      output += grid[r1][c2] + grid[r2][c1]
    }
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
  if (options.instrument) return playfairInstrumented(input, key, false)
  return playfairFast(input, key, false)
}

export function decrypt(
  input: string,
  key: string,
  options: CipherOptions = {}
): CipherResult {
  validateRequiredInput(input)
  validateKey(key)
  if (options.instrument) return playfairInstrumented(input, key, true)
  return playfairFast(input, key, true)
}

export const TEST_VECTORS: TestVector[] = [
  {
    input: 'HIDETHEGOLDINTHETREXESTUMP',
    key: 'PLAYFAIR EXAMPLE',
    expected: 'BMODZBXDNABEKUDMUIXMMOUVIF',
    description: 'Classic Playfair example (Digraph cipher)',
  },
]
