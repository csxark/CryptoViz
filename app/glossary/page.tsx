'use client';

import React, { useState, useMemo } from 'react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/footer';
import GlossaryModal from '@/components/glossary/GlossaryModal';
import { GLOSSARY_TERMS, searchGlossaryTerms } from '@/lib/glossary/glossaryData';
import { GlossaryTerm, TermCategory } from '@/lib/glossary/types';
import { Search, BookOpen, ArrowRight, Sparkles, Filter } from 'lucide-react';
import Link from 'next/link';

export default function GlossaryPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<TermCategory | 'All'>('All');
  const [selectedLetter, setSelectedLetter] = useState<string | null>(null);
  const [selectedTerm, setSelectedTerm] = useState<GlossaryTerm | null>(null);

  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

  const filteredTerms = useMemo(() => {
    let terms = searchGlossaryTerms(searchQuery);

    if (selectedCategory !== 'All') {
      terms = terms.filter(t => t.category === selectedCategory);
    }

    if (selectedLetter) {
      terms = terms.filter(t => t.term.toUpperCase().startsWith(selectedLetter));
    }

    return terms;
  }, [searchQuery, selectedCategory, selectedLetter]);

  const categories: (TermCategory | 'All')[] = [
    'All',
    'Symmetric',
    'Asymmetric',
    'Hashing',
    'Attacks',
    'Protocols',
  ];

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-[#060816] text-zinc-900 dark:text-white transition-colors duration-300">
      <Navbar />

      <main id="main-content" className="flex-1 mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8 space-y-10">
        {/* Hero Section */}
        <section aria-labelledby="glossary-hero-title" className="relative overflow-hidden rounded-3xl border border-zinc-200/80 dark:border-zinc-800/80 bg-gradient-to-br from-teal-500/10 via-cyan-500/5 to-transparent p-8 sm:p-12 backdrop-blur-2xl">
          <div className="max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-teal-500/30 bg-teal-500/10 px-3.5 py-1 text-xs font-bold text-teal-600 dark:text-teal-400">
              <Sparkles className="h-3.5 w-3.5" />
              INTERACTIVE TERMINOLOGY & GLOSSARY #509
            </div>
            <h1 id="glossary-hero-title" className="text-3xl sm:text-5xl font-black tracking-tight text-zinc-900 dark:text-white">
              Cryptography <span className="text-teal-500">Glossary Explorer</span>
            </h1>
            <p className="text-base sm:text-lg text-zinc-600 dark:text-zinc-300 leading-relaxed">
              Explore essential concepts, mathematical formulas, and definitions. All CryptoViz documentation articles automatically cross-link terminology to this explorer.
            </p>
          </div>
        </section>

        {/* Search & Category Filter */}
        <section aria-labelledby="glossary-filter-heading" className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
              <input
                type="text"
                placeholder="Search cryptographic terms..."
                value={searchQuery}
                onChange={e => {
                  setSearchQuery(e.target.value);
                  setSelectedLetter(null);
                }}
                aria-label="Search cryptographic terms"
                className="w-full rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 pl-10 pr-4 py-2.5 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 transition-colors"
              />
            </div>

            {/* Category Pills */}
            <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Glossary category filter">
              {categories.map(cat => (
                <button
                  key={cat}
                  role="tab"
                  aria-selected={selectedCategory === cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all ${
                    selectedCategory === cat
                      ? 'bg-teal-500 text-black shadow-md shadow-teal-500/20'
                      : 'bg-zinc-100 dark:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Alphabet Index Jumper */}
          <div className="flex flex-wrap items-center justify-center gap-1 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/50 p-3">
            <button
              onClick={() => setSelectedLetter(null)}
              className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                selectedLetter === null ? 'bg-teal-500 text-black' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              ALL
            </button>
            {alphabet.map(letter => (
              <button
                key={letter}
                onClick={() => setSelectedLetter(selectedLetter === letter ? null : letter)}
                className={`h-7 w-7 rounded-lg text-xs font-bold transition-all flex items-center justify-center ${
                  selectedLetter === letter
                    ? 'bg-teal-500 text-black shadow-sm'
                    : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                {letter}
              </button>
            ))}
          </div>
        </section>

        {/* Terms Grid */}
        <section aria-labelledby="terms-grid-heading">
          <h2 id="terms-grid-heading" className="sr-only">Glossary Terms</h2>
          {filteredTerms.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTerms.map(term => (
                <div
                  key={term.id}
                  className="group flex flex-col justify-between rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white/70 dark:bg-zinc-900/70 p-6 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-teal-500/50 hover:shadow-xl hover:shadow-teal-500/10"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="rounded-full bg-teal-500/10 px-3 py-0.5 text-xs font-bold text-teal-600 dark:text-teal-400 border border-teal-500/20">
                        {term.category}
                      </span>
                      {term.relatedCipherId && (
                        <span className="text-[11px] font-semibold text-emerald-500 dark:text-emerald-400">
                          ⚡ Interactive Visualizer
                        </span>
                      )}
                    </div>

                    <h3 className="text-xl font-bold text-zinc-900 dark:text-white group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                      {term.term}
                    </h3>
                    <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                      {term.summary}
                    </p>

                    {term.formula && (
                      <div className="mt-3 rounded-xl bg-zinc-950 p-2.5 font-mono text-xs text-emerald-400 border border-zinc-800 word-break break-all">
                        {term.formula}
                      </div>
                    )}
                  </div>

                  <div className="mt-6 border-t border-zinc-100 dark:border-zinc-800/60 pt-4 flex items-center justify-between gap-2">
                    <button
                      onClick={() => setSelectedTerm(term)}
                      className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800 px-3.5 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
                    >
                      Read Full Definition
                    </button>

                    {term.relatedCipherId && (
                      <Link
                        href={`/visualizer/${term.relatedCipherId}`}
                        className="flex items-center gap-1 text-xs font-bold text-teal-600 dark:text-teal-400 hover:underline"
                      >
                        Visualizer
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-800 p-12 text-center">
              <BookOpen className="mx-auto h-8 w-8 text-zinc-400 mb-2" />
              <p className="text-zinc-500 dark:text-zinc-400 font-medium">
                No glossary terms found matching your query.
              </p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('All');
                  setSelectedLetter(null);
                }}
                className="mt-3 text-xs font-bold text-teal-500 hover:underline"
              >
                Reset Search & Alphabet Filters
              </button>
            </div>
          )}
        </section>
      </main>

      <GlossaryModal
        term={selectedTerm}
        isOpen={Boolean(selectedTerm)}
        onClose={() => setSelectedTerm(null)}
      />

      <Footer />
    </div>
  );
}
