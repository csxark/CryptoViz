import {
  WorkerCache,
  createWorkerCacheKey,
  getSharedWorkerCacheStats,
  sharedWorkerCache,
  type WorkerCacheStats,
} from "./workerCache";

export interface CipherWorkerCacheRequest {
  algorithm: string;
  operation: "encrypt" | "decrypt" | "hash" | "derive" | "analyze";
  input: unknown;
  options?: unknown;
  version?: string;
}

export interface CipherWorkerCacheConfig {
  enabled?: boolean;
  ttlMs?: number;
}

export function createCipherWorkerCacheKey(
  request: CipherWorkerCacheRequest,
): string {
  return createWorkerCacheKey([
    "cipher-worker",
    request.version ?? "v1",
    request.algorithm,
    request.operation,
    request.input,
    request.options ?? {},
  ]);
}

export function getCachedWorkerResult<TResult>(
  cache: WorkerCache<TResult>,
  request: CipherWorkerCacheRequest,
): TResult | undefined {
  return cache.get(createCipherWorkerCacheKey(request));
}

export function setCachedWorkerResult<TResult>(
  cache: WorkerCache<TResult>,
  request: CipherWorkerCacheRequest,
  result: TResult,
  ttlMs?: number,
): TResult {
  return cache.set(createCipherWorkerCacheKey(request), result, ttlMs);
}

export function withWorkerCache<TResult>(
  request: CipherWorkerCacheRequest,
  factory: () => TResult,
  config: CipherWorkerCacheConfig = {},
): TResult {
  if (config.enabled === false) return factory();

  const key = createCipherWorkerCacheKey(request);
  const cached = sharedWorkerCache.get(key) as TResult | undefined;

  if (cached !== undefined) return cached;

  const result = factory();
  sharedWorkerCache.set(key, result, config.ttlMs);
  return result;
}


export function getCipherWorkerCacheStats(): WorkerCacheStats {
  return getSharedWorkerCacheStats();
}
