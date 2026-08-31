/**
 * Substitution Cipher Breaker — Automated cryptanalysis for
 * monoalphabetic substitution ciphers.
 *
 * Uses three complementary approaches:
 *  1. Frequency Analysis: Map most frequent ciphertext letters to expected
 *     English frequencies (E, T, A, O, I, N, S, H, R...)
 *  2. Hill Climbing: Iteratively improve a key mapping by swapping letter
 *     assignments and scoring with quadgram log-likelihood
 *  3. Simulated Annealing: Escape local optima with temperature-controlled
 *     random acceptance of worse candidates
 *
 * The breaker produces ranked candidate decryptions with fitness scores,
 * convergence history, and intermediate mapping visualizations.
 */

import { scoreQuadgrams } from "@/lib/math/quadgrams";

// ─── Types ───────────────────────────────────────────────────────────────────

export type SubstitutionKey = string // 26-char string: ciphertext alphabet mapping

export interface BreakerConfig {
  /** Maximum hill-climb iterations per restart */
  maxIterations: number
  /** Number of random restarts */
  numRestarts: number
  /** Swaps per iteration in hill climbing */
  swapsPerStep: number
  /** Initial temperature for simulated annealing */
  initialTemperature: number
  /** Cooling rate (multiplied each iteration) */
  coolingRate: number
  /** Minimum temperature to stop annealing */
  minTemperature: number
  /** Number of top candidates to return */
  topCandidates: number
}

export const DEFAULT_CONFIG: BreakerConfig = {
  maxIterations: 2000,
  numRestarts: 5,
  swapsPerStep: 50,
  initialTemperature: 1.0,
  coolingRate: 0.995,
  minTemperature: 0.01,
  topCandidates: 5,
}

export interface CandidateResult {
  /** The substitution key used (ciphertext → plaintext mapping) */
  key: SubstitutionKey
  /** Decrypted plaintext */
  plaintext: string
  /** Quadgram fitness score (higher = more English-like) */
  score: number
  /** Which restart produced this candidate */
  restartIndex: number
  /** Final iteration number */
  iterations: number
  /** Whether the run was stopped early */
  converged: boolean
}

export interface ConvergencePoint {
  iteration: number
  score: number
  temperature: number
}

export interface BreakerResult {
  /** Top N candidate decryptions, sorted by score descending */
  candidates: CandidateResult[]
  /** The single best result */
  best: CandidateResult
  /** Convergence history from the best restart */
  convergenceHistory: ConvergencePoint[]
  /** The original ciphertext */
  ciphertext: string
  /** The alphabetic-only version of the ciphertext */
  cleanCiphertext: string
  /** Total wall-clock time in ms */
  durationMs: number
  /** Total iterations across all restarts */
  totalIterations: number
  /** The initial frequency-analysis seed key */
  initialKey: SubstitutionKey
}

// ─── Alphabet Utilities ──────────────────────────────────────────────────────

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"

/** Create the identity mapping: A→A, B→B, ... */
export function identityKey(): SubstitutionKey {
  return ALPHABET
}

/** Create a random permutation of the alphabet. */
export function randomKey(): SubstitutionKey {
  const arr = ALPHABET.split("")
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr.join("")
}

/**
 * Apply a substitution key to ciphertext.
 * The key maps ciphertext letters → plaintext letters.
 * key[0] is what ciphertext 'A' decrypts to, etc.
 */
export function applyKey(ciphertext: string, key: SubstitutionKey): string {
  return ciphertext
    .toUpperCase()
    .split("")
    .map((ch) => {
      const idx = ALPHABET.indexOf(ch)
      return idx !== -1 ? key[idx] : ch
    })
    .join("")
}

/**
 * Swap two random positions in a key to produce a neighbor.
 */
export function swapKey(key: SubstitutionKey): SubstitutionKey {
  const arr = key.split("")
  const i = Math.floor(Math.random() * 26)
  let j = Math.floor(Math.random() * 26)
  while (j === i) j = Math.floor(Math.random() * 26)
  const temp = arr[i]
  arr[i] = arr[j]
  arr[j] = temp
  return arr.join("")
}

