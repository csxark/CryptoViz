import { CIPHER_REGISTRY } from '../cipher/registry'
import {
  safeGetItemJson,
  safeSetItemJson,
  safeRemoveItem,
} from './storage'

export const FAVORITE_CIPHERS_STORAGE_KEY = 'cryptoviz-favorite-ciphers'
export const FAVORITE_CIPHERS_CHANGED_EVENT = 'cryptoviz:favorite-ciphers-changed'
export const MAX_FAVORITE_CIPHERS = 20

function isBrowser(): boolean {
  return typeof window !== 'undefined'
}

function readStorage(): string[] {
  if (!isBrowser()) return []

  try {
    const raw = window.localStorage.getItem(FAVORITE_CIPHERS_STORAGE_KEY)
    return raw ? normalizeFavoriteCipherIds(JSON.parse(raw)) : []
  } catch (error) {
    console.warn(
      '[CryptoViz LocalStorage Error] Failed to read favorite ciphers from storage:',
      error,
    )
    return []
  }
}

function writeStorage(ids: string[]): void {
  if (!isBrowser()) return

  try {
    window.localStorage.setItem(
      FAVORITE_CIPHERS_STORAGE_KEY,
      JSON.stringify(ids),
    )
  } catch (error) {
    console.warn(
      '[CryptoViz LocalStorage Error] Failed to write favorite ciphers to storage:',
      error,
    )
  }
}


function removeStorage(): void {
  if (!isBrowser()) return

  try {
    window.localStorage.removeItem(FAVORITE_CIPHERS_STORAGE_KEY)
  } catch (error) {
    console.warn(
      '[CryptoViz LocalStorage Error] Failed to remove favorite ciphers from storage:',
      error,
    )
  }
}

export function getSupportedCipherIds(): ReadonlySet<string> {
  return new Set(CIPHER_REGISTRY.map((cipher) => cipher.id))
}

export function normalizeFavoriteCipherIds(
  value: unknown,
  supportedIds: ReadonlySet<string> = getSupportedCipherIds(),
): string[] {
  if (!Array.isArray(value)) return []

  const seen = new Set<string>()
  const normalized: string[] = []

  for (const item of value) {
    if (
      typeof item !== 'string' ||
      seen.has(item) ||
      !supportedIds.has(item)
    ) {
      continue
    }

    seen.add(item)
    normalized.push(item)

    if (normalized.length === MAX_FAVORITE_CIPHERS) break
  }

  return normalized
}

export function loadFavoriteCipherIds(): string[] {
  return readStorage()
}

function dispatchFavoriteChange(ids: string[]) {
  if (!isBrowser()) return

  window.dispatchEvent(
    new CustomEvent<string[]>(FAVORITE_CIPHERS_CHANGED_EVENT, {
      detail: ids,
    }),
  )
}

export function saveFavoriteCipherIds(ids: string[]): string[] {
  const normalized = normalizeFavoriteCipherIds(ids)

  writeStorage(normalized)

  if (isBrowser()) {
    dispatchFavoriteChange(normalized)
  }

  return normalized
}

export function toggleFavoriteCipher(
  currentIds: string[],
  cipherId: string,
): string[] {
  const supportedIds = getSupportedCipherIds()

  if (!supportedIds.has(cipherId)) {
    return normalizeFavoriteCipherIds(currentIds, supportedIds)
  }

  if (currentIds.includes(cipherId)) {
    return normalizeFavoriteCipherIds(
      currentIds.filter((id) => id !== cipherId),
      supportedIds,
    )
  }

  return normalizeFavoriteCipherIds([...currentIds, cipherId], supportedIds)
}

export function clearFavoriteCipherIds(): void {
  removeStorage()

  if (isBrowser()) {
    dispatchFavoriteChange([])
  }
}