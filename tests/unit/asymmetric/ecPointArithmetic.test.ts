import { describe, it, expect } from 'vitest'
import { secp256k1 } from '@noble/curves/secp256k1.js'
import {
  CURVE_PRESETS,
  MAX_ENUMERABLE_P,
  curveByName,
  curveOrder,
  discreteLog,
  discriminant,
  enumeratePoints,
  formatPoint,
  hasseBounds,
  isOnCurve,
  isSingular,
  mod,
  modInverse,
  naiveScalarMultiply,
  pointAdd,
  pointDouble,
  pointNegate,
  pointOrder,
  pointsEqual,
  scalarMultiply,
  subgroupOf,
  validateCurve,
  type CurveParams,
  type ECPoint,
} from '@/lib/asymmetric/ecPointArithmetic'

/** The standard teaching curve: y² = x³ + 2x + 3 over F_97. */
const CURVE_97 = curveByName('Textbook: y² = x³ + 2x + 3 mod 97')

/** A prime-order group: y² = x³ + 2x + 2 over F_17, #E = 19. */
const CURVE_17 = curveByName('Prime order: y² = x³ + 2x + 2 mod 17')

const G97: ECPoint = { x: CURVE_97.gx, y: CURVE_97.gy }
const G17: ECPoint = { x: CURVE_17.gx, y: CURVE_17.gy }

describe('mod', () => {
  it('always returns a non-negative residue', () => {
    expect(mod(7n, 5n)).toBe(2n)
    expect(mod(-7n, 5n)).toBe(3n)
    expect(mod(-1n, 97n)).toBe(96n)
    expect(mod(0n, 5n)).toBe(0n)
  })
})

describe('modInverse', () => {
  it('produces a genuine inverse across the whole field', () => {
    for (let a = 1n; a < 97n; a++) {
      const { inverse } = modInverse(a, 97n)
      expect(mod(a * inverse, 97n)).toBe(1n)
    }
  })

  it('normalises a negative input first', () => {
    const { inverse } = modInverse(-3n, 97n)
    expect(mod(-3n * inverse, 97n)).toBe(1n)
  })

  it('returns the extended Euclidean working', () => {
    const { steps } = modInverse(37n, 97n)
    expect(steps.length).toBeGreaterThan(0)
    expect(steps.every((s) => typeof s.quotient === 'bigint')).toBe(true)
  })

  it('throws when the inverse does not exist', () => {
    expect(() => modInverse(0n, 97n)).toThrowError(/no modular inverse/)
    // gcd(4, 8) = 4, so 4 has no inverse mod 8.
    expect(() => modInverse(4n, 8n)).toThrowError(/gcd\(4, 8\) = 4/)
    expect(() => modInverse(3n, 1n)).toThrowError(/greater than 1/)
  })
})

describe('curve validation', () => {
  it('computes the discriminant and rejects singular curves', () => {
    // 4a³ + 27b² with a = 0, b = 0 vanishes.
    const singular: CurveParams = {
      name: 'singular',
      p: 97n,
      a: 0n,
      b: 0n,
      gx: 0n,
      gy: 0n,
      plottable: true,
      description: '',
    }

    expect(discriminant(singular)).toBe(0n)
    expect(isSingular(singular)).toBe(true)
    expect(() => validateCurve(singular)).toThrowError(/Singular curve/)
  })

  it('accepts every shipped preset as non-singular', () => {
    for (const curve of CURVE_PRESETS) {
      expect(isSingular(curve)).toBe(false)
      expect(() => validateCurve(curve)).not.toThrow()
    }
  })

  it('rejects a field too small for this curve form', () => {
    const tiny: CurveParams = {
      name: 'tiny',
      p: 3n,
      a: 1n,
      b: 1n,
      gx: 0n,
      gy: 1n,
      plottable: true,
      description: '',
    }
    expect(() => validateCurve(tiny)).toThrowError(/at least 5/)
  })
})

describe('isOnCurve', () => {
  it('accepts every shipped generator point', () => {
    for (const curve of CURVE_PRESETS) {
      expect(isOnCurve({ x: curve.gx, y: curve.gy }, curve)).toBe(true)
    }
  })

  it('accepts the point at infinity', () => {
    expect(isOnCurve('infinity', CURVE_97)).toBe(true)
  })

  it('rejects a point off the curve', () => {
    expect(isOnCurve({ x: 3n, y: 7n }, CURVE_97)).toBe(false)
  })

  it('is enforced by the arithmetic functions', () => {
    expect(() => pointAdd({ x: 3n, y: 7n }, G97, CURVE_97)).toThrowError(/does not satisfy/)
    expect(() => pointDouble({ x: 3n, y: 7n }, CURVE_97)).toThrowError(/does not satisfy/)
  })
})

