/**
 * RFC 6238 — TOTP: Time-Based One-Time Password Algorithm.
 *
 * TOTP is HOTP with the counter replaced by a clock:
 *
 *   T = floor((unixTime − T0) / X)      with T0 = 0 and X = 30 seconds
 *
 * That single substitution removes HOTP's counter-drift problem (a token whose
 * button was pressed too many times) and replaces it with a clock-skew problem
 * (a phone whose time is wrong). Servers therefore accept a small window of
 * adjacent steps — which is why a code sometimes still works a second or two
 * after the ring runs out.
 *
 * Pure module: no DOM APIs, no reads of the ambient clock (the caller supplies
 * the time), typed CipherError on bad input.
 * @see docs/totp-hotp.md
 */

import { CipherError } from '../utils/errors'
import {
  generateHotpFast,
  generateHotpInstrumented,
  type HotpResult,
  type OtpAlgorithm,
  type OtpOptions,
  type OtpStep,
} from './hotp'

/** RFC 6238 §4 default time step, in seconds. */
export const DEFAULT_PERIOD = 30

/** RFC 6238 §4 default epoch offset T0, in seconds. */
export const DEFAULT_T0 = 0

export interface TotpOptions extends OtpOptions {
  /** Time step X in seconds. Default 30. */
  period?: number
  /** Epoch offset T0 in seconds. Default 0 (the Unix epoch). */
  t0?: number
}

export interface TotpResult extends HotpResult {
  /** The time step T that was used as the HOTP counter. */
  timeStep: number
  period: number
  t0: number
  /** Unix second the code was computed for. */
  unixSeconds: number
  /** Unix second this time step began. */
  stepStart: number
  /** Unix second the next time step begins. */
  stepEnd: number
  /** Seconds left before the code rotates. */
  secondsRemaining: number
}

export interface TotpVerifyResult {
  valid: boolean
  /** Time step that produced a match, or null. */
  matchedStep: number | null
  /** Offset in steps from the verifier's own step: −1, 0, +1, … */
  delta: number | null
  /** That offset expressed in seconds, which is the client's apparent clock skew. */
  driftSeconds: number | null
  /** Every step that was tried, in order. */
  searched: number[]
}

export interface OtpauthUriParams {
  secret: string
  /** Account label, usually an email address. */
  account: string
  /** Service name shown above the account in the app. */
  issuer: string
  digits?: number
  period?: number
  algorithm?: OtpAlgorithm
}

function validateTiming(period: number, t0: number, unixSeconds: number): void {
  if (!Number.isInteger(period) || period <= 0) {
    throw new CipherError(
      'INVALID_INPUT',
      `Time step must be a positive integer number of seconds — got ${period}.`
    )
  }
  if (!Number.isFinite(t0)) {
    throw new CipherError('INVALID_INPUT', 'Epoch offset T0 must be a finite number.')
  }
  if (!Number.isFinite(unixSeconds)) {
    throw new CipherError('INVALID_INPUT', 'Unix time must be a finite number of seconds.')
  }
  if (unixSeconds < t0) {
    throw new CipherError(
      'INVALID_INPUT',
      `Unix time ${unixSeconds} precedes the epoch offset T0 = ${t0}, so the time step ` +
        `would be negative.`
    )
  }
}

/** RFC 6238 §4.2: T = floor((unixTime − T0) / X). */
export function timeStepFor(
  unixSeconds: number,
  period = DEFAULT_PERIOD,
  t0 = DEFAULT_T0
): number {
  validateTiming(period, t0, unixSeconds)
  return Math.floor((unixSeconds - t0) / period)
}

/** Unix seconds at which a given time step begins. */
export function stepStartTime(
  timeStep: number,
  period = DEFAULT_PERIOD,
  t0 = DEFAULT_T0
): number {
  return t0 + timeStep * period
}

/** Seconds remaining before the current code rotates. */
export function secondsRemaining(
  unixSeconds: number,
  period = DEFAULT_PERIOD,
  t0 = DEFAULT_T0
): number {
  validateTiming(period, t0, unixSeconds)
  return period - (Math.floor(unixSeconds - t0) % period)
}

/** Fast path — returns just the code. */
export function generateTotpFast(
  secret: string,
  unixSeconds: number,
  options: TotpOptions = {}
): string {
  const period = options.period ?? DEFAULT_PERIOD
  const t0 = options.t0 ?? DEFAULT_T0
  return generateHotpFast(secret, timeStepFor(unixSeconds, period, t0), options)
}

