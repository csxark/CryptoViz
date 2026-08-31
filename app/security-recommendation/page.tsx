'use client'

import React, { useState } from 'react'
import Breadcrumbs from '../../components/layout/Breadcrumbs'
import Navbar from '../../components/layout/Navbar'

type UseCase = 'data-at-rest' | 'data-in-transit' | 'hashing' | 'signatures'
type SecurityLevel = 'standard' | 'high' | 'long-term'

interface Recommendation {
  category: string
  recommended: string
  reason: string
  standardRef: string
  securityLevel: string
}

export default function SecurityRecommendationPage() {
  const [useCase, setUseCase] = useState<UseCase>('data-at-rest')
  const [securityLevel, setSecurityLevel] = useState<SecurityLevel>('standard')

  const getRecommendation = (): Recommendation => {
    switch (useCase) {
      case 'data-at-rest':
        return {
          category: 'Symmetric Encryption (Data at Rest)',
          recommended: securityLevel === 'long-term' ? 'AES-256' : 'AES-128',
          reason: 'AES is the global standard for symmetric encryption, providing exceptional hardware acceleration and robust security.',
          standardRef: 'NIST SP 800-38A / FIPS 197',
          securityLevel: securityLevel === 'long-term' ? '128-bit security equivalent' : '128-bit security'
        }
      case 'data-in-transit':
        return {
          category: 'Transport Layer Security',
          recommended: 'TLS 1.3 with ChaCha20-Poly1305 or AES-GCM',
          reason: 'TLS 1.3 eliminates obsolete cryptographic flaws, reduces handshake latency, and enforces authenticated encryption.',
          standardRef: 'RFC 8446 / NIST SP 800-52',
          securityLevel: 'Modern High Security'
        }
      case 'hashing':
        return {
          category: 'Cryptographic Hashing & Integrity',
          recommended: securityLevel === 'long-term' ? 'SHA-384 or SHA-512' : 'SHA-256',
          reason: 'SHA-2 and SHA-3 families resist collision and preimage attacks, making them ideal for digital signatures and secure fingerprinting.',
          standardRef: 'FIPS PUB 180-4 / FIPS PUB 202',
          securityLevel: 'Collision Resistant'
        }
      case 'signatures':
        return {
          category: 'Asymmetric Digital Signatures',
          recommended: securityLevel === 'long-term' ? 'Ed25519 or ECDSA (secp256r1)' : 'RSA-3072 or Ed25519',
          reason: 'Elliptic curve signatures offer high security with smaller key sizes and faster computation times compared to legacy RSA.',
          standardRef: 'NIST SP 800-186 / FIPS 186-4',
          securityLevel: 'Post-Quantum Transition Ready'
        }
    }
  }

  const rec = getRecommendation()

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-100">
      <Navbar />

      <main className="mx-auto max-w-7xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
        <Breadcrumbs items={[{ label: "Sandbox" }, { label: "Security Advisor" }]} />

        <header className="max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-600 dark:text-teal-400">
            Cryptographic Migration Advisor
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
            Security Architecture Advisor
          </h1>
          <p className="mt-4 text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
            Get expert cryptographic algorithm recommendations aligned with your application use case, security requirements, and official compliance standards.
          </p>
        </header>

        {/* Configuration Controls */}
        <section aria-label="Recommendation Parameters" className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <div>
            <label htmlFor="useCase" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Application Use Case
            </label>
            <select
              id="useCase"
              value={useCase}
              onChange={(e) => setUseCase(e.target.value as UseCase)}
              className="mt-2 w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm focus:border-teal-500 focus:outline-none dark:border-zinc-700"
            >
              <option value="data-at-rest" className="bg-white dark:bg-zinc-900">Data at Rest (Files / Databases)</option>
              <option value="data-in-transit" className="bg-white dark:bg-zinc-900">Data in Transit (Web / Network)</option>
              <option value="hashing" className="bg-white dark:bg-zinc-900">Hashing & Integrity Checks</option>
              <option value="signatures" className="bg-white dark:bg-zinc-900">Digital Signatures & Authentication</option>
            </select>
          </div>

          <div>
            <label htmlFor="securityLevel" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Security Requirement Tier
            </label>
            <select
              id="securityLevel"
              value={securityLevel}
              onChange={(e) => setSecurityLevel(e.target.value as SecurityLevel)}
              className="mt-2 w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm focus:border-teal-500 focus:outline-none dark:border-zinc-700"
            >
              <option value="standard" className="bg-white dark:bg-zinc-900">Standard Business Security</option>
              <option value="high" className="bg-white dark:bg-zinc-900">High Security (Regulated / Financial)</option>
              <option value="long-term" className="bg-white dark:bg-zinc-900">Long-term Confidentiality (Sensitive Data)</option>
            </select>
          </div>
        </section>

        {/* Results Card */}
        <section aria-label="Recommendation Result" className="bg-white dark:bg-zinc-900 p-8 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-6 gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400">{rec.category}</p>
              <h2 className="text-2xl font-bold mt-1">{rec.recommended}</h2>
            </div>
            <span className="self-start md:self-auto px-3 py-1 bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 rounded-full text-xs font-mono font-bold border border-teal-200 dark:border-teal-800">
              {rec.securityLevel}
            </span>
          </div>

          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Why this recommendation?</h3>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">{rec.reason}</p>
            </div>

            <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 font-mono text-xs text-zinc-600 dark:text-zinc-400">
              <span className="font-bold">Compliance Standard Reference:</span> {rec.standardRef}
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
