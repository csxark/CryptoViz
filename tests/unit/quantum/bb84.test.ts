import { describe, it, expect } from 'vitest'
import { runBB84, seededRandom, type BB84Result } from '../../../lib/quantum/bb84'

describe('BB84 quantum key distribution', () => {
  it('with no eavesdropper the sifted keys agree exactly (QBER = 0)', () => {
    const r = runBB84({ numQubits: 400, eavesdropper: false, rng: seededRandom(1) })
    expect(r.errorRate).toBe(0)
    expect(r.eavesdropperDetected).toBe(false)
    expect(r.bobSiftedKey).toEqual(r.siftedKey)
    // ~half the qubits survive sifting (bases match with prob 1/2).
    expect(r.siftedLength).toBeGreaterThan(120)
  })

  it('an intercept-resend eavesdropper is detected via elevated QBER (~25%)', () => {
    const r = runBB84({ numQubits: 600, eavesdropper: true, rng: seededRandom(7) })
    expect(r.errorRate).toBeGreaterThan(0.15)
    expect(r.errorRate).toBeLessThan(0.35)
    expect(r.eavesdropperDetected).toBe(true)
  })

  it('sifting keeps exactly the basis-matching positions', () => {
    const r = runBB84({ numQubits: 200, rng: seededRandom(42) })
    const matching = r.qubits.filter((q) => q.basesMatch)
    expect(r.siftedLength).toBe(matching.length)
    expect(r.siftedKey.length).toBe(matching.length)
    expect(r.bobSiftedKey.length).toBe(matching.length)
    // every sifted qubit really had matching bases
    expect(matching.every((q) => q.aliceBasis === q.bobBasis)).toBe(true)
  })

  it('is deterministic under a seeded RNG', () => {
    const a = runBB84({ numQubits: 100, eavesdropper: true, rng: seededRandom(99) })
    const b = runBB84({ numQubits: 100, eavesdropper: true, rng: seededRandom(99) })
    expect(a.errorRate).toBe(b.errorRate)
    expect(a.siftedKey).toEqual(b.siftedKey)
  })

  it('records eve trace only when an eavesdropper is present', () => {
    const clean = runBB84({ numQubits: 20, eavesdropper: false, rng: seededRandom(3) })
    const tapped = runBB84({ numQubits: 20, eavesdropper: true, rng: seededRandom(3) })
    expect(clean.qubits.every((q) => q.eveBasis === undefined)).toBe(true)
    expect(tapped.qubits.every((q) => q.eveBasis !== undefined)).toBe(true)
  })

  it('produces a milestone step trace', () => {
    const r: BB84Result = runBB84({ numQubits: 10, eavesdropper: true, rng: seededRandom(5) })
    expect(r.steps.length).toBeGreaterThanOrEqual(5)
    expect(r.steps.some((s) => s.isMilestone)).toBe(true)
  })
})
