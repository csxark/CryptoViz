export interface WorkerCacheEntry<TValue> {
  key: string;
  value: TValue | WeakRef<object>;
  createdAt: number;
  lastAccessedAt: number;
  accessCount: number;
  expiresAt: number | null;
  size: number;
  weakToken?: object;
}

export interface WorkerCacheOptions {
  maxEntries?: number;
  ttlMs?: number;
  maxApproxBytes?: number;
  now?: () => number;
  /** Store object values through WeakRef when the runtime supports it. */
  weakRef?: boolean;
}

export interface WorkerCacheStats {
  entries: number;
  hits: number;
  misses: number;
  evictions: number;
  expirations: number;
  approxBytes: number;
  maxEntries: number;
  maxApproxBytes: number;
  ttlMs: number;
  weakRefEnabled: boolean;
}

const DEFAULT_MAX_ENTRIES = 50;
const DEFAULT_TTL_MS = 5 * 60 * 1000;
const DEFAULT_MAX_APPROX_BYTES = 512 * 1024;

function approximateSize(value: unknown): number {
  if (typeof value === "string") return value.length * 2;
  if (value instanceof ArrayBuffer) return value.byteLength;
  if (ArrayBuffer.isView(value)) return value.byteLength;
  if (value === null || value === undefined) return 0;

  try {
    return JSON.stringify(value).length * 2;
  } catch {
    return 256;
  }
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;

  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
    .join(",")}}`;
}

export function createWorkerCacheKey(parts: unknown[]): string {
  return parts.map((part) => stableStringify(part)).join("|");
}

export class WorkerCache<TValue> {
  private entries = new Map<string, WorkerCacheEntry<TValue>>();
  private hits = 0;
  private misses = 0;
  private evictions = 0;
  private expirations = 0;
  private approxBytes = 0;
  private readonly maxEntries: number;
  private readonly ttlMs: number;
  private readonly maxApproxBytes: number;
  private readonly now: () => number;
  private readonly weakRefEnabled: boolean;
  private readonly finalizationRegistry: FinalizationRegistry<{ key: string; token: object }> | null;

  constructor(options: WorkerCacheOptions = {}) {
    this.maxEntries = Math.max(1, options.maxEntries ?? DEFAULT_MAX_ENTRIES);
    this.ttlMs = Math.max(0, options.ttlMs ?? DEFAULT_TTL_MS);
    this.maxApproxBytes = Math.max(
      1,
      options.maxApproxBytes ?? DEFAULT_MAX_APPROX_BYTES,
    );
    this.now = options.now ?? Date.now;
    this.weakRefEnabled = options.weakRef ?? true;
    this.finalizationRegistry =
      this.weakRefEnabled &&
      typeof WeakRef !== "undefined" &&
      typeof FinalizationRegistry !== "undefined"
        ? new FinalizationRegistry(({ key, token }) => {
            const entry = this.entries.get(key);
            if (entry && entry.weakToken === token) {
              this.deleteEntry(key, "eviction");
            }
          })
        : null;
  }

  get(key: string): TValue | undefined {
    const entry = this.entries.get(key);

    if (!entry) {
      this.misses += 1;
      return undefined;
    }

    if (this.isExpired(entry)) {
      this.deleteEntry(key, "expiration");
      this.misses += 1;
      return undefined;
    }

    const value = this.dereference(entry);
    if (value === undefined) {
      this.deleteEntry(key, "eviction");
      this.misses += 1;
      return undefined;
    }

    entry.lastAccessedAt = this.now();
    entry.accessCount += 1;
    this.entries.delete(key);
    this.entries.set(key, entry);
    this.hits += 1;
    return value;
  }

  set(key: string, value: TValue, ttlMs = this.ttlMs): TValue {
    if (this.entries.has(key)) this.deleteEntry(key, "replacement");

    const currentTime = this.now();
    const size = approximateSize(value);
    const weakToken =
      this.finalizationRegistry && typeof value === "object" && value !== null
        ? {}
        : undefined;
    const storedValue =
      weakToken && this.weakRefEnabled && typeof WeakRef !== "undefined"
        ? new WeakRef(value as object)
        : value;
    const entry: WorkerCacheEntry<TValue> = {
      key,
      value: storedValue,
      createdAt: currentTime,
      lastAccessedAt: currentTime,
      accessCount: 0,
      expiresAt: ttlMs > 0 ? currentTime + ttlMs : null,
      size,
      weakToken,
    };

    this.entries.set(key, entry);
    if (weakToken && this.finalizationRegistry) {
      this.finalizationRegistry.register(value as object, { key, token: weakToken }, weakToken);
    }
    this.approxBytes += size;
    this.enforceLimits();
    return value;
  }

  getOrCreate(key: string, factory: () => TValue, ttlMs = this.ttlMs): TValue {
    const cached = this.get(key);
    if (cached !== undefined) return cached;
    return this.set(key, factory(), ttlMs);
  }

  has(key: string): boolean {
    // A membership probe must not touch hit/miss stats or LRU recency, so it
    // can't delegate to get(). Mirror get()'s "would return a value" checks
    // (existence, expiry, live reference) without the side effects.
    const entry = this.entries.get(key);
    if (!entry) return false;
    if (this.isExpired(entry)) {
      this.deleteEntry(key, "expiration");
      return false;
    }
    return this.dereference(entry) !== undefined;
  }

  delete(key: string): boolean {
    return this.deleteEntry(key, "manual");
  }

  clear(): void {
    for (const entry of this.entries.values()) {
      if (entry.weakToken && this.finalizationRegistry) {
        this.finalizationRegistry.unregister(entry.weakToken);
      }
    }
    this.entries.clear();
    this.approxBytes = 0;
  }

  pruneExpired(): number {
    let removed = 0;
    for (const [key, entry] of this.entries.entries()) {
      if (this.isExpired(entry)) {
        this.deleteEntry(key, "expiration");
        removed += 1;
      }
    }
    return removed;
  }

  snapshot(): WorkerCacheEntry<TValue>[] {
    return Array.from(this.entries.values()).map((entry) => ({ ...entry }));
  }

  stats(): WorkerCacheStats {
    return {
      entries: this.entries.size,
      hits: this.hits,
      misses: this.misses,
      evictions: this.evictions,
      expirations: this.expirations,
      approxBytes: this.approxBytes,
      maxEntries: this.maxEntries,
      maxApproxBytes: this.maxApproxBytes,
      ttlMs: this.ttlMs,
      weakRefEnabled: this.weakRefEnabled && this.finalizationRegistry !== null,
    };
  }

  private dereference(entry: WorkerCacheEntry<TValue>): TValue | undefined {
    if (typeof WeakRef !== "undefined" && entry.value instanceof WeakRef) {
      return entry.value.deref() as TValue | undefined;
    }
    return entry.value as TValue;
  }

  private isExpired(entry: WorkerCacheEntry<TValue>): boolean {
    return entry.expiresAt !== null && entry.expiresAt <= this.now();
  }

  private deleteEntry(
    key: string,
    reason: "manual" | "replacement" | "eviction" | "expiration",
  ): boolean {
    const entry = this.entries.get(key);
    if (!entry) return false;

    this.entries.delete(key);
    if (entry.weakToken && this.finalizationRegistry) {
      this.finalizationRegistry.unregister(entry.weakToken);
    }
    this.approxBytes = Math.max(0, this.approxBytes - entry.size);
    if (reason === "eviction") this.evictions += 1;
    if (reason === "expiration") this.expirations += 1;
    return true;
  }

  private enforceLimits(): void {
    this.pruneExpired();

    while (this.entries.size > this.maxEntries) {
      const oldestKey = this.entries.keys().next().value as string | undefined;
      if (!oldestKey) break;
      this.deleteEntry(oldestKey, "eviction");
    }

    while (this.approxBytes > this.maxApproxBytes && this.entries.size > 0) {
      const oldestKey = this.entries.keys().next().value as string | undefined;
      if (!oldestKey) break;
      this.deleteEntry(oldestKey, "eviction");
    }
  }
}

export const sharedWorkerCache = new WorkerCache<unknown>();

export function clearSharedWorkerCache(): void {
  sharedWorkerCache.clear();
}

export function getSharedWorkerCacheStats(): WorkerCacheStats {
  sharedWorkerCache.pruneExpired();
  return sharedWorkerCache.stats();
}
