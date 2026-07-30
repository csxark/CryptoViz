/**
 * Vigenère Cryptanalysis Workbench — ciphertext-only key recovery.
 *
 * A polyalphabetic cipher flattens the ciphertext letter histogram, so the
 * single-histogram chi-squared attack in `frequencyAnalysis.ts` cannot touch it.
 * The classical break happens in three stages instead:
 *
 *   1. Kasiski examination (1863) — repeated plaintext encrypted at the same
 *      key offset produces identical ciphertext. The distance between two such
 *      repeats is therefore a multiple of the key length, so factoring many
 *      distances exposes the key length.
 *   2. Index of Coincidence (Friedman, 1922) — split the ciphertext into m
 *      cosets (every m-th letter). When m is the true key length each coset was
 *      enciphered with a single shift, so each coset is monoalphabetic and its
 *      IoC jumps from the uniform-random value (~0.0385) toward English (~0.0667).
 *   3. Per-column chi-squared — once m is known the problem collapses into m
 *      independent Caesar problems, each solved by the frequency attack the
 *      project already ships.
 *
 * Pure module: no DOM APIs, no side effects, typed CipherError on bad input.
 * @see CIPHER_ENGINE.md "Attack simulators" conventions
 * @see docs/vigenere-cryptanalysis.md
 */

import { CipherError } from '../utils/errors'
import { ENGLISH_FREQUENCIES } from './frequencyAnalysis'

/** Expected Index of Coincidence for English prose. */
export const ENGLISH_IOC = 0.0667

/** Expected Index of Coincidence for a uniform random letter stream (1/26). */
export const RANDOM_IOC = 0.0385

/** Minimum letters required before the statistics mean anything at all. */
export const MIN_CIPHERTEXT_LETTERS = 40

/** Minimum letters per coset before a column solve is considered reliable. */
export const MIN_LETTERS_PER_COSET = 8

/** English letter frequencies as a dense A–Z array, derived from the shared table. */
const ENGLISH_FREQUENCY_ARRAY: number[] = Array.from({ length: 26 }, (_, i) =>
  ENGLISH_FREQUENCIES[String.fromCharCode(65 + i)]
)

export interface CryptanalysisStep {
  stage: 'kasiski' | 'ioc' | 'column' | 'result'
  label: string
  detail: string
}

export interface RepeatedSequence {
  /** The repeated n-gram itself. */
  sequence: string
  /** Zero-based offsets into the normalised (letters-only) ciphertext. */
  positions: number[]
  /** Pairwise distances between occurrences — each is a multiple of the key length. */
  distances: number[]
}

export interface FactorTally {
  keyLength: number
  /** How many observed Kasiski distances this candidate length divides. */
  divides: number
  /** `divides` as a fraction of all observed distances, 0–1. */
  ratio: number
}

export interface IoCScore {
  keyLength: number
  /** Mean Index of Coincidence across the m cosets. */
  averageIoC: number
  /** IoC of each individual coset, in coset order. */
  perCoset: number[]
  /** Smallest coset size — small values make this score unreliable. */
  smallestCoset: number
}

export interface ColumnSolution {
  /** Which coset this is, zero-based. */
  column: number
  /** The letters of the ciphertext at positions ≡ column (mod keyLength). */
  coset: string
  /** Winning Caesar shift for this coset. */
  shift: number
  /** The key letter that shift corresponds to. */
  keyLetter: string
  /** Chi-squared score for every candidate shift, indexed by shift. */
  chiSquaredByShift: number[]
  /**
   * Relative margin between the best and second-best shift, as a fraction of
   * the best score. Larger means the winner stands out more clearly.
   */
  confidence: number
}

export interface VigenereBreakResult {
  /** Ciphertext with everything except A–Z stripped, uppercased. */
  normalisedCiphertext: string
  repeatedSequences: RepeatedSequence[]
  factorTally: FactorTally[]
  iocScores: IoCScore[]
  /** The key length the analysis settled on. */
  electedKeyLength: number
  /** Why that length was chosen, in plain language. */
  electionReason: string
  columns: ColumnSolution[]
  recoveredKey: string
  decryptedPlaintext: string
  /** Lowest per-column confidence — the weakest link in the recovered key. */
  overallConfidence: number
  /** Non-fatal reliability caveats worth showing the user. */
  warnings: string[]
  steps: CryptanalysisStep[]
}

