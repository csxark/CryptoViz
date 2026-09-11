/**
 * Persistence integrity tests.
 * Verifies that malformed, corrupt, or invalid persisted data
 * fails safely and never silently becomes active cipher input.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  loadConversionHistory,
  saveConversionHistory,
  normalizeConversionHistory,
} from '@/lib/utils/conversionHistory'
import {
  safeJsonParse,
  safeGetItemJson,
  isStorageAvailable,
} from '@/lib/utils/storage'

describe('Persistence integrity — malformed data handling', () => {
  beforeEach(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.clear()
    }
  })

  afterEach(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.clear()
    }
  })

  describe('safeJsonParse', () => {
    it('returns fallback for null input', () => {
      expect(safeJsonParse(null, 'default')).toBe('default')
    })

    it('returns fallback for undefined input', () => {
      expect(safeJsonParse(undefined, 'default')).toBe('default')
    })

    it('returns fallback for invalid JSON', () => {
      expect(safeJsonParse('{invalid json!!!', [])).toEqual([])
    })

    it('returns fallback for empty string', () => {
      expect(safeJsonParse('', 42)).toBe(42)
    })

    it('returns parsed value for valid JSON', () => {
      expect(safeJsonParse('{"a":1}', {})).toEqual({ a: 1 })
    })

    it('returns fallback when validator rejects', () => {
      const validator = (val: unknown): val is number => typeof val === 'number'
      expect(safeJsonParse('"not a number"', 0, validator)).toBe(0)
    })

    it('returns parsed when validator accepts', () => {
      const validator = (val: unknown): val is number => typeof val === 'number'
      expect(safeJsonParse('42', 0, validator)).toBe(42)
    })
  })

  describe('normalizeConversionHistory', () => {
    it('returns empty array for non-array input', () => {
      expect(normalizeConversionHistory('not an array', 'caesar')).toEqual([])
      expect(normalizeConversionHistory(42, 'caesar')).toEqual([])
      expect(normalizeConversionHistory(null, 'caesar')).toEqual([])
      expect(normalizeConversionHistory(undefined, 'caesar')).toEqual([])
      expect(normalizeConversionHistory({}, 'caesar')).toEqual([])
    })

    it('filters out entries with missing required fields', () => {
      const badEntries = [
        { id: '1', action: 'encrypt', input: 'test' }, // missing key, output, timestamp
        { id: '2', action: 'encrypt', input: 'test', key: 'k', output: 'o' }, // missing timestamp
        { id: '3', action: 'invalid', input: 'test', key: 'k', output: 'o', timestamp: 'now' }, // invalid action
      ]
      expect(normalizeConversionHistory(badEntries, 'caesar')).toEqual([])
    })

    it('accepts valid entries', () => {
      const validEntry = {
        id: '1',
        action: 'encrypt',
        input: 'hello',
        key: '3',
        output: 'khoor',
        timestamp: '2024-01-01',
      }
      const result = normalizeConversionHistory([validEntry], 'caesar')
      expect(result).toHaveLength(1)
      expect(result[0].cipherId).toBe('caesar')
      expect(result[0].output).toBe('khoor')
    })

    it('deduplicates entries by id', () => {
      const entry = {
        id: 'dup',
        action: 'encrypt',
        input: 'hello',
        key: '3',
        output: 'khoor',
        timestamp: '2024-01-01',
      }
      const result = normalizeConversionHistory([entry, entry, entry], 'caesar')
      expect(result).toHaveLength(1)
    })

    it('caps entries at MAX_CONVERSION_HISTORY_ENTRIES', () => {
      const entries = Array.from({ length: 100 }, (_, i) => ({
        id: String(i),
        action: 'encrypt',
        input: `input-${i}`,
        key: '3',
        output: `output-${i}`,
        timestamp: '2024-01-01',
      }))
      const result = normalizeConversionHistory(entries, 'caesar')
      expect(result.length).toBeLessThanOrEqual(50)
    })
  })

  describe('loadConversionHistory with corrupted storage', () => {
    it('returns empty array when storage contains invalid JSON', () => {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('cryptoviz-history-caesar', '{{{invalid')
        const result = loadConversionHistory('caesar')
        expect(result).toEqual([])
      }
    })

    it('returns empty array when storage contains non-array JSON', () => {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('cryptoviz-history-caesar', '"just a string"')
        const result = loadConversionHistory('caesar')
        expect(result).toEqual([])
      }
    })

    it('returns empty array when storage contains number', () => {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('cryptoviz-history-caesar', '42')
        const result = loadConversionHistory('caesar')
        expect(result).toEqual([])
      }
    })

    it('filters invalid entries from partially corrupt data', () => {
      if (typeof window !== 'undefined' && window.localStorage) {
        const data = [
          { id: '1', action: 'encrypt', input: 'hello', key: '3', output: 'khoor', timestamp: 'now' },
          { id: '2', action: 'INVALID' }, // bad entry
          null, // null entry
          'string entry', // wrong type
        ]
        window.localStorage.setItem('cryptoviz-history-caesar', JSON.stringify(data))
        const result = loadConversionHistory('caesar')
        expect(result).toHaveLength(1)
        expect(result[0].id).toBe('1')
      }
    })
  })

  describe('safeGetItemJson with corrupted storage', () => {
    it('returns fallback for missing key', () => {
      const result = safeGetItemJson('nonexistent-key', { default: true })
      expect(result).toEqual({ default: true })
    })

    it('returns fallback for corrupt JSON in storage', () => {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('test-corrupt', 'not valid json!!!')
        const result = safeGetItemJson('test-corrupt', 'fallback')
        expect(result).toBe('fallback')
      }
    })
  })
})
