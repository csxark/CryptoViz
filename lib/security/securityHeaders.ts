/**
 * Centralized Single Enforced Security Headers and Content Security Policy (CSP) Module.
 * Primary source of truth for CryptoViz security policy (#1331).
 */

export interface SecurityHeader {
  key: string;
  value: string;
}

export interface CspDirectives {
  'default-src'?: string[];
  'base-uri'?: string[];
  'form-action'?: string[];
  'script-src'?: string[];
  'script-src-elem'?: string[];
  'style-src'?: string[];
  'img-src'?: string[];
  'font-src'?: string[];
  'connect-src'?: string[];
  'worker-src'?: string[];
  'frame-src'?: string[];
  'child-src'?: string[];
  'frame-ancestors'?: string[];
  'object-src'?: string[];
  'upgrade-insecure-requests'?: boolean;
}

export const PRODUCTION_CSP_DIRECTIVES: CspDirectives = {
  'default-src': ["'self'"],
  'base-uri': ["'self'"],
  'form-action': ["'self'"],
  'script-src': ["'self'"],
  'script-src-elem': ["'self'"],
  'style-src': ["'self'", "'unsafe-inline'"],
  'img-src': [
    "'self'",
    'data:',
    'blob:',
    'https://avatars.githubusercontent.com',
    'https://github.githubassets.com',
    'https://images.unsplash.com',
  ],
  'font-src': ["'self'", 'data:'],
  'connect-src': [
    "'self'",
    'https://api.github.com',
    'https://vercel-insights.com',
    'https://supabase.co',
  ],
  'worker-src': ["'self'", 'blob:'],
  'frame-src': ["'self'", 'https://www.youtube-nocookie.com'],
  'child-src': ["'self'", 'blob:'],
  'frame-ancestors': ["'none'"],
  'object-src': ["'none'"],
  'upgrade-insecure-requests': true,
};

export function buildCspHeaderString(directives: CspDirectives = PRODUCTION_CSP_DIRECTIVES): string {
  const parts: string[] = [];
  for (const [key, val] of Object.entries(directives)) {
    if (key === 'upgrade-insecure-requests') {
      if (val) parts.push('upgrade-insecure-requests');
    } else if (Array.isArray(val) && val.length > 0) {
      parts.push(`${key} ${val.join(' ')}`);
    }
  }
  return parts.join('; ');
}

export const PRODUCTION_SECURITY_HEADERS: SecurityHeader[] = [
  {
    key: 'Content-Security-Policy',
    value: buildCspHeaderString(PRODUCTION_CSP_DIRECTIVES),
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'Cross-Origin-Opener-Policy',
    value: 'same-origin',
  },
  {
    key: 'Cross-Origin-Resource-Policy',
    value: 'same-origin',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()',
  },
];

export function getSecurityHeaders(): SecurityHeader[] {
  return [...PRODUCTION_SECURITY_HEADERS];
}