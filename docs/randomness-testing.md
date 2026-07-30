# Randomness Quality Testing

Available at `/attacks/randomness-tests`. Runs a NIST SP 800-22 battery over
several generators and reports p-values side by side.

## The distinction this page exists to make

There are two different questions, and only one of them is testable here.

| Question | Property | Testable statistically? |
| :--- | :--- | :--- |
| Is this sample distinguishable from uniform? | statistical randomness | yes — that is this battery |
| Can an attacker predict the next output? | unpredictability | **no** |

Cryptography needs the second property. `Math.random` (xorshift128+ in V8) has
the first and not the second: it will pass essentially everything on this page,
and recovering its internal state from a modest run of observed output is a
solved problem, after which every future value is known.

So a failing result is conclusive — that generator is unusable. A passing result
is not evidence of anything except the absence of gross statistical bias.

## Reading a p-value

Each test states a null hypothesis ("the bits are random") and computes the
probability of seeing a statistic at least this extreme if that hypothesis were
true. SP 800-22 §1.1.5 rejects below **α = 0.01**.

A single test failing at α = 0.01 happens by chance 1% of the time. Six tests
across several generators will occasionally show a red cell for a good source;
that is what α means, not a bug.

## The tests

### Frequency / Monobit (§2.1)

Are ones and zeros equally common?

```text
S_obs = |Σ ±1| / √n        p = erfc(S_obs / √2)
```

Every other test assumes this one passes, which is why it runs first.

### Block Frequency (§2.2)

Are ones and zeros equally common *within each block*? Catches a stream that is
balanced overall but locally lopsided — 512 ones followed by 512 zeros has a
perfect monobit score and fails here.

### Runs (§2.3)

A run is a maximal block of identical bits. Too few means the bits clump; too
many means they alternate too regularly.

This is where the alternating control `0101…` dies: it has a *perfect* monobit
p-value of 1.0 and a runs p-value below 10⁻⁵⁰. Balance is not randomness.

The test is only meaningful once monobit passes, so the implementation checks
that prerequisite explicitly (`|π − ½| < 2/√n`) rather than assuming it.

### Longest Run of Ones in a Block (§2.4)

Buckets each block by its longest run of ones and compares against the reference
distribution. Detects runs of the wrong *length* even when the total *count* of
runs is right. Uses M = 8 below 6272 bits and M = 128 above.

### Serial (§2.11)

Counts every overlapping m-bit pattern, with wraparound. Uniform pattern
frequency is a much stronger condition than uniform bit frequency.

### Byte Uniformity (χ², 255 df)

Not part of SP 800-22. Included because byte-level bias is what a beginner
intuitively expects "non-random" to mean — and showing that a weak PRNG sails
through it is a useful corrective.

## The generators

| Source | Notes |
| :--- | :--- |
| `crypto.getRandomValues` | The platform CSPRNG. The only source here fit for keys, IVs, nonces or salts. |
| `Math.random` | xorshift128+ in V8. Statistically respectable, completely predictable. |
| xorshift32 (seeded) | Marsaglia's xorshift32. A competent non-cryptographic PRNG, deterministic here. |
| RANDU | `x·65539 mod 2³¹`, shipped by IBM in the 1960s. |
| All zeros | Degenerate control. Must fail everything. |
| Alternating `0101` | Perfectly balanced, perfectly predictable. Passes monobit, fails the rest. |

**Why RANDU.** Its failure mode is the interesting one. Consecutive triples fall
on just 15 planes in 3-space, so a bit-counting test sees very little wrong, and
the scatter plot of consecutive pairs shows the structure immediately. It is the
clearest available demonstration that "passed the statistical tests I ran" and
"has no exploitable structure" are different claims.

## Visual panels

- **Bit plane** — one pixel per bit. Featureless noise is what you want.
- **Consecutive pairs** — a scatter of `(byteₙ, byteₙ₊₁)`. Lines or lattice
  planes mean the next output is a function of the last.
- **Autocorrelation** — lags 1–32. A good generator hovers near zero everywhere.

## Implementation notes

The chi-squared p-values come from the regularized upper incomplete gamma
function `Q(df/2, χ²/2)`, implemented with a series expansion below the
transition point and a continued fraction above it. `erfc` uses the Chebyshev
expansion from *Numerical Recipes* §6.2 and is clamped to `[0, 1]` for
non-negative arguments — the raw expansion overshoots by ~1e-15 at zero, and a
p-value above 1 is meaningless.

Three of the implementations are validated against the worked examples printed in
the specification itself (§2.1.8, §2.2.8 and §2.3.8), which is a stronger check
than self-consistency.

Batteries run one generator per macrotask, so a 64 KB run never blocks the main
thread. A single 64 KB battery completes in a few milliseconds.

## Manual testing

1. Open `/attacks/randomness-tests` and press **Run the battery**.
2. `crypto.getRandomValues` should be green across the row.
3. `Math.random` should be green or nearly so — and the amber panel explains why
   that does not make it safe.
4. `Alternating 0101` should show monobit green and everything else red.
5. Select **RANDU** under Visual structure and compare its scatter plot against
   `crypto.getRandomValues` — the lattice banding is visible immediately.

## References

- NIST SP 800-22 Rev. 1a — *A Statistical Test Suite for Random and Pseudorandom
  Number Generators for Cryptographic Applications*.
- Knuth, *TAOCP* Vol. 2 §3.3.4 — the spectral test and LCG lattice structure.
- Marsaglia, G. (2003). *Xorshift RNGs*, Journal of Statistical Software 8(14).
- Press et al., *Numerical Recipes* 3rd ed., §6.2 — incomplete gamma and erfc.
