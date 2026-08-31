import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import {
  type Curve,
  type CurvePoint,
  isValidCurve,
  isOnCurve,
  negate,
  pointAdd,
  pointDouble,
  scalarMultiply,
  scalarMultiplySteps,
  enumeratePoints,
  pointOrder,
  pointsEqual,
} from '../../../lib/ecc/curveArithmetic'

// Textbook curve y² = x³ + 2x + 2 over F_17: 19 points, generator (5,1), prime order 19.
const CURVE: Curve = { a: 2n, b: 2n, p: 17n }
const G: CurvePoint = { x: 5n, y: 1n }
const POINTS = enumeratePoints(CURVE)

describe('ecc curveArithmetic', () => {
  it('validates non-singular curves and enumerates the right group', () => {
    expect(isValidCurve(CURVE)).toBe(true)
    // Singular curve: 4a³+27b² = 0 mod p.
    expect(isValidCurve({ a: 0n, b: 0n, p: 17n })).toBe(false)
    expect(POINTS.length).toBe(19) // 18 affine + point at infinity
    expect(POINTS.every((P) => isOnCurve(P, CURVE))).toBe(true)
  })

  it('matches known scalar multiples of the generator', () => {
    expect(scalarMultiply(2n, G, CURVE)).toEqual({ x: 6n, y: 3n })
    expect(scalarMultiply(3n, G, CURVE)).toEqual({ x: 10n, y: 6n })
    expect(pointOrder(G, CURVE)).toBe(19)
    expect(scalarMultiply(19n, G, CURVE)).toBeNull() // 19·G = O
  })

  it('honors the identity and inverse laws', () => {
    expect(pointAdd(G, null, CURVE)).toEqual(G)
    expect(pointAdd(null, G, CURVE)).toEqual(G)
    expect(pointAdd(G, negate(G, CURVE), CURVE)).toBeNull()
  })

  it('doubling equals self-addition', () => {
    for (const P of POINTS) {
      expect(pointsEqual(pointDouble(P, CURVE), pointAdd(P, P, CURVE))).toBe(true)
    }
  })

  it('scalarMultiply (double-and-add) agrees with repeated addition', () => {
    for (let k = 1n; k <= 20n; k += 1n) {
      const steps = scalarMultiplySteps(k, G, CURVE)
      expect(pointsEqual(steps[steps.length - 1], scalarMultiply(k, G, CURVE))).toBe(true)
    }
  })

  it('addition is closed on the curve', () => {
    for (const P of POINTS) {
      for (const Q of POINTS) {
        expect(isOnCurve(pointAdd(P, Q, CURVE), CURVE)).toBe(true)
      }
    }
  })

  it('property: the group law is commutative and associative', () => {
    const pick = fc.integer({ min: 0, max: POINTS.length - 1 })
    fc.assert(
      fc.property(pick, pick, pick, (i, j, k) => {
        const [P, Q, R] = [POINTS[i], POINTS[j], POINTS[k]]
        // commutative
        if (!pointsEqual(pointAdd(P, Q, CURVE), pointAdd(Q, P, CURVE))) return false
        // associative
        const left = pointAdd(pointAdd(P, Q, CURVE), R, CURVE)
        const right = pointAdd(P, pointAdd(Q, R, CURVE), CURVE)
        return pointsEqual(left, right)
      }),
      { numRuns: 200 },
    )
  })
})
