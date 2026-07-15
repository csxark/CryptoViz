'use client'

import type { CipherDefinition } from '../../lib/cipher/registry'

interface ComparisonControlsProps {
  ciphers: CipherDefinition[]
  leftCipherId: string
  rightCipherId: string
  sharedInput: string
  onLeftCipherChange: (cipherId: string) => void
  onRightCipherChange: (cipherId: string) => void
  onSharedInputChange: (value: string) => void
  onSwap: () => void
  onReset: () => void
}

const categoryLabels: Record<CipherDefinition['category'], string> = {
  classical: 'Classical',
  symmetric: 'Symmetric',
  asymmetric: 'Asymmetric',
  hash: 'Hashing',
}

function CipherSelect({
  label,
  value,
  ciphers,
  onChange,
}: {
  label: string
  value: string
  ciphers: CipherDefinition[]
  onChange: (value: string) => void
}) {
  const categories = (
    ['classical', 'symmetric', 'asymmetric', 'hash'] as const
  ).map((category) => ({
    category,
    ciphers: ciphers.filter((cipher) => cipher.category === category),
  }))

  return (
    <label className="grid gap-1.5 text-xs font-semibold text-zinc-600 dark:text-zinc-300">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm font-normal text-zinc-900 outline-none focus:border-teal-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
      >
        {categories.map(({ category, ciphers: categoryCiphers }) => (
          <optgroup key={category} label={categoryLabels[category]}>
            {categoryCiphers.map((cipher) => (
              <option key={cipher.id} value={cipher.id}>
                {cipher.name}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </label>
  )
}

export default function ComparisonControls({
  ciphers,
  leftCipherId,
  rightCipherId,
  sharedInput,
  onLeftCipherChange,
  onRightCipherChange,
  onSharedInputChange,
  onSwap,
  onReset,
}: ComparisonControlsProps) {
  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40">
      <div className="grid gap-4 md:grid-cols-[1fr_auto_1fr] md:items-end">
        <CipherSelect
          label="Cipher A"
          value={leftCipherId}
          ciphers={ciphers}
          onChange={onLeftCipherChange}
        />

        <button
          type="button"
          onClick={onSwap}
          aria-label="Swap selected ciphers"
          className="rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-semibold text-zinc-700 transition-colors hover:border-teal-400 hover:text-teal-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-teal-700 dark:hover:text-teal-400"
        >
          ⇄ Swap
        </button>

        <CipherSelect
          label="Cipher B"
          value={rightCipherId}
          ciphers={ciphers}
          onChange={onRightCipherChange}
        />
      </div>

      <label className="mt-5 grid gap-1.5 text-xs font-semibold text-zinc-600 dark:text-zinc-300">
        Shared input
        <textarea
          value={sharedInput}
          onChange={(event) => onSharedInputChange(event.target.value)}
          rows={4}
          placeholder="Enter the input that both algorithms should process..."
          className="w-full resize-y rounded-lg border border-zinc-200 bg-zinc-50 p-3 font-mono text-sm font-normal text-zinc-900 outline-none focus:border-teal-500 dark:border-zinc-700 dark:bg-zinc-950/50 dark:text-white"
        />
      </label>

      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={onReset}
          className="rounded-lg border border-red-300 px-4 py-2 text-xs font-semibold text-red-700 transition-colors hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/30"
        >
          Reset comparison
        </button>
      </div>
    </section>
  )
}
