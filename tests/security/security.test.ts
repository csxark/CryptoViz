/**
 * Security regression tests for the CryptoViz cipher engine.
 * Covers: Prototype Pollution prevention, XSS sanitization, URL parameter validation.
 *
 * These tests serve as a CI gate: if any test fails, a potential security
 * regression has been introduced.
 *
 * @see lib/utils/security.ts
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  isDangerousKey,
  createSafeConfig,
  parseSafeJson,
  sanitizeHtml,
  isSafeCipherName,
  isSafeQueryValue,
  getSafeParam,
} from '../../lib/utils/security'

// ─── Prototype Pollution ─────────────────────────────────────────────────────

describe('isDangerousKey', () => {
  it('flags __proto__', () => {
    expect(isDangerousKey('__proto__')).toBe(true)
  })
  it('flags constructor', () => {
    expect(isDangerousKey('constructor')).toBe(true)
  })
  it('flags prototype', () => {
    expect(isDangerousKey('prototype')).toBe(true)
  })
  it('allows safe keys', () => {
    expect(isDangerousKey('algorithm')).toBe(false)
    expect(isDangerousKey('keySize')).toBe(false)
    expect(isDangerousKey('mode')).toBe(false)
  })
})

describe('createSafeConfig – prototype pollution prevention', () => {
  it('strips __proto__ key from input object', () => {
    const malicious = JSON.parse('{"__proto__":{"polluted":true},"safe":"value"}')
    const safe = createSafeConfig(malicious)
    expect((Object.prototype as Record<string, unknown>)['polluted']).toBeUndefined()
    expect(safe).not.toHaveProperty('__proto__')
    expect((safe as Record<string, unknown>)['safe']).toBe('value')
  })

  it('strips constructor key from input object', () => {
    const malicious = JSON.parse('{"constructor":{"prototype":{"pwned":1}}}')
    const safe = createSafeConfig(malicious)
    expect((safe as Record<string, unknown>)['constructor']).toBeUndefined()
  })

  it('returns a frozen object (immutable)', () => {
    const config = createSafeConfig({ algorithm: 'aes', keySize: 256 })
    expect(Object.isFrozen(config)).toBe(true)
    expect(() => {
      (config as Record<string, unknown>)['algorithm'] = 'evil'
    }).toThrow()
  })

  it('recursively hardens nested objects', () => {
    const input = {
      options: {
        mode: 'CBC',
        __proto__: { injected: true },
      },
    }
    const safe = createSafeConfig(input as Record<string, unknown>)
    const opts = (safe as Record<string, unknown>)['options'] as Record<string, unknown>
    expect(opts).not.toHaveProperty('__proto__')
    expect(Object.isFrozen(opts)).toBe(true)
  })

  it('does not mutate the global Object prototype', () => {
    const before = Object.keys(Object.prototype).length
    createSafeConfig(JSON.parse('{"__proto__":{"evil":"yes"}}'))
    const after = Object.keys(Object.prototype).length
    expect(after).toBe(before)
    expect((Object.prototype as Record<string, unknown>)['evil']).toBeUndefined()
  })
})

describe('parseSafeJson', () => {
  it('parses a valid JSON object safely', () => {
    const result = parseSafeJson('{"algorithm":"sha256","rounds":10}')
    expect((result as Record<string, unknown>)['algorithm']).toBe('sha256')
    expect((result as Record<string, unknown>)['rounds']).toBe(10)
  })

  it('throws on invalid JSON', () => {
    expect(() => parseSafeJson('not-json')).toThrow(TypeError)
  })

  it('throws on JSON array (not a plain object)', () => {
    expect(() => parseSafeJson('[1,2,3]')).toThrow(TypeError)
  })

  it('throws on JSON null', () => {
    expect(() => parseSafeJson('null')).toThrow(TypeError)
  })

  it('rejects prototype-polluting JSON payload', () => {
    const payload = '{"__proto__":{"admin":true}}'
    parseSafeJson(payload) // must not throw, but must be stripped
    expect((Object.prototype as Record<string, unknown>)['admin']).toBeUndefined()
  })
})

// ─── XSS Sanitization ────────────────────────────────────────────────────────

describe('sanitizeHtml – XSS prevention', () => {
  beforeEach(() => {
    // Provide a minimal DOMPurify mock for the test environment (jsdom)
    vi.resetModules()
  })

  it('strips <script> tags', () => {
    const dirty = 'Hello <script>alert("xss")</script> world'
    const clean = sanitizeHtml(dirty)
    expect(clean).not.toContain('<script>')
    expect(clean).not.toContain('alert')
  })

  it('strips javascript: href vectors', () => {
    const dirty = '<a href="javascript:alert(1)">click me</a>'
    const clean = sanitizeHtml(dirty)
    expect(clean).not.toContain('javascript:')
  })

  it('strips onerror attribute', () => {
    const dirty = '<img src="x" onerror="alert(1)">'
    const clean = sanitizeHtml(dirty)
    expect(clean).not.toContain('onerror')
  })

  it('strips onload attribute', () => {
    const dirty = '<svg onload="alert(1)"></svg>'
    const clean = sanitizeHtml(dirty)
    expect(clean).not.toContain('onload')
    expect(clean).not.toContain('<svg')
  })

  it('strips iframe injection', () => {
    const dirty = '<iframe src="https://evil.com"></iframe>'
    const clean = sanitizeHtml(dirty)
    expect(clean).not.toContain('<iframe')
  })

  it('preserves allowed math/notation tags: sup, sub, code', () => {
    const safe = 'x<sup>2</sup> + y<sub>1</sub> = <code>0x1B</code>'
    const clean = sanitizeHtml(safe)
    expect(clean).toContain('<sup>')
    expect(clean).toContain('<sub>')
    expect(clean).toContain('<code>')
  })

  it('handles empty string without error', () => {
    expect(sanitizeHtml('')).toBe('')
  })
})

// ─── URL / Query-Param Validation ────────────────────────────────────────────

describe('isSafeCipherName', () => {
  it('accepts valid cipher names', () => {
    expect(isSafeCipherName('aes')).toBe(true)
    expect(isSafeCipherName('sha-256')).toBe(true)
    expect(isSafeCipherName('chacha20_poly1305')).toBe(true)
  })

  it('rejects names with HTML injection characters', () => {
    expect(isSafeCipherName('<script>')).toBe(false)
    expect(isSafeCipherName('"xss"')).toBe(false)
  })

  it('rejects names with path traversal sequences', () => {
    expect(isSafeCipherName('../etc/passwd')).toBe(false)
  })

  it('rejects empty string', () => {
    expect(isSafeCipherName('')).toBe(false)
  })

  it('rejects names longer than 64 characters', () => {
    expect(isSafeCipherName('a'.repeat(65))).toBe(false)
  })
})

describe('isSafeQueryValue', () => {
  it('accepts normal alphanumeric values', () => {
    expect(isSafeQueryValue('hello-world')).toBe(true)
    expect(isSafeQueryValue('encrypt')).toBe(true)
  })

  it('rejects values with angle brackets', () => {
    expect(isSafeQueryValue('<script>alert(1)</script>')).toBe(false)
  })

  it('rejects values with double quotes', () => {
    expect(isSafeQueryValue('"injected"')).toBe(false)
  })

  it('rejects values longer than 2048 characters', () => {
    expect(isSafeQueryValue('a'.repeat(2049))).toBe(false)
  })

  it('accepts values up to 2048 characters', () => {
    expect(isSafeQueryValue('a'.repeat(2048))).toBe(true)
  })
})

describe('getSafeParam', () => {
  it('returns a safe param value', () => {
    const p = new URLSearchParams('cipher=aes&mode=CBC')
    expect(getSafeParam(p, 'cipher')).toBe('aes')
  })

  it('returns null for missing param', () => {
    const p = new URLSearchParams('')
    expect(getSafeParam(p, 'cipher')).toBeNull()
  })

  it('returns null for XSS payload in param', () => {
    const p = new URLSearchParams('cipher=<script>alert(1)</script>')
    expect(getSafeParam(p, 'cipher')).toBeNull()
  })
})
