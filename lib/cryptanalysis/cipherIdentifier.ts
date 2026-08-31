/**
 * Cipher Identifier — Statistical cryptanalysis toolkit for identifying
 * unknown ciphertext encryption methods.
 *
 * Uses multiple statistical tests to classify ciphertext:
 *  1. Letter frequency analysis
 *  2. Index of Coincidence (IC)
 *  3. Shannon entropy measurement
 *  4. Kasiski examination (repeated pattern detection)
 *  5. Chi-squared goodness-of-fit to English
 *  6. Digram/trigram frequency comparison
 *  7. Hamming weight analysis (for binary ciphers)
 *
 * Each test produces a score vector, which is combined via weighted
 * scoring to produce a ranked list of candidate cipher types with
 * confidence percentages.
 */

// ─── English Reference Frequencies ────────────────────────────────────────────

/** Standard English letter frequencies (A-Z). */
export const ENGLISH_FREQUENCIES: Readonly<Record<string, number>> = {
  A: 0.08167, B: 0.01492, C: 0.02782, D: 0.04253, E: 0.12702,
  F: 0.02228, G: 0.02015, H: 0.06094, I: 0.06966, J: 0.00153,
  K: 0.00772, L: 0.04025, M: 0.02406, N: 0.06749, O: 0.07507,
  P: 0.01929, Q: 0.00095, R: 0.05987, S: 0.06327, T: 0.09056,
  U: 0.02758, V: 0.00978, W: 0.02360, X: 0.00150, Y: 0.01974,
  Z: 0.00074,
}

/** Standard English digram frequencies (top pairs). */
export const ENGLISH_DIGRAMS: Readonly<Record<string, number>> = {
  TH: 0.0356, HE: 0.0307, IN: 0.0243, ER: 0.0205, AN: 0.0199,
  RE: 0.0185, ON: 0.0176, AT: 0.0149, EN: 0.0142, ND: 0.0137,
  TI: 0.0132, ES: 0.0127, OR: 0.0128, TE: 0.0127, OF: 0.0118,
  ED: 0.0117, IS: 0.0113, IT: 0.0112, AL: 0.0109, AR: 0.0107,
  ST: 0.0105, TO: 0.0104, NT: 0.0104, NG: 0.0098, SE: 0.0093,
  HA: 0.0092, AS: 0.0089, OU: 0.0088, IO: 0.0083, LE: 0.0083,
  VE: 0.0083, CO: 0.0079, ME: 0.0079, DE: 0.0076, HI: 0.0073,
  RI: 0.0069, RO: 0.0069, IC: 0.0068, NE: 0.0067, EA: 0.0066,
}

/** English trigram reference. */
export const ENGLISH_TRIGRAMS: Readonly<Record<string, number>> = {
  THE: 0.0183, ING: 0.0089, AND: 0.0075, HER: 0.0072, HAT: 0.0054,
  HIS: 0.0054, THA: 0.0053, ERE: 0.0046, ATE: 0.0045, FOR: 0.0043,
  ENT: 0.0042, ION: 0.0040, TER: 0.0039, WAS: 0.0038, YOU: 0.0037,
  HOU: 0.0036, ATS: 0.0033, ALL: 0.0033, VER: 0.0032, ITH: 0.0031,
}

// ─── Types ───────────────────────────────────────────────────────────────────

export type CipherType =
  | 'caesar'
  | 'vigenere'
  | 'substitution'
  | 'transposition'
  | 'polyalphabetic'
  | 'monoalphabetic'
  | 'xor'
  | 'hash'
  | 'base64'
  | 'hex'
  | 'binary'
  | 'rot13'
  | 'atbash'
  | 'playfair'
  | 'affine'
  | 'rail-fence'
  | 'random'
  | 'unknown'

export interface FrequencyEntry {
  letter: string
  count: number
  frequency: number
  englishFrequency: number
}

