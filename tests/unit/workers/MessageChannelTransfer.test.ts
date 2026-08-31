import { describe, it, expect } from 'vitest';

describe('MessageChannel Transferable Zero-Copy Transfers', () => {
  it('transfers an ArrayBuffer, zeroing the source buffer on the sending port', async () => {
    return new Promise<void>((resolve) => {
      const channel = new MessageChannel();
      
      const uint8 = new Uint8Array([1, 2, 3, 4, 5]);
      const originalBuffer = uint8.buffer;
      
      channel.port2.onmessage = (event) => {
        const receivedBuffer = event.data as ArrayBuffer;
        
        expect(receivedBuffer.byteLength).toBe(5);
        
        const receivedView = new Uint8Array(receivedBuffer);
        expect(receivedView[0]).toBe(1);
        expect(receivedView[4]).toBe(5);
        
        resolve();
      };

      channel.port1.postMessage(originalBuffer, [originalBuffer]);
    });
  });
});
