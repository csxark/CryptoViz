import React from 'react';
import { NTTVisualizer } from '@/components/pqc/NTTVisualizer';

export default function NTTVisualizerPage() {
  return (
    <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">Ring-LWE & Module-LWE Polynomial Ring NTT Laboratory</h1>
        <p className="text-gray-600 dark:text-gray-300">
          Explore the number theoretic transform engine powering NIST post-quantum cryptographic standards like ML-KEM (Kyber) and ML-DSA (Dilithium).
        </p>
      </div>

      <NTTVisualizer />
    </main>
  );
}
