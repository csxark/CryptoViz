'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { CipherDefinition } from '../../lib/cipher/registry'
import type {
  CipherDirection,
  CipherResult,
} from '../../lib/cipher/types'
import { useCipherWorker } from '../../lib/hooks/useCipherWorker'
import {
  createCipherWorkerOptions,
  createDefaultComparisonPanelState,
  getSupportedDirections,
  normalizeComparisonDirection,
} from '../../lib/utils/cipherComparison'

interface CipherComparisonPanelProps {
  cipher: CipherDefinition
  sharedInput: string
  panelLabel: string
  resetToken: number
}

const securityStyles: Record<CipherDefinition['securityStatus'], string> = {
  secure:
    'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-400',
  deprecated:
    'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-400',
  broken:
    'border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-400',
}

export default function CipherComparisonPanel({
  cipher,
  sharedInput,
  panelLabel,
  resetToken,
}: CipherComparisonPanelProps) {
  const { runCipher, loading, error: workerError } = useCipherWorker()
  const abortControllerRef = useRef<AbortController | null>(null)
  const defaults = useMemo(
    () => createDefaultComparisonPanelState(cipher),
    [cipher],
  )

  const [direction, setDirection] = useState<CipherDirection>(
    defaults.direction,
  )
  const [key, setKey] = useState(defaults.key)
  const [options, setOptions] = useState(defaults.options)
  const [result, setResult] = useState<CipherResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const resetPanel = () => {
    abortControllerRef.current?.abort()
    setDirection(defaults.direction)
    setKey(defaults.key)
    setOptions(defaults.options)
    setResult(null)
    setError(null)
  }

  useEffect(() => {
    resetPanel()
  }, [cipher.id, resetToken])

  const supportedDirections = getSupportedDirections(cipher)

  const updateOption = (
    optionId: string,
    value: string | number | boolean,
  ) => {
    setOptions((current) => ({
      ...current,
      [optionId]: value,
    }))
  }

  const handleRun = async () => {
    abortControllerRef.current?.abort()
    const controller = new AbortController()
    abortControllerRef.current = controller
    setError(null)

    try {
      const safeDirection = normalizeComparisonDirection(cipher, direction)
      const workerOptions = {
        ...createCipherWorkerOptions(cipher, options),
        signal: controller.signal,
      }

      const nextResult = await runCipher(
        safeDirection,
        cipher.id,
        sharedInput,
        key,
        workerOptions,
      )

      if (!controller.signal.aborted) {
        setResult(nextResult)
      }
    } catch (runError) {
      if (
        runError instanceof DOMException &&
        runError.name === 'AbortError'
      ) {
        return
      }

      setResult(null)
      setError(
        runError instanceof Error
          ? runError.message
          : 'The comparison operation failed.',
      )
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null
      }
    }
  }

  return (
    <article className="flex min-w-0 flex-col rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40">
      <header className="border-b border-zinc-200 p-5 dark:border-zinc-800">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-600 dark:text-teal-400">
          {panelLabel}
        </p>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-zinc-950 dark:text-white">
              {cipher.name}
            </h2>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              {cipher.category}
            </p>
          </div>

          <span
            className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${securityStyles[cipher.securityStatus]}`}
          >
            {cipher.securityStatus}
          </span>
        </div>

        <p className="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          {cipher.description}
        </p>
      </header>

      <div className="flex flex-1 flex-col gap-4 p-5">
        {supportedDirections.length > 1 && (
          <div className="grid grid-cols-2 gap-2 rounded-lg bg-zinc-100 p-1 dark:bg-zinc-800">
            {supportedDirections.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setDirection(option)}
                className={`rounded-md px-3 py-2 text-xs font-semibold capitalize ${
                  direction === option
                    ? 'bg-white text-zinc-950 shadow dark:bg-zinc-900 dark:text-white'
                    : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        )}

        {cipher.defaultKey !== undefined && (
          <label className="grid gap-1.5 text-xs font-semibold text-zinc-600 dark:text-zinc-300">
            Key
            <input
              type="text"
              value={key}
              onChange={(event) => setKey(event.target.value)}
              placeholder={cipher.keyPlaceholder || 'Enter key'}
              className="rounded-lg border border-zinc-200 bg-zinc-50 p-2.5 font-mono text-sm font-normal text-zinc-900 outline-none focus:border-teal-500 dark:border-zinc-700 dark:bg-zinc-950/50 dark:text-white"
            />
          </label>
        )}

        {(cipher.options ?? []).map((option) => {
          const value = options[option.id] ?? option.default

          if (option.type === 'boolean') {
            return (
              <label
                key={option.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 p-3 text-xs font-semibold text-zinc-600 dark:border-zinc-700 dark:text-zinc-300"
              >
                {option.name}
                <input
                  type="checkbox"
                  checked={Boolean(value)}
                  onChange={(event) =>
                    updateOption(option.id, event.target.checked)
                  }
                />
              </label>
            )
          }

          if (option.type === 'number') {
            return (
              <label
                key={option.id}
                className="grid gap-1.5 text-xs font-semibold text-zinc-600 dark:text-zinc-300"
              >
                {option.name}
                <input
                  type="number"
                  value={Number(value)}
                  onChange={(event) =>
                    updateOption(
                      option.id,
                      Number.parseInt(event.target.value, 10),
                    )
                  }
                  className="rounded-lg border border-zinc-200 bg-zinc-50 p-2.5 text-sm font-normal text-zinc-900 outline-none focus:border-teal-500 dark:border-zinc-700 dark:bg-zinc-950/50 dark:text-white"
                />
              </label>
            )
          }

          return (
            <label
              key={option.id}
              className="grid gap-1.5 text-xs font-semibold text-zinc-600 dark:text-zinc-300"
            >
              {option.name}
              <input
                type="text"
                value={String(value)}
                onChange={(event) =>
                  updateOption(option.id, event.target.value)
                }
                className="rounded-lg border border-zinc-200 bg-zinc-50 p-2.5 text-sm font-normal text-zinc-900 outline-none focus:border-teal-500 dark:border-zinc-700 dark:bg-zinc-950/50 dark:text-white"
              />
            </label>
          )
        })}

        <button
          type="button"
          onClick={() => void handleRun()}
          disabled={loading}
          className="rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-500 disabled:cursor-wait disabled:opacity-50"
        >
          {loading ? 'Running…' : `Run ${cipher.name}`}
        </button>

        {(error || workerError) && (
          <div
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/20 dark:text-red-300"
          >
            {error || workerError}
          </div>
        )}

        <section className="mt-auto rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950/40">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
            Result
          </h3>

          {result ? (
            <dl className="mt-3 grid gap-3 text-sm">
              <div>
                <dt className="text-xs font-semibold text-zinc-500">
                  Output
                </dt>
                <dd className="mt-1 break-all font-mono text-zinc-900 dark:text-zinc-100">
                  {result.output}
                </dd>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <dt className="text-xs font-semibold text-zinc-500">
                    Encoding
                  </dt>
                  <dd className="mt-1 font-mono">
                    {result.outputEncoding}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold text-zinc-500">
                    Duration
                  </dt>
                  <dd className="mt-1 font-mono">
                    {result.durationMs.toFixed(2)} ms
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold text-zinc-500">
                    Trace steps
                  </dt>
                  <dd className="mt-1 font-mono">
                    {result.steps.length}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold text-zinc-500">
                    Metadata name
                  </dt>
                  <dd className="mt-1">
                    {result.metadata.name}
                  </dd>
                </div>
              </div>
            </dl>
          ) : (
            <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
              Run this cipher to display its result and comparison metadata.
            </p>
          )}
        </section>
      </div>
    </article>
  )
}
