/**
 * Elliptic Curve Point Arithmetic — the group law, made visible.
 *
 * The site implements a lot of elliptic-curve cryptography (ecdsa, ecc, ecies,
 * ed25519, x25519, schnorr), but every one of those modules delegates the curve
 * arithmetic to @noble/curves and visualizes the *protocol*: sign, verify,
 * exchange, derive. The layer underneath — what "adding two points" actually
 * means — is missing.
 *
 * This module implements the short Weierstrass group law over a small prime
 * field in plain `bigint`, tracing every step: the chord-and-tangent rule, the
 * modular inverse the slope requires, the point at infinity as the identity,
 * the double-and-add ladder, subgroup structure, and a brute-force discrete log
 * that exists purely to show how badly it scales.
 *
 * This is teaching code, not production code. It is deliberately affine and
 * non-constant-time so the steps stay legible. @noble/curves is the right tool
 * for anything real, and is used in the tests to prove this implementation is
 * not merely self-consistent but actually correct.
 *
 * Pure module: no DOM APIs, typed CipherError on bad input.
 * @see docs/ec-point-arithmetic.md
 */

import { CipherError } from '../utils/errors'

/** The point at infinity is the group identity and has no coordinates. */
export type ECPoint = { x: bigint; y: bigint } | 'infinity'

export interface CurveParams {
  name: string
  /** Prime field modulus. */
  p: bigint
  a: bigint
  b: bigint
  /** Generator / base point. */
  gx: bigint
  gy: bigint
  /** Order of the generator, when known. */
  n?: bigint
  /** Whether the curve is small enough to enumerate and plot. */
  plottable: boolean
  description: string
}

export interface ArithmeticStep {
  label: string
  /** The formula being applied, in symbols. */
  formula: string
  /** The same formula with the actual numbers substituted. */
  substituted: string
  note: string
}

export interface PointOperationResult {
  result: ECPoint
  steps: ArithmeticStep[]
  /** The slope, when one was computed. */
  lambda?: bigint
}

export interface InverseResult {
  inverse: bigint
  steps: { quotient: bigint; remainder: bigint; coefficient: bigint }[]
}

export interface ScalarMultiplyResult {
  result: ECPoint
  steps: ArithmeticStep[]
  /** Number of point doublings performed. */
  doublings: number
  /** Number of point additions performed. */
  additions: number
  /** How many additions naive repeated addition would have needed. */
  naiveAdditions: number
}

export interface SubgroupResult {
  /** The cyclic subgroup ⟨P⟩, in order P, 2P, 3P, …, with infinity last. */
  points: ECPoint[]
  /** Order of P — the smallest n > 0 with nP = O. */
  order: number
}

export interface DiscreteLogResult {
  /** The recovered scalar k with Q = kP, or null if none exists. */
  k: number | null
  /** Point additions performed during the search. */
  steps: number
  /** Order of P, which bounds the search. */
  searchSpace: number
}

/**
 * Enumerating points is O(p) and plotting them is O(p) DOM work. Above this the
 * UI would stall, so the guard is an explicit error rather than a frozen tab.
 */
export const MAX_ENUMERABLE_P = 5000n

/* ------------------------------------------------------------------------- */
/* Field arithmetic                                                          */
/* ------------------------------------------------------------------------- */

/** Positive modulo. JavaScript's % keeps the sign of the dividend; we cannot. */
export function mod(a: bigint, m: bigint): bigint {
  const r = a % m
  return r < 0n ? r + m : r
}

/**
 * Modular inverse by the extended Euclidean algorithm, returning the working so
 * the UI can show where the slope's denominator actually comes from.
 */