describe('pointNegate', () => {
  it('reflects across the x-axis and stays on the curve', () => {
    const negated = pointNegate(G97, CURVE_97)
    expect(negated).toEqual({ x: 3n, y: 91n }) // 97 - 6
    expect(isOnCurve(negated, CURVE_97)).toBe(true)
  })

  it('leaves the identity alone and is an involution', () => {
    expect(pointNegate('infinity', CURVE_97)).toBe('infinity')
    expect(pointNegate(pointNegate(G97, CURVE_97), CURVE_97)).toEqual(G97)
  })
})

describe('group axioms on y² = x³ + 2x + 3 mod 97', () => {
  const points = enumeratePoints(CURVE_97)
  const all: ECPoint[] = ['infinity', ...points]

  it('has an identity element', () => {
    for (const P of all) {
      expect(pointsEqual(pointAdd(P, 'infinity', CURVE_97).result, P)).toBe(true)
      expect(pointsEqual(pointAdd('infinity', P, CURVE_97).result, P)).toBe(true)
    }
  })

  it('is closed — every sum lands back on the curve', () => {
    for (const P of points) {
      for (const Q of points) {
        expect(isOnCurve(pointAdd(P, Q, CURVE_97).result, CURVE_97)).toBe(true)
      }
    }
  })

  it('is commutative', () => {
    for (const P of points.slice(0, 20)) {
      for (const Q of points.slice(0, 20)) {
        const pq = pointAdd(P, Q, CURVE_97).result
        const qp = pointAdd(Q, P, CURVE_97).result
        expect(pointsEqual(pq, qp)).toBe(true)
      }
    }
  })

  it('gives every element an inverse', () => {
    for (const P of points) {
      const sum = pointAdd(P, pointNegate(P, CURVE_97), CURVE_97).result
      expect(sum).toBe('infinity')
    }
  })

  it('is associative', () => {
    const sample = points.slice(0, 12)
    for (const P of sample) {
      for (const Q of sample) {
        for (const R of sample) {
          const left = pointAdd(pointAdd(P, Q, CURVE_97).result, R, CURVE_97).result
          const right = pointAdd(P, pointAdd(Q, R, CURVE_97).result, CURVE_97).result
          expect(pointsEqual(left, right)).toBe(true)
        }
      }
    }
  })
})

describe('pointAdd — special cases', () => {
  it('returns the identity for P + (−P)', () => {
    const result = pointAdd(G97, pointNegate(G97, CURVE_97), CURVE_97)
    expect(result.result).toBe('infinity')
    expect(result.steps[0].label).toMatch(/Inverse case/)
  })

  it('handles O + O', () => {
    expect(pointAdd('infinity', 'infinity', CURVE_97).result).toBe('infinity')
  })

  it('delegates to doubling when the operands are equal', () => {
    const added = pointAdd(G97, G97, CURVE_97)
    const doubled = pointDouble(G97, CURVE_97)

    expect(pointsEqual(added.result, doubled.result)).toBe(true)
    expect(added.steps.some((s) => /Switching to the tangent rule|switching to the tangent/i.test(s.label))).toBe(true)
  })

  it('traces the slope, the inverse and the coordinates', () => {
    const result = pointAdd(G97, { x: 80n, y: 10n }, CURVE_97)
    expect(isOnCurve(result.result, CURVE_97)).toBe(true)
    expect(result.lambda).toBeDefined()
    expect(result.steps.map((s) => s.label)).toEqual([
      'Chord slope — numerator and denominator',
      'Modular inverse of the denominator',
      'Resulting coordinates',
    ])
  })
})

describe('pointDouble — special cases', () => {
  it('returns the identity when y = 0, where the tangent is vertical', () => {
    // Find a point with y = 0, if the curve has one.
    const yZero = enumeratePoints(CURVE_97).find((p) => p !== 'infinity' && p.y === 0n)
    if (yZero) {
      const result = pointDouble(yZero, CURVE_97)
      expect(result.result).toBe('infinity')
      expect(result.steps[0].label).toMatch(/Vertical tangent/)
    }

    // Construct the case explicitly regardless: y² = x³ − x has (0, 0).
    const withRoot: CurveParams = {
      name: 'roots',
      p: 97n,
      a: 96n, // −1 mod 97
      b: 0n,
      gx: 0n,
      gy: 0n,
      plottable: true,
      description: '',
    }
    expect(isOnCurve({ x: 0n, y: 0n }, withRoot)).toBe(true)
    expect(pointDouble({ x: 0n, y: 0n }, withRoot).result).toBe('infinity')
  })

  it('doubles the identity to the identity', () => {
    expect(pointDouble('infinity', CURVE_97).result).toBe('infinity')
  })
})

