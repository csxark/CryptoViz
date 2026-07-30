/**
 * Randomness Quality Test Suite — a NIST SP 800-22 battery.
 *
 * The site already asserts "never use Math.random for crypto", but asserting is
 * not demonstrating. This module runs six statistical tests over a bitstream and
 * reports p-values, so the claim can be checked rather than believed.
 *
 * The result is more interesting than the slogan suggests. `Math.random`
 * (xorshift128+ in V8) *passes* most of this battery — it is a perfectly decent
 * statistical generator. What disqualifies it for cryptography is
 * predictability, not bias: observe enough output and you can recover its state
 * and compute every future value. A textbook LCG, by contrast, fails visibly
 * once you look at correlations rather than counts.
 *
 * That distinction — statistical randomness versus unpredictability — is the
 * point of the whole feature, and is why `runBattery()` returns a verdict that
 * says so explicitly rather than a bare pass/fail.
 *
 * Pure module: no DOM APIs, typed CipherError on bad input.
 * @see docs/randomness-testing.md
 */

import { CipherError } from '../utils/errors'

/** SP 800-22 §1.1.5 significance level: reject the null hypothesis below this. */
export const ALPHA = 0.01

export interface TestResult {
  id: string
  name: string
  /** SP 800-22 section this test comes from. */
  clause: string
  /** The test statistic, whatever it is for this test. */
  statistic: number
  /** Probability of seeing a statistic at least this extreme if the bits were random. */
  pValue: number
  passed: boolean
  /** Set when the sample was too small or a prerequisite failed. */
  skipped?: string
  detail: string
}

export interface BatteryResult {
  results: TestResult[]
  bitCount: number
  passedCount: number
  ranCount: number
  /** Plain-language summary, including the statistical-vs-cryptographic caveat. */
  verdict: string
}

export interface GeneratorDefinition {
  id: string
  name: string
  description: string
  /** How this generator should be characterised regardless of the test results. */
  cryptographic: boolean
  /** Produce `byteCount` bytes. Seeded generators are deterministic. */
  generate: (byteCount: number, seed?: number) => Uint8Array
}

/* ------------------------------------------------------------------------- */
/* Special functions                                                         */
/* ------------------------------------------------------------------------- */

/**
 * Complementary error function via the Chebyshev expansion from
 * Numerical Recipes (3rd ed., §6.2). Accurate to roughly 1e-15 relative,
 * far beyond what a p-value threshold at 0.01 needs.
 */
export function erfc(x: number): number {
  const z = Math.abs(x)
  const t = 2 / (2 + z)
  const ty = 4 * t - 2

  const cof = [
    -1.3026537197817094, 6.4196979235649026e-1, 1.9476473204185836e-2, -9.561514786808631e-3,
    -9.46595344482036e-4, 3.66839497852761e-4, 4.2523324806907e-5, -2.0278578112534e-5,
    -1.624290004647e-6, 1.30365583558e-6, 1.5626441722e-8, -8.5238095915e-8, 6.529054439e-9,
    5.059343495e-9, -9.91364156e-10, -2.27365122e-10, 9.6467911e-11, 2.394038e-12,
    -6.886027e-12, 8.94487e-13, 3.13092e-13, -1.12708e-13, 3.81e-16, 7.106e-15,
  ]

  let d = 0
  let dd = 0
  for (let j = cof.length - 1; j > 0; j--) {
    const tmp = d
    d = ty * d - dd + cof[j]
    dd = tmp
  }

  const ans = t * Math.exp(-z * z + 0.5 * (cof[0] + ty * d) - dd)

  // The expansion can overshoot by ~1e-15 at x = 0. erfc is mathematically
  // bounded to [0, 1] for x >= 0, and a p-value above 1 is meaningless, so
  // clamp rather than let float error leak into the reported statistics.
  const clamped = Math.min(1, Math.max(0, ans))
  return x >= 0 ? clamped : 2 - clamped
}

