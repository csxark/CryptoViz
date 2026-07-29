'use client'

import React from 'react'
import Navbar from '../../components/layout/Navbar'
import AlgorithmMatrix from '../../components/matrix/AlgorithmMatrix'

export default function MatrixPage() {
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-100">
      <Navbar />

      <main className="mx-auto max-w-7xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
        <header className="max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-600 dark:text-teal-400">
            Algorithm Overview
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
            Compatibility Matrix
          </h1>
          <p className="mt-4 text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
            Compare cryptographic algorithms side by side. Evaluate block sizes, key lengths, security statuses, speeds, and common applications to choose the right algorithm for your use case.
          </p>
        </header>

        <section aria-label="Algorithm Matrix Data">
          <AlgorithmMatrix />
        </section>
      </main>
    </div>
  )
}
