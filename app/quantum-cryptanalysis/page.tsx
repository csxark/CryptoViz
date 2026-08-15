import React from "react";
import type { Metadata } from "next";
import Navbar from "../../components/layout/Navbar";
import QuantumCircuitVisualizer from "../../components/quantum/QuantumCircuitVisualizer";

export const metadata: Metadata = {
  title: "Quantum Cryptanalysis | CryptoViz",
  description:
    "Interactive quantum cryptanalysis laboratory simulating Shor's and Grover's algorithms.",
};

export default function QuantumCryptanalysisPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-[#09090B] text-zinc-900 dark:text-[#F5F5F7] font-sans">
      <Navbar />
      
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-4xl">
            Quantum Cryptanalysis
          </h1>
          <p className="mt-3 text-lg text-zinc-600 dark:text-zinc-400 max-w-3xl">
            Explore the algorithms that make a Cryptographically Relevant Quantum Computer (CRQC) a threat to modern cryptography. Simulate Shor's algorithm for factoring composites and Grover's algorithm for unstructured search.
          </p>
        </div>

        <div className="space-y-12">
          {/* Introduction */}
          <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40">
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-4">The Quantum Threat</h2>
            <div className="prose prose-zinc dark:prose-invert max-w-none">
              <p>
                Classical cryptography relies on problems that take classical computers billions of years to solve. However, quantum computers exploit quantum mechanical phenomena—like <em>superposition</em> and <em>entanglement</em>—to solve some of these problems exponentially faster.
              </p>
              <ul>
                <li><strong>Shor's Algorithm</strong>: Breaks RSA (integer factorization) and ECC (discrete logarithm) in polynomial time.</li>
                <li><strong>Grover's Algorithm</strong>: Weakens symmetric ciphers (like AES) and hash functions (like SHA) by searching an unstructured database quadratically faster than classical brute force. This essentially halves the effective bit-strength (e.g., AES-128 becomes 64-bit secure).</li>
              </ul>
            </div>
          </section>

          {/* Interactive Lab */}
          <section>
            <QuantumCircuitVisualizer />
          </section>

        </div>
      </main>
    </div>
  );
}
