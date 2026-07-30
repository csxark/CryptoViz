'use client'

import { useCallback, useMemo, useState, useSyncExternalStore } from 'react'
import { formatBase32, generateBase32Secret } from '@/lib/otp/base32'
import {
  generateHotpInstrumented,
  type HotpResult,
  type OtpAlgorithm,
} from '@/lib/otp/hotp'
import {
  generateTotpInstrumented,
  otpauthUri,
  verifyTotp,
  type TotpResult,
  type TotpVerifyResult,
} from '@/lib/otp/totp'

/** A stable demo secret so the page shows something meaningful before any input. */
const DEMO_SECRET = 'JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP'

const ALGORITHMS: OtpAlgorithm[] = ['SHA1', 'SHA256', 'SHA512']
const DIGIT_CHOICES = [6, 7, 8]
const PERIOD_CHOICES = [15, 30, 60]

const CARD =
  'rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900'
const HEADING = 'mb-3 text-lg font-semibold text-zinc-900 dark:text-white'
const MUTED = 'text-sm text-zinc-600 dark:text-zinc-400'
const INPUT =
  'rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white'
const BUTTON =
  'rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-700 dark:bg-teal-500 dark:hover:bg-teal-400'
const BUTTON_SECONDARY =
  'rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800'

type Mode = 'totp' | 'hotp'

/** Split a hex string into byte pairs so individual bytes can be highlighted. */
function toByteArray(hex: string): string[] {
  const bytes: string[] = []
  for (let i = 0; i < hex.length; i += 2) bytes.push(hex.slice(i, i + 2))
  return bytes
}

/* --------------------------------------------------------------------------
 * The wall clock is an external store rather than effect-driven state. The
 * static export has no clock at build time, so the server snapshot is null and
 * the UI renders a placeholder until hydration hands over a real second.
 * -------------------------------------------------------------------------- */

function subscribeToClock(onChange: () => void): () => void {
  const timer = setInterval(onChange, 1000)
  return () => clearInterval(timer)
}

/** Whole Unix seconds. Stable within a second, so it is a valid snapshot. */
function getClockSnapshot(): number {
  return Math.floor(Date.now() / 1000)
}

function getServerClockSnapshot(): null {
  return null
}

