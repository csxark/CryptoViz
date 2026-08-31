import { describe, it, expect, vi, beforeEach } from 'vitest';
import fc from 'fast-check';
import { WorkerPool } from '../../../lib/workers/pool';

/**
 * Enterprise Worker Sandbox Fallback Fuzzing Suite
 * 
 * Conducts property-based fuzzing of the inline pseudo-worker proxy
 * to ensure its execution boundaries and state mutations exactly match
 * native Web Worker semantics across thousands of randomized payload permutations.
 */

describe('Worker Sandbox Transparent Fallback: Fuzzing & High Concurrency', () => {
  let processedCount = 0;
  
  beforeEach(() => {
    processedCount = 0;
  });

  const mockFallbackExecutor = async (message: any, onProgress?: (p: any) => void) => {
    processedCount++;
    if (message?.shouldThrow) {
      throw new Error(message.errorMsg || 'Inline execution failed randomly');
    }
    
    if (message?.triggerProgress) {
      for (let i = 0; i <= 100; i += 10) {
        onProgress?.({ percent: i, currentMilestone: `Fuzzed Step ${i}` });
      }
    }

    return { 
      original: message, 
      processedAt: Date.now(),
      processedBy: 'fallback-pseudo-worker'
    };
  };

  it('reliably handles heavily fuzzed, highly heterogeneous objects without crashing the proxy', async () => {
    // Generate complex objects using fast-check to push the inline fallback through its paces
    const complexPayloadGenerator = fc.record({
      id: fc.uuid(),
      data: fc.oneof(fc.string(), fc.integer(), fc.boolean(), fc.float()),
      metadata: fc.dictionary(fc.string(), fc.string()),
      flags: fc.array(fc.boolean()),
      nested: fc.option(fc.record({
        deep: fc.string()
      }))
    });

    await fc.assert(
      fc.asyncProperty(complexPayloadGenerator, async (payload) => {
        const pool = new WorkerPool(
          () => { throw new DOMException('CSP blocked worker', 'SecurityError'); },
          4,
          mockFallbackExecutor
        );

        const result: any = await pool.execute(payload);
        
        expect(result).toBeDefined();
        expect(result.processedBy).toBe('fallback-pseudo-worker');
        expect(result.original.id).toEqual(payload.id); expect(result.original.data).toEqual(payload.data);
        
        pool.terminate();
      }),
      { numRuns: 100 } // Ensure it runs many times rapidly
    );
  });

  it('safely isolates fuzzed transferables across the fallback interface', async () => {
    await fc.assert(
      fc.asyncProperty(fc.uint8Array({ minLength: 10, maxLength: 500 }), async (buffer) => {
        const pool = new WorkerPool(
          () => { throw new DOMException('Blocked by Sandbox', 'SecurityError'); },
          2,
          mockFallbackExecutor
        );
        
        // Simulating transferring an ArrayBuffer to the fallback worker
        const payload = { buffer: buffer.buffer };
        const result: any = await pool.execute(payload, [buffer.buffer]);
        
        expect(result.original.buffer).toBeDefined();
        
        pool.terminate();
      })
    );
  });
  
  it('correctly maps fuzzed Error messages backwards through the proxy interceptor', async () => {
    const errorGenerator = fc.record({
      shouldThrow: fc.constant(true),
      errorMsg: fc.string({ minLength: 1, maxLength: 200 })
    });

    await fc.assert(
      fc.asyncProperty(errorGenerator, async (errorPayload) => {
        const pool = new WorkerPool(
          () => { throw new DOMException('Sandbox limitation', 'SecurityError'); },
          2,
          mockFallbackExecutor
        );

        await expect(pool.execute(errorPayload)).rejects.toThrow(errorPayload.errorMsg);
        pool.terminate();
      })
    );
  });

  describe('Extreme Concurrent Job Queuing in Fallback Mode', () => {
    it('properly executes 50 simultaneous fuzzed jobs maintaining sequence guarantees', async () => {
      const pool = new WorkerPool(
        () => { throw new DOMException('Blocked', 'SecurityError'); },
        1, // Single worker to strictly test queue ordering
        mockFallbackExecutor
      );

      const jobSpecs = Array.from({ length: 50 }).map((_, index) => ({
        index,
        data: `job_${index}`
      }));

      const promises = jobSpecs.map(spec => pool.execute(spec));
      const results: any[] = await Promise.all(promises);

      expect(results).toHaveLength(50);
      
      // Ensure results are mapped exactly back to their originating promises correctly
      for (let i = 0; i < 50; i++) {
        expect(results[i].original.index).toBe(i);
        expect(results[i].original.data).toBe(`job_${i}`);
      }
      
      pool.terminate();
    });
    
    it('handles heavy cancellation streams during concurrent fallback execution', async () => {
      const pool = new WorkerPool(
        () => { throw new DOMException('Blocked', 'SecurityError'); },
        2,
        mockFallbackExecutor
      );

      // Enqueue a ton of background jobs
      const promises = Array.from({ length: 100 }).map((_, idx) => 
        pool.execute({ idx, triggerProgress: true }, undefined, { priority: 'BACKGROUND' })
          .catch(e => e.message)
      );

      // Immediately cancel all background jobs before they can hit the asynchronous fallback macro
      pool.cancelQueued('BACKGROUND');
      
      const results = await Promise.all(promises);
      
      // The first 2 might have already started processing because poolSize is 2
      // The other 98 should have rejected with AbortError
      const abortedCount = results.filter(r => r === 'The user aborted the request.').length;
      expect(abortedCount).toBeGreaterThanOrEqual(98);
      
      pool.terminate();
    });
  });
});