/**
 * Score a key against the ciphertext using quadgram log-likelihood.
 */
export function scoreKey(ciphertext: string, key: SubstitutionKey): number {
  const plaintext = applyKey(ciphertext, key)
  return scoreQuadgrams(plaintext)
}

// ─── Frequency Analysis Seed ─────────────────────────────────────────────────

/** Standard English letter frequencies (E most common). */
const ENGLISH_FREQ_ORDER = "ETAOINSHRDLCUMWFGYPBVKJXQZ"

/**
 * Build an initial key by mapping the most frequent ciphertext letters
 * to the most frequent English letters.
 */
export function frequencyAnalysisSeed(ciphertext: string): SubstitutionKey {
  const clean = ciphertext.toUpperCase().replace(/[^A-Z]/g, "")
  if (clean.length === 0) return identityKey()

  // Count frequencies
  const freq = new Map<string, number>()
  for (const ch of clean) {
    freq.set(ch, (freq.get(ch) || 0) + 1)
  }

  // Sort ciphertext letters by frequency (descending)
  const sortedCiphertext = [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([ch]) => ch)

  // Build mapping: most frequent cipher letter → most frequent English letter
  const keyArr = new Array(26).fill("?")
  for (let i = 0; i < sortedCiphertext.length && i < 26; i++) {
    const cipherIdx = ALPHABET.indexOf(sortedCiphertext[i])
    if (cipherIdx !== -1 && i < ENGLISH_FREQ_ORDER.length) {
      keyArr[cipherIdx] = ENGLISH_FREQ_ORDER[i]
    }
  }

  // Fill any unmapped positions with remaining letters
  const usedLetters = new Set(keyArr.filter((c) => c !== "?"))
  const remaining = ENGLISH_FREQ_ORDER.split("").filter(
    (c) => !usedLetters.has(c)
  )
  for (let i = 0; i < 26; i++) {
    if (keyArr[i] === "?") {
      keyArr[i] = remaining.length > 0 ? remaining.shift()! : "X"
    }
  }

  return keyArr.join("")
}

// ─── Hill Climbing ───────────────────────────────────────────────────────────

/**
 * Single hill-climbing pass. Tries swapping pairs of key letters and
 * keeps the swap only if it improves the quadgram score.
 */
function hillClimbPass(
  ciphertext: string,
  startKey: SubstitutionKey,
  config: BreakerConfig,
  onProgress?: (point: ConvergencePoint) => void,
): { key: SubstitutionKey; score: number; iterations: number; converged: boolean } {
  let bestKey = startKey
  let bestScore = scoreKey(ciphertext, startKey)
  let iter = 0
  let temp = config.initialTemperature
  let converged = false

  for (iter = 0; iter < config.maxIterations; iter++) {
    // Try multiple swaps and pick the best
    let improved = false
    for (let s = 0; s < config.swapsPerStep; s++) {
      const candidateKey = swapKey(bestKey)
      const candidateScore = scoreKey(ciphertext, candidateKey)
      const delta = candidateScore - bestScore

      if (delta > 0) {
        // Always accept improvement
        bestKey = candidateKey
        bestScore = candidateScore
        improved = true
      } else if (temp > config.minTemperature) {
        // Simulated annealing: accept worse with probability e^(delta/temp)
        const probability = Math.exp(delta / temp)
        if (Math.random() < probability) {
          bestKey = candidateKey
          bestScore = candidateScore
          improved = true
        }
      }
    }

    // Cool down
    temp *= config.coolingRate

    // Report progress
    if (onProgress && iter % 50 === 0) {
      onProgress({ iteration: iter, score: bestScore, temperature: temp })
    }

    // Early stopping: if no improvement for a while, stop
    if (!improved && temp < config.minTemperature) {
      converged = true
      break
    }
  }

  return { key: bestKey, score: bestScore, iterations: iter, converged }
}

