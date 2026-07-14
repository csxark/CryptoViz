import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

describe('CSP header configuration (vercel.json)', () => {
  const vercelConfig = JSON.parse(
    readFileSync(resolve(__dirname, '../../vercel.json'), 'utf-8')
  )

  const cspHeader = vercelConfig.headers[0].headers.find(
    (h: { key: string; value: string }) => h.key === 'Content-Security-Policy'
  )

  it('defines a Content-Security-Policy header', () => {
    expect(cspHeader).toBeDefined()
  })

  it('does not allow unsafe-inline scripts', () => {
    const scriptSrc = cspHeader.value
      .split(';')
      .map((d: string) => d.trim())
      .find((d: string) => d.startsWith('script-src'))
    expect(scriptSrc).toBeDefined()
    expect(scriptSrc).not.toContain("'unsafe-inline'")
  })

  it('restricts worker-src to self and blob (required for cipher.worker.ts)', () => {
    expect(cspHeader.value).toContain("worker-src 'self' blob:")
  })

  it('sets frame-ancestors to none (clickjacking protection)', () => {
    expect(cspHeader.value).toContain("frame-ancestors 'none'")
  })

  it('sets object-src to none', () => {
    expect(cspHeader.value).toContain("object-src 'none'")
  })
})
