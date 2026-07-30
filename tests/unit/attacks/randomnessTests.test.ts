import { describe, it, expect } from 'vitest'
import {
  ALPHA,
  GENERATORS,
  bitsFromBytes,
  blockFrequencyTest,
  byteUniformityTest,
  bytesFromHex,
  erfc,
  generatorById,
  igamc,
  lagCorrelation,
  longestRunTest,
  monobitTest,
  runBattery,
  runsTest,
  scatterPairs,
  serialTest,
} from '@/lib/attacks/randomnessTests'

/** Build a bit array straight from a 0/1 string. */
const bits = (s: string) => Uint8Array.from(Array.from(s, (c) => (c === '1' ? 1 : 0)))

/** Deterministic pseudo-random bytes for tests that must not flake. */
function seededBytes(byteCount: number, seed = 12345): Uint8Array {
  const out = new Uint8Array(byteCount)
  let state = seed >>> 0
  for (let i = 0; i < byteCount; i++) {
    state ^= state << 13
    state >>>= 0
    state ^= state >>> 17
    state ^= state << 5
    state >>>= 0
    out[i] = (state >>> 24) & 0xff
  }
  return out
}

describe('erfc', () => {
  it('matches known reference values', () => {
    expect(erfc(0)).toBeCloseTo(1, 12)
    expect(erfc(0.5)).toBeCloseTo(0.4795001222, 9)
    expect(erfc(1)).toBeCloseTo(0.1572992071, 9)
    expect(erfc(2)).toBeCloseTo(0.0046777349, 9)
    expect(erfc(3)).toBeCloseTo(2.20904969e-5, 12)
  })

  it('satisfies erfc(-x) = 2 - erfc(x)', () => {
    for (const x of [0.25, 0.5, 1, 1.5, 2, 3]) {
      expect(erfc(-x)).toBeCloseTo(2 - erfc(x), 12)
    }
  })

  it('never exceeds 1 for a non-negative argument, so p-values stay valid', () => {
    // The raw Chebyshev expansion overshoots slightly at 0; the implementation
    // clamps, because a p-value above 1 is meaningless.
    expect(erfc(0)).toBe(1)
    for (let x = 0; x <= 4; x += 0.1) {
      expect(erfc(x)).toBeLessThanOrEqual(1)
    }
  })

  it('is monotonically decreasing and bounded to [0, 2]', () => {
    let previous = erfc(-3)
    for (let x = -3; x <= 3; x += 0.25) {
      const value = erfc(x)
      expect(value).toBeLessThanOrEqual(previous + 1e-12)
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThanOrEqual(2)
      previous = value
    }
  })
})

describe('igamc', () => {
  it('matches known chi-squared upper-tail probabilities', () => {
    // Q(df/2, chi2/2) is the chi-squared survival function.
    // chi2 = 3.84 at 1 df → p ≈ 0.05
    expect(igamc(0.5, 3.841459 / 2)).toBeCloseTo(0.05, 4)
    // chi2 = 5.991 at 2 df → p ≈ 0.05
    expect(igamc(1, 5.991465 / 2)).toBeCloseTo(0.05, 4)
    // chi2 = 11.0705 at 5 df → p ≈ 0.05
    expect(igamc(2.5, 11.0705 / 2)).toBeCloseTo(0.05, 4)
    // chi2 = 6.635 at 1 df → p ≈ 0.01
    expect(igamc(0.5, 6.634897 / 2)).toBeCloseTo(0.01, 4)
  })

  it('returns 1 at x = 0 and decreases toward 0', () => {
    expect(igamc(1, 0)).toBe(1)
    expect(igamc(1, 1)).toBeGreaterThan(igamc(1, 5))
    expect(igamc(1, 50)).toBeLessThan(1e-15)
  })

  it('stays within [0, 1] across a wide sweep', () => {
    for (const a of [0.5, 1, 2.5, 10, 127.5]) {
      for (const x of [0.1, 1, 10, 100, 500]) {
        const value = igamc(a, x)
        expect(value).toBeGreaterThanOrEqual(0)
        expect(value).toBeLessThanOrEqual(1)
      }
    }
  })

  it('rejects invalid arguments', () => {
    expect(() => igamc(0, 1)).toThrowError(/a > 0/)
    expect(() => igamc(1, -1)).toThrowError(/x >= 0/)
  })
})

