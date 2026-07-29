# Side-Channel Attack Playground

Side-channel attacks infer secrets from observable behavior rather than from the
direct cryptographic output. Examples include timing differences, memory/cache
access patterns, power usage, electromagnetic leakage, and error behavior.

This CryptoViz module is a safe local simulation. It does not attack external
systems or measure real hardware.

## What the playground shows

- timing-style leakage
- cache-access-style leakage
- power-style leakage
- sample signal values
- leaked prefix hints
- risk levels
- mitigation guidance

## Modes

### Timing leakage

Timing leakage happens when secret-dependent work takes measurably different
time. A common example is an early-exit comparison that takes longer when more
leading characters match.

### Cache leakage

Cache leakage happens when secret-dependent table lookups or memory access
patterns reveal which locations were touched.

### Power-style leakage

Power leakage can happen when hardware activity correlates with processed data,
such as bit transitions or Hamming weight.

## Defenses

- use constant-time comparisons
- avoid secret-dependent branches
- avoid secret-dependent table lookups
- use audited cryptographic libraries
- rate-limit oracle-like endpoints
- use hardened implementations for physical-device threat models

## Manual testing

1. Open `/attacks/side-channel`.
2. Confirm the default timing demo renders sample signals.
3. Switch between timing, cache, and power modes.
4. Try guesses with longer matching prefixes.
5. Confirm inferred leakage increases.
6. Enter empty values and confirm validation appears.
7. Resize to mobile width and confirm the page remains usable.