export function modInverse(a: bigint, m: bigint): InverseResult {
  if (m <= 1n) {
    throw new CipherError('INVALID_INPUT', `Modulus must be greater than 1 (got ${m}).`)
  }

  const value = mod(a, m)
  if (value === 0n) {
    throw new CipherError(
      'INVALID_INPUT',
      `0 has no modular inverse mod ${m}. In point arithmetic this means the line through the ` +
        `two points is vertical, so their sum is the point at infinity.`
    )
  }

  const steps: { quotient: bigint; remainder: bigint; coefficient: bigint }[] = []

  let oldR = value
  let r = m
  let oldT = 1n
  let t = 0n

  while (r !== 0n) {
    const quotient = oldR / r
    ;[oldR, r] = [r, oldR - quotient * r]
    ;[oldT, t] = [t, oldT - quotient * t]
    steps.push({ quotient, remainder: oldR, coefficient: oldT })
  }

  if (oldR !== 1n) {
    throw new CipherError(
      'INVALID_INPUT',
      `${value} has no inverse mod ${m}: gcd(${value}, ${m}) = ${oldR}, not 1. ` +
        `A field requires a prime modulus.`
    )
  }

  return { inverse: mod(oldT, m), steps }
}

/* ------------------------------------------------------------------------- */
/* Curve validation                                                          */
/* ------------------------------------------------------------------------- */

/**
 * A curve is singular when its discriminant vanishes: 4a³ + 27b² ≡ 0 (mod p).
 * Such a curve has a cusp or a node, the tangent there is undefined, and the
 * chord-and-tangent construction stops being a group law at all.
 */
export function discriminant(curve: CurveParams): bigint {
  return mod(4n * curve.a ** 3n + 27n * curve.b ** 2n, curve.p)
}

export function isSingular(curve: CurveParams): boolean {
  return discriminant(curve) === 0n
}

/** Validate the parameters before any arithmetic is attempted. */
export function validateCurve(curve: CurveParams): void {
  if (curve.p < 5n) {
    throw new CipherError(
      'INVALID_INPUT',
      `The field modulus must be a prime of at least 5 (got ${curve.p}). ` +
        `Characteristics 2 and 3 need a different curve equation entirely.`
    )
  }
  if (isSingular(curve)) {
    throw new CipherError(
      'INVALID_INPUT',
      `Singular curve: 4a³ + 27b² ≡ 0 (mod ${curve.p}). The curve has a cusp or a node where ` +
        `the tangent is undefined, so the chord-and-tangent rule does not define a group.`
    )
  }
}

/** Does this point satisfy y² ≡ x³ + ax + b (mod p)? */
export function isOnCurve(point: ECPoint, curve: CurveParams): boolean {
  if (point === 'infinity') return true

  const { p, a, b } = curve
  const left = mod(point.y * point.y, p)
  const right = mod(point.x * point.x * point.x + a * point.x + b, p)
  return left === right
}

function assertOnCurve(point: ECPoint, curve: CurveParams, label: string): void {
  if (!isOnCurve(point, curve)) {
    const coords = point === 'infinity' ? 'O' : `(${point.x}, ${point.y})`
    throw new CipherError(
      'INVALID_INPUT',
      `${label} = ${coords} does not satisfy y² ≡ x³ + ${curve.a}x + ${curve.b} (mod ${curve.p}).`
    )
  }
}

/**
 * Reduce coordinates into `[0, p)`.
 *
 * `isOnCurve` reduces mod p before checking, so a caller could hand in
 * `{ x: 100n, y: 6n }` on p = 97 and have it accepted — while `pointsEqual` and
 * the `p1.x === p2.x` test in `pointAdd` compare raw bigints and would treat it
 * as different from `{ x: 3n, y: 6n }`. Adding those two would then take the
 * chord branch with a zero denominator and throw a misleading "vertical line"
 * error instead of doubling. Normalising at every entry point removes the whole
 * class of problem.
 */
export function normalisePoint(point: ECPoint, curve: CurveParams): ECPoint {
  if (point === 'infinity') return 'infinity'
  return { x: mod(point.x, curve.p), y: mod(point.y, curve.p) }
}

