import React from "react";
import Navbar from "@/components/layout/Navbar";
import { ArchitectureDiagram } from "../../../components/docs/ArchitectureDiagram";

export default function ArchitectureDocsPage() {
  return (
    <div className="min-h-screen bg-zinc-50 font-sans transition-colors duration-300 dark:bg-zinc-950">
      <Navbar />
      <main className="mx-auto max-w-5xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">
            System Architecture Documentation
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            An overview of CryptoViz's thread isolation, Web Worker pipeline, and WebCrypto API integration.
          </p>
        </header>

        {/* Interactive Visualizer */}
        <ArchitectureDiagram />

        {/* Written Architecture Guide */}
        <section className="space-y-6 text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
          <div className="p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-4">
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white">
              1. Web Worker Thread Isolation
            </h2>
            <p>
              Cryptographic computations (such as multi-iteration key derivation or large file encryption) can block JavaScript's main event loop. CryptoViz utilizes dedicated Web Workers (`useCipherWorker`) to process algorithms entirely off the main thread, keeping 60 FPS UI rendering completely responsive.
            </p>
          </div>

          <div className="p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-4">
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white">
              2. WebCrypto API & Fallbacks
            </h2>
            <p>
              Modern browsers expose native hardware acceleration through <code className="font-mono text-teal-600 dark:text-teal-400">window.crypto.subtle</code>. Where available, CryptoViz delegates symmetric key generation and hashing to WebCrypto. For educational classical ciphers or environments without WebCrypto, standard JavaScript fallback implementations are seamlessly used.
            </p>
          </div>

          <div className="p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-4">
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white">
              3. Cipher Registry Design Pattern
            </h2>
            <p>
              All ciphers in CryptoViz are registered in a centralized registry (<code className="font-mono text-teal-600 dark:text-teal-400">CIPHER_REGISTRY</code>). This decouples UI component rendering from underlying algorithm mechanics, making it straightforward to integrate new ciphers, write automated tests, and benchmark performance across categories.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}