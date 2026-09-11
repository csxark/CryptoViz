import { describe, it, expect } from 'vitest';
import { encrypt, decrypt } from '../../../lib/cipher/hash/hamsi';

describe('Hamsi Hash Function (SHA-3 Finalist)', () => {
  it('should generate consistent hex digests for empty hex input', () => {
    const res1 = encrypt('', '');
    const res2 = encrypt('', '');
    expect(res1.output).toBe(res2.output);
    expect(res1.output.length).toBe(64); // 256-bit output in hex (32 bytes * 2)
  });

  it('should produce distinct digests for different hex inputs', () => {
    const h1 = encrypt('aa', '');
    const h2 = encrypt('bb', '');
    expect(h1.output).not.toBe(h2.output);
  });

  it('should throw ONE_WAY_HASH error on decrypt', () => {
    expect(() => decrypt()).toThrowError(/one-way hash/i);
  });

  it('should handle multi-block input strings without failure', () => {
    const longInput = 'aa'.repeat(128); // 256 hex chars = 128 bytes
    const res = encrypt(longInput, '');
    expect(res.output).toBeDefined();
    expect(res.output.length).toBe(64);
  });

  it('should support 512-bit output when requested', () => {
    const res512 = encrypt('00', '', { outputBits: 512 });
    expect(res512.output.length).toBe(128); // 512-bit output in hex (64 bytes * 2)
  });
});
