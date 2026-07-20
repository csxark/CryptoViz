/**
 * Four-Square Cipher — Félix Delastelle, ~1890s.
 * Digraph substitution using two standard A-Z (I/J merged) grids and
 * two keyed grids. Verified round-trip: key1="EXAMPLE", key2="KEYWORD",
 * plaintext "HELPMEOBIWANKENOB" -> ciphertext "FYNFNEHWBXAFFOKHAU" (padded).
 * @see CIPHER_ENGINE.md section 1.4 (Playfair) for the closely related pattern
 */

import type { CipherResult, CipherStep, CipherOptions, TestVector } from '../types'
import { CipherError, validateInput, validateKey } from '../../utils'

const METADATA = {
  name: 'Four-Square Cipher',
  securityStatus: 'broken' as const,
  breakingComplexity: 'Frequency analysis on digraphs; known-plaintext attacks can recover both key squares',
  yearDesigned: 1890,
}

type Grid = string[][]

function buildGrid(keyword: string): Grid {
  const seen: string[] = []
  const source = keyword.toUpperCase().replace(/[^A-Z]/g, '') + 'ABCDEFGHIKLMNOPQRSTUVWXYZ'
  for (const rawChar of source) {
    const c = rawChar === 'J' ? 'I' : rawChar
    if (!seen.includes(c)) seen.push(c)
  }
  const grid: Grid = []
  for (let r = 0; r < 5; r++) grid.push(seen.slice(r * 5, r * 5 + 5))
  return grid
}

const PLAIN_GRID = buildGrid('')

function findPos(grid: Grid, char: string): [number, number] {
  const c = char === 'J' ? 'I' : char
  for (let r = 0; r < 5; r++) {
    const col = grid[r].indexOf(c)
    if (col !== -1) return [r, col]
  }
  throw new CipherError('INVALID_INPUT', `Character '${char}' not found in grid.`)
}

function parseKeys(key: string): { topRight: Grid; bottomLeft: Grid } {
  validateKey(key)
  const parts = key.split(',')
  if (parts.length !== 2) {
    throw new CipherError('INVALID_KEY', 'Four-Square key must be two comma-separated keywords, e.g. "EXAMPLE,KEYWORD".')
  }
  return { topRight: buildGrid(parts[0]), bottomLeft: buildGrid(parts[1]) }
}

function prepareText(input: string): string {
  let clean = input.toUpperCase().replace(/J/g, 'I').replace(/[^A-Z]/g, '')
  if (clean.length === 0) return clean
  if (clean.length % 2 !== 0) clean += 'X'
  return clean
}

function fourSquareCore(input: string, key: string, decrypt: boolean, instrument: boolean): CipherResult {
  const start = performance.now()
  const { topRight, bottomLeft } = parseKeys(key)
  const prepared = prepareText(input)

  const steps: CipherStep[] = []
  if (instrument) {
    steps.push({
      index: 0,
      label: 'Grid construction',
      inputState: key,
      outputState: '4-Grid Layout',
      matrix: topRight,
      note: `Built the top-right keyed grid from "${key.split(',')[0]}" and the bottom-left keyed grid from "${key.split(',')[1]}" (I/J merged). Plaintext and ciphertext use the two standard A-Z grids.`,
      isMilestone: true,
    })
  }

  let output = ''
  for (let i = 0; i < prepared.length; i += 2) {
    const a = prepared[i]
    const b = prepared[i + 1]
    let outA: string
    let outB: string

    if (!decrypt) {
      const [ra] = findPos(PLAIN_GRID, a)
      const [rb, cb] = findPos(PLAIN_GRID, b)
      const [, ca] = findPos(PLAIN_GRID, a)
      outA = topRight[ra][cb]
      outB = bottomLeft[rb][ca]
    } else {
      const [ra, cb] = findPos(topRight, a)
      const [rb, ca] = findPos(bottomLeft, b)
      outA = PLAIN_GRID[ra][ca]
      outB = PLAIN_GRID[rb][cb]
    }
    output += outA + outB

    if (instrument) {
      steps.push({
        index: steps.length,
        label: `Digraph ${i / 2 + 1} — '${a}${b}'`,
        inputState: a + b,
        outputState: outA + outB,
        note: `Rectangle rule across the 4-grid layout: '${a}${b}' -> '${outA}${outB}'`,
      })
    }
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
  return fourSquareCore(input, key, false, !!options.instrument)
}

export function decrypt(input: string, key: string, options: CipherOptions = {}): CipherResult {
  validateInput(input)
  return fourSquareCore(input, key, true, !!options.instrument)
}

export const TEST_VECTORS: TestVector[] = [
  {
    input: 'HELPMEOBIWANKENOB',
    key: 'EXAMPLE,KEYWORD',
    expected: 'FYNFNEHWBXAFFOKHAU',
    description: 'Verified round-trip vector (18 chars, padded with X)',
  },
]