describe('bitsFromBytes', () => {
  it('expands bytes most-significant-bit first', () => {
    expect(Array.from(bitsFromBytes(Uint8Array.from([0b10110010])))).toEqual([
      1, 0, 1, 1, 0, 0, 1, 0,
    ])
    expect(bitsFromBytes(Uint8Array.from([0x00, 0xff]))).toHaveLength(16)
  })
})

describe('bytesFromHex', () => {
  it('parses hex and tolerates separators', () => {
    expect(Array.from(bytesFromHex('deadBEEF'))).toEqual([0xde, 0xad, 0xbe, 0xef])
    expect(Array.from(bytesFromHex('de ad:be ef'))).toEqual([0xde, 0xad, 0xbe, 0xef])
  })

  it('rejects malformed hex', () => {
    expect(() => bytesFromHex('')).toThrowError(/Provide some hex data/)
    expect(() => bytesFromHex('abc')).toThrowError(/even number/)
    expect(() => bytesFromHex('zzzz')).toThrowError(/non-hexadecimal/)
  })
})

describe('monobitTest', () => {
  it('reproduces the SP 800-22 §2.1.8 worked example', () => {
    // The specification's own example: n = 100, S_100 = -16, p ≈ 0.109599.
    const sample =
      '1100100100001111110110101010001000100001011010001100001000110100' +
      '110001001100011001100010100010111000'
    const result = monobitTest(bits(sample))

    expect(sample).toHaveLength(100)
    expect(result.statistic).toBeCloseTo(1.6, 6)
    expect(result.pValue).toBeCloseTo(0.109599, 5)
    expect(result.passed).toBe(true)
  })

  it('fails an all-zeros stream with a p-value of essentially zero', () => {
    const result = monobitTest(new Uint8Array(1000))
    expect(result.passed).toBe(false)
    expect(result.pValue).toBeLessThan(1e-100)
  })

  it('passes a perfectly balanced alternating stream', () => {
    // Balance is exactly what monobit measures, so 0101… sails through.
    const result = monobitTest(bits('01'.repeat(500)))
    expect(result.passed).toBe(true)
    expect(result.pValue).toBe(1)
  })

  it('skips a sample below 100 bits', () => {
    const result = monobitTest(bits('0101'))
    expect(result.skipped).toMatch(/at least 100 bits/)
  })
})

describe('runsTest', () => {
  it('reproduces the SP 800-22 §2.3.8 worked example', () => {
    // n = 100, π = 0.42, V = 52, p ≈ 0.500798.
    const sample =
      '1100100100001111110110101010001000100001011010001100001000110100' +
      '110001001100011001100010100010111000'
    const result = runsTest(bits(sample))

    expect(result.statistic).toBe(52)
    expect(result.pValue).toBeCloseTo(0.500798, 5)
    expect(result.passed).toBe(true)
  })

  it('catastrophically fails a perfectly alternating stream', () => {
    // Every adjacent pair differs, so there are n runs where ~n/2 are expected.
    // This is the headline demonstration: monobit passes, runs annihilates it.
    const alternating = bits('01'.repeat(500))
    expect(monobitTest(alternating).passed).toBe(true)

    const result = runsTest(alternating)
    expect(result.passed).toBe(false)
    expect(result.pValue).toBeLessThan(1e-50)
  })

  it('reports the monobit prerequisite rather than a meaningless statistic', () => {
    const result = runsTest(bits('1'.repeat(900) + '0'.repeat(100)))
    expect(result.passed).toBe(false)
    expect(result.detail).toMatch(/Prerequisite failed/)
  })
})

