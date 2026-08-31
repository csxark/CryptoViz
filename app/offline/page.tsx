'use client';

import React, { useState, useMemo } from 'react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/footer';
import OfflineStatusBadge from '@/components/offline/OfflineStatusBadge';
import OfflinePackCard from '@/components/offline/OfflinePackCard';
import OfflineVisualizer from '@/components/offline/OfflineVisualizer';
import OfflinePackDrawer from '@/components/offline/OfflinePackDrawer';
import { OFFLINE_PACKS } from '@/lib/offline/packData';
import { useOfflinePackManager } from '@/lib/offline/swRegister';
import { exportPackAsJson, exportPackAsMarkdown, exportPackAsSingleFileHtml, downloadFile } from '@/lib/offline/packManager';
import { OfflinePack, PackCategory, ExportFormat } from '@/lib/offline/types';
import { Search, DownloadCloud, BookOpen, ShieldCheck, Sparkles } from 'lucide-react';

export default function OfflineLearningPackPage() {
  const { status, cachePack, clearCache } = useOfflinePackManager();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<PackCategory>('all');
  const [selectedPackForDetails, setSelectedPackForDetails] = useState<OfflinePack | null>(null);

  // Filter packs based on search query and category
  const filteredPacks = useMemo(() => {
    return OFFLINE_PACKS.filter(pack => {
      const matchesCategory = selectedCategory === 'all' || pack.category === selectedCategory;
      const matchesSearch =
        searchQuery === '' ||
        pack.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pack.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pack.topics.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));

      return matchesCategory && matchesSearch;
    });
  }, [searchQuery, selectedCategory]);

  const handleExport = (pack: OfflinePack, format: ExportFormat) => {
    if (format === 'single-html') {
      const html = exportPackAsSingleFileHtml(pack);
      downloadFile(`${pack.id}-offline-visualizer.html`, html, 'text/html');
    } else if (format === 'json') {
      const json = exportPackAsJson(pack);
      downloadFile(`${pack.id}-pack.json`, json, 'application/json');
    } else if (format === 'markdown') {
      const md = exportPackAsMarkdown(pack);
      downloadFile(`${pack.id}-pack.md`, md, 'text/markdown');
    }
  };

  const categories: { id: PackCategory; label: string }[] = [
    { id: 'all', label: 'All Learning Packs' },
    { id: 'symmetric', label: 'Symmetric & Classical' },
    { id: 'asymmetric', label: 'Asymmetric & PQC' },
    { id: 'hash', label: 'Hashes & KDF' },
    { id: 'attacks', label: 'Cryptanalysis & Attacks' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-[#060816] text-zinc-900 dark:text-white transition-colors duration-300">
      <Navbar />

      <main id="main-content" className="flex-1 mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8 space-y-12">
        {/* Hero Section */}
        <section aria-labelledby="offline-hero-title" className="relative overflow-hidden rounded-3xl border border-zinc-200/80 dark:border-zinc-800/80 bg-gradient-to-br from-teal-500/10 via-cyan-500/5 to-transparent p-8 sm:p-12 backdrop-blur-2xl">
          <div className="max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-teal-500/30 bg-teal-500/10 px-3.5 py-1 text-xs font-bold text-teal-600 dark:text-teal-400">
              <Sparkles className="h-3.5 w-3.5" />
OFFLINE LEARNING PACK ENGINE            </div>
            <h1 id="offline-hero-title" className="text-3xl sm:text-5xl font-black tracking-tight text-zinc-900 dark:text-white">
              Learn Cryptography <span className="text-teal-500">Anywhere, Offline</span>
            </h1>
            <p className="text-base sm:text-lg text-zinc-600 dark:text-zinc-300 leading-relaxed">
              Pre-cache comprehensive cryptography documentation, algorithm specifications, and standalone interactive cipher visualizers. Practice encryption, decryption, and hash operations completely offline without an active internet connection.
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-4 text-xs font-semibold text-zinc-600 dark:text-zinc-400">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-teal-500" /> PWA Service Worker Caching
              </span>
              <span className="flex items-center gap-1.5">
                <DownloadCloud className="h-4 w-4 text-teal-500" /> Single-File HTML Standalone Apps
              </span>
              <span className="flex items-center gap-1.5">
                <BookOpen className="h-4 w-4 text-teal-500" /> Complete Docs & References
              </span>
            </div>
          </div>
        </section>

        {/* Live Network & SW Cache Manager Bar */}
        <section aria-label="Offline status and cache manager">
          <OfflineStatusBadge status={status} onClearCache={clearCache} />
        </section>

        {/* Embedded Interactive Offline Cipher Playground */}
        <section aria-labelledby="offline-visualizer-title">
          <OfflineVisualizer />
        </section>

        {/* Search & Category Filter Section */}
        <section aria-labelledby="learning-packs-heading" className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 id="learning-packs-heading" className="text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-white">
                Available Offline Learning Packs
              </h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                Select a pack to cache locally or export as a standalone offline bundle.
              </p>
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
              <input
                type="text"
                placeholder="Search packs or topics..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                aria-label="Search offline learning packs or topics"
                className="w-full rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 pl-10 pr-4 py-2.5 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 transition-colors"
              />
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="flex flex-wrap items-center gap-2 overflow-x-auto pb-2" role="tablist" aria-label="Category filter">
            {categories.map(cat => (
              <button
                key={cat.id}
                role="tab"
                aria-selected={selectedCategory === cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
                  selectedCategory === cat.id
                    ? 'bg-teal-500 text-black shadow-md shadow-teal-500/20'
                    : 'bg-zinc-100 dark:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Packs Grid */}
          {filteredPacks.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPacks.map(pack => (
                <OfflinePackCard
                  key={pack.id}
                  pack={pack}
                  isCached={status.cachedPackIds.includes(pack.id)}
                  onCache={cachePack}
                  onExport={handleExport}
                  onOpenDetails={p => setSelectedPackForDetails(p)}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-800 p-12 text-center">
              <p className="text-zinc-500 dark:text-zinc-400 font-medium">
                No learning packs found matching "{searchQuery}".
              </p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                }}
                className="mt-3 text-xs font-bold text-teal-500 hover:underline"
              >
                Reset Search Filters
              </button>
            </div>
          )}
        </section>

        {/* Offline FAQ Section */}
        <section aria-labelledby="offline-faq-heading" className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 p-6 md:p-8 space-y-6">
          <h2 id="offline-faq-heading" className="text-xl font-bold text-zinc-900 dark:text-white">
            Frequently Asked Questions about Offline Mode
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
            <div className="space-y-1.5">
              <h3 className="font-semibold text-teal-600 dark:text-teal-400">
                How does offline caching work?
              </h3>
              <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
                CryptoViz registers a Progressive Web App (PWA) Service Worker. Clicking "Pre-cache" stores documentation, styles, scripts, and visualizer modules in your browser's Cache Storage so you can open CryptoViz anytime without internet access.
              </p>
            </div>
            <div className="space-y-1.5">
              <h3 className="font-semibold text-teal-600 dark:text-teal-400">
                What are Single-File HTML Standalone Apps?
              </h3>
              <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Single-File HTML Apps contain all documentation, formulas, and client-side JavaScript cipher execution code bundled into one file. You can download and run them on any device or USB drive in any modern web browser.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Pack Details Drawer Modal */}
      <OfflinePackDrawer
        pack={selectedPackForDetails}
        isOpen={Boolean(selectedPackForDetails)}
        isCached={selectedPackForDetails ? status.cachedPackIds.includes(selectedPackForDetails.id) : false}
        onClose={() => setSelectedPackForDetails(null)}
        onCache={cachePack}
        onExport={handleExport}
      />

      <Footer />
    </div>
  );
}
