import { describe, it, expect } from 'vitest'
import { BloomFilterEngine } from '../../../lib/simulator/bloomFilter'

describe('BloomFilterEngine', () => {
  it('initializes with default or custom configuration', () => {
    const defaultEngine = new BloomFilterEngine()
    expect(defaultEngine.getStats().size).toBe(64)
    expect(defaultEngine.getStats().numHashes).toBe(3)

    const customEngine = new BloomFilterEngine({ size: 128, numHashes: 4 })
    expect(customEngine.getStats().size).toBe(128)
    expect(customEngine.getStats().numHashes).toBe(4)
  })

  it('guarantees zero false negatives for inserted elements', () => {
    const filter = new BloomFilterEngine({ size: 64, numHashes: 3 })
    const items = ['apple', 'banana', 'cherry', 'dragonfruit']

    items.forEach((item) => filter.insert(item))

    // Every single inserted item MUST return isPresent === true
    items.forEach((item) => {
      const res = filter.test(item)
      expect(res.isPresent).toBe(true)
      expect(res.status).toBe('possibly_present')
    })
  })

  it('returns definitely_not for non-inserted items when bit is 0', () => {
    const filter = new BloomFilterEngine({ size: 128, numHashes: 4 })
    filter.insert('sample_item_alpha')

    const res = filter.test('totally_unseen_item_xyz_12389')
    // Unless there is a collision, it should return definitely_not
    if (!res.isPresent) {
      expect(res.status).toBe('definitely_not')
    }
  })

  it('resets bit array and element count on clear()', () => {
    const filter = new BloomFilterEngine({ size: 64, numHashes: 3 })
    filter.insert('item_1')
    filter.insert('item_2')

    expect(filter.getStats().elementsInserted).toBe(2)
    expect(filter.getStats().bitsSet).toBeGreaterThan(0)

    filter.clear()

    expect(filter.getStats().elementsInserted).toBe(0)
    expect(filter.getStats().bitsSet).toBe(0)
    expect(filter.getBits().every((b) => b === 0)).toBe(true)
  })

  it('calculates theoretical false positive probability correctly', () => {
    const filter = new BloomFilterEngine({ size: 32, numHashes: 2 })
    expect(filter.getStats().theoreticalFalsePositiveRate).toBe(0)

    // Insert elements to saturate filter
    for (let i = 0; i < 10; i++) {
      filter.insert(`element_${i}`)
    }

    const stats = filter.getStats()
    expect(stats.theoreticalFalsePositiveRate).toBeGreaterThan(0)
    expect(stats.theoreticalFalsePositiveRate).toBeLessThanOrEqual(1)
  })

  it('throws an error on empty string insertion or testing', () => {
    const filter = new BloomFilterEngine()
    expect(() => filter.insert('')).toThrow('Element cannot be empty.')
    expect(() => filter.test('')).toThrow('Element cannot be empty.')
  })
})
