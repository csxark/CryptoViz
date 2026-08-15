import { describe, expect, it } from 'vitest'
import {
  AES_SBOX,
  BUILTIN_SBOXES,
  PRESENT_SBOX,
  SERPENT_S0_SBOX,
  analyzeSbox,
  computeDdt,
  computeLat,
  parity,
  parseCustomSbox,
  pilingUpLemma,
  popcount,
} from '../../../lib/cryptanalysis/sboxAnalysis'

describe('sboxAnalysis helpers', () => {
  it('counts set bits', () => {
    expect(popcount(0)).toBe(0)
    expect(popcount(1)).toBe(1)
    expect(popcount(0xff)).toBe(8)
    expect(popcount(0b1010)).toBe(2)
  })

  it('computes parity of bitmask dot products', () => {
    expect(parity(0x0, 0xff)).toBe(0)
    expect(parity(0x1, 0x1)).toBe(1)
    expect(parity(0x1, 0x2)).toBe(0)
    expect(parity(0x3, 0x3)).toBe(0) // 1+1 = 2 mod 2 = 0
    expect(parity(0x3, 0x1)).toBe(1)
  })
})

describe('parseCustomSbox', () => {
  it('accepts decimal values separated by spaces', () => {
    expect(parseCustomSbox('12 5 6 11 9 0 10 13 3 14 15 8 4 7 1 2')).toEqual([...PRESENT_SBOX])
  })

  it('accepts 0x-hex values separated by commas', () => {
    expect(parseCustomSbox('0xC,0x5,0x6,0xB,0x9,0x0,0xA,0xD,0x3,0xE,0xF,0x8,0x4,0x7,0x1,0x2')).toEqual([
      ...PRESENT_SBOX,
    ])
  })

  it('rejects non-16-length input', () => {
    expect(parseCustomSbox('1 2 3')).toBeNull()
    expect(parseCustomSbox('')).toBeNull()
  })

  it('rejects out-of-range or malformed tokens', () => {
    expect(parseCustomSbox('1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16')).toBeNull() // 16 is out of 0-15
    expect(parseCustomSbox('c 5 6 b 9 0 a d 3 e f 8 4 7 1 x')).toBeNull()
  })
})

describe('computeDdt', () => {
  it('produces a 16x16 table with zeros in the Δx=0 row', () => {
    const ddt = computeDdt(PRESENT_SBOX, 4)
    expect(ddt).toHaveLength(16)
    expect(ddt[0].every((cell) => cell.count === 0 && cell.pairs.length === 0)).toBe(true)
  })

  it('counts each Δx=1 transition across all x', () => {
    const ddt = computeDdt(PRESENT_SBOX, 4)
    for (let dy = 0; dy < 16; dy++) {
      const cell = ddt[1][dy]
      expect(cell.count).toBe(cell.pairs.length)
    }
    const total = ddt[1].reduce((sum, cell) => sum + cell.count, 0)
    expect(total).toBe(16) // every x1 contributes exactly one transition
  })

  it('records the concrete (x1, x2) pairs for a cell', () => {
    const ddt = computeDdt(PRESENT_SBOX, 4)
    const cell = ddt[1][3]
    expect(cell.count).toBeGreaterThan(0)
    for (const pair of cell.pairs) {
      expect(pair.x2).toBe(pair.x1 ^ 1)
      expect(PRESENT_SBOX[pair.x1] ^ PRESENT_SBOX[pair.x2]).toBe(3)
    }
  })

  it('handles the AES 8-bit S-box (256x256)', () => {
    const ddt = computeDdt(AES_SBOX, 8)
    expect(ddt).toHaveLength(256)
    expect(ddt[1][1].count).toBe(2) // AES: Δx=1 → Δy=1 has exactly 2 preimages
  })
})

describe('computeLat', () => {
  it('produces a 16x16 table', () => {
    const lat = computeLat(PRESENT_SBOX, 4)
    expect(lat).toHaveLength(16)
    expect(lat[0]).toHaveLength(16)
  })

  it('has the expected trivially-balanced a=0 row (bias 0 except b=0)', () => {
    const lat = computeLat(PRESENT_SBOX, 4)
    // For a=0, a·x = 0 always. b=0 makes the equation 0=0 always true
    // (count 16 → value 8); any b≠0 matches for exactly half the x
    // (count 8 → value 0), because S is a permutation.
    expect(lat[0][0].value).toBe(8)
    for (let b = 1; b < 16; b++) {
      expect(lat[0][b].value).toBe(0)
      expect(lat[0][b].bias).toBe(0)
    }
  })

  it('keeps values within [-2^(n-1), 2^(n-1)]', () => {
    const lat = computeLat(PRESENT_SBOX, 4)
    for (let a = 1; a < 16; a++) {
      for (let b = 0; b < 16; b++) {
        expect(Math.abs(lat[a][b].value)).toBeLessThanOrEqual(8)
      }
    }
  })
})

describe('analyzeSbox', () => {
  it('validates the S-box length', () => {
    expect(() => analyzeSbox([1, 2, 3], 4)).toThrow(/exactly 16 entries/)
  })

  it('validates the bit width', () => {
    expect(() => analyzeSbox([...PRESENT_SBOX], 0)).toThrow(/positive integer/)
  })

  it('computes correct PRESENT metrics', () => {
    const result = analyzeSbox(PRESENT_SBOX, 4)
    expect(result.differentialUniformity).toBe(4)
    expect(result.maxDifferentialProbability).toBe(4 / 16)
    expect(result.nonlinearity).toBe(4)
    expect(result.maxBias).toBe(0.25)
    expect(result.maxDifferentialCells.length).toBeGreaterThan(0)
    expect(result.maxBiasCells.length).toBeGreaterThan(0)
  })

  it('computes correct AES metrics', () => {
    const result = analyzeSbox(AES_SBOX, 8)
    expect(result.differentialUniformity).toBe(4)
    expect(result.nonlinearity).toBe(112)
    expect(result.maxBias).toBeCloseTo(0.0625, 5)
  })

  it('computes correct Serpent S0 metrics', () => {
    const result = analyzeSbox(SERPENT_S0_SBOX, 4)
    expect(result.differentialUniformity).toBe(4)
    expect(result.nonlinearity).toBe(4)
  })
})

describe('pilingUpLemma', () => {
  it('computes the product of biases', () => {
    expect(pilingUpLemma([0.25], 1)).toBe(0.25)
    expect(pilingUpLemma([0.25, 0.25], 2)).toBe(2 * 0.25 * 0.25)
    expect(pilingUpLemma([0.25, 0.25, 0.25], 3)).toBe(4 * 0.25 * 0.25 * 0.25)
  })

  it('stacks at most the number of supplied biases', () => {
    expect(pilingUpLemma([0.5], 5)).toBe(0.5)
  })

  it('returns 0 for zero rounds', () => {
    expect(pilingUpLemma([0.5], 0)).toBe(0)
  })
})

describe('BUILTIN_SBOXES', () => {
  it('exposes the expected built-ins', () => {
    expect(BUILTIN_SBOXES.map((b) => b.id)).toEqual(['present', 'serpent-s0', 'aes'])
  })

  it('every built-in analyzes cleanly', () => {
    for (const box of BUILTIN_SBOXES) {
      expect(() => analyzeSbox(box.values, box.bits)).not.toThrow()
    }
  })
})
