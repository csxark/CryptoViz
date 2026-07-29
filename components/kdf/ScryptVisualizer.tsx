'use client'

import { useState } from 'react'
import { sharedCipherPool } from '@/lib/workers/sharedPool'
import {
  describeScryptStages,
  calculateScryptMemory,
  OWASP_RECOMMENDATIONS,
  type ScryptStageStep
} from '@/lib/kdf/scrypt'
import type { WorkerRequest } from '@/types/worker'
import { Info, HelpCircle, ShieldAlert, Cpu } from 'lucide-react'

function randomSaltHex(bytes = 16): string {
  const arr = crypto.getRandomValues(new Uint8Array(bytes))
  return Array.from(arr).map((b) => b.toString(16).padStart(2, '0')).join('')
}

async function deriveScryptKeyViaWorker(
  password: string,
  params: { N: number; r: number; p: number; dkLen: number; salt: string }
): Promise<{ derivedKeyHex: string; saltHex: string }> {
  const message: WorkerRequest = {
    type: 'encrypt',
    requestId: crypto.randomUUID(),
    payload: {
      cipherId: 'scrypt',
      input: password,
      key: '',
      options: params
    },
  }
  const response = await sharedCipherPool.execute(message)
  if (response.success === false) {
    throw new Error(response.payload.error ?? 'Scrypt derivation failed.')
  }
  return response.payload.result as unknown as { derivedKeyHex: string; saltHex: string }
}