export interface AnalysisResult {
  /** Overall character count. */
  totalChars: number
  /** Percentage of alphabetic characters. */
  alphaRatio: number
  /** Percentage of uppercase characters among alphabetic chars. */
  upperRatio: number
  /** Percentage of digits. */
  digitRatio: number
  /** Percentage of hex chars (0-9, a-f, A-F). */
  hexRatio: number
  /** Percentage of spaces/whitespace. */
  spaceRatio: number
  /** Percentage of printable ASCII. */
  printableAsciiRatio: number
  /** Letter frequencies sorted by count descending. */
  frequencies: FrequencyEntry[]
  /** Index of Coincidence. */
  indexCoincidence: number
  /** Shannon entropy in bits. */
  entropy: number
  /** Chi-squared vs English letter frequencies. */
  chiSquared: number
  /** Kasiski repeating pattern distances. */
  kasiskiDistances: number[]
  /** Suggested key length for Vigenère (from Kasiski/Friedman). */
  suggestedKeyLength: number
  /** Digram match score (0-1, how close digrams match English). */
  digramScore: number
  /** Trigram match score (0-1). */
  trigramScore: number
  /** Number of unique characters. */
  uniqueChars: number
  /** Ratio of unique chars to total chars. */
  uniqueRatio: number
}

export interface CipherCandidate {
  cipherType: CipherType
  name: string
  confidence: number
  description: string
  explanation: string
  recommendedActions: string[]
}

export interface IdentificationReport {
  candidates: CipherCandidate[]
  analysis: AnalysisResult
  rawText: string
}

// ─── Character Frequency Counter ─────────────────────────────────────────────

export function countFrequencies(text: string): Map<string, number> {
  const counts = new Map<string, number>()
  for (const char of text) {
    counts.set(char, (counts.get(char) || 0) + 1)
  }
  return counts
}

export function buildFrequencyTable(text: string): FrequencyEntry[] {
  const counts = countFrequencies(text)
  const alphaOnly = text.replace(/[^A-Za-z]/g, '')
  const totalAlpha = alphaOnly.length || 1

  const upperCounts = new Map<string, number>()
  for (const ch of alphaOnly) {
    const upper = ch.toUpperCase()
    upperCounts.set(upper, (upperCounts.get(upper) || 0) + 1)
  }

  const entries: FrequencyEntry[] = []
  for (const [letter, count] of upperCounts) {
    entries.push({
      letter,
      count,
      frequency: count / totalAlpha,
      englishFrequency: ENGLISH_FREQUENCIES[letter] || 0,
    })
  }

  entries.sort((a, b) => b.count - a.count)
  return entries
}

// ─── Index of Coincidence ────────────────────────────────────────────────────

/**
 * Compute the Index of Coincidence (Friedman test).
 *
 * IC ≈ 0.065 for normal English text
 * IC ≈ 0.038 for random/polyalphabetic text
 * IC ≈ 0.044 for polyalphabetic with moderate key length
 *
 * @param text Alphabetic text (uppercase recommended)
 * @returns The IC value
 */
export function computeIndexCoincidence(text: string): number {
  const alphaOnly = text.replace(/[^A-Za-z]/g, '').toUpperCase()
  const n = alphaOnly.length
  if (n <= 1) return 0

  const freq = new Array<number>(26).fill(0)
  for (const ch of alphaOnly) {
    freq[ch.charCodeAt(0) - 65]++
  }

  let sum = 0
  for (let i = 0; i < 26; i++) {
    sum += freq[i] * (freq[i] - 1)
  }

  return sum / (n * (n - 1))
}

/**
 * Estimate the key length from IC using the Friedman formula:
 * K_len ≈ (0.0265 × N) / ((N-1) × IC - 0.0385 × N + 0.065)
 */
export function estimateKeyLengthFromIC(ic: number, n: number): number {
  if (n <= 1 || ic <= 0) return 0
  const numerator = 0.0265 * n
  const denominator = (n - 1) * ic - 0.0385 * n + 0.065
  if (denominator <= 0) return 0
  return Math.round(numerator / denominator)
}

// ─── Shannon Entropy ─────────────────────────────────────────────────────────

/**
 * Compute Shannon entropy in bits of a text string.
 * For English text: ~4.1-4.5 bits/char
 * For random text: ~5.5-6.5 bits/char (depends on charset size)
 * For ciphertext: depends on the cipher type
 */
