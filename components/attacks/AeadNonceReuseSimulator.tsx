'use client'

import { useEffect, useRef, useState, useId } from 'react'
import { gcmEncryptRaw } from '@/lib/cipher/symmetric/aes-gcm'
import {
  runForbiddenAttack,
  textToBlock,
  toHex,
  blockToText,
  type ForbiddenAttackResult,
} from '@/lib/attacks/aeadNonceReuse'
import AttackControlBar from './AttackControlBar'

const DEFAULTS = {
  key: '000102030405060708090a0b0c0d0e0f',
  iv: '00b1c2d3e4f5a6b7c8d9ea01',
  message1: 'transfer $10 Bob',
  message2: 'refund $10 Alice',
  forged: 'PAY ATTACKER $$$',
}

function equalBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false
  return true
}

function parseHex(label: string, value: string, byteLen: number): Uint8Array {
  const clean = value.trim().replace(/^0x/i, '').replace(/\s+/g, '')
  if (!/^[0-9a-fA-F]*$/.test(clean)) throw new Error(`${label} must be hexadecimal.`)
  if (clean.length !== byteLen * 2) {
    throw new Error(`${label} must be ${byteLen} bytes (${byteLen * 2} hex chars).`)
  }
  const out = new Uint8Array(byteLen)
  for (let i = 0; i < byteLen; i++) out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16)
  return out
}

interface RunState {
  attack: ForbiddenAttackResult
  forgeryAccepted: boolean
}

