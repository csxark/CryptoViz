'use client';

import React from 'react';
import { X, BookOpen, ExternalLink, ArrowRight, Tag } from 'lucide-react';
import { GlossaryTerm } from '@/lib/glossary/types';
import Link from 'next/link';

interface GlossaryModalProps {
  term: GlossaryTerm | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function GlossaryModal({ term, isOpen, onClose }: GlossaryModalProps) {
  if (!isOpen || !term) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className="relative w-full max-w-xl max-h-[85vh] overflow-y-auto rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 md:p-8 shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-zinc-100 dark:border-zinc-800 pb-4">
          <div>
            <span className="rounded-full bg-teal-500/10 px-3 py-0.5 text-xs font-bold text-teal-600 dark:text-teal-400 border border-teal-500/20">
              {term.category}
            </span>
            <h2 id="modal-title" className="text-2xl font-bold text-zinc-900 dark:text-white mt-1">
              {term.term}
            </h2>
            {term.aliases && term.aliases.length > 0 && (
              <p className="text-xs text-zinc-400 mt-0.5">
                Also known as: {term.aliases.join(', ')}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Close glossary entry detail"
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Summary */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400 mb-1">
            Summary
          </h3>
          <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 leading-relaxed">
            {term.summary}
          </p>
        </div>

        {/* Full Definition */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400 mb-1">
            Detailed Cryptographic Definition
          </h3>
          <p className="text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed">
            {term.definition}
          </p>
        </div>

        {/* Formula */}
        {term.formula && (
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400 mb-1.5">
              Mathematical Notation
            </h3>
            <div className="rounded-xl bg-zinc-950 p-3.5 font-mono text-xs text-emerald-400 border border-zinc-800 word-break break-all">
              {term.formula}
            </div>
          </div>
        )}

        {/* Tags */}
        <div className="flex items-center gap-2 flex-wrap pt-2">
          <Tag className="h-3.5 w-3.5 text-zinc-400" />
          {term.tags.map((tag, idx) => (
            <span key={idx} className="rounded-md bg-zinc-100 dark:bg-zinc-800 px-2.5 py-1 text-xs text-zinc-600 dark:text-zinc-400">
              #{tag}
            </span>
          ))}
        </div>

        {/* Footer Actions */}
        <div className="border-t border-zinc-100 dark:border-zinc-800 pt-4 flex items-center justify-between">
          {term.relatedCipherId ? (
            <Link
              href={`/visualizer/${term.relatedCipherId}`}
              onClick={onClose}
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 text-black font-bold px-4 py-2 text-xs shadow-md shadow-teal-500/20 hover:scale-[1.02] transition-transform"
            >
              Open Interactive Visualizer
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          ) : (
            <span className="text-xs text-zinc-400">Core Cryptographic Reference</span>
          )}

          <button
            onClick={onClose}
            className="rounded-xl border border-zinc-200 dark:border-zinc-800 px-4 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
