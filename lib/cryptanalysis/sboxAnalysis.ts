/**
 * S-Box cryptanalysis utilities — Difference Distribution Table (DDT) and
 * Linear Approximation Table (LAT) generation for arbitrary n-bit S-Boxes,
 * plus the differential uniformity / nonlinearity metrics and Matsui's
 * Piling-Up Lemma used to stack round biases.
 *
 * Definitions (F_2^n = GF(2)^n, XOR throughout):
 *
 *   DDT[Δx][Δy] = #{ x | S(x) ⊕ S(x ⊕ Δx) = Δy }
 *   δ            = max over Δx ≠ 0, Δy of DDT[Δx][Δy]   (differential uniformity)
 *   LAT[a][b]    = #{ x | parity(a · x) = parity(b · S(x)) } − 2^(n−1)
 *   ε            = |LAT[a][b]| / 2^n                     (linear bias magnitude)
 *   NL           = 2^(n−1) − max over a≠0,b of |LAT[a][b]|   (nonlinearity)
 *
 * The LAT values are signed counts in [−2^(n−1), 2^(n−1)]; the *bias* shown
 * in the UI is |LAT[a][b]| / 2^n, matching the convention
 * ε = |P(a·x = b·S(x)) − 1/2|.
 */

// --- Built-in S-Boxes -------------------------------------------------------

/** PRESENT (ISO/IEC 29192-2) 4-bit S-box. */
export const PRESENT_SBOX: readonly number[] = [0xc, 0x5, 0x6, 0xb, 0x9, 0x0, 0xa, 0xd, 0x3, 0xe, 0xf, 0x8, 0x4, 0x7, 0x1, 0x2]

/** SERPENT S0 4-bit S-box (first box of the eight used by the cipher). */
export const SERPENT_S0_SBOX: readonly number[] = [0x3, 0x8, 0xf, 0x1, 0xa, 0x6, 0x5, 0xb, 0xe, 0xd, 0x4, 0x2, 0x7, 0x0, 0x9, 0xc]

/** DES S1 4x16 S-box flattened to 64 entries in row-major order. */
export const DES_S1_FLAT: readonly number[] = [
  14, 4, 13, 1, 2, 15, 11, 8, 3, 10, 6, 12, 5, 9, 0, 7,
  0, 15, 7, 4, 14, 2, 13, 1, 10, 6, 12, 11, 9, 5, 3, 8,
  4, 1, 14, 8, 13, 6, 2, 11, 15, 12, 9, 7, 3, 10, 5, 0,
  15, 12, 8, 2, 4, 9, 1, 7, 5, 11, 3, 14, 10, 0, 6, 13,
]

/** DES S1 presented as the conventional 4x16 row layout. */
export const DES_S1_GRID: readonly number[][] = [
  [14, 4, 13, 1, 2, 15, 11, 8, 3, 10, 6, 12, 5, 9, 0, 7],
  [0, 15, 7, 4, 14, 2, 13, 1, 10, 6, 12, 11, 9, 5, 3, 8],
  [4, 1, 14, 8, 13, 6, 2, 11, 15, 12, 9, 7, 3, 10, 5, 0],
  [15, 12, 8, 2, 4, 9, 1, 7, 5, 11, 3, 14, 10, 0, 6, 13],
]