export default function AeadNonceReuseSimulator() {
  const [key, setKey] = useState(DEFAULTS.key)
  const [iv, setIv] = useState(DEFAULTS.iv)
  const [message1, setMessage1] = useState(DEFAULTS.message1)
  const [message2, setMessage2] = useState(DEFAULTS.message2)
  const [forged, setForged] = useState(DEFAULTS.forged)

  const [state, setState] = useState<RunState | null>(null)
  const [cursor, setCursor] = useState(-1)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const keyId = useId()
  const ivId = useId()
  const msg1Id = useId()
  const msg2Id = useId()
  const forgedId = useId()

  const timer = useRef<ReturnType<typeof setInterval> | null>(null)
  useEffect(() => () => { if (timer.current) clearInterval(timer.current) }, [])

  function run() {
    if (timer.current) clearInterval(timer.current)
    setRunning(false)
    setError(null)
    setState(null)
    setCursor(-1)
    try {
      const keyBytes = parseHex('AES key', key, 16)
      const ivBytes = parseHex('Nonce (IV)', iv, 12)
      const p1 = textToBlock(message1)
      const p2 = textToBlock(message2)
      if (blockToText(p1) === blockToText(p2)) {
        throw new Error('The two messages must differ for the attack to leak the key.')
      }
      const pStar = textToBlock(forged)

      // The victim encrypts both messages under the SAME nonce — the fatal bug.
      const v1 = gcmEncryptRaw(keyBytes, ivBytes, p1)
      const v2 = gcmEncryptRaw(keyBytes, ivBytes, p2)

      // The attacker sees only the ciphertexts and tags (plus one known plaintext).
      const attack = runForbiddenAttack(
        { ciphertext: v1.ciphertext, tag: v1.tag },
        { ciphertext: v2.ciphertext, tag: v2.tag },
        p1,
        pStar,
      )

      // Confirm the forgery: the genuine key, encrypting the forged plaintext under
      // the same nonce, reproduces the attacker's ciphertext and tag exactly.
      const oracle = gcmEncryptRaw(keyBytes, ivBytes, attack.forgedPlaintext)
      const forgeryAccepted =
        equalBytes(oracle.ciphertext, attack.forgedCiphertext) &&
        equalBytes(oracle.tag, attack.forgedTag)

      setState({ attack, forgeryAccepted })
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  function play() {
    if (!state) return
    setRunning(true)
    timer.current = setInterval(() => {
      setCursor((c) => {
        if (!state || c >= state.attack.steps.length - 1) {
          if (timer.current) clearInterval(timer.current)
          setRunning(false)
          return c
        }
        return c + 1
      })
    }, 1000)
  }
  function pause() { if (timer.current) clearInterval(timer.current); setRunning(false) }

  const steps = state?.attack.steps ?? []
  const current = steps[cursor]

  return (
    <section className="mx-auto max-w-4xl space-y-6 px-4 py-8 text-slate-200">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold text-white">AEAD Nonce-Reuse Catastrophe Lab</h1>
        <p className="text-sm text-slate-400">
          AES-GCM authenticates with a tag <code>T = GHASH_H(C) ⊕ E_K(J0)</code>. The mask{' '}
          <code>E_K(J0)</code> depends only on the nonce, so reusing a nonce lets an attacker
          subtract two tags, solve for the secret GHASH key <code>H</code> in GF(2¹²⁸), and{' '}
          <strong>forge a valid tag for any message</strong> — the &ldquo;forbidden attack.&rdquo;
          Encrypt two messages under one nonce and watch authentication collapse.
        </p>
      </header>

      <div className="grid gap-3 rounded-lg border border-slate-700 bg-slate-900/40 p-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col">
            <label htmlFor={keyId} className="text-sm">AES-128 key (hex)</label>
            <input id={keyId} className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-2 font-mono text-xs"
              value={key} onChange={(e) => setKey(e.target.value)} />
          </div>
          <div className="flex flex-col">
            <label htmlFor={ivId} className="text-sm">Nonce / IV — reused (96-bit hex)</label>
            <input id={ivId} className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-2 font-mono text-xs"
              value={iv} onChange={(e) => setIv(e.target.value)} />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col">
            <label htmlFor={msg1Id} className="text-sm">Message 1 (≤ 16 chars)</label>
            <input id={msg1Id} maxLength={16} className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-2"
              value={message1} onChange={(e) => setMessage1(e.target.value)} />
          </div>
          <div className="flex flex-col">
            <label htmlFor={msg2Id} className="text-sm">Message 2 (≤ 16 chars)</label>
            <input id={msg2Id} maxLength={16} className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-2"
              value={message2} onChange={(e) => setMessage2(e.target.value)} />
          </div>
        </div>
        <div className="flex flex-col">
          <label htmlFor={forgedId} className="text-sm">Forged message the attacker wants accepted (≤ 16 chars)</label>
          <input id={forgedId} maxLength={16} className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-2"
            value={forged} onChange={(e) => setForged(e.target.value)} />
        </div>
        <button onClick={run}
          className="w-fit rounded bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-500">
          Reuse the nonce &amp; run the attack
        </button>
        {error && <p className="text-sm text-red-400">{error}</p>}
      </div>

      {state && (
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

          <div className={`rounded-lg border p-4 ${state.forgeryAccepted ? 'border-red-500/60 bg-red-950/20' : 'border-slate-700'}`}>
            <h3 className="font-semibold text-white">
              {state.forgeryAccepted ? '🔓 Forgery accepted by the real verifier' : 'Forgery not accepted'}
            </h3>
            <p className="mt-1 break-all font-mono text-xs text-red-300">H = {toHex(state.attack.recovered.H)}</p>
            <p className="mt-1 break-all font-mono text-xs text-red-300">pad E_K(J0) = {toHex(state.attack.recovered.pad)}</p>
            <p className="mt-2 text-sm text-slate-300">
              Forged &ldquo;{blockToText(state.attack.forgedPlaintext)}&rdquo; →{' '}
              <span className="font-mono text-[11px] text-emerald-300">tag {toHex(state.attack.forgedTag)}</span>
            </p>
            <p className="mt-1 text-xs text-slate-500">
              The GHASH key and pad were recovered from two public ciphertext/tag pairs alone — the
              forged tag then verifies under the genuine key. Never reuse an AES-GCM nonce: use a
              random 96-bit nonce per message, or a deterministic counter (RFC 8452 AES-GCM-SIV is
              built to survive reuse).
            </p>
          </div>
        </div>
      )}
    </section>
  )
}
