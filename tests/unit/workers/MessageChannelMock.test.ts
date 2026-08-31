import { describe, it, expect, vi } from 'vitest';

/**
 * Enterprise MessageChannel & MessagePort Mock Simulation
 * 
 * Accurately simulates dual-port communication via the MessageChannel API,
 * ensuring all data passed between ports is strictly serialized via structuredClone
 * to replicate exact DOMException boundaries in Node.js/Vitest.
 */

class MockMessagePort implements MessagePort {
  public onmessage: ((this: MessagePort, ev: MessageEvent) => any) | null = null;
  public onmessageerror: ((this: MessagePort, ev: MessageEvent) => any) | null = null;
  
  private targetPort: MockMessagePort | null = null;
  private listeners: Map<string, Set<EventListenerOrEventListenerObject>> = new Map();
  private started = false;

  // Internal connection setup
  public _connect(target: MockMessagePort) {
    this.targetPort = target;
  }

  public start(): void {
    this.started = true;
  }

  public close(): void {
    this.started = false;
  }

  public postMessage(message: any, transferOrOptions?: any): void {
    if (!this.targetPort) {
      throw new Error("MessagePort is not connected");
    }

    let transfer: Transferable[] = [];
    if (Array.isArray(transferOrOptions)) {
      transfer = transferOrOptions;
    } else if (transferOrOptions && typeof transferOrOptions === 'object') {
      transfer = transferOrOptions.transfer || [];
    }

    try {
      // Issue #1730 Fix Boundary: enforce structural cloning for MessagePorts
      const cloned = structuredClone(message, { transfer });
      
      // Async dispatch to target
      setTimeout(() => {
        if (this.targetPort?.started) {
          if (this.targetPort.onmessage) {
            this.targetPort.onmessage(new MessageEvent('message', { data: cloned }));
          }
          
          const messageListeners = this.targetPort.listeners.get('message');
          if (messageListeners) {
            const event = new MessageEvent('message', { data: cloned });
            messageListeners.forEach(l => {
              if (typeof l === 'function') l(event);
              else l.handleEvent(event);
            });
          }
        }
      }, 0);
    } catch (error) {
      if (this.onmessageerror) {
        this.onmessageerror(new MessageEvent('messageerror', { data: error }));
      }
      throw error;
    }
  }

  public addEventListener(type: string, callback: EventListenerOrEventListenerObject | null): void {
    if (!callback) return;
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(callback);
    
    // Implicit start if 'message' event listener is added
    if (type === 'message') {
      this.start();
    }
  }

  public removeEventListener(type: string, callback: EventListenerOrEventListenerObject | null): void {
    if (!callback) return;
    this.listeners.get(type)?.delete(callback);
  }
  
  public dispatchEvent(event: Event): boolean {
    return true; // Stub
  }
}

class MockMessageChannel implements MessageChannel {
  public port1: MessagePort;
  public port2: MessagePort;

  constructor() {
    const p1 = new MockMessagePort();
    const p2 = new MockMessagePort();
    
    p1._connect(p2);
    p2._connect(p1);
    
    this.port1 = p1;
    this.port2 = p2;
  }
}

globalThis.MessageChannel = MockMessageChannel as unknown as typeof MessageChannel;
globalThis.MessagePort = MockMessagePort as unknown as typeof MessagePort;

describe('MockMessageChannel Serialization Enforcement', () => {
  it('instantiates dual linked ports', () => {
    const channel = new MessageChannel();
    expect(channel.port1).toBeDefined();
    expect(channel.port2).toBeDefined();
  });

  it('serializes data sent between ports using structuredClone', async () => {
    return new Promise<void>((resolve) => {
      const channel = new MessageChannel();
      
      const payload = { nested: { array: [1, 2, Uint8Array.from([3, 4])] } };
      
      channel.port2.onmessage = (event) => {
        // Assert deep equality
        expect(event.data).toEqual(payload);
        
        // Assert referential inequality (verifying clone)
        expect(event.data).not.toBe(payload);
        expect(event.data.nested.array[2]).toBeInstanceOf(Uint8Array);
        resolve();
      };
      
      channel.port1.postMessage(payload);
    });
  });

  it('throws DOMException on non-serializable port data', () => {
    const channel = new MessageChannel();
    const badPayload = { func: () => {} };
    
    expect(() => {
      channel.port1.postMessage(badPayload);
    }).toThrow();
  });
});
