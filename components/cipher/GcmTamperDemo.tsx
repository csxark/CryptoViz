'use client'

/**
 * AES-GCM tamper demo.
 *
 * Teaches integrity vs. confidentiality: seal a message with AES-GCM, flip a
 * single ciphertext byte, then try to decrypt. GCM recomputes the GHASH tag over
 * the *received* ciphertext, sees it no longer matches, and refuses to return
 * plaintext — the failure a padding-oracle attack exploits in unauthenticated
 * CBC simply cannot happen here.
 */

import { useState } from 'react'
import { encrypt, decrypt } from '@/lib/cipher/symmetric/aes-gcm'
import WorkerErrorBoundary from '@/components/error/WorkerErrorBoundary'

const IV_HEX = 24 // 12-byte IV
const TAG_HEX = 32 // 16-byte tag

interface Sealed {
  ivHex: string
  tagHex: string
  originalCtHex: string
}

function splitSealed(output: string): Sealed {
  return {
    ivHex: output.slice(0, IV_HEX),
    tagHex: output.slice(output.length - TAG_HEX),
    originalCtHex: output.slice(IV_HEX, output.length - TAG_HEX),
  }
}

function GcmTamperDemoInner() {
  const [plaintext, setPlaintext] = useState('Transfer $100 to Alice')
  const [key, setKey] = useState('000102030405060708090a0b0c0d0e0f')

  const [sealed, setSealed] = useState<Sealed | null>(null)
  const [ctHex, setCtHex] = useState('')
  const [decrypted, setDecrypted] = useState<string | null>(null)
  const [tagError, setTagError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  // ciphertext is a list of hex byte-pairs the user can click to flip.
  const ctBytes = ctHex.match(/.{2}/g) ?? []
  const tampered = sealed !== null && ctHex !== sealed.originalCtHex

  async function handleSeal() {
    setError(null)
    setTagError(null)
    setDecrypted(null)
    setBusy(true)
    try {
      const res = await encrypt(plaintext, key)
      const parts = splitSealed(res.output)
      setSealed(parts)
      setCtHex(parts.originalCtHex)
    } catch (err) {
      setSealed(null)
      setCtHex('')
      setError(err instanceof Error ? err.message : 'Encryption failed.')
    } finally {
      setBusy(false)
    }
  }

  function flipByte(index: number) {
    if (!sealed) return
    const bytes = [...ctBytes]
    const current = parseInt(bytes[index], 16)
    // Flip the low bit so the change is a single, obvious one-bit tamper.
    bytes[index] = (current ^ 0x01).toString(16).padStart(2, '0')
    setCtHex(bytes.join(''))
    setDecrypted(null)
    setTagError(null)
  }

  function handleReset() {
    if (!sealed) return
    setCtHex(sealed.originalCtHex)
    setDecrypted(null)
    setTagError(null)
  }

  async function handleDecrypt() {
    if (!sealed) return
    setError(null)
    setTagError(null)
    setDecrypted(null)
    setBusy(true)
    try {
      const res = await decrypt(sealed.ivHex + ctHex + sealed.tagHex, key)
      setDecrypted(res.output)
    } catch (err) {
      // The integrity failure is surfaced here, not swallowed.
      setTagError(err instanceof Error ? err.message : 'Authentication failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900/40">
      <div>
        <h3 className="text-base font-bold text-zinc-900 dark:text-white">
          Tamper Demo — Integrity vs. Confidentiality
        </h3>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Seal a message, flip one ciphertext byte, then decrypt. GCM verifies the GHASH tag first, so any change is
          rejected instead of silently returning corrupted plaintext.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Plaintext</span>
          <input
            type="text"
            value={plaintext}
            onChange={(e) => setPlaintext(e.target.value)}
            className="w-full rounded-lg border border-zinc-200 bg-zinc-50/50 p-2.5 font-mono text-sm text-zinc-900 outline-none focus:border-teal-500 dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-zinc-100"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Key (hex or passphrase)</span>
          <input
            type="text"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            className="w-full rounded-lg border border-zinc-200 bg-zinc-50/50 p-2.5 font-mono text-sm text-zinc-900 outline-none focus:border-teal-500 dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-zinc-100"
          />
        </label>
      </div>

      <button
        onClick={handleSeal}
        disabled={busy || !plaintext || !key}
        className="h-10 w-full rounded-lg bg-teal-600 text-sm font-semibold text-white transition-colors hover:bg-teal-500 disabled:opacity-50 dark:bg-teal-500 dark:hover:bg-teal-400"
      >
        {busy ? 'Working…' : '1 · Seal with AES-GCM'}
      </button>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      {sealed && (
        <div className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-zinc-50/60 p-4 dark:border-zinc-800 dark:bg-zinc-950/30">
          <div className="grid grid-cols-1 gap-1 font-mono text-xs text-zinc-600 dark:text-zinc-400">
            <div className="break-all">
              <span className="text-zinc-400 dark:text-zinc-500">IV:</span> {sealed.ivHex}
            </div>
            <div className="break-all">
              <span className="text-zinc-400 dark:text-zinc-500">Tag:</span> {sealed.tagHex}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
              2 · Ciphertext — click any byte to flip a bit
            </span>
            <div className="flex flex-wrap gap-1">
              {ctBytes.map((b, i) => {
                const changed = sealed.originalCtHex.slice(i * 2, i * 2 + 2) !== b
                return (
                  <button
                    key={i}
                    onClick={() => flipByte(i)}
                    className={`rounded px-1.5 py-1 font-mono text-xs transition-colors ${
                      changed
                        ? 'bg-red-500 text-white'
                        : 'bg-zinc-200 text-zinc-700 hover:bg-teal-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-teal-900/50'
                    }`}
                    title={changed ? 'Tampered byte' : 'Click to flip a bit'}
                  >
                    {b}
                  </button>
                )
              })}
              {ctBytes.length === 0 && (
                <span className="text-xs italic text-zinc-400">(empty ciphertext — try a non-empty message)</span>
              )}
            </div>
            {tampered && (
              <button
                onClick={handleReset}
                className="self-start text-xs font-medium text-teal-600 hover:underline dark:text-teal-400"
              >
                Reset ciphertext
              </button>
            )}
          </div>

          <button
            onClick={handleDecrypt}
            disabled={busy}
            className="h-10 w-full rounded-lg border border-zinc-300 bg-white text-sm font-semibold text-zinc-800 transition-colors hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
          >
            3 · Decrypt &amp; Verify Tag
          </button>

          {decrypted !== null && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-900/40 dark:bg-emerald-950/20">
              <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400">Tag verified — plaintext recovered</p>
              <p className="mt-1 break-all font-mono text-sm text-emerald-800 dark:text-emerald-300">{decrypted}</p>
            </div>
          )}

          {tagError && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-900/40 dark:bg-red-950/20">
              <p className="text-xs font-bold text-red-700 dark:text-red-400">Authentication failed — message rejected</p>
              <p className="mt-1 text-sm text-red-700 dark:text-red-300">{tagError}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function GcmTamperDemo() {
  return (
    <WorkerErrorBoundary>
      <GcmTamperDemoInner />
    </WorkerErrorBoundary>
  )
}