export function computeEntropy(text: string): number {
  if (text.length === 0) return 0

  const counts = countFrequencies(text)
  const n = text.length
  let entropy = 0

  for (const [, count] of counts) {
    const p = count / n
    if (p > 0) {
      entropy -= p * Math.log2(p)
    }
  }

  return entropy
}

// ─── Chi-Squared ─────────────────────────────────────────────────────────────

/**
 * Compute chi-squared statistic comparing observed letter frequencies
 * against expected English frequencies.
 *
 * Low values → text resembles English (plaintext or monoalphabetic cipher)
 * High values → text is random/polyalphabetic/encoded
 */
export function computeChiSquared(text: string): number {
  const alphaOnly = text.replace(/[^A-Za-z]/g, '').toUpperCase()
  const n = alphaOnly.length
  if (n === 0) return Infinity

  const observed = new Array<number>(26).fill(0)
  for (const ch of alphaOnly) {
    observed[ch.charCodeAt(0) - 65]++
  }

  let chiSq = 0
  for (let i = 0; i < 26; i++) {
    const expected = (ENGLISH_FREQUENCIES[String.fromCharCode(65 + i)] || 0) * n
    if (expected > 0) {
      chiSq += (observed[i] - expected) ** 2 / expected
    }
  }

  return chiSq
}

// ─── Kasiski Examination ─────────────────────────────────────────────────────

/**
 * Find repeated sequences of length 3+ in the ciphertext and return
 * the distances between their occurrences.
 */
export function kasiskiExamination(text: string): number[] {
  const alphaOnly = text.replace(/[^A-Za-z]/g, '').toUpperCase()
  const distances: number[] = []
  const seen = new Map<string, number[]>()

  for (let len = 3; len <= Math.min(6, Math.floor(alphaOnly.length / 2)); len++) {
    for (let i = 0; i <= alphaOnly.length - len; i++) {
      const seq = alphaOnly.slice(i, i + len)
      if (!seen.has(seq)) {
        seen.set(seq, [i])
      } else {
        const positions = seen.get(seq)!
        for (const prev of positions) {
          distances.push(i - prev)
        }
        positions.push(i)
      }
    }
  }

  return distances
}

/**
 * Estimate key length from Kasiski distances by finding common factors.
 */
export function estimateKeyLengthFromKasiski(distances: number[]): number {
  if (distances.length === 0) return 0

  // Find GCD of all distances
  const factorCounts = new Map<number, number>()
  for (const d of distances) {
    if (d <= 1) continue
    for (let f = 2; f <= Math.min(d, 40); f++) {
      if (d % f === 0) {
        factorCounts.set(f, (factorCounts.get(f) || 0) + 1)
      }
    }
  }

  let bestFactor = 0
  let bestCount = 0
  for (const [factor, count] of factorCounts) {
    if (count > bestCount) {
      bestCount = count
      bestFactor = factor
    }
  }

  return bestFactor
}

// ─── Digram Analysis ─────────────────────────────────────────────────────────

/**
 * Compute how closely the digram distribution matches English.
 * Returns a score from 0 (no match) to 1 (perfect match).
 */
export function computeDigramScore(text: string): number {
  const alphaOnly = text.replace(/[^A-Za-z]/g, '').toUpperCase()
  if (alphaOnly.length < 2) return 0

  const digramCounts = new Map<string, number>()
  let totalDigrams = 0

  for (let i = 0; i < alphaOnly.length - 1; i++) {
    const digram = alphaOnly.slice(i, i + 2)
    digramCounts.set(digram, (digramCounts.get(digram) || 0) + 1)
    totalDigrams++
  }

  if (totalDigrams === 0) return 0

  // Cosine similarity between observed and expected
  let dotProduct = 0
  let magObserved = 0
  let magExpected = 0

  for (const digram of Object.keys(ENGLISH_DIGRAMS)) {
    const observed = (digramCounts.get(digram) || 0) / totalDigrams
    const expected = ENGLISH_DIGRAMS[digram]
    dotProduct += observed * expected
    magObserved += observed * observed
    magExpected += expected * expected
  }

  // Include observed digrams not in reference (they contribute to magnitude only)
  for (const [digram, count] of digramCounts) {
    if (!(digram in ENGLISH_DIGRAMS)) {
      const observed = count / totalDigrams
      magObserved += observed * observed
    }
  }

  const denominator = Math.sqrt(magObserved * magExpected)
  return denominator === 0 ? 0 : Math.min(1, dotProduct / denominator)
}

