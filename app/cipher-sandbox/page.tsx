'use client'

import React from 'react'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/footer'
import PracticePageTemplate from "@/components/layout/PracticePageTemplate";
import CipherSandbox from '@/components/cipher-sandbox/CipherSandbox'
import { Sparkles, Sliders, ShieldCheck, Cpu } from 'lucide-react'

export default function CipherSandboxPage() {
  return (
    <div className="min-h-screen flex flex-col bg-white text-zinc-900 dark:bg-[#060816] dark:text-white transition-colors duration-300">
      <Navbar />

           <PracticePageTemplate
        title="Build Your Own Cipher Sandbox"
        description="Design, test, and analyze custom ciphers by chaining substitution (confusion) and permutation (diffusion) layers. Observe state evolutions step-by-step, verify invertibility, and calculate avalanche metrics in real-time."
        eyebrow="INTERACTIVE CRYPTOGRAPHY LABORATORY"
        breadcrumbs={[
          {
            label: 'Practice',
            href: '/visualizer/caesar/',
          },
          {
            label: 'Cipher Sandbox',
          },
        ]}
      >
        {/* Interactive Cipher Sandbox Workspace */}
        <CipherSandbox />

        {/* Educational Deep Dive Section */}
        <section className="space-y-8 rounded-3xl border border-zinc-200 bg-zinc-50 p-8 dark:border-zinc-800 dark:bg-zinc-900/60">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
              Understanding Substitution & Permutation Networks
            </h2>

            <p className="max-w-3xl text-sm text-zinc-600 dark:text-zinc-400">
              Claude Shannon identified two primary fundamental principles that
              modern block ciphers rely on to thwart cryptanalysis:
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {/* Substitution */}
            <div className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
              <div className="inline-flex rounded-xl bg-teal-500/10 p-3 text-teal-600 dark:text-teal-400">
                <Sliders className="h-6 w-6" />
              </div>

              <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
                Substitution (Confusion)
              </h3>

              <p className="text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
                Substitution layers map plaintext units to ciphertext units,
                masking the mathematical relationship between the secret key
                and the ciphertext. Examples include S-Boxes, Caesar shifts,
                Affine transforms, and XOR layers.
              </p>
            </div>

            {/* Permutation */}
            <div className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
              <div className="inline-flex rounded-xl bg-indigo-500/10 p-3 text-indigo-600 dark:text-indigo-400">
                <Cpu className="h-6 w-6" />
              </div>

              <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
                Permutation (Diffusion)
              </h3>

              <p className="text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
                Permutation layers reorder character or bit positions across
                the state, spreading statistical structure of the input across
                the output. Examples include P-Boxes, columnar transpositions,
                block swaps, and cyclic shifts.
              </p>
            </div>

            {/* Multi-round */}
            <div className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
              <div className="inline-flex rounded-xl bg-emerald-500/10 p-3 text-emerald-600 dark:text-emerald-400">
                <ShieldCheck className="h-6 w-6" />
              </div>

              <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
                Multi-Round Iteration
              </h3>

              <p className="text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
                A single substitution or permutation layer is easily broken.
                Modern block ciphers like AES and DES repeat alternating
                substitution-permutation rounds to achieve optimal Avalanche
                Effect (flipping 1 bit changes ~50% of output bits).
              </p>
            </div>
          </div>
        </section>
      </PracticePageTemplate>
      <Footer />
    </div>
  )
}
