'use client'

import { useEffect, useRef, useState } from 'react'
import {
  runNonceReuseAttack,
  signWithNonce,
  malleateSignature,
  verifySignature,
  publicKeyOf,
  toHex,
  type NonceReuseAttackResult,
} from '@/lib/attacks/signatureNonceReuse'
import AttackControlBar from './AttackControlBar'

const DEFAULTS = {
  privateKey: '0f1e2d3c4b5a69788796a5b4c3d2e1f00f1e2d3c4b5a69788796a5b4c3d2e1f0',
  nonce: 'a1b2c3d4e5f60718293a4b5c6d7e8f90',
  message1: 'transfer 1 BTC to alice',
  message2: 'transfer 50 BTC to eve',
}

function parseHex(label: string, value: string): bigint {
  const clean = value.trim().replace(/^0x/i, '')
  if (!/^[0-9a-fA-F]+$/.test(clean)) {
    throw new Error(`${label} must be a hexadecimal value.`)
  }
  return BigInt('0x' + clean)
}

export default function SignatureNonceReuseSimulator() {
  const [privateKey, setPrivateKey] = useState(DEFAULTS.privateKey)
  const [nonce, setNonce] = useState(DEFAULTS.nonce)
  const [message1, setMessage1] = useState(DEFAULTS.message1)
  const [message2, setMessage2] = useState(DEFAULTS.message2)

  const [result, setResult] = useState<NonceReuseAttackResult | null>(null)
  const [cursor, setCursor] = useState(-1)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [malleable, setMalleable] = useState<{ original: string; twin: string; bothValid: boolean } | null>(null)

  const timer = useRef<ReturnType<typeof setInterval> | null>(null)
  useEffect(() => () => { if (timer.current) clearInterval(timer.current) }, [])

  function run() {
    if (timer.current) clearInterval(timer.current)
    setRunning(false)
    setError(null)
    setResult(null)
    setMalleable(null)
    setCursor(-1)
    try {
      const d = parseHex('Private key', privateKey)
      const k = parseHex('Reused nonce', nonce)
      if (message1.trim() === message2.trim()) {
        throw new Error('The two messages must differ for the attack to work.')
      }
      const attack = runNonceReuseAttack(d, k, message1, message2)
      setResult(attack)

      // Malleability demo on the first signature.
      const sig = signWithNonce(message1, d, k)
      const twin = malleateSignature(sig)
      const pub = publicKeyOf(d)
      setMalleable({
        original: `${toHex(sig.r)}${toHex(sig.s)}`,
        twin: `${toHex(twin.r)}${toHex(twin.s)}`,
        bothValid:
          verifySignature(message1, sig, pub) && verifySignature(message1, twin, pub),
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  function play() {
    if (!result) return
    setRunning(true)
    timer.current = setInterval(() => {
      setCursor((c) => {
        if (!result || c >= result.steps.length - 1) {
          if (timer.current) clearInterval(timer.current)
          setRunning(false)
          return c
        }
        return c + 1
      })
    }, 900)
  }
  function pause() { if (timer.current) clearInterval(timer.current); setRunning(false) }

  const steps = result?.steps ?? []
  const current = steps[cursor]

  return (
    <section className="mx-auto max-w-4xl space-y-6 px-4 py-8 text-slate-200">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold text-white">Signature Nonce-Reuse Attack Lab</h1>
        <p className="text-sm text-slate-400">
          ECDSA leaks the signer&apos;s private key the moment a nonce <code>k</code> is reused across
          two messages — the exact bug behind the Sony PS3 signing-key leak and drained Bitcoin
          wallets. Sign two messages with the same nonce and watch the key fall out.
        </p>
      </header>

      <div className="grid gap-3 rounded-lg border border-slate-700 bg-slate-900/40 p-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm">Private key (hex)
            <input className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-2 font-mono text-xs"
              value={privateKey} onChange={(e) => setPrivateKey(e.target.value)} />
          </label>
          <label className="text-sm">Reused nonce k (hex)
            <input className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-2 font-mono text-xs"
              value={nonce} onChange={(e) => setNonce(e.target.value)} />
          </label>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm">Message 1
            <input className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-2"
              value={message1} onChange={(e) => setMessage1(e.target.value)} />
          </label>
          <label className="text-sm">Message 2
            <input className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-2"
              value={message2} onChange={(e) => setMessage2(e.target.value)} />
          </label>
        </div>
        <button onClick={run}
          className="w-fit rounded bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-500">
          Run the attack
        </button>
        {error && <p className="text-sm text-red-400">{error}</p>}
      </div>

      {result && (
        <div className="space-y-4">
          <AttackControlBar
            running={running}
            canPrevious={cursor >= 0}
            canNext={cursor < steps.length - 1}
            onPlay={play}
            onPause={pause}
            onPrevious={() => setCursor((c) => Math.max(-1, c - 1))}
            onNext={() => setCursor((c) => Math.min(steps.length - 1, c + 1))}
            onReset={() => { pause(); setCursor(-1) }}
          />
          <div className="text-xs text-slate-500">Step {Math.max(0, cursor + 1)} / {steps.length}</div>

          {current && (
            <div className={`rounded-lg border p-4 ${current.isMilestone ? 'border-amber-400/60 bg-amber-950/20' : 'border-cyan-500/40 bg-cyan-950/20'}`}>
              <h3 className="font-semibold text-white">{current.label}</h3>
              <p className="mt-1 text-sm text-slate-300">{current.detail}</p>
              {current.value && (
                <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-all rounded bg-slate-950 p-2 font-mono text-[11px] text-emerald-300">{current.value}</pre>
              )}
            </div>
          )}

          <div className={`rounded-lg border p-4 ${result.keyRecovered ? 'border-red-500/60 bg-red-950/20' : 'border-slate-700'}`}>
            <h3 className="font-semibold text-white">
              {result.keyRecovered ? '🔓 Private key fully recovered' : 'Recovery failed'}
            </h3>
            <p className="mt-1 break-all font-mono text-xs text-red-300">d = {toHex(result.recovered.d)}</p>
            <p className="mt-1 text-xs text-slate-500">
              Recovered from two public signatures alone — no access to the signer&apos;s secrets.
            </p>
          </div>

          {malleable && (
            <div className="rounded-lg border border-slate-700 bg-slate-900/40 p-4">
              <h3 className="font-semibold text-white">Bonus: signature malleability</h3>
              <p className="mt-1 text-sm text-slate-400">
                Both <code>(r, s)</code> and <code>(r, n−s)</code> are valid signatures on the same
                message — why systems must never treat raw signature bytes as a unique identifier.
              </p>
              <p className="mt-2 break-all font-mono text-[11px] text-slate-400">original: {malleable.original}</p>
              <p className="mt-1 break-all font-mono text-[11px] text-slate-400">twin:&nbsp;&nbsp;&nbsp;&nbsp; {malleable.twin}</p>
              <p className="mt-1 text-xs text-emerald-400">Both verify: {malleable.bothValid ? 'yes' : 'no'}</p>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
