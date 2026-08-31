'use client'

import { useRef, useState } from 'react'
import { HmacDrbg, toHex, type DrbgStep } from '@/lib/random/hmacDrbg'

const DEFAULTS = {
  entropy: 'ca851911349384bffe89de1cbdc46e6831e44d34a4fb935ee285dd14b71a7488',
  nonce: '659ba96c601dc69fc902940805ec0ca8',
  personalization: '',
  reseedEntropy: 'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
  numBytes: 32,
}

function parseHex(label: string, value: string, { allowEmpty = false } = {}): Uint8Array {
  const clean = value.trim().replace(/^0x/i, '').replace(/\s+/g, '')
  if (clean === '') {
    if (allowEmpty) return new Uint8Array(0)
    throw new Error(`${label} is required.`)
  }
  if (!/^[0-9a-fA-F]+$/.test(clean) || clean.length % 2 !== 0) {
    throw new Error(`${label} must be an even-length hex string.`)
  }
  const out = new Uint8Array(clean.length / 2)
  for (let i = 0; i < out.length; i++) out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16)
  return out
}

export default function HmacDrbgVisualizer() {
  const [entropy, setEntropy] = useState(DEFAULTS.entropy)
  const [nonce, setNonce] = useState(DEFAULTS.nonce)
  const [personalization, setPersonalization] = useState(DEFAULTS.personalization)
  const [reseedEntropy, setReseedEntropy] = useState(DEFAULTS.reseedEntropy)
  const [numBytes, setNumBytes] = useState(DEFAULTS.numBytes)

  const drbg = useRef<HmacDrbg | null>(null)
  const [instantiated, setInstantiated] = useState(false)
  const [outputs, setOutputs] = useState<string[]>([])
  const [steps, setSteps] = useState<DrbgStep[]>([])
  const [stateView, setStateView] = useState<{ K: string; V: string; reseedCounter: number } | null>(null)
  const [error, setError] = useState<string | null>(null)

  function sync() {
    if (!drbg.current) return
    setSteps([...drbg.current.steps])
    setStateView(drbg.current.state)
  }

  function instantiate() {
    setError(null)
    try {
      drbg.current = new HmacDrbg(
        parseHex('Entropy', entropy),
        parseHex('Nonce', nonce),
        parseHex('Personalization', personalization, { allowEmpty: true }),
      )
      setInstantiated(true)
      setOutputs([])
      sync()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setInstantiated(false)
      drbg.current = null
    }
  }

  function generate() {
    setError(null)
    try {
      if (!drbg.current) return
      const out = drbg.current.generate(numBytes)
      setOutputs((prev) => [...prev, toHex(out)])
      sync()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  function reseed() {
    setError(null)
    try {
      if (!drbg.current) return
      drbg.current.reseed(parseHex('Reseed entropy', reseedEntropy))
      sync()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  return (
    <section className="mx-auto max-w-4xl space-y-6 px-4 py-8 text-slate-200">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold text-white">HMAC_DRBG Visualizer</h1>
        <p className="text-sm text-slate-400">
          A deterministic random bit generator (NIST SP 800-90A) over HMAC-SHA-256 — the CSPRNG
          behind RFC 6979 deterministic ECDSA. Its whole state is two 256-bit values,{' '}
          <code>K</code> and <code>V</code>, evolved only through HMAC. Instantiate from a seed, then
          generate — the same seed always reproduces the same stream, and reseeding mixes in fresh
          entropy so the past no longer predicts the future.
        </p>
      </header>

      <div className="grid gap-3 rounded-lg border border-slate-700 bg-slate-900/40 p-5">
        <label className="text-sm">Entropy input (hex)
          <input className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-2 font-mono text-xs"
            value={entropy} onChange={(e) => setEntropy(e.target.value)} />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm">Nonce (hex)
            <input className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-2 font-mono text-xs"
              value={nonce} onChange={(e) => setNonce(e.target.value)} />
          </label>
          <label className="text-sm">Personalization (hex, optional)
            <input className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-2 font-mono text-xs"
              value={personalization} onChange={(e) => setPersonalization(e.target.value)} />
          </label>
        </div>
        <button onClick={instantiate}
          className="w-fit rounded bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-500">
          {instantiated ? 'Re-instantiate (reset)' : 'Instantiate'}
        </button>
        {error && <p className="text-sm text-red-400">{error}</p>}
      </div>

      {instantiated && (
        <>
          <div className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-700 bg-slate-900/40 p-5">
            <label className="text-sm">Bytes to generate
              <input type="number" min={1} max={65536}
                className="mt-1 w-28 rounded border border-slate-700 bg-slate-950 px-2 py-2 text-sm"
                value={numBytes} onChange={(e) => setNumBytes(Number(e.target.value))} />
            </label>
            <button onClick={generate}
              className="rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500">
              Generate
            </button>
            <div className="flex-1" />
            <label className="text-sm">Reseed entropy (hex)
              <input className="mt-1 w-full min-w-[16rem] rounded border border-slate-700 bg-slate-950 px-2 py-2 font-mono text-xs"
                value={reseedEntropy} onChange={(e) => setReseedEntropy(e.target.value)} />
            </label>
            <button onClick={reseed}
              className="rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500">
              Reseed
            </button>
          </div>

          {stateView && (
            <div className="rounded-lg border border-slate-700 bg-slate-900/40 p-4 text-xs">
              <div className="mb-1 text-slate-400">Current state (reseed counter {stateView.reseedCounter})</div>
              <p className="break-all font-mono text-cyan-300">K = {stateView.K}</p>
              <p className="break-all font-mono text-amber-300">V = {stateView.V}</p>
            </div>
          )}

          {outputs.length > 0 && (
            <div className="rounded-lg border border-emerald-500/40 bg-emerald-950/20 p-4">
              <h3 className="mb-2 font-semibold text-white">Generated output</h3>
              <ol className="space-y-2">
                {outputs.map((o, i) => (
                  <li key={i} className="break-all font-mono text-[11px] text-emerald-300">
                    <span className="text-slate-500">#{i + 1}:</span> {o}
                  </li>
                ))}
              </ol>
            </div>
          )}

          <div className="rounded-lg border border-slate-700 bg-slate-900/40 p-4">
            <h3 className="mb-2 font-semibold text-white">State transition trace</h3>
            <ol className="space-y-3">
              {steps.map((s, i) => (
                <li key={i} className="border-l-2 border-slate-700 pl-3">
                  <div className="text-sm text-slate-200">{s.label}</div>
                  <div className="text-xs text-slate-500">{s.detail}</div>
                  <p className="mt-1 break-all font-mono text-[10px] text-cyan-300">K = {s.K}</p>
                  <p className="break-all font-mono text-[10px] text-amber-300">V = {s.V}</p>
                </li>
              ))}
            </ol>
          </div>
        </>
      )}
    </section>
  )
}
