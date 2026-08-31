import { CIPHER_REGISTRY } from '../cipher/registry'
import {
  getItem,
  setItem,
  removeItem,
} from './storage'

export const FAVORITE_CIPHERS_STORAGE_KEY = 'cryptoviz-favorite-ciphers'
export const FAVORITE_CIPHERS_CHANGED_EVENT = 'cryptoviz:favorite-ciphers-changed'
export const MAX_FAVORITE_CIPHERS = 20

function isBrowser(): boolean {
  return typeof window !== 'undefined'
}

function readStorage(): string[] {
  const parsed = getItem<unknown>(FAVORITE_CIPHERS_STORAGE_KEY, null)
  return parsed !== null ? normalizeFavoriteCipherIds(parsed) : []
}

function writeStorage(ids: string[]): boolean {
  return setItem(FAVORITE_CIPHERS_STORAGE_KEY, ids)
}
function removeStorage(): void {
  removeItem(FAVORITE_CIPHERS_STORAGE_KEY)
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

  if (writeStorage(normalized)) {
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