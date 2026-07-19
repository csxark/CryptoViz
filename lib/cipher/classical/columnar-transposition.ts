import type { CipherResult, CipherStep, CipherMetadata } from '../types'
import { CipherError } from '../../utils/errors'

// ─── Constants ────────────────────────────────────────────────────────────────

const PAD_CHAR = 'X'

const METADATA: CipherMetadata = {
  name: 'Columnar Transposition',
  securityStatus: 'legacy',
  yearDesigned: 1900,
  standardBody: 'Historical (WWI/WWII field cipher)',
  breakingComplexity: 'Polynomial — vulnerable to column-pattern frequency analysis',
}

// ─── Validation ───────────────────────────────────────────────────────────────

function validateInput(input: string): void {
  if (!input || input.trim() === '') {
    throw new CipherError('INPUT_REQUIRED', 'Input message is required.')
  }
  const bytes = new TextEncoder().encode(input)
  if (bytes.length > 4096) {
    throw new CipherError('INPUT_TOO_LONG', 'Input exceeds maximum allowed size of 4096 bytes.')
  }
}

function validateKey(key: string): void {
  if (!key || key.trim() === '') {
    throw new CipherError('INVALID_KEY', 'Invalid key format: key must be a non-empty alphabetic string.')
  }
  if (!/^[a-zA-Z]{2,26}$/.test(key)) {
    throw new CipherError(
      'INVALID_KEY',
      'Invalid key format: key must contain only letters (A–Z), length 2–26.',
    )
  }
}

// ─── Key Rank ─────────────────────────────────────────────────────────────────

/**
 * Returns column read-order for each key character position.
 * Stable sort by alphabetical order, ties broken by position (left-to-right).
 *
 * Key "ZEBRAS" → sorted [A, B, E, R, S, Z] → positions [4, 2, 1, 3, 5, 0]
 * Returns rank[i] = read-position of column i.
 */
function getColumnRanks(key: string): number[] {
  const upper = key.toUpperCase()
  const indices = Array.from({ length: upper.length }, (_, i) => i)
  indices.sort((a, b) => {
    const ca = upper.charCodeAt(a)
    const cb = upper.charCodeAt(b)
    return ca !== cb ? ca - cb : a - b // stable: ties broken by position
  })
  // rank[position] = read order
  const rank = new Array<number>(upper.length)
  indices.forEach((colIdx, readOrder) => {
    rank[colIdx] = readOrder
  })
  return rank
}

// ─── Grid Construction ────────────────────────────────────────────────────────

function buildGrid(text: string, numCols: number): string[][] {
  const numRows = Math.ceil(text.length / numCols)
  const padded = text.padEnd(numRows * numCols, PAD_CHAR)
  const grid: string[][] = []
  for (let r = 0; r < numRows; r++) {
    grid.push(padded.slice(r * numCols, r * numCols + numCols).split(''))
  }
  return grid
}

// ─── Encrypt Fast ─────────────────────────────────────────────────────────────

function encryptFast(input: string, key: string): string {
  const clean = input.toUpperCase().replace(/[^A-Z]/g, '')
  const ranks = getColumnRanks(key)
  const numCols = key.length
  const grid = buildGrid(clean, numCols)

  // Read columns in ascending rank order
  const readOrder = ranks
    .map((rank, colIdx) => ({ rank, colIdx }))
    .sort((a, b) => a.rank - b.rank)
    .map((x) => x.colIdx)

  const parts: string[] = []
  for (const col of readOrder) {
    for (const row of grid) {
      parts.push(row[col])
    }
  }
  return parts.join('')
}

// ─── Decrypt Fast ─────────────────────────────────────────────────────────────

