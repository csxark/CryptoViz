import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest' // or jest, check repo's test runner in package.json
import { exportToCSV } from '@/lib/utils/csvExport'
import type { BenchmarkResult } from '@/types/benchmark'

function makeResult(overrides: Partial<BenchmarkResult> = {}): BenchmarkResult {
  return {
    cipherId: 'aes-128',
    cipherName: 'AES-128',
    category: 'symmetric',
    inputSize: 1024,
    direction: 'encrypt',
    iterations: 100,
    averageTime: 1.2345,
    minTime: 1.1,
    maxTime: 1.5,
    stdDev: 0.05,
    totalTime: 123.45,
    operationsPerSecond: 810.37,
    timestamp: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  }
}

describe('csvExport', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    URL.createObjectURL = vi.fn(() => 'blob:mock-url')
    URL.revokeObjectURL = vi.fn()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('creates a Blob URL, wires it to the anchor, and revokes it after the deferred cleanup runs', () => {
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    const appendSpy = vi.spyOn(document.body, 'appendChild')

    exportToCSV([makeResult()], 'benchmark-results.csv')

    expect(URL.createObjectURL).toHaveBeenCalledTimes(1)

    const anchor = appendSpy.mock.calls[0][0] as HTMLAnchorElement
    expect(anchor.getAttribute('href')).toBe('blob:mock-url')
    expect(anchor.getAttribute('download')).toBe('benchmark-results.csv')
    expect(clickSpy).toHaveBeenCalledTimes(1)

    // Cleanup is deferred via setTimeout(..., 0) — must not have run yet.
    expect(URL.revokeObjectURL).not.toHaveBeenCalled()

    vi.runAllTimers()

    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url')
  })

  it('includes a header row and one row per result in the generated CSV', async () => {
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    let capturedBlob: Blob | null = null
    URL.createObjectURL = vi.fn((blob: Blob) => {
      capturedBlob = blob
      return 'blob:mock-url'
    })

    exportToCSV([makeResult({ cipherName: 'AES-128' }), makeResult({ cipherName: 'SHA-256', category: 'hash' })])

    expect(capturedBlob).not.toBeNull()
    const text = await (capturedBlob as unknown as Blob).text()
    const lines = text.trim().split('\n')

    expect(lines).toHaveLength(3) // header + 2 rows
    expect(lines[0]).toContain('Cipher Name')
    expect(lines[1]).toContain('AES-128')
    expect(lines[2]).toContain('SHA-256')

    vi.runAllTimers()
    clickSpy.mockRestore()
  })

  it('escapes embedded quotes/commas and neutralizes formula injection (#1279)', async () => {
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    let capturedBlob: Blob | null = null
    URL.createObjectURL = vi.fn((blob: Blob) => {
      capturedBlob = blob
      return 'blob:mock-url'
    })

    exportToCSV([makeResult({ cipherId: '=cmd|calc', cipherName: 'a"b,c' })])

    const text = await (capturedBlob as unknown as Blob).text()
    // Embedded quote doubled, comma stays inside the quoted field.
    expect(text).toContain('"a""b,c"')
    // Formula-injection cell prefixed with a single quote so it's treated as text.
    expect(text).toContain(`"'=cmd|calc"`)

    vi.runAllTimers()
  })
})