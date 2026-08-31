import React from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import VisualSecretSharing from '@/components/visual-crypto/VisualSecretSharing'

export const metadata: Metadata = {
  title: 'Naor-Shamir Visual Cryptography | CryptoViz',
  description:
    'Interactive Naor-Shamir (2,2) Visual Secret Sharing visualizer. Draw a binary secret image, split it into two subpixel transparency slides, and overlay them to decrypt optically.',
}

export default function VisualCryptographyPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header breadcrumb & title */}
      <div className="mb-8 flex flex-col gap-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-teal-600 dark:text-teal-400">
          <Link href="/collections" className="hover:underline">
            Asymmetric & Secret Sharing
          </Link>
          <span>/</span>
          <span>Visual Cryptography</span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white sm:text-4xl">
          Naor-Shamir Visual Cryptography
        </h1>
        <p className="max-w-3xl text-sm text-zinc-600 dark:text-zinc-400">
          Demonstrates optical secret sharing (Naor & Shamir, 1994). A secret binary image is encoded into two random subpixel transparency slides. Neither slide contains any information individually (100% entropy), but physically stacking them decryption-free reconstructs the secret.
        </p>
      </div>

      {/* Main interactive component */}
      <VisualSecretSharing />

      {/* Related links */}
      <div className="mt-12 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
        <h3 className="mb-2 text-sm font-bold text-zinc-900 dark:text-white">Related Secret Sharing Topics</h3>
        <p className="mb-4 text-xs text-zinc-500 dark:text-zinc-400">
          Compare algebraic secret sharing over finite fields with visual cryptography.
        </p>
<Link
  href="/visualizer/secret-recovery/"
  className="inline-flex items-center gap-2 text-xs font-semibold text-teal-600 hover:underline dark:text-teal-400"
>
  Launch Shamir's Secret Sharing & Threshold Recovery Visualizer →
</Link>      </div>
    </div>
  )
}