/** The AES (FIPS 197) 8-bit S-box as a flat 256-entry array. */
export const AES_SBOX: readonly number[] = [
  0x63, 0x7c, 0x77, 0x7b, 0xf2, 0x6b, 0x6f, 0xc5, 0x30, 0x01, 0x67, 0x2b, 0xfe, 0xd7, 0xab, 0x76,
  0xca, 0x82, 0xc9, 0x7d, 0xfa, 0x59, 0x47, 0xf0, 0xad, 0xd4, 0xa2, 0xaf, 0x9c, 0xa4, 0x72, 0xc0,
  0xb7, 0xfd, 0x93, 0x26, 0x36, 0x3f, 0xf7, 0xcc, 0x34, 0xa5, 0xe5, 0xf1, 0x71, 0xd8, 0x31, 0x15,
  0x04, 0xc7, 0x23, 0xc3, 0x18, 0x96, 0x05, 0x9a, 0x07, 0x12, 0x80, 0xe2, 0xeb, 0x27, 0xb2, 0x75,
  0x09, 0x83, 0x2c, 0x1a, 0x1b, 0x6e, 0x5a, 0xa0, 0x52, 0x3b, 0xd6, 0xb3, 0x29, 0xe3, 0x2f, 0x84,
  0x53, 0xd1, 0x00, 0xed, 0x20, 0xfc, 0xb1, 0x5b, 0x6a, 0xcb, 0xbe, 0x39, 0x4a, 0x4c, 0x58, 0xcf,
  0xd0, 0xef, 0xaa, 0xfb, 0x43, 0x4d, 0x33, 0x85, 0x45, 0xf9, 0x02, 0x7f, 0x50, 0x3c, 0x9f, 0xa8,
  0x51, 0xa3, 0x40, 0x8f, 0x92, 0x9d, 0x38, 0xf5, 0xbc, 0xb6, 0xda, 0x21, 0x10, 0xff, 0xf3, 0xd2,
  0xcd, 0x0c, 0x13, 0xec, 0x5f, 0x97, 0x44, 0x17, 0xc4, 0xa7, 0x7e, 0x3d, 0x64, 0x5d, 0x19, 0x73,
  0x60, 0x81, 0x4f, 0xdc, 0x22, 0x2a, 0x90, 0x88, 0x46, 0xee, 0xb8, 0x14, 0xde, 0x5e, 0x0b, 0xdb,
  0xe0, 0x32, 0x3a, 0x0a, 0x49, 0x06, 0x24, 0x5c, 0xc2, 0xd3, 0xac, 0x62, 0x91, 0x95, 0xe4, 0x79,
  0xe7, 0xc8, 0x37, 0x6d, 0x8d, 0xd5, 0x4e, 0xa9, 0x6c, 0x56, 0xf4, 0xea, 0x65, 0x7a, 0xae, 0x08,
  0xba, 0x78, 0x25, 0x2e, 0x1c, 0xa6, 0xb4, 0xc6, 0xe8, 0xdd, 0x74, 0x1f, 0x4b, 0xbd, 0x8b, 0x8a,
  0x70, 0x3e, 0xb5, 0x66, 0x48, 0x03, 0xf6, 0x0e, 0x61, 0x35, 0x57, 0xb9, 0x86, 0xc1, 0x1d, 0x9e,
  0xe1, 0xf8, 0x98, 0x11, 0x69, 0xd9, 0x8e, 0x94, 0x9b, 0x1e, 0x87, 0xe9, 0xce, 0x55, 0x28, 0xdf,
  0x8c, 0xa1, 0x89, 0x0d, 0xbf, 0xe6, 0x42, 0x68, 0x41, 0x99, 0x2d, 0x0f, 0xb0, 0x54, 0xbb, 0x16,
]

export interface BuiltinSBox {
  id: string
  label: string
  /** The S-box as a flat lookup table. */
  values: readonly number[]
  /** Bits of input/output (4 for nibble S-boxes, 8 for AES). */
  bits: number
  description: string
}

/** Built-in S-Boxes offered by the workbench. */
export const BUILTIN_SBOXES: BuiltinSBox[] = [
  {
    id: 'present',
    label: 'PRESENT',
    values: PRESENT_SBOX,
    bits: 4,
    description: 'ISO/IEC 29192-2 nibble S-box — the classic 4-bit design.',
  },
  {
    id: 'serpent-s0',
    label: 'Serpent S0',
    values: SERPENT_S0_SBOX,
    bits: 4,
    description: 'First of the eight 4-bit S-boxes used by the Serpent cipher.',
  },
  {
    id: 'aes',
    label: 'AES',
    values: AES_SBOX,
    bits: 8,
    description: 'FIPS 197 byte S-box — 8-bit in / 8-bit out. Note: the 256×256 DDT/LAT is heavy.',
  },
]

// --- Types -------------------------------------------------------------------

export interface DdtCellPair {
  /** Input x such that S(x) ⊕ S(x ⊕ Δx) = Δy. */
  x1: number
  /** x1 ⊕ Δx, the paired input. */
  x2: number
  /** S(x1). */
  s1: number
  /** S(x2). */
  s2: number
}

export interface DdtCell {
  /** Number of x values that satisfy the Δx → Δy transition. */
  count: number
  /** The concrete (x1, x2) pairs that realize this transition. */
  pairs: DdtCellPair[]
}

export interface LatCell {
  /** Signed count: #{x | a·x = b·S(x)} − 2^(n−1). */
  value: number
  /** Magnitude |value| / 2^n — the linear bias ε. */
  bias: number
}