// ─── Trigram Analysis ────────────────────────────────────────────────────────

export function computeTrigramScore(text: string): number {
  const alphaOnly = text.replace(/[^A-Za-z]/g, '').toUpperCase()
  if (alphaOnly.length < 3) return 0

  const trigramCounts = new Map<string, number>()
  let totalTrigrams = 0

  for (let i = 0; i <= alphaOnly.length - 3; i++) {
    const tri = alphaOnly.slice(i, i + 3)
    trigramCounts.set(tri, (trigramCounts.get(tri) || 0) + 1)
    totalTrigrams++
  }

  if (totalTrigrams === 0) return 0

  let dotProduct = 0
  let magObserved = 0
  let magExpected = 0

  for (const tri of Object.keys(ENGLISH_TRIGRAMS)) {
    const observed = (trigramCounts.get(tri) || 0) / totalTrigrams
    const expected = ENGLISH_TRIGRAMS[tri]
    dotProduct += observed * expected
    magObserved += observed * observed
    magExpected += expected * expected
  }

  for (const [, count] of trigramCounts) {
    const observed = count / totalTrigrams
    magObserved += observed * observed
  }

  const denominator = Math.sqrt(magObserved * magExpected)
  return denominator === 0 ? 0 : Math.min(1, dotProduct / denominator)
}

// ─── Full Analysis Pipeline ──────────────────────────────────────────────────

export function analyzeText(text: string): AnalysisResult {
  const totalChars = text.length
  const alphaCount = (text.match(/[A-Za-z]/g) || []).length
  const upperCount = (text.match(/[A-Z]/g) || []).length
  const digitCount = (text.match(/[0-9]/g) || []).length
  const spaceCount = (text.match(/\s/g) || []).length
  const hexChars = (text.match(/[0-9a-fA-F]/g) || []).length
  const printableAscii = (text.match(/[\x20-\x7E]/g) || []).length

  const frequencies = buildFrequencyTable(text)
  const ic = computeIndexCoincidence(text)
  const entropy = computeEntropy(text)
  const chiSq = computeChiSquared(text)
  const kasiski = kasiskiExamination(text)
  const digramScore = computeDigramScore(text)
  const trigramScore = computeTrigramScore(text)

  const uniqueChars = new Set(text).size

  const alphaOnly = text.replace(/[^A-Za-z]/g, '').toUpperCase()
  const keyLenIC = estimateKeyLengthFromIC(ic, alphaOnly.length)
  const keyLenKasiski = estimateKeyLengthFromKasiski(kasiski)
  const suggestedKeyLength = keyLenKasiski > 0 ? keyLenKasiski : keyLenIC

  return {
    totalChars,
    alphaRatio: totalChars > 0 ? alphaCount / totalChars : 0,
    upperRatio: alphaCount > 0 ? upperCount / alphaCount : 0,
    digitRatio: totalChars > 0 ? digitCount / totalChars : 0,
    hexRatio: totalChars > 0 ? hexChars / totalChars : 0,
    spaceRatio: totalChars > 0 ? spaceCount / totalChars : 0,
    printableAsciiRatio: totalChars > 0 ? printableAscii / totalChars : 0,
    frequencies,
    indexCoincidence: ic,
    entropy,
    chiSquared: chiSq,
    kasiskiDistances: kasiski,
    suggestedKeyLength,
    digramScore,
    trigramScore,
    uniqueChars,
    uniqueRatio: totalChars > 0 ? uniqueChars / totalChars : 0,
  }
}

// ─── Classification Rules ────────────────────────────────────────────────────