/** Natural log of the gamma function, Lanczos approximation. */
function lnGamma(x: number): number {
  const cof = [
    76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155,
    0.1208650973866179e-2, -0.5395239384953e-5,
  ]

  let y = x
  const tmp = x + 5.5 - (x + 0.5) * Math.log(x + 5.5)
  let ser = 1.000000000190015
  for (let j = 0; j < 6; j++) ser += cof[j] / ++y

  return -tmp + Math.log((2.5066282746310005 * ser) / x)
}

const ITMAX = 300
const EPS = 3e-12
const FPMIN = Number.MIN_VALUE / EPS

/** Regularized lower incomplete gamma P(a, x) via its series representation. */
function gammaSeries(a: number, x: number): number {
  let ap = a
  let sum = 1 / a
  let del = sum

  for (let n = 0; n < ITMAX; n++) {
    ap++
    del *= x / ap
    sum += del
    if (Math.abs(del) < Math.abs(sum) * EPS) break
  }

  return sum * Math.exp(-x + a * Math.log(x) - lnGamma(a))
}

/** Regularized upper incomplete gamma Q(a, x) via a continued fraction. */
function gammaContinuedFraction(a: number, x: number): number {
  let b = x + 1 - a
  let c = 1 / FPMIN
  let d = 1 / b
  let h = d

  for (let i = 1; i <= ITMAX; i++) {
    const an = -i * (i - a)
    b += 2
    d = an * d + b
    if (Math.abs(d) < FPMIN) d = FPMIN
    c = b + an / c
    if (Math.abs(c) < FPMIN) c = FPMIN
    d = 1 / d
    const del = d * c
    h *= del
    if (Math.abs(del - 1) < EPS) break
  }

  return Math.exp(-x + a * Math.log(x) - lnGamma(a)) * h
}

/**
 * Regularized upper incomplete gamma function Q(a, x) = 1 − P(a, x).
 * Every chi-squared test here reads its p-value from `igamc(df/2, chi2/2)`.
 */
export function igamc(a: number, x: number): number {
  if (x < 0 || a <= 0) {
    throw new CipherError('INVALID_INPUT', `igamc requires x >= 0 and a > 0 (got a=${a}, x=${x}).`)
  }
  if (x === 0) return 1
  if (x < a + 1) return 1 - gammaSeries(a, x)
  return gammaContinuedFraction(a, x)
}

/* ------------------------------------------------------------------------- */
/* Bit handling                                                              */
/* ------------------------------------------------------------------------- */

/** Expand bytes into a 0/1 array, most significant bit first. */
export function bitsFromBytes(bytes: Uint8Array): Uint8Array {
  const bits = new Uint8Array(bytes.length * 8)
  for (let i = 0; i < bytes.length; i++) {
    const byte = bytes[i]
    for (let b = 0; b < 8; b++) {
      bits[i * 8 + b] = (byte >> (7 - b)) & 1
    }
  }
  return bits
}

/** Parse a user-supplied hex string into bytes. */
export function bytesFromHex(hex: string): Uint8Array {
  const cleaned = hex.replace(/[\s:]/g, '')
  if (cleaned.length === 0) {
    throw new CipherError('INPUT_REQUIRED', 'Provide some hex data to test.')
  }
  if (cleaned.length % 2 !== 0) {
    throw new CipherError('INVALID_INPUT', 'Hex input must have an even number of digits.')
  }
  if (!/^[0-9a-fA-F]+$/.test(cleaned)) {
    throw new CipherError('INVALID_INPUT', 'Hex input contains non-hexadecimal characters.')
  }

  const bytes = new Uint8Array(cleaned.length / 2)
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(cleaned.slice(i * 2, i * 2 + 2), 16)
  }
  return bytes
}

function countOnes(bits: Uint8Array): number {
  let ones = 0
  for (let i = 0; i < bits.length; i++) ones += bits[i]
  return ones
}

