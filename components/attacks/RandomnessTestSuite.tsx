'use client'

import { useEffect, useRef, useState } from 'react'
import {
  ALPHA,
  GENERATORS,
  bytesFromHex,
  generatorById,
  lagCorrelation,
  runBattery,
  scatterPairs,
  type BatteryResult,
} from '@/lib/attacks/randomnessTests'

const SAMPLE_SIZES = [
  { bytes: 4096, label: '4 KB' },
  { bytes: 16384, label: '16 KB' },
  { bytes: 65536, label: '64 KB' },
]

const CARD =
  'rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900'
const HEADING = 'mb-3 text-lg font-semibold text-zinc-900 dark:text-white'
const MUTED = 'text-sm text-zinc-600 dark:text-zinc-400'

interface Run {
  generatorId: string
  generatorName: string
  cryptographic: boolean
  bytes: Uint8Array
  battery: BatteryResult
  correlations: { lag: number; r: number }[]
  elapsedMs: number
}

/** Bit-plane: one pixel per bit, so structure is visible to the naked eye. */
function BitPlane({ bytes }: { bytes: Uint8Array }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const context = canvas.getContext('2d')
    if (!context) return

    const size = 128
    const image = context.createImageData(size, size)

    for (let i = 0; i < size * size; i++) {
      const byteIndex = i >> 3
      const bit = byteIndex < bytes.length ? (bytes[byteIndex] >> (7 - (i & 7))) & 1 : 0
      const shade = bit ? 255 : 0
      image.data[i * 4] = shade
      image.data[i * 4 + 1] = shade
      image.data[i * 4 + 2] = shade
      image.data[i * 4 + 3] = 255
    }

    context.putImageData(image, 0, 0)
  }, [bytes])

  return (
    <canvas
      ref={canvasRef}
      width={128}
      height={128}
      className="h-40 w-40 rounded border border-zinc-300 [image-rendering:pixelated] dark:border-zinc-700"
      role="img"
      aria-label="Bit plane: each pixel is one bit of the sample, white for 1 and black for 0. Visible banding or texture indicates structure."
    />
  )
}

/** Scatter of consecutive output pairs — where lattice structure shows up. */
function ScatterPlot({ bytes }: { bytes: Uint8Array }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const context = canvas.getContext('2d')
    if (!context) return

    context.clearRect(0, 0, 256, 256)
    context.fillStyle = 'rgba(20, 184, 166, 0.55)'

    for (const { x, y } of scatterPairs(bytes, 4000)) {
      context.fillRect(x, 255 - y, 1.5, 1.5)
    }
  }, [bytes])

  return (
    <canvas
      ref={canvasRef}
      width={256}
      height={256}
      className="h-40 w-40 rounded border border-zinc-300 bg-white dark:border-zinc-700 dark:bg-zinc-950"
      role="img"
      aria-label="Scatter plot of consecutive output pairs. A uniform cloud indicates no pairwise structure; visible lines or lattice planes indicate a weak generator."
    />
  )
}

