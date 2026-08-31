import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

/**
 * MessageChannel Stress Test & Object Graph Fuzzing
 * 
 * Verifies that the custom MockMessagePort used in testing correctly handles 
 * wildly deep and recursive object structures using `structuredClone`, avoiding stack overflows.
 */

describe('MockMessageChannel Extreme Fuzzing', () => {

  it('serializes deeply nested object graphs correctly without Stack Overflow', async () => {
    return new Promise<void>((resolve, reject) => {
      const channel = new MessageChannel();
      
      const MAX_DEPTH = 50;
      let deepObject: any = { level: 0 };
      let current = deepObject;
      for (let i = 1; i < MAX_DEPTH; i++) {
        current.child = { level: i };
        current = current.child;
      }

      channel.port2.onmessage = (event) => {
        try {
          expect(event.data).toEqual(deepObject);
          
          let receivedCurrent = event.data;
          for (let i = 0; i < MAX_DEPTH; i++) {
            expect(receivedCurrent.level).toBe(i);
            receivedCurrent = receivedCurrent.child;
          }
          resolve();
        } catch (e) {
          reject(e);
        }
      };

      channel.port1.postMessage(deepObject);
    });
  });

  it('safely transmits large generated string payloads', async () => {
    return new Promise<void>((resolve, reject) => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 10000, maxLength: 50000 }),
          (largeString) => {
            const channel = new MessageChannel();
            channel.port2.onmessage = (event) => {
              expect(event.data).toBe(largeString);
              resolve();
            };
            channel.port1.postMessage(largeString);
          }
        )
      );
    });
  });

  it('validates structured cloning of Map and Set containing complex objects', async () => {
    return new Promise<void>((resolve, reject) => {
      const channel = new MessageChannel();
      
      const complexMap = new Map();
      complexMap.set('k1', new Set([{ id: 1 }, { id: 2 }]));
      complexMap.set('k2', new Uint32Array([10, 20, 30]));
      
      channel.port2.onmessage = (event) => {
        try {
          const map = event.data;
          expect(map).toBeInstanceOf(Map);
          expect(map.get('k1')).toBeInstanceOf(Set);
          expect(map.get('k1').has(1)).toBe(false); // Map equality preserves instances, but Set.has with object ref will be false
          
          const arr = Array.from(map.get('k1')) as any[];
          expect(arr[0].id).toBe(1);
          expect(arr[1].id).toBe(2);
          
          expect(map.get('k2')).toBeInstanceOf(Uint32Array);
          expect(map.get('k2')[1]).toBe(20);
          resolve();
        } catch (e) {
          reject(e);
        }
      };

      channel.port1.postMessage(complexMap);
    });
  });

  it('properly serializes dates without stringifying', async () => {
    return new Promise<void>((resolve, reject) => {
      fc.assert(
        fc.property(
          fc.date(),
          (randomDate) => {
            const channel = new MessageChannel();
            channel.port2.onmessage = (event) => {
              expect(event.data).toBeInstanceOf(Date);
              expect(event.data.getTime()).toBe(randomDate.getTime());
              resolve();
            };
            channel.port1.postMessage(randomDate);
          }
        )
      );
    });
  });
  
  it('throws DOMException when attempting to clone a Promise', () => {
    const channel = new MessageChannel();
    const badPayload = { promise: Promise.resolve(1) };
    
    expect(() => {
      channel.port1.postMessage(badPayload);
    }).toThrow();
  });
  
  it('throws DOMException when attempting to clone a Symbol', () => {
    const channel = new MessageChannel();
    const badPayload = { sym: Symbol('test') };
    
    expect(() => {
      channel.port1.postMessage(badPayload);
    }).toThrow();
  });
});
