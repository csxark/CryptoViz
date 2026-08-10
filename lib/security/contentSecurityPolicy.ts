export interface ContentSecurityPolicyOptions {
  nonce?: string;
  reportUri?: string;
  reportOnly?: boolean;
  allowLocalDevUnsafeEval?: boolean;
  extraConnectSources?: string[];
  extraImageSources?: string[];
  extraFrameSources?: string[];
}

export interface ContentSecurityPolicyResult {
  headerName: "Content-Security-Policy" | "Content-Security-Policy-Report-Only";
  headerValue: string;
  nonce: string | null;
  directives: Record<string, string[]>;
}

const DEFAULT_CONNECT_SOURCES = [
  "'self'",
  "https://api.github.com",
  "https://*.vercel-insights.com",
  "https://*.supabase.co",
];

const DEFAULT_IMAGE_SOURCES = [
  "'self'",
  "data:",
  "blob:",
  "https://avatars.githubusercontent.com",
  "https://github.githubassets.com",
  "https://images.unsplash.com",
];

const DEFAULT_FRAME_SOURCES = [
  "'self'",
  "https://www.youtube-nocookie.com",
];

function unique(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

function createFallbackNonce(): string {
  const randomValues = new Uint8Array(16);

  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(randomValues);
  } else {
    let nodeCrypto;
    try {
      if (typeof require !== "undefined") {
        nodeCrypto = require("crypto");
      }
    } catch (e) {
      // ignore
    }

    if (nodeCrypto?.randomBytes) {
      try {
        const bytes = nodeCrypto.randomBytes(16);
        randomValues.set(bytes);
      } catch (e) {
        throw new Error("CSPRNG not available");
      }
    } else {
      throw new Error("CSPRNG not available");
    for (let index = 0; index < randomValues.length; index += 1) {
      randomValues[index] = Math.floor(Math.random() * 256);
    }
  }

     globalThis.crypto.getRandomValues(randomValues);
  return btoa(String.fromCharCode(...randomValues))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

export function createCspNonce(): string {
  return createFallbackNonce();
}

export function buildContentSecurityPolicy(
  options: ContentSecurityPolicyOptions = {},
): ContentSecurityPolicyResult {
  const nonce = options.nonce ?? createCspNonce();
  const scriptSrc = [
    "'self'",
    `'nonce-${nonce}'`,
    "'strict-dynamic'",
  ];

  if (options.allowLocalDevUnsafeEval) {
    scriptSrc.push("'unsafe-eval'");
  }

  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "base-uri": ["'self'"],
    "object-src": ["'none'"],
    "frame-ancestors": ["'none'"],
    "form-action": ["'self'"],
    "script-src": scriptSrc,
    "script-src-attr": ["'none'"],
    "style-src": ["'self'", `'nonce-${nonce}'`],
    "style-src-attr": ["'none'"],
    "img-src": unique([...DEFAULT_IMAGE_SOURCES, ...(options.extraImageSources ?? [])]),
    "font-src": ["'self'", "data:"],
    "connect-src": unique([...DEFAULT_CONNECT_SOURCES, ...(options.extraConnectSources ?? [])]),
    "frame-src": unique([...DEFAULT_FRAME_SOURCES, ...(options.extraFrameSources ?? [])]),
    "worker-src": ["'self'", "blob:"],
    "manifest-src": ["'self'"],
    "media-src": ["'self'"],
    "upgrade-insecure-requests": [],
  };

  if (options.reportUri) {
    directives["report-uri"] = [options.reportUri];
    directives["report-to"] = ["default"];
  }

  return {
    headerName: options.reportOnly ? "Content-Security-Policy-Report-Only" : "Content-Security-Policy",
    headerValue: serializeContentSecurityPolicy(directives),
    nonce,
    directives,
  };
}

export function serializeContentSecurityPolicy(directives: Record<string, string[]>): string {
  return Object.entries(directives)
    .map(([directive, values]) => (values.length > 0 ? `${directive} ${values.join(" ")}` : directive))
    .join("; ");
}

export function cspContainsUnsafeInline(headerValue: string): boolean {
  return /(^|\s)'unsafe-inline'(\s|;|$)/.test(headerValue);
  return /(^|\\s)'unsafe-inline'(\\s|;|$)/.test(headerValue);
}

export function validateStrictContentSecurityPolicy(headerValue: string): string[] {
  const findings: string[] = [];

  if (cspContainsUnsafeInline(headerValue)) {
    findings.push("CSP must not contain 'unsafe-inline'.");
  }

  if (!/script-src[^;]*'nonce-[^']+'/.test(headerValue)) {
    findings.push("script-src should include a nonce.");
  }

  if (!/style-src[^;]*'nonce-[^']+'/.test(headerValue)) {
    findings.push("style-src should include a nonce.");
  }

  if (!/object-src 'none'/.test(headerValue)) {
    findings.push("object-src should be locked down to 'none'.");
  }

  if (!/frame-ancestors 'none'/.test(headerValue)) {
    findings.push("frame-ancestors should be locked down to 'none'.");
  }

  if (!/base-uri 'self'/.test(headerValue)) {
    findings.push("base-uri should be locked down to 'self'.");
  }

  return findings;
}

export function buildSecurityHeaders(options: ContentSecurityPolicyOptions = {}): Record<string, string> {
  const csp = buildContentSecurityPolicy(options);

  return {
    [csp.headerName]: csp.headerValue,
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": [
      "camera=()",
      "microphone=()",
      "geolocation=()",
      "payment=()",
      "usb=()",
      "browsing-topics=()",
    ].join(", "),
    "X-Frame-Options": "DENY",
    "Cross-Origin-Opener-Policy": "same-origin",
    "Cross-Origin-Resource-Policy": "same-origin",
  };
}

export function buildCspManualChecklist(): string[] {
  return [
    "Inspect the deployed response headers and confirm Content-Security-Policy is present.",
    "Confirm the CSP header does not contain 'unsafe-inline'.",
    "Confirm script-src contains a request-specific nonce.",
    "Confirm style-src contains a request-specific nonce.",
    "Confirm object-src is locked to 'none'.",
    "Confirm frame-ancestors is locked to 'none'.",
    "Run the focused CSP unit tests.",
    "Run the production build and verify no CSP regressions are introduced.",
  ];
}
