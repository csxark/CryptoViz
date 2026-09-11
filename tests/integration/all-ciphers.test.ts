import { describe, it, expect } from 'vitest';
import { CIPHER_REGISTRY } from '@/lib/cipher/registry';

describe('all-ciphers integration overview', () => {
  it('registry has all registered ciphers', () => {
    expect(CIPHER_REGISTRY.length).toBeGreaterThan(50);
  });

  it('all registered ciphers have unique IDs', () => {
    const ids = CIPHER_REGISTRY.map((c) => c.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });
});
