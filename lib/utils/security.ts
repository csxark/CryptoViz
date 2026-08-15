/**
 * Security utilities for the CryptoViz cipher engine.
 *
 * Provides:
 *  - Prototype pollution detection and prevention (Object.freeze / null-prototype objects)
 *  - Client-side HTML sanitization via DOMPurify (XSS prevention)
 *  - URL search-param input validation helpers
 *
 * @see https://owasp.org/www-community/attacks/Prototype_Pollution
 * @see https://owasp.org/www-community/attacks/xss/
 */

// ─── Prototype Pollution Prevention ──────────────────────────────────────────

/** Keys that must never appear in any untrusted object. */
const PROTOTYPE_POLLUTION_KEYS = new Set([
  '__proto__',
  'constructor',
  'prototype',
])

/**
 * Returns true when a key is a known prototype-pollution vector.
 * Use this before assigning any dynamic property.
 *
 * @example
 * if (isDangerousKey(key)) throw new Error('Rejected dangerous key')
 */
export function isDangerousKey(key: string): boolean {
  return PROTOTYPE_POLLUTION_KEYS.has(key)
}

/**
 * Creates a safe, null-prototype dictionary from an arbitrary plain object.
 *
 * - Strips any prototype-polluting keys (__proto__, constructor, prototype)
 * - Returns a frozen Object.create(null) so there is no prototype chain
 *   to pollute and the result cannot be mutated after creation.
 *
 * @param obj Untrusted plain object (e.g. parsed from JSON or URL params)
 * @returns Frozen null-prototype record
 */
export function createSafeConfig<T extends Record<string, unknown>>(
  obj: T,
): Readonly<Record<string, unknown>> {
  const safe = Object.create(null) as Record<string, unknown>

  for (const key of Object.keys(obj)) {
    if (isDangerousKey(key)) {
      console.warn(`[security] Rejected prototype-polluting key: "${key}"`)
      continue
    }
    // Recursively harden nested objects, leave primitives/arrays as-is
    const value = (obj as Record<string, unknown>)[key]
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      safe[key] = createSafeConfig(value as Record<string, unknown>)
    } else {
      safe[key] = value
    }
  }

  return Object.freeze(safe)
}

/**
 * Validates that a JSON.parse result is a plain object (not an array,
 * null, or primitive) and returns a safe frozen config from it.
 *
 * Throws a TypeError on invalid structures so callers can catch and reject
 * malformed uploads/pastes without crashing.
 */
export function parseSafeJson(raw: string): Readonly<Record<string, unknown>> {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new TypeError('Invalid JSON: could not parse input.')
  }

  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new TypeError('Invalid JSON structure: expected a plain object.')
  }

  return createSafeConfig(parsed as Record<string, unknown>)
}

// ─── DOM / HTML Sanitization (XSS Prevention) ────────────────────────────────

/**
 * Strict DOMPurify configuration.
 * Only allows elements and attributes that are safe for mathematical
 * and scientific rendering (sup, sub, span, strong, em, code, br).
 */
const DOMPURIFY_CONFIG = {
  ALLOWED_TAGS: ['sup', 'sub', 'span', 'strong', 'em', 'b', 'i', 'code', 'br'],
  ALLOWED_ATTR: ['class'],
  FORBID_ATTR: ['style', 'onerror', 'onload', 'onclick', 'onmouseover'],
  FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input', 'svg'],
  KEEP_CONTENT: true,
  RETURN_TRUSTED_TYPE: false,
}

/**
 * Sanitizes an HTML string for safe use with dangerouslySetInnerHTML.
 *
 * - Runs DOMPurify on the client
 * - On the server (SSR / test) where DOMPurify is unavailable, strips all
 *   HTML tags entirely as a safe fallback.
 * - Only allows the minimal set of tags needed for mathematical notation.
 *
 * @example
 * <p dangerouslySetInnerHTML={{ __html: sanitizeHtml(formula) }} />
 */
export function sanitizeHtml(dirty: string): string {
  if (typeof window === 'undefined') {
    // SSR / Node environment: strip all tags as a conservative fallback
    return dirty.replace(/<[^>]*>/g, '')
  }

  try {
    // Dynamically require DOMPurify to keep the server bundle clean
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const DOMPurify = require('dompurify') as typeof import('dompurify')
    const purify = typeof DOMPurify === 'function' ? DOMPurify : DOMPurify.default ?? DOMPurify
    return typeof purify.sanitize === 'function'
      ? (purify.sanitize(dirty, DOMPURIFY_CONFIG) as string)
      : dirty.replace(/<[^>]*>/g, '')
  } catch {
    // Graceful degradation: strip tags if DOMPurify fails to load
    return dirty.replace(/<[^>]*>/g, '')
  }
}

// ─── URL / Search-Param Validation ───────────────────────────────────────────

/**
 * Validates that a string consists only of safe characters for use as a
 * cipher algorithm identifier (letters, digits, hyphens, underscores).
 * Rejects anything that could be used for injection or path traversal.
 */
export function isSafeCipherName(value: string): boolean {
  return /^[a-zA-Z0-9_-]{1,64}$/.test(value)
}

/**
 * Validates that a string is safe for use as a URL query parameter value
 * (printable ASCII, no angle brackets or quotes that enable HTML injection).
 */
export function isSafeQueryValue(value: string): boolean {
  // Reject strings containing HTML meta-characters
  return !/[<>"'`\\]/.test(value) && value.length <= 2048
}

/**
 * Returns the value of a URLSearchParams entry only if it passes the
 * safe-query-value check. Returns null for missing or unsafe values.
 */
export function getSafeParam(
  params: URLSearchParams,
  key: string,
): string | null {
  const val = params.get(key)
  if (val === null) return null
  return isSafeQueryValue(val) ? val : null
}
