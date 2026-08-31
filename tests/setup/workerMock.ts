import { vi } from 'vitest';

/**
 * Enterprise Level Web Worker Mocking Environment
 * 
 * Provides a highly accurate, structuredClone-backed simulation of Web Worker
 * semantics for Vitest environments.
 */

class MockWorker {
  public onmessage: ((this: Worker, ev: MessageEvent) => any) | null = null;
  public onmessageerror: ((this: Worker, ev: MessageEvent) => any) | null = null;
  public onerror: ((this: AbstractWorker, ev: ErrorEvent) => any) | null = null;
  
  private listeners: Map<string, Set<EventListenerOrEventListenerObject>> = new Map();

  constructor(stringUrl: string | URL, options?: WorkerOptions) {
    // In a real environment this would spawn a thread.
    // For testing, we mock the boundary.
  }

  public postMessage(message: any, transferOrOptions?: any): void {
    let transfer: Transferable[] = [];
    if (Array.isArray(transferOrOptions)) {
      transfer = transferOrOptions;
    } else if (transferOrOptions && typeof transferOrOptions === 'object') {
      transfer = transferOrOptions.transfer || [];
    }

    try {
      // The crucial fix for #1730: accurately enforce DataClone validation on all worker messages
      const cloned = structuredClone(message, { transfer });
      
      // Simulate async dispatch
      setTimeout(() => {
        if (this.onmessage) {
          const event = new MessageEvent('message', { data: cloned });
          this.onmessage.call(this as unknown as Worker, event);
        }
        
        const messageListeners = this.listeners.get('message');
        if (messageListeners) {
          const event = new MessageEvent('message', { data: cloned });
          messageListeners.forEach(l => {
            if (typeof l === 'function') l(event);
            else l.handleEvent(event);
          });
        }
      }, 0);
    } catch (error) {
      if (this.onmessageerror) {
        this.onmessageerror.call(this as unknown as Worker, new MessageEvent('messageerror', { data: error }));
      }
      throw error;
    }
  }

  public terminate(): void {
    // No-op for mock
  }

  public addEventListener(type: string, callback: EventListenerOrEventListenerObject | null, options?: AddEventListenerOptions | boolean): void {
    if (!callback) return;
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(callback);
  }

  public removeEventListener(type: string, callback: EventListenerOrEventListenerObject | null, options?: EventListenerOptions | boolean): void {
    if (!callback) return;
    this.listeners.get(type)?.delete(callback);
  }
  
  public dispatchEvent(event: Event): boolean {
    return true; // Stub
  }
}

// Global injection
globalThis.Worker = MockWorker as unknown as typeof Worker;

export { MockWorker };
