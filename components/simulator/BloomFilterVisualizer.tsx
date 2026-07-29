'use client'

import { useState, useMemo } from 'react'
import { BloomFilterEngine, type TestResult, type InsertResult } from '@/lib/simulator/bloomFilter'
import { BLOOM_FILTER_PRESETS, explainBloomFilterConcept } from '@/lib/simulator/bloomFilterTrace'

export default function BloomFilterVisualizer() {
  const [size, setSize] = useState(64)
  const [numHashes, setNumHashes] = useState(3)
  const [element, setElement] = useState('phishing-bank-login.com')
  const [activeHits, setActiveHits] = useState<number[]>([])
  const [lastActionResult, setLastActionResult] = useState<
    ({ type: 'insert'; res: InsertResult } | { type: 'test'; res: TestResult }) | null
  >(null)
  const [error, setError] = useState<string | null>(null)

  // Instantiate engine with current config
  const engine = useMemo(() => {
    return new BloomFilterEngine({ size, numHashes })
  }, [size, numHashes])

  // Track state in React
  const [bits, setBits] = useState<number[]>(() => engine.getBits())
  const [insertedList, setInsertedList] = useState<string[]>(() => engine.getInsertedElements())

  function syncState() {
    setBits(engine.getBits())
    setInsertedList(engine.getInsertedElements())
  }

  function handleInsert() {
    if (!element.trim()) {
      setError('Please enter an element to insert.')
      return
    }
    setError(null)
    try {
      const res = engine.insert(element.trim())
      syncState()
      setActiveHits(res.hits.map((h) => h.bitIndex))
      setLastActionResult({ type: 'insert', res })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Insertion failed.')
    }
  }

  function handleTest() {
    if (!element.trim()) {
      setError('Please enter an element to test.')
      return
    }
    setError(null)
    try {
      const res = engine.test(element.trim())
      syncState()
      setActiveHits(res.hits.map((h) => h.bitIndex))
      setLastActionResult({ type: 'test', res })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Testing failed.')
    }
  }

  function handleClear() {
    engine.clear()
    syncState()
    setActiveHits([])
    setLastActionResult(null)
    setError(null)
  }

  function applyPreset(presetIndex: number) {
    const preset = BLOOM_FILTER_PRESETS[presetIndex]
    if (!preset) return
    setSize(preset.size)
    setNumHashes(preset.numHashes)
    engine.resize({ size: preset.size, numHashes: preset.numHashes })
    preset.initialElements.forEach((el) => engine.insert(el))
    syncState()
    setActiveHits([])
    setLastActionResult(null)
    setError(null)
    if (preset.testElements.length > 0) {
      setElement(preset.testElements[0].element)
    }
  }

  const stats = engine.getStats()
  const conceptSteps = explainBloomFilterConcept()

  return (
    <div className="space-y-6">
      {/* Parameter & Action Control Card */}
      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-xs transition-colors dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-4 flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Bloom Filter Simulator Controls</h2>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Presets:</span>
            {BLOOM_FILTER_PRESETS.map((preset, idx) => (
              <button
                key={idx}
                onClick={() => applyPreset(idx)}
                className="rounded-md border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
              >
                {preset.name}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2 lg:col-span-2">
            <label htmlFor="bloomElement" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Target Element / Value
            </label>
            <input
              id="bloomElement"
              type="text"
              className="w-full rounded-lg border border-zinc-300 bg-white px-3.5 py-2 text-sm text-zinc-900 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
              value={element}
              onChange={(e) => setElement(e.target.value)}
              placeholder="e.g. url, ip, address, username"
            />
          </div>

          <div>
            <label htmlFor="arraySize" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Bit Array Size m: <span className="font-mono font-bold text-teal-600 dark:text-teal-400">{size} bits</span>
            </label>
            <input
              id="arraySize"
              type="range"
              min={16}
              max={128}
              step={16}
              className="w-full accent-teal-600 dark:accent-teal-400"
              value={size}
              onChange={(e) => {
                const s = Number(e.target.value)
                setSize(s)
                engine.resize({ size: s, numHashes })
                syncState()
                setActiveHits([])
                setLastActionResult(null)
              }}
            />
          </div>

          <div>
            <label htmlFor="numHashes" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Hash Functions k: <span className="font-mono font-bold text-teal-600 dark:text-teal-400">{numHashes}</span>
            </label>
            <input
              id="numHashes"
              type="range"
              min={1}
              max={8}
              step={1}
              className="w-full accent-teal-600 dark:accent-teal-400"
              value={numHashes}
              onChange={(e) => {
                const k = Number(e.target.value)
                setNumHashes(k)
                engine.resize({ size, numHashes: k })
                syncState()
                setActiveHits([])
                setLastActionResult(null)
              }}
            />
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            onClick={handleInsert}
            className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-teal-700 dark:bg-teal-500 dark:hover:bg-teal-400"
          >
            Insert Element
          </button>
          <button
            onClick={handleTest}
            className="rounded-lg border border-teal-600 bg-teal-50 px-4 py-2 text-sm font-semibold text-teal-700 hover:bg-teal-100 dark:border-teal-500 dark:bg-teal-950/40 dark:text-teal-300 dark:hover:bg-teal-900/50"
          >
            Query / Test Element
          </button>
          <button
            onClick={handleClear}
            className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
          >
            Reset Filter
          </button>
        </div>

        {error && <p className="mt-3 text-sm font-medium text-red-600 dark:text-red-400">{error}</p>}
      </div>

      {/* Bit Array Visualizer Grid */}
      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
            Bit Array View <span className="text-xs font-normal text-zinc-500">({bits.length} bits)</span>
          </h2>
          <div className="flex items-center gap-4 text-xs font-medium">
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-xs border border-zinc-300 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800"></span>
              Bit = 0
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-xs bg-teal-600 dark:bg-teal-500"></span>
              Bit = 1
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-xs bg-amber-500 ring-2 ring-amber-400"></span>
              Active Hash Hit
            </span>
          </div>
        </div>

        <div className="grid grid-cols-8 gap-2 sm:grid-cols-12 md:grid-cols-16">
          {bits.map((bitVal, idx) => {
            const isHit = activeHits.includes(idx)
            return (
              <div
                key={idx}
                className={`relative flex flex-col items-center justify-center rounded-lg border py-2 font-mono text-xs transition-all ${
                  isHit
                    ? 'border-amber-500 bg-amber-50 text-amber-900 ring-2 ring-amber-400 dark:border-amber-400 dark:bg-amber-950/60 dark:text-amber-200'
                    : bitVal === 1
                    ? 'border-teal-600 bg-teal-600 text-white dark:border-teal-500 dark:bg-teal-500'
                    : 'border-zinc-200 bg-zinc-50 text-zinc-400 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-600'
                }`}
              >
                <span className="text-[10px] opacity-70">#{idx}</span>
                <span className="text-sm font-bold">{bitVal}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Query / Action Result Display */}
      {lastActionResult && (
        <div
          className={`rounded-xl border p-6 shadow-xs ${
            lastActionResult.type === 'insert'
              ? 'border-teal-300 bg-teal-50/70 dark:border-teal-900/80 dark:bg-teal-950/20'
              : lastActionResult.res.isPresent
              ? 'border-emerald-300 bg-emerald-50/70 dark:border-emerald-900/80 dark:bg-emerald-950/20'
              : 'border-rose-300 bg-rose-50/70 dark:border-rose-900/80 dark:bg-rose-950/20'
          }`}
        >
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
              {lastActionResult.type === 'insert' ? 'Element Inserted' : 'Membership Test Result'}
            </h3>
            {lastActionResult.type === 'test' && (
              <span
                className={`rounded-full px-3 py-1 text-xs font-bold ${
                  lastActionResult.res.isPresent
                    ? 'bg-emerald-200 text-emerald-900 dark:bg-emerald-900 dark:text-emerald-200'
                    : 'bg-rose-200 text-rose-900 dark:bg-rose-900 dark:text-rose-200'
                }`}
              >
                {lastActionResult.res.isPresent ? 'POSSIBLY IN SET (All bits = 1)' : 'DEFINITELY NOT IN SET (Some bits = 0)'}
              </span>
            )}
          </div>

          <p className="mb-3 text-sm text-zinc-700 dark:text-zinc-300">
            Element: <code className="font-bold text-zinc-900 dark:text-white">&quot;{lastActionResult.res.element}&quot;</code>
          </p>

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Computed Hash Indices:
            </p>
            <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
              {lastActionResult.res.hits.map((hit, hIdx) => (
                <div
                  key={hIdx}
                  className="rounded-lg border border-zinc-200 bg-white p-2.5 text-xs font-mono dark:border-zinc-800 dark:bg-zinc-900"
                >
                  <span className="text-zinc-500">h_{hit.hashIndex + 1}(x) mod m = </span>
                  <span className="font-bold text-teal-600 dark:text-teal-400">#{hit.bitIndex}</span>
                  <span className="ml-2 text-[11px] text-zinc-400">
                    ({hit.wasAlreadySet ? 'bit was 1' : 'bit set to 1'})
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Real-time Statistics & Math Panel */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
          <h3 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">Filter Performance Metrics</h3>
          <div className="space-y-3 font-mono text-sm">
            <div className="flex justify-between border-b border-zinc-100 pb-2 dark:border-zinc-800">
              <span className="text-zinc-600 dark:text-zinc-400">Inserted Elements (n):</span>
              <span className="font-bold text-zinc-900 dark:text-white">{stats.elementsInserted}</span>
            </div>
            <div className="flex justify-between border-b border-zinc-100 pb-2 dark:border-zinc-800">
              <span className="text-zinc-600 dark:text-zinc-400">Bits Set to 1:</span>
              <span className="font-bold text-zinc-900 dark:text-white">
                {stats.bitsSet} / {stats.size} ({(stats.saturationRatio * 100).toFixed(1)}%)
              </span>
            </div>
            <div className="flex justify-between border-b border-zinc-100 pb-2 dark:border-zinc-800">
              <span className="text-zinc-600 dark:text-zinc-400">Theoretical False Positive Rate (p):</span>
              <span className="font-bold text-teal-600 dark:text-teal-400">
                {(stats.theoreticalFalsePositiveRate * 100).toFixed(2)}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-600 dark:text-zinc-400">Optimal Hash Count (k_opt):</span>
              <span className="font-bold text-zinc-900 dark:text-white">{stats.optimalNumHashes}</span>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
          <h3 className="mb-3 text-lg font-semibold text-zinc-900 dark:text-white">
            Inserted Elements ({insertedList.length})
          </h3>
          {insertedList.length === 0 ? (
            <p className="text-sm italic text-zinc-500 dark:text-zinc-400">No elements inserted yet.</p>
          ) : (
            <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto pr-1">
              {insertedList.map((item, idx) => (
                <span
                  key={idx}
                  className="rounded-md border border-zinc-200 bg-zinc-50 px-2.5 py-1 font-mono text-xs font-medium text-zinc-800 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200"
                >
                  {item}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Educational Concept Section */}
      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
        <h3 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">How Bloom Filters Work</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          {conceptSteps.map((step, idx) => (
            <div key={idx} className="rounded-lg border border-zinc-100 bg-zinc-50 p-4 dark:border-zinc-800/60 dark:bg-zinc-950/40">
              <h4 className="text-sm font-semibold text-teal-600 dark:text-teal-400">{step.title}</h4>
              <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
