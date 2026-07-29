import { describe, it, expect } from 'vitest';
import { encrypt, decrypt, TEST_VECTORS } from '../../../lib/cipher/hash/poly1305';
import { CipherError } from '../../../lib/utils/errors';

describe('Poly1305 MAC', () => {
  it('matches the RFC 8439 test vector', () => {
    const v = TEST_VECTORS[0];
    const result = encrypt(v.input, v.key, { encoding: 'hex' } as any);
    expect(result.output).toBe(v.expected);
  });

  it('rejects a tampered message', () => {
    const v = TEST_VECTORS[0];
    const result = encrypt(v.input, v.key, { encoding: 'hex' } as any);
    
    // Tamper with the hex input (flip a bit in the first byte)
    const tamperedInput = (parseInt(v.input.slice(0, 2), 16) ^ 1).toString(16).padStart(2, '0') + v.input.slice(2);
    const tamperedResult = encrypt(tamperedInput, v.key, { encoding: 'hex' } as any);
    
    expect(tamperedResult.output).not.toBe(result.output);
  });

  it('throws INPUT_REQUIRED on empty message', () => {
    const key = '0'.repeat(64);
    expect(() => encrypt('', key)).toThrowError(CipherError);
  });

  it('throws INPUT_TOO_LONG above 4096 bytes', () => {
    const key = '0'.repeat(64);
    const longInput = '00'.repeat(4097);
    expect(() => encrypt(longInput, key, { encoding: 'hex' } as any)).toThrowError(CipherError);
  });

  it('throws on decrypt', () => {
    expect(() => decrypt()).toThrowError(CipherError);
  });
});
