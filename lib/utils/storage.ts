/**
 * Central safe wrapper for localStorage operations.
 * Provides safe reads, writes, removals, and JSON parsing with type safety,
 * fallback protection against SSR (window undefined), DOMExceptions (private mode/security),
 * quota exceeded errors, and corrupted/malformed stored data.
 */

/**
 * Safely checks if localStorage is available and writable in the current environment.
 */
export function isStorageAvailable(): boolean {
  if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
    return false
  }

  try {
    const testKey = '__cryptoviz_storage_test__'
    window.localStorage.setItem(testKey, '1')
    window.localStorage.removeItem(testKey)
    return true
  } catch {
    return false
  }
}

/**
 * Safely parses a JSON string into type T with a fallback value and optional validator predicate.
 *
 * @param raw Raw string representation of JSON or null/undefined
 * @param fallback Fallback value returned on null/undefined, SyntaxError, or failed validation
 * @param validator Optional predicate to validate parsed data shape
 */
export function safeJsonParse<T>(
  raw: string | null | undefined,
  fallback: T,
  validator?: (val: unknown) => val is T | boolean,
): T {
  if (raw === null || raw === undefined) {
    return fallback
  }

  try {
    const parsed = JSON.parse(raw)
    if (parsed === null || parsed === undefined) {
      return fallback
    }

    if (validator && !validator(parsed)) {
      return fallback
    }

    return parsed as T
  } catch {
    return fallback
  }
}

/**
 * Safely retrieves a raw string item from localStorage.
 */
export function safeGetItem(key: string): string | null {
  if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
    return null
  }

  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

/**
 * Safely retrieves and parses a JSON item from localStorage.
 */
export function safeGetItemJson<T>(
  key: string,
  fallback: T,
  validator?: (val: unknown) => boolean,
): T {
  const raw = safeGetItem(key)
  return safeJsonParse(raw, fallback, validator as ((val: unknown) => val is T) | undefined)
}

/**
 * Generic typed getter wrapper for localStorage operations.
 * Safely reads and deserializes JSON from localStorage, returning defaultValue on missing key or error.
 *
 * @param key Storage key
 * @param defaultValue Default fallback value
 * @param validator Optional predicate validator function
 */
export function getItem<T>(
  key: string,
  defaultValue: T,
  validator?: (val: unknown) => boolean,
): T {
  return safeGetItemJson<T>(key, defaultValue, validator)
}

/**
 * Safely writes a raw string to localStorage.
 * Returns true on success, false if unavailable, quota exceeded, or permission denied.
 */
export function safeSetItem(key: string, value: string): boolean {
  if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
    return false
  }

  try {
    window.localStorage.setItem(key, value)
    return true
  } catch {
    return false
  }
}

/**
 * Safely serializes a value to JSON and writes it to localStorage.
 * Returns true on success, false on serialization error or storage failure.
 */
export function safeSetItemJson<T>(key: string, value: T): boolean {
  try {
    const raw = JSON.stringify(value)
    return safeSetItem(key, raw)
  } catch {
    return false
  }
}

/**
 * Generic typed setter wrapper for localStorage operations.
 * Safely serializes value to JSON and writes it to localStorage.
 *
 * @param key Storage key
 * @param value Value to serialize and store
 */
export function setItem<T>(key: string, value: T): boolean {
  return safeSetItemJson<T>(key, value)
}

/**
 * Safely removes an item from localStorage.
 */
export function safeRemoveItem(key: string): boolean {
  if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
    return false
  }

  try {
    window.localStorage.removeItem(key)
    return true
  } catch {
    return false
  }
}

/**
 * Generic typed item removal wrapper for localStorage.
 *
 * @param key Storage key to remove
 */
export function removeItem(key: string): boolean {
  return safeRemoveItem(key)
}

/**
 * Safely clears all items from localStorage.
 */
export function safeClear(): boolean {
  if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
    return false
  }

  try {
    window.localStorage.clear()
    return true
  } catch {
    return false
  }
}

/**
 * Generic clear wrapper for localStorage.
 */
export function clearStorage(): boolean {
  return safeClear()
}
