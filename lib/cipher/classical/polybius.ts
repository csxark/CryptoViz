import type { CipherResult, CipherStep, CipherMetadata } from '../types'
import { CipherError } from '../../utils/errors'

// ─── Constants ────────────────────────────────────────────────────────────────

const ALPHABET = 'ABCDEFGHIKLMNOPQRSTUVWXYZ' // J omitted — I and J share cell

const METADATA: CipherMetadata = {
  name: 'Polybius Square',
  securityStatus: 'legacy',
  yearDesigned: -150, // ~150 BCE
  standardBody: 'Historical (Polybius of Megalopolis)',
  breakingComplexity: 'Trivial — frequency analysis of digit pairs',
}

// ─── Grid Construction ────────────────────────────────────────────────────────

function buildGrid(key: string): { grid: string[][]; lookup: Map<string, [number, number]> } {
  const seen = new Set<string>()
  const ordered: string[] = []

  const clean = (key + ALPHABET).toUpperCase().replace(/J/g, 'I')

  for (const ch of clean) {
    if (/[A-Z]/.test(ch) && !seen.has(ch)) {
      seen.add(ch)
      ordered.push(ch)
    }
  }

  const grid: string[][] = []
  for (let r = 0; r < 5; r++) {
    grid.push(ordered.slice(r * 5, r * 5 + 5))
  }

  const lookup = new Map<string, [number, number]>()
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      lookup.set(grid[r][c], [r, c])
    }
  }
  // J maps to same cell as I
  if (lookup.has('I') && !lookup.has('J')) {
    lookup.set('J', lookup.get('I')!)
  }

  return { grid, lookup }
}

function buildReverseGrid(grid: string[][]): Map<string, string> {
  const rev = new Map<string, string>()
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      rev.set(`${r}${c}`, grid[r][c])
    }
  }
  return rev
}

// ─── Input Validation ─────────────────────────────────────────────────────────

function validateInput(input: string): void {
  if (!input || input.trim() === '') {
    throw new CipherError('INPUT_REQUIRED', 'Input message is required.')
  }
  const bytes = new TextEncoder().encode(input)
  if (bytes.length > 4096) {
    throw new CipherError('INPUT_TOO_LONG', 'Input exceeds maximum allowed size of 4096 bytes.')
  }
}

// ─── Encrypt ──────────────────────────────────────────────────────────────────

function encryptFast(input: string, key: string): string {
  const { lookup } = buildGrid(key)
  const upper = input.toUpperCase().replace(/J/g, 'I')
  const parts: string[] = []
  for (const ch of upper) {
    if (lookup.has(ch)) {
      const [r, c] = lookup.get(ch)!
      parts.push(`${r + 1}${c + 1}`)
    } else {
      parts.push(ch) // non-alpha passthrough
    }
  }
  return parts.join(' ')
}

function encryptInstrumented(input: string, key: string): CipherStep[] {
  const steps: CipherStep[] = []
  const { grid, lookup } = buildGrid(key)
  const upper = input.toUpperCase().replace(/J/g, 'I')

  steps.push({
    index: 0,
    label: 'Key square construction',
    inputState: `Key: "${key || '(none — default alphabet)'}"`,
    outputState: `Grid (5×5), J merged into I`,
    note: `Built 5×5 Polybius grid from key "${key || 'default'}" + remaining alphabet. J is treated as I (shares row ${(lookup.get('I') ?? [0])[0] + 1}, col ${(lookup.get('I') ?? [0, 0])[1] + 1}).`,
    isMilestone: true,
    matrix: grid,
    table: [
      { key: 'I/J cell', value: `Row ${(lookup.get('I') ?? [0])[0] + 1}, Col ${(lookup.get('I') ?? [0, 0])[1] + 1}` },
    ],
  })

  const parts: string[] = []
  for (let i = 0; i < upper.length; i++) {
    const ch = upper[i]
    if (lookup.has(ch)) {
      const [r, c] = lookup.get(ch)!
      parts.push(`${r + 1}${c + 1}`)
      steps.push({
        index: steps.length,
        label: `Char ${i + 1} — '${ch}'${input[i] === 'J' || input[i] === 'j' ? ' (J→I)' : ''}`,
        inputState: ch,
        outputState: `${r + 1}${c + 1}`,
        note: `'${ch}' is at row ${r + 1}, col ${c + 1} → encoded as "${r + 1}${c + 1}"`,
        highlight: [r * 5 + c],
        matrix: grid,
        isMilestone: false,
      })
    } else {
      parts.push(ch)
      steps.push({
        index: steps.length,
        label: `Char ${i + 1} — '${ch}' (passthrough)`,
        inputState: ch,
        outputState: ch,
        note: `Non-alphabetic character '${ch}' passed through unchanged.`,
        isMilestone: false,
      })
    }
  }

  steps.push({
    index: steps.length,
    label: 'Ciphertext output',
    inputState: input,
    outputState: parts.join(' '),
    note: `Each letter encoded as its (row)(col) coordinate pair. Pairs separated by spaces for readability.`,
    isMilestone: true,
  })

  return steps
}

