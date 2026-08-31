import { CipherStep } from '../types'
import { CipherError } from '../../utils/errors'

/**
 * Types of substitution operations supported by the sandbox.
 */
export type SubstitutionType = 'caesar' | 'sbox' | 'affine' | 'xor'

/**
 * Types of permutation operations supported by the sandbox.
 */
export type PermutationType = 'pbox' | 'columnar' | 'block_swap' | 'cyclic_shift' | 'reverse'

/**
 * Stage Category asymmetric primitive export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/197/final — FIPS 197.
 */
export type StageCategory = 'substitution' | 'permutation'

/**
 * Base Stage Config asymmetric primitive export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/197/final — FIPS 197.
 */
export interface BaseStageConfig {
  id: string
  name: string
  category: StageCategory
  enabled: boolean
}

/**
 * Caesar Stage Config asymmetric primitive export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/197/final — FIPS 197.
 */
export interface CaesarStageConfig extends BaseStageConfig {
  category: 'substitution'
  subType: 'caesar'
  shift: number // Shift offset (1-25 or any integer)
  preserveCase?: boolean
}

/**
 * SBox Stage Config asymmetric primitive export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/197/final — FIPS 197.
 */
export interface SBoxStageConfig extends BaseStageConfig {
  category: 'substitution'
  subType: 'sbox'
  /** Mapping table e.g. { "A": "Q", "B": "W", ... } or hex nibble map */
  mapping: Record<string, string>
}

/**
 * Affine Stage Config asymmetric primitive export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/197/final — FIPS 197.
 */
export interface AffineStageConfig extends BaseStageConfig {
  category: 'substitution'
  subType: 'affine'
  a: number // Multiplier (must be coprime to alphabet size, e.g. 26)
  b: number // Shift offset
}

/**
 * Xor Stage Config asymmetric primitive export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/197/final — FIPS 197.
 */
export interface XorStageConfig extends BaseStageConfig {
  category: 'substitution'
  subType: 'xor'
  key: string // Secret key string used for byte/char XOR
}

/**
 * PBox Stage Config asymmetric primitive export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/197/final — FIPS 197.
 */
export interface PBoxStageConfig extends BaseStageConfig {
  category: 'permutation'
  subType: 'pbox'
  blockSize: number // e.g. 4
  permutation: number[] // 0-indexed positions within block, e.g. [2, 0, 3, 1]
}

/**
 * Columnar Stage Config asymmetric primitive export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/197/final — FIPS 197.
 */
export interface ColumnarStageConfig extends BaseStageConfig {
  category: 'permutation'
  subType: 'columnar'
  columns: number // Number of columns
  keyOrder: number[] // Column read order (0-indexed) e.g. [2, 0, 1]
}

/**
 * Block Swap Stage Config asymmetric primitive export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/197/final — FIPS 197.
 */
export interface BlockSwapStageConfig extends BaseStageConfig {
  category: 'permutation'
  subType: 'block_swap'
  blockSize: number // Block length to split and swap halves
}

/**
 * Cyclic Shift Stage Config asymmetric primitive export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/197/final — FIPS 197.
 */
export interface CyclicShiftStageConfig extends BaseStageConfig {
  category: 'permutation'
  subType: 'cyclic_shift'
  shift: number // Positive for right, negative for left cyclic shift
}

/**
 * Reverse Stage Config asymmetric primitive export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/197/final — FIPS 197.
 */
export interface ReverseStageConfig extends BaseStageConfig {
  category: 'permutation'
  subType: 'reverse'
  blockLength?: number // 0 or undefined for entire string reverse, or per block length
}

/**
 * Cipher Pipeline Stage asymmetric primitive export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/197/final — FIPS 197.
 */
export type CipherPipelineStage =
  | CaesarStageConfig
  | SBoxStageConfig
  | AffineStageConfig
  | XorStageConfig
  | PBoxStageConfig
  | ColumnarStageConfig
  | BlockSwapStageConfig
  | CyclicShiftStageConfig
  | ReverseStageConfig

/**
 * Pipeline Execution Result asymmetric primitive export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/197/final — FIPS 197.
 */
export interface PipelineExecutionResult {
  output: string
  steps: CipherStep[]
  durationMs: number
  isInvertible: boolean
}

/**
 * Invertibility Validation Result asymmetric primitive export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/197/final — FIPS 197.
 */
export interface InvertibilityValidationResult {
  isInvertible: boolean
  warnings: string[]
}

/**
 * Avalanche Result asymmetric primitive export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/197/final — FIPS 197.
 */