export interface SboxAnalysisResult {
  /** The flat S-box used for the computation. */
  sbox: readonly number[]
  /** Bits of the S-box (4 or 8). */
  bits: number
  /** DDT[Δx][Δy], row-major. */
  ddt: DdtCell[][]
  /** LAT[a][b], row-major. */
  lat: LatCell[][]
  /** Differential uniformity δ = max over Δx≠0 of DDT. */
  differentialUniformity: number
  /** Worst differential probability δ / 2^n (or 0 when n = 0). */
  maxDifferentialProbability: number
  /** The (Δx, Δy) cells that attain the differential uniformity. */
  maxDifferentialCells: { dx: number; dy: number; count: number }[]
  /** Nonlinearity NL = 2^(n−1) − max |LAT[a][b]| over a≠0. */
  nonlinearity: number
  /** The (a, b) cells attaining the maximum absolute LAT value. */
  maxBiasCells: { a: number; b: number; value: number; bias: number }[]
  /** Max |bias| over a≠0 — ε_max for this S-box. */
  maxBias: number
}

// --- Core helpers -------------------------------------------------------------

/**
 * Count the set bits of x. Used for the parity dot products a·x and b·S(x).
 */
export function popcount(x: number): number {
  let v = x
  let count = 0
  while (v > 0) {
    count += v & 1
    v >>>= 1
  }
  return count
}

/** Parity of a bitmask dot product: a·x = popcount(a & x) mod 2. */
export function parity(a: number, x: number): number {
  return popcount(a & x) & 1
}

// --- DDT ----------------------------------------------------------------------

/**
 * Build the 2^n × 2^n Difference Distribution Table for an n-bit S-box.
 * DDT[Δx][Δy] = #{ x | S(x) ⊕ S(x ⊕ Δx) = Δy }, including the concrete
 * (x1, x2) pairs that realize each transition.
 */
export function computeDdt(sbox: readonly number[], bits: number): DdtCell[][] {
  const size = 1 << bits
  const table: DdtCell[][] = []
  for (let dx = 0; dx < size; dx++) {
    const row: DdtCell[] = []
    for (let dy = 0; dy < size; dy++) {
      row.push({ count: 0, pairs: [] })
    }
    table.push(row)
  }

  for (let dx = 1; dx < size; dx++) {
    for (let x1 = 0; x1 < size; x1++) {
      const x2 = x1 ^ dx
      const s1 = sbox[x1]
      const s2 = sbox[x2]
      const dy = s1 ^ s2
      const cell = table[dx][dy]
      cell.count += 1
      cell.pairs.push({ x1, x2, s1, s2 })
    }
  }
  return table
}

// --- LAT ----------------------------------------------------------------------

/**
 * Build the 2^n × 2^n Linear Approximation Table for an n-bit S-box.
 * LAT[a][b] = #{ x | parity(a·x) = parity(b·S(x)) } − 2^(n−1).
 * The a = 0 row is all zero (a·x = 0 always), matching the convention that
 * biases are only interesting for nonzero input masks.
 */
export function computeLat(sbox: readonly number[], bits: number): LatCell[][] {
  const size = 1 << bits
  const half = 1 << (bits - 1)
  const table: LatCell[][] = []

  for (let a = 0; a < size; a++) {
    const row: LatCell[] = []
    for (let b = 0; b < size; b++) {
      let count = 0
      for (let x = 0; x < size; x++) {
        if (parity(a, x) === parity(b, sbox[x])) count += 1
      }
      const value = count - half
      row.push({ value, bias: Math.abs(value) / size })
    }
    table.push(row)
  }
  return table
}

// --- Metrics ------------------------------------------------------------------

/**
 * Compute differential uniformity δ, the worst differential probability
 * δ / 2^n, and the (Δx, Δy) cells that attain it. Only Δx ≠ 0 counts.
 */
export function computeDifferentialMetrics(ddt: DdtCell[][]): {
  uniformity: number
  maxProbability: number
  maxCells: { dx: number; dy: number; count: number }[]
} {
  const size = ddt.length
  let uniformity = 0
  const maxCells: { dx: number; dy: number; count: number }[] = []

  for (let dx = 1; dx < size; dx++) {
    for (let dy = 0; dy < size; dy++) {
      const count = ddt[dx][dy].count
      if (count > uniformity) {
        uniformity = count
        maxCells.length = 0
        maxCells.push({ dx, dy, count })
      } else if (count === uniformity) {
        maxCells.push({ dx, dy, count })
      }
    }
  }

  return {
    uniformity,
    maxProbability: uniformity / size,
    maxCells,
  }
}

