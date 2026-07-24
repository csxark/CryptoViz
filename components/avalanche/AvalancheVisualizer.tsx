'use client'

/**
 * AvalancheVisualizer — type an input, flip a single bit, and watch the output
 * cascade. Two runs of the same algorithm (original input vs. bit-flipped
 * input) go through the shared cipher worker; the two hex outputs are diffed
 * bit-for-bit and rendered as a Hamming-distance meter plus a ByteHeatmap.
 *
 * No cipher-engine changes: this reuses the existing hash/cipher registry via
 * `useCipherWorker` and only diffs `CipherResult.output`.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import type { CipherResult } from '../../lib/cipher/types'
import { useCipherWorker } from '../../lib/hooks/useCipherWorker'
import {
  computeByteCells,
  diffStats,
  flipInputBit,
} from '../../lib/utils/bitDiff'
import ByteHeatmap from '../ui/ByteHeatmap'

type SecurityStatus = 'secure' | 'deprecated' | 'broken'

interface AvalancheAlgorithm {
  id: string
  name: string
  securityStatus: SecurityStatus
  /** Key material passed to the worker (empty for keyless hashes). */
  key: string
  /** Worker options; hashes need none, AES runs over UTF-8 text in ECB. */
  options: Record<string, unknown>
  /** Short line explaining what to expect from this primitive. */
  note: string
}

/**
 * The subset of the registry that produces a fixed-width hex digest/ciphertext
 * where the avalanche effect is meaningful to visualise.
 */
const ALGORITHMS: AvalancheAlgorithm[] = [
  {
    id: 'sha256',
    name: 'SHA-256',
    securityStatus: 'secure',
    key: '',
    options: {},
    note: 'Modern hash — a 1-bit change should scramble ~50% of the 256-bit digest.',
  },
  {
    id: 'sha512',
    name: 'SHA-512',
    securityStatus: 'secure',
    key: '',
    options: {},
    note: 'Wider 512-bit digest with the same strong diffusion.',
  },
  {
    id: 'sha3',
    name: 'SHA3-256',
    securityStatus: 'secure',
    key: '',
    options: {},
    note: 'Keccak sponge construction — strong, uniform diffusion.',
  },
  {
    id: 'ripemd160',
    name: 'RIPEMD-160',
    securityStatus: 'secure',
    key: '',
    options: {},
    note: 'Twin parallel compression lines over a 160-bit digest.',
  },
  {
    id: 'md5',
    name: 'MD5',
    securityStatus: 'broken',
    key: '',
    options: {},
    note: 'Broken hash — good diffusion here does not make it collision-resistant.',
  },
  {
    id: 'aes',
    name: 'AES-128 (ECB)',
    securityStatus: 'secure',
    key: '000102030405060708090a0b0c0d0e0f',
    options: { encoding: 'utf8', mode: 'ECB' },
    note: 'Block cipher — each 16-byte block diffuses a 1-bit change across the whole block.',
  },
]

const securityStyles: Record<SecurityStatus, string> = {
  secure:
    'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-400',
  deprecated:
    'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-400',
  broken:
    'border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-400',
}

const DEFAULT_INPUT = 'The quick brown fox'

/** Colour the meter by how close the change rate is to the ideal 50%. */
function meterTone(percent: number): string {
  const distanceFromIdeal = Math.abs(percent - 50)
  if (distanceFromIdeal <= 10) return 'bg-emerald-500'
  if (distanceFromIdeal <= 25) return 'bg-amber-500'
  return 'bg-red-500'
}