/** −P is P reflected across the x-axis. */
export function pointNegate(point: ECPoint, curve: CurveParams): ECPoint {
  if (point === 'infinity') return 'infinity'
  return { x: mod(point.x, curve.p), y: mod(-point.y, curve.p) }
}

export function pointsEqual(p1: ECPoint, p2: ECPoint): boolean {
  if (p1 === 'infinity' || p2 === 'infinity') return p1 === p2
  return p1.x === p2.x && p1.y === p2.y
}

export function formatPoint(point: ECPoint): string {
  return point === 'infinity' ? 'O (point at infinity)' : `(${point.x}, ${point.y})`
}

/* ------------------------------------------------------------------------- */
/* The group law                                                             */
/* ------------------------------------------------------------------------- */

/**
 * Point doubling — the tangent case of the chord-and-tangent rule.
 *
 *   λ = (3x² + a) / 2y      x₃ = λ² − 2x      y₃ = λ(x − x₃) − y
 */
export function pointDouble(rawPoint: ECPoint, curve: CurveParams): PointOperationResult {
  validateCurve(curve)
  assertOnCurve(rawPoint, curve, 'P')
  const point = normalisePoint(rawPoint, curve)

  const steps: ArithmeticStep[] = []
  const { p, a } = curve

  if (point === 'infinity') {
    steps.push({
      label: 'Identity case',
      formula: '2O = O',
      substituted: '2O = O',
      note: 'The point at infinity is the group identity, so doubling it changes nothing.',
    })
    return { result: 'infinity', steps }
  }

  if (mod(point.y, p) === 0n) {
    steps.push({
      label: 'Vertical tangent',
      formula: 'y = 0 ⟹ 2P = O',
      substituted: `y = 0 ⟹ 2(${point.x}, 0) = O`,
      note:
        'When y = 0 the tangent is vertical, so it meets the curve nowhere else and the result ' +
        'is the point at infinity. Equivalently P is its own negation, so P + P = P + (−P) = O.',
    })
    return { result: 'infinity', steps }
  }

  const numerator = mod(3n * point.x * point.x + a, p)
  const denominator = mod(2n * point.y, p)

  steps.push({
    label: 'Tangent slope — numerator and denominator',
    formula: 'λ = (3x² + a) · (2y)⁻¹ mod p',
    substituted: `λ = (3·${point.x}² + ${a}) · (2·${point.y})⁻¹ = ${numerator} · ${denominator}⁻¹ mod ${p}`,
    note:
      'Implicit differentiation of y² = x³ + ax + b gives 2y·dy = (3x² + a)·dx, so the tangent ' +
      'slope is (3x² + a)/2y. Over a finite field that division is a modular inverse.',
  })

  const { inverse, steps: inverseSteps } = modInverse(denominator, p)

  steps.push({
    label: 'Modular inverse of the denominator',
    formula: '(2y)⁻¹ mod p via the extended Euclidean algorithm',
    substituted: `${denominator}⁻¹ ≡ ${inverse} (mod ${p}), since ${denominator}·${inverse} ≡ ${mod(denominator * inverse, p)}`,
    note:
      `The extended Euclidean algorithm took ${inverseSteps.length} step(s). This inversion is ` +
      `the expensive part of affine curve arithmetic, which is exactly why production libraries ` +
      `work in projective coordinates and defer it.`,
  })

  const lambda = mod(numerator * inverse, p)
  const x3 = mod(lambda * lambda - 2n * point.x, p)
  const y3 = mod(lambda * (point.x - x3) - point.y, p)

  steps.push({
    label: 'Resulting coordinates',
    formula: 'x₃ = λ² − 2x,  y₃ = λ(x − x₃) − y',
    substituted: `x₃ = ${lambda}² − 2·${point.x} = ${x3},  y₃ = ${lambda}(${point.x} − ${x3}) − ${point.y} = ${y3}`,
    note:
      'The tangent meets the curve at one further point; reflecting it across the x-axis gives ' +
      '2P. That reflection is what makes the operation associative and the structure a group.',
  })

  return { result: { x: x3, y: y3 }, steps, lambda }
}

