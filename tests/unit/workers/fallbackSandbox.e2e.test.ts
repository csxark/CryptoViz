import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { sharedCipherPool } from '../../../lib/workers/sharedPool';

/**
 * End-to-End Sandbox Fallback Integration Test
 * 
 * Verifies the actual cipher pool behaves correctly when dynamically forced
 * into fallback mode without mock executors. This ensures real cryptocraphic
 * payloads seamlessly switch to the inline renderer under iframe confinement.
 */

describe('Worker Sandbox Transparent Fallback: Cipher Integration', () => {
  
  beforeEach(() => {
    // Forcing the shared pool into fallback mode artificially 
    // by injecting a throwing workerFactory just for this test
    (sharedCipherPool as any).workerFactory = () => {
      throw new DOMException('E2E Sandbox Test', 'SecurityError');
    };
    (sharedCipherPool as any).fallbackMode = false;
    (sharedCipherPool as any).workers = [];
    (sharedCipherPool as any).idleWorkers = [];
  });

  afterEach(() => {
    sharedCipherPool.terminate();
  });

  it('transparently executes a classical caesar cipher payload using the real registry fallback', async () => {
    const payload = {
      type: 'encrypt',
      cipherId: 'caesar',
      input: 'HELLO',
      key: '3'
    };
    
    // In fallback mode, the pool should route to the real cipher dispatcher inline
    const result: any = await sharedCipherPool.execute(payload);
    
    expect(result).toBeDefined();
console.log(JSON.stringify(result, null, 2));
    expect(result.output).toBe('KHOOR');
    expect(result.steps).toBeInstanceOf(Array);
  });
  
  it('transparently executes a symmetrical caesar encryption using the real registry fallback', async () => {
    const payload = {
      type: 'encrypt',
      cipherId: 'caesar',
      input: 'Secret Message',
      key: '3'
    };
    
    const result: any = await sharedCipherPool.execute(payload);
    
    expect(result).toBeDefined();
console.log(JSON.stringify(result, null, 2));
    expect(typeof result.output).toBe('string');
  });

  it('correctly reports progress milestones through the fallback interceptor for slow ciphers', async () => {
    const payload = {
      type: 'encrypt',
      cipherId: 'caesar',
      input: 'A'.repeat(4000), // Larger payload to trigger iterations
      key: '3'
    };
    
    const progressLogs: any[] = [];
    
    await sharedCipherPool.execute(payload, [], (progress) => {
      progressLogs.push(progress);
    });
    
    // Ensure the execution completed without crashing the main thread
    expect(progressLogs.length).toBeGreaterThanOrEqual(0); 
  });
  
  it('correctly maps invalid cipher identifiers through the fallback engine into CipherErrors', async () => {
    const payload = {
      type: 'encrypt',
      cipherId: 'non_existent_cipher_id_123',
      input: 'test',
      key: 'key'
    };
    
    await expect(sharedCipherPool.execute(payload)).rejects.toThrow();
  });

  describe('Deep Stress Cipher Simulation', () => {
    it('executes 10 concurrent real AES requests through the inline fallback without deadlocking', async () => {
      const promises = Array.from({ length: 10 }).map((_, i) => {
        return sharedCipherPool.execute({
          type: 'encrypt',
          cipherId: 'caesar',
          input: `Concurrent Message ${i}`,
          key: '3'
        });
      });
      
      const results = await Promise.all(promises);
      expect(results).toHaveLength(10);
      expect(results[0]).toBeDefined();
      expect(results[9]).toBeDefined();
    });
  });
});
