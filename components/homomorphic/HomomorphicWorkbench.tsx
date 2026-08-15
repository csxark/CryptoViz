'use client'

import React, { useState, useMemo } from 'react'
import {
  encrypt,
  decrypt,
  homomorphicAdd,
  homomorphicScalarMul,
} from '@/lib/cipher/asymmetric/paillier'

// Demo keypair matching the verified Paillier test vectors (p=13, q=17).
const DEMO_PUBLIC_KEY = '221,222' // n, g
const DEMO_PRIVATE_KEY = '221,48,198' // n, lambda, mu

interface CipherBox {
  id: string
  label: string
  plaintext: string
  ciphertext: string
}

let boxCounter = 0
const nextId = () => `box-${++boxCounter}`

export default function HomomorphicWorkbench() {
  const [valueA, setValueA] = useState('45')
  const [valueB, setValueB] = useState('30')
  const [scalar, setScalar] = useState('3')
  const [cipherA, setCipherA] = useState('')
  const [cipherB, setCipherB] = useState('')
  const [result, setResult] = useState('')
  const [decrypted, setDecrypted] = useState('')
  const [trace, setTrace] = useState<string[]>([])
  const [error, setError] = useState('')

  // E-voting sandbox
  const [votes, setVotes] = useState<CipherBox[]>([])
  const [newVote, setNewVote] = useState('1')
  const [tally, setTally] = useState('')
  const [tallyDecrypted, setTallyDecrypted] = useState('')

  const n = useMemo(() => 221n, []) // demo modulus
  const n2 = n * n

  const encryptValue = (value: string, label: string): string => {
    try {
      const enc = encrypt(value, DEMO_PUBLIC_KEY)
      setTrace((prev) => [...prev, `Encrypt(${label}) = ${enc.output}`])
      return enc.output
    } catch (e) {
      setError((e as Error).message)
      return ''
    }
  }

  const handleEncryptA = () => {
    setError('')
    const c = encryptValue(valueA, valueA)
    setCipherA(c)
    setResult('')
    setDecrypted('')
  }

  const handleEncryptB = () => {
    setError('')
    const c = encryptValue(valueB, valueB)
    setCipherB(c)
    setResult('')
    setDecrypted('')
  }

  const handleHomomorphicAdd = () => {
    setError('')
    if (!cipherA || !cipherB) {
      setError('Encrypt both values first.')
      return
    }
    const c = homomorphicAdd(cipherA, cipherB, DEMO_PUBLIC_KEY)
    setTrace((prev) => [...prev, `C_A · C_B mod n² = ${c}`])
    setResult(c)
    setDecrypted('')
  }

  const handleScalarMul = () => {
    setError('')
    const source = cipherA || cipherB
    if (!source) {
      setError('Encrypt at least one value first.')
      return
    }
    const c = homomorphicScalarMul(source, scalar, DEMO_PUBLIC_KEY)
    setTrace((prev) => [...prev, `C^${scalar} mod n² = ${c}`])
    setResult(c)
    setDecrypted('')
  }

  const handleDecryptResult = () => {
    setError('')
    if (!result) {
      setError('Compute a homomorphic result first.')
      return
    }
    const dec = decrypt(result, DEMO_PRIVATE_KEY)
    setTrace((prev) => [...prev, `Decrypt(${result}) = ${dec.output}`])
    setDecrypted(dec.output)
  }

  // E-voting sandbox: cast an encrypted vote (m ∈ {0, 1})
  const castVote = () => {
    setError('')
    const m = newVote.trim()
    if (m !== '0' && m !== '1') {
      setError('Votes must be 0 or 1.')
      return
    }
    const c = encryptValue(m, `vote(${m})`)
    if (!c) return
    setVotes((prev) => [...prev, { id: nextId(), label: `Vote ${prev.length + 1}`, plaintext: m, ciphertext: c }])
    setTally('')
    setTallyDecrypted('')
  }

  const handleTally = () => {
    setError('')
    if (votes.length === 0) {
      setError('Cast at least one vote first.')
      return
    }
    let acc = 1n
    for (const v of votes) {
      acc = (acc * BigInt(v.ciphertext)) % n2
    }
    const tallyCipher = acc.toString()
    setTrace((prev) => [...prev, `Tally = ∏ votes mod n² = ${tallyCipher}`])
    setTally(tallyCipher)
    const dec = decrypt(tallyCipher, DEMO_PRIVATE_KEY)
    setTrace((prev) => [...prev, `Decrypt(tally) = ${dec.output}`])
    setTallyDecrypted(dec.output)
  }

  const clearAll = () => {
    setValueA('45')
    setValueB('30')
    setScalar('3')
    setCipherA('')
    setCipherB('')
    setResult('')
    setDecrypted('')
    setTrace([])
    setError('')
    setVotes([])
    setNewVote('1')
    setTally('')
    setTallyDecrypted('')
  }

  const inputClass =
    'mt-2 w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm font-mono focus:border-teal-500 focus:outline-none dark:border-zinc-700'
  const cardClass =
    'bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800'
  const btnClass =
    'px-4 py-2 rounded-lg text-sm font-semibold transition-colors bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-40 disabled:cursor-not-allowed'

  return (
    <div className="space-y-8">
      <header className="max-w-3xl">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-600 dark:text-teal-400">
          Interactive Lab
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
          Homomorphic Encrypted Computation Workbench
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          Paillier is additively homomorphic: multiplying two ciphertexts mod n²
          and decrypting yields the sum of the plaintexts, and raising a
          ciphertext to a power k yields an encryption of k·m — all without
          ever revealing the intermediate plaintexts.
        </p>
      </header>

      {error && (
        <div className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      )}

      {/* ── Encrypt / Homomorphic Operations ─────────────────────────────── */}
      <section aria-label="Homomorphic Operations" className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className={cardClass}>
          <h3 className="text-sm font-semibold text-zinc-500">Value A</h3>
          <input id="valueA" type="number" value={valueA} onChange={(e) => setValueA(e.target.value)} className={inputClass} />
          <button onClick={handleEncryptA} className={`${btnClass} mt-3 w-full`}>
            Encrypt A
          </button>
          {cipherA && (
            <p className="mt-3 break-all font-mono text-xs text-zinc-500">
              C<sub>A</sub> = {cipherA}
            </p>
          )}
        </div>

        <div className={cardClass}>
          <h3 className="text-sm font-semibold text-zinc-500">Value B</h3>
          <input id="valueB" type="number" value={valueB} onChange={(e) => setValueB(e.target.value)} className={inputClass} />
          <button onClick={handleEncryptB} className={`${btnClass} mt-3 w-full`}>
            Encrypt B
          </button>
          {cipherB && (
            <p className="mt-3 break-all font-mono text-xs text-zinc-500">
              C<sub>B</sub> = {cipherB}
            </p>
          )}
        </div>

        <div className={cardClass}>
          <h3 className="text-sm font-semibold text-zinc-500">Homomorphic Operations</h3>
          <button onClick={handleHomomorphicAdd} disabled={!cipherA || !cipherB} className={`${btnClass} mt-3 w-full`}>
            Add (C<sub>A</sub>·C<sub>B</sub> mod n²)
          </button>
          <label htmlFor="scalar" className="mt-4 block text-xs font-medium text-zinc-500">
            Scalar k
          </label>
          <input id="scalar" type="number" min="0" value={scalar} onChange={(e) => setScalar(e.target.value)} className={inputClass} />
          <button onClick={handleScalarMul} className={`${btnClass} mt-3 w-full`}>
            Scalar Multiply (C<sup>k</sup> mod n²)
          </button>
        </div>
      </section>

      {/* ── Result & Decrypt ─────────────────────────────────────────────── */}
      <section aria-label="Result" className={cardClass}>
        <h3 className="text-sm font-semibold text-zinc-500">Result</h3>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <code className="break-all rounded-lg bg-zinc-100 px-3 py-2 font-mono text-sm dark:bg-zinc-800">
            {result || '—'}
          </code>
          <button onClick={handleDecryptResult} disabled={!result} className={btnClass}>
            Decrypt Result
          </button>
          {decrypted && (
            <span className="text-lg font-bold text-teal-600 dark:text-teal-400">
              = {decrypted}
            </span>
          )}
        </div>
      </section>

      {/* ── Private E-Voting Sandbox ─────────────────────────────────────── */}
      <section aria-label="Private E-Voting Sandbox" className={cardClass}>
        <h3 className="text-sm font-semibold text-zinc-500">Private E-Voting Sandbox</h3>
        <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
          Cast encrypted votes (m ∈ {'{0, 1}'}). The tally is computed entirely on
          ciphertexts: C_total = ∏ c_i mod n². Individual votes are never revealed.
        </p>

        <div className="mt-4 flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor="newVote" className="block text-xs font-medium text-zinc-500">
              Vote (0 or 1)
            </label>
            <input
              id="newVote"
              type="number"
              min="0"
              max="1"
              value={newVote}
              onChange={(e) => setNewVote(e.target.value)}
              className={inputClass}
            />
          </div>
          <button onClick={castVote} className={btnClass}>
            Cast Encrypted Vote
          </button>
          <button onClick={handleTally} disabled={votes.length === 0} className={btnClass}>
            Tally Votes
          </button>
          <button onClick={clearAll} className="px-4 py-2 rounded-lg text-sm font-semibold border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800">
            Reset
          </button>
        </div>

        {votes.length > 0 && (
          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {votes.map((v) => (
              <div key={v.id} className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
                <p className="text-xs font-semibold text-zinc-500">{v.label}</p>
                <p className="mt-1 break-all font-mono text-xs">E({v.plaintext}) = {v.ciphertext}</p>
              </div>
            ))}
          </div>
        )}

        {tally && (
          <div className="mt-4 rounded-lg bg-zinc-50 p-4 dark:bg-zinc-800/50">
            <p className="text-xs font-semibold text-zinc-500">Tally ciphertext</p>
            <code className="mt-1 block break-all font-mono text-sm">{tally}</code>
            {tallyDecrypted && (
              <p className="mt-2 text-lg font-bold text-teal-600 dark:text-teal-400">
                Decrypted tally = {tallyDecrypted}
              </p>
            )}
          </div>
        )}
      </section>

      {/* ── Mathematical Trace ───────────────────────────────────────────── */}
      <section aria-label="Mathematical Trace" className={cardClass}>
        <h3 className="text-sm font-semibold text-zinc-500">Real-Time Mathematical Trace</h3>
        <p className="mt-2 text-xs text-zinc-500">
          Demo keypair: n = 221 (p=13, q=17), n² = {n2.toString()}, g = 222
        </p>
        {trace.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-400">No operations yet — try encrypting a value.</p>
        ) : (
          <ul className="mt-3 space-y-1 font-mono text-xs">
            {trace.map((line, i) => (
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