// ─── Main Breaker Function ───────────────────────────────────────────────────

/**
 * Run the full substitution cipher breaker on a ciphertext.
 * Performs multiple restarts and returns the top candidates.
 */
export function breakSubstitution(
  ciphertext: string,
  config: BreakerConfig = DEFAULT_CONFIG,
  onProgress?: (point: ConvergencePoint, restart: number) => void,
): BreakerResult {
  const start = performance.now()
  const cleanCiphertext = ciphertext.toUpperCase().replace(/[^A-Z]/g, "")

  if (cleanCiphertext.length < 10) {
    // Too short for meaningful analysis — just return frequency seed
    const key = frequencyAnalysisSeed(ciphertext)
    const plaintext = applyKey(ciphertext, key)
    const score = scoreKey(ciphertext, key)
    return {
      candidates: [{ key, plaintext, score, restartIndex: 0, iterations: 0, converged: false }],
      best: { key, plaintext, score, restartIndex: 0, iterations: 0, converged: false },
      convergenceHistory: [],
      ciphertext,
      cleanCiphertext,
      durationMs: performance.now() - start,
      totalIterations: 0,
      initialKey: key,
    }
  }

  const initialKey = frequencyAnalysisSeed(ciphertext)
  const candidates: CandidateResult[] = []
  let convergenceHistory: ConvergencePoint[] = []
  let totalIterations = 0

  for (let r = 0; r < config.numRestarts; r++) {
    // First restart uses frequency seed; others are random
    const startKey = r === 0 ? initialKey : randomKey()
    const history: ConvergencePoint[] = []

    const result = hillClimbPass(ciphertext, startKey, config, (point) => {
      history.push(point)
      onProgress?.(point, r)
    })

    totalIterations += result.iterations
    const plaintext = applyKey(ciphertext, result.key)

    candidates.push({
      key: result.key,
      plaintext,
      score: result.score,
      restartIndex: r,
      iterations: result.iterations,
      converged: result.converged,
    })

    // Keep convergence history from the best run
    if (r === 0 || result.score > (candidates[0]?.score ?? -Infinity)) {
      convergenceHistory = history
    }
  }

  // Sort candidates by score descending and take top N
  candidates.sort((a, b) => b.score - a.score)
  const topCandidates = candidates.slice(0, config.topCandidates)

  return {
    candidates: topCandidates,
    best: topCandidates[0],
    convergenceHistory,
    ciphertext,
    cleanCiphertext,
    durationMs: performance.now() - start,
    totalIterations,
    initialKey,
  }
}

// ─── Key Mapping Utilities ───────────────────────────────────────────────────

/**
 * Build a visual mapping table from a substitution key.
 * Returns pairs of {ciphertext, plaintext} for each letter.
 */
export function buildKeyMapping(key: SubstitutionKey): { cipher: string; plain: string }[] {
  return ALPHABET.split("").map((ch, i) => ({
    cipher: ch,
    plain: key[i],
  }))
}

/**
 * Compare two keys and return the number of positions that differ.
 */
export function keyDistance(a: SubstitutionKey, b: SubstitutionKey): number {
  let diff = 0
  for (let i = 0; i < 26; i++) {
    if (a[i] !== b[i]) diff++
  }
  return diff
}

/**
 * Format a convergence history into a human-readable summary.
 */
export function formatConvergenceSummary(history: ConvergencePoint[]): {
  startScore: number
  endScore: number
  improvement: number
  bestIteration: number
  bestScore: number
} {
  if (history.length === 0) {
    return { startScore: 0, endScore: 0, improvement: 0, bestIteration: 0, bestScore: 0 }
  }

  let bestScore = -Infinity
  let bestIteration = 0
  for (const point of history) {
    if (point.score > bestScore) {
      bestScore = point.score
      bestIteration = point.iteration
    }
  }

  return {
    startScore: history[0].score,
    endScore: history[history.length - 1].score,
    improvement: history[history.length - 1].score - history[0].score,
    bestIteration,
    bestScore,
  }
}