export interface AvalancheResult {
  bitFlipPct: number
  changedCharsCount: number
  totalChars: number
  originalOutput: string
  perturbedOutput: string
  diffIndices: number[]
}

/**
 * Frequency Count asymmetric primitive export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/197/final — FIPS 197.
 */
export interface FrequencyCount {
  char: string
  count: number
  percentage: number
}

// ---------------------------------------------------------------------------
// Helper Functions for Alphabetic & Byte Operations
// ---------------------------------------------------------------------------

function gcd(x: number, y: number): number {
  let a = Math.abs(x)
  let b = Math.abs(y)
  while (b) {
    const t = b
    b = a % b
    a = t
  }
  return a
}

/**
 * Mod Inverse asymmetric primitive export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @param a Input required by the Mod Inverse operation.
 * @param m Input required by the Mod Inverse operation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/197/final — FIPS 197.
 */
export function modInverse(a: number, m: number): number {
  a = ((a % m) + m) % m
  const g = gcd(a, m)
  if (g !== 1) {
    throw new CipherError(
      'INVALID_KEY',
      `Multiplier 'a' (${a}) has no modular inverse mod ${m}: gcd(${a}, ${m}) = ${g} ≠ 1.`
    )
  }
  for (let x = 1; x < m; x++) {
    if ((a * x) % m === 1) return x
  }
  throw new CipherError(
    'INVALID_KEY',
    `Multiplier 'a' (${a}) has no modular inverse mod ${m}.`
  )
}


// ---------------------------------------------------------------------------
// Invertibility Check
// ---------------------------------------------------------------------------

/**
 * Validate Pipeline Invertibility asymmetric primitive export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/197/final — FIPS 197.
 */
export function validatePipelineInvertibility(
  stages: CipherPipelineStage[]
): InvertibilityValidationResult {
  const warnings: string[] = []
  let isInvertible = true

  stages.forEach((stage, idx) => {
    if (!stage.enabled) return
    const stageNum = idx + 1

    if (stage.category === 'substitution') {
      if (stage.subType === 'affine') {
        if (gcd(stage.a, 26) !== 1) {
          isInvertible = false
          warnings.push(
            `Stage ${stageNum} (Affine): Multiplier 'a' (${stage.a}) is not coprime to 26. Modular inverse does not exist!`
          )
        }
      } else if (stage.subType === 'sbox') {
        const values = Object.values(stage.mapping)
        const uniqueValues = new Set(values)
        if (values.length !== uniqueValues.size) {
          isInvertible = false
          warnings.push(
            `Stage ${stageNum} (S-Box): Substitution table contains duplicate outputs. It is not bijective and cannot be decrypted uniquely!`
          )
        }
      }
    } else if (stage.category === 'permutation') {
      if (stage.subType === 'pbox') {
        const { permutation, blockSize } = stage
        if (permutation.length !== blockSize) {
          isInvertible = false
          warnings.push(
            `Stage ${stageNum} (P-Box): Permutation length (${permutation.length}) does not match block size (${blockSize}).`
          )
        } else {
          const sorted = [...permutation].sort((a, b) => a - b)
          const isPerm = sorted.every((val, i) => val === i)
          if (!isPerm) {
            isInvertible = false
            warnings.push(
              `Stage ${stageNum} (P-Box): Array [${permutation.join(', ')}] is not a valid 0..${blockSize - 1} permutation.`
            )
          }
        }
      } else if (stage.subType === 'columnar') {
        const { columns, keyOrder } = stage
        if (keyOrder.length !== columns) {
          isInvertible = false
          warnings.push(
            `Stage ${stageNum} (Columnar): Key order length (${keyOrder.length}) does not match column count (${columns}).`
          )
        } else {
          const sorted = [...keyOrder].sort((a, b) => a - b)
          const isPerm = sorted.every((val, i) => val === i)
          if (!isPerm) {
            isInvertible = false
            warnings.push(
              `Stage ${stageNum} (Columnar): Column key order [${keyOrder.join(', ')}] is not a valid permutation.`
            )
          }
        }
      }
    }
  })

  return { isInvertible, warnings }
}

// ---------------------------------------------------------------------------
// Stage Transformation Implementations (Encrypt & Decrypt)
// ---------------------------------------------------------------------------

/**
 * Transform Stage asymmetric primitive export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/197/final — FIPS 197.
 */
