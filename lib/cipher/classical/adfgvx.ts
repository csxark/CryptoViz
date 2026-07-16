/**
 * ADFGVX Cipher — WWI-era German field cipher (1918).
 * @see CIPHER_ENGINE.md section "ADFGVX Cipher"
 *
 * Stage 1 (substitution): a 6x6 Polybius square holding A-Z0-9, keyed by a keyword.
 *   Rows and columns are labeled A/D/F/G/V/X (chosen for Morse-code distinctness).
 *   Each plaintext character maps to its (row-label, column-label) pair.
 * Stage 2 (transposition): the resulting letter-pair stream is written into a grid
 *   with column count = length of a second keyword, then read out column-by-column
 *   in the alphabetical order of that keyword's letters.
 *
 * Key format: "gridKey,transpositionKey" — two comma-separated keywords, matching the
 * multi-value key convention already used by dh.ts ("p,g") and elgamal.ts ("p,g,y").
 */

import { CipherError, validateInput, validateKey } from '../../utils/errors'
import type { CipherResult, CipherStep, CipherMetadata, CipherOptions, TestVector } from '../types'

const METADATA: CipherMetadata = {
  name: 'ADFGVX Cipher',
  securityStatus: 'broken',
  breakingComplexity:
    'Broken by French cryptanalyst Georges Painvin in ~2 days (June 1918) via anagramming attacks on the transposition layer once enough ciphertext was collected.',
  yearDesigned: 1918,
}

const LABELS = ['A', 'D', 'F', 'G', 'V', 'X'] as const
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
const FULL_TRACE_LIMIT = 100 // classical "full trace under 100 chars" budget
const SUMMARY_STEP_CAP = 50 // classical "max 50 steps" summary budget

interface Grid {
  cells: string[][]
  toPair: Map<string, string>
  fromPair: Map<string, string>
}

function parseKeyPair(key: string): { gridKey: string; transKey: string } {
  validateKey(key)
  const parts = key.split(',').map((s) => s.trim())
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    throw new CipherError(
      'INVALID_KEY',
      `ADFGVX key must be "gridKey,transpositionKey" (got "${key}"). Example: "PICTURE,GERMAN".`
    )
  }
  return { gridKey: parts[0], transKey: parts[1] }
}

function buildGrid(gridKey: string): Grid {
  const cleanKey = gridKey.toUpperCase().replace(/[^A-Z0-9]/g, '')
  const seen = new Set<string>()
  let ordered = ''
  for (const ch of cleanKey) {
    if (!seen.has(ch)) {
      seen.add(ch)
      ordered += ch
    }
  }
  for (const ch of ALPHABET) {
    if (!seen.has(ch)) {
      seen.add(ch)
      ordered += ch
    }
  }
  const cells: string[][] = []
  for (let r = 0; r < 6; r++) cells.push(ordered.slice(r * 6, r * 6 + 6).split(''))

  const toPair = new Map<string, string>()
  const fromPair = new Map<string, string>()
  for (let r = 0; r < 6; r++) {
    for (let c = 0; c < 6; c++) {
      const pair = LABELS[r] + LABELS[c]
      toPair.set(cells[r][c], pair)
      fromPair.set(pair, cells[r][c])
    }
  }
  return { cells, toPair, fromPair }
}

function gridToMatrix(grid: Grid): string[][] {
  const header = ['', ...LABELS]
  const rows = grid.cells.map((row, r) => [LABELS[r], ...row])
  return [header, ...rows]
}

function columnOrder(transKey: string): { letter: string; originalIndex: number }[] {
  const chars = transKey.toUpperCase().replace(/[^A-Z]/g, '').split('')
  if (chars.length === 0) {
    throw new CipherError('INVALID_KEY', 'Transposition keyword must contain at least one letter.')
  }
  return chars
    .map((letter, originalIndex) => ({ letter, originalIndex }))
    .sort((a, b) => (a.letter === b.letter ? a.originalIndex - b.originalIndex : a.letter.localeCompare(b.letter)))
}

function transpose(pairs: string, transKey: string): string {
  const order = columnOrder(transKey)
  const numCols = order.length
  const numRows = Math.ceil(pairs.length / numCols)
  const padded = pairs.padEnd(numRows * numCols, '\0')
  let out = ''
  for (const { originalIndex } of order) {
    for (let r = 0; r < numRows; r++) {
      const ch = padded[r * numCols + originalIndex]
      if (ch !== '\0') out += ch
    }
  }
  return out
}

function untranspose(cipherPairs: string, transKey: string): string {
  const order = columnOrder(transKey)
  const numCols = order.length
  const numRows = Math.ceil(cipherPairs.length / numCols)
  const numFullCols = cipherPairs.length - (numRows - 1) * numCols
  const grid: string[][] = Array.from({ length: numRows }, () => new Array(numCols).fill(''))
  let pos = 0
  for (const { originalIndex } of order) {
    const colLen = originalIndex < numFullCols ? numRows : numRows - 1
    for (let r = 0; r < colLen; r++) {
      grid[r][originalIndex] = cipherPairs[pos]
      pos++
    }
  }
  let out = ''
  for (let r = 0; r < numRows; r++) {
    for (let c = 0; c < numCols; c++) {
      if (grid[r][c]) out += grid[r][c]
    }
  }
  return out
}