/* ------------------------------------------------------------------------- */
/* The tests                                                                 */
/* ------------------------------------------------------------------------- */

/**
 * SP 800-22 §2.1 — Frequency (Monobit).
 *
 * Null hypothesis: ones and zeros are equally likely. Every other test in the
 * suite assumes this one passes, which is why it runs first.
 */
export function monobitTest(bits: Uint8Array): TestResult {
  const n = bits.length
  const base = { id: 'monobit', name: 'Frequency (Monobit)', clause: 'SP 800-22 §2.1' }

  if (n < 100) {
    return {
      ...base,
      statistic: 0,
      pValue: 1,
      passed: false,
      skipped: `Needs at least 100 bits, got ${n}.`,
      detail: 'Sample too small for the normal approximation to hold.',
    }
  }

  const ones = countOnes(bits)
  const sum = 2 * ones - n // Σ ±1
  const sObs = Math.abs(sum) / Math.sqrt(n)
  const pValue = erfc(sObs / Math.SQRT2)

  return {
    ...base,
    statistic: sObs,
    pValue,
    passed: pValue >= ALPHA,
    detail:
      `${ones} ones and ${n - ones} zeros (${((ones / n) * 100).toFixed(3)}% ones). ` +
      `s_obs = |Σ±1|/√n = ${sObs.toFixed(4)}.`,
  }
}

/**
 * SP 800-22 §2.2 — Frequency Test within a Block.
 *
 * Catches a stream that is balanced overall but locally lopsided — long runs of
 * zeros followed by long runs of ones pass monobit and fail this.
 */
export function blockFrequencyTest(bits: Uint8Array, blockSize = 128): TestResult {
  const n = bits.length
  const base = { id: 'block-frequency', name: 'Block Frequency', clause: 'SP 800-22 §2.2' }
  const numBlocks = Math.floor(n / blockSize)

  if (numBlocks < 1 || n < 100) {
    return {
      ...base,
      statistic: 0,
      pValue: 1,
      passed: false,
      skipped: `Needs at least ${blockSize} bits, got ${n}.`,
      detail: 'Sample too small to form a single block.',
    }
  }

  let sum = 0
  for (let i = 0; i < numBlocks; i++) {
    const block = bits.subarray(i * blockSize, (i + 1) * blockSize)
    const pi = countOnes(block) / blockSize
    sum += (pi - 0.5) ** 2
  }

  const chiSquared = 4 * blockSize * sum
  const pValue = igamc(numBlocks / 2, chiSquared / 2)

  return {
    ...base,
    statistic: chiSquared,
    pValue,
    passed: pValue >= ALPHA,
    detail:
      `${numBlocks} blocks of ${blockSize} bits. χ² = ${chiSquared.toFixed(4)} on ` +
      `${numBlocks} degrees of freedom.`,
  }
}

/**
 * SP 800-22 §2.3 — Runs.
 *
 * A run is a maximal block of identical bits. Too few runs means the bits stick
 * together; too many means they alternate too regularly. The test is only
 * meaningful when monobit already passed, so that prerequisite is checked
 * explicitly rather than assumed.
 */
export function runsTest(bits: Uint8Array): TestResult {
  const n = bits.length
  const base = { id: 'runs', name: 'Runs', clause: 'SP 800-22 §2.3' }

  if (n < 100) {
    return {
      ...base,
      statistic: 0,
      pValue: 1,
      passed: false,
      skipped: `Needs at least 100 bits, got ${n}.`,
      detail: 'Sample too small.',
    }
  }

  const pi = countOnes(bits) / n
  const tau = 2 / Math.sqrt(n)

  if (Math.abs(pi - 0.5) >= tau) {
    return {
      ...base,
      statistic: 0,
      pValue: 0,
      passed: false,
      detail:
        `Prerequisite failed: the proportion of ones (${pi.toFixed(4)}) is further than ` +
        `2/√n = ${tau.toFixed(4)} from 0.5. SP 800-22 §2.3.4 makes the runs test meaningless ` +
        `once monobit has already failed, so this is reported as a failure.`,
    }
  }

  let runs = 1
  for (let i = 1; i < n; i++) {
    if (bits[i] !== bits[i - 1]) runs++
  }

  const expected = 2 * n * pi * (1 - pi)
  const denominator = 2 * Math.sqrt(2 * n) * pi * (1 - pi)
  const pValue = erfc(Math.abs(runs - expected) / denominator)

  return {
    ...base,
    statistic: runs,
    pValue,
    passed: pValue >= ALPHA,
    detail: `${runs} runs observed, ${expected.toFixed(1)} expected.`,
  }
}