export interface VigenereBreakOptions {
  /** Largest key length to consider. Default 16. */
  maxKeyLength?: number
  /** Shortest repeated n-gram Kasiski will look for. Default 3. */
  minSequenceLength?: number
  /** Longest repeated n-gram Kasiski will look for. Default 5. */
  maxSequenceLength?: number
  /**
   * Average IoC at or above which a candidate key length is treated as
   * monoalphabetic-per-coset. Default 0.058.
   */
  iocThreshold?: number
}

/* ------------------------------------------------------------------------- */
/* Text helpers                                                              */
/* ------------------------------------------------------------------------- */

/** Strip to A–Z and uppercase — the form all the statistics operate on. */
export function normaliseText(text: string): string {
  return text.toUpperCase().replace(/[^A-Z]/g, '')
}

function letterCounts(text: string): number[] {
  const counts = new Array(26).fill(0)
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i) - 65
    if (code >= 0 && code < 26) counts[code]++
  }
  return counts
}

/**
 * Encrypt with Vigenère. Non-alphabetic characters pass through untouched and
 * do not advance the key stream. Exported so the UI and tests can build
 * samples without importing the full cipher module.
 */
export function encryptVigenere(plaintext: string, key: string): string {
  const normalisedKey = normaliseText(key)
  if (normalisedKey.length === 0) {
    throw new CipherError('INVALID_KEY', 'Key must contain at least one alphabetic character.')
  }

  let keyIndex = 0
  let out = ''
  for (const ch of plaintext) {
    const code = ch.charCodeAt(0)
    const shift = normalisedKey.charCodeAt(keyIndex % normalisedKey.length) - 65

    if (code >= 65 && code <= 90) {
      out += String.fromCharCode(((code - 65 + shift) % 26) + 65)
      keyIndex++
    } else if (code >= 97 && code <= 122) {
      out += String.fromCharCode(((code - 97 + shift) % 26) + 97)
      keyIndex++
    } else {
      out += ch
    }
  }
  return out
}

/**
 * Decrypt with Vigenère, preserving the original spacing and punctuation of
 * the ciphertext so the recovered plaintext is readable.
 */
export function decryptVigenere(ciphertext: string, key: string): string {
  const normalisedKey = normaliseText(key)
  if (normalisedKey.length === 0) {
    throw new CipherError('INVALID_KEY', 'Key must contain at least one alphabetic character.')
  }

  let keyIndex = 0
  let out = ''
  for (const ch of ciphertext) {
    const code = ch.charCodeAt(0)
    const shift = normalisedKey.charCodeAt(keyIndex % normalisedKey.length) - 65

    if (code >= 65 && code <= 90) {
      out += String.fromCharCode(((code - 65 - shift + 26) % 26) + 65)
      keyIndex++
    } else if (code >= 97 && code <= 122) {
      out += String.fromCharCode(((code - 97 - shift + 26) % 26) + 97)
      keyIndex++
    } else {
      out += ch
    }
  }
  return out
}

/* ------------------------------------------------------------------------- */
/* Stage 1 — Kasiski examination                                             */
/* ------------------------------------------------------------------------- */

/**
 * Locate every n-gram that appears more than once and record the distances
 * between its occurrences. Each distance is a multiple of the key length
 * whenever the repeat is a genuine key-alignment repeat rather than chance.
 */
export function findRepeatedSequences(
  normalised: string,
  minLength = 3,
  maxLength = 5
): RepeatedSequence[] {
  if (minLength < 2) {
    throw new CipherError('INVALID_INPUT', 'Kasiski sequence length must be at least 2.')
  }
  if (maxLength < minLength) {
    throw new CipherError('INVALID_INPUT', 'maxSequenceLength must be >= minSequenceLength.')
  }

  const found: RepeatedSequence[] = []
  const seen = new Set<string>()

  for (let n = maxLength; n >= minLength; n--) {
    const positionsByGram = new Map<string, number[]>()

    for (let i = 0; i + n <= normalised.length; i++) {
      const gram = normalised.slice(i, i + n)
      const list = positionsByGram.get(gram)
      if (list) list.push(i)
      else positionsByGram.set(gram, [i])
    }

    for (const [gram, positions] of positionsByGram) {
      if (positions.length < 2) continue

      // Skip a shorter n-gram that is merely a slice of a longer repeat we
      // already recorded — it would double-count the same evidence.
      let contained = false
      for (const longer of seen) {
        if (longer.length > gram.length && longer.includes(gram)) {
          contained = true
          break
        }
      }
      if (contained) continue

      const distances: number[] = []
      for (let a = 0; a < positions.length; a++) {
        for (let b = a + 1; b < positions.length; b++) {
          distances.push(positions[b] - positions[a])
        }
      }

      seen.add(gram)
      found.push({ sequence: gram, positions, distances })
    }
  }

  return found.sort(
    (x, y) => y.sequence.length - x.sequence.length || y.positions.length - x.positions.length
  )
}

