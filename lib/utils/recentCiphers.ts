import { CIPHER_REGISTRY } from "../cipher/registry";
import {
  getItem,
  setItem,
  removeItem,
} from "./storage";

export const RECENT_CIPHERS_STORAGE_KEY = "cryptoviz-recent-ciphers";
export const MAX_RECENT_CIPHERS = 8;

export function getSupportedCipherIds(): ReadonlySet<string> {
  return new Set(CIPHER_REGISTRY.map((cipher) => cipher.id));
}

export function normalizeRecentCipherIds(
  value: unknown,
  supportedIds: ReadonlySet<string> = getSupportedCipherIds(),
): string[] {
  if (!Array.isArray(value)) return [];

  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const item of value) {
    if (typeof item !== "string" || seen.has(item) || !supportedIds.has(item)) {
      continue;
    }

    seen.add(item);
    normalized.push(item);

    if (normalized.length === MAX_RECENT_CIPHERS) break;
  }

  return normalized;
}

export function loadRecentCipherIds(): string[] {
  const parsed = getItem<unknown>(RECENT_CIPHERS_STORAGE_KEY, null);
  return parsed !== null ? normalizeRecentCipherIds(parsed) : [];
}

export function saveRecentCipherIds(ids: string[]): string[] {
  const normalized = normalizeRecentCipherIds(ids);
  setItem(RECENT_CIPHERS_STORAGE_KEY, normalized);
  return normalized;
}

export function recordRecentCipher(
  currentIds: string[],
  cipherId: string,
): string[] {
  const supportedIds = getSupportedCipherIds();
  if (!supportedIds.has(cipherId)) {
    return normalizeRecentCipherIds(currentIds, supportedIds);
  }

  return normalizeRecentCipherIds(
    [cipherId, ...currentIds.filter((id) => id !== cipherId)],
    supportedIds,
  );
}

export function clearRecentCipherIds(): void {
  removeItem(RECENT_CIPHERS_STORAGE_KEY);
}
