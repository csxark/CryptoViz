'use client'

import { useMemo, useState, useId, useEffect } from 'react'
import { type AesMode } from '@/lib/cipher/symmetric/aes'
import { cryptoWorkerClient } from '@/lib/workers/cryptoWorkerClient'

const MODES: { id: AesMode; name: string; blurb: string }[] = [
  { id: 'ECB', name: 'ECB', blurb: 'Only the changed block differs; equal blocks stay equal.' },
  { id: 'CBC', name: 'CBC', blurb: 'The changed block and every block after it differ.' },
  { id: 'CFB', name: 'CFB', blurb: 'One byte in-block, then every following block differs.' },
  { id: 'OFB', name: 'OFB', blurb: 'Keystream is independent — only the one byte differs.' },
  { id: 'CTR', name: 'CTR', blurb: 'Counter keystream — only the one byte differs.' },
]

const KEY = '2b7e151628aed2a6abf7158809cf4f3c'
const IV = '000102030405060708090a0b0c0d0e0f'

function flipByte(text: string, index: number): string {
  if (index < 0 || index >= text.length) return text
  const code = text.charCodeAt(index)
  const next = code === 65 ? 66 : 65
  return text.slice(0, index) + String.fromCharCode(next) + text.slice(index + 1)
}

export default function ModesLab() {
  const [text, setText] = useState('The magic words are squeamish ossifrage.')
  const [flipIndex, setFlipIndex] = useState(4)
  const textInputId = useId()
  const rangeInputId = useId()
  const resultsId = useId()

  const safeIndex = Math.min(flipIndex, Math.max(0, text.length - 1))
  const flipped = useMemo(() => flipByte(text, safeIndex), [text, safeIndex])
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let active = true
    const calculate = async () => {
      setLoading(true)
      try {
        const result = await cryptoWorkerClient.runCryptoOperation<any[]>('batchModesLab', {
          text,
          flipped,
          key: KEY,
          iv: IV,
          modes: MODES.map((m) => m.id),
        })
        if (active) setRows(MODES.map((m, i) => ({ ...m, ...result[i] })))
      } catch (err) {
        console.error('Worker failed:', err)
      } finally {
        if (active) setLoading(false)
      }
    }
    calculate()
    return () => {
      active = false
    }
  }, [text, flipped])

  const announcement = loading
    ? 'Calculating cipher mode differences.'
    : rows.length > 0
      ? `Cipher mode comparison updated. ${rows.map((row) => `${row.name}: ${row.changedCount} of ${row.total} bytes changed`).join('. ')}`
      : 'No cipher mode comparison results available.'

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900/40">
        <div className="flex flex-col gap-1.5">
          <label htmlFor={textInputId} className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
            Plaintext (ASCII)
          </label>
          <input
            id={textInputId}
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full rounded-lg border border-zinc-200 bg-zinc-50/50 p-2.5 font-mono text-sm text-zinc-900 outline-none transition-all focus:border-teal-500 focus:bg-white dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-zinc-100 dark:focus:border-teal-400"
          />
        </div>

        <div className="mt-4 flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor={rangeInputId} className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
              Flip one plaintext byte (position {safeIndex})
            </label>
            <span className="font-mono text-xs text-zinc-500 dark:text-zinc-400">
              key {KEY.slice(0, 8)}… · iv {IV.slice(0, 8)}…
            </span>
          </div>
          <input
            id={rangeInputId}
            type="range"
            min={0}
            max={Math.max(0, text.length - 1)}
            value={safeIndex}
            onChange={(e) => setFlipIndex(parseInt(e.target.value, 10))}
            aria-valuetext={`Plaintext byte position ${safeIndex}`}
            className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-zinc-200 accent-teal-600 dark:bg-zinc-700 dark:accent-teal-400"
          />
          <p className="font-mono text-[11px] text-zinc-500 dark:text-zinc-500" aria-label={`Plaintext with byte ${safeIndex} highlighted`}>
            {text.slice(0, safeIndex)}
            <span aria-hidden="true" className="rounded bg-[var(--diff-highlight-bg)] px-0.5 text-[var(--diff-highlight-fg)]">
              {text.slice(safeIndex, safeIndex + 1) || '·'}
            </span>
            {text.slice(safeIndex + 1)}
          </p>
        </div>
      </div>

      <div id={resultsId} role="region" aria-label="Cipher mode comparison" aria-live="polite" aria-busy={loading} className="flex flex-col gap-4">
        <p className="sr-only" role="status">{announcement}</p>
        {rows.map((row) => (
          <article
            key={row.id}
            aria-label={`${row.name} cipher mode: ${row.changedCount} of ${row.total} bytes changed`}
            className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/40"
          >
            <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
              <div className="flex items-baseline gap-2">
                <span className="font-mono text-sm font-bold text-teal-600 dark:text-teal-400">{row.name}</span>
                <span className="text-xs text-zinc-500 dark:text-zinc-400">{row.blurb}</span>
              </div>
              <span className="font-mono text-xs text-zinc-500 dark:text-zinc-400">
                {row.changedCount}/{row.total} bytes changed
              </span>
            </div>
            <div role="list" aria-label={`${row.name} changed bytes`} className="flex flex-wrap gap-1">
              {(row.changed as string[]).map((b: string, i: number) => (
                <span
                  role="listitem"
                  key={`byte-${i}-${b}`}
                  className={`rounded px-1 py-0.5 font-mono text-[11px] ${
                    row.diff[i]
                      ? 'bg-[var(--diff-highlight-bg)] text-[var(--diff-highlight-fg)]'
                      : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800/60 dark:text-zinc-400'
                  }`}
                >
                  {b}
                </span>
              ))}
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}
