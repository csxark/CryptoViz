'use client'

import { useState } from 'react'
import { doubleDesEncrypt, meetInTheMiddleAttack, type MitmStep, type MitmResult } from '@/lib/attacks/meetInTheMiddle'

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.replace(/\s+/g, '')
  const out = new Uint8Array(clean.length / 2)
  for (let i = 0; i < out.length; i++) out[i] = parseInt(clean.substr(i * 2, 2), 16)
  return out
}

const DEFAULT_PLAINTEXT = '0123456789abcdef'
const DEFAULT_KEY_A = '00000000000012ab'
const DEFAULT_KEY_B = '0000000000003ecd'

export default function MeetInTheMiddleSimulator() {
  const [plaintextHex, setPlaintextHex] = useState(DEFAULT_PLAINTEXT)
  const [keySpaceBits, setKeySpaceBits] = useState(16)
  const [running, setRunning] = useState(false)
  const [steps, setSteps] = useState<MitmStep[]>([])
  const [result, setResult] = useState<MitmResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  function runAttack() {
    setError(null)
    setSteps([])
    setResult(null)
    setRunning(true)

    try {
      const plaintext = hexToBytes(plaintextHex)
      if (plaintext.length !== 8) {
        throw new Error('Plaintext must be exactly 16 hex characters (8 bytes).')
      }
      const keyA = hexToBytes(DEFAULT_KEY_A)
      const keyB = hexToBytes(DEFAULT_KEY_B)
      const ciphertext = doubleDesEncrypt(plaintext, keyA, keyB)

      const attackResult = meetInTheMiddleAttack(plaintext, ciphertext, keySpaceBits, (step) =>
        setSteps((prev) => [...prev, step])
      )
      setResult(attackResult)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-3 text-lg font-semibold text-zinc-900 dark:text-white">
          1. Known plaintext / double-DES setup
        </h2>
        <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
          A demo message is encrypted with two chained DES keys,{' '}
          <code className="rounded bg-zinc-100 px-1 py-0.5 dark:bg-zinc-800">C = E_k2(E_k1(P))</code>. The attacker
          knows <code>P</code> and <code>C</code> but neither key.
        </p>
        <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Plaintext block (16 hex chars / 8 bytes)
        </label>
        <input
          className="mb-4 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 font-mono text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
          value={plaintextHex}
          onChange={(e) => setPlaintextHex(e.target.value)}
        />
        <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Reduced keyspace size ({keySpaceBits} bits — kept small so the search finishes in-browser)
        </label>
        <input
          type="range"
          min={8}
          max={20}
          value={keySpaceBits}
          onChange={(e) => setKeySpaceBits(Number(e.target.value))}
          className="w-full"
        />
        <button
          onClick={runAttack}
          disabled={running}
          className="mt-4 rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-700 disabled:opacity-50 dark:bg-teal-500 dark:hover:bg-teal-400"
        >
          {running ? 'Searching…' : 'Run meet-in-the-middle attack'}
        </button>
        {error && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
      </div>

      {steps.length > 0 && (
        <div className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="mb-3 text-lg font-semibold text-zinc-900 dark:text-white">2. Attack trace</h2>
          <ol className="space-y-3">
            {steps.map((step, i) => (
              <li key={`step-${i}-${step.label}`} className="border-l-2 border-teal-500 pl-3">
                <p className="text-sm font-medium text-zinc-900 dark:text-white">{step.label}</p>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">{step.detail}</p>
              </li>
            ))}
          </ol>
        </div>
      )}

      {result && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-5 dark:border-red-900 dark:bg-red-950/30">
          <h2 className="mb-2 text-lg font-semibold text-zinc-900 dark:text-white">3. Recovered keys</h2>
          <p className="text-sm text-zinc-700 dark:text-zinc-300">
            k1 = <code>{result.foundKeyAHex}</code>, k2 = <code>{result.foundKeyBHex}</code>
          </p>
          <p className="mt-2 text-sm font-semibold text-red-700 dark:text-red-400">
            Found in {result.attemptsUntilMatch.toLocaleString()} of {result.keyASearchSpace.toLocaleString()} possible
            backward-pass attempts — roughly 2×2^{keySpaceBits} work instead of 2^{keySpaceBits * 2} for a naive
            two-key brute force.
          </p>
        </div>
      )}
    </div>
  )
}
