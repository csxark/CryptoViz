'use client';

import React, { useState, useMemo } from 'react';

import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/footer';
import LearnPageTemplate from "@/components/layout/LearnPageTemplate";
import CipherLifecycleBadge, { BADGE_CONFIG, SecurityStatus } from '@/components/cipher/CipherLifecycleBadge';
import { CIPHER_REGISTRY } from '@/lib/cipher/registry';
import Link from 'next/link';
import { Search, ShieldAlert, ArrowRight, Sparkles } from 'lucide-react';

export default function CipherLifecyclePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<SecurityStatus | 'all'>('all');

  const statuses: SecurityStatus[] = ['recommended', 'secure', 'experimental', 'legacy', 'deprecated', 'broken'];

  const filteredCiphers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return CIPHER_REGISTRY.filter(cipher => {
      const matchesStatus = selectedStatus === 'all' || cipher.securityStatus === selectedStatus;
      const matchesSearch =
        q === '' ||
        cipher.name.toLowerCase().includes(q) ||
        cipher.id.toLowerCase().includes(q) ||
        cipher.category.toLowerCase().includes(q) ||
        cipher.description.toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [searchQuery, selectedStatus]);

  const countsByStatus = useMemo(() => {
    const counts: Record<SecurityStatus, number> = {
      recommended: 0,
      secure: 0,
      experimental: 0,
      legacy: 0,
      deprecated: 0,
      broken: 0,
    };
    CIPHER_REGISTRY.forEach(c => {
      counts[c.securityStatus]++;
    });
    return counts;
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-[#060816] text-zinc-900 dark:text-white transition-colors duration-300">
      <Navbar />

      
      <LearnPageTemplate
        title="Cryptographic Security Lifecycle"
        description="Standardized security classification badges for every algorithm in CryptoViz based on NIST SP 800-57 guidelines and modern cryptanalysis standards."
        eyebrow="CIPHER LIFECYCLE BADGES #496"
        breadcrumbs={[
          { label: "Learn" },
          { label: "Cipher Lifecycle" },
        ]}
        hideHeader
      >

        {/* Hero Header */}
        <section aria-labelledby="lifecycle-hero-title" className="relative overflow-hidden rounded-3xl border border-zinc-200/80 dark:border-zinc-800/80 bg-gradient-to-br from-teal-500/10 via-emerald-500/5 to-transparent p-8 sm:p-12 backdrop-blur-2xl">
          <div className="max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-teal-500/30 bg-teal-500/10 px-3.5 py-1 text-xs font-bold text-teal-600 dark:text-teal-400">
              <Sparkles className="h-3.5 w-3.5" />
              CIPHER LIFECYCLE BADGES #496
            </div>
            <h1 id="lifecycle-hero-title" className="text-3xl sm:text-5xl font-black tracking-tight text-zinc-900 dark:text-white">
              Cryptographic <span className="text-teal-500">Security Lifecycle</span>
            </h1>
            <p className="text-base sm:text-lg text-zinc-600 dark:text-zinc-300 leading-relaxed">
              Standardized security classification badges for every algorithm in CryptoViz based on NIST SP 800-57 guidelines and modern cryptanalysis standards.
            </p>
          </div>
        </section>

        {/* Lifecycle Badge Definitions Cards Grid */}
        <section aria-labelledby="badge-definitions-heading" className="space-y-6">
          <div>
            <h2 id="badge-definitions-heading" className="text-2xl font-bold text-zinc-900 dark:text-white">
              Lifecycle Classification Matrix
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              Understanding security status criteria and operational recommendations.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {statuses.map(st => {
              const cfg = BADGE_CONFIG[st];
              const count = countsByStatus[st];
              return (
                <div
                  key={st}
                  onClick={() => setSelectedStatus(selectedStatus === st ? 'all' : st)}
                  className={`cursor-pointer rounded-2xl border p-6 transition-all duration-200 ${
                    selectedStatus === st
                      ? 'border-teal-500 bg-teal-500/5 shadow-lg shadow-teal-500/10'
                      : 'border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/50 hover:border-zinc-300 dark:hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <CipherLifecycleBadge status={st} size="md" />
                    <span className="rounded-full bg-zinc-100 dark:bg-zinc-800 px-2.5 py-0.5 text-xs font-bold text-zinc-600 dark:text-zinc-400">
                      {count} {count === 1 ? 'algorithm' : 'algorithms'}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
                    {cfg.description}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Filter & Search Directory */}
        <section aria-labelledby="registry-lifecycle-heading" className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 id="registry-lifecycle-heading" className="text-2xl font-bold text-zinc-900 dark:text-white">
                Algorithm Security Registry
              </h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                Filter algorithms by lifecycle stage or search by name.
              </p>
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
              <input
                type="text"
                placeholder="Search algorithms..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                aria-label="Search algorithms by name or description"
                className="w-full rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 pl-10 pr-4 py-2.5 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 transition-colors"
              />
            </div>
          </div>

          {/* Filter Status Buttons */}
          <div className="flex flex-wrap items-center gap-2 overflow-x-auto pb-2" role="tablist" aria-label="Filter ciphers by security status">
            <button
              role="tab"
              aria-selected={selectedStatus === 'all'}
              onClick={() => setSelectedStatus('all')}
              className={`rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
                selectedStatus === 'all'
                  ? 'bg-teal-500 text-black shadow-md shadow-teal-500/20'
                  : 'bg-zinc-100 dark:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800'
              }`}
            >
              All ({CIPHER_REGISTRY.length})
            </button>
            {statuses.map(st => (
              <button
                key={st}
                role="tab"
                aria-selected={selectedStatus === st}
                onClick={() => setSelectedStatus(st)}
                className={`rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
                  selectedStatus === st
                    ? 'bg-teal-500 text-black shadow-md shadow-teal-500/20'
                    : 'bg-zinc-100 dark:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800'
                }`}
              >
                {BADGE_CONFIG[st].label} ({countsByStatus[st]})
              </button>
            ))}
          </div>

          {/* Ciphers Grid */}
          {filteredCiphers.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCiphers.map(cipher => (
                <article
                  key={cipher.id}
                  className="group relative flex flex-col justify-between rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white/70 dark:bg-zinc-900/70 p-6 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-teal-500/50 hover:shadow-xl hover:shadow-teal-500/10"
                >
                  <div>
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <CipherLifecycleBadge status={cipher.securityStatus} size="sm" />
                      <span className="rounded-full bg-zinc-100 dark:bg-zinc-800 px-2.5 py-0.5 text-xs font-medium text-zinc-600 dark:text-zinc-400 capitalize">
                        {cipher.category}
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-zinc-900 dark:text-white group-hover:text-teal-500 transition-colors">
                      {cipher.name}
                    </h3>
                    <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                      {cipher.description}
                    </p>
                  </div>

                  <div className="mt-5 pt-4 border-t border-zinc-100 dark:border-zinc-800/60 flex items-center justify-end">
                    <Link
                      href={`/visualizer/${cipher.id}/`}
                      className="inline-flex items-center gap-1 text-xs font-bold text-teal-600 dark:text-teal-400 hover:underline"
                    >
                      Open Visualizer
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-800 p-12 text-center">
              <ShieldAlert className="mx-auto h-8 w-8 text-zinc-400 mb-2" />
              <p className="text-zinc-500 dark:text-zinc-400 font-medium">
                No algorithms found matching your search filters.
              </p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedStatus('all');
                }}
                className="mt-3 text-xs font-bold text-teal-500 hover:underline"
              >
                Reset Filters
              </button>
            </div>
          )}
        </section>
      </LearnPageTemplate>

      <Footer />
    </div>
  );
}