/** Reference distributions from SP 800-22 §2.4.4 for the two supported block sizes. */
const LONGEST_RUN_PARAMS = {
  8: {
    blockSize: 8,
    numBlocks: 16,
    degreesOfFreedom: 3,
    thresholds: [1, 2, 3, 4],
    probabilities: [0.2148, 0.3672, 0.2305, 0.1875],
  },
  128: {
    blockSize: 128,
    numBlocks: 49,
    degreesOfFreedom: 5,
    thresholds: [4, 5, 6, 7, 8, 9],
    probabilities: [0.1174, 0.243, 0.2493, 0.1752, 0.1027, 0.1124],
  },
} as const

/**
 * SP 800-22 §2.4 — Longest Run of Ones in a Block.
 *
 * Bucket each block by its longest run of ones and compare against the
 * reference distribution. An irregularity here means runs are the wrong length
 * even when the overall count of runs is right.
 */
export function longestRunTest(bits: Uint8Array): TestResult {
  const n = bits.length
  const base = { id: 'longest-run', name: 'Longest Run of Ones', clause: 'SP 800-22 §2.4' }

  const params = n >= 6272 ? LONGEST_RUN_PARAMS[128] : LONGEST_RUN_PARAMS[8]
  const required = params.blockSize * params.numBlocks

  if (n < required) {
    return {
      ...base,
      statistic: 0,
      pValue: 1,
      passed: false,
      skipped: `Needs at least ${required} bits, got ${n}.`,
      detail: 'Sample too small for the reference distribution.',
    }
  }

  const counts = new Array(params.probabilities.length).fill(0)

  for (let b = 0; b < params.numBlocks; b++) {
    const block = bits.subarray(b * params.blockSize, (b + 1) * params.blockSize)

    let longest = 0
    let current = 0
    for (let i = 0; i < block.length; i++) {
      if (block[i] === 1) {
        current++
        if (current > longest) longest = current
      } else {
        current = 0
      }
    }

    // Bucket: first threshold is "<= t", last is ">= t", the rest are exact.
    let bucket = params.thresholds.length - 1
    for (let k = 0; k < params.thresholds.length; k++) {
      if (longest <= params.thresholds[k]) {
        bucket = k
        break
      }
    }
    counts[bucket]++
  }

  let chiSquared = 0
  for (let i = 0; i < counts.length; i++) {
    const expected = params.numBlocks * params.probabilities[i]
    chiSquared += (counts[i] - expected) ** 2 / expected
  }

  const pValue = igamc(params.degreesOfFreedom / 2, chiSquared / 2)

  return {
    ...base,
    statistic: chiSquared,
    pValue,
    passed: pValue >= ALPHA,
    detail:
      `${params.numBlocks} blocks of ${params.blockSize} bits, bucketed by longest run of ones ` +
      `(${counts.join(', ')}). χ² = ${chiSquared.toFixed(4)}.`,
  }
}

/**
 * SP 800-22 §2.11 — Serial.
 *
 * Counts every overlapping m-bit pattern with wraparound. Uniform pattern
 * frequency is a much stronger condition than uniform bit frequency: an
 * alternating stream `0101…` has a perfect monobit score and a catastrophic
 * serial score.
 */
