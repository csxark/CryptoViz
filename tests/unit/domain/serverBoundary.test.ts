import { describe, it, expect, beforeEach } from 'vitest';
import {
  signToken,
  verifyToken,
  executePrivilegedOperation,
  getAuditLogs,
  clearAuditLogs,
  resetRateLimits,
  TrustedSession,
} from '../../../lib/domain/serverBoundary';
import { globalIdempotencyStore } from '../../../lib/domain/domainOperationState';

describe('Server-Side Security Boundary (#1316)', () => {
  beforeEach(async () => {
    await clearAuditLogs();
    resetRateLimits();
    await globalIdempotencyStore.clear();
  });

  const validSession: TrustedSession = {
    userId: 'usr_sec_99',
    role: 'admin',
    permissions: ['*'],
    expiry: Date.now() + 100000,
    csrfToken: 'csrf_secret_token_123',
  };

  const operatorSession: TrustedSession = {
    userId: 'usr_op_02',
    role: 'operator',
    permissions: ['domain:custody:write'],
    expiry: Date.now() + 100000,
    csrfToken: 'csrf_secret_token_123',
  };

  const guestSession: TrustedSession = {
    userId: 'usr_guest_03',
    role: 'guest',
    permissions: [],
    expiry: Date.now() + 100000,
    csrfToken: 'csrf_secret_token_123',
  };

  describe('Session Token Sign & Verify', () => {
    it('signs and verifies valid session tokens successfully', () => {
      const token = signToken(validSession);
      const verified = verifyToken(token);
      expect(verified.userId).toBe(validSession.userId);
      expect(verified.role).toBe(validSession.role);
    });

    it('rejects tampered token signatures', () => {
      const token = signToken(validSession);
      // Alter the signature hash suffix
      const tamperedToken = token.slice(0, -5) + '00000';
      expect(() => verifyToken(tamperedToken)).toThrow('INVALID_SIGNATURE');
    });

    it('rejects tampered token payloads', () => {
      const token = signToken(guestSession);
      const [payloadB64, sig] = token.split('.');

      // Decode payload, modify role to admin, encode back, keep same signature
      const payloadStr = decodeURIComponent(escape(atob(payloadB64)));
      const payload = JSON.parse(payloadStr);
      payload.role = 'admin'; // Privilege escalation attempt
      const newPayloadB64 = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));

      const tamperedToken = `${newPayloadB64}.${sig}`;
      expect(() => verifyToken(tamperedToken)).toThrow('INVALID_SIGNATURE');
    });

    it('rejects expired session tokens', () => {
      const expiredSession: TrustedSession = {
        ...validSession,
        expiry: Date.now() - 1000, // Expired 1 second ago
      };
      const token = signToken(expiredSession);
      expect(() => verifyToken(token)).toThrow('EXPIRED_SESSION');
    });
  });

  describe('CSRF Validation', () => {
    it('rejects requests with missing or mismatched CSRF tokens', async () => {
      const token = signToken(validSession);
      const response = await executePrivilegedOperation(
        {
          category: 'custody',
          operationName: 'Vault Withdrawal',
          payload: { asset: 'BTC', amount: 1, destinationAddress: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F' },
          idempotencyKey: 'idem-csrf-001',
          isSimulation: true,
        },
        token,
        'wrong_csrf_token', // mismatched CSRF
        'req_corr_001'
      );

      expect(response.success).toBe(false);
      expect(response.error).toContain('CSRF_MISMATCH');

      const logs = await getAuditLogs();
      expect(logs.length).toBe(1);
      expect(logs[0].status).toBe('REJECTED');
      expect(logs[0].details).toContain('CSRF_MISMATCH');
    });
  });

  describe('Rate Limiting Guard', () => {
    it('blocks subsequent requests if they exceed limit (max 5 in 10s)', async () => {
      const token = signToken(validSession);
      const input = {
        category: 'custody',
        operationName: 'Vault Withdrawal',
        payload: { asset: 'BTC', amount: 1, destinationAddress: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F' },
        isSimulation: true,
      };

      // Execute 5 allowed operations
      for (let i = 0; i < 5; i++) {
        const response = await executePrivilegedOperation(
          { ...input, idempotencyKey: `idem-rl-${i}` },
          token,
          validSession.csrfToken,
          `req_corr_rl_${i}`
        );
        expect(response.success).toBe(true);
      }

      // 6th operation should be rate-limited
      const rateLimitedResponse = await executePrivilegedOperation(
        { ...input, idempotencyKey: 'idem-rl-6' },
        token,
        validSession.csrfToken,
        'req_corr_rl_6'
      );

      expect(rateLimitedResponse.success).toBe(false);
      expect(rateLimitedResponse.error).toContain('RATE_LIMIT_EXCEEDED');

      const logs = await getAuditLogs();
      expect(logs[0].status).toBe('REJECTED');
      expect(logs[0].details.toLowerCase()).toContain('rate limit');
    });
  });

  describe('Role-Based Access Control & Auditing', () => {
    it('enforces RBAC on privileged operations', async () => {
      const guestToken = signToken(guestSession);
      const response = await executePrivilegedOperation(
        {
          category: 'custody',
          operationName: 'Withdrawal',
          payload: { asset: 'BTC', amount: 1, destinationAddress: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F' },
          idempotencyKey: 'idem-rbac-001',
          isSimulation: true,
        },
        guestToken,
        guestSession.csrfToken,
        'req_corr_rbac_001'
      );

      expect(response.success).toBe(false);
      expect(response.error).toContain('Insufficient privileges');

      const logs = await getAuditLogs();
      expect(logs.length).toBe(1);
      expect(logs[0].role).toBe('guest');
      expect(logs[0].status).toBe('REJECTED');
      expect(logs[0].details).toContain('Insufficient privileges');
    });

    it('successfully processes authorized admin transactions and logs details', async () => {
      const adminToken = signToken(validSession);
      const response = await executePrivilegedOperation(
        {
          category: 'custody',
          operationName: 'Vault Withdrawal',
          payload: { asset: 'BTC', amount: 1.5, destinationAddress: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F' },
          idempotencyKey: 'idem-admin-001',
          isSimulation: true,
        },
        adminToken,
        validSession.csrfToken,
        'req_corr_admin_001'
      );

      expect(response.success).toBe(true);
      expect(response.result?.state).toBe('COMPLETED');

      const logs = await getAuditLogs();
      expect(logs.length).toBe(1);
      expect(logs[0].role).toBe('admin');
      expect(logs[0].status).toBe('SUCCESS');
      expect(logs[0].correlationId).toBe('req_corr_admin_001');
    });
  });
});
