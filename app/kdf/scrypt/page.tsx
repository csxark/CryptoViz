'use client'

import Navbar from '../../../components/layout/Navbar'
import Footer from '../../../components/layout/footer'
import ScryptVisualizer from '../../../components/kdf/ScryptVisualizer'

export default function ScryptVisualizerPage() {
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-100 flex flex-col justify-between">
      <div>
        <Navbar />

        <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
          <header className="mb-6 max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-600 dark:text-teal-400">
              Key Derivation Function (KDF)
            </p>
            <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
              Scrypt Key Derivation Visualizer
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              Scrypt is a memory-hard password-based key derivation function designed to make hardware brute-force
              attacks prohibitively expensive. Unlike PBKDF2, which only uses CPU iterations, Scrypt forces the
              derivation process to use large, configurable blocks of RAM, creating a hard physical constraint
              for custom ASIC/GPU attack platforms.
            </p>
          </header>

          <ScryptVisualizer />
        </main>
      </div>
      <Footer />
    </div>
  )
}