export function serialTest(bits: Uint8Array, m = 3): TestResult {
  const n = bits.length
  const base = { id: 'serial', name: `Serial (${m}-bit patterns)`, clause: 'SP 800-22 §2.11' }

  if (n < 100 || m < 2 || n <= 2 ** (m + 2)) {
    return {
      ...base,
      statistic: 0,
      pValue: 1,
      passed: false,
      skipped: `Needs more than ${Math.max(100, 2 ** (m + 2))} bits, got ${n}.`,
      detail: 'Sample too small for stable pattern counts.',
    }
  }

  /** ψ²_m over overlapping, wrapped m-bit patterns. */
  const psiSquared = (patternLength: number): number => {
    if (patternLength <= 0) return 0

    const counts = new Uint32Array(1 << patternLength)
    const mask = (1 << patternLength) - 1

    // Seed the sliding window with the last (patternLength - 1) bits so the
    // stream wraps, as the specification requires.
    let window = 0
    for (let i = 0; i < patternLength - 1; i++) {
      window = ((window << 1) | bits[i]) & mask
    }

    for (let i = 0; i < n; i++) {
      window = ((window << 1) | bits[(i + patternLength - 1) % n]) & mask
      counts[window]++
    }

    let sum = 0
    for (let i = 0; i < counts.length; i++) sum += counts[i] * counts[i]
    return (sum * (1 << patternLength)) / n - n
  }

  const psiM = psiSquared(m)
  const psiM1 = psiSquared(m - 1)
  const psiM2 = psiSquared(m - 2)

  const delta1 = psiM - psiM1
  const delta2 = psiM - 2 * psiM1 + psiM2

  const p1 = igamc(2 ** (m - 2), delta1 / 2)
  const p2 = igamc(2 ** (m - 3), delta2 / 2)
  const pValue = Math.min(p1, p2)

  return {
    ...base,
    statistic: delta1,
    pValue,
    passed: pValue >= ALPHA,
    detail:
      `∇ψ² = ${delta1.toFixed(4)} (p = ${p1.toExponential(3)}), ` +
      `∇²ψ² = ${delta2.toFixed(4)} (p = ${p2.toExponential(3)}). The smaller p-value is reported.`,
  }
}

/**
 * Chi-squared uniformity over the 256 byte values.
 *
 * Not part of SP 800-22 — included because byte-level bias is what a beginner
 * intuitively expects "non-random" to mean, and showing that a weak PRNG can
 * sail through it is a useful corrective.
 */
export function byteUniformityTest(bytes: Uint8Array): TestResult {
  const base = { id: 'byte-uniformity', name: 'Byte Uniformity (χ²)', clause: 'Pearson χ², 255 df' }

  if (bytes.length < 2560) {
    return {
      ...base,
      statistic: 0,
      pValue: 1,
      passed: false,
      skipped: `Needs at least 2560 bytes (10 expected per bucket), got ${bytes.length}.`,
      detail: 'Sample too small for a 256-bucket chi-squared test.',
    }
  }

  const counts = new Uint32Array(256)
  for (let i = 0; i < bytes.length; i++) counts[bytes[i]]++

  const expected = bytes.length / 256
  let chiSquared = 0
  for (let i = 0; i < 256; i++) {
    chiSquared += (counts[i] - expected) ** 2 / expected
  }

  const pValue = igamc(255 / 2, chiSquared / 2)

  return {
    ...base,
    statistic: chiSquared,
    pValue,
    passed: pValue >= ALPHA,
    detail: `χ² = ${chiSquared.toFixed(2)} on 255 degrees of freedom, ${expected.toFixed(1)} expected per byte value.`,
  }
}

/* ------------------------------------------------------------------------- */
/* Battery                                                                   */
/* ------------------------------------------------------------------------- */