export default function AvalancheVisualizer() {
  const { runCipher, error: workerError } = useCipherWorker()

  const [input, setInput] = useState(DEFAULT_INPUT)
  const [algorithmId, setAlgorithmId] = useState(ALGORITHMS[0].id)
  const [charIndex, setCharIndex] = useState(0)
  const [bitIndex, setBitIndex] = useState(0)

  const [originalOutput, setOriginalOutput] = useState<string | null>(null)
  const [modifiedOutput, setModifiedOutput] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const resultRef = useRef<HTMLDivElement | null>(null)
  const runTokenRef = useRef(0)

  const algorithm = useMemo(
    () => ALGORITHMS.find((item) => item.id === algorithmId) ?? ALGORITHMS[0],
    [algorithmId],
  )

  // Keep the selected character in range as the input shrinks.
  const safeCharIndex = Math.min(charIndex, Math.max(0, input.length - 1))

  const flippedInput = useMemo(() => {
    if (input.length === 0) return ''
    return flipInputBit(input, safeCharIndex, bitIndex)
  }, [input, safeCharIndex, bitIndex])

  useEffect(() => {
    if (input.length === 0) {
      setOriginalOutput(null)
      setModifiedOutput(null)
      setError(null)
      return
    }

    const token = ++runTokenRef.current
    let cancelled = false
    setLoading(true)
    setError(null)

    const compute = async () => {
      try {
        // Sequential: the worker cancels overlapping requests, so we must let
        // the first run finish before starting the second.
        const first: CipherResult = await runCipher(
          'encrypt',
          algorithm.id,
          input,
          algorithm.key,
          algorithm.options,
        )
        const second: CipherResult = await runCipher(
          'encrypt',
          algorithm.id,
          flippedInput,
          algorithm.key,
          algorithm.options,
        )
        if (cancelled || token !== runTokenRef.current) return
        setOriginalOutput(first.output)
        setModifiedOutput(second.output)
      } catch (runError) {
        if (runError instanceof DOMException && runError.name === 'AbortError') {
          return
        }
        if (cancelled || token !== runTokenRef.current) return
        setOriginalOutput(null)
        setModifiedOutput(null)
        setError(
          runError instanceof Error
            ? runError.message
            : 'The avalanche computation failed.',
        )
      } finally {
        if (!cancelled && token === runTokenRef.current) {
          setLoading(false)
        }
      }
    }

    void compute()
    return () => {
      cancelled = true
    }
  }, [input, flippedInput, algorithm, runCipher])

  const stats = useMemo(() => {
    if (!originalOutput || !modifiedOutput) return null
    try {
      return diffStats(originalOutput, modifiedOutput)
    } catch {
      return null
    }
  }, [originalOutput, modifiedOutput])

  const cells = useMemo(() => {
    if (!originalOutput || !modifiedOutput) return []
    try {
      return computeByteCells(originalOutput, modifiedOutput)
    } catch {
      return []
    }
  }, [originalOutput, modifiedOutput])

  const hasResult = Boolean(originalOutput && modifiedOutput && stats)

  // Move focus to the results once a fresh computation lands.
  useEffect(() => {
    if (hasResult && !loading) {
      resultRef.current?.focus()
    }
  }, [hasResult, loading])

  const percent = stats?.percentChanged ?? 0

  return (
    <div className="space-y-8">
      <section className="grid gap-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40">
        <label className="grid gap-1.5 text-xs font-semibold text-zinc-600 dark:text-zinc-300">
          Input message
          <input
            type="text"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Type something to hash…"
            className="rounded-lg border border-zinc-200 bg-zinc-50 p-2.5 font-mono text-sm font-normal text-zinc-900 outline-none focus:border-teal-500 dark:border-zinc-700 dark:bg-zinc-950/50 dark:text-white"
          />
        </label>

        <div className="grid gap-2">
          <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
            Algorithm
          </span>
          <div className="flex flex-wrap gap-2">
            {ALGORITHMS.map((item) => {
              const active = item.id === algorithmId
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setAlgorithmId(item.id)}
                  aria-pressed={active}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                    active
                      ? 'border-teal-500 bg-teal-500 text-white'
                      : 'border-zinc-200 bg-white text-zinc-600 hover:border-teal-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300'
                  }`}
                >
                  {item.name}
                </button>
              )
            })}
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {algorithm.note}
          </p>
        </div>

        {input.length > 0 && (
          <div className="grid gap-3">
            <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
              Flip one bit — pick a character, then a bit
            </span>
            <div className="flex flex-wrap gap-1" role="group" aria-label="Character to flip">
              {Array.from(input).map((char, index) => {
                const active = index === safeCharIndex
                return (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setCharIndex(index)}
                    aria-pressed={active}
                    aria-label={`Character ${index}: ${char === ' ' ? 'space' : char}`}
                    className={`h-8 min-w-8 rounded-md border px-1.5 font-mono text-sm transition-colors ${
                      active
                        ? 'border-teal-500 bg-teal-500 text-white'
                        : 'border-zinc-200 bg-zinc-50 text-zinc-700 hover:border-teal-400 dark:border-zinc-700 dark:bg-zinc-950/50 dark:text-zinc-300'
                    }`}
                  >
                    {char === ' ' ? '␣' : char}
                  </button>
                )
              })}
            </div>
            <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Bit to flip">
              <span className="text-xs text-zinc-500 dark:text-zinc-400">Bit</span>
              {Array.from({ length: 8 }, (_, bit) => {
                const active = bit === bitIndex
                return (
                  <button
                    key={bit}
                    type="button"
                    onClick={() => setBitIndex(bit)}
                    aria-pressed={active}
                    aria-label={`Bit ${bit}`}
                    className={`h-8 w-8 rounded-md border font-mono text-xs transition-colors ${
                      active
                        ? 'border-teal-500 bg-teal-500 text-white'
                        : 'border-zinc-200 bg-zinc-50 text-zinc-700 hover:border-teal-400 dark:border-zinc-700 dark:bg-zinc-950/50 dark:text-zinc-300'
                    }`}
                  >
                    {bit}
                  </button>
                )
              })}
            </div>
            <p className="font-mono text-xs text-zinc-500 dark:text-zinc-400">
              original: <span className="text-zinc-700 dark:text-zinc-200">{JSON.stringify(input)}</span>
              {'  →  '}
              flipped: <span className="text-teal-600 dark:text-teal-400">{JSON.stringify(flippedInput)}</span>
            </p>
          </div>
        )}
      </section>

      {(error || workerError) && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900/40 dark:bg-red-950/20"
        >
          <div className="flex gap-3">
            <svg
              className="mt-0.5 h-5 w-5 shrink-0 text-red-500 dark:text-red-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <h3 className="text-sm font-bold text-red-800 dark:text-red-300">Computation Error</h3>
              <p className="mt-1 text-sm text-red-700 dark:text-red-400">
                {error || workerError?.message || workerError?.code || 'The cipher worker reported an error.'}
              </p>
            </div>
          </div>
        </div>
      )}

      <section
        ref={resultRef}
        tabIndex={-1}
        aria-label="Avalanche results"
        aria-busy={loading}
        className="space-y-6 outline-none"
      >
        {loading && !hasResult && (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Computing…</p>
        )}

        {hasResult && stats && (
          <>
            <div className="grid gap-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-bold text-zinc-950 dark:text-white">
                    Hamming distance
                  </h2>
                  <span
                    className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${securityStyles[algorithm.securityStatus]}`}
                  >
                    {algorithm.securityStatus}
                  </span>
                </div>
                <p className="font-mono text-sm text-zinc-600 dark:text-zinc-300">
                  {stats.changedBits} / {stats.totalBits} bits changed
                </p>
              </div>

              <div className="grid gap-1.5">
                <div
                  className="relative h-4 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800"
                  role="meter"
                  aria-label="Percentage of output bits changed"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(percent)}
                  aria-valuetext={`${percent.toFixed(1)}% of bits changed`}
                >
                  <div
                    className={`h-full rounded-full transition-all ${meterTone(percent)}`}
                    style={{ width: `${percent}%` }}
                  />
                  {/* Marker for the ideal 50% target. */}
                  <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-zinc-400 dark:bg-zinc-500" />
                </div>
                <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
                  <span className="font-mono text-base font-bold text-zinc-900 dark:text-white">
                    {percent.toFixed(1)}%
                  </span>
                  <span>ideal ≈ 50%</span>
                </div>
              </div>
            </div>

            <div className="grid gap-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40">
              <div className="grid gap-2 font-mono text-xs">
                <p className="break-all text-zinc-500 dark:text-zinc-400">
                  <span className="font-semibold text-zinc-700 dark:text-zinc-200">original </span>
                  {originalOutput}
                </p>
                <p className="break-all text-zinc-500 dark:text-zinc-400">
                  <span className="font-semibold text-zinc-700 dark:text-zinc-200">flipped  </span>
                  {modifiedOutput}
                </p>
              </div>
              <div>
                <h3 className="mb-3 text-sm font-semibold text-zinc-700 dark:text-zinc-200">
                  Byte heatmap
                  <span className="ml-2 font-normal text-zinc-500 dark:text-zinc-400">
                    (highlighted = changed)
                  </span>
                </h3>
                <ByteHeatmap bytes={cells} label="Output byte diff heatmap" />
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  )
}
