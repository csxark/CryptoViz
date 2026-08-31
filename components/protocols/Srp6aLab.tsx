'use client'

import { useState } from 'react'
import { runSrp6a, type Srp6aResult } from '@/lib/protocols/srp6a'

const DEFAULTS = {
  identity: 'alice',
  password: 'password123',
  salt: 'beb25379d1a8581eb5a727673a2441ee',
}

function parseSalt(hex: string): Uint8Array {
  const clean = hex.trim().replace(/^0x/i, '').replace(/\s+/g, '')
  if (!/^[0-9a-fA-F]+$/.test(clean) || clean.length % 2 !== 0) {
    throw new Error('Salt must be an even-length hex string.')
  }
  const out = new Uint8Array(clean.length / 2)
  for (let i = 0; i < out.length; i++) out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16)
  return out
}

function short(hex: string): string {
  return hex.length > 24 ? `${hex.slice(0, 12)}…${hex.slice(-8)}` : hex
}

export default function Srp6aLab() {
  const [identity, setIdentity] = useState(DEFAULTS.identity)
  const [password, setPassword] = useState(DEFAULTS.password)
  const [salt, setSalt] = useState(DEFAULTS.salt)
  const [attackerMode, setAttackerMode] = useState(false)
  const [attempted, setAttempted] = useState('wrong-guess')
  const [result, setResult] = useState<Srp6aResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  function run() {
    setError(null)
    setResult(null)
    try {
      setResult(
        runSrp6a({
          identity,
          password,
          salt: parseSalt(salt),
          attemptedPassword: attackerMode ? attempted : undefined,
        }),
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  return (
    <section className="mx-auto max-w-4xl space-y-6 px-4 py-8 text-slate-200">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold text-white">SRP-6a Password-Authenticated Key Exchange</h1>
        <p className="text-sm text-slate-400">
          SRP (RFC 5054, used by Apple iCloud and 1Password) lets a client and server agree on a
          strong shared key from a <em>password</em> — without the password ever crossing the wire,
          and without the server storing anything an attacker could brute-force offline. Watch both
          sides reach the same secret, then try logging in with the wrong password.
        </p>
      </header>

      <div className="grid gap-3 rounded-lg border border-slate-700 bg-slate-900/40 p-5">
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="text-sm">Identity
            <input className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-2"
              value={identity} onChange={(e) => setIdentity(e.target.value)} />
          </label>
          <label className="text-sm">Password (registered)
            <input className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-2"
              value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>
          <label className="text-sm">Salt (hex)
            <input className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-2 font-mono text-xs"
              value={salt} onChange={(e) => setSalt(e.target.value)} />
          </label>
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input type="checkbox" checked={attackerMode} onChange={(e) => setAttackerMode(e.target.checked)} />
          Log in with a different (wrong) password
        </label>
        {attackerMode && (
          <label className="text-sm">Attempted password
            <input className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-2"
              value={attempted} onChange={(e) => setAttempted(e.target.value)} />
          </label>
        )}
        <button onClick={run}
          className="w-fit rounded bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-500">
          Run the handshake
        </button>
        {error && <p className="text-sm text-red-400">{error}</p>}
      </div>

      {result && (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-cyan-500/40 bg-cyan-950/20 p-4">
              <h3 className="font-semibold text-cyan-200">Client</h3>
              <dl className="mt-2 space-y-1 font-mono text-[11px] text-slate-300">
                <div>A = {short(result.A)}</div>
                <div>u = {short(result.u)}</div>
                <div>S = {short(result.clientS)}</div>
                <div>M1 → server</div>
              </dl>
            </div>
            <div className="rounded-lg border border-fuchsia-500/40 bg-fuchsia-950/20 p-4">
              <h3 className="font-semibold text-fuchsia-200">Server (stores salt + verifier only)</h3>
              <dl className="mt-2 space-y-1 font-mono text-[11px] text-slate-300">
                <div>v = {short(result.verifier)}</div>
                <div>B = {short(result.B)}</div>
                <div>S = {short(result.serverS)}</div>
                <div>M2 → client</div>
              </dl>
            </div>
          </div>

          <div className={`rounded-lg border p-4 ${result.sharedSecretMatches && result.clientProofValid ? 'border-emerald-500/60 bg-emerald-950/20' : 'border-red-500/60 bg-red-950/20'}`}>
            <h3 className="font-semibold text-white">
              {result.sharedSecretMatches && result.clientProofValid
                ? '✅ Mutual authentication succeeded'
                : '❌ Authentication failed'}
            </h3>
            <ul className="mt-2 space-y-1 text-sm text-slate-300">
              <li>Shared secret S matches on both sides: {result.sharedSecretMatches ? 'yes' : 'no'}</li>
              <li>Server accepts client proof M1: {result.clientProofValid ? 'yes' : 'no'}</li>
              <li>Client accepts server proof M2: {result.serverProofValid ? 'yes' : 'no'}</li>
            </ul>
            {result.sharedSecretMatches && (
              <p className="mt-2 break-all font-mono text-[11px] text-emerald-300">session key K = {result.sessionKey}</p>
            )}
          </div>

          <div className="rounded-lg border border-slate-700 bg-slate-900/40 p-4">
            <h3 className="mb-1 font-semibold text-white">👁️ What a network eavesdropper sees</h3>
            <p className="text-xs text-slate-400">
              Only public values cross the wire — never the password or the verifier’s secret exponent:
            </p>
            <ul className="mt-2 space-y-1 font-mono text-[11px] text-slate-400">
              <li>identity = {identity}</li>
              <li>salt = {result.salt}</li>
              <li>A = {short(result.A)}</li>
              <li>B = {short(result.B)}</li>
            </ul>
            <p className="mt-2 text-xs text-slate-500">
              From these, recovering the password requires solving a discrete log — and a stolen
              server database (salt + verifier) still can’t be replayed as the user. That is the
              point of an augmented PAKE.
            </p>
          </div>

          <div className="rounded-lg border border-slate-700 bg-slate-900/40 p-4">
            <h3 className="mb-2 font-semibold text-white">Handshake steps</h3>
            <ol className="space-y-2">
              {result.steps.map((s, i) => (
                <li key={i} className="border-l-2 border-slate-700 pl-3">
                  <div className="text-sm text-slate-200">{s.label}</div>
                  <div className="text-xs text-slate-500">{s.detail}</div>
                  {s.value && (
                    <pre className="mt-1 overflow-x-auto whitespace-pre-wrap break-all font-mono text-[10px] text-emerald-300">{s.value}</pre>
                  )}
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </section>
  )
}
