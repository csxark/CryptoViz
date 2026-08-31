import { wipeMemory } from '../../lib/security/keyMemWipe';
import { SecureKeyStore } from '../../lib/storage/secureKeyStore';

describe('Memory Wiping & Key Lifecycle', () => {
  it('should zero out the buffer when wipeMemory is called', () => {
    const buffer = new Uint8Array([1, 2, 3, 4, 5]);
    wipeMemory(buffer);
    
    // Check if everything is zeroed out
    for (let i = 0; i < buffer.length; i++) {
      expect(buffer[i]).toBe(0);
    }
  });

  it('should securely store and delete keys from SecureKeyStore', () => {
    const keyData = new Uint8Array([10, 20, 30, 40]);
    SecureKeyStore.set('test-key', keyData, 5000); // 5 seconds ttl
    
    const retrieved = SecureKeyStore.get('test-key');
    expect(retrieved).not.toBeNull();
    expect(retrieved?.[0]).toBe(10);
    
    SecureKeyStore.delete('test-key');
    const afterDelete = SecureKeyStore.get('test-key');
    expect(afterDelete).toBeNull();
  });

  it('automatically zeroizes and evicts expired keys via background TTL timer (#1716)', async () => {
    const keyData = new Uint8Array([55, 66, 77, 88]);
    SecureKeyStore.set('ephemeral-key', keyData, 50); // 50ms TTL

    // Key is present initially
    expect(SecureKeyStore.get('ephemeral-key')).not.toBeNull();

    // Wait for TTL timer to fire automatically without calling get()
    await new Promise((resolve) => setTimeout(resolve, 90));

    // Entry must be evicted automatically
    expect(SecureKeyStore.get('ephemeral-key')).toBeNull();
  });

  it('sweeps expired keys manually via sweepExpiredKeys() (#1716)', () => {
    SecureKeyStore.clear();
    const keyData = new Uint8Array([1, 2, 3, 4]);
    // Set with negative TTL so it is expired immediately without waiting for timer
    SecureKeyStore.set('immediate-expire-key', keyData, -10);

    const sweptCount = SecureKeyStore.sweepExpiredKeys();
    expect(sweptCount).toBe(1);
    expect(SecureKeyStore.get('immediate-expire-key')).toBeNull();

    SecureKeyStore.clear();
  });
});