function decryptFast(input: string, key: string): string {
  const clean = input.toUpperCase().replace(/[^A-Z]/g, '')
  const ranks = getColumnRanks(key)
  const numCols = key.length
  const numRows = Math.ceil(clean.length / numCols)

  // Some rows may be shorter (when total not divisible by numCols)
  const fullCols = clean.length % numCols
  // fullCols == 0 means all columns have numRows cells
  const colHeights = ranks.map((_, colIdx) => {
    if (fullCols === 0) return numRows
    // Columns with rank < fullCols get an extra row
    return ranks[colIdx] < fullCols ? numRows : numRows - 1
  })

  // Rebuild columns in read-order
  const readOrder = ranks
    .map((rank, colIdx) => ({ rank, colIdx }))
    .sort((a, b) => a.rank - b.rank)
    .map((x) => x.colIdx)

  const cols: string[][] = new Array(numCols).fill(null).map(() => [])
  let pos = 0
  for (const colIdx of readOrder) {
    const height = colHeights[colIdx]
    cols[colIdx] = clean.slice(pos, pos + height).split('')
    pos += height
  }

  // Read grid row by row
  const parts: string[] = []
  for (let r = 0; r < numRows; r++) {
    for (let c = 0; c < numCols; c++) {
      if (r < cols[c].length) parts.push(cols[c][r])
    }
  }

  // Strip trailing PAD_CHAR
  let result = parts.join('')
  while (result.endsWith(PAD_CHAR)) result = result.slice(0, -1)
  return result
}

// ─── Encrypt Instrumented ─────────────────────────────────────────────────────

function encryptInstrumented(input: string, key: string): CipherStep[] {
  const steps: CipherStep[] = []
  const clean = input.toUpperCase().replace(/[^A-Z]/g, '')
  const keyUpper = key.toUpperCase()
  const ranks = getColumnRanks(key)
  const numCols = key.length
  const grid = buildGrid(clean, numCols)
  const numRows = grid.length

  // Step 0: Key rank assignment
  steps.push({
    index: 0,
    label: 'Key rank assignment',
    inputState: `Key: "${keyUpper}"`,
    outputState: ranks.map((r, i) => `${keyUpper[i]}=${r}`).join(', '),
    note: `Each key letter assigned a read-order rank by alphabetical position (ties broken left-to-right).`,
    isMilestone: true,
    table: Array.from(keyUpper).map((ch, i) => ({ key: `Col ${i + 1} (${ch})`, value: `Rank ${ranks[i]}` })),
  })

  // Step 1: Plaintext grid
  const headerRow = Array.from(keyUpper).map((ch, i) => `${ch}(${ranks[i]})`)
  steps.push({
    index: 1,
    label: 'Plaintext grid',
    inputState: clean,
    outputState: `${numRows} row(s) × ${numCols} col(s)`,
    note: `Plaintext written left-to-right in rows of ${numCols} (key length). ${clean.length % numCols !== 0 ? `Padded with '${PAD_CHAR}' to fill last row.` : 'No padding needed.'}`,
    isMilestone: true,
    matrix: [headerRow, ...grid],
  })

  // Steps per column (in read order)
  const readOrder = ranks
    .map((rank, colIdx) => ({ rank, colIdx }))
    .sort((a, b) => a.rank - b.rank)
    .map((x) => x.colIdx)

  const cipherParts: string[] = []
  for (const colIdx of readOrder) {
    const colContent = grid.map((row) => row[colIdx]).join('')
    cipherParts.push(colContent)
    steps.push({
      index: steps.length,
      label: `Read column ${colIdx + 1} (${keyUpper[colIdx]}) — rank ${ranks[colIdx]}`,
      inputState: `Column ${colIdx + 1} of grid`,
      outputState: colContent,
      note: `Column ${colIdx + 1} (key letter '${keyUpper[colIdx]}', rank ${ranks[colIdx]}) contains: "${colContent}"`,
      highlight: grid.flatMap((_, r) => [r * numCols + colIdx]),
      isMilestone: false,
    })
  }

  steps.push({
    index: steps.length,
    label: 'Ciphertext output',
    inputState: clean,
    outputState: cipherParts.join(''),
    note: `Columns read in rank order (0,1,2,...) and concatenated.`,
    isMilestone: true,
  })

  return steps
}

// ─── Decrypt Instrumented ─────────────────────────────────────────────────────

