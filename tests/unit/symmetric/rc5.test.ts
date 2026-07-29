import { describe, it, expect } from 'vitest';
import { encrypt, decrypt, TEST_VECTORS } from '../../../lib/cipher/symmetric/rc5';
import { CipherError } from '../../../lib/utils/errors';

describe('RC5-32/12/16', () => {
  it('matches the published KAT vector and round-trips', () => {
    const v = TEST_VECTORS[0];
    const enc = encrypt(v.input, v.key);
    expect(enc.output).toBe(v.expected);
    expect(decrypt(enc.output, v.key).output).toBe(v.input);
  });

  it('throws INPUT_REQUIRED on empty input', () => {
    expect(() => encrypt('', '00'.repeat(16))).toThrowError(CipherError);
  });

  it('throws INPUT_TOO_LONG above 4096 bytes', () => {
    expect(() => encrypt('00'.repeat(4100), '00'.repeat(16))).toThrowError(CipherError);
  });

  it('throws INVALID_KEY for wrong key size', () => {
    expect(() => encrypt('00'.repeat(8), '00'.repeat(8))).toThrowError(CipherError);
  });
});
