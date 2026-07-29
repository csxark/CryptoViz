'use client'

import { useState } from 'react'
import { sharedCipherPool } from '@/lib/workers/sharedPool'
import { describeHkdfStages, RFC_5869_PRESETS, type HkdfStageStep } from '@/lib/kdf/hkdfTrace'
import type { WorkerRequest } from '@/types/worker'
import type { CipherResult } from '@/lib/cipher/types'

async function deriveHkdfViaWorker(
  ikm: string,
  salt: string,
  options: { info: string; keyLength: number; hash: 'SHA-256' | 'SHA-512' | 'SHA-1'; instrument: boolean }
): Promise<CipherResult> {
  const message: WorkerRequest = {
    type: 'encrypt',
    requestId: crypto.randomUUID(),
    payload: {
      cipherId: 'hkdf',
      input: ikm,
      key: salt,
      options,
    },
  }
  const response = await sharedCipherPool.execute(message)
  if (response.success === false) {
    throw new Error(response.payload.error ?? 'HKDF key derivation failed.')
  }
  return response.payload.result as CipherResult
}

export default function HkdfVisualizer() {
  const [ikm, setIkm] = useState('0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b')
  const [salt, setSalt] = useState('000102030405060708090a0b0c')
  const [info, setInfo] = useState('f0f1f2f3f4f5f6f7f8f9')
  const [hash, setHash] = useState<'SHA-256' | 'SHA-512' | 'SHA-1'>('SHA-256')
  const [keyLength, setKeyLength] = useState(42)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [stages, setStages] = useState<HkdfStageStep[]>([])
  const [cipherResult, setCipherResult] = useState<CipherResult | null>(null)
  const [copied, setCopied] = useState(false)

  function applyPreset(presetIndex: number) {
    const p = RFC_5869_PRESETS[presetIndex]
    if (!p) return
    setIkm(p.ikm)
    setSalt(p.salt)
    setInfo(p.info)
    setHash(p.hash)
    setKeyLength(p.keyLength)
    setCipherResult(null)
    setStages([])
    setError(null)
  }

  async function handleDerive() {
    setError(null)
    setLoading(true)
    setCipherResult(null)
    try {
      const res = await deriveHkdfViaWorker(ikm, salt, {
        info,
        keyLength,
        hash,
        instrument: true,
      })
      setCipherResult(res)
      setStages(
        describeHkdfStages({
          ikmLength: ikm.length > 0 ? ikm.length / (ikm.length % 2 === 0 && /^[0-9a-fA-F]+$/.test(ikm) ? 2 : 1) : 0,
          saltHex: salt,
          infoStr: info,
          hash,
          keyLength,
        })
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  function copyResult() {
    if (!cipherResult?.output) return
    navigator.clipboard.writeText(cipherResult.output)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-6">
      {/* Parameter Setup Card */}
      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-xs transition-colors dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-4 flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">HKDF Key Derivation Setup</h2>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Presets:</span>
            {RFC_5869_PRESETS.map((preset, idx) => (
              <button
                key={idx}
                onClick={() => applyPreset(idx)}
                className="rounded-md border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
              >
                RFC Test {idx + 1}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="ikm" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Input Keying Material (IKM)
            </label>
            <input
              id="ikm"
              type="text"
              className="w-full rounded-lg border border-zinc-300 bg-white px-3.5 py-2 font-mono text-sm text-zinc-900 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
              value={ikm}
              onChange={(e) => setIkm(e.target.value)}
              placeholder="Hex or text input key material"
            />
          </div>

          <div>
            <label htmlFor="salt" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Salt (Optional)
            </label>
            <input
              id="salt"
              type="text"
              className="w-full rounded-lg border border-zinc-300 bg-white px-3.5 py-2 font-mono text-sm text-zinc-900 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
              value={salt}
              onChange={(e) => setSalt(e.target.value)}
              placeholder="Leave empty for zero-padded salt"
            />
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              {salt ? 'Hex/text salt provided' : 'Default: zero-filled HashLen bytes'}
            </p>
          </div>

          <div>
            <label htmlFor="info" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Context Info (info)
            </label>
            <input
              id="info"
              type="text"
              className="w-full rounded-lg border border-zinc-300 bg-white px-3.5 py-2 font-mono text-sm text-zinc-900 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
              value={info}
              onChange={(e) => setInfo(e.target.value)}
              placeholder="Application specific context string/hex"
            />
          </div>

          <div>
            <label htmlFor="hashAlg" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Underlying Hash Function
            </label>
            <select
              id="hashAlg"
              className="w-full rounded-lg border border-zinc-300 bg-white px-3.5 py-2 text-sm text-zinc-900 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
              value={hash}
              onChange={(e) => setHash(e.target.value as 'SHA-256' | 'SHA-512' | 'SHA-1')}
            >
              <option value="SHA-256">SHA-256 (HashLen = 32 bytes)</option>
              <option value="SHA-512">SHA-512 (HashLen = 64 bytes)</option>
              <option value="SHA-1">SHA-1 (HashLen = 20 bytes)</option>
            </select>
          </div>

          <div>
            <label htmlFor="keyLength" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Output Key Length (L bytes)
            </label>
            <input
              id="keyLength"
              type="number"
              min={1}
              max={255 * (hash === 'SHA-512' ? 64 : hash === 'SHA-1' ? 20 : 32)}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3.5 py-2 font-mono text-sm text-zinc-900 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
              value={keyLength}
              onChange={(e) => setKeyLength(Number(e.target.value))}
            />
          </div>
        </div>

        <button
          onClick={handleDerive}
          disabled={loading}
          className="mt-5 rounded-lg bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white shadow-xs transition-all hover:bg-teal-700 disabled:opacity-50 dark:bg-teal-500 dark:hover:bg-teal-400"
        >
          {loading ? 'Deriving Key…' : 'Derive Key (HKDF)'}
        </button>

        {error && <p className="mt-3 text-sm font-medium text-red-600 dark:text-red-400">{error}</p>}
      </div>

      {/* Stage Breakdown Overview */}
      {stages.length > 0 && (
        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">HKDF Stage Analysis</h2>
          <ol className="space-y-4">
            {stages.map((step, i) => (
              <li key={i} className="border-l-2 border-teal-500 pl-4">
                <p className="text-sm font-semibold text-zinc-900 dark:text-white">{step.label}</p>
                <p className="mt-0.5 text-sm text-zinc-600 dark:text-zinc-400">{step.detail}</p>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Detailed Step-by-Step Trace */}
      {cipherResult && cipherResult.steps.length > 0 && (
        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">Detailed Round Traces</h2>
          <div className="space-y-4">
            {cipherResult.steps.map((s, idx) => (
              <div
                key={idx}
                className="rounded-lg border border-zinc-100 bg-zinc-50 p-4 transition-colors dark:border-zinc-800/80 dark:bg-zinc-950/50"
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-semibold text-teal-600 dark:text-teal-400">
                    Step {s.index}: {s.label}
                  </span>
                  {s.isMilestone && (
                    <span className="rounded-full bg-teal-100 px-2 py-0.5 text-xs font-semibold text-teal-700 dark:bg-teal-950 dark:text-teal-300">
                      Milestone
                    </span>
                  )}
                </div>

                <p className="mb-3 text-xs text-zinc-600 dark:text-zinc-400">{s.note}</p>

                {s.table && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs font-mono">
                      <tbody>
                        {s.table.map((row, rIdx) => (
                          <tr key={rIdx} className="border-b border-zinc-200/50 dark:border-zinc-800/50">
                            <td className="py-1.5 pr-4 font-semibold text-zinc-700 dark:text-zinc-300">{row.key}</td>
                            <td className="break-all py-1.5 text-zinc-900 dark:text-zinc-100">{row.value}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Output Key Material Result Card */}
      {cipherResult && (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50/70 p-6 shadow-xs dark:border-emerald-900/80 dark:bg-emerald-950/20">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Output Keying Material (OKM)</h2>
            <button
              onClick={copyResult}
              className="rounded-md border border-emerald-300 bg-white px-3 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:bg-zinc-900 dark:text-emerald-300 dark:hover:bg-zinc-800"
            >
              {copied ? 'Copied!' : 'Copy Hex'}
            </button>
          </div>

          <div className="space-y-2">
            <div>
              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Length:</span>
              <span className="ml-2 text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                {keyLength} bytes ({keyLength * 8} bits)
              </span>
            </div>
            <div>
              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Derived Key (Hex):</span>
              <p className="mt-1 break-all rounded-lg border border-emerald-200 bg-white p-3 font-mono text-xs font-bold text-emerald-950 dark:border-emerald-900/60 dark:bg-zinc-950 dark:text-emerald-300">
                {cipherResult.output}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
