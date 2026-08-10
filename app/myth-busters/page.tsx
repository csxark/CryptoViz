'use client';

import React, { useState, useMemo } from 'react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/footer';
import LearnPageTemplate from "@/components/layout/LearnPageTemplate";
import MythCard from '@/components/myth-busters/MythCard';
import MythQuiz from '@/components/myth-busters/MythQuiz';
import MythDetailModal from '@/components/myth-busters/MythDetailModal';
import { searchMyths } from '@/lib/myth-busters/mythData';
import { MythItem, MythCategory } from '@/lib/myth-busters/types';
import { Search, Flame, ShieldAlert } from 'lucide-react';

export default function MythBustersPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<MythCategory>('All');
  const [selectedMyth, setSelectedMyth] = useState<MythItem | null>(null);

  const filteredMyths = useMemo(() => {
    return searchMyths(searchQuery, selectedCategory);
  }, [searchQuery, selectedCategory]);

  const categories: MythCategory[] = [
    'All',
    'Encoding vs Encryption',
    'Hashing vs Encryption',
    'Key Management & Sizes',
    'Password Security',
    'Quantum & Future Tech',
    'Security Principles',
  ];

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-[#060816] text-zinc-900 dark:text-white transition-colors duration-300">
      <Navbar />

         <LearnPageTemplate
        title="Busting Cryptography Misconceptions"
        description="Correcting widespread crypto security myths with rigorous mathematical analysis, technical realities, and Kerckhoffs's principle benchmarks."
        eyebrow="CRYPTOGRAPHY MYTH BUSTERS #495"
        breadcrumbs={[
          { label: "Learn" },
          { label: "Myth Busters" },
        ]}
        hideHeader
      >
        {/* Hero Section */}
        <section aria-labelledby="myth-hero-title" className="relative overflow-hidden rounded-3xl border border-zinc-200/80 dark:border-zinc-800/80 bg-gradient-to-br from-red-500/10 via-amber-500/5 to-transparent p-8 sm:p-12 backdrop-blur-2xl">
          <div className="max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-red-500/30 bg-red-500/10 px-3.5 py-1 text-xs font-bold text-red-600 dark:text-red-400">
              <Flame className="h-3.5 w-3.5 animate-pulse" />
              CRYPTOGRAPHY MYTH BUSTERS #495
            </div>
            <h1 id="myth-hero-title" className="text-3xl sm:text-5xl font-black tracking-tight text-zinc-900 dark:text-white">
              Busting Cryptography <span className="text-red-500">Misconceptions</span>
            </h1>
            <p className="text-base sm:text-lg text-zinc-600 dark:text-zinc-300 leading-relaxed">
              Correcting widespread crypto security myths with rigorous mathematical analysis, technical realities, and Kerckhoffs's principle benchmarks.
            </p>
          </div>
        </section>

        {/* Interactive Reality Check Quiz Section */}
        <section aria-labelledby="myth-quiz-title">
          <MythQuiz />
        </section>

        {/* Search & Category Filters */}
        <section aria-labelledby="myths-grid-heading" className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 id="myths-grid-heading" className="text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-white">
                Exploded Security Myths
              </h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                Explore debunked misconceptions and technical realities.
              </p>
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
              <input
                type="text"
                placeholder="Search myths or concepts..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                aria-label="Search cryptography myths or security topics"
                className="w-full rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 pl-10 pr-4 py-2.5 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 transition-colors"
              />
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="flex flex-wrap items-center gap-2 overflow-x-auto pb-2" role="tablist" aria-label="Myth category filter">
            {categories.map(cat => (
              <button
                key={cat}
                role="tab"
                aria-selected={selectedCategory === cat}
                onClick={() => setSelectedCategory(cat)}
                className={`rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
                  selectedCategory === cat
                    ? 'bg-teal-500 text-black shadow-md shadow-teal-500/20'
                    : 'bg-zinc-100 dark:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Myth Grid */}
          {filteredMyths.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredMyths.map(myth => (
                <MythCard
                  key={myth.id}
                  myth={myth}
                  onOpenDetails={m => setSelectedMyth(m)}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-800 p-12 text-center">
              <ShieldAlert className="mx-auto h-8 w-8 text-zinc-400 mb-2" />
              <p className="text-zinc-500 dark:text-zinc-400 font-medium">
                No cryptography myths found matching "{searchQuery}".
              </p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('All');
                }}
                className="mt-3 text-xs font-bold text-teal-500 hover:underline"
              >
                Reset Search Filters
              </button>
            </div>
          )}
        </section>
      </LearnPageTemplate>

      {/* Myth Detail Modal */}
      <MythDetailModal
        myth={selectedMyth}
        isOpen={Boolean(selectedMyth)}
        onClose={() => setSelectedMyth(null)}
      />

      <Footer />
    </div>
  );
}