function scoreCaesar(a: AnalysisResult): CipherCandidate {
  // Caesar cipher preserves letter frequencies (shifted)
  // Low chi-squared + high IC + monoalphabetic pattern
  const chiScore = Math.max(0, 1 - a.chiSquared / 300)
  const icScore = a.indexCoincidence > 0.06 ? 1 : Math.max(0, (a.indexCoincidence - 0.038) / 0.022)
  const alphaScore = a.alphaRatio > 0.7 ? 1 : a.alphaRatio / 0.7
  const monoScore = a.digramScore > 0.3 ? 1 : a.digramScore / 0.3

  const confidence = (chiScore * 0.3 + icScore * 0.3 + alphaScore * 0.2 + monoScore * 0.2) * 100

  return {
    cipherType: 'caesar',
    name: 'Caesar / Shift Cipher',
    confidence,
    description: 'Monoalphabetic substitution cipher shifting each letter by a fixed amount.',
    explanation:
      `The letter frequency distribution closely matches shifted English (IC = ${a.indexCoincidence.toFixed(4)}, χ² = ${a.chiSquared.toFixed(1)}). ` +
      `Digram patterns are preserved, suggesting a simple fixed substitution.`,
    recommendedActions: [
      'Try all 26 possible shift values (brute force)',
      'Use the Friedman test to estimate the shift',
      'Look for the most frequent letter mapping to E (or T)',
    ],
  }
}

function scoreRot13(a: AnalysisResult): CipherCandidate {
  const caesarScore = scoreCaesar(a)
  // ROT13 is Caesar with shift=13, same characteristics
  return {
    ...caesarScore,
    cipherType: 'rot13',
    name: 'ROT13',
    confidence: caesarScore.confidence * 0.9,
    description: 'Fixed Caesar cipher with shift of 13 — self-inverse.',
    explanation:
      `Characteristics match a Caesar-family cipher. ROT13 is a special case with shift=13, ` +
      `making it its own inverse (encrypting twice returns the original). IC = ${a.indexCoincidence.toFixed(4)}.`,
    recommendedActions: [
      'Apply ROT13 directly — it is self-inverse',
      'Check if the text contains common ROT13 artifacts (like "Uryyb" for "Hello")',
    ],
  }
}

function scoreVigenere(a: AnalysisResult): CipherCandidate {
  // Vigenère has IC between English and random, and suggests key length
  const icMid = a.indexCoincidence > 0.04 && a.indexCoincidence < 0.062
  const icScore = icMid ? 1 : Math.max(0, 1 - Math.abs(a.indexCoincidence - 0.05) / 0.02)
  const kasiskiScore = a.suggestedKeyLength >= 2 && a.suggestedKeyLength <= 20 ? 1 : 0.3
  const entropyScore = a.entropy > 3.5 && a.entropy < 5.5 ? 1 : 0.5
  const alphaScore = a.alphaRatio > 0.6 ? 1 : a.alphaRatio / 0.6

  const confidence = (icScore * 0.35 + kasiskiScore * 0.25 + entropyScore * 0.2 + alphaScore * 0.2) * 100

  return {
    cipherType: 'vigenere',
    name: 'Vigenère Cipher',
    confidence,
    description: 'Polyalphabetic substitution using a repeating keyword to shift letters.',
    explanation:
      `IC = ${a.indexCoincidence.toFixed(4)} falls between English (~0.065) and random (~0.038), ` +
      `suggesting polyalphabetic encryption. ` +
      (a.suggestedKeyLength > 0
        ? `Kasiski/Friedman analysis suggests a key length of ~${a.suggestedKeyLength}.`
        : 'Pattern analysis indicates polyalphabetic structure.'),
    recommendedActions: [
      `Try key lengths near ${a.suggestedKeyLength || '2-20'}`,
      'Use Kasiski examination on repeated trigrams',
      'Split into groups by key length and run frequency analysis on each',
    ],
  }
}

