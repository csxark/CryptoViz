import { describe, it, expect, vi } from 'vitest';
import fc from 'fast-check';

/**
 * Advanced MessagePort & Transferable Types Fuzzing
 * 
 * Verifies that the Web Worker postMessage mock properly evaluates 
 * transferables and zero-copy byte arrays.
 */

const mockPostMessageWithClone = (data: any, transferables?: Transferable[]) => {
  // Validate that all transferables are actually array buffers or message ports
  if (transferables) {
    for (const t of transferables) {
      if (!(t instanceof ArrayBuffer) && !(t instanceof MessagePort)) {
        throw new Error('Invalid Transferable object');
      }
    }
  }

  try {
    return structuredClone(data);
  } catch (error: any) {
    throw new Error(`DataCloneError: ${error.message}`);
  }
};

describe('Transferable and Shared Memory Payloads', () => {
  
  it('safely serializes zero-copy ArrayBuffer payloads without destroying the buffer (mock context)', () => {
    fc.assert(
      fc.property(
        fc.uint8Array({ minLength: 1024, maxLength: 8192 }),
        (binaryData) => {
          const buffer = binaryData.buffer;
          const payload = {
            type: 'FILE_STREAM',
            chunk: buffer
          };

          const cloned = mockPostMessageWithClone(payload, [buffer]);
          expect(cloned.chunk).toBeInstanceOf(ArrayBuffer);
          
          // In actual browsers, transferring the buffer empties it on the main thread,
          // but for our test mock, structuredClone duplicates it, giving us an isolated instance
          const clonedView = new Uint8Array(cloned.chunk as ArrayBuffer);
          expect(clonedView).toEqual(new Uint8Array(buffer));
        }
      )
    );
  });
  
  it('throws on unsupported transferables', () => {
    const maliciousPayload = {
      buffer: new Uint8Array([1, 2, 3]).buffer
    };
    
    expect(() => {
      // Intentionally pass a non-transferable (plain object) in the transferables array
      mockPostMessageWithClone(maliciousPayload, [{ invalid: true } as any]);
    }).toThrow('Invalid Transferable object');
  });

  describe('Complex Composite Message Passing', () => {
    it('serializes highly heterogeneous nested states', () => {
      fc.assert(
        fc.property(
          fc.record({
            id: fc.uuid(),
            timeline: fc.array(fc.record({
              time: fc.date(),
              event: fc.string(),
              delta: fc.float()
            })),
            matrix: fc.array(fc.array(fc.integer())),
            flags: fc.dictionary(fc.string(), fc.boolean())
          }),
          (complexState) => {
            const cloned = mockPostMessageWithClone(complexState);
            expect(cloned).toEqual(complexState);
          }
        )
      );
    });
  });
});