/**
 * Point addition — the chord case, with full identity and inverse handling.
 *
 *   λ = (y₂ − y₁) / (x₂ − x₁)      x₃ = λ² − x₁ − x₂      y₃ = λ(x₁ − x₃) − y₁
 */
export function pointAdd(rawP1: ECPoint, rawP2: ECPoint, curve: CurveParams): PointOperationResult {
  validateCurve(curve)
  assertOnCurve(rawP1, curve, 'P')
  assertOnCurve(rawP2, curve, 'Q')

  // Normalise before the x-equality test below, which compares raw bigints.
  const p1 = normalisePoint(rawP1, curve)
  const p2 = normalisePoint(rawP2, curve)

  const steps: ArithmeticStep[] = []
  const { p } = curve

  if (p1 === 'infinity') {
    steps.push({
      label: 'Identity case',
      formula: 'O + Q = Q',
      substituted: `O + ${formatPoint(p2)} = ${formatPoint(p2)}`,
      note: 'The point at infinity is the additive identity of the group.',
    })
    return { result: p2, steps }
  }

  if (p2 === 'infinity') {
    steps.push({
      label: 'Identity case',
      formula: 'P + O = P',
      substituted: `${formatPoint(p1)} + O = ${formatPoint(p1)}`,
      note: 'The point at infinity is the additive identity of the group.',
    })
    return { result: p1, steps }
  }

  if (p1.x === p2.x) {
    if (mod(p1.y + p2.y, p) === 0n) {
      steps.push({
        label: 'Inverse case — vertical chord',
        formula: 'P + (−P) = O',
        substituted: `${formatPoint(p1)} + ${formatPoint(p2)} = O`,
        note:
          'The two points share an x-coordinate and have opposite y-coordinates, so the line ' +
          'through them is vertical. A vertical line meets the curve at no third affine point, ' +
          'and that missing intersection is precisely what the point at infinity represents. ' +
          'This is why O has to exist for the group to be closed.',
      })
      return { result: 'infinity', steps }
    }

    steps.push({
      label: 'Same point — switching to the tangent rule',
      formula: 'P = Q ⟹ use point doubling',
      substituted: `${formatPoint(p1)} = ${formatPoint(p2)}`,
      note:
        'There is no unique chord through a single point, so the limiting case is the tangent. ' +
        'That is the doubling formula, and the reason the group law needs two cases at all.',
    })

    const doubled = pointDouble(p1, curve)
    return { result: doubled.result, steps: [...steps, ...doubled.steps], lambda: doubled.lambda }
  }

  const numerator = mod(p2.y - p1.y, p)
  const denominator = mod(p2.x - p1.x, p)

  steps.push({
    label: 'Chord slope — numerator and denominator',
    formula: 'λ = (y₂ − y₁) · (x₂ − x₁)⁻¹ mod p',
    substituted: `λ = (${p2.y} − ${p1.y}) · (${p2.x} − ${p1.x})⁻¹ = ${numerator} · ${denominator}⁻¹ mod ${p}`,
    note:
      'Over the reals this is just rise over run. Over F_p the "slope" has no geometric meaning ' +
      'at all — but the algebra carries over unchanged, and that is the whole trick.',
  })

  const { inverse, steps: inverseSteps } = modInverse(denominator, p)

  steps.push({
    label: 'Modular inverse of the denominator',
    formula: '(x₂ − x₁)⁻¹ mod p via the extended Euclidean algorithm',
    substituted: `${denominator}⁻¹ ≡ ${inverse} (mod ${p}), since ${denominator}·${inverse} ≡ ${mod(denominator * inverse, p)}`,
    note: `The extended Euclidean algorithm took ${inverseSteps.length} step(s).`,
  })

  const lambda = mod(numerator * inverse, p)
  const x3 = mod(lambda * lambda - p1.x - p2.x, p)
  const y3 = mod(lambda * (p1.x - x3) - p1.y, p)

  steps.push({
    label: 'Resulting coordinates',
    formula: 'x₃ = λ² − x₁ − x₂,  y₃ = λ(x₁ − x₃) − y₁',
    substituted: `x₃ = ${lambda}² − ${p1.x} − ${p2.x} = ${x3},  y₃ = ${lambda}(${p1.x} − ${x3}) − ${p1.y} = ${y3}`,
    note:
      'The chord meets the curve at exactly one further point; reflecting it across the x-axis ' +
      'gives P + Q. Without the reflection the operation would not be associative.',
  })

  return { result: { x: x3, y: y3 }, steps, lambda }
}

