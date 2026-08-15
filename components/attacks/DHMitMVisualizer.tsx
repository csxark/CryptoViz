'use client'

import React, { useState } from 'react'

// Textbook Diffie-Hellman demo parameters (RFC-style small prime).
const P = 23n
const G = 5n

function modPow(base: bigint, exp: bigint, mod: bigint): bigint {
  let result = 1n
  let b = base % mod
  let e = exp
  while (e > 0n) {
    if (e & 1n) result = (result * b) % mod
    b = (b * b) % mod
    e >>= 1n
  }
  return result
}

// Simple XOR-based stream cipher for the payload demo (educational only).
function xorEncode(text: string, key: bigint): string {
  const keyBytes = Array.from({ length: 4 }, (_, i) => Number((key >> BigInt(i * 8)) & 0xffn))
  return Array.from(text)
    .map((ch, i) => String.fromCharCode(ch.charCodeAt(0) ^ keyBytes[i % keyBytes.length]))
    .join('')
}

export default function DHMitMVisualizer() {
  const [aliceSecret, setAliceSecret] = useState('6')
  const [bobSecret, setBobSecret] = useState('15')
  const [eveSecret, setEveSecret] = useState('9')
  const [eveActive, setEveActive] = useState(true)
  const [signedKeys, setSignedKeys] = useState(false)
  const [message, setMessage] = useState('Hello Bob')
  const [alteredMessage, setAlteredMessage] = useState('Hello Mallory')
  const [log, setLog] = useState<string[]>([])

  const a = BigInt(aliceSecret || '0') % (P - 1n)
  const b = BigInt(bobSecret || '0') % (P - 1n)
  const e1 = BigInt(eveSecret || '0') % (P - 1n)
  const e2 = e1

  // Public keys
  const A = modPow(G, a, P) // Alice's public key g^a
  const B = modPow(G, b, P) // Bob's public key g^b
  const E1 = modPow(G, e1, P) // Eve's public key 1 (sent to Bob)
  const E2 = modPow(G, e2, P) // Eve's public key 2 (sent to Alice)

  // Shared secrets
  // Without MitM: K_AB = g^(a*b)
  const KAB = modPow(B, a, P)
  // With MitM:
  const KAE = modPow(E2, a, P) // Alice thinks she shares with Bob, really with Eve
  const KEB = modPow(E1, b, P) // Bob thinks he shares with Alice, really with Eve
  const KEA = modPow(A, e2, P) // Eve's key with Alice
  const KEB2 = modPow(B, e1, P) // Eve's key with Bob

  const attackDetected = signedKeys && eveActive

  const runExchange = () => {
    const lines: string[] = []
    lines.push(`Alice computes A = g^a mod p = ${G}^${a} mod ${P} = ${A}`)
    if (eveActive) {
      lines.push(`Eve intercepts A=${A}, substitutes E₁ = g^e₁ mod p = ${E1}`)
      lines.push(`Bob receives E₁=${E1} instead of A`)
    } else {
      lines.push(`Bob receives A=${A} directly`)
    }
    lines.push(`Bob computes B = g^b mod p = ${G}^${b} mod ${P} = ${B}`)
    if (eveActive) {
      lines.push(`Eve intercepts B=${B}, substitutes E₂ = g^e₂ mod p = ${E2}`)
      lines.push(`Alice receives E₂=${E2} instead of B`)
    } else {
      lines.push(`Alice receives B=${B} directly`)
    }
    if (eveActive) {
      lines.push(`Alice key K_AE = E₂^a = ${KAE}`)
      lines.push(`Eve key K_EA = A^e₂ = ${KEA} (matches K_AE = ${KAE === KEA ? '✓' : '✗'})`)
      lines.push(`Bob key K_BE = E₁^b = ${KEB}`)
      lines.push(`Eve key K_EB = B^e₁ = ${KEB2} (matches K_BE = ${KEB === KEB2 ? '✓' : '✗'})`)
    } else {
      lines.push(`Shared secret K_AB = B^a = ${KAB}`)
    }
    if (signedKeys && eveActive) {
      lines.push('Signature verification FAILED: Alice and Bob detect Eve\'s substituted keys.')
    }
    setLog(lines)
  }

  const sendMessage = () => {
    const senderKey = eveActive ? KAE : KAB // Alice's effective key
    const receiverKey = eveActive ? KEB : KAB // Bob's effective key

    if (eveActive) {
      const enc = xorEncode(message, senderKey)
      const decryptedByEve = xorEncode(enc, KEA)
      const tampered = xorEncode(alteredMessage, KEB)
      setLog([
        `Alice encrypts "${message}" with K_AE=${senderKey}`,
        `Eve decrypts with K_EA=${KEA}: "${decryptedByEve}"`,
        `Eve re-encrypts modified "${alteredMessage}" with K_EB=${KEB}`,
        `Bob decrypts with K_BE=${receiverKey}: "${xorEncode(tampered, receiverKey)}"`,
        ...(signedKeys ? ['Signature check FAILED — tampering detected.'] : []),
      ])
    } else {
      const enc = xorEncode(message, KAB)
      const dec = xorEncode(enc, receiverKey)
      setLog([
        `Alice encrypts "${message}" with K=${KAB}`,
        `Bob decrypts with K=${receiverKey}: "${dec}"`,
      ])
    }
  }

  const nodeClass =
    'rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-sm'
  const badgeClass =
    'inline-block rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider'

  return (
    <div className="space-y-8">
      <header className="max-w-3xl">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-rose-600 dark:text-rose-400">
          Active Attack Lab
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
          Diffie-Hellman Man-in-the-Middle Simulator
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          Unauthenticated Diffie-Hellman is vulnerable to active interception:
          Eve substitutes both public keys, then relays and decrypts every
          message while Alice and Bob believe they share a key with each other.
          Toggle on digital signatures to see the attack fail.
        </p>
      </header>

      {/* ── Controls ─────────────────────────────────────────────────────── */}
      <section aria-label="Controls" className="grid grid-cols-1 gap-4 rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900 sm:grid-cols-3">
        <div>
          <label htmlFor="aliceSecret" className="block text-xs font-semibold text-zinc-500">
            Alice private key a
          </label>
          <input id="aliceSecret" type="number" value={aliceSecret} onChange={(e) => setAliceSecret(e.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 font-mono text-sm dark:border-zinc-700" />
        </div>
        <div>
          <label htmlFor="bobSecret" className="block text-xs font-semibold text-zinc-500">
            Bob private key b
          </label>
          <input id="bobSecret" type="number" value={bobSecret} onChange={(e) => setBobSecret(e.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 font-mono text-sm dark:border-zinc-700" />
        </div>
        <div>
          <label htmlFor="eveSecret" className="block text-xs font-semibold text-zinc-500">
            Eve private key e
          </label>
          <input id="eveSecret" type="number" value={eveSecret} onChange={(e) => setEveSecret(e.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 font-mono text-sm dark:border-zinc-700" />
        </div>
      </section>

      {/* ── Toggles ──────────────────────────────────────────────────────── */}
      <section aria-label="Toggles" className="flex flex-wrap items-center gap-6">
        <label className="flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" checked={eveActive} onChange={(e) => setEveActive(e.target.checked)} className="h-4 w-4 accent-rose-600" />
          Eve Active Interception
        </label>
        <label className="flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" checked={signedKeys} onChange={(e) => setSignedKeys(e.target.checked)} className="h-4 w-4 accent-teal-600" />
          Digital Signatures (Station-to-Station protection)
        </label>
        <button
          onClick={runExchange}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          Run Key Exchange
        </button>
      </section>

      {attackDetected && (
        <div className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm font-semibold text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300">
          ⚠️ Eve&apos;s substituted keys were rejected — Alice and Bob verified the
          signatures and aborted the exchange.
        </div>
      )}

      {/* ── 3-Node Layout ────────────────────────────────────────────────── */}
      <section aria-label="Network Nodes" className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className={nodeClass}>
          <span className={`${badgeClass} bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300`}>Alice</span>
          <p className="mt-3 font-mono text-sm">A = g^a = {A}</p>
          {eveActive ? (
            <p className="mt-2 text-xs text-zinc-500">
              Receives <span className="font-mono">E₂ = {E2}</span> (Eve&apos;s key)
            </p>
          ) : (
            <p className="mt-2 text-xs text-zinc-500">
              Receives <span className="font-mono">B = {B}</span>
            </p>
          )}
          {eveActive && <p className="mt-2 font-mono text-xs text-rose-600 dark:text-rose-400">K_AE = {KAE}</p>}
          {!eveActive && <p className="mt-2 font-mono text-xs text-teal-600 dark:text-teal-400">K = {KAB}</p>}
        </div>

        <div className={`${nodeClass} border-rose-400 dark:border-rose-800 ${eveActive ? '' : 'opacity-40'}`}>
          <span className={`${badgeClass} bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300`}>Eve (MitM)</span>
          <p className="mt-3 font-mono text-sm">E₁ = g^e₁ = {E1}</p>
          <p className="mt-1 font-mono text-sm">E₂ = g^e₂ = {E2}</p>
          {eveActive && (
            <>
              <p className="mt-2 font-mono text-xs">K_EA = {KEA}</p>
              <p className="mt-1 font-mono text-xs">K_EB = {KEB2}</p>
            </>
          )}
        </div>

        <div className={nodeClass}>
          <span className={`${badgeClass} bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300`}>Bob</span>
          <p className="mt-3 font-mono text-sm">B = g^b = {B}</p>
          {eveActive ? (
            <p className="mt-2 text-xs text-zinc-500">
              Receives <span className="font-mono">E₁ = {E1}</span> (Eve&apos;s key)
            </p>
          ) : (
            <p className="mt-2 text-xs text-zinc-500">
              Receives <span className="font-mono">A = {A}</span>
            </p>
          )}
          {eveActive && <p className="mt-2 font-mono text-xs text-rose-600 dark:text-rose-400">K_BE = {KEB}</p>}
          {!eveActive && <p className="mt-2 font-mono text-xs text-teal-600 dark:text-teal-400">K = {KAB}</p>}
        </div>
      </section>

      {/* ── Payload Inspection ───────────────────────────────────────────── */}
      <section aria-label="Payload Inspection" className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-sm font-semibold text-zinc-500">Payload Inspection</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="message" className="block text-xs font-medium text-zinc-500">
              Alice&apos;s message
            </label>
            <input id="message" value={message} onChange={(e) => setMessage(e.target.value)} className="mt-1 w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm dark:border-zinc-700" />
          </div>
          <div>
            <label htmlFor="alteredMessage" className="block text-xs font-medium text-zinc-500">
              Eve&apos;s altered message
            </label>
            <input id="alteredMessage" value={alteredMessage} onChange={(e) => setAlteredMessage(e.target.value)} className="mt-1 w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm dark:border-zinc-700" />
          </div>
          <div className="flex items-end">
            <button
              onClick={sendMessage}
              className="w-full rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700"
            >
              Send Message
            </button>
          </div>
        </div>
      </section>

      {/* ── Log ──────────────────────────────────────────────────────────── */}
      <section aria-label="Trace Log" className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-sm font-semibold text-zinc-500">Step-by-Step Trace</h2>
        {log.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-400">Run the key exchange to see the trace.</p>
        ) : (
          <ul className="mt-3 space-y-1 font-mono text-xs">
            {log.map((line, i) => (
              <li key={i} className="rounded bg-zinc-50 px-2 py-1 dark:bg-zinc-800/50">
                {line}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