export default function RandomnessTestSuite() {
  const [selected, setSelected] = useState<string[]>(['crypto', 'math-random', 'randu', 'alternating'])
  const [sampleSize, setSampleSize] = useState(16384)
  const [customHex, setCustomHex] = useState('')
  const [runs, setRuns] = useState<Run[]>([])
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [detailFor, setDetailFor] = useState<string | null>(null)

  function toggleGenerator(id: string) {
    setSelected((previous) =>
      previous.includes(id) ? previous.filter((g) => g !== id) : [...previous, id]
    )
  }

  async function runTests() {
    setError(null)
    setRunning(true)
    setRuns([])

    const collected: Run[] = []

    try {
      const jobs: { id: string; name: string; cryptographic: boolean; bytes: Uint8Array }[] = []

      for (const id of selected) {
        const generator = generatorById(id)
        jobs.push({
          id,
          name: generator.name,
          cryptographic: generator.cryptographic,
          bytes: generator.generate(sampleSize, 1),
        })
      }

      if (customHex.trim().length > 0) {
        jobs.push({
          id: 'custom',
          name: 'Your hex input',
          cryptographic: false,
          bytes: bytesFromHex(customHex),
        })
      }

      if (jobs.length === 0) {
        setError('Select at least one generator, or paste some hex to test.')
        setRunning(false)
        return
      }

      for (const job of jobs) {
        // Yield between generators so a 64 KB battery never freezes the tab.
        await new Promise((resolve) => setTimeout(resolve, 0))

        const startedAt = performance.now()
        const battery = runBattery(job.bytes)
        const elapsedMs = performance.now() - startedAt

        let correlations: { lag: number; r: number }[] = []
        try {
          correlations = lagCorrelation(job.bytes, 32)
        } catch {
          // Sample too short for autocorrelation; the panel simply stays empty.
        }

        collected.push({
          generatorId: job.id,
          generatorName: job.name,
          cryptographic: job.cryptographic,
          bytes: job.bytes,
          battery,
          correlations,
          elapsedMs,
        })
        setRuns([...collected])
      }

      setDetailFor(collected[0]?.generatorId ?? null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong running the battery.')
    } finally {
      setRunning(false)
    }
  }

  const testIds = runs[0]?.battery.results.map((r) => ({ id: r.id, name: r.name })) ?? []
  const detailRun = runs.find((r) => r.generatorId === detailFor) ?? null

  return (
    <div className="space-y-6">
      {/* ---------------------------------------------------------------- */}
      {/* Configuration                                                     */}
      {/* ---------------------------------------------------------------- */}
      <section className={CARD}>
        <h2 className={HEADING}>Sources to compare</h2>
        <p className={`mb-4 ${MUTED}`}>
          Pick any combination. The interesting result is not that weak generators fail — it is
          that <span className="font-mono">Math.random</span> mostly <em>passes</em>, and is still
          completely unsafe for keys.
        </p>

        <fieldset className="mb-4">
          <legend className="sr-only">Random number generators to test</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {GENERATORS.map((generator) => (
              <label
                key={generator.id}
                className="flex cursor-pointer items-start gap-3 rounded-md border border-zinc-200 p-3 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800/50"
              >
                <input
                  type="checkbox"
                  checked={selected.includes(generator.id)}
                  onChange={() => toggleGenerator(generator.id)}
                  className="mt-1 accent-teal-600"
                />
                <span>
                  <span className="block text-sm font-medium text-zinc-900 dark:text-white">
                    {generator.name}
                    {generator.cryptographic && (
                      <span className="ml-2 rounded bg-emerald-100 px-1.5 py-0.5 text-[11px] font-normal text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
                        CSPRNG
                      </span>
                    )}
                  </span>
                  <span className={MUTED}>{generator.description}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="mb-4">
          <span className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Sample size
          </span>
          <div className="flex flex-wrap gap-2">
            {SAMPLE_SIZES.map((size) => (
              <button
                key={size.bytes}
                onClick={() => setSampleSize(size.bytes)}
                aria-pressed={sampleSize === size.bytes}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  sampleSize === size.bytes
                    ? 'bg-teal-600 text-white dark:bg-teal-500'
                    : 'border border-zinc-300 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800'
                }`}
              >
                {size.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-4">
          <label
            htmlFor="rng-custom-hex"
            className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            Or paste your own hex (optional)
          </label>
          <textarea
            id="rng-custom-hex"
            className="h-20 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 font-mono text-xs text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
            value={customHex}
            onChange={(e) => setCustomHex(e.target.value)}
            placeholder="deadbeef0123…"
            spellCheck={false}
          />
        </div>

        <button
          onClick={runTests}
          disabled={running}
          className="rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-700 disabled:opacity-50 dark:bg-teal-500 dark:hover:bg-teal-400"
        >
          {running ? 'Running…' : 'Run the battery'}
        </button>

        {error && (
          <p role="alert" className="mt-3 text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}
      </section>

      {runs.length > 0 && (
        <>
          {/* -------------------------------------------------------------- */}
          {/* Results matrix                                                  */}
          {/* -------------------------------------------------------------- */}
          <section className={CARD}>
            <h2 className={HEADING}>Results</h2>
            <p className={`mb-4 ${MUTED}`}>
              A test fails when its p-value falls below α = {ALPHA}, the SP 800-22 convention.
              Hover a cell for the statistic and the clause it comes from.
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <caption className="sr-only">
                  p-values for each statistical test across each generator
                </caption>
                <thead className="border-b border-zinc-200 text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:text-zinc-500">
                  <tr>
                    <th scope="col" className="py-2 pr-4">Test</th>
                    {runs.map((run) => (
                      <th key={run.generatorId} scope="col" className="py-2 pr-4">
                        {run.generatorName}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {testIds.map((test) => (
                    <tr key={test.id}>
                      <th scope="row" className="py-2 pr-4 font-normal text-zinc-700 dark:text-zinc-300">
                        {test.name}
                      </th>
                      {runs.map((run) => {
                        const result = run.battery.results.find((r) => r.id === test.id)
                        if (!result) return <td key={run.generatorId} className="py-2 pr-4">—</td>

                        return (
                          <td key={run.generatorId} className="py-2 pr-4">
                            <span
                              title={`${result.clause} · statistic ${result.statistic.toFixed(4)} · ${result.detail}`}
                              className={`inline-block rounded px-2 py-0.5 font-mono text-xs ${
                                result.skipped
                                  ? 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-500'
                                  : result.passed
                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
                                    : 'bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300'
                              }`}
                            >
                              {result.skipped
                                ? 'skipped'
                                : result.pValue < 0.001
                                  ? result.pValue.toExponential(1)
                                  : result.pValue.toFixed(4)}
                            </span>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                  <tr className="font-medium">
                    <th scope="row" className="py-2 pr-4 text-zinc-900 dark:text-white">
                      Passed
                    </th>
                    {runs.map((run) => (
                      <td key={run.generatorId} className="py-2 pr-4 font-mono text-zinc-900 dark:text-white">
                        {run.battery.passedCount}/{run.battery.ranCount}
                        <span className="ml-2 font-normal text-xs text-zinc-500">
                          {run.elapsedMs.toFixed(0)}ms
                        </span>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* -------------------------------------------------------------- */}
          {/* The point                                                       */}
          {/* -------------------------------------------------------------- */}
          <section className="rounded-lg border border-amber-300 bg-amber-50 p-5 dark:border-amber-900 dark:bg-amber-950/30">
            <h2 className={HEADING}>Passing this battery does not make a generator secure</h2>
            <p className={`mb-3 ${MUTED}`}>
              These tests answer one question: <em>is this sample statistically distinguishable
              from uniform?</em> Cryptography needs a different property —{' '}
              <em>can an attacker who has seen past output predict future output?</em> Those are not
              the same question, and no amount of statistical testing answers the second one.
            </p>
            <p className={MUTED}>
              <span className="font-mono">Math.random</span> is the canonical illustration. It is a
              perfectly respectable statistical generator that will likely pass everything above —
              and recovering its internal state from a modest run of observed output is a solved
              problem, after which every future value is known. Only{' '}
              <span className="font-mono">crypto.getRandomValues</span> on this list is fit for
              keys, IVs, nonces or salts.
            </p>
          </section>

          {/* -------------------------------------------------------------- */}
          {/* Structure panels                                                */}
          {/* -------------------------------------------------------------- */}
          <section className={CARD}>
            <h2 className={HEADING}>Visual structure</h2>
            <p className={`mb-4 ${MUTED}`}>
              Some weaknesses are easier to see than to measure. Select a source to inspect its
              bit plane, its consecutive-pair scatter, and its autocorrelation.
            </p>

            <div className="mb-5 flex flex-wrap gap-2">
              {runs.map((run) => (
                <button
                  key={run.generatorId}
                  onClick={() => setDetailFor(run.generatorId)}
                  aria-pressed={detailFor === run.generatorId}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    detailFor === run.generatorId
                      ? 'bg-teal-600 text-white dark:bg-teal-500'
                      : 'border border-zinc-300 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800'
                  }`}
                >
                  {run.generatorName}
                </button>
              ))}
            </div>

            {detailRun && (
              <>
                <div className="mb-6 flex flex-wrap gap-8">
                  <div>
                    <h3 className="mb-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                      Bit plane
                    </h3>
                    <BitPlane bytes={detailRun.bytes} />
                    <p className={`mt-1 max-w-40 text-xs ${MUTED}`}>
                      One pixel per bit. Featureless noise is what you want.
                    </p>
                  </div>

                  <div>
                    <h3 className="mb-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                      Consecutive pairs
                    </h3>
                    <ScatterPlot bytes={detailRun.bytes} />
                    <p className={`mt-1 max-w-40 text-xs ${MUTED}`}>
                      Lines or lattice planes mean the next output is a function of the last.
                    </p>
                  </div>
                </div>

                {detailRun.correlations.length > 0 && (
                  <>
                    <h3 className="mb-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                      Autocorrelation by lag
                    </h3>
                    <div className="flex h-24 items-end gap-0.5">
                      {detailRun.correlations.map(({ lag, r }) => (
                        <div
                          key={lag}
                          title={`lag ${lag}: r = ${r.toFixed(4)}`}
                          className="flex-1"
                          style={{ height: `${Math.min(100, Math.abs(r) * 400 + 2)}%` }}
                        >
                          <div
                            className={`h-full w-full rounded-t ${
                              Math.abs(r) > 0.1 ? 'bg-red-500' : 'bg-teal-500'
                            }`}
                          />
                        </div>
                      ))}
                    </div>
                    <p className={`mt-1 text-xs ${MUTED}`}>
                      Lags 1–32, scaled 4×. Bars turn red above |r| = 0.1.
                    </p>
                  </>
                )}

                <p className={`mt-5 rounded-md bg-zinc-50 p-3 ${MUTED} dark:bg-zinc-950/50`}>
                  {detailRun.battery.verdict}
                </p>
              </>
            )}
          </section>
        </>
      )}
    </div>
  )
}