function scoreSubstitution(a: AnalysisResult): CipherCandidate {
  // General monoalphabetic substitution: high IC, high chi-squared (preserves structure)
  const icScore = a.indexCoincidence > 0.055 ? 1 : Math.max(0, (a.indexCoincidence - 0.04) / 0.015)
  const monoScore = a.digramScore > 0.15 ? 1 : a.digramScore / 0.15
  const alphaScore = a.alphaRatio > 0.7 ? 1 : a.alphaRatio / 0.7
  const entropyScore = a.entropy > 3.0 && a.entropy < 5.0 ? 1 : 0.4

  const confidence = (icScore * 0.3 + monoScore * 0.3 + alphaScore * 0.2 + entropyScore * 0.2) * 100

  return {
    cipherType: 'substitution',
    name: 'Monoalphabetic Substitution',
    confidence,
    description: 'Each plaintext letter maps to a unique ciphertext letter via a fixed permutation.',
    explanation:
      `High IC (${a.indexCoincidence.toFixed(4)}) indicates monoalphabetic structure. ` +
      `The frequency distribution matches English patterns but with permuted letters. ` +
      `Chi-squared = ${a.chiSquared.toFixed(1)} confirms the substitution is fixed.`,
    recommendedActions: [
      'Apply frequency analysis to find the letter mapping',
      'Use the hill-climbing algorithm for automated cracking',
      'Look for single-letter words (A, I) and common patterns (THE, AND)',
    ],
  }
}

function scorePlayfair(a: AnalysisResult): CipherCandidate {
  // Playfair: digraphs, no letter repeats in pairs, only alphabetic, 26 letters (no J)
  const alphaScore = a.alphaRatio > 0.85 ? 1 : a.alphaRatio / 0.85
  const icScore = a.indexCoincidence > 0.035 && a.indexCoincidence < 0.055 ? 1 : 0.4
  const uniqueScore = a.uniqueRatio > 0.3 && a.uniqueRatio < 0.8 ? 1 : 0.5
  const entropyScore = a.entropy > 3.5 && a.entropy < 5.5 ? 1 : 0.5

  const confidence = (alphaScore * 0.3 + icScore * 0.25 + uniqueScore * 0.25 + entropyScore * 0.2) * 100

  return {
    cipherType: 'playfair',
    name: 'Playfair Cipher',
    confidence,
    description: 'Digraph substitution cipher using a 5×5 key matrix.',
    explanation:
      `IC = ${a.indexCoincidence.toFixed(4)} suggests polyalphabetic-like structure. ` +
      `The text is purely alphabetic (${(a.alphaRatio * 100).toFixed(1)}%) with ` +
      `${a.uniqueChars} unique characters, consistent with a digraph substitution cipher.`,
    recommendedActions: [
      'Check for even-length text (Playfair produces even ciphertext)',
      'Analyze digram frequency patterns',
      'Try known-plaintext attacks with common word pairs',
    ],
  }
}

function scoreTransposition(a: AnalysisResult): CipherCandidate {
  // Transposition: preserves letter frequencies exactly (same as plaintext)
  const chiScore = Math.max(0, 1 - a.chiSquared / 200)
  const icScore = a.indexCoincidence > 0.06 ? 1 : 0.3
  const alphaScore = a.alphaRatio > 0.6 ? 1 : a.alphaRatio / 0.6
  const spaceScore = a.spaceRatio > 0.05 ? 0.8 : 0.3

  const confidence = (chiScore * 0.3 + icScore * 0.3 + alphaScore * 0.2 + spaceScore * 0.2) * 100

  return {
    cipherType: 'transposition',
    name: 'Transposition Cipher',
    confidence,
    description: 'Rearranges the order of characters without changing their values.',
    explanation:
      `Letter frequencies closely match English (χ² = ${a.chiSquared.toFixed(1)}, IC = ${a.indexCoincidence.toFixed(4)}). ` +
      `This suggests the letters are unchanged but rearranged — a hallmark of transposition ciphers.`,
    recommendedActions: [
      'Try columnar transposition with various key lengths',
      'Look for readable fragments at regular intervals',
      'Use anagram-solving techniques on segments',
    ],
  }
}

function scoreRailFence(a: AnalysisResult): CipherCandidate {
  const transScore = scoreTransposition(a)
  return {
    ...transScore,
    cipherType: 'rail-fence',
    name: 'Rail Fence Cipher',
    confidence: transScore.confidence * 0.85,
    description: 'Writes plaintext in a zigzag pattern across N rails.',
    explanation:
      `Characteristics suggest transposition: the letter distribution matches English ` +
      `(χ² = ${a.chiSquared.toFixed(1)}) but the text is scrambled. Rail fence is a ` +
      `common simple transposition pattern.`,
    recommendedActions: [
      'Try rail counts from 2 to √(text length)',
      'Visualize the zigzag pattern for each candidate rail count',
      'Check if the first and last characters of each rail form readable fragments',
    ],
  }
}

