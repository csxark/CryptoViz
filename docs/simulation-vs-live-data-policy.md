# Simulation vs. Live Data Policy

CryptoViz is an educational visualizer, not a cryptographic product. Most
visualizations are simulations: reduced key sizes, synthetic test vectors,
simplified state machines, or mocked network exchanges. That is correct and
intentional. The failure mode this policy prevents is a simulation being
presented, described, or documented as if it were a verified, real, or
production-equivalent cryptographic operation.

## Rule

**A simulated operation must never be described, labeled, or implied to be a
verified operation.** This applies to UI copy, code comments, commit
messages, PR descriptions, and documentation equally.

Contributors are explicitly prohibited from claiming simulated operations
are verified operations. This is a hard PR-rejection criterion, not a style
preference.

## Definitions

- **Simulated operation**: any computation that uses reduced parameters
  (e.g. small RSA moduli for visualization), synthetic or fixed randomness,
  a mocked network peer, a subset of a real protocol's message flow, or an
  approximation of timing/side-channel behavior for teaching purposes.
- **Live / verified operation**: a computation that uses the full real
  parameters of the standard it implements, real randomness sources, and
  produces output that matches an independent reference implementation
  (e.g. a `TEST_VECTORS` match against NIST/RFC published vectors).

## Where the line must be visible

- **`CipherOptions.mode`**: `'demo'` must be used for any simulated
  execution path. `'real'` is reserved for paths verified against
  published test vectors. A cipher must not default to `'real'` unless its
  `TEST_VECTORS` match an authoritative source.
- **UI copy**: any visualizer running reduced parameters (e.g. a "toy RSA"
  with a 16-bit modulus) must say so in visible copy near the
  visualization, not only in a tooltip or docs page.
- **Protocol visualizers** (TLS handshake, EMV, WebAuthn, threshold DKG,
  signal-lab, etc.): if the visualizer mocks a peer, a network, or a
  hardware security module, the mock must be labeled as a mock in the
  component itself.
- **Attack playgrounds** (side-channel, timing, rainbow table): simulated
  timing noise or synthetic leakage must be labeled as simulated. Do not
  imply the browser is measuring real hardware side channels unless it
  is (it generally is not, and should not claim to be).
- **Case studies / interview / myth-busters content**: claims about what
  is or is not secure must cite the standard or source; simulated demo
  results are not evidence for a security claim.

## Reviewer check

When reviewing a PR, confirm:

1. Every user-facing claim of correctness ("matches AES-256", "real RSA
   encryption") is backed by `TEST_VECTORS` that match a cited external
   source.
2. Every reduced-parameter or mocked-peer visualization carries visible
   in-UI language identifying it as a simulation.
3. No commit message, PR description, or code comment asserts a simulated
   feature is "production-grade," "verified," or "real" without meeting
   criterion 1.

Violation of this policy is treated the same as a security defect: the PR
is blocked until the mislabeling is corrected, regardless of how the rest
of the change performs.
