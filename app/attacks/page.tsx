'use client';

import React, { useState, useMemo } from 'react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/footer';
import PracticePageTemplate from "@/components/layout/PracticePageTemplate";
import { Search, ShieldAlert, Zap, ArrowRight, Lock, Key, Clock, ShieldCheck, Bug } from 'lucide-react';
import Link from 'next/link';

export interface AttackDemoItem {
  id: string;
  slug: string;
  title: string;
  category: 'Brute-Force' | 'Cryptanalysis' | 'Protocol' | 'Side-Channel';
  riskLevel: 'Critical' | 'High' | 'Medium';
  summary: string;
  educationalNote: string;
  tags: string[];
}

export const ATTACK_COLLECTION: AttackDemoItem[] = [
  {
    id: 'brute-force',
    slug: 'brute-force',
    title: 'Brute-Force Key Search',
    category: 'Brute-Force',
    riskLevel: 'Critical',
    summary: 'Systematically testing all possible key combinations until the correct key is found.',
    educationalNote: 'Increasing key sizes (e.g. from 56-bit DES to 256-bit AES) exponentially increases search complexity beyond the computational capability of classical computers.',
    tags: ['Key Search', 'Exhaustive', 'Entropy'],
  },
  {
    id: 'dictionary',
    slug: 'dictionary',
    title: 'Dictionary & Rainbow Table Attack',
    category: 'Brute-Force',
    riskLevel: 'High',
    summary: 'Testing common passwords and pre-computed hash lookup tables against credential hashes.',
    educationalNote: 'Defended using salted password hashes (PBKDF2, Argon2, bcrypt) which invalidate pre-computed lookup tables.',
    tags: ['Passwords', 'Precomputed', 'Salt'],
  },
  {
    id: 'ecb-leakage',
    slug: 'ecb-leakage',
    title: 'ECB Pattern Leakage Attack',
    category: 'Cryptanalysis',
    riskLevel: 'High',
    summary: 'Exploiting deterministic block encryption to reveal plaintext visual structures.',
    educationalNote: 'Electronic Codebook (ECB) mode encrypts identical plaintext blocks to identical ciphertext blocks. Always use randomized IV modes like CBC or GCM.',
    tags: ['Block Cipher', 'Determinism', 'ECB vs CBC'],
  },
  {
    id: 'replay-attack',
    slug: 'replay-attack',
    title: 'Replay & Packet Transmission Attack',
    category: 'Protocol',
    riskLevel: 'Critical',
    summary: 'Intercepting and re-sending valid authenticated messages to duplicate transactions.',
    educationalNote: 'Mitigated by appending unique nonces, monotonic sequence numbers, or timestamp expiration windows to signed payload streams.',
    tags: ['Network', 'Nonce', 'Timestamps'],
  },
  {
    id: 'timing',
    slug: 'timing',
    title: 'Timing Side-Channel Attack',
    category: 'Side-Channel',
    riskLevel: 'High',
    summary: 'Measuring microsecond execution delays during string comparisons to deduce secret keys.',
    educationalNote: 'Requires constant-time comparison implementations (`crypto.timingSafeEqual`) to prevent leaking key bytes byte-by-byte.',
    tags: ['Side-Channel', 'Execution Delay', 'Constant-Time'],
  },
];

export default function AttackCollectionPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const filteredAttacks = useMemo(() => {
    return ATTACK_COLLECTION.filter((attack) => {
      if (selectedCategory !== 'All' && attack.category !== selectedCategory) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          attack.title.toLowerCase().includes(q) ||
          attack.summary.toLowerCase().includes(q) ||
          attack.tags.some((t) => t.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [searchQuery, selectedCategory]);

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-[#060816] text-zinc-900 dark:text-white transition-colors duration-300">
      <Navbar />
        <PracticePageTemplate
          title="Attack Simulator Collection"
          description="Explore interactive, safe simulations of real-world cryptographic attacks (Brute-Force, Dictionary, ECB Pattern Leakage, Replay Attacks, and Timing Attacks). Understand vulnerabilities and learn industry-standard mitigations."
          eyebrow="SAFE EDUCATIONAL SIMULATORS"
          breadcrumbs={[
            { label: "Practice" },
            { label: "Attack Simulators" },
          ]}
          hideHeader
        >

        {/* Hero Section */}
        <section aria-labelledby="attack-hero-title" className="relative overflow-hidden rounded-3xl border border-red-500/30 bg-gradient-to-br from-red-500/10 via-rose-500/5 to-transparent p-8 sm:p-12 backdrop-blur-2xl">
          <div className="max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-red-500/30 bg-red-500/10 px-3.5 py-1 text-xs font-bold text-red-600 dark:text-red-400">
              <ShieldAlert className="h-3.5 w-3.5" />
              SAFE EDUCATIONAL SIMULATORS
            </div>
            <h1 id="attack-hero-title" className="text-3xl sm:text-5xl font-black tracking-tight text-zinc-900 dark:text-white">
              Attack Simulator <span className="text-red-500">Collection</span>
            </h1>
            <p className="text-base sm:text-lg text-zinc-600 dark:text-zinc-300 leading-relaxed">
              Explore interactive, safe simulations of real-world cryptographic attacks (Brute-Force, Dictionary, ECB Pattern Leakage, Replay Attacks, and Timing Attacks). Understand vulnerabilities and learn industry-standard mitigations.
            </p>
          </div>
        </section>

        {/* Search & Category Filter */}
        <section aria-label="Attack simulator filters" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
              <input
                type="text"
                placeholder="Search attack simulations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search attack simulations"
                className="w-full rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 pl-10 pr-4 py-2.5 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 transition-colors"
              />
            </div>

            {/* Category Pills */}
            <div className="flex flex-wrap items-center gap-2">
              {['All', 'Brute-Force', 'Cryptanalysis', 'Protocol', 'Side-Channel'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all ${
                    selectedCategory === cat
                      ? 'bg-red-500 text-white shadow-md'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Grid of Attack Simulators */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAttacks.map((attack) => (
            <div
              key={attack.id}
              className="flex flex-col justify-between rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all backdrop-blur-xl space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-red-500/10 px-2.5 py-0.5 text-[10px] font-bold text-red-600 dark:text-red-400 border border-red-500/20 uppercase">
                    {attack.category}
                  </span>
                  <span className="text-[10px] font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-md">
                    Risk: {attack.riskLevel}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                  <Bug className="h-4 w-4 text-red-500" />
                  {attack.title}
                </h3>

                <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  {attack.summary}
                </p>

                {/* Educational Note */}
                <div className="rounded-xl bg-zinc-50 dark:bg-zinc-950 p-3 text-[11px] text-zinc-700 dark:text-zinc-300 border border-zinc-200/60 dark:border-zinc-800">
                  <strong className="text-red-500 font-bold block mb-0.5">Educational Explanation:</strong>
                  {attack.educationalNote}
                </div>
              </div>

              {/* Bottom Action */}
              <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                <div className="flex flex-wrap gap-1">
                  {attack.tags.slice(0, 2).map((t) => (
                    <span key={t} className="text-[9px] font-medium text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded">
                      {t}
                    </span>
                  ))}
                </div>

                <Link
                  href={`/attacks/${attack.slug}`}
                  className="inline-flex items-center gap-1 text-xs font-bold text-red-600 dark:text-red-400 hover:underline"
                >
                  Launch Simulator
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </PracticePageTemplate>

      <Footer />
    </div>
  );
}
