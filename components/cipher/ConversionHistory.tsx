'use client'

import { useMemo, useState } from 'react'
import {
  clearConversionHistory,
  downloadTextFile,
  filterConversionHistory,
  formatConversionHistoryRecord,
  saveConversionHistory,
  serializeConversionHistoryToCsv,
  serializeConversionHistoryToJson,
  type ConversionHistoryEntry,
} from '../../lib/utils/conversionHistory'
import EmptyState from '../ui/EmptyState'
import { History as HistoryIcon, SearchX } from 'lucide-react'

interface ConversionHistoryProps {
  cipherId: string
  history: ConversionHistoryEntry[]
  onHistoryChange: (history: ConversionHistoryEntry[]) => void
}

export default function ConversionHistory({
  cipherId,
  history,
  onHistoryChange,
}: ConversionHistoryProps) {
  const [query, setQuery] = useState('')
  const [message, setMessage] = useState<string | null>(null)

  const filteredHistory = useMemo(
    () => filterConversionHistory(history, query),
    [history, query],
  )

  const showMessage = (value: string) => {
    setMessage(value)
    window.setTimeout(() => setMessage(null), 1800)
  }

  const persist = (next: ConversionHistoryEntry[]) => {
    onHistoryChange(saveConversionHistory(cipherId, next))
  }

  const handleCopy = async (entry: ConversionHistoryEntry) => {
    try {
      await navigator.clipboard.writeText(formatConversionHistoryRecord(entry))
      showMessage('History record copied.')
    } catch {
      showMessage('Clipboard is unavailable.')
    }
  }

  const handleDelete = (entryId: string) => {
    persist(history.filter((entry) => entry.id !== entryId))
    showMessage('History record deleted.')
  }

  const handleClear = () => {
    if (!window.confirm('Clear all conversion history for this cipher?')) return

    clearConversionHistory(cipherId)
    onHistoryChange([])
    setQuery('')
    showMessage('Conversion history cleared.')
  }

  const handleExportJson = () => {
    downloadTextFile(
      `${cipherId}-conversion-history.json`,
      serializeConversionHistoryToJson(history),
      'application/json;charset=utf-8',
    )
    showMessage('JSON history exported.')
  }

  const handleExportCsv = () => {
    downloadTextFile(
      `${cipherId}-conversion-history.csv`,
      serializeConversionHistoryToCsv(history),
      'text/csv;charset=utf-8',
    )
    showMessage('CSV history exported.')
  }

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-zinc-900 dark:text-white">
            Recent Conversions
          </h2>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Search, copy, manage, or export this cipher&apos;s local history.
          </p>
        </div>
        <span className="text-xs text-zinc-400 dark:text-zinc-500">
          {history.length} saved
        </span>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto_auto_auto]">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search input, output, direction or time..."
          aria-label="Search conversion history"
          className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-teal-500 dark:border-zinc-700 dark:bg-zinc-950/40 dark:text-white"
        />
        <button type="button" onClick={handleExportJson} disabled={!history.length} className="rounded-lg border border-zinc-300 px-3 py-2 text-xs font-semibold hover:bg-zinc-50 disabled:opacity-40 dark:border-zinc-700 dark:hover:bg-zinc-800">
          Export JSON
        </button>
        <button type="button" onClick={handleExportCsv} disabled={!history.length} className="rounded-lg border border-zinc-300 px-3 py-2 text-xs font-semibold hover:bg-zinc-50 disabled:opacity-40 dark:border-zinc-700 dark:hover:bg-zinc-800">
          Export CSV
        </button>
        <button type="button" onClick={handleClear} disabled={!history.length} className="rounded-lg border border-red-300 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-40 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/30">
          Clear
        </button>
      </div>

      {message && <p role="status" className="mt-3 text-xs text-teal-700 dark:text-teal-400">{message}</p>}

      {history.length === 0 ? (
        <EmptyState 
          title="No conversions saved yet"
          description="Run a cipher operation to create history."
          icon={<HistoryIcon className="h-6 w-6" />}
          className="mt-4"
        />
      ) : filteredHistory.length === 0 ? (
        <EmptyState 
          title="No matches found"
          description={`No history entries match “${query}”.`}
          icon={<SearchX className="h-6 w-6" />}
          className="mt-4"
        />
      ) : (
        <ul className="mt-4 flex flex-col gap-3">
          {filteredHistory.map((entry) => (
            <li key={entry.id} className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-950/40">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                <span className="font-semibold uppercase tracking-wide">{entry.action}</span>
                <span>{entry.timestamp}</span>
              </div>
              <p className="mt-2 break-words text-sm font-medium text-zinc-800 dark:text-zinc-200">{entry.input || '—'}</p>
              <p className="mt-1 break-all text-xs text-zinc-500 dark:text-zinc-400">Output: {entry.output}</p>
              <p className="mt-1 break-all text-xs text-zinc-500 dark:text-zinc-400">Key: {entry.key || '—'}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" onClick={() => void handleCopy(entry)} className="rounded-md border border-zinc-300 px-2.5 py-1.5 text-xs font-semibold hover:bg-white dark:border-zinc-700 dark:hover:bg-zinc-900">
                  Copy record
                </button>
                <button type="button" onClick={() => handleDelete(entry.id)} className="rounded-md border border-red-300 px-2.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/30">
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
