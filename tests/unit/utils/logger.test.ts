import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { logger, redact } from '../../../lib/utils/logger';

describe('Logger Utility with Cryptographic Redaction (#1338)', () => {
  let consoleLogSpy: any;
  let consoleInfoSpy: any;
  let consoleWarnSpy: any;
  let consoleErrorSpy: any;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Standard Logging delegation with redaction', () => {
    it('delegates to console log and redacts inline secrets in strings', () => {
      logger.log('Failed for key = 0xabcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789');
      expect(consoleLogSpy).toHaveBeenCalledWith('Failed for key: [REDACTED]');
    });

    it('delegates to console info and redacts private key PEM structures', () => {
      logger.info('Signing with key -----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC6...\n-----END PRIVATE KEY-----');
      expect(consoleInfoSpy).toHaveBeenCalledWith('Signing with key [REDACTED_PRIVATE_KEY]');
    });

    it('delegates to console warn and redacts high-entropy hex secrets', () => {
      // 64 character hex (32-byte key)
      const hexKey = 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6aa99';
      logger.warn(hexKey);
      expect(consoleWarnSpy).toHaveBeenCalledWith('[REDACTED_HEX_SECRET]');
    });

    it('delegates to console error and redacts objects containing sensitive property names', () => {
      const sensitiveData = {
        requestId: 'req-101',
        algorithmId: 'AES-GCM',
        secret: 'my-super-secret-key-123',
        password: 'password123',
        plaintext: 'This is the decrypted secret message.',
        metadata: {
          private_key: '-----BEGIN PRIVATE KEY-----',
          safeField: 'safeValue',
        },
      };

      logger.error('Failed to decrypt:', sensitiveData);

      const calledArgs = consoleErrorSpy.mock.calls[0];
      expect(calledArgs[0]).toBe('Failed to decrypt:');
      
      const redactedObj = calledArgs[1] as any;
      expect(redactedObj.requestId).toBe('req-101');
      expect(redactedObj.algorithmId).toBe('AES-GCM');
      expect(redactedObj.secret).toBe('[REDACTED]');
      expect(redactedObj.password).toBe('[REDACTED]');
      expect(redactedObj.plaintext).toBe('[REDACTED]');
      expect(redactedObj.metadata.private_key).toBe('[REDACTED]');
      expect(redactedObj.metadata.safeField).toBe('safeValue');
    });
  });

  describe('Structured Telemetry Logging', () => {
    it('structures log entries and automatically redacts telemetry metadata', () => {
      logger.structured({
        requestId: 'req-303',
        jobId: 'job-999',
        algorithmId: 'ML-KEM-768',
        operationType: 'KEYGEN',
        durationMs: 14.5,
        status: 'SUCCESS',
        message: 'Key pair generated successfully',
        metadata: {
          seed: 'my-private-seed-value-xyz', // Sensitive key name
          execution_path: 'lib/workers/cipher.worker.ts',
        },
      });

      const calledArgs = consoleInfoSpy.mock.calls[0];
      expect(calledArgs[0]).toContain('[TELEMETRY] SUCCESS | Job: job-999 | Alg: ML-KEM-768');
      
      const telemetryObj = calledArgs[1] as any;
      expect(telemetryObj.requestId).toBe('req-303');
      expect(telemetryObj.jobId).toBe('job-999');
      expect(telemetryObj.algorithmId).toBe('ML-KEM-768');
      expect(telemetryObj.operationType).toBe('KEYGEN');
      expect(telemetryObj.durationMs).toBe(14.5);
      expect(telemetryObj.status).toBe('SUCCESS');
      expect(telemetryObj.metadata.seed).toBe('[REDACTED]');
      expect(telemetryObj.metadata.execution_path).toBe('lib/workers/cipher.worker.ts');
    });
  });

  describe('Pure Redaction Unit Logic', () => {
    it('properly redacts error objects with secrets in their message', () => {
      const err = new Error('Invalid authentication parameter: password secret123');
      const redactedErr = redact(err) as Error;
      expect(redactedErr.message).toBe('Invalid authentication parameter: password: [REDACTED]');
    });

    it('returns unmodified non-object and safe values', () => {
      expect(redact(42)).toBe(42);
      expect(redact(true)).toBe(true);
      expect(redact('Safe message here')).toBe('Safe message here');
    });
  });
});
