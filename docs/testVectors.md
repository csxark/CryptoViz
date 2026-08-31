# Cryptographic Test Vectors

This directory contains authoritative known-answer test vectors for
standardized cryptographic algorithms implemented by CryptoViz.

## Purpose

CryptoViz is an educational cryptography platform. Algorithm output must be
validated against independent, authoritative sources rather than relying only
on implementation-specific round-trip tests.

## Structure

- `aes/` — AES and AES mode vectors
- `des/` — DES and Triple DES vectors
- `sha/` — SHA-family vectors
- `hmac/` — HMAC vectors
- `cmac/` — CMAC vectors
- `kdf/` — PBKDF2 and HKDF vectors
- `ecc/` — ECDSA, Ed25519, Ed448, X25519 and X448 vectors
- `pqc/` — ML-KEM and ML-DSA vectors

## Vector requirements

Every standardized algorithm must have:

1. At least one authoritative known-answer vector.
2. An explicit source and standard.
3. Empty-input coverage where applicable.
4. Multi-block coverage where applicable.
5. Boundary key sizes where applicable.
6. Invalid parameter coverage where applicable.

## Sources

Expected values must be copied from the cited standard or authoritative
validation corpus.

Do not generate expected values using the CryptoViz implementation itself.

## Adding an algorithm

When adding a standardized algorithm:

1. Add its vector suite.
2. Add its coverage entry to `algorithmCoverage.ts`.
3. Include authoritative source metadata.
4. Add edge-case and invalid-parameter coverage.
5. Run the complete test suite locally.

An algorithm without vector coverage must not be merged.

## Differential conformance execution

Having vector data is not enough - it must actually be run against
CryptoViz's own cipher code. This is done by two files:

- `lib/testVectors/runner.ts` - generic runner. Given a vector and a
  dispatch table, it calls the matching executor, compares the result
  against `ciphertextHex`, and returns a structured result (`NONE`,
  `OUTPUT_MISMATCH`, `EXECUTION_ERROR`, or `UNSUPPORTED_ALGORITHM`) instead
  of a plain boolean, so failures are diagnosable.
- `lib/testVectors/dispatch.ts` - maps each vector's `algorithm` string to
  an executor function that calls the real cipher implementation under
  `lib/cipher/` (at the block/digest-primitive level, not through the
  padded UI-facing `encrypt()` helpers) and returns a hex string.

`tests/unit/vectors/katSuites.test.ts` runs every vector in
`allKnownAnswerVectors` through this dispatch table in CI, with no browser
or UI required.

### Adding conformance execution for a new algorithm

1. Add its vectors under `tests/vectors/<algo>/index.ts` as usual.
2. In `lib/testVectors/dispatch.ts`, write a small executor function that
   calls your cipher's primitive (not the padded `encrypt()` wrapper) and
   returns a hex string.
3. Register the executor in `cipherDispatchTable` under the exact
   `algorithm` string used by your vectors.
4. Run `npx vitest run tests/unit/vectors/katSuites.test.ts` - your new
   vectors will execute automatically; any output mismatch prints the
   expected vs. actual hex and the vector's id/standard.

Algorithms without a registered executor show up as **skipped**, not
passed, so missing conformance coverage stays visible.