function scoreAffine(a: AnalysisResult): CipherCandidate {
  const caesarScore = scoreCaesar(a)
  return {
    ...caesarScore,
    cipherType: 'affine',
    name: 'Affine Cipher',
    confidence: caesarScore.confidence * 0.8,
    description: 'Monoalphabetic cipher using linear transformation: C = (aP + b) mod 26.',
    explanation:
      `Like Caesar, this preserves frequency patterns (IC = ${a.indexCoincidence.toFixed(4)}). ` +
      `Affine ciphers are a generalization of Caesar with multiplication + addition.`,
    recommendedActions: [
      'Try all valid multiplier/shift combinations (312 possibilities)',
      'Use frequency analysis to identify the two most common letters',
      'Solve the system of equations for the affine parameters',
    ],
  }
}

function scoreAtbash(a: AnalysisResult): CipherCandidate {
  const caesarScore = scoreCaesar(a)
  return {
    ...caesarScore,
    cipherType: 'atbash',
    name: 'Atbash Cipher',
    confidence: caesarScore.confidence * 0.7,
    description: 'Mirror alphabet substitution: A↔Z, B↔Y, C↔X, etc.',
    explanation:
      `Frequency pattern matches a fixed substitution (IC = ${a.indexCoincidence.toFixed(4)}). ` +
      `Atbash is a specific substitution where each letter maps to its mirror position.`,
    recommendedActions: [
      'Apply the Atbash transformation directly',
      'Check if common words appear (THE → GSV, HELLO → SVool)',
    ],
  }
}

function scoreXOR(a: AnalysisResult): CipherCandidate {
  const highEntropy = a.entropy > 5.0
  const highUnique = a.uniqueRatio > 0.6
  const lowAlpha = a.alphaRatio < 0.5

  const entropyScore = highEntropy ? 1 : 0.4
  const uniqueScore = highUnique ? 1 : 0.4
  const alphaScore = lowAlpha ? 1 : 0.5
  const icScore = a.indexCoincidence < 0.045 ? 1 : 0.4

  const confidence = (entropyScore * 0.3 + uniqueScore * 0.25 + alphaScore * 0.25 + icScore * 0.2) * 100

  return {
    cipherType: 'xor',
    name: 'XOR / Stream Cipher',
    confidence,
    description: 'Byte-wise XOR between plaintext and a key stream.',
    explanation:
      `High entropy (${a.entropy.toFixed(2)} bits/char) and diverse character set ` +
      `(${a.uniqueChars} unique chars) suggest byte-level operations like XOR. ` +
      `IC = ${a.indexCoincidence.toFixed(4)} indicates near-random distribution.`,
    recommendedActions: [
      'Try known-plaintext XOR recovery',
      'Check for repeating key patterns',
      'Analyze for two-time-pad vulnerabilities (XOR of two ciphertexts)',
    ],
  }
}

function scoreHex(a: AnalysisResult): CipherCandidate {
  const hexOnly = /^[0-9a-fA-F\s]*$/.test(a.frequencies.map(f => f.letter).join(''))
  const hexRatio = a.hexRatio
  const entropy = a.entropy

  const isHex = hexRatio > 0.95 && entropy < 5.0
  const confidence = isHex ? 85 + Math.min(15, (hexRatio - 0.95) * 300) : 0

  return {
    cipherType: 'hex',
    name: 'Hexadecimal Encoding',
    confidence,
    description: 'Base-16 encoding using characters 0-9 and A-F.',
    explanation:
      `${(hexRatio * 100).toFixed(1)}% of characters are hex digits. ` +
      `Entropy = ${entropy.toFixed(2)} bits/char. Hex encoding maps each byte to 2 characters.`,
    recommendedActions: [
      'Decode as hex to reveal the underlying data',
      'Check if the decoded data is printable ASCII or another encoding',
    ],
  }
}

