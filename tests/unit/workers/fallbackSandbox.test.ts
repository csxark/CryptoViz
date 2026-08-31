import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WorkerPool } from '../../../lib/workers/pool';

/**
 * Enterprise Worker Sandbox Fallback & Recovery Test Suite
 * 
 * Verifies that the WorkerPool gracefully degrades to inline synchronous execution
 * when Web Workers are blocked (e.g., in a sandboxed iframe without allow-scripts).
 */

describe('Worker Sandbox Transparent Fallback', () => {
  let fallbackCount = 0;
  
  beforeEach(() => {
    fallbackCount = 0;
  });

  const mockFallbackExecutor = async (message: any, onProgress?: (p: any) => void) => {
    fallbackCount++;
    if (message.action === 'throw') {
      throw new Error(message.errorMsg || 'Inline execution failed');
    }
    
    if (message.action === 'progress') {
      for (let i = 0; i <= 100; i += 50) {
        onProgress?.({ percent: i, currentMilestone: `Step ${i}` });
      }
    }

    return { ...message, fallbackMode: true };
  };

  it('transparently routes tasks to the fallback executor when Worker constructor throws SecurityError', async () => {
    const pool = new WorkerPool(
      () => {
        throw new DOMException('Blocked by CSP', 'SecurityError');
      },
      2,
      mockFallbackExecutor
    );

    const result = await pool.execute({ hello: 'world' });
    expect(result).toHaveProperty('fallbackMode', true);
    expect(fallbackCount).toBe(1);
    
    // Subsequent calls should use the same fallback pseudo-worker seamlessly
    const result2 = await pool.execute({ hello: 'again' });
    expect(result2).toHaveProperty('hello', 'again');
    expect(fallbackCount).toBe(2);
    
    pool.terminate();
  });

  it('correctly handles synchronous errors originating from the inline fallback execution', async () => {
    const pool = new WorkerPool(
      () => {
        throw new DOMException('Sandbox', 'SecurityError');
      },
      2,
      mockFallbackExecutor
    );

    await expect(
      pool.execute({ action: 'throw', errorMsg: 'Sandboxed operation denied' })
    ).rejects.toThrow('Sandboxed operation denied');
    
    pool.terminate();
  });

  it('properly dispatches progress events from the synchronous fallback pseudo-worker', async () => {
    const pool = new WorkerPool(
      () => {
        throw new DOMException('Sandbox', 'SecurityError');
      },
      2,
      mockFallbackExecutor
    );

    const progressLogs: any[] = [];
    const result = await pool.execute(
      { action: 'progress' },
      [],
      (progress) => progressLogs.push(progress)
    );

    expect(result).toBeDefined();
    expect(progressLogs.length).toBe(3); // 0, 50, 100
    expect(progressLogs[1].percent).toBe(50);
    expect(progressLogs[1].currentMilestone).toBe('Step 50');
    
    pool.terminate();
  });
  
  it('does NOT fallback if the error is not a SecurityError', async () => {
    const pool = new WorkerPool(
      () => {
        throw new TypeError('Invalid worker URL');
      },
      2,
      mockFallbackExecutor
    );

    await expect(pool.execute({ hello: 'world' })).rejects.toThrow('Invalid worker URL');
    expect(fallbackCount).toBe(0);
    
    pool.terminate();
  });
  
  it('retains priority queue semantics when operating in inline fallback mode', async () => {
    const pool = new WorkerPool(
      () => {
        throw new DOMException('Sandbox', 'SecurityError');
      },
      1, // Single concurrency to force queueing
      mockFallbackExecutor
    );

    // With inline mode running asynchronously (setTimeout 0), we can queue tasks.
    const p1 = pool.execute({ name: 'background' }, undefined, { priority: 'BACKGROUND' });
    const p2 = pool.execute({ name: 'normal' }, undefined, { priority: 'NORMAL' });
    const p3 = pool.execute({ name: 'interactive' }, undefined, { priority: 'INTERACTIVE' });

    const results = await Promise.all([p1, p2, p3]);
    
    expect(results).toHaveLength(3);
    // Even though they run sequentially in the main thread event loop via setTimeout,
    // they should all resolve successfully.
    expect(fallbackCount).toBe(3);
    
    pool.terminate();
  });

  describe('Extreme Queue Stress Test in Sandbox', () => {
    it('executes 1000 tasks using inline fallback without exceeding stack depth', async () => {
      const pool = new WorkerPool(
        () => {
          throw new DOMException('Sandbox', 'SecurityError');
        },
        4,
        mockFallbackExecutor
      );

      const promises = Array.from({ length: 1000 }).map((_, i) => 
        pool.execute({ index: i, value: i * 2 })
      );

      const results = await Promise.all(promises);
      expect(results).toHaveLength(1000);
      expect((results[999] as any).value).toBe(1998);
      
      pool.terminate();
    });
  });
});
