/**
 * Security utility module for Content Security Policy (CSP) parsing and nonce creation.
 */

/**
 * Creates a fallback cryptographic nonce if none is provided or generated.
 */
export function createFallbackNonce(): string {
  // Generate a secure random fallback nonce
  const array = new Uint8Array(16);
  if (typeof window !== 'undefined' && window.crypto) {
    window.crypto.getRandomValues(array);
  } else if (typeof globalThis !== 'undefined' && globalThis.crypto) {
    globalThis.crypto.getRandomValues(array);
  } else {
    throw new Error("Secure cryptographic random number generator is unavailable.");
  }
  
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Checks whether a given CSP string contains 'unsafe-inline' directives.
 */
export function cspContainsUnsafeInline(cspHeader: string): boolean {
  if (!cspHeader || typeof cspHeader !== 'string') {
    return false;
  }
  
  // Standardized regex matching 'unsafe-inline' inside script-src or default directives
  const unsafeInlineRegex = /'unsafe-inline'/i;
  return unsafeInlineRegex.test(cspHeader);
}
