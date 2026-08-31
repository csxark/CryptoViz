/**
 * JWT Decoder & Security Analyzer — RFC 7519 Implementation
 *
 * Decodes, validates, and analyzes JSON Web Tokens (JWTs) with
 * step-by-step educational visualization. Covers:
 *  - Header/payload Base64URL decoding
 *  - Algorithm identification and security assessment
 *  - Claims validation (exp, nbf, iat, iss, aud, sub)
 *  - Signature verification (structural only — no key material needed)
 *  - Common vulnerability detection (alg:none, weak algorithms, etc.)
 *
 * This module is for educational purposes — it demonstrates how JWTs
 * work internally and highlights common security pitfalls.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export type JwtAlgorithm =
  | "HS256"
  | "HS384"
  | "HS512"
  | "RS256"
  | "RS384"
  | "RS512"
  | "ES256"
  | "ES384"
  | "ES512"
  | "PS256"
  | "PS384"
  | "PS512"
  | "EdDSA"
  | "none"
  | "UNKNOWN";

export interface JwtHeader {
  alg: string;
  typ?: string;
  cty?: string;
  kid?: string;
  x5c?: string[];
  [key: string]: unknown;
}

export interface JwtPayload {
  iss?: string;
  sub?: string;
  aud?: string | string[];
  exp?: number;
  nbf?: number;
  iat?: number;
  jti?: string;
  [key: string]: unknown;
}

export interface JwtDecodingStep {
  step: number;
  description: string;
  input: string;
  output: string;
}

export interface JwtSecurityFinding {
  severity: "critical" | "high" | "medium" | "low" | "info";
  category: string;
  title: string;
  description: string;
  recommendation: string;
}

export interface DecodedJwt {
  /** The original raw token string */
  raw: string;
  /** Parsed header object */
  header: JwtHeader;
  /** Parsed payload object */
  payload: JwtPayload;
  /** The signature portion (base64url encoded) */
  signature: string;
  /** Whether the token has exactly 3 segments */
  validStructure: boolean;
  /** Expiration status (only if exp claim exists) */
  expired?: boolean;
  /** Not-yet-valid status (only if nbf claim exists) */
  notYetValid?: boolean;
  /** Time remaining until expiration (seconds, negative if expired) */
  expiresIn?: number;
  /** Step-by-step decoding visualization */
  steps: JwtDecodingStep[];
  /** Security findings and recommendations */
  securityFindings: JwtSecurityFinding[];
  /** Overall security rating */
  securityRating: "critical" | "high" | "medium" | "low" | "safe";
}

// ─── Constants ───────────────────────────────────────────────────────────────

const JWT_SEGMENTS = 3;

/** Algorithms that are symmetric (HMAC) — secret is shared */
const SYMMETRIC_ALGS = new Set(["HS256", "HS384", "HS512"]);

/** Algorithms considered weak or dangerous */
const WEAK_ALGS = new Set(["none", "HS1", "HS256"]);

/** Algorithms that are asymmetric (public/private key) */
const ASYMMETRIC_ALGS = new Set([
  "RS256", "RS384", "RS512",
  "ES256", "ES384", "ES512",
  "PS256", "PS384", "PS512",
  "EdDSA",
]);

/** Standard registered claim names per RFC 7519 */
const REGISTERED_CLAIMS: Record<string, string> = {
  iss: "Issuer — identifies who issued the token",
  sub: "Subject — identifies the principal (user/entity)",
  aud: "Audience — identifies the intended recipient(s)",
  exp: "Expiration Time — seconds since epoch when token expires",
  nbf: "Not Before — seconds since epoch when token becomes valid",
  iat: "Issued At — seconds since epoch when token was created",
  jti: "JWT ID — unique identifier for the token",
};

// ─── Base64URL Decoding ──────────────────────────────────────────────────────

/**
 * Decode a Base64URL-encoded string to raw bytes.
 * RFC 7515 §2: Base64URL uses - instead of + and _ instead of /.
 */