export default function ScryptVisualizer() {
  const [password, setPassword] = useState('correct horse battery staple')
  const [costN, setCostN] = useState(16384)
  const [blockSizeR, setBlockSizeR] = useState(8)
  const [parallelP, setParallelP] = useState(1)
  const [keyLength, setKeyLength] = useState<16 | 24 | 32>(32)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [stages, setStages] = useState<ScryptStageStep[]>([])
  const [derivedKeyHex, setDerivedKeyHex] = useState<string | null>(null)
  const [saltHex, setSaltHex] = useState<string | null>(null)

  const memoryMB = calculateScryptMemory(costN, blockSizeR, parallelP)
  const meetsRecommendation = costN >= OWASP_RECOMMENDATIONS.N && blockSizeR >= OWASP_RECOMMENDATIONS.r

  // Rough estimation of offline GPU crack complexity relative to standard parameters
  const crackDifficulty = costN * blockSizeR * parallelP

  async function handleDerive() {
    setError(null)
    setLoading(true)
    setDerivedKeyHex(null)
    try {
      const salt = randomSaltHex()
      const res = await deriveScryptKeyViaWorker(password, {
        N: costN,
        r: blockSizeR,
        p: parallelP,
        dkLen: keyLength,
        salt
      })
      const activeSalt = res.saltHex || salt
      setSaltHex(activeSalt)
      setDerivedKeyHex(res.derivedKeyHex)
      setStages(
        describeScryptStages(password.length, activeSalt, costN, blockSizeR, parallelP, keyLength)
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Parameter Settings */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40">
        <h2 className="mb-3 text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
          Configure Scrypt Parameters
        </h2>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-5">
          Tune CPU, memory, and parallelization. Adjust parameters to see the change in memory footprint.
        </p>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="password" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Input Password
            </label>
            <input
              id="password"
              type="text"
              className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 focus:border-teal-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="costN" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
              Cost parameter (N)
              <span title="CPU/Memory cost, must be a power of two.">
                <HelpCircle className="h-3.5 w-3.5 text-zinc-400 cursor-pointer" />
              </span>
            </label>
            <select
              id="costN"
              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-teal-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
              value={costN}
              onChange={(e) => setCostN(Number(e.target.value))}
            >
              <option value={1024}>1024 (1 MB)</option>
              <option value={2048}>2048 (2 MB)</option>
              <option value={4096}>4096 (4 MB)</option>
              <option value={8192}>8192 (8 MB)</option>
              <option value={16384}>16384 (16 MB - standard)</option>
              <option value={32768}>32768 (32 MB)</option>
              <option value={65536}>65536 (64 MB - secure)</option>
            </select>
          </div>

          <div>
            <label htmlFor="blockSizeR" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
              Block size (r)
              <span title="Sequential memory parameter (normally 8).">
                <HelpCircle className="h-3.5 w-3.5 text-zinc-400 cursor-pointer" />
              </span>
            </label>
            <select
              id="blockSizeR"
              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-teal-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
              value={blockSizeR}
              onChange={(e) => setBlockSizeR(Number(e.target.value))}
            >
              <option value={4}>4 (Slightly weak)</option>
              <option value={8}>8 (Standard)</option>
              <option value={12}>12</option>
              <option value={16}>16</option>
              <option value={32}>32</option>
            </select>
          </div>

          <div>
            <label htmlFor="parallelP" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
              Parallelization (p)
              <span title="Number of parallel mixing threads.">
                <HelpCircle className="h-3.5 w-3.5 text-zinc-400 cursor-pointer" />
              </span>
            </label>
            <select
              id="parallelP"
              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-teal-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
              value={parallelP}
              onChange={(e) => setParallelP(Number(e.target.value))}
            >
              <option value={1}>1 (Standard)</option>
              <option value={2}>2</option>
              <option value={4}>4</option>
              <option value={8}>8</option>
            </select>
          </div>

          <div>
            <label htmlFor="keyLength" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Derived Key Length
            </label>
            <select
              id="keyLength"
              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-teal-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
              value={keyLength}
              onChange={(e) => setKeyLength(Number(e.target.value) as 16 | 24 | 32)}
            >
              <option value={16}>16 bytes (AES-128)</option>
              <option value={24}>24 bytes (AES-192)</option>
              <option value={32}>32 bytes (AES-256)</option>
            </select>
          </div>
        </div>

        {/* Dynamic Resource Metrics */}
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3 border-t border-zinc-100 pt-5 dark:border-zinc-800/80">
          <div className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-3 dark:border-zinc-800 dark:bg-zinc-950/20 text-xs">
            <span className="font-bold text-zinc-400 dark:text-zinc-500 block uppercase mb-1">
              Memory footprint
            </span>
            <span className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
              {memoryMB.toFixed(2)} MB
            </span>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-3 dark:border-zinc-800 dark:bg-zinc-950/20 text-xs">
            <span className="font-bold text-zinc-400 dark:text-zinc-500 block uppercase mb-1">
              OWASP compliance
            </span>
            <span className={`text-xs font-bold inline-flex items-center gap-1 ${
              meetsRecommendation ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
            }`}>
              {meetsRecommendation ? 'Meets recommended floor' : 'Below recommended floor'}
            </span>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-3 dark:border-zinc-800 dark:bg-zinc-950/20 text-xs">
            <span className="font-bold text-zinc-400 dark:text-zinc-500 block uppercase mb-1 flex items-center gap-1">
              ASIC protection factor
            </span>
            <span className="text-sm font-bold text-teal-600 dark:text-teal-400">
              {(crackDifficulty / 1024).toFixed(1)}x scaling
            </span>
          </div>
        </div>

        <button
          onClick={handleDerive}
          disabled={loading}
          className="mt-6 w-full rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700 disabled:opacity-50 dark:bg-teal-500 dark:hover:bg-teal-400"
        >
          {loading ? 'Executing derivation in Web Worker...' : 'Derive Key'}
        </button>
        
        {error && <p className="mt-3 text-xs text-red-600 dark:text-red-400">{error}</p>}
      </div>

      {/* Trace Log Stages */}
      {stages.length > 0 && (
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40">
          <h2 className="mb-4 text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            <Cpu className="h-4.5 w-4.5 text-teal-500" />
            Key Derivation Process Stages
          </h2>
          <ol className="space-y-4">
            {stages.map((step, i) => (
              <li key={i} className="flex gap-4 border-l-2 border-teal-500 pl-4 py-0.5">
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-zinc-900 dark:text-white">
                    {step.label}
                  </h4>
                  <p className="mt-1 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                    {step.detail}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Result Card */}
      {derivedKeyHex && (
        <div className="rounded-2xl border border-emerald-500/25 bg-emerald-50/50 p-5 dark:border-emerald-500/10 dark:bg-emerald-950/15">
          <h2 className="mb-3 text-base font-bold text-zinc-900 dark:text-white">
            Derived Cryptographic Secret
          </h2>
          <div className="space-y-3 font-mono text-xs">
            <div>
              <span className="font-bold text-zinc-400 dark:text-zinc-500 block uppercase tracking-wider text-[10px] mb-1">
                Generated Salt (Hex)
              </span>
              <div className="rounded-lg border border-zinc-200/50 bg-white px-3 py-2 break-all text-zinc-800 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200 select-all">
                {saltHex}
              </div>
            </div>

            <div>
              <span className="font-bold text-zinc-400 dark:text-zinc-500 block uppercase tracking-wider text-[10px] mb-1">
                Derived Key (Hex)
              </span>
              <div className="rounded-lg border border-zinc-200/50 bg-white px-3 py-2 break-all text-zinc-800 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200 select-all">
                {derivedKeyHex}
              </div>
            </div>
          </div>

          <div className="mt-4 flex gap-2.5 items-start rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-emerald-800 dark:text-emerald-400">
            <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5" />
            <div className="text-2xs leading-relaxed font-sans">
              <strong className="block font-bold">ASIC Resistance Verification:</strong>
              Scrypt's sequential memory loop requires custom ASICs to spend significant chip area on RAM blocks rather than hashing processors. This creates a hard physical limit that prevents attackers from scaling up brute force speeds on custom-built chips.
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