describe('blockFrequencyTest', () => {
  it('reproduces the SP 800-22 §2.2.8 worked example', () => {
    // n = 100, M = 10 → chi2 = 7.2, p ≈ 0.706438.
    const sample =
      '1100100100001111110110101010001000100001011010001100001000110100' +
      '110001001100011001100010100010111000'
    const result = blockFrequencyTest(bits(sample), 10)

    expect(result.statistic).toBeCloseTo(7.2, 6)
    expect(result.pValue).toBeCloseTo(0.706438, 5)
    expect(result.passed).toBe(true)
  })

  it('fails a stream that is globally balanced but locally lopsided', () => {
    // 512 ones then 512 zeros: monobit is perfect, block frequency is not.
    const lopsided = bits('1'.repeat(512) + '0'.repeat(512))
    expect(monobitTest(lopsided).pValue).toBe(1)

    const result = blockFrequencyTest(lopsided, 128)
    expect(result.passed).toBe(false)
  })

  it('skips when there is not even one full block', () => {
    expect(blockFrequencyTest(bits('1'.repeat(200)), 512).skipped).toMatch(/at least 512 bits/)
  })
})

describe('longestRunTest', () => {
  it('fails an all-ones stream, whose every block is one long run', () => {
    const result = longestRunTest(bits('1'.repeat(200)))
    expect(result.passed).toBe(false)
  })

  it('fails an alternating stream, whose longest run is always 1', () => {
    const result = longestRunTest(bits('01'.repeat(100)))
    expect(result.passed).toBe(false)
  })

  it('passes a good pseudo-random sample', () => {
    const result = longestRunTest(bitsFromBytes(seededBytes(2048)))
    expect(result.passed).toBe(true)
  })

  it('switches to the 128-bit block parameters on large samples', () => {
    const small = longestRunTest(bitsFromBytes(seededBytes(200)))
    const large = longestRunTest(bitsFromBytes(seededBytes(2048)))
    expect(small.detail).toMatch(/blocks of 8 bits/)
    expect(large.detail).toMatch(/blocks of 128 bits/)
  })

  it('skips a sample below 128 bits', () => {
    expect(longestRunTest(bits('1'.repeat(100))).skipped).toMatch(/at least 128 bits/)
  })
})

describe('serialTest', () => {
  it('fails an alternating stream, where only 2 of 8 patterns ever occur', () => {
    const result = serialTest(bitsFromBytes(new Uint8Array(512).fill(0xaa)))
    expect(result.passed).toBe(false)
  })

  it('fails an all-zeros stream', () => {
    expect(serialTest(bitsFromBytes(new Uint8Array(512))).passed).toBe(false)
  })

  it('passes a good pseudo-random sample', () => {
    expect(serialTest(bitsFromBytes(seededBytes(4096))).passed).toBe(true)
  })

  it('skips a sample too small for stable pattern counts', () => {
    expect(serialTest(bits('0101'), 3).skipped).toBeDefined()
  })
})

describe('byteUniformityTest', () => {
  it('fails a constant stream', () => {
    const result = byteUniformityTest(new Uint8Array(4096))
    expect(result.passed).toBe(false)
    expect(result.pValue).toBeLessThan(1e-10)
  })

  it('passes a good pseudo-random sample', () => {
    expect(byteUniformityTest(seededBytes(16384)).passed).toBe(true)
  })

  it('skips when buckets would be too sparse', () => {
    expect(byteUniformityTest(seededBytes(100)).skipped).toMatch(/at least 2560 bytes/)
  })
})