function base64UrlDecode(input: string): Uint8Array {
  // Add padding
  let padded = input.replace(/-/g, "+").replace(/_/g, "/");
  while (padded.length % 4 !== 0) {
    padded += "=";
  }
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Decode a Base64URL-encoded string to a UTF-8 text string.
 */
function base64UrlToString(input: string): string {
  const bytes = base64UrlDecode(input);
  return new TextDecoder().decode(bytes);
}

/**
 * Decode a Base64URL-encoded string to a JSON object.
 */
function base64UrlToJson<T = Record<string, unknown>>(input: string): T {
  const text = base64UrlToString(input);
  return JSON.parse(text) as T;
}

// ─── Main Decoder ────────────────────────────────────────────────────────────

/**
 * Decode and analyze a JWT token.
 * Does NOT verify the cryptographic signature (no key material needed).
 * Focuses on structure validation, claims analysis, and security assessment.
 */
export function decodeJwt(token: string, nowSeconds?: number): DecodedJwt {
  const steps: JwtDecodingStep[] = [];
  const securityFindings: JwtSecurityFinding[] = [];
  const currentTime = nowSeconds ?? Math.floor(Date.now() / 1000);

  // Step 1: Split token into segments
  const segments = token.split(".");
  const validStructure = segments.length === JWT_SEGMENTS;
  steps.push({
    step: 1,
    description: `Split JWT into ${segments.length} dot-separated segments`,
    input: token.length > 80 ? token.slice(0, 40) + "…" + token.slice(-40) : token,
    output: `header (${segments[0]?.length ?? 0} chars) · payload (${segments[1]?.length ?? 0} chars) · signature (${segments[2]?.length ?? 0} chars)`,
  });

  if (!validStructure) {
    securityFindings.push({
      severity: "critical",
      category: "structure",
      title: "Invalid JWT structure",
      description: `Expected 3 dot-separated segments, found ${segments.length}. This is not a valid JWT.`,
      recommendation: "Ensure the token follows the RFC 7519 format: header.payload.signature",
    });

    return {
      raw: token,
      header: { alg: "UNKNOWN" },
      payload: {},
      signature: "",
      validStructure: false,
      steps,
      securityFindings,
      securityRating: "critical",
    };
  }

  // Step 2: Decode header
  let header: JwtHeader;
  try {
    header = base64UrlToJson<JwtHeader>(segments[0]);
    steps.push({
      step: 2,
      description: "Base64URL-decode the header segment",
      input: segments[0],
      output: JSON.stringify(header, null, 2),
    });
  } catch {
    securityFindings.push({
      severity: "critical",
      category: "structure",
      title: "Invalid header encoding",
      description: "The header segment could not be decoded as valid Base64URL JSON.",
      recommendation: "Ensure the header is valid Base64URL-encoded JSON.",
    });
    return {
      raw: token,
      header: { alg: "UNKNOWN" },
      payload: {},
      signature: segments[2],
      validStructure: true,
      steps,
      securityFindings,
      securityRating: "critical",
    };
  }

  // Step 3: Decode payload
  let payload: JwtPayload;
  try {
    payload = base64UrlToJson<JwtPayload>(segments[1]);
    steps.push({
      step: 3,
      description: "Base64URL-decode the payload segment",
      input: segments[1],
      output: JSON.stringify(payload, null, 2),
    });
  } catch {
    securityFindings.push({
      severity: "medium",
      category: "structure",
      title: "Invalid payload encoding",
      description: "The payload segment could not be decoded as valid Base64URL JSON.",
      recommendation: "Ensure the payload is valid Base64URL-encoded JSON.",
    });
    return {
      raw: token,
      header,
      payload: {},
      signature: segments[2],
      validStructure: true,
      steps,
      securityFindings,
      securityRating: "high",
    };
  }

  // Step 4: Identify signature algorithm
  steps.push({
    step: 4,
    description: `Algorithm from header: "${header.alg}"`,
    input: `header.alg = "${header.alg}"`,
    output: classifyAlgorithm(header.alg),
  });

  // Security: Algorithm analysis
  analyzeAlgorithm(header.alg, securityFindings);

  // Step 5: Expiration check
  if (payload.exp !== undefined) {
    const expired = currentTime > payload.exp;
    const expiresIn = payload.exp - currentTime;
    steps.push({
      step: 5,
      description: expired
        ? `Token EXPIRED at ${new Date(payload.exp * 1000).toISOString()}`
        : `Token expires in ${formatDuration(expiresIn)} (at ${new Date(payload.exp * 1000).toISOString()})`,
      input: `exp = ${payload.exp} (epoch)`,
      output: expired ? "EXPIRED" : `valid for ${formatDuration(expiresIn)}`,
    });

    if (expired) {
      securityFindings.push({
        severity: "high",
        category: "claims",
        title: "Token has expired",
        description: `The token expired ${formatDuration(Math.abs(expiresIn))} ago (exp=${payload.exp}).`,
        recommendation: "Do not accept expired tokens. Refresh or re-authenticate.",
      });
    }
  }

  // Step 6: Not-before check
  let notYetValid: boolean | undefined;
  if (payload.nbf !== undefined) {
    notYetValid = currentTime < payload.nbf;
    steps.push({
      step: 6,
      description: notYetValid
        ? `Token is NOT YET VALID (becomes valid at ${new Date(payload.nbf * 1000).toISOString()})`
        : `Token is valid (nbf=${payload.nbf} has passed)`,
      input: `nbf = ${payload.nbf} (epoch)`,
      output: notYetValid ? "NOT YET VALID" : "valid",
    });

    if (notYetValid) {
      securityFindings.push({
        severity: "high",
        category: "claims",
        title: "Token is not yet valid",
        description: `The token's nbf (not-before) is ${new Date(payload.nbf * 1000).toISOString()}.`,
        recommendation: "Do not accept tokens before their nbf time.",
      });
    }
  }

  // Step 7: Claims inventory
  const registeredClaims = Object.keys(payload).filter(
    (k) => k in REGISTERED_CLAIMS,
  );
  const customClaims = Object.keys(payload).filter(
    (k) => !(k in REGISTERED_CLAIMS),
  );
  steps.push({
    step: 7,
    description: `Identified ${registeredClaims.length} registered claim(s) and ${customClaims.length} custom claim(s)`,
    input: Object.keys(payload).join(", "),
    output: `Registered: [${registeredClaims.join(", ")}]${customClaims.length > 0 ? ` | Custom: [${customClaims.join(", ")}]` : ""}`,
  });

  // Security: Claims analysis
  analyzeClaims(payload, securityFindings);

  // Security: Check for sensitive data in payload
  analyzeSensitiveData(payload, securityFindings);

  // Determine overall security rating
  const securityRating = determineSecurityRating(securityFindings);

  return {
    raw: token,
    header,
    payload,
    signature: segments[2],
    validStructure: true,
    expired: payload.exp !== undefined ? currentTime > payload.exp : undefined,
    notYetValid,
    expiresIn: payload.exp !== undefined ? payload.exp - currentTime : undefined,
    steps,
    securityFindings,
    securityRating,
  };
}

// ─── Algorithm Analysis ──────────────────────────────────────────────────────

function classifyAlgorithm(alg: string): string {
  const normalized = alg.toUpperCase();
  if (normalized === "NONE") return "⚠️  NONE — no signature verification!";
  if (SYMMETRIC_ALGS.has(normalized)) return `🔑 Symmetric (HMAC) — ${normalized}`;
  if (ASYMMETRIC_ALGS.has(normalized)) return `🔐 Asymmetric — ${normalized}`;
  return `❓ Unknown algorithm — ${alg}`;
}

function analyzeAlgorithm(alg: string, findings: JwtSecurityFinding[]): void {
  const normalized = alg.toUpperCase();

  if (normalized === "NONE") {
    findings.push({
      severity: "critical",
      category: "algorithm",
      title: "Algorithm 'none' — signature bypass vulnerability",
      description:
        'The token uses "alg: none", meaning no signature is applied. Anyone can forge tokens with arbitrary claims.',
      recommendation:
        'Reject tokens with alg=none. Always require a valid cryptographic signature.',
    });
    return;
  }

  if (normalized === "HS1") {
    findings.push({
      severity: "critical",
      category: "algorithm",
      title: "Algorithm HS1 is deprecated and insecure",
      description:
        "HMAC-SHA1 uses a 160-bit hash which is cryptographically weak.",
      recommendation: "Migrate to HS256 or stronger.",
    });
  }

  if (normalized === "HS256") {
    findings.push({
      severity: "medium",
      category: "algorithm",
      title: "HMAC-SHA256 (symmetric) — secret key is shared",
      description:
        "HS256 uses a symmetric shared secret. Both issuer and verifier must possess the same key.",
      recommendation:
        "Ensure the HMAC secret is at least 256 bits and stored securely. Consider RS256 for distributed verification.",
    });
  }

  if (normalized.startsWith("RS") && normalized !== "RS256") {
    findings.push({
      severity: "low",
      category: "algorithm",
      title: "RSA variant beyond RS256",
      description: `Using ${normalized} — RS256 is typically sufficient and more widely supported.`,
      recommendation: "Ensure all verifiers support this algorithm variant.",
    });
  }

  if (normalized.startsWith("ES")) {
    findings.push({
      severity: "info",
      category: "algorithm",
      title: "ECDSA algorithm — efficient asymmetric signing",
      description: `${normalized} uses elliptic curve cryptography for compact signatures.`,
      recommendation: "Verify the curve (P-256, P-384, P-521) matches your security requirements.",
    });
  }
}

// ─── Claims Analysis ─────────────────────────────────────────────────────────

function analyzeClaims(payload: JwtPayload, findings: JwtSecurityFinding[]): void {
  // Missing exp
  if (payload.exp === undefined) {
    findings.push({
      severity: "medium",
      category: "claims",
      title: "Missing 'exp' (expiration) claim",
      description: "This token has no expiration time and will remain valid indefinitely.",
      recommendation: "Always set an 'exp' claim to limit token lifetime.",
    });
  }

  // Very long expiration
  if (payload.exp !== undefined && payload.iat !== undefined) {
    const lifetime = payload.exp - payload.iat;
    if (lifetime > 86400 * 30) {
      findings.push({
        severity: "medium",
        category: "claims",
        title: "Very long token lifetime",
        description: `Token lifetime is ${formatDuration(lifetime)} (from iat to exp).`,
        recommendation: "Keep token lifetimes short (minutes to hours) and use refresh tokens.",
      });
    }
  }

  // Missing iss
  if (payload.iss === undefined) {
    findings.push({
      severity: "low",
      category: "claims",
      title: "Missing 'iss' (issuer) claim",
      description: "No issuer is identified, making it harder to validate token origin.",
      recommendation: "Include an 'iss' claim to enable issuer validation.",
    });
  }

  // Missing aud
  if (payload.aud === undefined) {
    findings.push({
      severity: "low",
      category: "claims",
      title: "Missing 'aud' (audience) claim",
      description: "No audience restriction — the token can be replayed to any service.",
      recommendation: "Include an 'aud' claim to restrict which services accept the token.",
    });
  }
}

// ─── Sensitive Data Analysis ─────────────────────────────────────────────────

const SENSITIVE_KEYS = new Set([
  "password", "passwd", "secret", "token", "api_key", "apikey",
  "access_token", "refresh_token", "private_key", "credit_card",
  "ssn", "social_security", "bank_account", "pin",
]);

function analyzeSensitiveData(payload: JwtPayload, findings: JwtSecurityFinding[]): void {
  const keys = Object.keys(payload);
  const sensitiveKeys = keys.filter((k) => {
    const lower = k.toLowerCase();
    return Array.from(SENSITIVE_KEYS).some((sk) => lower.includes(sk));
  });

  if (sensitiveKeys.length > 0) {
    findings.push({
      severity: "high",
      category: "data_exposure",
      title: "Potential sensitive data in token payload",
      description: `The following claim names may contain sensitive data: ${sensitiveKeys.join(", ")}. JWT payloads are Base64URL-encoded (NOT encrypted) and can be read by anyone.`,
      recommendation: "Never store secrets or PII in JWT payloads. Use encrypted tokens (JWE) or server-side sessions for sensitive data.",
    });
  }
}

// ─── Security Rating ─────────────────────────────────────────────────────────

function determineSecurityRating(
  findings: JwtSecurityFinding[],
): "critical" | "high" | "medium" | "low" | "safe" {
  if (findings.some((f) => f.severity === "critical")) return "critical";
  if (findings.some((f) => f.severity === "high")) return "high";
  if (findings.some((f) => f.severity === "medium")) return "medium";
  if (findings.some((f) => f.severity === "low")) return "low";
  return "safe";
}

// ─── Utility Functions ───────────────────────────────────────────────────────

function formatDuration(seconds: number): string {
  const abs = Math.abs(seconds);
  if (abs < 60) return `${abs}s`;
  if (abs < 3600) return `${Math.floor(abs / 60)}m ${abs % 60}s`;
  if (abs < 86400) {
    const h = Math.floor(abs / 3600);
    const m = Math.floor((abs % 3600) / 60);
    return `${h}h ${m}m`;
  }
  const d = Math.floor(abs / 86400);
  const h = Math.floor((abs % 86400) / 3600);
  return `${d}d ${h}h`;
}

/**
 * Generate an educational explanation of how JWTs work.
 */
export function getJwtExplanation(): string[] {
  return [
    "1. A JWT consists of three Base64URL-encoded segments separated by dots: header.payload.signature",
    "2. The header specifies the signing algorithm (e.g., HS256, RS256) and token type.",
    "3. The payload contains claims — statements about the entity (user ID, roles, expiration, etc.).",
    "4. The signature is computed over the header and payload using the specified algorithm and a secret/key.",
    "5. Base64URL encoding is NOT encryption — anyone can decode and read the header and payload.",
    "6. Signature verification ensures the token hasn't been tampered with since issuance.",
    "7. Common vulnerabilities: alg:none bypass, weak HMAC secrets, sensitive data in payload, missing expiration.",
  ];
}

/**
 * Encode a payload into a JWT structure (unsigned — for testing/demos).
 * Does NOT produce a valid cryptographic signature.
 */
export function createUnsignedJwt(header: JwtHeader, payload: JwtPayload): string {
  const headerB64 = btoa(JSON.stringify(header))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  const payloadB64 = btoa(JSON.stringify(payload))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  return `${headerB64}.${payloadB64}.`;
}

/**
 * Format all claims with human-readable descriptions for display.
 */
export function describeClaims(payload: JwtPayload): Array<{ key: string; value: string; description: string; isRegistered: boolean }> {
  return Object.entries(payload).map(([key, value]) => ({
    key,
    value: typeof value === "object" ? JSON.stringify(value) : String(value),
    description: REGISTERED_CLAIMS[key] ?? "Custom claim",
    isRegistered: key in REGISTERED_CLAIMS,
  }));
}
