'use client';

import React, { useState, useMemo } from 'react';

import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/footer';
import ReferencePageTemplate from "@/components/layout/ReferencePageTemplate";
import GlossaryModal from '@/components/glossary/GlossaryModal';
import { searchGlossaryTerms } from '@/lib/glossary/glossaryData';
import { GlossaryTerm, TermCategory } from '@/lib/glossary/types';
import { Search, BookOpen, ArrowRight, Sparkles } from 'lucide-react';
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
         <ReferencePageTemplate
        title="Glossary"
        description="Explore essential concepts, mathematical formulas, and definitions. All CryptoViz documentation articles automatically cross-link terminology to this explorer."
        eyebrow="INTERACTIVE TERMINOLOGY & GLOSSARY #509"
        breadcrumbs={[
          { label: 'Reference' },
          { label: 'Glossary' },
        ]}
      >
        {/* Search & Category Filter */}
        <section
          aria-labelledby="glossary-filter-heading"
          className="space-y-6"
        >
          <h2 id="glossary-filter-heading" className="sr-only">
            Glossary Search and Filters
          </h2>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />

              <input
                type="text"
                placeholder="Search cryptographic terms..."
                value={searchQuery}
                onChange={(event) => {
                  setSearchQuery(event.target.value);
                  setSelectedLetter(null);
                }}
                aria-label="Search cryptographic terms"
                className="w-full rounded-2xl border border-zinc-200 bg-white py-2.5 pl-10 pr-4 text-sm text-zinc-900 placeholder-zinc-400 transition-colors focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
              />
            </div>

            {/* Category Pills */}
            <div
              className="flex flex-wrap items-center gap-2"
              role="tablist"
              aria-label="Glossary category filter"
            >
              {categories.map((category) => (
                <button
                  key={category}
                  type="button"
                  role="tab"
                  aria-selected={selectedCategory === category}
                  onClick={() => setSelectedCategory(category)}
                  className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all ${
                    selectedCategory === category
                      ? 'bg-teal-500 text-black shadow-md shadow-teal-500/20'
                      : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800/80 dark:text-zinc-300 dark:hover:bg-zinc-800'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          {/* Alphabet Index Jumper */}
          <div className="flex flex-wrap items-center justify-center gap-1 rounded-2xl border border-zinc-200/80 bg-zinc-50/50 p-3 dark:border-zinc-800/80 dark:bg-zinc-900/50">
            <button
              type="button"
              onClick={() => setSelectedLetter(null)}
              className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                selectedLetter === null
                  ? 'bg-teal-500 text-black'
                  : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white'
              }`}
            >
              ALL
            </button>

            {alphabet.map((letter) => (
              <button
                key={letter}
                type="button"
                onClick={() =>
                  setSelectedLetter(
                    selectedLetter === letter ? null : letter,
                  )
                }
                className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold transition-all ${
                  selectedLetter === letter
                    ? 'bg-teal-500 text-black shadow-sm'
                    : 'text-zinc-600 hover:bg-zinc-200 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white'
                }`}
              >
                {letter}
              </button>
            ))}
          </div>
        </section>

        {/* Terms Grid */}
        <section aria-labelledby="terms-grid-heading">
          <h2 id="terms-grid-heading" className="sr-only">
            Glossary Terms
          </h2>

          {filteredTerms.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredTerms.map((term) => (
                <div
                  key={term.id}
                  className="group flex flex-col justify-between rounded-2xl border border-zinc-200/80 bg-white/70 p-6 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-teal-500/50 hover:shadow-xl hover:shadow-teal-500/10 dark:border-zinc-800/80 dark:bg-zinc-900/70"
                >
                  <div>
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <span className="rounded-full border border-teal-500/20 bg-teal-500/10 px-3 py-0.5 text-xs font-bold text-teal-600 dark:text-teal-400">
                        {term.category}
                      </span>

                      {term.relatedCipherId && (
                        <span className="text-[11px] font-semibold text-emerald-500 dark:text-emerald-400">
                          ⚡ Interactive Visualizer
                        </span>
                      )}
                    </div>

                    <h3 className="text-xl font-bold text-zinc-900 transition-colors group-hover:text-teal-600 dark:text-white dark:group-hover:text-teal-400">
                      {term.term}
                    </h3>

                    <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                      {term.summary}
                    </p>

                    {term.formula && (
                      <div className="mt-3 break-all rounded-xl border border-zinc-800 bg-zinc-950 p-2.5 font-mono text-xs text-emerald-400">
                        {term.formula}
                      </div>
                    )}
                  </div>

                  <div className="mt-6 flex items-center justify-between gap-2 border-t border-zinc-100 pt-4 dark:border-zinc-800/60">
                    <button
                      type="button"
                      onClick={() => setSelectedTerm(term)}
                      className="rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-xs font-semibold text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                    >
                      Read Full Definition
                    </button>

                    {term.relatedCipherId && (
                      <Link
                        href={`/visualizer/${term.relatedCipherId}`}
                        className="flex items-center gap-1 text-xs font-bold text-teal-600 hover:underline dark:text-teal-400"
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
            <div className="rounded-2xl border border-dashed border-zinc-300 p-12 text-center dark:border-zinc-800">
              <BookOpen className="mx-auto mb-2 h-8 w-8 text-zinc-400" />

              <p className="font-medium text-zinc-500 dark:text-zinc-400">
                No glossary terms found matching your query.
              </p>

              <button
                type="button"
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
      </ReferencePageTemplate>

      <GlossaryModal
        term={selectedTerm}
        isOpen={Boolean(selectedTerm)}
        onClose={() => setSelectedTerm(null)}
      />

      <Footer />
    </div>
  );
}
