/**
 * A generic memoization utility with a configurable cache size limit.
 * Can be used for expensive pure functions to avoid recalculation.
 */
export function memoize<T extends (...args: any[]) => any>(
  fn: T,
  maxCacheSize: number = 100
): T {
  const cache = new Map<string, ReturnType<T>>();

  const memoized = (...args: Parameters<T>): ReturnType<T> => {
    // Basic serialization for cache key
    const key = JSON.stringify(args);
    if (cache.has(key)) {
      return cache.get(key)!;
    }

    const result = fn(...args);

    if (cache.size >= maxCacheSize) {
      // Remove the oldest entry (Map iterates in insertion order)
      const firstKey = cache.keys().next().value;
      if (firstKey !== undefined) {
        cache.delete(firstKey);
      }
    }

    cache.set(key, result);
    return result;
  };

  return memoized as T;
}
