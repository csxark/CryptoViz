'use client'

import { useMemo, useState } from 'react'
import Navbar from '../../components/layout/Navbar'
import CipherComparisonPanel from '../../components/compare/CipherComparisonPanel'
import ComparisonControls from '../../components/compare/ComparisonControls'
import { CIPHER_REGISTRY } from '../../lib/cipher/registry'
import { swapComparisonSelection } from '../../lib/utils/cipherComparison'

const DEFAULT_LEFT_CIPHER = 'caesar'
const DEFAULT_RIGHT_CIPHER = 'vigenere'

export default function ComparePage() {
  const [leftCipherId, setLeftCipherId] = useState(DEFAULT_LEFT_CIPHER)
  const [rightCipherId, setRightCipherId] = useState(DEFAULT_RIGHT_CIPHER)
  const [sharedInput, setSharedInput] = useState('ATTACKATDAWN')
  const [resetToken, setResetToken] = useState(0)

  const leftCipher = useMemo(
    () =>
      CIPHER_REGISTRY.find((cipher) => cipher.id === leftCipherId) ??
      CIPHER_REGISTRY[0],
    [leftCipherId],
  )

  const rightCipher = useMemo(
    () =>
      CIPHER_REGISTRY.find((cipher) => cipher.id === rightCipherId) ??
      CIPHER_REGISTRY[1],
    [rightCipherId],
  )

  const handleSwap = () => {
    const next = swapComparisonSelection({
      leftCipherId,
      rightCipherId,
    })
    setLeftCipherId(next.leftCipherId)
    setRightCipherId(next.rightCipherId)
  }

  const handleReset = () => {
    setLeftCipherId(DEFAULT_LEFT_CIPHER)
    setRightCipherId(DEFAULT_RIGHT_CIPHER)
    setSharedInput('ATTACKATDAWN')
    setResetToken((current) => current + 1)
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-100">
      <Navbar />

      <main className="mx-auto max-w-7xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
        <header className="max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-600 dark:text-teal-400">
            Comparison workspace
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
            Compare two ciphers side by side
          </h1>
          <p className="mt-4 text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
            Run the same input through two algorithms while keeping separate
            keys, directions, options, results, loading states, and errors.
          </p>
        </header>

        <ComparisonControls
          ciphers={CIPHER_REGISTRY}
          leftCipherId={leftCipher.id}
          rightCipherId={rightCipher.id}
          sharedInput={sharedInput}
          onLeftCipherChange={setLeftCipherId}
          onRightCipherChange={setRightCipherId}
          onSharedInputChange={setSharedInput}
          onSwap={handleSwap}
          onReset={handleReset}
        />

        <section
          aria-label="Cipher comparison results"
          className="grid gap-6 lg:grid-cols-2"
        >
          <CipherComparisonPanel
            key={`left-${leftCipher.id}`}
            cipher={leftCipher}
            sharedInput={sharedInput}
            panelLabel="Cipher A"
            resetToken={resetToken}
          />
          <CipherComparisonPanel
            key={`right-${rightCipher.id}`}
            cipher={rightCipher}
            sharedInput={sharedInput}
            panelLabel="Cipher B"
            resetToken={resetToken}
          />
        </section>
      </main>
    </div>
  )
}