/**
 * Compute nonlinearity NL = 2^(n−1) − max_{a≠0,b} |LAT[a][b]| and the
 * strongest bias cells (nonzero input mask only).
 */
export function computeLinearMetrics(lat: LatCell[][]): {
  nonlinearity: number
  maxCells: { a: number; b: number; value: number; bias: number }[]
  maxBias: number
} {
  const size = lat.length
  const half = size / 2
  let maxAbs = 0
  const maxCells: { a: number; b: number; value: number; bias: number }[] = []

  for (let a = 1; a < size; a++) {
    for (let b = 0; b < size; b++) {
      const cell = lat[a][b]
      const abs = Math.abs(cell.value)
      if (abs > maxAbs) {
        maxAbs = abs
        maxCells.length = 0
        maxCells.push({ a, b, value: cell.value, bias: cell.bias })
      } else if (abs === maxAbs) {
        maxCells.push({ a, b, value: cell.value, bias: cell.bias })
      }
    }
  }

  return {
    nonlinearity: half - maxAbs,
    maxCells,
    maxBias: maxAbs / size,
  }
}

// --- Full analysis -------------------------------------------------------------

/**
 * Run the full DDT + LAT analysis for an S-box.
 * @param sbox Flat S-box lookup table (e.g. 16 entries for 4-bit, 256 for 8-bit).
 * @param bits Bits of input/output (must be ≥ 1; 4 and 8 are the supported presets).
 */
export function analyzeSbox(sbox: readonly number[], bits: number): SboxAnalysisResult {
  if (!Number.isInteger(bits) || bits < 1) {
    throw new RangeError('S-box bit width must be a positive integer.')
  }
  const size = 1 << bits
  if (sbox.length !== size) {
    throw new RangeError(`S-box must have exactly ${size} entries for ${bits}-bit input.`)
  }
  for (const value of sbox) {
    if (!Number.isInteger(value) || value < 0 || value >= size) {
      throw new RangeError(`Every S-box output must be an integer in [0, ${size - 1}].`)
    }
  }

  const ddt = computeDdt(sbox, bits)
  const lat = computeLat(sbox, bits)
  const differential = computeDifferentialMetrics(ddt)
  const linear = computeLinearMetrics(lat)

  return {
    sbox,
    bits,
    ddt,
    lat,
    differentialUniformity: differential.uniformity,
    maxDifferentialProbability: differential.maxProbability,
    maxDifferentialCells: differential.maxCells,
    nonlinearity: linear.nonlinearity,
    maxBiasCells: linear.maxCells,
    maxBias: linear.maxBias,
  }
}

// --- Custom S-box parsing --------------------------------------------------------

/**
 * Parse a user-supplied S-box. Accepts whitespace/comma separated decimal or
 * 0x-prefixed hex values, e.g. "c 5 6 b" or "0xC,0x5,0x6,0xB".
 * Returns null when the input is empty or malformed.
 */
export function parseCustomSbox(raw: string): number[] | null {
  const trimmed = raw.trim()
  if (trimmed === '') return null

  const tokens = trimmed.split(/[\s,]+/).filter((t) => t.length > 0)
  const values: number[] = []
  for (const token of tokens) {
    let value: number
    if (/^0x[0-9a-f]+$/i.test(token)) {
      value = parseInt(token.slice(2), 16)
    } else if (/^[0-9]+$/.test(token)) {
      value = parseInt(token, 10)
    } else {
      return null
    }
    if (!Number.isInteger(value) || value < 0 || value > 15) {
      return null
    }
    values.push(value)
  }
  if (values.length !== 16) return null
  return values
}

// --- Matsui's Piling-Up Lemma ------------------------------------------------------

/**
 * Stack k independent linear approximations with the given bias magnitudes
 * using Matsui's Piling-Up Lemma: ε = 2^(k−1) · ∏ εᵢ.
 * Returns the combined bias magnitude (0 when k = 0).
 */
export function pilingUpLemma(biases: readonly number[], rounds: number): number {
  if (rounds <= 0) return 0
  const k = Math.min(rounds, biases.length)
  let product = 1
  for (let i = 0; i < k; i++) {
    product *= biases[i]
  }
  return Math.pow(2, k - 1) * product
}

/** Format a single LAT bias cell as a human-readable probability string. */
export function formatBias(bias: number): string {
  return `${(bias * 100).toFixed(1)}%`
}
