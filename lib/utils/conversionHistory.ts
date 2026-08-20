import {
  safeGetItemJson,
  safeSetItemJson,
  safeRemoveItem,
} from './storage'

export interface ConversionHistoryEntry {
  id: string
  cipherId: string
  input: string
  key: string
  action: 'encrypt' | 'decrypt'
  output: string
  timestamp: string
  parameters?: { iv?: string; nonce?: string }
}

export const MAX_CONVERSION_HISTORY_ENTRIES = 50

export const getConversionHistoryStorageKey = (cipherId: string) =>
  `cryptoviz-history-${cipherId}`

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function normalizeConversionHistory(
  value: unknown,
  cipherId: string,
): ConversionHistoryEntry[] {
  if (!Array.isArray(value)) return []

  const seen = new Set<string>()
  const normalized: ConversionHistoryEntry[] = []

  for (const item of value) {
    if (!isRecord(item)) continue

    const id = typeof item.id === 'string' ? item.id : ''
    const action =
      item.action === 'encrypt' || item.action === 'decrypt'
        ? item.action
        : null

    if (
      !id ||
      seen.has(id) ||
      !action ||
      typeof item.input !== 'string' ||
      typeof item.key !== 'string' ||
      typeof item.output !== 'string' ||
      typeof item.timestamp !== 'string'
    ) {
      continue
    }

    seen.add(id)
    normalized.push({
      id,
      cipherId,
      input: item.input,
      key: item.key,
      action,
      output: item.output,
      timestamp: item.timestamp,
      parameters: isRecord(item.parameters)
        ? {
            ...(typeof item.parameters.iv === 'string' ? { iv: item.parameters.iv } : {}),
            ...(typeof item.parameters.nonce === 'string' ? { nonce: item.parameters.nonce } : {}),
          }
        : undefined,
    })

    if (normalized.length === MAX_CONVERSION_HISTORY_ENTRIES) break
  }

  return normalized
}

export function loadConversionHistory(
  cipherId: string,
): ConversionHistoryEntry[] {
  const parsed = safeGetItemJson<unknown>(
    getConversionHistoryStorageKey(cipherId),
    null,
  )
  return parsed !== null ? normalizeConversionHistory(parsed, cipherId) : []
}

export function saveConversionHistory(
  cipherId: string,
  history: ConversionHistoryEntry[],
): ConversionHistoryEntry[] {
  const normalized = normalizeConversionHistory(history, cipherId)
  const stored = normalized.map(({ cipherId: _cipherId, ...entry }) => entry)

  if (typeof window !== 'undefined') {
    try {
      const stored = normalized.map(({ cipherId: __cipherId, ...entry }) => entry)
      window.localStorage.setItem(
        getConversionHistoryStorageKey(cipherId),
        JSON.stringify(stored),
      )
    } catch {
      // Storage can be unavailable in private mode or when quota is full.
    }
  }
  safeSetItemJson(getConversionHistoryStorageKey(cipherId), stored)

  return normalized
}

export function clearConversionHistory(cipherId: string): void {
  safeRemoveItem(getConversionHistoryStorageKey(cipherId))
}

export function filterConversionHistory(
  history: ConversionHistoryEntry[],
  query: string,
): ConversionHistoryEntry[] {
  const normalizedQuery = query.trim().toLowerCase()
  if (!normalizedQuery) return history

  return history.filter((entry) =>
    [entry.input, entry.output, entry.action, entry.timestamp, entry.key].some(
      (value) => value.toLowerCase().includes(normalizedQuery),
    ),
  )
}

function escapeCsvValue(value: string): string {
  return `"${value.replace(/"/g, '""')}"`
}

export function serializeConversionHistoryToCsv(
  history: ConversionHistoryEntry[],
): string {
  const header = [
    'cipherId',
    'input',
    'key',
    'direction',
    'output',
    'timestamp',
  ]

  const rows = history.map((entry) =>
    [
      entry.cipherId,
      entry.input,
      entry.key,
      entry.action,
      entry.output,
      entry.timestamp,
    ]
      .map(escapeCsvValue)
      .join(','),
  )

  return [header.join(','), ...rows].join('\n')
}

export function serializeConversionHistoryToJson(
  history: ConversionHistoryEntry[],
): string {
  return JSON.stringify(history, null, 2)
}

export function formatConversionHistoryRecord(
  entry: ConversionHistoryEntry,
): string {
  return [
    `Cipher: ${entry.cipherId}`,
    `Direction: ${entry.action}`,
    `Input: ${entry.input}`,
    `Key: ${entry.key || '—'}`,
    `Output: ${entry.output}`,
    `Timestamp: ${entry.timestamp}`,
  ].join('\n')
}

export function downloadTextFile(
  filename: string,
  contents: string,
  mimeType: string,
): void {
  if (typeof window === 'undefined') return

  const blob = new Blob([contents], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}
