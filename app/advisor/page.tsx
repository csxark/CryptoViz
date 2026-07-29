import React from 'react'
import type { Metadata } from 'next'
import Navbar from '../../components/layout/Navbar'
import DecisionTree from '../../components/advisor/DecisionTree'

export const metadata: Metadata = {
  title: 'Cipher Advisor | CryptoViz',
  description: 'An interactive decision tree to help you choose the right cryptographic algorithm for your specific use case.',
}

export default function AdvisorPage() {
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-100">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <header className="mx-auto mb-16 max-w-3xl text-center">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-600 dark:text-teal-400">
            Interactive Guide
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
            Cipher Advisor
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-zinc-600 dark:text-zinc-400">
            Answer a few questions about your security requirements and use case, and we will recommend the most appropriate cryptographic algorithms for your project.
          </p>
        </header>

        <section aria-label="Decision Tree">
          <DecisionTree />
        </section>
      </main>
    </div>
  )
}