function adfgvxCore(input: string, key: string, isDecrypt: boolean, instrument: boolean): CipherResult {
  const start = performance.now()
  const { gridKey, transKey } = parseKeyPair(key)
  const grid = buildGrid(gridKey)
  const steps: CipherStep[] = []

  if (instrument) {
    steps.push({
      index: 0,
      label: 'Build 6x6 Polybius square',
      inputState: gridKey.toUpperCase(),
      outputState: '',
      matrix: gridToMatrix(grid),
      note: `Keyed alphabet built from "${gridKey}" (unique letters first, then the rest of A-Z0-9). Rows/columns labeled A/D/F/G/V/X.`,
      isMilestone: true,
    })
  }

  let output: string
  if (!isDecrypt) {
    const clean = input.toUpperCase().replace(/[^A-Z0-9]/g, '')
    if (clean.length === 0) {
      throw new CipherError('INVALID_INPUT', 'Input must contain at least one letter or digit (A-Z, 0-9).')
    }
    const fullTrace = clean.length < FULL_TRACE_LIMIT
    let pairs = ''
    for (let i = 0; i < clean.length; i++) {
      const pair = grid.toPair.get(clean[i])!
      pairs += pair
      if (instrument && (fullTrace || steps.length < SUMMARY_STEP_CAP)) {
        steps.push({
          index: steps.length,
          label: `Substitute '${clean[i]}' -> '${pair}'`,
          inputState: clean[i],
          outputState: pair,
          highlight: [i],
          note: `Looked up '${clean[i]}' in the grid: row label + column label = '${pair}'.`,
        })
      }
    }
    if (instrument && !fullTrace && clean.length >= SUMMARY_STEP_CAP) {
      steps.push({
        index: steps.length,
        label: `Remaining substitutions (summarized)`,
        inputState: '',
        outputState: '',
        note: `Input is ${clean.length} characters — substitution trace capped at ${SUMMARY_STEP_CAP} steps.`,
        isMilestone: true,
      })
    }
    output = transpose(pairs, transKey)
    if (instrument) {
      steps.push({
        index: steps.length,
        label: 'Columnar transposition',
        inputState: pairs,
        outputState: output,
        table: columnOrder(transKey).map((o) => ({ key: `col ${o.originalIndex} ('${o.letter}')`, value: `read order rank` })),
        note: `Wrote the ${pairs.length}-letter pair stream into a ${transKey.toUpperCase().replace(/[^A-Z]/g, '').length}-column grid keyed by "${transKey}", then read columns out in alphabetical order of the keyword's letters.`,
        isMilestone: true,
      })
    }
  } else {
    const cleanCipher = input.toUpperCase().replace(/[^ADFGVX]/g, '')
    if (cleanCipher.length === 0 || cleanCipher.length % 2 !== 0) {
      throw new CipherError(
        'INVALID_INPUT',
        'ADFGVX ciphertext must contain only the letters A, D, F, G, V, X and have an even length.'
      )
    }
    const pairs = untranspose(cleanCipher, transKey)
    if (instrument) {
      steps.push({
        index: steps.length,
        label: 'Reverse columnar transposition',
        inputState: cleanCipher,
        outputState: pairs,
        note: `Rebuilt the transposition grid keyed by "${transKey}" and read it back out row-by-row to recover the pair stream.`,
        isMilestone: true,
      })
    }
    let plain = ''
    const fullTrace = pairs.length / 2 < FULL_TRACE_LIMIT
    for (let i = 0; i < pairs.length; i += 2) {
      const pair = pairs.slice(i, i + 2)
      const ch = grid.fromPair.get(pair)
      if (!ch) {
        throw new CipherError('INVALID_INPUT', `"${pair}" is not a valid ADFGVX pair for this grid.`)
      }
      plain += ch
      if (instrument && (fullTrace || steps.length < SUMMARY_STEP_CAP)) {
        steps.push({
          index: steps.length,
          label: `Substitute '${pair}' -> '${ch}'`,
          inputState: pair,
          outputState: ch,
          highlight: [i / 2],
          note: `Looked up row/column labels '${pair}' in the grid: character = '${ch}'.`,
        })
      }
    }
    output = plain
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
  return adfgvxCore(input, key, false, !!options.instrument)
}

export function decrypt(input: string, key: string, options: CipherOptions = {}): CipherResult {
  validateInput(input)
  return adfgvxCore(input, key, true, !!options.instrument)
}

export const TEST_VECTORS: TestVector[] = [
  {
    input: 'ATTACKAT1200AM',
    key: 'PICTURE,GERMAN',
    expected: 'AFVVDDDVDDDDVDGFGFVGFGFAAAVF',
    description: 'Grid keyed by "PICTURE", transposition keyed by "GERMAN"',
  },
  {
    input: 'DEFENDTHEEASTWALL',
    key: 'CIPHER,KEYS',
    expected: 'FGGDVADADDDFGADGDFVVFGVAVDAADAAGGF',
    description: 'Grid keyed by "CIPHER", transposition keyed by "KEYS"',
  },
]
