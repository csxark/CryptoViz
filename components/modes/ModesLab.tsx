'use client'

import { useMemo, useState, useId } from 'react'
import { encrypt, type AesMode } from '@/lib/cipher/symmetric/aes'

// One plaintext, five modes, side by side — with a single plaintext byte flipped
// so you can watch how far the change propagates through each mode's ciphertext.

const MODES: { id: AesMode; name: string; blurb: string }[] = [
  { id: 'ECB', name: 'ECB', blurb: 'Only the changed block differs; equal blocks stay equal.' },
  { id: 'CBC', name: 'CBC', blurb: 'The changed block and every block after it differ.' },
  { id: 'CFB', name: 'CFB', blurb: 'One byte in-block, then every following block differs.' },
  { id: 'OFB', name: 'OFB', blurb: 'Keystream is independent — only the one byte differs.' },
  { id: 'CTR', name: 'CTR', blurb: 'Counter keystream — only the one byte differs.' },
]

const KEY = '2b7e151628aed2a6abf7158809cf4f3c'
const IV = '000102030405060708090a0b0c0d0e0f'

// Encrypt to hex ciphertext, dropping the IV prefix that encrypt() prepends
// for IV-based modes so all modes line up byte-for-byte.
function ciphertextHex(mode: AesMode, text: string): string {
  const options = mode === 'ECB' ? { mode } : { mode, iv: IV }
  const out = encrypt(text, KEY, options).output
  return mode === 'ECB' ? out : out.slice(32)
}

function hexToBytes(hex: string): string[] {
  const pairs: string[] = []
  for (let i = 0; i < hex.length; i += 2) pairs.push(hex.slice(i, i + 2))
  return pairs
}

// Flip the character at `index` to a different one, keeping the string ASCII so
// the byte length is preserved.
function flipByte(text: string, index: number): string {
  if (index < 0 || index >= text.length) return text
  const code = text.charCodeAt(index)
  const next = code === 65 ? 66 : 65 // 'A' <-> 'B'
  return text.slice(0, index) + String.fromCharCode(next) + text.slice(index + 1)
}

export default function ModesLab() {
  const [text, setText] = useState('The magic words are squeamish ossifrage.')
  const [flipIndex, setFlipIndex] = useState(4)
  const textInputId = useId()
  const rangeInputId = useId()

  const safeIndex = Math.min(flipIndex, Math.max(0, text.length - 1))
  const flipped = useMemo(() => flipByte(text, safeIndex), [text, safeIndex])

  const rows = useMemo(() => {
    return MODES.map((m) => {
      const original = hexToBytes(ciphertextHex(m.id, text))
      const changed = hexToBytes(ciphertextHex(m.id, flipped))
      const diff = original.map((b, i) => b !== changed[i])
      const changedCount = diff.filter(Boolean).length
      return { ...m, changed, diff, changedCount, total: changed.length }
    })
  }, [text, flipped])

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900/40">
        <div className="flex flex-col gap-1.5">
          <label htmlFor={textInputId} className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
            Plaintext (ASCII)
          </label>
          <input
            id={textInputId}
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full rounded-lg border border-zinc-200 bg-zinc-50/50 p-2.5 font-mono text-sm text-zinc-900 outline-none transition-all focus:border-teal-500 focus:bg-white dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-zinc-100 dark:focus:border-teal-400"
          />
        </div>

        <div className="mt-4 flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor={rangeInputId} className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
              Flip one plaintext byte (position {safeIndex})
            </label>
            <span className="font-mono text-xs text-zinc-500 dark:text-zinc-400">
              key {KEY.slice(0, 8)}… · iv {IV.slice(0, 8)}…
            </span>
          </div>
          <input
            id={rangeInputId}
            type="range"
            min={0}
            max={Math.max(0, text.length - 1)}
            value={safeIndex}
            onChange={(e) => setFlipIndex(parseInt(e.target.value, 10))}
            className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-zinc-200 accent-teal-600 dark:bg-zinc-700 dark:accent-teal-400"
          />
          <p className="font-mono text-[11px] text-zinc-500 dark:text-zinc-500">
            {text.slice(0, safeIndex)}
            <span className="rounded bg-amber-200 px-0.5 text-zinc-900 dark:bg-amber-500/40 dark:text-amber-100">
              {text.slice(safeIndex, safeIndex + 1) || '·'}
            </span>
            {text.slice(safeIndex + 1)}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {rows.map((row) => (
          <div
            key={row.id}
            className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/40"
          >
            <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
              <div className="flex items-baseline gap-2">
                <span className="font-mono text-sm font-bold text-teal-600 dark:text-teal-400">
                  {row.name}
                </span>
                <span className="text-xs text-zinc-500 dark:text-zinc-400">{row.blurb}</span>
              </div>
              <span className="font-mono text-xs text-zinc-500 dark:text-zinc-400">
                {row.changedCount}/{row.total} bytes changed
              </span>
            </div>
            <div className="flex flex-wrap gap-1">
              {row.changed.map((b, i) => (
                <span
                  key={`byte-${i}-${b}`}
                  className={`rounded px-1 py-0.5 font-mono text-[11px] ${
                    row.diff[i]
                      ? 'bg-amber-200 text-zinc-900 dark:bg-amber-500/40 dark:text-amber-100'
                      : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800/60 dark:text-zinc-400'
                  }`}
                >
                  {b}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
