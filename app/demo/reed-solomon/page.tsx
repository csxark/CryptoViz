import React from 'react';
import ReedSolomonDemo from '@/components/ReedSolomonDemo';
import Navbar from '@/components/layout/Navbar';

export const metadata = {
  title: 'Reed‑Solomon Error‑Correction Demo',
  description: 'Interactive demonstration of Reed‑Solomon encoding, error injection, and decoding.',
};

export default function ReedSolomonDemoPage() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      <Navbar />
      <main className="max-w-4xl mx-auto p-6">
        <ReedSolomonDemo />
      </main>
    </div>
  );
}
