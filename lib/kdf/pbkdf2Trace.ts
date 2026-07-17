/**
 * Pure, UI-facing helpers for the PBKDF2 Key Derivation Visualizer.
 * The actual derivation still runs through the existing worker-routed
 * `deriveKey()` in lib/kdf/pbkdf2.ts (via sharedCipherPool, same path
 * lib/cipher/pbe.ts already uses) — WebCrypto's PBKDF2 is a black box with
 * no per-iteration hook, so this module builds a descriptive *stage* trace
 * (what happens and why) rather than a per-round mathematical trace like the
 * cipher engine's `steps[]`.
 * @see CIPHER_ENGINE.md "Attack simulators" conventions
 */

export interface Pbkdf2StageStep {
  label: string
  detail: string
}

export interface Pbkdf2StageInput {
  passwordLength: number
  saltHex: string
  iterations: number
  hash: 'SHA-256' | 'SHA-512'
  keyLength: number
}

/** OWASP 2023 minimum-iteration guidance, used only to annotate the trace — not enforced as a hard limit here (lib/kdf/pbkdf2.ts already enforces the hard floor). */
export const OWASP_MIN_ITERATIONS: Record<'SHA-256' | 'SHA-512', number> = {
  'SHA-256': 600_000,
  'SHA-512': 210_000,
}

export function describePbkdf2Stages(input: Pbkdf2StageInput): Pbkdf2StageStep[] {
  const steps: Pbkdf2StageStep[] = []

  steps.push({
    label: 'Import password as key material',
    detail: `Password (${input.passwordLength} characters) imported into WebCrypto as raw PBKDF2 key material — never a fixed-size hash, so its full entropy is preserved going into round 1.`,
  })

  steps.push({
    label: 'Combine with salt',
    detail: `Salt = ${input.saltHex} (${input.saltHex.length / 2} bytes). The salt is mixed into every HMAC round below, so identical passwords with different salts produce completely different derived keys — this is what defeats precomputed rainbow tables.`,
  })

  steps.push({
    label: `Run ${input.iterations.toLocaleString()} HMAC-${input.hash} rounds`,
    detail: `Each round computes HMAC-${input.hash}(password, previous_round_output) and XORs the result into an accumulator — this is the deliberate, tunable "slowness" that makes brute-forcing the password expensive even though the password itself might be short.`,
  })

  const meetsOwasp = input.iterations >= OWASP_MIN_ITERATIONS[input.hash]
  steps.push({
    label: 'Iteration count vs. OWASP guidance',
    detail: meetsOwasp
      ? `${input.iterations.toLocaleString()} meets or exceeds the OWASP 2023 floor of ${OWASP_MIN_ITERATIONS[input.hash].toLocaleString()} for PBKDF2-HMAC-${input.hash}.`
      : `${input.iterations.toLocaleString()} is below the OWASP 2023 floor of ${OWASP_MIN_ITERATIONS[input.hash].toLocaleString()} for PBKDF2-HMAC-${input.hash} — an attacker with GPU/ASIC hardware brute-forces this proportionally faster.`,
  })

  steps.push({
    label: 'Truncate to requested key length',
    detail: `Final accumulator truncated to ${input.keyLength} bytes (${input.keyLength * 8} bits) — sized for the downstream use (e.g. 32 bytes for AES-256).`,
  })

  return steps
}

/**
 * Rough, order-of-magnitude offline brute-force time estimate for display
 * only (not a security guarantee) — assumes a mid-range single GPU doing
 * ~10^6 PBKDF2 evaluations/sec at 1 iteration, scaled down by iteration count.
 */
export function estimateOfflineCrackYears(iterations: number, keyspaceSize: number): number {
  const GPU_HASHES_PER_SEC_AT_1_ITER = 1_000_000
  const effectiveGuessesPerSec = GPU_HASHES_PER_SEC_AT_1_ITER / Math.max(iterations, 1)
  const secondsToExhaust = keyspaceSize / Math.max(effectiveGuessesPerSec, Number.EPSILON)
  return secondsToExhaust / (60 * 60 * 24 * 365)
}