// ─── Decrypt ──────────────────────────────────────────────────────────────────

function decryptFast(input: string, key: string): string {
  const { grid } = buildGrid(key)
  const rev = buildReverseGrid(grid)
  const tokens = input.split(' ')
  const parts: string[] = []
  for (const tok of tokens) {
    if (/^\d{2}$/.test(tok)) {
      const r = parseInt(tok[0], 10) - 1
      const c = parseInt(tok[1], 10) - 1
      if (r >= 0 && r < 5 && c >= 0 && c < 5) {
        parts.push(rev.get(`${r}${c}`) ?? tok)
      } else {
        parts.push(tok)
      }
    } else {
      parts.push(tok) // passthrough (non-digit or non-pair)
    }
  }
  return parts.join('')
}

function decryptInstrumented(input: string, key: string): CipherStep[] {
  const steps: CipherStep[] = []
  const { grid } = buildGrid(key)
  const rev = buildReverseGrid(grid)
  const tokens = input.split(' ')

  steps.push({
    index: 0,
    label: 'Key square reconstruction',
    inputState: `Key: "${key || '(default)'}"`,
    outputState: 'Grid ready for reverse lookup',
    note: 'Rebuilding 5×5 grid to map coordinate pairs back to letters.',
    isMilestone: true,
    matrix: grid,
  })

  const parts: string[] = []
  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i]
    if (/^\d{2}$/.test(tok)) {
      const r = parseInt(tok[0], 10) - 1
      const c = parseInt(tok[1], 10) - 1
      const letter = rev.get(`${r}${c}`) ?? '?'
      parts.push(letter)
      steps.push({
        index: steps.length,
        label: `Token ${i + 1} — "${tok}"`,
        inputState: tok,
        outputState: letter,
        note: `Coordinate (${r + 1},${c + 1}) → grid[${r}][${c}] = '${letter}'`,
        highlight: [r * 5 + c],
        matrix: grid,
        isMilestone: false,
      })
    } else {
      parts.push(tok)
      steps.push({
        index: steps.length,
        label: `Token ${i + 1} — "${tok}" (passthrough)`,
        inputState: tok,
        outputState: tok,
        note: `Non-coordinate token "${tok}" passed through unchanged.`,
        isMilestone: false,
      })
    }
  }

  steps.push({
    index: steps.length,
    label: 'Plaintext output',
    inputState: input,
    outputState: parts.join(''),
    note: 'Coordinate pairs decoded back to letters.',
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
  const cleanKey = (key ?? '').replace(/[^a-zA-Z]/g, '')

  if (options.instrument) {
    const steps = encryptInstrumented(input, cleanKey)
    const output = encryptFast(input, cleanKey)
    return { output, outputEncoding: 'utf8', steps, metadata: METADATA, durationMs: performance.now() - t0 }
  }

  const output = encryptFast(input, cleanKey)
  return { output, outputEncoding: 'utf8', steps: [], metadata: METADATA, durationMs: performance.now() - t0 }
}

export function decrypt(
  input: string,
  key: string,
  options: { instrument?: boolean } = {},
): CipherResult {
  const t0 = performance.now()
  validateInput(input)
  const cleanKey = (key ?? '').replace(/[^a-zA-Z]/g, '')

  if (options.instrument) {
    const steps = decryptInstrumented(input, cleanKey)
    const output = decryptFast(input, cleanKey)
    return { output, outputEncoding: 'utf8', steps, metadata: METADATA, durationMs: performance.now() - t0 }
  }

  const output = decryptFast(input, cleanKey)
  return { output, outputEncoding: 'utf8', steps: [], metadata: METADATA, durationMs: performance.now() - t0 }
}

// ─── Test Vectors ─────────────────────────────────────────────────────────────

export const TEST_VECTORS = [
  {
    input: 'HELLO',
    key: '',
    expected: '23 15 31 31 34',
    description: 'Default grid, standard word (unkeyed)',
  },
  {
    input: 'ATTACK',
    key: '',
    expected: '11 44 44 11 13 25',
    description: 'Default grid, tactical word (unkeyed)',
  },
  {
    input: 'JUMP',
    key: '',
    expected: '24 45 32 35',
    description: 'J treated as I (J→I substitution)',
  },
  {
    input: 'HELLO',
    key: 'POLYBIUS',
    expected: '41 12 24 24 15',
    description: 'Keyed Polybius Square with key POLYBIUS',
  },
] as const