describe('runBattery', () => {
  it('passes every test for crypto.getRandomValues', () => {
    // A single trial can flake at alpha = 0.01, so require a high pass rate
    // across several independent samples rather than perfection on one.
    let totalRan = 0
    let totalPassed = 0

    for (let trial = 0; trial < 5; trial++) {
      const battery = runBattery(generatorById('crypto').generate(16384))
      totalRan += battery.ranCount
      totalPassed += battery.passedCount
    }

    expect(totalRan).toBeGreaterThan(0)
    expect(totalPassed / totalRan).toBeGreaterThan(0.9)
  })

  it('fails every applicable test for the all-zeros control', () => {
    const battery = runBattery(generatorById('constant').generate(16384))
    expect(battery.passedCount).toBe(0)
    expect(battery.ranCount).toBe(6)
  })

  it('shows the alternating control passing monobit and failing the rest', () => {
    const battery = runBattery(generatorById('alternating').generate(16384))
    const byId = Object.fromEntries(battery.results.map((r) => [r.id, r]))

    // The headline lesson: perfect balance, catastrophic structure.
    expect(byId['monobit'].passed).toBe(true)
    expect(byId['runs'].passed).toBe(false)
    expect(byId['longest-run'].passed).toBe(false)
    expect(byId['serial'].passed).toBe(false)
    expect(byId['byte-uniformity'].passed).toBe(false)
  })

  it('detects RANDU as a failing generator', () => {
    const battery = runBattery(generatorById('randu').generate(16384, 1))
    expect(battery.passedCount).toBeLessThan(battery.ranCount)
  })

  it('runs all six tests and reports counts consistently', () => {
    const battery = runBattery(seededBytes(16384))
    expect(battery.results).toHaveLength(6)
    expect(battery.ranCount).toBe(6)
    expect(battery.bitCount).toBe(16384 * 8)
    expect(battery.passedCount).toBeLessThanOrEqual(battery.ranCount)
  })

  it('states in its verdict that passing does not imply cryptographic security', () => {
    const battery = runBattery(seededBytes(16384))
    if (battery.passedCount === battery.ranCount) {
      expect(battery.verdict).toMatch(/does NOT mean the generator is/)
      expect(battery.verdict).toMatch(/unpredictability/)
    }
  })

  it('rejects an empty sample', () => {
    expect(() => runBattery(new Uint8Array(0))).toThrowError(/No data to test/)
  })
})

describe('GENERATORS', () => {
  it('marks exactly one source as cryptographic', () => {
    const cryptographic = GENERATORS.filter((g) => g.cryptographic)
    expect(cryptographic).toHaveLength(1)
    expect(cryptographic[0].id).toBe('crypto')
  })

  it('produces the requested byte count from every generator', () => {
    for (const generator of GENERATORS) {
      expect(generator.generate(1024, 7)).toHaveLength(1024)
    }
  })

  it('makes the seeded generators deterministic', () => {
    for (const id of ['xorshift32', 'randu']) {
      const a = generatorById(id).generate(256, 42)
      const b = generatorById(id).generate(256, 42)
      expect(Array.from(a)).toEqual(Array.from(b))
    }
  })

  it('produces different output from different seeds', () => {
    const a = generatorById('xorshift32').generate(256, 1)
    const b = generatorById('xorshift32').generate(256, 2)
    expect(Array.from(a)).not.toEqual(Array.from(b))
  })

  it('handles a request larger than the getRandomValues 65536-byte cap', () => {
    const bytes = generatorById('crypto').generate(200000)
    expect(bytes).toHaveLength(200000)
    // A chunking bug would leave a run of zeros past the first chunk.
    const tail = bytes.subarray(65536)
    expect(tail.some((b) => b !== 0)).toBe(true)
  })

  it('rejects an unknown generator id', () => {
    expect(() => generatorById('nope')).toThrowError(/Unknown generator/)
  })
})

describe('lagCorrelation', () => {
  it('reports near-zero correlation at every lag for a good sample', () => {
    const correlations = lagCorrelation(seededBytes(16384), 16)
    expect(correlations).toHaveLength(16)
    for (const { r } of correlations) {
      expect(Math.abs(r)).toBeLessThan(0.1)
    }
  })

  it('reports strong correlation for a periodic sequence', () => {
    const periodic = new Uint8Array(4096)
    for (let i = 0; i < periodic.length; i++) periodic[i] = (i % 4) * 60
    const correlations = lagCorrelation(periodic, 8)

    // Lag 4 matches the period exactly.
    expect(correlations.find((c) => c.lag === 4)!.r).toBeGreaterThan(0.9)
  })

  it('rejects a sample too short for the requested lags', () => {
    expect(() => lagCorrelation(new Uint8Array(10), 32)).toThrowError(/at least 128 bytes/)
  })
})

describe('scatterPairs', () => {
  it('pairs consecutive bytes and respects the limit', () => {
    expect(scatterPairs(Uint8Array.from([1, 2, 3, 4, 5, 6]))).toEqual([
      { x: 1, y: 2 },
      { x: 3, y: 4 },
      { x: 5, y: 6 },
    ])
    expect(scatterPairs(seededBytes(10000), 100)).toHaveLength(100)
  })
})

describe('significance level', () => {
  it('uses the SP 800-22 convention of alpha = 0.01', () => {
    expect(ALPHA).toBe(0.01)
  })
})