/** Instrumented path — the HOTP trace with the time-derivation step prepended. */
export function generateTotpInstrumented(
  secret: string,
  unixSeconds: number,
  options: TotpOptions = {}
): TotpResult {
  const period = options.period ?? DEFAULT_PERIOD
  const t0 = options.t0 ?? DEFAULT_T0

  const timeStep = timeStepFor(unixSeconds, period, t0)
  const hotp = generateHotpInstrumented(secret, timeStep, options)

  const stepStart = stepStartTime(timeStep, period, t0)
  const stepEnd = stepStart + period
  const remaining = secondsRemaining(unixSeconds, period, t0)

  const timeStepDescription: OtpStep = {
    index: 0,
    label: 'Derive the counter from the clock',
    sublabel: `T = floor((${unixSeconds} − ${t0}) / ${period}) = ${timeStep}`,
    value: String(timeStep),
    note:
      `This is the only difference between TOTP and HOTP: the counter is a function of time ` +
      `rather than a stored click count. This step began at Unix ${stepStart} and ends at ` +
      `${stepEnd}, so the code has ${remaining}s left. Every device that agrees on the clock ` +
      `computes the same T, and therefore the same code, without ever communicating.`,
  }

  // Renumber the HOTP steps so the combined trace stays sequential.
  const steps: OtpStep[] = [
    timeStepDescription,
    ...hotp.steps.map((step, i) => ({ ...step, index: i + 1 })),
  ]

  return {
    ...hotp,
    steps,
    timeStep,
    period,
    t0,
    unixSeconds,
    stepStart,
    stepEnd,
    secondsRemaining: remaining,
  }
}

/** Dispatch between the fast and instrumented paths. */
export function generateTotp(
  secret: string,
  unixSeconds: number,
  options: TotpOptions & { instrument?: boolean } = {}
): TotpResult {
  if (options.instrument === false) {
    const period = options.period ?? DEFAULT_PERIOD
    const t0 = options.t0 ?? DEFAULT_T0
    const timeStep = timeStepFor(unixSeconds, period, t0)
    const stepStart = stepStartTime(timeStep, period, t0)

    return {
      code: generateTotpFast(secret, unixSeconds, options),
      counter: timeStep,
      counterHex: '',
      hmacHex: '',
      offset: -1,
      dynamicBinaryCode: -1,
      digits: options.digits ?? 6,
      algorithm: options.algorithm ?? 'SHA1',
      steps: [],
      timeStep,
      period,
      t0,
      unixSeconds,
      stepStart,
      stepEnd: stepStart + period,
      secondsRemaining: secondsRemaining(unixSeconds, period, t0),
    }
  }
  return generateTotpInstrumented(secret, unixSeconds, options)
}

/**
 * Verify a submitted code against a window of adjacent time steps.
 *
 * RFC 6238 §5.2 recommends at most one step either side. The window exists to
 * absorb clock skew and network latency; widening it linearly widens the
 * attacker's replay window too, which is the trade-off the `driftSeconds`
 * readout is meant to make visible.
 */
export function verifyTotp(
  secret: string,
  code: string,
  unixSeconds: number,
  options: TotpOptions & { window?: number } = {}
): TotpVerifyResult {
  const period = options.period ?? DEFAULT_PERIOD
  const t0 = options.t0 ?? DEFAULT_T0
  const window = options.window ?? 1

  if (!Number.isInteger(window) || window < 0) {
    throw new CipherError(
      'INVALID_INPUT',
      `Verification window must be a non-negative integer number of steps — got ${window}.`
    )
  }

  const normalised = code.replace(/\s/g, '')
  const currentStep = timeStepFor(unixSeconds, period, t0)
  const searched: number[] = []

  // Search outward from the current step so the smallest drift wins.
  for (let distance = 0; distance <= window; distance++) {
    const offsets = distance === 0 ? [0] : [-distance, distance]

    for (const offset of offsets) {
      const step = currentStep + offset
      if (step < 0) continue
      searched.push(step)

      if (generateHotpFast(secret, step, options) === normalised) {
        return {
          valid: true,
          matchedStep: step,
          delta: offset,
          driftSeconds: offset * period,
          searched,
        }
      }
    }
  }

  return { valid: false, matchedStep: null, delta: null, driftSeconds: null, searched }
}

/**
 * Build the `otpauth://` provisioning URI that an authenticator QR code encodes.
 * Seeing it as text makes clear that the QR is just a URL carrying the shared
 * secret in the clear — which is why enrolment must happen over a trusted channel.
 */
export function otpauthUri(params: OtpauthUriParams): string {
  const { secret, account, issuer, digits = 6, period = DEFAULT_PERIOD, algorithm = 'SHA1' } = params

  if (!account) {
    throw new CipherError('INVALID_INPUT', 'An account label is required for the otpauth URI.')
  }
  if (!issuer) {
    throw new CipherError('INVALID_INPUT', 'An issuer is required for the otpauth URI.')
  }

  const label = `${encodeURIComponent(issuer)}:${encodeURIComponent(account)}`
  const query = new URLSearchParams({
    secret: secret.replace(/[\s-]/g, '').toUpperCase(),
    issuer,
    algorithm,
    digits: String(digits),
    period: String(period),
  })

  return `otpauth://totp/${label}?${query.toString()}`
}
