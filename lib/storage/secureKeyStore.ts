import { wipeMemory } from '../security/keyMemWipe';

interface StoreEntry {
  data: Uint8Array;
  expiry: number;
  timer?: ReturnType<typeof setTimeout>;
}

export class SecureKeyStore {
  private static store: Map<string, StoreEntry> = new Map();

  static set(id: string, keyBuffer: Uint8Array, ttlMs: number): void {
    if (this.store.has(id)) {
      this.delete(id);
    }

    const data = new Uint8Array(keyBuffer);
    const expiry = Date.now() + ttlMs;

    const timer = setTimeout(() => {
      if (this.store.has(id)) {
        this.delete(id);
      }
    }, Math.max(0, ttlMs));

    if (timer && typeof timer === 'object' && typeof (timer as { unref?: () => void }).unref === 'function') {
      (timer as { unref: () => void }).unref();
    }

    this.store.set(id, { data, expiry, timer });
  }

  static get(id: string): Uint8Array | null {
    const entry = this.store.get(id);
    if (!entry) return null;
    if (Date.now() > entry.expiry) {
      this.delete(id);
      return null;
    }
    return new Uint8Array(entry.data);
  }

  static delete(id: string): void {
    const entry = this.store.get(id);
    if (entry) {
      if (entry.timer) {
        clearTimeout(entry.timer);
      }
      wipeMemory(entry.data);
      this.store.delete(id);
    }
  }

  static sweepExpiredKeys(): number {
    const now = Date.now();
    let swept = 0;
    for (const [id, entry] of this.store.entries()) {
      if (now >= entry.expiry) {
        this.delete(id);
        swept++;
      }
    }
    return swept;
  }

  static clear(): void {
    for (const [id, entry] of this.store.entries()) {
      if (entry.timer) {
        clearTimeout(entry.timer);
      }
      wipeMemory(entry.data);
    }
    this.store.clear();
  }
}
