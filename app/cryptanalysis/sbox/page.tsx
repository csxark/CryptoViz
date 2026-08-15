import type { Metadata } from 'next'
import DDTLATWorkbench from '../../../components/cryptanalysis/DDTLATWorkbench'

export const metadata: Metadata = {
  title: 'S-Box DDT & LAT Workbench | CryptoViz',
  description:
    'Interactive Difference Distribution Table (DDT) and Linear Approximation Table (LAT) generator for custom and standard 4-bit and 8-bit S-Boxes, with differential uniformity, nonlinearity, and Matsui piling-up trail stacking.',
}

export default function SboxCryptanalysisPage() {
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-100">
      <main className="mx-auto max-w-7xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
        <header className="max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-600 dark:text-teal-400">
            Cryptanalysis workbench
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
            S-Box DDT &amp; LAT Workbench
          </h1>
          <p className="mt-4 text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
            Differential cryptanalysis exploits input differences Δx and the
            output differences Δy they cause; linear cryptanalysis exploits
            biased parity approximations a·x = b·S(x). Pick an S-box, compute
            its full Difference Distribution Table and Linear Approximation
            Table, inspect the concrete pairs behind any cell, and stack round
            biases with Matsui&apos;s Piling-Up Lemma.
          </p>
        </header>

        <DDTLATWorkbench />
      </main>
    </div>
  )
}
