import { describe, expect, it } from 'vitest'
import { BenchmarkEngine } from '@/lib/utils/benchmark'

describe('BenchmarkEngine', () => {
  it('generates random input and key strings with the expected lengths', () => {
    const input = BenchmarkEngine.generateInput(16)
    expect(input).toHaveLength(16)
    expect(input).toMatch(/^[A-Za-z0-9!@#$%^&*()]+$/)

    const key = BenchmarkEngine.generateKey(8)
    expect(key).toHaveLength(8)
    expect(key).toMatch(/^[0-9a-f]+$/)
  })

  it('rejects invalid sizes', () => {
    expect(() => BenchmarkEngine.generateInput(0)).toThrow(
      'sizeInBytes must be greater than 0',
    )
    expect(() => BenchmarkEngine.generateKey(0)).toThrow(
      'lengthInBytes must be greater than 0',
    )
  })
})