/** Run the whole battery over a byte sample. */
export function runBattery(bytes: Uint8Array): BatteryResult {
  if (bytes.length === 0) {
    throw new CipherError('INPUT_REQUIRED', 'No data to test.')
  }

  const bits = bitsFromBytes(bytes)
  const results = [
    monobitTest(bits),
    blockFrequencyTest(bits),
    runsTest(bits),
    longestRunTest(bits),
    serialTest(bits),
    byteUniformityTest(bytes),
  ]

  const ran = results.filter((r) => !r.skipped)
  const passedCount = ran.filter((r) => r.passed).length

  const verdict =
    ran.length === 0
      ? 'Sample too small to run any test. Increase the sample size.'
      : passedCount === ran.length
        ? `Passed all ${ran.length} applicable tests at α = ${ALPHA}. This means the sample is ` +
          `not statistically distinguishable from uniform — it does NOT mean the generator is ` +
          `cryptographically secure. Math.random passes this battery and is still unsafe for ` +
          `keys, because the property that matters is unpredictability, not uniformity.`
        : `Failed ${ran.length - passedCount} of ${ran.length} applicable tests at α = ${ALPHA}. ` +
          `A generator that fails here is definitively unsuitable — though passing would not by ` +
          `itself have made it suitable.`

  return { results, bitCount: bits.length, passedCount, ranCount: ran.length, verdict }
}

/* ------------------------------------------------------------------------- */
/* Generators                                                                */
/* ------------------------------------------------------------------------- */

/** Fill bytes from `crypto.getRandomValues`, chunked to respect the 65536-byte cap. */
function cryptoBytes(byteCount: number): Uint8Array {
  if (typeof globalThis.crypto?.getRandomValues !== 'function') {
    throw new CipherError(
      'WEBCRYPTO_UNAVAILABLE',
      'crypto.getRandomValues is unavailable in this environment.'
    )
  }

  const out = new Uint8Array(byteCount)
  const MAX_CHUNK = 65536
  for (let offset = 0; offset < byteCount; offset += MAX_CHUNK) {
    const chunk = out.subarray(offset, Math.min(offset + MAX_CHUNK, byteCount))
    globalThis.crypto.getRandomValues(chunk)
  }
  return out
}

/**
 * RANDU — the notorious IBM LCG, x_{n+1} = 65539·x_n mod 2^31. Chosen because
 * its failure mode is the interesting one: consecutive triples fall on just 15
 * planes in 3-space, so it looks fine to a bit-counting test and collapses the
 * moment you plot correlations.
 */
function randuBytes(byteCount: number, seed = 1): Uint8Array {
  const out = new Uint8Array(byteCount)
  let state = (seed | 1) >>> 0

  for (let i = 0; i < byteCount; i++) {
    state = (state * 65539) % 2147483648
    out[i] = (state >>> 16) & 0xff
  }
  return out
}

/** Marsaglia's xorshift32 — a competent non-cryptographic PRNG, for contrast. */
function xorshift32Bytes(byteCount: number, seed = 2463534242): Uint8Array {
  const out = new Uint8Array(byteCount)
  let state = seed >>> 0
  if (state === 0) state = 2463534242

  for (let i = 0; i < byteCount; i++) {
    state ^= state << 13
    state >>>= 0
    state ^= state >>> 17
    state ^= state << 5
    state >>>= 0
    out[i] = (state >>> 24) & 0xff
  }
  return out
}

/** Math.random, sampled a byte at a time. */
function mathRandomBytes(byteCount: number): Uint8Array {
  const out = new Uint8Array(byteCount)
  for (let i = 0; i < byteCount; i++) {
    out[i] = Math.floor(Math.random() * 256)
  }
  return out
}

/** Degenerate control: every byte identical. Must fail loudly. */
function constantBytes(byteCount: number): Uint8Array {
  return new Uint8Array(byteCount)
}

/** Degenerate control: perfectly alternating bits. Passes monobit, fails runs. */
function alternatingBytes(byteCount: number): Uint8Array {
  return new Uint8Array(byteCount).fill(0xaa)
}

