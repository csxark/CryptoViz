import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { getSecurityHeaders, PRODUCTION_SECURITY_HEADERS, buildCspHeaderString, PRODUCTION_CSP_DIRECTIVES } from '../../lib/security/securityHeaders'

describe('Centralized Enforced Security Headers (#1331)', () => {
  const vercelConfig = JSON.parse(
    readFileSync(resolve(__dirname, '../../vercel.json'), 'utf-8')
  )

  const vercelHeaders = vercelConfig.headers[0].headers as Array<{ key: string; value: string }>

  function getVercelHeader(name: string): string | undefined {
    return vercelHeaders.find(
      (h) => h.key.toLowerCase() === name.toLowerCase()
    )?.value
  }

  function getModuleHeader(name: string): string | undefined {
    return getSecurityHeaders().find(
      (h) => h.key.toLowerCase() === name.toLowerCase()
    )?.value
  }

  it('maintains strict parity between centralized module and deployment configuration (vercel.json)', () => {
    const moduleHeaders = getSecurityHeaders()
    expect(moduleHeaders.length).toBeGreaterThan(0)
    for (const h of moduleHeaders) {
      const vercelVal = getVercelHeader(h.key)
      expect(vercelVal).toBe(h.value)
    }
  })

  it('defines a Content-Security-Policy header in both module and vercel.json', () => {
    const cspHeader = getModuleHeader('Content-Security-Policy')
    expect(cspHeader).toBeDefined()
    expect(getVercelHeader('Content-Security-Policy')).toBe(cspHeader)
  })

  it('does not allow unsafe-inline scripts in script-src or script-src-elem', () => {
    const cspHeader = getModuleHeader('Content-Security-Policy')!
    const scriptSrcElem = cspHeader
      .split(';')
      .map((d: string) => d.trim())
      .find((d: string) => d.startsWith('script-src-elem '))

    expect(scriptSrcElem).toBeDefined()
    expect(scriptSrcElem).toContain("'self'")
    expect(scriptSrcElem).not.toContain("'unsafe-inline'")
  })

  it('restricts worker-src to self and blob (required for cipher.worker.ts)', () => {
    const cspHeader = getModuleHeader('Content-Security-Policy')!
    expect(cspHeader).toContain("worker-src 'self' blob:")
    expect(cspHeader).toContain("child-src 'self' blob:")
  })

  it('sets frame-ancestors to none (clickjacking protection)', () => {
    const cspHeader = getModuleHeader('Content-Security-Policy')!
    expect(cspHeader).toContain("frame-ancestors 'none'")
  })

  it('sets object-src to none', () => {
    const cspHeader = getModuleHeader('Content-Security-Policy')!
    expect(cspHeader).toContain("object-src 'none'")
  })

  it('configures standard security headers with maximum enforcement', () => {
    expect(getModuleHeader('X-Frame-Options')).toBe('DENY')
    expect(getModuleHeader('X-Content-Type-Options')).toBe('nosniff')
    expect(getModuleHeader('Strict-Transport-Security')).toContain('max-age=63072000')
    expect(getModuleHeader('Referrer-Policy')).toBe('strict-origin-when-cross-origin')
    expect(getModuleHeader('Cross-Origin-Opener-Policy')).toBe('same-origin')
    expect(getModuleHeader('Cross-Origin-Resource-Policy')).toBe('same-origin')
    expect(getModuleHeader('Permissions-Policy')).toContain('camera=()')
  })

  it('builds CSP header string correctly from directives structure', () => {
    const generatedCsp = buildCspHeaderString(PRODUCTION_CSP_DIRECTIVES)
    expect(generatedCsp).toContain("default-src 'self'")
    expect(generatedCsp).toContain("upgrade-insecure-requests")
  })

  it('ensures connect-src contains no wildcard origins (#1465)', () => {
    const cspHeader = getModuleHeader('Content-Security-Policy')!
    const connectSrc = cspHeader
      .split(';')
      .map((d: string) => d.trim())
      .find((d: string) => d.startsWith('connect-src '))

    expect(connectSrc).toBeDefined()
    expect(connectSrc).not.toContain('*')
    expect(connectSrc).toContain("connect-src 'self' https://api.github.com https://vercel-insights.com https://supabase.co")
  })
})