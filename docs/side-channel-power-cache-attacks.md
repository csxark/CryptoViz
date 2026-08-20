# Microarchitectural & Power Side-Channel Analyzer

CryptoViz's hardware side-channel lab is a deterministic browser simulation for
teaching three related concepts:

1. **Simple Power Analysis (SPA)** of RSA square-and-multiply.
2. **Differential Power Analysis (DPA)** against an AES S-Box hypothesis.
3. **Flush+Reload cache leakage** from secret-dependent lookup-table access.

The implementation intentionally does not read real power, CPU counters, browser
cache state, microphones, or external systems.

## SPA waveform

The RSA demo uses the private-key bit sequence `1 0 1 1 0 1`.

Each bit is represented by one simulated exponentiation cycle:

- `0` → Square only.
- `1` → Square + Multiply.

The oscilloscope is an SVG trace with:

- sample scrubbing
- zoom control
- horizontal pan
- selected-cycle inspection
- deterministic automatic bit extraction

This models the classic SPA observation that a secret-dependent operation
sequence can make key bits visually distinguishable.

## DPA correlation

The DPA demo creates deterministic plaintexts and simulated power measurements
using the AES S-Box and a Hamming-weight leakage model:

`P = a * HW(SBox(p XOR k)) + noise`

Every candidate byte from `0x00` through `0xFF` is tested. For each candidate,
CryptoViz calculates a Pearson correlation coefficient between the predicted
Hamming weight and the simulated measurements.

The default teaching key is `0x2A`. The green bar identifies the correct
candidate, while the complete 256-candidate graph shows how the correct
hypothesis separates from incorrect hypotheses.

The trace-count control regenerates the deterministic measurements with more or
fewer samples, making the statistical nature of DPA visible.

## Flush+Reload heatmap

The cache simulation has 32 cache lines and 20 time phases.

- **Red** — attacker flushes the cache.
- **Yellow** — victim accesses selected lines.
- **Green** — fast reload indicates the line remained cached.
- **Purple** — slow reload indicates an evicted or otherwise uncached line.
- **Dark** — no notable event in that phase.

The selected victim lines are deterministic so the visualization is stable in
tests and screenshots.

## Defenses

The lesson is not that a particular attack recipe should be deployed against a
real target. The lesson is that implementations should avoid secret-dependent
observable behavior.

Recommended defenses include:

- constant-time operations for secret-dependent computations
- constant-memory-access or cache-oblivious implementations
- AES-NI or other audited hardware-accelerated primitives where available
- bitslicing, masking, and randomization for stronger physical leakage models
- physical shielding and noise countermeasures for devices with physical
  adversaries
- side-channel evaluation as part of hardware and cryptographic certification

## Implementation

Relevant files:

- `components/attacks/SideChannelWaveformLab.tsx`
- `lib/attacks/sideChannelWaveformLab.ts`
- `app/attacks/side-channel-waveform/page.tsx`
- `app/attacks/page.tsx`

The pure simulation functions are kept in `lib/attacks` so they can be tested
without a browser.

## Manual verification

1. Open `/attacks`.
2. Confirm the hardware side-channel lab renders.
3. Scrub the RSA trace and verify the selected cycle changes.
4. Increase zoom and pan the trace.
5. Verify automatic extraction reads `1 0 1 1 0 1`.
6. Move the DPA trace slider and verify the correlation graph updates.
7. Confirm `0x2A` is highlighted as the correct candidate.
8. Confirm the cache heatmap contains all four event colors plus idle cells.
9. Open `/attacks/side-channel-waveform` directly.
10. Check the layout at desktop and mobile widths.
