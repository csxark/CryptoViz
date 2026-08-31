# Content Security Policy & Security Headers

CryptoViz is configured as a fully static Next.js export (`output: 'export'`). Because static exports generate pre-rendered HTML files served via static hosting (e.g. Vercel Static), Next.js `middleware.ts` and runtime server-side nonces do not execute in production.

Security headers—including Content Security Policy (CSP)—are defined statically in [`vercel.json`](../vercel.json).

## Security Headers Architecture

- **Single Source of Truth**: All HTTP security headers are configured in `vercel.json`.
- **Script Policy**: `script-src 'self'; script-src-elem 'self'`. Inline scripts (`'unsafe-inline'`) are prohibited for scripts. Theme initialization is loaded as a same-origin script (`/theme-init.js`).
- **Style Policy**: `style-src 'self' 'unsafe-inline'` is permitted to allow Next.js runtime element styling during static export.
- **Strict Lockdown**: `object-src 'none'`, `frame-ancestors 'none'`, `base-uri 'self'`, `upgrade-insecure-requests`.
- **Worker Policy**: `worker-src 'self' blob:` (required for background Web Workers such as `cipher.worker.ts`).

## Configured Headers

In `vercel.json`:

```json
{
  "Content-Security-Policy": "default-src 'self'; base-uri 'self'; form-action 'self'; script-src 'self'; script-src-elem 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://avatars.githubusercontent.com https://github.githubassets.com https://images.unsplash.com; font-src 'self' data:; connect-src 'self' https://api.github.com https://vercel-insights.com https://supabase.co; worker-src 'self' blob:; frame-src 'self' https://www.youtube-nocookie.com; child-src 'self' blob:; frame-ancestors 'none'; object-src 'none'; upgrade-insecure-requests",
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Resource-Policy": "same-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()"
}
```

## Verification & Testing

Security headers are tested automatically against `vercel.json`:

```powershell
npx vitest run tests/security/headers.test.ts tests/security/csp.security.test.ts
npm run build
```

