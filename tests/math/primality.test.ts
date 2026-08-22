import { bailliePSW, CARMICHAEL_NUMBERS, fermatTest, isProbablePrime, millerRabinTrace, decomposeMinusOne } from '../../lib/math/primality'

describe('Primality testing laboratory', () => {
  it('decomposes n - 1 into 2^s * d', () => {
    expect(decomposeMinusOne(561n)).toEqual({ s: 4, d: 35n })
  })

  it('recognizes known primes with Miller-Rabin', () => {
    for (const prime of [2n, 3n, 17n, 97n, 1009n, 104729n]) expect(isProbablePrime(prime)).toBe(true)
  })

  it('rejects known composites with Miller-Rabin', () => {
    for (const composite of [1n, 4n, 15n, 91n, 341n, 561n]) expect(isProbablePrime(composite)).toBe(false)
  })

  it('shows Fermat fooled by Carmichael numbers while Miller-Rabin finds witnesses', () => {
    for (const n of CARMICHAEL_NUMBERS) {
      expect(fermatTest(n, 2n).passes).toBe(true)
      expect(millerRabinTrace(n, [2n]).probablePrime).toBe(false)
    }
  })

  it('covers all requested Carmichael numbers with Baillie-PSW', () => {
    for (const n of CARMICHAEL_NUMBERS) expect(bailliePSW(n).probablePrime).toBe(false)
  })

  it('reports the Miller-Rabin confidence from the number of rounds', () => {
    const trace = millerRabinTrace(101n, [2n, 3n, 5n, 7n, 11n])
    expect(trace.probablePrime).toBe(true)
    expect(trace.confidence).toBeCloseTo(1 - 4 ** -5, 12)
    expect(trace.rounds).toHaveLength(5)
  })
})
