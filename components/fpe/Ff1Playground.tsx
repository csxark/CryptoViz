'use client'

import { useMemo, useState } from 'react'
import {
  ff1Encrypt,
  ff1Decrypt,
  stringToNumerals,
  numeralsToString,
  parseTweak,
  ALPHABETS,
  type Ff1Step,
} from '@/lib/cipher/fpe/ff1'

const ALPHABET_OPTIONS = [
  { id: 'decimal', label: 'Decimal (0-9) — cards, SSNs', alphabet: ALPHABETS.decimal },
  { id: 'hex', label: 'Hex (0-9a-f)', alphabet: ALPHABETS.hex },
  { id: 'alphanumericLower', label: 'Alphanumeric (0-9a-z)', alphabet: ALPHABETS.alphanumericLower },
  { id: 'base62', label: 'Base62 (0-9a-zA-Z)', alphabet: ALPHABETS.base62 },
] as const

const DEFAULTS = {
  key: '2b7e151628aed2a6abf7158809cf4f3c',
  tweak: '',
  plaintext: '4111111111111111', // a card-shaped value
}

function parseKey(hex: string): Uint8Array {
  const clean = hex.trim().replace(/^0x/i, '').replace(/\s+/g, '')
  if (!/^[0-9a-fA-F]*$/.test(clean)) throw new Error('Key must be hexadecimal.')
  if (![32, 48, 64].includes(clean.length)) {
    throw new Error('Key must be 128, 192 or 256 bits (32/48/64 hex chars).')
  }
  const out = new Uint8Array(clean.length / 2)
  for (let i = 0; i < out.length; i++) out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16)
  return out
}

interface RunResult {
  ciphertext: string
  roundTripOk: boolean
  steps: Ff1Step[]
  radix: number
}

export default function Ff1Playground() {
  const [key, setKey] = useState(DEFAULTS.key)
  const [alphabetId, setAlphabetId] = useState<(typeof ALPHABET_OPTIONS)[number]['id']>('decimal')
  const [tweak, setTweak] = useState(DEFAULTS.tweak)
  const [plaintext, setPlaintext] = useState(DEFAULTS.plaintext)
  const [result, setResult] = useState<RunResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const alphabet = useMemo(
    () => ALPHABET_OPTIONS.find((a) => a.id === alphabetId)!.alphabet,
    [alphabetId],
  )

  function run() {
    setError(null)
    setResult(null)
    try {
      const keyBytes = parseKey(key)
      const tweakBytes = parseTweak(tweak)
      const numerals = stringToNumerals(plaintext, alphabet)
      const radix = alphabet.length

      const enc = ff1Encrypt(keyBytes, radix, tweakBytes, numerals)
      const ciphertext = numeralsToString(enc.output, alphabet)

      // Prove the mapping is invertible by decrypting straight back.
      const dec = ff1Decrypt(keyBytes, radix, tweakBytes, enc.output)
      const roundTripOk = numeralsToString(dec.output, alphabet) === plaintext

      setResult({ ciphertext, roundTripOk, steps: enc.steps, radix })
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  return (
    <section className="mx-auto max-w-4xl space-y-6 px-4 py-8 text-slate-200">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold text-white">Format-Preserving Encryption (FF1)</h1>
        <p className="text-sm text-slate-400">
          FF1 (NIST SP 800-38G) encrypts a value into another value of the <em>same format</em> — a
          16-digit card number becomes another valid 16-digit number, over the same alphabet. It is
          a 10-round Feistel network whose round function is an AES-CBC-MAC PRF, so the output can
          never leave the domain. Encrypt below and watch each Feistel round transform a half.
        </p>
      </header>

      <div className="grid gap-3 rounded-lg border border-slate-700 bg-slate-900/40 p-5">
        <label className="text-sm">AES key (hex, 128/192/256-bit)
          <input className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-2 font-mono text-xs"
            value={key} onChange={(e) => setKey(e.target.value)} />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm">Alphabet (radix = {alphabet.length})
            <select className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-2 text-sm"
              value={alphabetId} onChange={(e) => setAlphabetId(e.target.value as typeof alphabetId)}>
              {ALPHABET_OPTIONS.map((a) => (
                <option key={a.id} value={a.id}>{a.label}</option>
              ))}
            </select>
          </label>
          <label className="text-sm">Tweak (hex, optional)
            <input className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-2 font-mono text-xs"
              placeholder="e.g. account id, leave blank for none"
              value={tweak} onChange={(e) => setTweak(e.target.value)} />
          </label>
        </div>
        <label className="text-sm">Plaintext (over the chosen alphabet)
          <input className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-2 font-mono"
            value={plaintext} onChange={(e) => setPlaintext(e.target.value)} />
        </label>
        <button onClick={run}
          className="w-fit rounded bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-500">
          Encrypt (format-preserving)
        </button>
        {error && <p className="text-sm text-red-400">{error}</p>}
      </div>

      {result && (
        <div className="space-y-4">
          <div className="rounded-lg border border-emerald-500/50 bg-emerald-950/20 p-4">
            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <div className="text-xs uppercase tracking-wide text-slate-500">Plaintext</div>
                <div className="break-all font-mono text-lg text-slate-200">{plaintext}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-slate-500">Ciphertext (same format)</div>
                <div className="break-all font-mono text-lg text-emerald-300">{result.ciphertext}</div>
              </div>
            </div>
            <p className="mt-3 text-xs text-slate-400">
              Same length ({plaintext.length}), same alphabet (radix {result.radix}) —{' '}
              {result.roundTripOk ? 'and it decrypts back exactly ✓' : 'round-trip FAILED ✗'}
            </p>
          </div>

          <div className="rounded-lg border border-slate-700 bg-slate-900/40 p-4">
            <h3 className="mb-2 font-semibold text-white">10-round Feistel trace</h3>
            <p className="mb-3 text-xs text-slate-500">
              Each round replaces one half with (its value + a PRF-derived number) mod radix<sup>m</sup>,
              then swaps — so the transformation stays inside the domain at every step.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="text-slate-400">
                    <th className="px-2 py-1">Round</th>
                    <th className="px-2 py-1">A</th>
                    <th className="px-2 py-1">B</th>
                    <th className="px-2 py-1">m</th>
                    <th className="px-2 py-1">new half</th>
                  </tr>
                </thead>
                <tbody className="font-mono">
                  {result.steps.map((s) => (
                    <tr key={s.round} className="border-t border-slate-800">
                      <td className="px-2 py-1 text-slate-500">{s.round}</td>
                      <td className="px-2 py-1 text-slate-300">{s.a.join('')}</td>
                      <td className="px-2 py-1 text-slate-300">{s.b.join('')}</td>
                      <td className="px-2 py-1 text-slate-500">{s.m}</td>
                      <td className="px-2 py-1 text-emerald-300">{s.result.join('')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <p className="text-xs text-slate-500">
            FPE is how tokenization systems replace real card numbers/SSNs with format-identical
            surrogates that still pass length and checksum-shaped validators, without widening
            database columns. The tweak binds a ciphertext to a context (e.g. an account id), so the
            same value encrypts differently in different places.
          </p>
        </div>
      )}
    </section>
  )
}
