import React from 'react';
import { Metadata } from 'next';
import Navbar from '../../components/layout/Navbar';
import Footer from '../../components/layout/footer';
import KeySizeEstimator from '../../components/key-size/KeySizeEstimator';

export const metadata: Metadata = {
  title: 'Key Size Security Estimator | CryptoViz',
  description: 'Interactive visualization of cryptographic key sizes and brute-force difficulty across Symmetric, RSA, and ECC algorithms.',
};

export default function KeySizePage() {
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950 dark:bg-[#09090B] dark:text-zinc-100 font-sans antialiased flex flex-col">
      <Navbar />

      <main className="flex-grow mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <header className="mb-12 max-w-3xl">
          <div className="inline-flex items-center rounded-full border border-teal-500/30 bg-teal-500/10 px-3 py-1 text-sm font-medium text-teal-600 dark:text-teal-400 mb-4">
            Security Tool
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl text-zinc-900 dark:text-[#F5F5F5] mb-6">
            Key Size Security <span className="text-[#00C2AE]">Estimator</span>
          </h1>
          <p className="text-lg leading-relaxed text-zinc-600 dark:text-[#B3B3B8]">
            Explore the relationship between cryptographic key lengths and brute-force search space.
            Learn why different algorithms require vastly different key sizes to achieve the same 
            level of practical security according to NIST standards.
          </p>
        </header>

        <KeySizeEstimator />
      </main>
      
      <Footer />
    </div>
  );
}
