/**
 * Elliptic-curve group arithmetic over a prime field F_p, for the interactive
 * Point-Arithmetic Playground.
 *
 * The repo has ECC-based ciphers (ecc, ecdsa, x25519) but no geometric view of
 * *why* they work. This module implements the group law exactly (BigInt, no
 * floats) on a short-Weierstrass curve  y² = x³ + a·x + b  (mod p), small enough
 * that every point can be enumerated and plotted. It's the mathematical backbone
 * for the F_p scatter view and the scalar-multiplication animation.
 */

export interface Curve {
  a: bigint
  b: bigint
  p: bigint
}

/** An affine point, or `null` for the point at infinity (the group identity). */
export type CurvePoint = { x: bigint; y: bigint } | null

export function mod(a: bigint, m: bigint): bigint {
  const r = a % m
  return r >= 0n ? r : r + m
}

/** Modular inverse via the extended Euclidean algorithm. Throws if not invertible. */
export function modInverse(a: bigint, m: bigint): bigint {
  let [oldR, r] = [mod(a, m), m]
  let [oldS, s] = [1n, 0n]
  while (r !== 0n) {
    const q = oldR / r
    ;[oldR, r] = [r, oldR - q * r]
    ;[oldS, s] = [s, oldS - q * s]
  }
  if (oldR !== 1n) {
    throw new Error(`${a} has no inverse modulo ${m}`)
  }
  return mod(oldS, m)
}

/** A curve is non-singular iff 4a³ + 27b² ≠ 0 (mod p). */
export function isValidCurve(curve: Curve): boolean {
  if (curve.p <= 3n) return false
  const { a, b, p } = curve
  return mod(4n * a ** 3n + 27n * b ** 2n, p) !== 0n
}

export function isOnCurve(point: CurvePoint, curve: Curve): boolean {
  if (point === null) return true
  const { a, b, p } = curve
  const lhs = mod(point.y * point.y, p)
  const rhs = mod(point.x ** 3n + a * point.x + b, p)
  return lhs === rhs
}

/** The inverse of P is its reflection across the x-axis. */
export function negate(point: CurvePoint, curve: Curve): CurvePoint {
  if (point === null) return null
  return { x: point.x, y: mod(-point.y, curve.p) }
}

export function pointsEqual(a: CurvePoint, b: CurvePoint): boolean {
  if (a === null || b === null) return a === b
  return a.x === b.x && a.y === b.y
}

/** Group addition P + Q (chord-and-tangent law) over F_p. */
export function pointAdd(P: CurvePoint, Q: CurvePoint, curve: Curve): CurvePoint {
  if (P === null) return Q
  if (Q === null) return P
  const { a, p } = curve

  if (P.x === Q.x && mod(P.y + Q.y, p) === 0n) {
    // P + (−P) = O
    return null
  }

  let slope: bigint
  if (P.x === Q.x && P.y === Q.y) {
    // Doubling: tangent slope (3x² + a) / (2y)
    if (P.y === 0n) return null
    slope = mod((3n * P.x * P.x + a) * modInverse(2n * P.y, p), p)
  } else {
    // Chord slope (yq − yp) / (xq − xp)
    slope = mod((Q.y - P.y) * modInverse(mod(Q.x - P.x, p), p), p)
  }

  const x3 = mod(slope * slope - P.x - Q.x, p)
  const y3 = mod(slope * (P.x - x3) - P.y, p)
  return { x: x3, y: y3 }
}

export function pointDouble(P: CurvePoint, curve: Curve): CurvePoint {
  return pointAdd(P, P, curve)
}

/** Scalar multiplication k·P via double-and-add. */
export function scalarMultiply(k: bigint, P: CurvePoint, curve: Curve): CurvePoint {
  if (k < 0n) return scalarMultiply(-k, negate(P, curve), curve)
  let result: CurvePoint = null
  let addend: CurvePoint = P
  let n = k
  while (n > 0n) {
    if (n & 1n) result = pointAdd(result, addend, curve)
    addend = pointDouble(addend, curve)
    n >>= 1n
  }
  return result
}

/** Every step of k·P (for animating double-and-add / repeated addition). */
export function scalarMultiplySteps(
  k: bigint,
  P: CurvePoint,
  curve: Curve,
): CurvePoint[] {
  const steps: CurvePoint[] = []
  let acc: CurvePoint = null
  for (let i = 0n; i < k; i += 1n) {
    acc = pointAdd(acc, P, curve)
    steps.push(acc)
  }
  return steps
}

/** All affine points on the curve (only feasible for small p) — for the scatter view. */
export function enumeratePoints(curve: Curve): CurvePoint[] {
  const { a, b, p } = curve
  const points: CurvePoint[] = [null]
  for (let x = 0n; x < p; x += 1n) {
    const rhs = mod(x ** 3n + a * x + b, p)
    for (let y = 0n; y < p; y += 1n) {
      if (mod(y * y, p) === rhs) {
        points.push({ x, y })
      }
    }
  }
  return points
}

/** The order of P: smallest m > 0 with m·P = O. Bounded by the group size. */
export function pointOrder(P: CurvePoint, curve: Curve): number {
  if (P === null) return 1
  let acc: CurvePoint = P
  let m = 1
  const bound = Number(curve.p) * 2 + 4
  while (acc !== null && m <= bound) {
    acc = pointAdd(acc, P, curve)
    m += 1
  }
  return m
}