describe('scalarMultiply', () => {
  it('agrees with naive repeated addition for every k up to the group order', () => {
    const order = pointOrder(G97, CURVE_97)
    for (let k = 0n; k <= BigInt(order); k++) {
      const fast = scalarMultiply(k, G97, CURVE_97).result
      const naive = naiveScalarMultiply(k, G97, CURVE_97)
      expect(pointsEqual(fast, naive)).toBe(true)
    }
  })

  it('returns the identity for k = 0 and for k = order', () => {
    expect(scalarMultiply(0n, G97, CURVE_97).result).toBe('infinity')
    expect(scalarMultiply(BigInt(pointOrder(G97, CURVE_97)), G97, CURVE_97).result).toBe('infinity')
  })

  it('returns P for k = 1', () => {
    expect(pointsEqual(scalarMultiply(1n, G97, CURVE_97).result, G97)).toBe(true)
  })

  it('counts far fewer operations than repeated addition', () => {
    const result = scalarMultiply(1000n, G17, CURVE_17)
    expect(result.doublings + result.additions).toBeLessThan(25)
    expect(result.naiveAdditions).toBe(999)
  })

  it('emits one ladder step per bit, plus the header and the cost summary', () => {
    const k = 37n // 0b100101, 6 bits
    const result = scalarMultiply(k, G97, CURVE_97)
    expect(result.steps).toHaveLength(6 + 2)
    expect(result.steps[0].substituted).toContain('0b100101')
  })

  it('rejects a negative scalar', () => {
    expect(() => scalarMultiply(-1n, G97, CURVE_97)).toThrowError(/non-negative/)
    expect(() => naiveScalarMultiply(-1n, G97, CURVE_97)).toThrowError(/non-negative/)
  })
})

describe('cross-validation against @noble/curves on secp256k1', () => {
  const secp = curveByName('secp256k1 (Bitcoin) — parameters only')
  const G: ECPoint = { x: secp.gx, y: secp.gy }

  it('places the standard generator on the curve', () => {
    expect(isOnCurve(G, secp)).toBe(true)
  })

  it('matches @noble/curves for a range of scalars', () => {
    // This is the check that proves the implementation is actually correct
    // rather than merely self-consistent on toy curves.
    for (const k of [1n, 2n, 3n, 7n, 255n, 65537n, 123456789n]) {
      const ours = scalarMultiply(k, G, secp).result
      const theirs = secp256k1.Point.BASE.multiply(k).toAffine()

      expect(ours).not.toBe('infinity')
      if (ours === 'infinity') continue
      expect(ours.x).toBe(theirs.x)
      expect(ours.y).toBe(theirs.y)
    }
  })

  it('matches @noble/curves for point addition', () => {
    const p3 = scalarMultiply(3n, G, secp).result
    const p5 = scalarMultiply(5n, G, secp).result
    const ours = pointAdd(p3, p5, secp).result
    const theirs = secp256k1.Point.BASE.multiply(8n).toAffine()

    expect(ours).not.toBe('infinity')
    if (ours === 'infinity') return
    expect(ours.x).toBe(theirs.x)
    expect(ours.y).toBe(theirs.y)
  })

  it('matches @noble/curves for point doubling', () => {
    const ours = pointDouble(G, secp).result
    const theirs = secp256k1.Point.BASE.multiply(2n).toAffine()

    expect(ours).not.toBe('infinity')
    if (ours === 'infinity') return
    expect(ours.x).toBe(theirs.x)
    expect(ours.y).toBe(theirs.y)
  })

  it('refuses to enumerate a curve this large', () => {
    expect(() => enumeratePoints(secp)).toThrowError(/above the 5000 limit/)
    expect(secp.p).toBeGreaterThan(MAX_ENUMERABLE_P)
    expect(secp.plottable).toBe(false)
  })
})

describe('enumeratePoints and curveOrder', () => {
  it('counts the known order of each plottable preset', () => {
    expect(curveOrder(CURVE_97)).toBe(100)
    expect(curveOrder(CURVE_17)).toBe(19)
    expect(curveOrder(curveByName('Larger: y² = x³ + 3 mod 1009'))).toBe(948)
  })

  it('returns only points that satisfy the curve equation', () => {
    for (const point of enumeratePoints(CURVE_17)) {
      expect(isOnCurve(point, CURVE_17)).toBe(true)
    }
  })

  it('pairs points symmetrically about the x-axis', () => {
    for (const point of enumeratePoints(CURVE_97)) {
      expect(isOnCurve(pointNegate(point, CURVE_97), CURVE_97)).toBe(true)
    }
  })
})

