import { hmac } from '@noble/hashes/hmac.js';
import { sha256 } from '@noble/hashes/sha2.js';
import {
  DomainOperationInput,
  DomainOperationResult,
  executeDomainOperation,
} from './domainOperationState';
import { getPersistentRepositories } from './repository';

export interface TrustedSession {
  userId: string;
  role: 'admin' | 'operator' | 'user' | 'guest';
  permissions: string[];
  expiry: number;
  csrfToken: string;
}

export interface AuditLogEntry {
  timestamp: string;
  correlationId: string;
  userId: string;
  role: string;
  category: string;
  operationName: string;
  idempotencyKey: string;
  status: 'SUCCESS' | 'REJECTED' | 'FAILED' | 'EXPIRED' | 'CANCELLED' | 'REVERTED';
  details: string;
}

export interface ServerResponse {
  success: boolean;
  correlationId: string;
  result?: DomainOperationResult;
  error?: string;
}

// Deterministic key for server-side token signature verification
const SERVER_SECRET = new TextEncoder().encode('CryptoViz-Server-Secret-Boundary-Key-998877');

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Mocks user login/session creation.
 * Returns a base64-encoded payload concatenated with its HMAC-SHA256 signature.
 */
export function signToken(session: TrustedSession): string {
  const payloadStr = JSON.stringify(session);
  const payloadBytes = new TextEncoder().encode(payloadStr);
  const sigBytes = hmac(sha256, SERVER_SECRET, payloadBytes);
  const sigHex = bytesToHex(sigBytes);
  const payloadB64 = btoa(unescape(encodeURIComponent(payloadStr)));
  return `${payloadB64}.${sigHex}`;
}

/**
 * Verifies the integrity of a session token.
 * Throws an error if the signature is invalid, payload is malformed, or session has expired.
 */
export function verifyToken(token: string): TrustedSession {
  if (!token) {
    throw new Error('INVALID_TOKEN: Token is missing');
  }
  const parts = token.split('.');
  if (parts.length !== 2) {
    throw new Error('INVALID_TOKEN: Token format invalid');
  }
  const [payloadB64, sigHex] = parts;
  let payloadStr: string;
  try {
    payloadStr = decodeURIComponent(escape(atob(payloadB64)));
  } catch {
    throw new Error('INVALID_TOKEN: Payload decode failed');
  }

  // Recalculate signature
  const payloadBytes = new TextEncoder().encode(payloadStr);
  const expectedSigBytes = hmac(sha256, SERVER_SECRET, payloadBytes);
  const expectedSigHex = bytesToHex(expectedSigBytes);

  if (sigHex !== expectedSigHex) {
    throw new Error('INVALID_SIGNATURE: Token signature verification failed');
  }

  const session: TrustedSession = JSON.parse(payloadStr);
  if (session.expiry < Date.now()) {
    throw new Error('EXPIRED_SESSION: Session token has expired');
  }

  return session;
}

// In-memory stores for rate limiting
const rateLimitStore = new Map<string, { count: number; windowStart: number }>();
const MAX_REQUESTS = 5;
const WINDOW_MS = 10000; // 10 seconds

export function checkRateLimit(userId: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const state = rateLimitStore.get(userId);
  if (!state) {
    rateLimitStore.set(userId, { count: 1, windowStart: now });
    return { allowed: true, remaining: MAX_REQUESTS - 1 };
  }
  if (now - state.windowStart > WINDOW_MS) {
    state.count = 1;
    state.windowStart = now;
    return { allowed: true, remaining: MAX_REQUESTS - 1 };
  }
  if (state.count >= MAX_REQUESTS) {
    return { allowed: false, remaining: 0 };
  }
  state.count++;
  return { allowed: true, remaining: MAX_REQUESTS - state.count };
}

export function resetRateLimits(): void {
  rateLimitStore.clear();
}

export async function logAuditEvent(entry: Omit<AuditLogEntry, 'timestamp'>): Promise<void> {
  const { auditLogRepository } = getPersistentRepositories();
  await auditLogRepository.save({
    ...entry,
    timestamp: new Date().toISOString(),
  });
}

export async function getAuditLogs(): Promise<AuditLogEntry[]> {
  const { auditLogRepository } = getPersistentRepositories();
  return auditLogRepository.findAll();
}

export async function clearAuditLogs(): Promise<void> {
  const { auditLogRepository } = getPersistentRepositories();
  await auditLogRepository.clear();
}

export function verifyCsrfToken(session: TrustedSession, csrfHeaderToken: string): void {
  if (!csrfHeaderToken || session.csrfToken !== csrfHeaderToken) {
    throw new Error('CSRF_MISMATCH: Mismatching or missing CSRF token');
  }
}

/**
 * Server boundary handler for privileged domain operations.
 * Resolves CSRF, cryptographic signature, rate-limit, and RBAC policy verification.
 */
export async function executePrivilegedOperation(
  input: DomainOperationInput,
  signedToken: string,
  csrfToken: string,
  correlationId: string
): Promise<ServerResponse> {
  try {
    // 1. Verify token signature and expiry
    const session = verifyToken(signedToken);

    // 2. Verify CSRF match
    verifyCsrfToken(session, csrfToken);

    // 3. Rate limiting check
    const rateLimit = checkRateLimit(session.userId);
    if (!rateLimit.allowed) {
      throw new Error('RATE_LIMIT_EXCEEDED: Too many requests. Rate limit is 5 requests per 10 seconds.');
    }

    // 4. Formulate trusted authorization context derived from the server session
    const trustedAuth = {
      userId: session.userId,
      role: session.role,
      permissions: session.permissions,
    };

    // 5. Invoke the core domain service
    const res = await executeDomainOperation(input, {
      authContext: trustedAuth,
    });

    const success = res.state === 'COMPLETED';

    // 6. Log success or validation/execution failure
    await logAuditEvent({
      correlationId,
      userId: session.userId,
      role: session.role,
      category: input.category,
      operationName: input.operationName,
      idempotencyKey: input.idempotencyKey,
      status: res.state === 'COMPLETED' ? 'SUCCESS' : (res.state as any),
      details: res.error || 'Operation executed successfully.',
    });

    return {
      success,
      correlationId,
      result: res,
      error: res.error,
    };
  } catch (err: any) {
    // Attempt to decode user identity safely from token for audit logging if signature was bad
    let userId = 'unknown';
    let role = 'guest';
    try {
      if (signedToken) {
        const parts = signedToken.split('.');
        const payloadStr = decodeURIComponent(escape(atob(parts[0])));
        const session = JSON.parse(payloadStr);
        userId = session.userId || 'unknown';
        role = session.role || 'guest';
      }
    } catch {}

    const errMsg = err.message || 'Server error';
    await logAuditEvent({
      correlationId,
      userId,
      role,
      category: input.category,
      operationName: input.operationName,
      idempotencyKey: input.idempotencyKey,
      status: 'REJECTED',
      details: errMsg,
    });

    return {
      success: false,
      correlationId,
      error: errMsg,
    };
  }
}