/**
 * Tally how many Kasiski distances each candidate key length divides. The true
 * key length divides essentially all of them; chance repeats add noise that
 * shows up as a scattering of low-ratio candidates.
 */
export function factorDistances(distances: number[], maxKeyLength: number): FactorTally[] {
  const tally: FactorTally[] = []
  const total = distances.length

  for (let m = 2; m <= maxKeyLength; m++) {
    let divides = 0
    for (const d of distances) {
      if (d > 0 && d % m === 0) divides++
    }
    tally.push({ keyLength: m, divides, ratio: total === 0 ? 0 : divides / total })
  }

  return tally.sort((a, b) => b.divides - a.divides || a.keyLength - b.keyLength)
}

/* ------------------------------------------------------------------------- */
/* Stage 2 — Index of Coincidence                                            */
/* ------------------------------------------------------------------------- */

/**
 * Friedman's Index of Coincidence: the probability that two letters drawn at
 * random without replacement are the same.
 *
 *   IoC = Σ nᵢ(nᵢ − 1) / N(N − 1)
 */
export function indexOfCoincidence(text: string): number {
  const normalised = normaliseText(text)
  const n = normalised.length
  if (n < 2) {
    throw new CipherError(
      'INVALID_INPUT',
      'Index of Coincidence needs at least 2 letters to be defined.'
    )
  }

  const counts = letterCounts(normalised)
  let numerator = 0
  for (const c of counts) numerator += c * (c - 1)

  return numerator / (n * (n - 1))
}

/** Split into m cosets: coset j holds the letters at positions ≡ j (mod m). */
export function splitIntoCosets(normalised: string, keyLength: number): string[] {
  if (keyLength < 1) {
    throw new CipherError('INVALID_INPUT', 'Key length must be at least 1.')
  }

  const cosets: string[] = Array.from({ length: keyLength }, () => '')
  for (let i = 0; i < normalised.length; i++) {
    cosets[i % keyLength] += normalised[i]
  }
  return cosets
}

/** Mean IoC across the m cosets, ignoring any coset too short to score. */
export function averageIoCForKeyLength(normalised: string, keyLength: number): IoCScore {
  const cosets = splitIntoCosets(normalised, keyLength)
  const perCoset: number[] = []
  let smallestCoset = Number.POSITIVE_INFINITY

  for (const coset of cosets) {
    smallestCoset = Math.min(smallestCoset, coset.length)
    perCoset.push(coset.length >= 2 ? indexOfCoincidence(coset) : 0)
  }

  const scored = perCoset.filter((v) => v > 0)
  const averageIoC = scored.length === 0 ? 0 : scored.reduce((a, b) => a + b, 0) / scored.length

  return {
    keyLength,
    averageIoC,
    perCoset,
    smallestCoset: smallestCoset === Number.POSITIVE_INFINITY ? 0 : smallestCoset,
  }
}

/* ------------------------------------------------------------------------- */
/* Stage 3 — Per-column chi-squared solve                                    */
/* ------------------------------------------------------------------------- */

/**
 * Pearson's chi-squared between an observed coset (shifted back by `shift`)
 * and the expected English distribution. Lower means more English-like.
 */
function chiSquaredForShift(counts: number[], total: number, shift: number): number {
  let sum = 0
  for (let i = 0; i < 26; i++) {
    // Decrypting by `shift` maps ciphertext letter (i + shift) onto plaintext i.
    const observed = counts[(i + shift) % 26]
    const expected = (ENGLISH_FREQUENCY_ARRAY[i] / 100) * total
    if (expected <= 0) continue
    const diff = observed - expected
    sum += (diff * diff) / expected
  }
  return sum
}

/**
 * Solve a single coset as an independent Caesar problem: score all 26 shifts
 * and take the one whose implied plaintext looks most like English.
 */
