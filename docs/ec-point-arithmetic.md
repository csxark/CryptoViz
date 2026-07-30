# Elliptic Curve Point Arithmetic

Available at `/visualizer/ec-point-arithmetic`. Implements the short Weierstrass
group law over a small prime field, tracing every step.

## The curve

```text
y² = x³ + ax + b   over F_p
```

with the non-singularity condition

```text
4a³ + 27b² ≢ 0 (mod p)
```

A vanishing discriminant means a cusp or a node, where the tangent is undefined.
The chord-and-tangent construction then fails to define a group at all, so the
module rejects such parameters outright rather than producing wrong answers.

## The group law

**Addition (chord).** Draw the line through P and Q. It meets the curve at
exactly one further point. Reflect that point across the x-axis.

```text
λ  = (y₂ − y₁)(x₂ − x₁)⁻¹ mod p
x₃ = λ² − x₁ − x₂
y₃ = λ(x₁ − x₃) − y₁
```

**Doubling (tangent).** There is no unique chord through a single point, so take
the limiting case — the tangent. Implicit differentiation of the curve equation
gives `2y·dy = (3x² + a)·dx`, hence:

```text
λ  = (3x² + a)(2y)⁻¹ mod p
x₃ = λ² − 2x
y₃ = λ(x − x₃) − y
```

**Why the reflection?** Without it the operation is not associative. The
reflection is not decoration — it is what makes the structure a group.

**Where the modular inverse enters.** Both slopes divide, and division in `F_p`
is multiplication by a modular inverse, computed with the extended Euclidean
algorithm. That inversion is the expensive step in affine arithmetic, which is
why production libraries work in projective coordinates and defer it. The
playground shows the Euclidean working, because the inverse is otherwise a magic
number appearing out of nowhere.

## The point at infinity

`O` is the group identity. It exists because a **vertical** line through P and
−P meets the curve at no third affine point — and the group must be closed, so
that missing intersection needs a name.

Consequences the playground demonstrates directly:

- `P + O = O + P = P`
- `P + (−P) = O`, where `−P = (x, −y mod p)`
- `2P = O` whenever `y = 0`, because the tangent there is vertical

## Over ℝ versus over F_p

Textbook pictures show a smooth curve, and they are misleading. Real ECC lives
in a finite field, where the point set is a **scatter of dots** symmetric about
`y = p/2`. "The point above the line" has no meaning. The chord rule still works
because it was always algebraic; the geometry was only ever an intuition pump.

The playground plots the actual lattice for this reason.

## Scalar multiplication

Double-and-add walks the bits of `k` from most significant down: double at every
bit, add `P` wherever the bit is set.

```text
k = 1000  →  ~10 doublings + ~6 additions   vs  999 additions naively
```

On a 256-bit curve that is roughly 384 operations instead of 2²⁵⁶. The
playground prints both counts side by side.

## Group structure

**Hasse's theorem** confines the order:

```text
|#E(F_p) − (p + 1)| ≤ 2√p
```

**Lagrange's theorem** means the order of any point divides `#E`. The cofactor
`h = #E / n` is why curve parameters are not arbitrary: a generator landing in a
small subgroup would confine every key to that subgroup, which is the basis of
small-subgroup attacks.

Shipped presets:

| Curve | #E | Note |
| :--- | :--- | :--- |
| `y² = x³ + 2x + 3 mod 97` | 100 | standard teaching curve, composite order |
| `y² = x³ + 2x + 2 mod 17` | 19 | prime order, so every point generates the whole group |
| `y² = x³ + 3 mod 1009` | 948 | `948 = 2² · 3 · 79`, varied subgroup orders |
| secp256k1 | ~2²⁵⁶ | parameters only — correct, but not enumerable |

## The discrete logarithm

Given `P` and `Q = kP`, recover `k`. Computing `kP` costs `O(log k)`; the best
known general attack on `k` costs `O(√n)` (Pollard's rho). No polynomial
algorithm is known on a classical computer.

The playground brute-forces it on a toy curve — instantly, over a search space
of a few dozen — and reports that search space alongside secp256k1's ~2²⁵⁶. The
asymmetry between those two numbers is the entire security argument.

## Scope and honesty about this code

This is teaching code. It is deliberately **affine and non-constant-time** so
the steps stay legible, which makes it unsuitable for anything real: a
production implementation must be constant-time to resist timing attacks, and
must use projective coordinates to avoid an inversion per operation.

`@noble/curves` is the right tool for real work, and is used in the test suite to
**cross-validate** this implementation on secp256k1 — scalar multiplication,
addition and doubling are all checked against it, so the module is proven
correct rather than merely self-consistent on toy curves.

## Manual testing

1. Open `/visualizer/ec-point-arithmetic`. The default curve plots 99 affine
   points, symmetric about the midline.
2. Click two points with **P + Q** selected — the result turns red on the plot
   and the trace shows the slope, the modular inverse and the coordinates. The
   two dropdowns below the plot do the same selection without a mouse.
3. Click a point, press **Negate P** (which replaces P with −P, leaving Q
   empty), then click the *original* point again to fill Q. The result is `O`,
   with the vertical-chord explanation.
4. Switch to **kP**, set `k = 1000`, and compare the operation count against the
   naive figure. With nothing selected, P shows the base point G — that is the
   fallback the trace uses.
5. Press **Use the curve's base point** and expand the subgroup listing — the
   subgroup order divides 100, as Lagrange requires.
6. Click any multiple in that list to brute-force its discrete log and see the
   search-space comparison.
7. Select **secp256k1** and confirm the plot is replaced by the intractability
   notice while scalar multiplication still works.

## References

- Hankerson, Menezes & Vanstone, *Guide to Elliptic Curve Cryptography*, §3.1.
- Washington, *Elliptic Curves: Number Theory and Cryptography*, §2.2.
- SEC 1 v2.0 — Elliptic Curve Cryptography.
- NIST FIPS 186-5 — Digital Signature Standard.