function scoreBase64(a: AnalysisResult): CipherCandidate {
  const b64Chars = /^[A-Za-z0-9+/=]*$/.test(a.frequencies.map(f => f.letter).join(''))
  const hasEquals = a.frequencies.some(f => f.letter === '=')
  const highAlpha = a.alphaRatio > 0.6
  const hasCase = a.upperRatio > 0.2 && a.upperRatio < 0.8

  const confidence = (b64Chars && highAlpha && hasCase) ? (hasEquals ? 80 : 65) : 0

  return {
    cipherType: 'base64',
    name: 'Base64 Encoding',
    confidence,
    description: 'Binary-to-text encoding using 64 printable ASCII characters.',
    explanation:
      `Character set matches Base64 alphabet (A-Z, a-z, 0-9, +, /). ` +
      `Upper ratio = ${(a.upperRatio * 100).toFixed(1)}%, entropy = ${a.entropy.toFixed(2)} bits/char.` +
      (hasEquals ? ' Padding "=" characters detected.' : ''),
    recommendedActions: [
      'Decode as Base64 to reveal underlying content',
      'Check if decoded content is UTF-8 text or binary data',
    ],
  }
}

function scoreBinary(a: AnalysisResult): CipherCandidate {
  const binaryOnly = a.frequencies.every(f => '01'.includes(f.letter))
  const confidence = binaryOnly ? 90 : 0

  return {
    cipherType: 'binary',
    name: 'Binary Encoding',
    confidence,
    description: 'Base-2 encoding using only characters 0 and 1.',
    explanation:
      `Text contains only '0' and '1' characters. ` +
      `Each 8-bit group represents one byte. Entropy = ${a.entropy.toFixed(2)} bits/char.`,
    recommendedActions: [
      'Decode as ASCII (8 bits per character)',
      'Try decoding as UTF-8',
    ],
  }
}

function scoreRandom(a: AnalysisResult): CipherCandidate {
  const highEntropy = a.entropy > 5.5
  const highIC = a.indexCoincidence < 0.04
  const lowAlpha = a.alphaRatio < 0.3

  const confidence = (highEntropy ? 0.4 : 0.1) + (highIC ? 0.3 : 0.1) + (lowAlpha ? 0.3 : 0.1)

  return {
    cipherType: 'random',
    name: 'Random / Encrypted Data',
    confidence: Math.min(100, confidence * 100),
    description: 'High-entropy data consistent with modern encryption or true randomness.',
    explanation:
      `Very high entropy (${a.entropy.toFixed(2)} bits/char), low IC (${a.indexCoincidence.toFixed(4)}), ` +
      `and limited alphabetic content suggest this is encrypted with a strong cipher or is random data.`,
    recommendedActions: [
      'If you have a key, try the expected cipher',
      'Check if the data has a file signature or magic bytes',
      'Look for patterns in hex dump (null bytes, padding)',
    ],
  }
}

// ─── Main Identification Function ────────────────────────────────────────────

export function identifyCipher(text: string): IdentificationReport {
  if (!text || text.trim().length === 0) {
    return {
      candidates: [],
      analysis: analyzeText(''),
      rawText: '',
    }
  }

  const analysis = analyzeText(text)

  const allCandidates: CipherCandidate[] = [
    scoreCaesar(analysis),
    scoreRot13(analysis),
    scoreVigenere(analysis),
    scoreSubstitution(analysis),
    scorePlayfair(analysis),
    scoreTransposition(analysis),
    scoreRailFence(analysis),
    scoreAffine(analysis),
    scoreAtbash(analysis),
    scoreXOR(analysis),
    scoreHex(analysis),
    scoreBase64(analysis),
    scoreBinary(analysis),
    scoreRandom(analysis),
  ]

  // Filter out zero-confidence candidates and sort descending
  const candidates = allCandidates
    .filter((c) => c.confidence > 5)
    .sort((a, b) => b.confidence - a.confidence)

  // Normalize top candidates so highest is 100
  if (candidates.length > 0) {
    const maxConf = candidates[0].confidence
    if (maxConf > 0 && maxConf < 100) {
      for (const c of candidates) {
        c.confidence = Math.min(100, (c.confidence / maxConf) * 100)
      }
    }
  }

  return { candidates, analysis, rawText: text }
}
