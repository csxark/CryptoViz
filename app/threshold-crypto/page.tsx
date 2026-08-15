'use client'

import React from 'react'
import ThresholdDkgSimulator from '../../components/asymmetric/ThresholdDkgSimulator'

export default function ThresholdCryptoPage() {
  return (
    <div className="container mx-auto max-w-5xl px-4 py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">Threshold Cryptography & DKG</h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400 max-w-3xl">
          An interactive simulator demonstrating Distributed Key Generation (DKG) and Threshold Schnorr Signatures using Pedersen-style commitments and Lagrange interpolation.
          This implementation is educational and simplifies certain production complexities (e.g. BIP340 parity requirements) for clarity.
        </p>
      </div>

      <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 p-4 rounded-r-lg">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-yellow-700 dark:text-yellow-400">
              <strong>Educational Tool:</strong> This simulator uses "Classic Schnorr" rather than strict BIP340 to keep the mathematical interpolations pure and understandable. In production environments, threshold implementations must handle Y-coordinate parity bits (like FROST).
            </p>
          </div>
        </div>
      </div>

      <ThresholdDkgSimulator />
    </div>
  )
}