export function solveColumn(coset: string, column: number): ColumnSolution {
  const normalised = normaliseText(coset)
  if (normalised.length === 0) {
    throw new CipherError('INPUT_REQUIRED', `Column ${column} contains no letters to analyse.`)
  }

  const counts = letterCounts(normalised)
  const total = normalised.length

  const chiSquaredByShift: number[] = []
  for (let shift = 0; shift < 26; shift++) {
    chiSquaredByShift.push(chiSquaredForShift(counts, total, shift))
  }

  const ranked = chiSquaredByShift
    .map((chi, shift) => ({ chi, shift }))
    .sort((a, b) => a.chi - b.chi)

  const best = ranked[0]
  const second = ranked[1]
  const confidence = best.chi > 0 ? Math.max(0, (second.chi - best.chi) / best.chi) : 1

  return {
    column,
    coset: normalised,
    shift: best.shift,
    keyLetter: String.fromCharCode(65 + best.shift),
    chiSquaredByShift,
    confidence,
  }
}

/* ------------------------------------------------------------------------- */
/* Orchestration                                                             */
/* ------------------------------------------------------------------------- */

function electKeyLength(
  iocScores: IoCScore[],
  threshold: number
): { keyLength: number; reason: string } {
  const byLength = new Map(iocScores.map((s) => [s.keyLength, s]))

  // Any key length at or above the English-like threshold is a candidate. The
  // true length's multiples also qualify (every coset stays monoalphabetic), so
  // the smallest qualifying length is the answer.
  const qualifying = iocScores
    .filter((s) => s.averageIoC >= threshold)
    .map((s) => s.keyLength)
    .sort((a, b) => a - b)

  if (qualifying.length > 0) {
    const elected = qualifying[0]
    const score = byLength.get(elected)
    return {
      keyLength: elected,
      reason:
        `Smallest key length whose cosets reach English-like IoC ` +
        `(${score?.averageIoC.toFixed(4)} ≥ ${threshold.toFixed(4)}). ` +
        `Multiples of the true length score just as well, so the smallest qualifier wins.`,
    }
  }

  // Nothing crossed the bar — fall back to the strongest score, then prefer a
  // proper divisor of it whose score is statistically indistinguishable.
  const strongest = iocScores.reduce((a, b) => (b.averageIoC > a.averageIoC ? b : a))
  const tolerance = 0.006

  for (let d = 1; d < strongest.keyLength; d++) {
    if (strongest.keyLength % d !== 0) continue
    const divisor = byLength.get(d)
    if (divisor && divisor.averageIoC >= strongest.averageIoC - tolerance) {
      return {
        keyLength: d,
        reason:
          `No key length reached the IoC threshold. Strongest was ${strongest.keyLength} ` +
          `(${strongest.averageIoC.toFixed(4)}), but its divisor ${d} scores within ` +
          `${tolerance} of it, so the shorter key is preferred.`,
      }
    }
  }

  return {
    keyLength: strongest.keyLength,
    reason:
      `No key length reached the IoC threshold — the ciphertext may be too short. ` +
      `Falling back to the strongest average IoC (${strongest.averageIoC.toFixed(4)} ` +
      `at length ${strongest.keyLength}).`,
  }
}

/**
 * Run the full ciphertext-only attack: Kasiski → Index of Coincidence →
 * per-column chi-squared, returning every intermediate result so the UI can
 * show the reasoning rather than just the answer.
 */