/**
 * Scalar multiplication by double-and-add: O(log k) operations instead of O(k).
 *
 * The gap between `doublings + additions` and `naiveAdditions` is why ECC is
 * usable at all. The gap between computing kP and *recovering* k is why it is
 * secure.
 */
export function scalarMultiply(
  k: bigint,
  rawPoint: ECPoint,
  curve: CurveParams
): ScalarMultiplyResult {
  validateCurve(curve)
  assertOnCurve(rawPoint, curve, 'P')
  const point = normalisePoint(rawPoint, curve)

  if (k < 0n) {
    throw new CipherError(
      'INVALID_INPUT',
      `Scalar must be non-negative (got ${k}). Compute (−k)·(−P) instead.`
    )
  }

  const steps: ArithmeticStep[] = []
  let doublings = 0
  let additions = 0

  if (k === 0n) {
    steps.push({
      label: 'Zero scalar',
      formula: '0·P = O',
      substituted: '0·P = O',
      note: 'Multiplying by zero yields the identity, as in any group.',
    })
    return { result: 'infinity', steps, doublings, additions, naiveAdditions: 0 }
  }

  const bits = k.toString(2)
  const setBits = [...bits].filter((b) => b === '1').length

  steps.push({
    label: 'Binary expansion of the scalar',
    formula: 'k = Σ bᵢ 2ⁱ',
    substituted: `${k} = 0b${bits} (${bits.length} bits, ${setBits} set)`,
    note:
      'Double-and-add walks the bits from most significant down: double at every bit, and add P ' +
      'wherever the bit is set. That is roughly log₂(k) doublings instead of k additions.',
  })

  let result: ECPoint = 'infinity'

  for (let i = 0; i < bits.length; i++) {
    const bit = bits[i]

    if (i > 0) {
      result = pointDouble(result, curve).result
      doublings++
    }

    if (bit === '1') {
      result = pointAdd(result, point, curve).result
      additions++
    }

    steps.push({
      label: `Bit ${bits.length - 1 - i} = ${bit} — ${bit === '1' ? 'double, then add P' : 'double only'}`,
      formula: bit === '1' ? 'R ← 2R + P' : 'R ← 2R',
      substituted: `R = ${formatPoint(result)}`,
      note: `After processing bit ${i + 1} of ${bits.length}.`,
    })
  }

  const naiveAdditions = Number(k) - 1

  steps.push({
    label: 'Cost comparison',
    formula: 'double-and-add vs repeated addition',
    substituted:
      `${doublings} doublings + ${additions} additions = ${doublings + additions} operations, ` +
      `versus ${naiveAdditions} additions naively`,
    note:
      'The saving is exponential in the bit length. On a 256-bit curve this is roughly 384 ' +
      'operations instead of 2²⁵⁶ — which is what makes the forward direction cheap while the ' +
      'inverse direction stays infeasible.',
  })

  return { result, steps, doublings, additions, naiveAdditions }
}

/**
 * Repeated addition, kept only as an independent check on double-and-add.
 *
 * Bounded by `MAX_ENUMERABLE_P`: this loops `k` times, so a cryptographic-size
 * scalar would never return. The guard lives here rather than in the caller so
 * the library cannot be made to hang by any UI.
 */
