/**
 * Hill Cipher — polygraphic substitution using 2x2 matrix multiplication mod 26.
 * @see CIPHER_ENGINE.md section 1.x (Hill Cipher)
 *
 * Encrypt: C = K * P mod 26   (P, C are 2-letter column vectors)
 * Decrypt: P = K^-1 * C mod 26
 *
 * The 4-letter key string is read row-major into a 2x2 matrix, e.g. key
 * "HILL" -> [[7,8],[11,11]]. The key matrix must be invertible mod 26,
 * i.e. gcd(det(K), 26) === 1, or encryption would be lossy.
 */

import type { CipherResult, CipherStep, CipherOptions, TestVector } from '../types'
import { CipherError, validateInput, validateKey } from '../../utils'

const METADATA = {
  name: 'Hill Cipher',
  securityStatus: 'broken' as const,
  breakingComplexity: 'Known-plaintext attack via linear algebra (solve for K given P and C pairs)',
  yearDesigned: 1929,
}

type Matrix2x2 = [[number, number], [number, number]]

function mod(n: number, m: number): number {
  return ((n % m) + m) % m
}

// Computes the greatest common divisor of two integers
function gcd(a: number, b: number): number {
  let x = Math.abs(a)
  let y = Math.abs(b)
  while (y !== 0) {
    const t = y
    y = x % y
    x = t
  }
  return x
}

// Extended Euclidean algorithm — returns [gcd, x] such that a*x + b*y = gcd
function egcd(a: number, b: number): [number, number, number] {
  if (b === 0) return [a, 1, 0]
  const [g, x, y] = egcd(b, a % b)
  return [g, y, x - Math.floor(a / b) * y]
}

function modInverse(a: number, m: number): number | null {
  const g = gcd(a, m)
  if (g !== 1) return null
  const [, x] = egcd(mod(a, m), m)
  return mod(x, m)
}

/**
 * Parses a 4-letter key string into a 2x2 matrix (mod 26) and validates
 * that it is invertible (required for decryption to be possible at all).
 */
export function parseHillKey(key: string): { matrix: Matrix2x2; det: number; detInverse: number } {
  validateKey(key)
  const clean = key.toUpperCase().replace(/[^A-Z]/g, '')
  if (clean.length !== 4) {
    throw new CipherError(
      'INVALID_KEY_LENGTH',
      `Hill cipher key must contain exactly 4 letters to form a 2x2 matrix (got ${clean.length} letters from "${key}").`
    )
  }
  const v = clean.split('').map((c) => c.charCodeAt(0) - 65)
  const matrix: Matrix2x2 = [
    [v[0], v[1]],
    [v[2], v[3]],
  ]
  const det = mod(matrix[0][0] * matrix[1][1] - matrix[0][1] * matrix[1][0], 26)
  
  // Explicit coprimality check against modulus 26
  const commonFactor = gcd(det, 26)
  if (commonFactor !== 1) {
    throw new CipherError(
      'INVALID_KEY',
      `Key matrix determinant (${det}) is not coprime with 26 (gcd(${det}, 26) = ${commonFactor}). Common factor '${commonFactor}' prevents matrix inversion mod 26. Choose a key whose determinant is coprime with 26 — try "HILL", "GYBN", or "PQRS".`
    )
  }

  const detInverse = modInverse(det, 26)
  if (detInverse === null) {
    throw new CipherError(
      'INVALID_KEY',
      `Key matrix is not invertible mod 26 (determinant ${det} shares a factor with 26). Choose a key whose determinant is coprime with 26 — try "HILL", "GYBN", or "PQRS".`
    )
  }
  return { matrix, det, detInverse }
}

function invertMatrix(matrix: Matrix2x2, detInverse: number): Matrix2x2 {
  const adjugate: Matrix2x2 = [
    [matrix[1][1], mod(-matrix[0][1], 26)],
    [mod(-matrix[1][0], 26), matrix[0][0]],
  ]
  return [
    [mod(detInverse * adjugate[0][0], 26), mod(detInverse * adjugate[0][1], 26)],
    [mod(detInverse * adjugate[1][0], 26), mod(detInverse * adjugate[1][1], 26)],
  ]
}

// Uppercases, strips non-alphabetic characters, and pads with 'X' to an even length.
/**
 * Prepare Text cipher-engine utility export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @param input Input required by the Prepare Text operation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/46-3/final — FIPS 46-3.
 */