export default function TotpVisualizer() {
  const [mode, setMode] = useState<Mode>('totp')
  const [secret, setSecret] = useState(DEMO_SECRET)
  const [algorithm, setAlgorithm] = useState<OtpAlgorithm>('SHA1')
  const [digits, setDigits] = useState(6)
  const [period, setPeriod] = useState(30)
  const [counter, setCounter] = useState(0)
  const [skewSeconds, setSkewSeconds] = useState(0)

  const [codeToVerify, setCodeToVerify] = useState('')
  const [verifyWindow, setVerifyWindow] = useState(1)
  const [verification, setVerification] = useState<TotpVerifyResult | null>(null)

  // Null until hydration, so the prerendered HTML and the first client render agree.
  const now = useSyncExternalStore<number | null>(
    subscribeToClock,
    getClockSnapshot,
    getServerClockSnapshot
  )

  const options = useMemo(
    () => ({ digits, algorithm, period, secretEncoding: 'base32' as const }),
    [digits, algorithm, period]
  )

  /** The client's apparent clock — server time plus whatever skew is dialled in. */
  const clientTime = now === null ? null : now + skewSeconds

  const { result, error } = useMemo((): {
    result: TotpResult | HotpResult | null
    error: string | null
  } => {
    try {
      if (mode === 'hotp') {
        return { result: generateHotpInstrumented(secret, counter, options), error: null }
      }
      if (clientTime === null) return { result: null, error: null }
      return { result: generateTotpInstrumented(secret, clientTime, options), error: null }
    } catch (err) {
      return { result: null, error: err instanceof Error ? err.message : 'Invalid configuration.' }
    }
  }, [mode, secret, counter, clientTime, options])

  const totpResult = mode === 'totp' ? (result as TotpResult | null) : null

  const provisioningUri = useMemo(() => {
    try {
      return otpauthUri({
        secret,
        account: 'learner@cryptoviz.dev',
        issuer: 'CryptoViz',
        digits,
        period,
        algorithm,
      })
    } catch {
      return null
    }
  }, [secret, digits, period, algorithm])

  const runVerification = useCallback(() => {
    if (now === null) return
    try {
      // The verifier keeps true server time; only the client's clock is skewed.
      setVerification(verifyTotp(secret, codeToVerify, now, { ...options, window: verifyWindow }))
    } catch {
      setVerification(null)
    }
  }, [now, secret, codeToVerify, options, verifyWindow])

  const hmacBytes = result ? toByteArray(result.hmacHex) : []
  const truncationWindow = result
    ? [result.offset, result.offset + 1, result.offset + 2, result.offset + 3]
    : []

  const progress = totpResult ? totpResult.secondsRemaining / totpResult.period : 1
  const ringCircumference = 2 * Math.PI * 42

  return (
    <div className="space-y-6">
      {/* ---------------------------------------------------------------- */}
      {/* Configuration                                                     */}
      {/* ---------------------------------------------------------------- */}
      <section className={CARD}>
        <h2 className={HEADING}>Shared secret and parameters</h2>
        <p className={`mb-4 ${MUTED}`}>
          Enrolment hands the same secret to your phone and the server exactly once. After that the
          two never communicate about codes again — they simply compute the same function of the
          same secret and the same clock, and compare results.
        </p>

        <div className="mb-4">
          <label htmlFor="otp-secret" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Base32 secret
          </label>
          <div className="flex flex-wrap gap-2">
            <input
              id="otp-secret"
              className={`flex-1 font-mono ${INPUT}`}
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              spellCheck={false}
            />
            <button onClick={() => setSecret(generateBase32Secret(20))} className={BUTTON_SECONDARY}>
              Generate random
            </button>
          </div>
          <p className={`mt-1 ${MUTED}`}>
            Displayed as <span className="font-mono">{formatBase32(secret)}</span> — the grouped form
            an app shows for manual entry.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label htmlFor="otp-mode" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Mode
            </label>
            <select
              id="otp-mode"
              className={`w-full ${INPUT}`}
              value={mode}
              onChange={(e) => setMode(e.target.value as Mode)}
            >
              <option value="totp">TOTP — time-driven (RFC 6238)</option>
              <option value="hotp">HOTP — counter-driven (RFC 4226)</option>
            </select>
          </div>

          <div>
            <label htmlFor="otp-algorithm" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              HMAC algorithm
            </label>
            <select
              id="otp-algorithm"
              className={`w-full ${INPUT}`}
              value={algorithm}
              onChange={(e) => setAlgorithm(e.target.value as OtpAlgorithm)}
            >
              {ALGORITHMS.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="otp-digits" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Digits
            </label>
            <select
              id="otp-digits"
              className={`w-full ${INPUT}`}
              value={digits}
              onChange={(e) => setDigits(Number(e.target.value))}
            >
              {DIGIT_CHOICES.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          {mode === 'totp' ? (
            <div>
              <label htmlFor="otp-period" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Time step (seconds)
              </label>
              <select
                id="otp-period"
                className={`w-full ${INPUT}`}
                value={period}
                onChange={(e) => setPeriod(Number(e.target.value))}
              >
                {PERIOD_CHOICES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label htmlFor="otp-counter" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Counter
              </label>
              <div className="flex gap-2">
                <input
                  id="otp-counter"
                  type="number"
                  min={0}
                  className={`w-full font-mono ${INPUT}`}
                  value={counter}
                  onChange={(e) => setCounter(Math.max(0, Number(e.target.value)))}
                />
                <button
                  onClick={() => setCounter((c) => c + 1)}
                  className={BUTTON_SECONDARY}
                  aria-label="Increment counter"
                >
                  +1
                </button>
              </div>
            </div>
          )}
        </div>

        {error && (
          <p role="alert" className="mt-3 text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Live code                                                         */}
      {/* ---------------------------------------------------------------- */}
      <section className={CARD}>
        <h2 className={HEADING}>{mode === 'totp' ? 'Current code' : `Code for counter ${counter}`}</h2>

        {result === null ? (
          <p className={MUTED}>Waiting for the clock…</p>
        ) : (
          <div className="flex flex-wrap items-center gap-8">
            {mode === 'totp' && totpResult && (
              <div className="relative h-28 w-28 shrink-0">
                <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" aria-hidden="true">
                  <circle cx="50" cy="50" r="42" className="fill-none stroke-zinc-200 dark:stroke-zinc-800" strokeWidth="8" />
                  <circle
                    cx="50"
                    cy="50"
                    r="42"
                    className={
                      totpResult.secondsRemaining <= 5
                        ? 'fill-none stroke-red-500 transition-[stroke-dashoffset] duration-1000 ease-linear'
                        : 'fill-none stroke-teal-500 transition-[stroke-dashoffset] duration-1000 ease-linear'
                    }
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={ringCircumference}
                    strokeDashoffset={ringCircumference * (1 - progress)}
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-xl font-semibold text-zinc-900 dark:text-white">
                  {totpResult.secondsRemaining}
                </span>
              </div>
            )}

            <div>
              <p
                className="font-mono text-5xl font-bold tracking-[0.2em] text-teal-600 dark:text-teal-400"
                aria-live="polite"
                aria-label={`One-time password ${result.code.split('').join(' ')}`}
              >
                {result.code}
              </p>
              {totpResult && (
                <p className={`mt-2 ${MUTED}`}>
                  Time step T = <span className="font-mono">{totpResult.timeStep}</span> · valid from
                  Unix <span className="font-mono">{totpResult.stepStart}</span> to{' '}
                  <span className="font-mono">{totpResult.stepEnd}</span>
                </p>
              )}
              {mode === 'hotp' && (
                <p className={`mt-2 ${MUTED}`}>
                  This code never expires — it stays valid until the counter advances. That is
                  precisely the weakness TOTP fixes by tying the counter to a clock.
                </p>
              )}
            </div>
          </div>
        )}
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Derivation trace                                                  */}
      {/* ---------------------------------------------------------------- */}
      {result && (
        <section className={CARD}>
          <h2 className={HEADING}>Derivation, step by step</h2>
          <ol className="space-y-4">
            {result.steps.map((step) => (
              <li key={step.index} className="border-l-2 border-teal-500 pl-4">
                <p className="text-sm font-medium text-zinc-900 dark:text-white">
                  <span className="mr-2 font-mono text-xs text-zinc-400">{step.index + 1}.</span>
                  {step.label}
                </p>
                {step.sublabel && (
                  <p className="font-mono text-xs text-zinc-500 dark:text-zinc-500">{step.sublabel}</p>
                )}
                <p className="mt-1 break-all rounded-md bg-zinc-50 p-2 font-mono text-xs text-zinc-700 dark:bg-zinc-950/50 dark:text-zinc-300">
                  {step.value}
                </p>
                <p className={`mt-1 ${MUTED}`}>{step.note}</p>
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* Dynamic truncation byte map                                       */}
      {/* ---------------------------------------------------------------- */}
      {result && result.hmacHex.length > 0 && (
        <section className={CARD}>
          <h2 className={HEADING}>Where the digits come from</h2>
          <p className={`mb-4 ${MUTED}`}>
            The last byte (outlined) chooses the offset; the four bytes at that offset (filled)
            become the code. Change the counter or wait for the step to roll over and watch the
            window jump somewhere else in the digest — that movement is the whole point of dynamic
            truncation.
          </p>

          <div className="flex flex-wrap gap-1">
            {hmacBytes.map((byte, i) => {
              const isWindow = truncationWindow.includes(i)
              const isOffsetByte = i === hmacBytes.length - 1
              return (
                <span
                  key={i}
                  title={`byte ${i}`}
                  className={`rounded px-1.5 py-1 font-mono text-xs ${
                    isWindow
                      ? 'bg-teal-500 text-white'
                      : isOffsetByte
                        ? 'border-2 border-amber-500 bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                        : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                  }`}
                >
                  {byte}
                </span>
              )
            })}
          </div>

          <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              ['Offset byte', `0x${hmacBytes[hmacBytes.length - 1]}`],
              ['Offset', String(result.offset)],
              ['31-bit value', String(result.dynamicBinaryCode)],
              [`mod 10^${result.digits}`, result.code],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-500">
                  {label}
                </dt>
                <dd className="font-mono text-sm text-zinc-900 dark:text-white">{value}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* Clock skew                                                        */}
      {/* ---------------------------------------------------------------- */}
      {mode === 'totp' && (
        <section className={CARD}>
          <h2 className={HEADING}>Clock skew explorer</h2>
          <p className={`mb-4 ${MUTED}`}>
            TOTP trades HOTP&apos;s counter-drift problem for a clock-drift problem. Push the
            client&apos;s clock away from the server&apos;s and watch the code diverge — then verify
            it below and see how the acceptance window rescues small skew and gives up on large skew.
          </p>

          <label htmlFor="otp-skew" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Client clock offset: {skewSeconds > 0 ? '+' : ''}
            {skewSeconds}s
          </label>
          <input
            id="otp-skew"
            type="range"
            min={-120}
            max={120}
            step={5}
            value={skewSeconds}
            onChange={(e) => setSkewSeconds(Number(e.target.value))}
            className="w-full accent-teal-600"
          />

          <div className="mt-3 flex flex-wrap gap-4 text-sm">
            <span className={MUTED}>
              Server step:{' '}
              <span className="font-mono text-zinc-900 dark:text-white">
                {now === null ? '—' : Math.floor(now / period)}
              </span>
            </span>
            <span className={MUTED}>
              Client step:{' '}
              <span className="font-mono text-zinc-900 dark:text-white">
                {totpResult ? totpResult.timeStep : '—'}
              </span>
            </span>
            <span className={MUTED}>
              Steps apart:{' '}
              <span className="font-mono text-zinc-900 dark:text-white">
                {now === null || !totpResult ? '—' : totpResult.timeStep - Math.floor(now / period)}
              </span>
            </span>
          </div>
        </section>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* Verifier                                                          */}
      {/* ---------------------------------------------------------------- */}
      {mode === 'totp' && (
        <section className={CARD}>
          <h2 className={HEADING}>Server-side verification</h2>
          <p className={`mb-4 ${MUTED}`}>
            The verifier below uses true server time. RFC 6238 §5.2 recommends accepting at most one
            step either side — every extra step you allow also widens the window in which a stolen
            code can be replayed.
          </p>

          <div className="mb-4 flex flex-wrap items-end gap-3">
            <div>
              <label htmlFor="otp-verify-code" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Code to verify
              </label>
              <input
                id="otp-verify-code"
                className={`w-40 font-mono ${INPUT}`}
                value={codeToVerify}
                onChange={(e) => setCodeToVerify(e.target.value)}
                placeholder={result?.code ?? '000000'}
                inputMode="numeric"
              />
            </div>

            <div>
              <label htmlFor="otp-verify-window" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Window (± steps)
              </label>
              <input
                id="otp-verify-window"
                type="number"
                min={0}
                max={10}
                className={`w-24 font-mono ${INPUT}`}
                value={verifyWindow}
                onChange={(e) => setVerifyWindow(Math.max(0, Number(e.target.value)))}
              />
            </div>

            <button onClick={runVerification} className={BUTTON}>
              Verify
            </button>
            <button
              onClick={() => setCodeToVerify(result?.code ?? '')}
              className={BUTTON_SECONDARY}
            >
              Use the code above
            </button>
          </div>

          {verification && (
            <div
              role="status"
              className={`rounded-md border p-4 ${
                verification.valid
                  ? 'border-emerald-300 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30'
                  : 'border-red-300 bg-red-50 dark:border-red-900 dark:bg-red-950/30'
              }`}
            >
              <p className="text-sm font-semibold text-zinc-900 dark:text-white">
                {verification.valid ? 'Accepted' : 'Rejected'}
              </p>
              <p className={MUTED}>
                {verification.valid
                  ? `Matched at step ${verification.matchedStep} (${verification.delta === 0 ? 'current step' : `${verification.delta! > 0 ? '+' : ''}${verification.delta} steps, ${verification.driftSeconds}s of apparent client drift`}).`
                  : `No match across the ${verification.searched.length} step(s) searched. Either the code is wrong or the client clock is off by more than ±${verifyWindow} step(s).`}
              </p>
              <p className="mt-1 font-mono text-xs text-zinc-500 dark:text-zinc-500">
                steps tried: {verification.searched.join(', ')}
              </p>
            </div>
          )}
        </section>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* Provisioning URI                                                  */}
      {/* ---------------------------------------------------------------- */}
      {provisioningUri && (
        <section className={CARD}>
          <h2 className={HEADING}>What the enrolment QR code actually contains</h2>
          <p className={`mb-3 ${MUTED}`}>
            The QR code you scan during setup is not doing anything cryptographic — it is a URL
            carrying the shared secret in plaintext. That is why enrolment has to happen over a
            channel you already trust, and why a screenshot of that QR is as good as the secret itself.
          </p>
          <p className="break-all rounded-md bg-zinc-50 p-3 font-mono text-xs text-zinc-700 dark:bg-zinc-950/50 dark:text-zinc-300">
            {provisioningUri}
          </p>
        </section>
      )}
    </div>
  )
}
