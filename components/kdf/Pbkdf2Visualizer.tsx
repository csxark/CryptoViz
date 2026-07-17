'use client'

import { useState } from 'react'
import { sharedCipherPool } from '@/lib/workers/sharedPool'
import { describePbkdf2Stages, estimateOfflineCrackYears, OWASP_MIN_ITERATIONS, type Pbkdf2StageStep } from '@/lib/kdf/pbkdf2Trace'
import type { WorkerRequest } from '@/types/worker'

function randomSaltHex(bytes = 16): string {
  const arr = crypto.getRandomValues(new Uint8Array(bytes))
  return Array.from(arr).map((b) => b.toString(16).padStart(2, '0')).join('')
}

// Same worker-routing pattern lib/cipher/pbe.ts already uses for the
// existing 'pbkdf2' case in cipher.worker.ts — no worker/registry changes
// needed for this page.
async function deriveKeyViaWorker(
  password: string,
  params: { iterations: number; hash: 'SHA-256' | 'SHA-512'; keyLength: number; salt: string }
): Promise<{ derivedKeyHex: string; saltHex: string }> {
  const message: WorkerRequest = {
    type: 'encrypt',
    requestId: crypto.randomUUID(),
    payload: { cipherId: 'pbkdf2', input: password, key: '', options: params },
  }
  const response = await sharedCipherPool.execute(message)
  if (response.success === false) {
    throw new Error(response.payload.error ?? 'KDF derivation failed.')
  }
  return response.payload.result as unknown as { derivedKeyHex: string; saltHex: string }
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

  async function handleDerive() {
    setError(null)
    setLoading(true)
    setDerivedKeyHex(null)
    try {
      const salt = randomSaltHex()
      const { derivedKeyHex: keyHex } = await deriveKeyViaWorker(password, { iterations, hash, keyLength, salt })
      setSaltHex(salt)
      setDerivedKeyHex(keyHex)
      setStages(describePbkdf2Stages({ passwordLength: password.length, saltHex: salt, iterations, hash, keyLength }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  const meetsOwasp = iterations >= OWASP_MIN_ITERATIONS[hash]
  const crackYears = estimateOfflineCrackYears(iterations, 2 ** 40) // demo: assumes a 40-bit-strength password

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-3 text-lg font-semibold text-zinc-900 dark:text-white">Derive a key with PBKDF2</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Password</label>
            <input
              type="text"
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Iterations</label>
            <input
              type="number"
              min={10_000}
              step={10_000}
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
              value={iterations}
              onChange={(e) => setIterations(Number(e.target.value))}
            />
            <p className={`mt-1 text-xs ${meetsOwasp ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
              {meetsOwasp ? 'Meets OWASP 2023 guidance' : `Below OWASP floor (${OWASP_MIN_ITERATIONS[hash].toLocaleString()})`}
            </p>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Hash</label>
            <select
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
              value={hash}
              onChange={(e) => setHash(e.target.value as 'SHA-256' | 'SHA-512')}
            >
              <option value="SHA-256">SHA-256</option>
              <option value="SHA-512">SHA-512</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Key length</label>
            <select
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
              value={keyLength}
              onChange={(e) => setKeyLength(Number(e.target.value) as 16 | 24 | 32)}
            >
              <option value={16}>16 bytes (AES-128)</option>
              <option value={24}>24 bytes (AES-192)</option>
              <option value={32}>32 bytes (AES-256)</option>
            </select>
          </div>
        </div>
        <button
          onClick={handleDerive}
          disabled={loading}
          className="mt-4 rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-700 disabled:opacity-50 dark:bg-teal-500 dark:hover:bg-teal-400"
        >
          {loading ? 'Deriving…' : 'Derive key'}
        </button>
        {error && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
      </div>

      {stages.length > 0 && (
        <div className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="mb-3 text-lg font-semibold text-zinc-900 dark:text-white">Derivation trace</h2>
          <ol className="space-y-3">
            {stages.map((step, i) => (
              <li key={i} className="border-l-2 border-teal-500 pl-3">
                <p className="text-sm font-medium text-zinc-900 dark:text-white">{step.label}</p>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">{step.detail}</p>
              </li>
            ))}
          </ol>
        </div>
      )}

      {derivedKeyHex && (
        <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-5 dark:border-emerald-900 dark:bg-emerald-950/30">
          <h2 className="mb-2 text-lg font-semibold text-zinc-900 dark:text-white">Result</h2>
          <p className="break-all text-sm text-zinc-700 dark:text-zinc-300">
            Salt: <code>{saltHex}</code>
          </p>
          <p className="break-all text-sm text-zinc-700 dark:text-zinc-300">
            Derived key: <code>{derivedKeyHex}</code>
          </p>
          <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-500">
            Illustrative offline brute-force estimate for a ~40-bit-strength password at these iterations: ~
            {crackYears < 1 ? crackYears.toFixed(4) : crackYears.toFixed(0)} GPU-years (order-of-magnitude only, not a
            security guarantee).
          </p>
        </div>
      )}
    </div>
  )
}
