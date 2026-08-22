'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { sharedCipherPool } from '@/lib/workers/sharedPool'

import {
  generatePbkdf2MicroTrace,
  estimateOfflineCrackYears,
  estimatePbkdf2CostComparison,
  OWASP_MIN_ITERATIONS,
  type Pbkdf2Hash,
  type Pbkdf2MicroTrace,
  type Pbkdf2MicroTraceStep,
  describePbkdf2Stages,
  type Pbkdf2StageStep,
} from '@/lib/kdf/pbkdf2Trace'

import type { WorkerRequest } from '@/types/worker'

function randomSaltHex(
  bytes = 16,
): string {
  const arr =
    crypto.getRandomValues(
      new Uint8Array(bytes),
    )

  return Array.from(arr)
    .map((byte) =>
      byte
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')
}

async function deriveKeyViaWorker(
  password: string,
  params: {
    iterations: number
    hash: Pbkdf2Hash
    keyLength: number
    salt: string
  },
): Promise<{
  derivedKeyHex: string
  saltHex: string
}> {
  const message: WorkerRequest = {
    type: 'EXECUTE',
    requestId: crypto.randomUUID(),
    payload: {
      type: 'encrypt',
      cipherId: 'pbkdf2',
      input: password,
      key: '',
      options: params,
    },
  }

  const response =
    (await sharedCipherPool.execute(
      message,
    )) as {
      success: boolean
      payload: {
        result?: {
          derivedKeyHex: string
          saltHex: string
        }
        error?: string
      }
    }

  if (
    response.success === false
  ) {
    throw new Error(
      response.payload.error ??
        'KDF derivation failed.',
    )
  }

  return response.payload.result as {
    derivedKeyHex: string
    saltHex: string
  }
}

function formatHexPreview(
  value: string,
  visibleBytes = 16,
): string {
  const visibleCharacters =
    visibleBytes * 2

  if (
    value.length <=
    visibleCharacters
  ) {
    return value
  }

  return `${value.slice(
    0,
    visibleCharacters,
  )}…`
}

function HexValue({
  label,
  value,
  accent = 'default',
}: {
  label: string
  value: string
  accent?: 'default' | 'teal' | 'purple' | 'orange'
}) {
  const accentClass =
    accent === 'teal'
      ? 'text-teal-600 dark:text-teal-400'
      : accent === 'purple'
        ? 'text-purple-600 dark:text-purple-400'
        : accent === 'orange'
          ? 'text-orange-600 dark:text-orange-400'
          : 'text-zinc-700 dark:text-zinc-300'

  return (
    <div className="min-w-0">
      <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
        {label}
      </p>

      <code
        className={`block overflow-x-auto whitespace-nowrap rounded-lg bg-zinc-100 px-3 py-2 font-mono text-[11px] leading-5 ${accentClass} dark:bg-zinc-900`}
      >
        {value}
      </code>
    </div>
  )
}

function XorExpression({
  step,
}: {
  step: Pbkdf2MicroTraceStep
}) {
  return (
    <div className="rounded-xl border border-zinc-200/70 bg-zinc-50 p-4 dark:border-zinc-800/70 dark:bg-zinc-900/50">
      <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
        <span className="rounded-md bg-zinc-200 px-2 py-1 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
          {step.round === 1
            ? 'A1 = U1'
            : `A${step.round} = A${step.round - 1} ⊕ U${step.round}`}
        </span>

        {step.round > 1 && (
          <>
            <span className="text-zinc-400">
              →
            </span>

            <span className="rounded-md bg-teal-500/10 px-2 py-1 font-mono text-teal-700 dark:text-teal-400">
              XOR
            </span>

            <span className="text-zinc-400">
              →
            </span>
          </>
        )}

        <span className="rounded-md bg-emerald-500/10 px-2 py-1 text-emerald-700 dark:text-emerald-400">
          {`A${step.round}`}
        </span>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {step.round > 1 && (
          <HexValue
            label="Accumulator before"
            value={formatHexPreview(
              step.accumulatorBeforeHex,
            )}
            accent="purple"
          />
        )}

        <HexValue
          label="Accumulator after"
          value={formatHexPreview(
            step.accumulatorAfterHex,
          )}
          accent="teal"
        />
      </div>

      <p className="mt-3 text-[11px] leading-5 text-zinc-500 dark:text-zinc-500">
        {step.round === 1
          ? 'The first accumulator is simply U1.'
          : `${step.xorChangedBytes.length} of ${step.uHex.length / 2} bytes changed after the XOR operation.`}
      </p>
    </div>
  )
}

function MicroTraceStepCard({
  step,
  active,
}: {
  step: Pbkdf2MicroTraceStep
  active: boolean
}) {
  return (
    <article
      className={`rounded-2xl border transition-all ${
        active
          ? 'border-teal-500/50 bg-teal-500/[0.03] shadow-sm'
          : 'border-zinc-200/70 bg-white dark:border-zinc-800/70 dark:bg-zinc-950'
      }`}
    >
      <div className="p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${
                active
                  ? 'bg-teal-500 text-white'
                  : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400'
              }`}
            >
              U{step.round}
            </span>

            <div className="min-w-0">
              <h4 className="text-sm font-bold text-zinc-900 dark:text-white">
                {step.label}
              </h4>

              <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-500">
                HMAC-{step.round === 1 ? 'initial' : 'chained'} round
              </p>
            </div>
          </div>

          <span className="rounded-full bg-purple-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
            Round {step.round}
          </span>
        </div>

        <div className="mt-4 space-y-3">
          <HexValue
            label={
              step.round === 1
                ? 'HMAC input = Salt || INT(1)'
                : `HMAC input = U${step.round - 1}`
            }
            value={step.hmacInputHex}
            accent="orange"
          />

          <HexValue
            label={`U${step.round} output`}
            value={step.uHex}
            accent="teal"
          />

          <XorExpression step={step} />
        </div>
      </div>
    </article>
  )
}

function IterationComparison({
  iterations,
  hash,
}: {
  iterations: number
  hash: Pbkdf2Hash
}) {
  const [comparisonIterations, setComparisonIterations] =
    useState(
      Math.min(
        Math.max(iterations, 10_000),
        600_000,
      ),
    )

  const keyspaceSize =
    2 ** 40

  const tenThousand =
    estimatePbkdf2CostComparison(
      10_000,
      keyspaceSize,
    )

  const sixHundredThousand =
    estimatePbkdf2CostComparison(
      600_000,
      keyspaceSize,
    )

  const selected =
    estimatePbkdf2CostComparison(
      comparisonIterations,
      keyspaceSize,
    )

  const meetsOwasp =
    comparisonIterations >=
    OWASP_MIN_ITERATIONS[hash]

  return (
    <section className="rounded-2xl border border-zinc-200/70 bg-white p-5 shadow-sm dark:border-zinc-800/70 dark:bg-zinc-950">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-orange-500">
            Work-factor comparison
          </p>

          <h3 className="mt-1 text-lg font-bold text-zinc-900 dark:text-white">
            Why iteration count matters
          </h3>

          <p className="mt-1 max-w-2xl text-sm leading-6 text-zinc-500 dark:text-zinc-400">
            The same password guess becomes more expensive as the
            PBKDF2 iteration count increases. This uses an illustrative
            GPU rate of 1,000,000 guesses/sec at one iteration.
          </p>
        </div>

        <span
          className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${
            meetsOwasp
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
              : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
          }`}
        >
          {meetsOwasp
            ? `Meets ${hash} guidance`
            : `Below ${hash} guidance`}
        </span>
      </div>

      <div className="mt-6">
        <label
          htmlFor="pbkdf2-cost-slider"
          className="flex items-center justify-between gap-3 text-sm font-semibold text-zinc-700 dark:text-zinc-300"
        >
          <span>
            Simulated iterations
          </span>

          <span className="font-mono text-teal-600 dark:text-teal-400">
            {comparisonIterations.toLocaleString()}
          </span>
        </label>

        <input
          id="pbkdf2-cost-slider"
          type="range"
          min={10_000}
          max={600_000}
          step={10_000}
          value={comparisonIterations}
          onChange={(event) =>
            setComparisonIterations(
              Number(event.target.value),
            )
          }
          className="mt-3 w-full accent-teal-500"
        />

        <div className="mt-1 flex justify-between text-[11px] text-zinc-400">
          <span>10,000</span>
          <span>600,000</span>
        </div>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-3">
        {[
          {
            label: '10,000 iterations',
            data: tenThousand,
          },
          {
            label: 'Selected',
            data: selected,
          },
          {
            label: '600,000 iterations',
            data: sixHundredThousand,
          },
        ].map(({ label, data }) => (
          <div
            key={label}
            className="rounded-xl border border-zinc-200/70 bg-zinc-50 p-4 dark:border-zinc-800/70 dark:bg-zinc-900/50"
          >
            <p className="text-xs font-bold text-zinc-500 dark:text-zinc-400">
              {label}
            </p>

            <p className="mt-2 font-mono text-lg font-bold text-zinc-900 dark:text-white">
              {data.effectiveGuessesPerSecond >= 1
                ? `${data.effectiveGuessesPerSecond.toLocaleString(undefined, {
                    maximumFractionDigits: 2,
                  })}/s`
                : `${data.effectiveGuessesPerSecond.toFixed(2)}/s`}
            </p>

            <p className="mt-1 text-[11px] leading-5 text-zinc-500 dark:text-zinc-500">
              Illustrative effective password guesses/sec
            </p>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-xl border border-teal-500/20 bg-teal-500/[0.04] p-4">
        <p className="text-xs font-bold uppercase tracking-wider text-teal-700 dark:text-teal-400">
          Security takeaway
        </p>

        <p className="mt-1 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
          Moving from 10,000 to 600,000 iterations increases the
          modeled per-guess work factor by{' '}
          <strong className="text-zinc-900 dark:text-white">
            60×
          </strong>
          . PBKDF2 deliberately makes every password guess more
          expensive.
        </p>
      </div>
    </section>
  )
}

function MicroTrace({
  trace,
  activeStep,
  setActiveStep,
}: {
  trace: Pbkdf2MicroTrace
  activeStep: number
  setActiveStep: (
    value: number,
  ) => void
}) {
  const active =
    trace.steps[activeStep]

  return (
    <section className="rounded-2xl border border-zinc-200/70 bg-white shadow-sm dark:border-zinc-800/70 dark:bg-zinc-950">
      <div className="border-b border-zinc-200/70 p-5 dark:border-zinc-800/70">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-teal-600 dark:text-teal-400">
              Mathematical micro-trace
            </p>

            <h2 className="mt-1 text-xl font-bold text-zinc-900 dark:text-white">
              HMAC chaining & XOR accumulator
            </h2>

            <p className="mt-1 max-w-3xl text-sm leading-6 text-zinc-500 dark:text-zinc-400">
              Follow the first five PBKDF2 rounds. Each HMAC output becomes
              the next round's input, while every U value is XORed into the
              running accumulator.
            </p>
          </div>

          <span className="shrink-0 rounded-full bg-teal-500/10 px-3 py-1.5 text-xs font-semibold text-teal-700 dark:text-teal-400">
            {trace.hash} · {trace.sampleIterations} rounds
          </span>
        </div>
      </div>

      <div className="p-5">
        <div className="overflow-x-auto">
          <div className="flex min-w-[640px] items-center gap-2">
            {trace.steps.map((step, index) => (
              <div
                key={step.round}
                className="flex flex-1 items-center gap-2"
              >
                <button
                  type="button"
                  onClick={() =>
                    setActiveStep(index)
                  }
                  aria-current={
                    activeStep === index
                      ? 'step'
                      : undefined
                  }
                  className={`min-w-0 flex-1 rounded-xl border px-3 py-3 text-left transition-colors ${
                    activeStep === index
                      ? 'border-teal-500 bg-teal-500/5'
                      : 'border-zinc-200 hover:border-teal-300 dark:border-zinc-800 dark:hover:border-teal-700'
                  }`}
                >
                  <p className="text-xs font-bold text-zinc-500 dark:text-zinc-400">
                    U{step.round}
                  </p>

                  <p className="mt-1 truncate text-xs font-semibold text-zinc-900 dark:text-white">
                    HMAC
                  </p>
                </button>

                {index <
                  trace.steps.length - 1 && (
                  <span
                    aria-hidden="true"
                    className="shrink-0 text-zinc-300 dark:text-zinc-700"
                  >
                    →
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {active && (
          <div className="mt-5">
            <MicroTraceStepCard
              step={active}
              active
            />
          </div>
        )}

        <div className="mt-5 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() =>
              setActiveStep(
                Math.max(
                  activeStep - 1,
                  0,
                ),
              )
            }
            disabled={activeStep === 0}
            className="rounded-lg border border-zinc-200 px-3 py-2 text-xs font-semibold text-zinc-700 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900"
          >
            ← Previous
          </button>

          <p className="text-xs font-medium text-zinc-500">
            Step {activeStep + 1} of{' '}
            {trace.steps.length}
          </p>

          <button
            type="button"
            onClick={() =>
              setActiveStep(
                Math.min(
                  activeStep + 1,
                  trace.steps.length - 1,
                ),
              )
            }
            disabled={
              activeStep ===
              trace.steps.length - 1
            }
            className="rounded-lg bg-teal-500 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-teal-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next →
          </button>
        </div>

        <div className="mt-5 rounded-xl border border-zinc-200/70 bg-zinc-50 p-4 dark:border-zinc-800/70 dark:bg-zinc-900/50">
          <p className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Final micro-trace accumulator
          </p>

          <code className="mt-2 block overflow-x-auto whitespace-nowrap font-mono text-xs leading-6 text-teal-700 dark:text-teal-400">
            {trace.finalAccumulatorHex}
          </code>

          <p className="mt-2 text-xs leading-5 text-zinc-500 dark:text-zinc-500">
            This is the five-round teaching trace. The actual derived key
            above is still produced using the configured full iteration
            count through the existing worker.
          </p>
        </div>
      </div>
    </section>
  )
}

export default function Pbkdf2Visualizer() {
  const [password, setPassword] = useState('correct horse battery staple')
  const [iterations, setIterations] = useState(600_000)
  const [hash, setHash] = useState<'SHA-256' | 'SHA-512'>('SHA-256')
  const [keyLength, setKeyLength] = useState<16 | 24 | 32>(32)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [stages, setStages] = useState<Pbkdf2StageStep[]>([])
  const [derivedKeyHex, setDerivedKeyHex] = useState<string | null>(null)
  const [saltHex, setSaltHex] = useState<string | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Clear sensitive state on component unmount
  useEffect(() => {
    return () => {
      // Abort any pending KDF operations
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      // Clear password state
      setPassword('')
      // Clear derived key material
      setDerivedKeyHex(null)
      setSaltHex(null)
      // Clear dependent output
      setStages([])
      setError(null)
    }
  }, [])

  async function handleDerive() {
    setError(null)
    setTraceError(null)
    setLoading(true)
    setDerivedKeyHex(null)
    
    // Abort any previous derivation
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    
    const controller = new AbortController()
    abortControllerRef.current = controller
    
    try {
      const salt = randomSaltHex()
      const { derivedKeyHex: keyHex } = await deriveKeyViaWorker(password, { iterations, hash, keyLength, salt })
      
      if (!controller.signal.aborted) {
        setSaltHex(salt)
        setDerivedKeyHex(keyHex)
        setStages(describePbkdf2Stages({ passwordLength: password.length, saltHex: salt, iterations, hash, keyLength }))
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return
      }
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null
      }
      setLoading(false)
    }
  }

  const handleClearPassword = useCallback(() => {
    setPassword('')
    // Clear derived key material
    setDerivedKeyHex(null)
    setSaltHex(null)
    // Clear dependent output
    setStages([])
    setError(null)
    // Abort any pending operations
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
  }, [])

  const meetsOwasp = iterations >= OWASP_MIN_ITERATIONS[hash]
  const crackYears = estimateOfflineCrackYears(iterations, 2 ** 40) // demo: assumes a 40-bit-strength password

  return (
    <div className="space-y-6">
      {/* Existing PBKDF2 controls */}
      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-4">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-teal-600 dark:text-teal-400">
            PBKDF2 laboratory
          </p>

          <h2 className="mt-1 text-lg font-semibold text-zinc-900 dark:text-white">
            Derive a key with PBKDF2
          </h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Password</label>
              <button
                type="button"
                onClick={handleClearPassword}
                aria-label="Clear password"
                className="text-xs font-medium text-teal-600 hover:text-teal-700 dark:text-teal-400 dark:hover:text-teal-300 transition-colors"
              >
                Clear Password
              </button>
            </div>
            <input
              id="password"
              type="text"
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition-colors focus:border-teal-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
              value={password}
              onChange={(event) =>
                setPassword(
                  event.target.value,
                )
              }
            />
          </div>

          <div>
            <label
              htmlFor="iterations"
              className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Iterations
            </label>

            <input
              id="iterations"
              type="number"
              min={10_000}
              step={10_000}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-teal-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
              value={iterations}
              onChange={(event) =>
                setIterations(
                  Math.max(
                    10_000,
                    Number(
                      event.target.value,
                    ),
                  ),
                )
              }
            />

            <p
              className={`mt-1 text-xs ${
                meetsOwasp
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-amber-600 dark:text-amber-400'
              }`}
            >
              {meetsOwasp
                ? 'Meets current OWASP guidance'
                : `Below OWASP recommendation (${OWASP_MIN_ITERATIONS[
                    hash
                  ].toLocaleString()})`}
            </p>
          </div>

          <div>
            <label
              htmlFor="hash"
              className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Hash
            </label>

            <select
              id="hash"
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-teal-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
              value={hash}
              onChange={(event) =>
                setHash(
                  event.target
                    .value as Pbkdf2Hash,
                )
              }
            >
              <option value="SHA-256">
                SHA-256
              </option>

              <option value="SHA-512">
                SHA-512
              </option>
            </select>
          </div>

          <div>
            <label
              htmlFor="keyLength"
              className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Key length
            </label>

            <select
              id="keyLength"
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-teal-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
              value={keyLength}
              onChange={(event) =>
                setKeyLength(
                  Number(
                    event.target.value,
                  ) as 16 | 24 | 32,
                )
              }
            >
              <option value={16}>
                16 bytes (AES-128)
              </option>

              <option value={24}>
                24 bytes (AES-192)
              </option>

              <option value={32}>
                32 bytes (AES-256)
              </option>
            </select>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleDerive}
            disabled={loading}
            className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-teal-500 dark:hover:bg-teal-400"
          >
            {loading
              ? 'Deriving…'
              : 'Derive key'}
          </button>

          <button
            type="button"
            onClick={regenerateMicroTrace}
            disabled={traceLoading}
            className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900"
          >
            {traceLoading
              ? 'Tracing…'
              : 'Generate 5-round trace'}
          </button>
        </div>

        {error && (
          <p
            role="alert"
            className="mt-3 text-sm text-red-600 dark:text-red-400"
          >
            {error}
          </p>
        )}
      </section>

      {/* Existing descriptive stages, now reflecting the actual algorithm */}
      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-3 text-lg font-semibold text-zinc-900 dark:text-white">
          Derivation stages
        </h2>

        <ol className="space-y-3">
          {stageSummary.map(
            (step, index) => (
              <li
                key={`stage-${index}-${step.label}`}
                className="border-l-2 border-teal-500 pl-3"
              >
                <p className="text-sm font-medium text-zinc-900 dark:text-white">
                  {step.label}
                </p>

                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  {step.detail}
                </p>
              </li>
            ),
          )}
        </ol>
      </section>

      {/* Actual mathematical trace */}
      {microTrace && (
        <MicroTrace
          trace={microTrace}
          activeStep={activeTraceStep}
          setActiveStep={
            setActiveTraceStep
          }
        />
      )}

      {traceError && (
        <p
          role="alert"
          className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-600 dark:text-red-400"
        >
          {traceError}
        </p>
      )}

      {/* Iteration cost visualization */}
      <IterationComparison
        iterations={iterations}
        hash={hash}
      />

      {/* Production result */}
      {derivedKeyHex && (
        <section className="rounded-2xl border border-emerald-300 bg-emerald-50 p-5 shadow-sm dark:border-emerald-900 dark:bg-emerald-950/30">
          <h2 className="mb-2 text-lg font-semibold text-zinc-900 dark:text-white">
            Result
          </h2>

          <p className="break-all text-sm text-zinc-700 dark:text-zinc-300">
            Salt:{' '}
            <code>{saltHex}</code>
          </p>

          <p className="break-all text-sm text-zinc-700 dark:text-zinc-300">
            Derived key:{' '}
            <code>
              {derivedKeyHex}
            </code>
          </p>

          <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-500">
            Illustrative offline brute-force estimate for a
            ~40-bit-strength password at these iterations: ~
            {crackYears < 1
              ? crackYears.toFixed(4)
              : crackYears.toFixed(0)}{' '}
            GPU-years. This is an order-of-magnitude teaching model,
            not a security guarantee.
          </p>
        </section>
      )}
    </div>
  )
}