export const GENERATORS: GeneratorDefinition[] = [
  {
    id: 'crypto',
    name: 'crypto.getRandomValues',
    description: 'The platform CSPRNG. The only source on this list fit for keys, IVs or nonces.',
    cryptographic: true,
    generate: (byteCount) => cryptoBytes(byteCount),
  },
  {
    id: 'math-random',
    name: 'Math.random',
    description:
      'xorshift128+ in V8. Statistically respectable and completely predictable — observe enough ' +
      'output and every future value is recoverable.',
    cryptographic: false,
    generate: (byteCount) => mathRandomBytes(byteCount),
  },
  {
    id: 'xorshift32',
    name: 'xorshift32 (seeded)',
    description: "Marsaglia's xorshift32. A competent non-cryptographic PRNG, deterministic here.",
    cryptographic: false,
    generate: (byteCount, seed) => xorshift32Bytes(byteCount, seed),
  },
  {
    id: 'randu',
    name: 'RANDU (weak LCG)',
    description:
      'x·65539 mod 2^31, shipped by IBM in the 1960s. Consecutive triples lie on 15 planes, ' +
      'which is invisible to a bit-counting test and obvious in a scatter plot.',
    cryptographic: false,
    generate: (byteCount, seed) => randuBytes(byteCount, seed),
  },
  {
    id: 'constant',
    name: 'All zeros (control)',
    description: 'A degenerate control that must fail every test.',
    cryptographic: false,
    generate: (byteCount) => constantBytes(byteCount),
  },
  {
    id: 'alternating',
    name: 'Alternating 0101 (control)',
    description:
      'Perfectly balanced and perfectly predictable. Sails through monobit, collapses on runs — ' +
      'the clearest demonstration that balance is not randomness.',
    cryptographic: false,
    generate: (byteCount) => alternatingBytes(byteCount),
  },
]

export function generatorById(id: string): GeneratorDefinition {
  const generator = GENERATORS.find((g) => g.id === id)
  if (!generator) {
    throw new CipherError('ALGORITHM_UNSUPPORTED', `Unknown generator '${id}'.`)
  }
  return generator
}

/* ------------------------------------------------------------------------- */
/* Structure probes (for the visual panels)                                  */
/* ------------------------------------------------------------------------- */

/**
 * Autocorrelation of the byte sequence at lags 1..maxLag, normalised to
 * [-1, 1]. A good generator hovers near zero everywhere.
 */
export function lagCorrelation(bytes: Uint8Array, maxLag = 32): { lag: number; r: number }[] {
  if (bytes.length < maxLag * 4) {
    throw new CipherError(
      'INVALID_INPUT',
      `Autocorrelation over ${maxLag} lags needs at least ${maxLag * 4} bytes.`
    )
  }

  let mean = 0
  for (let i = 0; i < bytes.length; i++) mean += bytes[i]
  mean /= bytes.length

  let variance = 0
  for (let i = 0; i < bytes.length; i++) variance += (bytes[i] - mean) ** 2

  const out: { lag: number; r: number }[] = []
  for (let lag = 1; lag <= maxLag; lag++) {
    let covariance = 0
    for (let i = 0; i + lag < bytes.length; i++) {
      covariance += (bytes[i] - mean) * (bytes[i + lag] - mean)
    }
    out.push({ lag, r: variance === 0 ? 0 : covariance / variance })
  }
  return out
}

/**
 * Consecutive output pairs, for the scatter panel. RANDU's lattice structure
 * shows up here as visible diagonal banding; a good generator fills the square.
 */
export function scatterPairs(bytes: Uint8Array, limit = 3000): { x: number; y: number }[] {
  const pairs: { x: number; y: number }[] = []
  for (let i = 0; i + 1 < bytes.length && pairs.length < limit; i += 2) {
    pairs.push({ x: bytes[i], y: bytes[i + 1] })
  }
  return pairs
}
