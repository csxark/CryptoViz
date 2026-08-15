'use client'

import React from 'react'
import Breadcrumbs from '../../components/layout/Breadcrumbs'
import Navbar from '../../components/layout/Navbar'
import GaloisFieldLab from '../../components/math/GaloisFieldLab'

export default function FiniteFieldPage() {
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-100">
      <Navbar />

      <main className="mx-auto max-w-7xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
        <Breadcrumbs items={[{ label: "Sandbox" }, { label: "Finite Field Visualizer" }]} />

        <header className="max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-600 dark:text-teal-400">
            Cryptographic Foundations
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
            Finite Field GF(2^8) Visualizer
          </h1>
          <p className="mt-4 text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
            Explore Galois Field arithmetic used in the Advanced Encryption Standard (AES) MixColumns and SubBytes layers.
          </p>
        </header>

        {/* Educational Context */}
        <section className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-4">
          <h3 className="text-lg font-bold">Understanding GF(2^8)</h3>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
            In cryptography, particularly AES, we operate in the finite field GF(2<sup>8</sup>). 
            This means elements are represented as polynomials of maximum degree 7 with coefficients in GF(2) (0 or 1).
            A byte like 0x57 translates to the polynomial: $x^6 + x^4 + x^2 + x + 1$.
          </p>
          <ul className="list-disc list-inside text-sm text-zinc-600 dark:text-zinc-400 space-y-2 mt-2">
            <li><strong>Addition (A ⊕ B):</strong> Field addition corresponds to coefficient-wise addition modulo 2, implemented via bitwise XOR.</li>
            <li><strong>Multiplication (A ⊗ B):</strong> Polynomial multiplication modulo an irreducible polynomial $m(x)$.</li>
            <li><strong>Irreducible Polynomials:</strong> AES uses $m(x) = x^8 + x^4 + x^3 + x + 1$ (0x11B). Anubis uses 0x11D, and Twofish uses 0x12D.</li>
          </ul>
        </section>

        {/* Interactive Lab */}
        <section aria-label="Field Controls">
          <GaloisFieldLab />
        </section>
      </main>
    </div>
  )
}
