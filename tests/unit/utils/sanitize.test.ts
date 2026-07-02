import { describe, it, expect } from 'vitest'
import { sanitize } from '../../../lib/utils/sanitize'

describe('Sanitize Utility Unit Tests', () => {
  it('escapes HTML special characters correctly', () => {
    expect(sanitize('<script>alert("XSS")</script>')).toBe('&lt;script&gt;alert(&quot;XSS&quot;)&lt;&#x2F;script&gt;')
    expect(sanitize('John & Doe')).toBe('John &amp; Doe')
    expect(sanitize("single'quote")).toBe('single&#x27;quote')
    expect(sanitize('slash/test')).toBe('slash&#x2F;test')
  })

  it('handles non-string inputs safely', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(sanitize(null as any)).toBe('')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(sanitize(undefined as any)).toBe('')
  })
})
