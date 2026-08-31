import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

/**
 * Enterprise Structured Clone Serialization Test Suite
 * 
 * Ensures all data passed between the main thread and Web Workers can be safely serialized
 * without throwing DOMExceptions (DataCloneError).
 */

const serializeAndDeserialize = <T>(data: T): T => {
  try {
    return structuredClone(data);
  } catch (error: any) {
    throw new Error(`Serialization failed: ${error.message} on object: ${JSON.stringify(data)}`);
  }
};

describe('Worker Payload Serialization Boundaries', () => {

  it('serializes standard primitive payloads safely', () => {
    fc.assert(
      fc.property(
        fc.record({
          type: fc.constant('EXECUTE'),
          requestId: fc.uuid(),
          payload: fc.record({
            type: fc.constantFrom('encrypt', 'decrypt'),
            cipherId: fc.string(),
            input: fc.string(),
            key: fc.string(),
            options: fc.dictionary(fc.string(), fc.oneof(fc.string(), fc.integer(), fc.boolean()))
          })
        }),
        (mockPayload) => {
          const cloned = serializeAndDeserialize(mockPayload);
          expect(cloned).toEqual(mockPayload);
        }
      )
    );
  });

  it('rejects payloads containing functions (simulating DOMException)', () => {
    const maliciousPayload = {
      action: 'encrypt',
      callback: () => console.log('This should crash serialization')
    };
    
    expect(() => serializeAndDeserialize(maliciousPayload)).toThrow(/Serialization failed/);
  });

  describe('Algorithm Specific Payload Serialization Fuzzing', () => {
    // Fuzz AES payload requirements
    it('serializes AES payloads', () => {
      fc.assert(
        fc.property(
          fc.record({
            cipherId: fc.constant('aes'),
            key: fc.string({ minLength: 64, maxLength: 64 }), // AES-256
            input: fc.string(),
            options: fc.record({
              mode: fc.constantFrom('CBC', 'GCM', 'ECB', 'CTR'),
              iv: fc.string({ minLength: 32, maxLength: 32 }),
              tagLength: fc.integer({ min: 12, max: 16 })
            })
          }),
          (aesPayload) => {
            const result = serializeAndDeserialize(aesPayload);
            expect(result).toEqual(aesPayload);
          }
        )
      );
    });

    // Fuzz RSA payload requirements
    it('serializes RSA payloads with ArrayBuffers', () => {
      fc.assert(
        fc.property(
          fc.record({
            cipherId: fc.constant('rsa'),
            key: fc.string(), // PEM string
            input: fc.uint8Array(),
            options: fc.record({
              padding: fc.constantFrom('PKCS1', 'OAEP', 'PSS'),
              hash: fc.constantFrom('SHA-256', 'SHA-512')
            })
          }),
          (rsaPayload) => {
            const result = serializeAndDeserialize(rsaPayload);
            expect(result.cipherId).toBe(rsaPayload.cipherId);
          }
        )
      );
    });
    
    // Fuzz Quantum Safe ML-KEM payloads
    it('serializes ML-KEM post-quantum payloads safely', () => {
      fc.assert(
        fc.property(
          fc.record({
            cipherId: fc.constant('ml-kem'),
            action: fc.constantFrom('encapsulate', 'decapsulate'),
            key: fc.uint8Array({ minLength: 800, maxLength: 1632 }), 
            input: fc.oneof(fc.uint8Array(), fc.constant(new Uint8Array())),
            options: fc.record({
              variant: fc.constantFrom('ML-KEM-512', 'ML-KEM-768', 'ML-KEM-1024')
            })
          }),
          (kemPayload) => {
            const result = serializeAndDeserialize(kemPayload);
            expect(result.key.byteLength).toBe(kemPayload.key.byteLength);
            expect(result.options.variant).toBe(kemPayload.options.variant);
          }
        )
      );
    });
  });

  describe('Deep Nesting & Self-Referencing Guardrails', () => {
    it('handles deeply nested arrays natively', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.array(
              fc.array(
                fc.string()
              )
            )
          ),
          (nestedArray) => {
            const result = serializeAndDeserialize(nestedArray);
            expect(result).toEqual(nestedArray);
          }
        )
      );
    });

    it('successfully clones self-referencing DAG state graphs used in crypto pipelines', () => {
      // Create a cyclic reference
      const nodeA: any = { id: 'A' };
      const nodeB: any = { id: 'B' };
      nodeA.next = nodeB;
      nodeB.prev = nodeA;

      const result = serializeAndDeserialize(nodeA);
      expect(result.next.prev.id).toBe('A'); // Structural identity maintained
    });
  });
  
  describe('Complex Error Passing Across Thread Boundaries', () => {
    it('serializes standard Error objects properly', () => {
      const err = new Error('Out of bounds cipher rounds');
      const cloned = serializeAndDeserialize(err);
      
      // structuredClone preserves Error objects
      expect(cloned).toBeInstanceOf(Error);
      expect(cloned.message).toBe('Out of bounds cipher rounds');
      expect(cloned.stack).toBe(err.stack);
    });

    it('serializes aggregated custom CipherError payload representations', () => {
      fc.assert(
        fc.property(
          fc.record({
            success: fc.constant(false),
            error: fc.string(),
            code: fc.constantFrom('ALGORITHM_UNSUPPORTED', 'INVALID_KEY', 'DECRYPTION_FAILED'),
            stackTrace: fc.string(),
            metadata: fc.dictionary(fc.string(), fc.string())
          }),
          (errorPayload) => {
            const result = serializeAndDeserialize(errorPayload);
            expect(result).toEqual(errorPayload);
          }
        )
      );
    });
  });
});