function decryptInstrumented(input: string, key: string): CipherStep[] {
  const steps: CipherStep[] = []
  const clean = input.toUpperCase().replace(/[^A-Z]/g, '')
  const keyUpper = key.toUpperCase()
  const ranks = getColumnRanks(key)
  const numCols = key.length
  const numRows = Math.ceil(clean.length / numCols)
  const fullCols = clean.length % numCols

  steps.push({
    index: 0,
    label: 'Key rank assignment (decrypt)',
    inputState: `Key: "${keyUpper}"`,
    outputState: ranks.map((r, i) => `${keyUpper[i]}=${r}`).join(', '),
    note: `Reconstruct same rank order to determine column lengths.`,
    isMilestone: true,
    table: Array.from(keyUpper).map((ch, i) => ({ key: `Col ${i + 1} (${ch})`, value: `Rank ${ranks[i]}` })),
  })

  const colHeights = ranks.map((_, colIdx) => {
    if (fullCols === 0) return numRows
    return ranks[colIdx] < fullCols ? numRows : numRows - 1
  })

  const readOrder = ranks
    .map((rank, colIdx) => ({ rank, colIdx }))
    .sort((a, b) => a.rank - b.rank)
    .map((x) => x.colIdx)

  const cols: string[][] = new Array(numCols).fill(null).map(() => [])
  let pos = 0
  for (const colIdx of readOrder) {
    const height = colHeights[colIdx]
    cols[colIdx] = clean.slice(pos, pos + height).split('')
    steps.push({
      index: steps.length,
      label: `Assign column ${colIdx + 1} (${keyUpper[colIdx]}) — rank ${ranks[colIdx]}`,
      inputState: `Position ${pos}..${pos + height - 1}`,
      outputState: cols[colIdx].join(''),
      note: `Column ${colIdx + 1} ('${keyUpper[colIdx]}') takes ${height} characters from ciphertext.`,
      isMilestone: false,
    })
    pos += height
  }

  const grid: string[][] = []
  for (let r = 0; r < numRows; r++) {
    grid.push(Array.from({ length: numCols }, (_, c) => (r < cols[c].length ? cols[c][r] : ''))
    )
  }

  steps.push({
    index: steps.length,
    label: 'Reconstructed plaintext grid',
    inputState: '',
    outputState: grid.map((r) => r.join('')).join(' | '),
    note: 'Grid reassembled by placing each column back in its original position.',
    isMilestone: true,
    matrix: grid,
  })

  const parts: string[] = []
  for (let r = 0; r < numRows; r++) {
    for (let c = 0; c < numCols; c++) {
      if (r < cols[c].length) parts.push(cols[c][r])
    }
  }

  let result = parts.join('')
  while (result.endsWith(PAD_CHAR)) result = result.slice(0, -1)

  steps.push({
    index: steps.length,
    label: 'Plaintext output',
    inputState: parts.join(''),
    outputState: result,
    note: `Read rows left-to-right. Trailing '${PAD_CHAR}' padding characters stripped.`,
    isMilestone: true,
  })

  return steps
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function encrypt(
  input: string,
  key: string,
  options: { instrument?: boolean } = {},
): CipherResult {
  const t0 = performance.now()
  validateInput(input)
  validateKey(key)

  if (options.instrument) {
    const steps = encryptInstrumented(input, key)
    const output = encryptFast(input, key)
    return { output, outputEncoding: 'utf8', steps, metadata: METADATA, durationMs: performance.now() - t0 }
  }
  const output = encryptFast(input, key)
  return { output, outputEncoding: 'utf8', steps: [], metadata: METADATA, durationMs: performance.now() - t0 }
}

export function decrypt(
  input: string,
  key: string,
  options: { instrument?: boolean } = {},
): CipherResult {
  const t0 = performance.now()
  validateInput(input)
  validateKey(key)

  if (options.instrument) {
    const steps = decryptInstrumented(input, key)
    const output = decryptFast(input, key)
    return { output, outputEncoding: 'utf8', steps, metadata: METADATA, durationMs: performance.now() - t0 }
  }
  const output = decryptFast(input, key)
  return { output, outputEncoding: 'utf8', steps: [], metadata: METADATA, durationMs: performance.now() - t0 }
}

// ─── Test Vectors ─────────────────────────────────────────────────────────────

export const TEST_VECTORS = [
  {
    input: 'WEAREDISCOVEREDFLEEAATONCE',
    key: 'ZEBRAS',
    expected: 'EVLNXACDTXROFOXDEECXWIREEESEAX',
    description: 'Classic ZEBRAS example',
  },
  {
    input: 'HELLO',
    key: 'KEY',
    expected: 'EOHLLLX',
    description: 'Short input with padding',
  },
  {
    input: 'ATTACK',
    key: 'CAT',
    expected: 'TCAKTA',
    description: 'Even-length input, no padding',
  },
] as const