export function naiveScalarMultiply(k: bigint, point: ECPoint, curve: CurveParams): ECPoint {
  if (k < 0n) {
    throw new CipherError('INVALID_INPUT', `Scalar must be non-negative (got ${k}).`)
  }
  if (k > MAX_ENUMERABLE_P) {
    throw new CipherError(
      'INVALID_INPUT',
      `Repeated addition performs k operations, and k = ${k} exceeds the ${MAX_ENUMERABLE_P} ` +
        `limit. Use scalarMultiply(), which is O(log k) — that difference is the point.`
    )
  }

  let result: ECPoint = 'infinity'
  for (let i = 0n; i < k; i++) {
    result = pointAdd(result, point, curve).result
  }
  return result
}

/* ------------------------------------------------------------------------- */
/* Group structure                                                           */
/* ------------------------------------------------------------------------- */

/**
 * Every affine point on the curve, found by testing which field elements are
 * quadratic residues. Guarded by `MAX_ENUMERABLE_P` — this is O(p), and the
 * whole point of a real curve is that p is far too large for it to terminate.
 */
export function enumeratePoints(curve: CurveParams): ECPoint[] {
  validateCurve(curve)

  if (curve.p > MAX_ENUMERABLE_P) {
    throw new CipherError(
      'INVALID_INPUT',
      `Enumerating every point is O(p) and this curve has p = ${curve.p}, above the ` +
        `${MAX_ENUMERABLE_P} limit. That intractability is the entire security argument: ` +
        `secp256k1's p is about 1.16 × 10⁷⁷.`
    )
  }

  const { p, a, b } = curve

  // Map each quadratic residue to the y values whose square it is.
  const rootsOfSquare = new Map<bigint, bigint[]>()
  for (let y = 0n; y < p; y++) {
    const square = mod(y * y, p)
    const existing = rootsOfSquare.get(square)
    if (existing) existing.push(y)
    else rootsOfSquare.set(square, [y])
  }

  const points: ECPoint[] = []
  for (let x = 0n; x < p; x++) {
    const rhs = mod(x * x * x + a * x + b, p)
    for (const y of rootsOfSquare.get(rhs) ?? []) {
      points.push({ x, y })
    }
  }

  return points
}

/** #E(F_p), counting the point at infinity. */
export function curveOrder(curve: CurveParams): number {
  return enumeratePoints(curve).length + 1
}

/** Hasse's theorem: |#E − (p + 1)| ≤ 2√p. */
export function hasseBounds(p: bigint): { lower: number; upper: number; centre: number } {
  const centre = Number(p) + 1
  const spread = 2 * Math.sqrt(Number(p))
  return { lower: Math.ceil(centre - spread), upper: Math.floor(centre + spread), centre }
}

/**
 * The cyclic subgroup ⟨P⟩ = { P, 2P, 3P, …, O }, in that order.
 *
 * Bounded by `MAX_ENUMERABLE_P` for the same reason as `enumeratePoints`: by
 * Hasse the subgroup order is on the order of p, so on a real curve this would
 * neither terminate nor fit in memory. `pointOrder` and `discreteLog` both
 * route through here and inherit the guard.
 */
export function subgroupOf(rawPoint: ECPoint, curve: CurveParams): SubgroupResult {
  validateCurve(curve)
  assertOnCurve(rawPoint, curve, 'P')

  if (curve.p > MAX_ENUMERABLE_P) {
    throw new CipherError(
      'INVALID_INPUT',
      `Walking a subgroup takes up to #E ≈ p steps, and this curve has p = ${curve.p}, above ` +
        `the ${MAX_ENUMERABLE_P} limit. On secp256k1 the walk would take about 2²⁵⁶ additions — ` +
        `which is exactly why the discrete logarithm is considered hard.`
    )
  }

  const point = normalisePoint(rawPoint, curve)

  if (point === 'infinity') {
    return { points: ['infinity'], order: 1 }
  }

  const points: ECPoint[] = []
  let current: ECPoint = point
  // Hasse bounds the order well below this; the cap is a runaway guard only.
  const limit = Number(curve.p) + Math.ceil(2 * Math.sqrt(Number(curve.p))) + 2

  for (let i = 1; i <= limit; i++) {
    points.push(current)
    if (current === 'infinity') {
      return { points, order: i }
    }
    current = pointAdd(current, point, curve).result
  }

  throw new CipherError(
    'INVALID_INPUT',
    'The subgroup did not close within the Hasse bound — the curve parameters are inconsistent.'
  )
}