describe("Hasse's theorem", () => {
  it('brackets the counted order of every plottable preset', () => {
    for (const curve of CURVE_PRESETS.filter((c) => c.plottable)) {
      const order = curveOrder(curve)
      const bounds = hasseBounds(curve.p)

      expect(order).toBeGreaterThanOrEqual(bounds.lower)
      expect(order).toBeLessThanOrEqual(bounds.upper)
    }
  })

  it('centres the interval on p + 1', () => {
    expect(hasseBounds(97n).centre).toBe(98)
    // |100 - 98| = 2 <= 2*sqrt(97) ≈ 19.7
    expect(hasseBounds(97n).lower).toBeLessThanOrEqual(100)
    expect(hasseBounds(97n).upper).toBeGreaterThanOrEqual(100)
  })
})

describe('subgroupOf and pointOrder', () => {
  it('closes the subgroup with the identity as its final element', () => {
    const { points, order } = subgroupOf(G97, CURVE_97)
    expect(points).toHaveLength(order)
    expect(points[points.length - 1]).toBe('infinity')
    expect(points[0]).toEqual(G97)
  })

  it('gives the identity order 1', () => {
    expect(pointOrder('infinity', CURVE_97)).toBe(1)
  })

  it("satisfies Lagrange's theorem — every point order divides the group order", () => {
    const groupOrder = curveOrder(CURVE_97)
    for (const point of enumeratePoints(CURVE_97)) {
      expect(groupOrder % pointOrder(point, CURVE_97)).toBe(0)
    }
  })

  it('makes every non-identity point a generator when the group order is prime', () => {
    // #E = 19 is prime, so there are no proper non-trivial subgroups.
    const groupOrder = curveOrder(CURVE_17)
    expect(groupOrder).toBe(19)

    for (const point of enumeratePoints(CURVE_17)) {
      expect(pointOrder(point, CURVE_17)).toBe(19)
    }
  })

  it('sends the order-many multiple of a point to the identity', () => {
    for (const point of enumeratePoints(CURVE_17)) {
      const order = BigInt(pointOrder(point, CURVE_17))
      expect(scalarMultiply(order, point, CURVE_17).result).toBe('infinity')
    }
  })
})

describe('discreteLog', () => {
  it('recovers a known scalar', () => {
    for (const k of [1n, 5n, 12n, 18n]) {
      const Q = scalarMultiply(k, G17, CURVE_17).result
      expect(discreteLog(G17, Q, CURVE_17).k).toBe(Number(k))
    }
  })

  it('returns 0 for the identity target', () => {
    const result = discreteLog(G97, 'infinity', CURVE_97)
    expect(result.k).toBe(0)
    expect(result.steps).toBe(0)
  })

  it('reports the search space, which is the point of the whole exercise', () => {
    const Q = scalarMultiply(12n, G17, CURVE_17).result
    const result = discreteLog(G17, Q, CURVE_17)

    expect(result.searchSpace).toBe(pointOrder(G17, CURVE_17))
    expect(result.steps).toBeLessThanOrEqual(result.searchSpace)
  })

  it('returns null when the target is outside the subgroup generated by P', () => {
    // On the composite-order curve, a point of order 2 generates a subgroup
    // that cannot reach a point of larger order.
    const points = enumeratePoints(CURVE_97)
    const smallOrder = points.find((p) => pointOrder(p, CURVE_97) === 2)

    if (smallOrder) {
      const outside = points.find((p) => !pointsEqual(p, smallOrder) && pointOrder(p, CURVE_97) > 2)
      if (outside) {
        expect(discreteLog(smallOrder, outside, CURVE_97).k).toBeNull()
      }
    }
  })
})

describe('formatPoint', () => {
  it('renders coordinates and the identity', () => {
    expect(formatPoint({ x: 3n, y: 6n })).toBe('(3, 6)')
    expect(formatPoint('infinity')).toBe('O (point at infinity)')
  })
})

describe('curveByName', () => {
  it('resolves every shipped preset', () => {
    for (const curve of CURVE_PRESETS) {
      expect(curveByName(curve.name)).toBe(curve)
    }
  })

  it('rejects an unknown name', () => {
    expect(() => curveByName('nope')).toThrowError(/Unknown curve preset/)
  })
})
