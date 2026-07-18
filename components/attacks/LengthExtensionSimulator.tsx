'use client'

import { useState } from 'react'
import { VulnerableMac, forgeLengthExtension, type LengthExtensionStep } from '@/lib/attacks/lengthExtension'

const enc = (s: string) => new TextEncoder().encode(s)
const dec = (b: Uint8Array) => new TextDecoder().decode(b)

const DEMO_SECRET = 'sup3r-s3cr3t-key' // demo-only, simulated server secret (17 bytes)
const DEFAULT_MESSAGE = 'amount=10&to=alice'
const DEFAULT_APPEND = '&admin=true'

export default function LengthExtensionSimulator() {
  const [message, setMessage] = useState(DEFAULT_MESSAGE)
  const [appendData, setAppendData] = useState(DEFAULT_APPEND)
  const [secretLengthGuess, setSecretLengthGuess] = useState(DEMO_SECRET.length)
  const [steps, setSteps] = useState<LengthExtensionStep[]>([])
  const [forgedText, setForgedText] = useState<string | null>(null)
  const [forgedMacHex, setForgedMacHex] = useState<string | null>(null)
  const [oracleAccepted, setOracleAccepted] = useState<boolean | null>(null)
  const [leakedMacHex, setLeakedMacHex] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  function runAttack() {
    setError(null)
    setSteps([])
    setForgedText(null)
    setForgedMacHex(null)
    setOracleAccepted(null)

    try {
      const oracle = new VulnerableMac(enc(DEMO_SECRET))
      const messageBytes = enc(message)
      const leakedMac = oracle.sign(messageBytes)
      setLeakedMacHex(leakedMac)

      const result = forgeLengthExtension(leakedMac, secretLengthGuess, messageBytes, enc(appendData))

      setSteps(result.steps)
      setForgedText(dec(result.forgedMessage))
      setForgedMacHex(result.forgedHashHex)
      setOracleAccepted(oracle.verify(result.forgedMessage, result.forgedHashHex))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-3 text-lg font-semibold text-zinc-900 dark:text-white">
          1. Vulnerable server (simulated)
        </h2>
        <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
          A demo server signs requests as <code className="rounded bg-zinc-100 px-1 py-0.5 dark:bg-zinc-800">SHA-256(secret || message)</code> and
          leaks that MAC alongside the message. It never reveals its secret.
        </p>
        <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Original message (attacker sees this)
        </label>
        <input
          className="mb-4 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        {leakedMacHex && (
          <p className="break-all text-xs text-zinc-500 dark:text-zinc-500">
            Leaked MAC: <code>{leakedMacHex}</code>
          </p>
        )}
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-3 text-lg font-semibold text-zinc-900 dark:text-white">
          2. Attacker inputs
        </h2>
        <div className="mb-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Data to append
            </label>
            <input
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
              value={appendData}
              onChange={(e) => setAppendData(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Guessed secret length (bytes)
            </label>
            <input
              type="number"
              min={0}
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
              value={secretLengthGuess}
              onChange={(e) => setSecretLengthGuess(Number(e.target.value))}
            />
          </div>
        </div>
        <button
          onClick={runAttack}
          className="rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-700 dark:bg-teal-500 dark:hover:bg-teal-400"
        >
          Forge extended MAC
        </button>
        {error && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
      </div>

      {steps.length > 0 && (
        <div className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="mb-3 text-lg font-semibold text-zinc-900 dark:text-white">3. Attack trace</h2>
          <ol className="space-y-3">
            {steps.map((step, i) => (
              <li key={i} className="border-l-2 border-teal-500 pl-3">
                <p className="text-sm font-medium text-zinc-900 dark:text-white">{step.label}</p>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">{step.detail}</p>
              </li>
            ))}
          </ol>
        </div>
      )}

      {forgedText !== null && (
        <div
          className={`rounded-lg border p-5 ${
            oracleAccepted
              ? 'border-red-300 bg-red-50 dark:border-red-900 dark:bg-red-950/30'
              : 'border-amber-300 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30'
          }`}
        >
          <h2 className="mb-2 text-lg font-semibold text-zinc-900 dark:text-white">4. Result</h2>
          <p className="mb-2 break-all text-sm text-zinc-700 dark:text-zinc-300">
            Forged message: <code>{forgedText}</code>
          </p>
          <p className="mb-2 break-all text-sm text-zinc-700 dark:text-zinc-300">
            Forged MAC: <code>{forgedMacHex}</code>
          </p>
          <p className={`text-sm font-semibold ${oracleAccepted ? 'text-red-700 dark:text-red-400' : 'text-amber-700 dark:text-amber-400'}`}>
            {oracleAccepted
              ? 'Vulnerable server accepted the forged MAC — the secret-length guess was correct.'
              : 'Server rejected the forged MAC — the secret-length guess was wrong. Try adjusting it.'}
          </p>
        </div>
      )}
    </div>
  )
}