export function prepareText(input: string): string {
  let clean = input.toUpperCase().replace(/[^A-Z]/g, '')
  if (clean.length === 0) return clean
  if (clean.length % 2 !== 0) clean += 'X'
  return clean
}

function matrixToTable(matrix: Matrix2x2): string[][] {
  return [
    [String(matrix[0][0]), String(matrix[0][1])],
    [String(matrix[1][0]), String(matrix[1][1])],
  ]
}

function transformBlock(pair: [number, number], matrix: Matrix2x2): [number, number] {
  return [
    mod(matrix[0][0] * pair[0] + matrix[0][1] * pair[1], 26),
    mod(matrix[1][0] * pair[0] + matrix[1][1] * pair[1], 26),
  ]
}

function hillCore(input: string, key: string, decrypt: boolean, instrument: boolean): CipherResult {
  const start = performance.now()
  const { matrix, detInverse } = parseHillKey(key)
  const effectiveMatrix = decrypt ? invertMatrix(matrix, detInverse) : matrix
  const prepared = prepareText(input)
  const MAX_TRACED_BLOCKS = 60

  const steps: CipherStep[] = []
  if (instrument) {
    steps.push({
      index: 0,
      label: decrypt ? 'Key setup — invert matrix' : 'Key setup — key matrix',
      inputState: key.toUpperCase(),
      outputState: prepared,
      matrix: matrixToTable(effectiveMatrix),
      note: decrypt
        ? `Computed K^-1 mod 26 from the key matrix so ciphertext blocks can be mapped back to plaintext.`
        : `Read the key into a 2x2 matrix (row-major). Text is uppercased, non-letters stripped, and padded with 'X' if needed: "${prepared}".`,
      isMilestone: true,
    })
  }

  let output = ''
  const totalBlocks = Math.ceil(prepared.length / 2)
  for (let i = 0; i < prepared.length; i += 2) {
    const pIdx: [number, number] = [prepared.charCodeAt(i) - 65, prepared.charCodeAt(i + 1) - 65]
    const cIdx = transformBlock(pIdx, effectiveMatrix)
    const inChars = prepared[i] + prepared[i + 1]
    const outChars = String.fromCharCode(cIdx[0] + 65) + String.fromCharCode(cIdx[1] + 65)
    output += outChars

    const blockNum = i / 2 + 1
    if (instrument && blockNum <= MAX_TRACED_BLOCKS) {
      steps.push({
        index: steps.length,
        label: `Block ${blockNum} — '${inChars}'`,
        inputState: inChars,
        outputState: outChars,
        highlight: [i, i + 1],
        matrix: matrixToTable(effectiveMatrix),
        note: `[${pIdx[0]},${pIdx[1]}] -> K*v mod 26 = [${cIdx[0]},${cIdx[1]}] = '${outChars}'`,
      })
    }
  }

  if (instrument && totalBlocks > MAX_TRACED_BLOCKS) {
    steps.push({
      index: steps.length,
      label: `Remaining ${totalBlocks - MAX_TRACED_BLOCKS} blocks (summarized)`,
      inputState: '',
      outputState: '',
      note: 'The same matrix transform continues identically for the rest of the text — omitted from the trace to stay within the step budget.',
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

/**
 * Encrypt cipher-engine utility export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @param input Input required by the Encrypt operation.
 * @param key Input required by the Encrypt operation.
 * @param options Input required by the Encrypt operation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/46-3/final — FIPS 46-3.
 */
export function encrypt(input: string, key: string, options: CipherOptions = {}): CipherResult {
  validateInput(input)
  return hillCore(input, key, false, !!options.instrument)
}

/**
 * Decrypt cipher-engine utility export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @param input Input required by the Decrypt operation.
 * @param key Input required by the Decrypt operation.
 * @param options Input required by the Decrypt operation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/46-3/final — FIPS 46-3.
 */
export function decrypt(input: string, key: string, options: CipherOptions = {}): CipherResult {
  validateInput(input)
  return hillCore(input, key, true, !!options.instrument)
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
  {
    input: 'HELP',
    key: 'HILL',
    expected: 'DRPA',
    description: 'Classic 2x2 Hill cipher, key matrix [[7,8],[11,11]]',
  },
  {
    input: 'ATTACK AT DAWN',
    key: 'HILL',
    expected: 'WBDBQCWBVHYV',
    description: 'Multi-block vector (spaces stripped): "ATTACKATDAWN" -> 6 blocks',
  },
]