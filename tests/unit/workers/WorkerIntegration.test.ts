import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MockWorker } from '../../setup/workerMock';

describe('Worker Integration & Structured Clone', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.Worker = MockWorker as unknown as typeof Worker;
  });

  it('worker throws correctly on non-serializable objects', () => {
    const worker = new Worker('dummy.js');
    expect(() => {
      worker.postMessage({ a: () => {} });
    }).toThrow();
  });

  it('worker communicates bidirectionally preserving types', async () => {
    return new Promise<void>((resolve) => {
      const worker = new Worker('dummy.js');
      
      const payload = {
        buffer: new Uint8Array([1, 2, 3]).buffer,
        map: new Map([['key', 'value']]),
        set: new Set([1, 2, 3]),
        regex: /test/gi
      };

      // Mock worker processing
      worker.onmessage = (event) => {
        expect(event.data.buffer).toBeInstanceOf(ArrayBuffer);
        expect(event.data.map).toBeInstanceOf(Map);
        expect(event.data.map.get('key')).toBe('value');
        expect(event.data.set).toBeInstanceOf(Set);
        expect(event.data.set.has(2)).toBe(true);
        expect(event.data.regex).toBeInstanceOf(RegExp);
        
        resolve();
      };

      worker.postMessage(payload);
    });
  });

  it('maintains Error object stack traces across worker boundaries', async () => {
    return new Promise<void>((resolve) => {
      const worker = new Worker('dummy.js');
      const err = new TypeError('Invalid cipher parameters');

      worker.onmessage = (event) => {
        expect(event.data).toBeInstanceOf(TypeError);
        expect(event.data.message).toBe('Invalid cipher parameters');
        resolve();
      };

      worker.postMessage(err);
    });
  });
  
  it('supports transferring array buffers', async () => {
    return new Promise<void>((resolve) => {
      const worker = new Worker('dummy.js');
      const uint8 = new Uint8Array([10, 20, 30, 40]);
      
      worker.onmessage = (event) => {
        const received = new Uint8Array(event.data as ArrayBuffer);
        expect(received[2]).toBe(30);
        resolve();
      };

      // Transfer the buffer
      worker.postMessage(uint8.buffer, [uint8.buffer]);
    });
  });
  
  it('simulates worker event listeners properly', async () => {
    return new Promise<void>((resolve) => {
      const worker = new Worker('dummy.js');
      const payload = { test: true };
      
      worker.addEventListener('message', (event: any) => {
        expect(event.data).toEqual(payload);
        resolve();
      });

      worker.postMessage(payload);
    });
  });
});