/** Order of P: the smallest n > 0 with nP = O. */
export function pointOrder(point: ECPoint, curve: CurveParams): number {
  return subgroupOf(point, curve).order
}

/**
 * Brute-force ECDLP: find k with Q = kP by walking the subgroup.
 *
 * Included precisely because it is hopeless at scale. On a toy curve it
 * finishes instantly; the reported `searchSpace` set beside secp256k1's ~2²⁵⁶
 * is the argument for why the field has to be enormous.
 */
export function discreteLog(
  basePoint: ECPoint,
  target: ECPoint,
  curve: CurveParams
): DiscreteLogResult {
  validateCurve(curve)
  assertOnCurve(basePoint, curve, 'P')
  assertOnCurve(target, curve, 'Q')

  const order = pointOrder(basePoint, curve)

  if (target === 'infinity') {
    return { k: 0, steps: 0, searchSpace: order }
  }

  let current: ECPoint = basePoint
  for (let k = 1; k <= order; k++) {
    if (pointsEqual(current, target)) {
      return { k, steps: k, searchSpace: order }
    }
    current = pointAdd(current, basePoint, curve).result
  }

  return { k: null, steps: order, searchSpace: order }
}

/* ------------------------------------------------------------------------- */
/* Presets                                                                   */
/* ------------------------------------------------------------------------- */

export const CURVE_PRESETS: CurveParams[] = [
  {
    name: 'Textbook: y² = x³ + 2x + 3 mod 97',
    p: 97n,
    a: 2n,
    b: 3n,
    gx: 3n,
    gy: 6n,
    plottable: true,
    description:
      'The standard teaching curve. #E = 100, so the group has cofactor structure worth poking ' +
      'at, and it is small enough to enumerate every point and watch a subgroup fill in.',
  },
  {
    name: 'Prime order: y² = x³ + 2x + 2 mod 17',
    p: 17n,
    a: 2n,
    b: 2n,
    gx: 5n,
    gy: 1n,
    n: 19n,
    plottable: true,
    description:
      'Tiny enough to check the whole group by hand. #E = 19 is prime, so by Lagrange every ' +
      'non-identity point generates the entire group — cofactor 1, no small subgroups to fall into.',
  },
  {
    name: 'Larger: y² = x³ + 3 mod 1009',
    p: 1009n,
    a: 0n,
    b: 3n,
    gx: 1n,
    gy: 2n,
    plottable: true,
    description:
      'Like secp256k1 this has a = 0, though b differs (3 here, 7 there) — the point is the ' +
      'shape of the equation at a size you can still plot. #E = 948 = 2² · 3 · 79, so subgroup ' +
      'orders here are genuinely varied.',
  },
  {
    name: 'secp256k1 (Bitcoin) — parameters only',
    p: 0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2fn,
    a: 0n,
    b: 7n,
    gx: 0x79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798n,
    gy: 0x483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8n,
    n: 0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141n,
    plottable: false,
    description:
      'The real curve behind Bitcoin and Ethereum. Every formula in this module is correct for ' +
      'it — but p is about 1.16 × 10⁷⁷, so it can never be enumerated, plotted, or brute-forced. ' +
      'That gap between "correct" and "tractable" is the whole point.',
  },
]

export function curveByName(name: string): CurveParams {
  const curve = CURVE_PRESETS.find((c) => c.name === name)
  if (!curve) {
    throw new CipherError('ALGORITHM_UNSUPPORTED', `Unknown curve preset '${name}'.`)
  }
  return curve
}