export function breakVigenere(
  ciphertext: string,
  options: VigenereBreakOptions = {}
): VigenereBreakResult {
  const {
    minSequenceLength = 3,
    maxSequenceLength = 5,
    iocThreshold = 0.058,
  } = options

  const normalised = normaliseText(ciphertext)

  if (normalised.length === 0) {
    throw new CipherError(
      'INPUT_REQUIRED',
      'Ciphertext must contain at least one alphabetic character.'
    )
  }
  if (normalised.length < MIN_CIPHERTEXT_LETTERS) {
    throw new CipherError(
      'INVALID_INPUT',
      `Ciphertext has only ${normalised.length} letters — Vigenère cryptanalysis is unreliable ` +
        `below ${MIN_CIPHERTEXT_LETTERS}. Provide a longer sample.`
    )
  }

  // Never consider a key length that would leave cosets too short to score.
  const lengthCeiling = Math.max(1, Math.floor(normalised.length / MIN_LETTERS_PER_COSET))
  const maxKeyLength = Math.max(1, Math.min(options.maxKeyLength ?? 16, lengthCeiling))

  const steps: CryptanalysisStep[] = []
  const warnings: string[] = []

  /* Stage 1 — Kasiski --------------------------------------------------- */

  const repeatedSequences = findRepeatedSequences(
    normalised,
    minSequenceLength,
    maxSequenceLength
  )
  const allDistances = repeatedSequences.flatMap((r) => r.distances)
  const factorTally = factorDistances(allDistances, maxKeyLength)

  steps.push({
    stage: 'kasiski',
    label: 'Kasiski examination',
    detail:
      repeatedSequences.length === 0
        ? `No repeated ${minSequenceLength}–${maxSequenceLength}-grams found. Kasiski contributes ` +
          `no evidence here; the Index of Coincidence carries the analysis alone.`
        : `Found ${repeatedSequences.length} repeated sequence(s) yielding ${allDistances.length} ` +
          `distance(s). A repeat means the same plaintext met the same key offset, so each ` +
          `distance should be a multiple of the key length.`,
  })

  if (repeatedSequences.length === 0) {
    warnings.push(
      'No repeated n-grams were found, so the Kasiski stage produced no evidence. Key-length ' +
        'election rests entirely on the Index of Coincidence.'
    )
  }

  const topFactor = factorTally[0]
  if (topFactor && topFactor.divides > 0) {
    steps.push({
      stage: 'kasiski',
      label: 'Factor the distances',
      detail:
        `Key length ${topFactor.keyLength} divides ${topFactor.divides} of ${allDistances.length} ` +
        `distances (${(topFactor.ratio * 100).toFixed(0)}%) — the strongest Kasiski candidate.`,
    })
  }

  /* Stage 2 — Index of Coincidence -------------------------------------- */

  const iocScores: IoCScore[] = []
  for (let m = 1; m <= maxKeyLength; m++) {
    iocScores.push(averageIoCForKeyLength(normalised, m))
  }

  const wholeTextIoC = indexOfCoincidence(normalised)
  steps.push({
    stage: 'ioc',
    label: 'Index of Coincidence of the whole ciphertext',
    detail:
      `IoC = ${wholeTextIoC.toFixed(4)}. English prose sits near ${ENGLISH_IOC}, uniform random ` +
      `near ${RANDOM_IOC}. A value close to the random end is the signature of a polyalphabetic ` +
      `cipher flattening the histogram.`,
  })

  const { keyLength: electedKeyLength, reason: electionReason } = electKeyLength(
    iocScores,
    iocThreshold
  )
  const electedScore = iocScores.find((s) => s.keyLength === electedKeyLength)

  steps.push({
    stage: 'ioc',
    label: `Elected key length: ${electedKeyLength}`,
    detail:
      `Splitting into ${electedKeyLength} coset(s) lifts the average IoC to ` +
      `${electedScore?.averageIoC.toFixed(4)}. ${electionReason}`,
  })

  if (electedScore && electedScore.smallestCoset < MIN_LETTERS_PER_COSET) {
    warnings.push(
      `The smallest coset holds only ${electedScore.smallestCoset} letters (below the ` +
        `${MIN_LETTERS_PER_COSET}-letter guideline), so that column's key letter is a weak guess.`
    )
  }

  /* Stage 3 — Column-by-column Caesar solve ------------------------------ */

  const cosets = splitIntoCosets(normalised, electedKeyLength)
  const columns = cosets.map((coset, index) => solveColumn(coset, index))

  for (const column of columns) {
    steps.push({
      stage: 'column',
      label: `Column ${column.column + 1} → key letter '${column.keyLetter}'`,
      detail:
        `${column.coset.length} letters, best shift ${column.shift} with chi-squared ` +
        `${column.chiSquaredByShift[column.shift].toFixed(2)} and a ` +
        `${(column.confidence * 100).toFixed(0)}% margin over the runner-up.`,
    })
  }

  const recoveredKey = columns.map((c) => c.keyLetter).join('')
  const decryptedPlaintext = decryptVigenere(ciphertext, recoveredKey)
  const overallConfidence = columns.reduce((min, c) => Math.min(min, c.confidence), 1)

  if (overallConfidence < 0.1) {
    warnings.push(
      `The weakest column beat its runner-up by only ` +
        `${(overallConfidence * 100).toFixed(0)}% — at least one key letter is likely wrong. ` +
        `A longer ciphertext sample would sharpen the statistics.`
    )
  }

  steps.push({
    stage: 'result',
    label: `Recovered key: ${recoveredKey}`,
    detail:
      `Each column was an independent Caesar problem once the key length was known. ` +
      `That is the whole break: an intractable search over 26^${electedKeyLength} keys ` +
      `became ${electedKeyLength} searches over 26.`,
  })

  return {
    normalisedCiphertext: normalised,
    repeatedSequences,
    factorTally,
    iocScores,
    electedKeyLength,
    electionReason,
    columns,
    recoveredKey,
    decryptedPlaintext,
    overallConfidence,
    warnings,
    steps,
  }
}