export function transformStage(
  input: string,
  stage: CipherPipelineStage,
  direction: 'encrypt' | 'decrypt'
): { output: string; note: string; highlights: number[] } {
  if (!stage.enabled) {
    return { output: input, note: `${stage.name} (Disabled - Passed through)`, highlights: [] }
  }

  const isEncrypt = direction === 'encrypt'
  const highlights: number[] = []

  switch (stage.subType) {
    case 'caesar': {
      const shift = isEncrypt ? stage.shift : -stage.shift
      const normShift = ((shift % 26) + 26) % 26

      const output = input
        .split('')
        .map((ch, idx) => {
          if (/[a-zA-Z]/.test(ch)) {
            const isUpper = ch === ch.toUpperCase()
            const base = isUpper ? 65 : 97
            const code = ch.charCodeAt(0) - base
            const shifted = (code + normShift) % 26
            const newChar = String.fromCharCode(base + shifted)
            if (newChar !== ch) highlights.push(idx)
            return newChar
          }
          return ch
        })
        .join('')

      const note = `Caesar Shift: ${isEncrypt ? '+' : '-'}${Math.abs(stage.shift)} positions`
      return { output, note, highlights }
    }

    case 'sbox': {
      const map = stage.mapping
      let activeMap = map
      if (!isEncrypt) {
        // Compute inverse map
        activeMap = {}
        Object.entries(map).forEach(([k, v]) => {
          activeMap[v] = k
          activeMap[v.toLowerCase()] = k.toLowerCase()
        })
      }

      const output = input
        .split('')
        .map((ch, idx) => {
          const isUpper = ch === ch.toUpperCase()
          const key = isUpper ? ch : ch.toUpperCase()
          if (activeMap[key]) {
            const mapped = activeMap[key]
            const resultChar = isUpper ? mapped.toUpperCase() : mapped.toLowerCase()
            if (resultChar !== ch) highlights.push(idx)
            return resultChar
          }
          return ch
        })
        .join('')

      const note = `S-Box Substitution (${isEncrypt ? 'Forward' : 'Inverse'} lookup mapping)`
      return { output, note, highlights }
    }

    case 'affine': {
      const { a, b } = stage
      const mod = 26
      const invA = modInverse(a, mod)

      const output = input
        .split('')
        .map((ch, idx) => {
          if (/[a-zA-Z]/.test(ch)) {
            const isUpper = ch === ch.toUpperCase()
            const base = isUpper ? 65 : 97
            const x = ch.charCodeAt(0) - base
            let res = 0
            if (isEncrypt) {
              res = (a * x + b) % mod
            } else {
              res = (invA * (x - b + mod * 100)) % mod
            }
            res = (res + mod) % mod
            const newChar = String.fromCharCode(base + res)
            if (newChar !== ch) highlights.push(idx)
            return newChar
          }
          return ch
        })
        .join('')

      const note = isEncrypt
        ? `Affine Transform: (${a}x + ${b}) mod 26`
        : `Inverse Affine Transform: ${invA}(y - ${b}) mod 26`

      return { output, note, highlights }
    }

    case 'xor': {
      const { key } = stage
      if (!key) return { output: input, note: 'XOR Key (Empty key)', highlights: [] }

      const output = input
        .split('')
        .map((ch, idx) => {
          const keyChar = key[idx % key.length]
          const xored = ch.charCodeAt(0) ^ keyChar.charCodeAt(0)
          const newChar = String.fromCharCode(xored)
          if (newChar !== ch) highlights.push(idx)
          return newChar
        })
        .join('')

      const note = `XOR Layer: Bitwise XOR with key "${key}"`
      return { output, note, highlights }
    }

    case 'pbox': {
      const { blockSize, permutation } = stage
      if (blockSize <= 0 || permutation.length !== blockSize) {
        return { output: input, note: 'P-Box (Invalid block size/permutation)', highlights: [] }
      }

      // Compute inverse permutation if decrypt
      let activePerm = permutation
      if (!isEncrypt) {
        activePerm = new Array(blockSize)
        permutation.forEach((dest, src) => {
          activePerm[dest] = src
        })
      }

      const chars = input.split('')
      const result: string[] = []

      for (let i = 0; i < chars.length; i += blockSize) {
        const block = chars.slice(i, i + blockSize)
        const transformedBlock = new Array(block.length)

        for (let bIdx = 0; bIdx < block.length; bIdx++) {
          const targetPos = activePerm[bIdx]
          if (targetPos !== undefined && targetPos < block.length) {
            transformedBlock[bIdx] = block[targetPos]
          } else {
            transformedBlock[bIdx] = block[bIdx]
          }
        }

        transformedBlock.forEach((ch, bIdx) => {
          const originalIndex = i + bIdx
          if (ch !== chars[originalIndex]) highlights.push(originalIndex)
          result.push(ch)
        })
      }

      const note = `P-Box Permutation (${isEncrypt ? 'Forward' : 'Inverse'} block mapping [${activePerm.join(', ')}])`
      return { output: result.join(''), note, highlights }
    }

    case 'columnar': {
      const { columns, keyOrder } = stage
      if (columns <= 1 || input.length === 0 || keyOrder.length !== columns) {
        return { output: input, note: 'Columnar Transposition (Bypassed)', highlights: [] }
      }

      const numRows = Math.ceil(input.length / columns)

      if (isEncrypt) {
        const grid: string[][] = Array.from({ length: numRows }, () =>
          Array.from({ length: columns }, () => '')
        )
        let ptr = 0
        for (let r = 0; r < numRows; r++) {
          for (let c = 0; c < columns; c++) {
            grid[r][c] = ptr < input.length ? input[ptr++] : ' '
          }
        }

        const result: string[] = []
        keyOrder.forEach((colIdx) => {
          for (let r = 0; r < numRows; r++) {
            result.push(grid[r][colIdx])
          }
        })

        const outStr = result.join('').trimEnd()
        input.split('').forEach((ch, idx) => {
          if (outStr[idx] !== ch) highlights.push(idx)
        })
        return { output: outStr, note: `Columnar Transposition (${columns} columns)`, highlights }
      } else {
        const totalChars = input.length
        const fullCols = totalChars % columns
        const colLengths = new Array(columns).fill(numRows)
        if (fullCols > 0) {
          for (let c = fullCols; c < columns; c++) {
            colLengths[c] = numRows - 1
          }
        }

        const grid: string[][] = Array.from({ length: numRows }, () =>
          Array.from({ length: columns }, () => '')
        )

        let ptr = 0
        keyOrder.forEach((colIdx) => {
          const len = colLengths[colIdx]
          for (let r = 0; r < len; r++) {
            if (ptr < input.length) {
              grid[r][colIdx] = input[ptr++]
            }
          }
        })

        const result: string[] = []
        for (let r = 0; r < numRows; r++) {
          for (let c = 0; c < columns; c++) {
            if (grid[r][c] !== '') {
              result.push(grid[r][c])
            }
          }
        }

        const outStr = result.join('')
        input.split('').forEach((ch, idx) => {
          if (outStr[idx] !== ch) highlights.push(idx)
        })
        return { output: outStr, note: `Inverse Columnar Transposition (${columns} columns)`, highlights }
      }
    }

    case 'block_swap': {
      const { blockSize } = stage
      if (blockSize <= 0 || input.length < 2) {
        return { output: input, note: 'Block Swap (Bypassed)', highlights: [] }
      }

      const chars = input.split('')
      const result: string[] = []

      for (let i = 0; i < chars.length; i += blockSize * 2) {
        const left = chars.slice(i, i + blockSize)
        const right = chars.slice(i + blockSize, i + blockSize * 2)

        const swapped = [...right, ...left]
        swapped.forEach((ch, bIdx) => {
          const globalIdx = i + bIdx
          if (ch !== chars[globalIdx]) highlights.push(globalIdx)
          result.push(ch)
        })
      }

      const note = `Block Swap: Swapping adjacent blocks of size ${blockSize}`
      return { output: result.join(''), note, highlights }
    }

    case 'cyclic_shift': {
      const { shift } = stage
      const len = input.length
      if (len === 0) return { output: input, note: 'Cyclic Shift', highlights: [] }

      const actualShift = isEncrypt ? shift : -shift
      const normShift = ((actualShift % len) + len) % len

      const chars = input.split('')
      const rotated = chars
        .slice(len - normShift)
        .concat(chars.slice(0, len - normShift))

      rotated.forEach((ch, idx) => {
        if (ch !== chars[idx]) highlights.push(idx)
      })

      const note = `Cyclic Shift: Rotated text by ${actualShift} positions`
      return { output: rotated.join(''), note, highlights }
    }

    case 'reverse': {
      const { blockLength } = stage
      const chars = input.split('')

      if (!blockLength || blockLength <= 0) {
        const reversed = chars.reverse().join('')
        input.split('').forEach((ch, idx) => {
          if (reversed[idx] !== ch) highlights.push(idx)
        })
        return { output: reversed, note: 'Reverse: Reversed entire state', highlights }
      } else {
        const result: string[] = []
        for (let i = 0; i < chars.length; i += blockLength) {
          const block = chars.slice(i, i + blockLength)
          const revBlock = block.reverse()
          revBlock.forEach((ch, bIdx) => {
            const globalIdx = i + bIdx
            if (ch !== chars[globalIdx]) highlights.push(globalIdx)
            result.push(ch)
          })
        }
        return {
          output: result.join(''),
          note: `Reverse: Reversed blocks of length ${blockLength}`,
          highlights,
        }
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Main Pipeline Execution Engine
// ---------------------------------------------------------------------------

/**
 * Execute Cipher Pipeline asymmetric primitive export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/197/final — FIPS 197.
 */
export function executeCipherPipeline(
  input: string,
  stages: CipherPipelineStage[],
  direction: 'encrypt' | 'decrypt' = 'encrypt',
  rounds: number = 1
): PipelineExecutionResult {
  const startTime = performance.now()
  const steps: CipherStep[] = []
  let currentState = input

  const { isInvertible } = validatePipelineInvertibility(stages)
  const activeRounds = Math.max(1, Math.min(10, rounds))

  // Determine stage execution order:
  // If decrypting, stages run in REVERSE order
  const activeStages = direction === 'encrypt' ? stages : [...stages].reverse()

  let stepCounter = 0

  for (let r = 1; r <= activeRounds; r++) {
    const roundNumber = direction === 'encrypt' ? r : activeRounds - r + 1

    activeStages.forEach((stage) => {
      if (!stage.enabled) return

      const inputSnapshot = currentState
      const { output, note, highlights } = transformStage(currentState, stage, direction)
      currentState = output

      steps.push({
        index: stepCounter++,
        label: `Round ${roundNumber} — ${stage.name}`,
        sublabel: `${stage.category.toUpperCase()} (${stage.subType})`,
        inputState: inputSnapshot,
        outputState: currentState,
        highlight: highlights,
        note,
        isMilestone: r === 1 || r === activeRounds,
      })
    })
  }

  const durationMs = performance.now() - startTime

  return {
    output: currentState,
    steps,
    durationMs,
    isInvertible,
  }
}

// ---------------------------------------------------------------------------
// Avalanche Effect Metric Calculator
// ---------------------------------------------------------------------------

/**
 * Calculate Avalanche Effect asymmetric primitive export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/197/final — FIPS 197.
 */
export function calculateAvalancheEffect(
  input: string,
  stages: CipherPipelineStage[],
  rounds: number = 1
): AvalancheResult {
  if (!input) {
    return {
      bitFlipPct: 0,
      changedCharsCount: 0,
      totalChars: 0,
      originalOutput: '',
      perturbedOutput: '',
      diffIndices: [],
    }
  }

  // Generate baseline encryption output
  const origRes = executeCipherPipeline(input, stages, 'encrypt', rounds)
  const originalOutput = origRes.output

  // Perturb 1 character in the input
  const chars = input.split('')
  const firstCharCode = chars[0].charCodeAt(0)
  chars[0] = String.fromCharCode(firstCharCode ^ 1)
  const perturbedInput = chars.join('')

  // Generate perturbed output
  const pertRes = executeCipherPipeline(perturbedInput, stages, 'encrypt', rounds)
  const perturbedOutput = pertRes.output

  const maxLen = Math.max(originalOutput.length, perturbedOutput.length)
  let bitFlips = 0
  const totalBits = maxLen * 8
  const diffIndices: number[] = []
  let changedCharsCount = 0

  for (let i = 0; i < maxLen; i++) {
    const char1 = originalOutput[i] || '\0'
    const char2 = perturbedOutput[i] || '\0'

    if (char1 !== char2) {
      diffIndices.push(i)
      changedCharsCount++
    }

    const code1 = char1.charCodeAt(0)
    const code2 = char2.charCodeAt(0)
    let diffBits = code1 ^ code2
    while (diffBits > 0) {
      bitFlips += diffBits & 1
      diffBits >>= 1
    }
  }

  const bitFlipPct = totalBits > 0 ? (bitFlips / totalBits) * 100 : 0

  return {
    bitFlipPct: Math.round(bitFlipPct * 10) / 10,
    changedCharsCount,
    totalChars: maxLen,
    originalOutput,
    perturbedOutput,
    diffIndices,
  }
}

// ---------------------------------------------------------------------------
// Symbol Frequency Analysis Calculator
// ---------------------------------------------------------------------------

/**
 * Calculate Frequency Analysis asymmetric primitive export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @param text Input required by the Calculate Frequency Analysis operation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/197/final — FIPS 197.
 */
export function calculateFrequencyAnalysis(text: string): FrequencyCount[] {
  if (!text) return []

  const counts: Record<string, number> = {}
  const total = text.length

  for (const ch of text) {
    counts[ch] = (counts[ch] || 0) + 1
  }

  return Object.entries(counts)
    .map(([char, count]) => ({
      char: char === ' ' ? '␣' : char,
      count,
      percentage: Math.round((count / total) * 1000) / 10,
    }))
    .sort((a, b) => b.count - a.count)
}
