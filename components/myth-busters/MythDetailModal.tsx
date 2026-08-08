'use client';

import React from 'react';
import { X, ShieldAlert, CheckCircle2, ArrowRight, Lightbulb } from 'lucide-react';
import { MythItem } from '@/lib/myth-busters/types';
import Link from 'next/link';

interface MythDetailModalProps {
  myth: MythItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function MythDetailModal({ myth, isOpen, onClose }: MythDetailModalProps) {
  if (!isOpen || !myth) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="myth-modal-title"
    >
      <div className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 md:p-8 shadow-2xl space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-zinc-100 dark:border-zinc-800 pb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="rounded-full bg-red-500/10 px-3 py-0.5 text-xs font-bold text-red-600 dark:text-red-400 border border-red-500/20">
                {myth.status}
              </span>
              <span className="rounded-full bg-zinc-100 dark:bg-zinc-800 px-2.5 py-0.5 text-xs font-medium text-zinc-600 dark:text-zinc-400">
                {myth.category}
              </span>
            </div>
            <h2 id="myth-modal-title" className="text-2xl font-bold text-zinc-900 dark:text-white">
              {myth.mythTitle}
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close myth details"
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Misconception Statement */}
        <div className="rounded-2xl border border-red-200/80 dark:border-red-900/40 bg-red-50/50 dark:bg-red-950/20 p-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-red-600 dark:text-red-400">
            <ShieldAlert className="h-4 w-4" />
            The Common Misconception
          </div>
          <p className="mt-1.5 text-sm font-medium text-zinc-800 dark:text-zinc-200 italic">
            "{myth.statement}"
          </p>
        </div>

        {/* Technical Reality Breakdown */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400 mb-2 flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            Technical Reality Breakdown
          </h3>
          <p className="text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed">
            {myth.detailedExplanation}
          </p>
        </div>

        {/* Key Takeaway */}
        <div className="rounded-2xl border border-teal-500/30 bg-teal-500/10 p-4">
          <div className="flex items-center gap-2 text-xs font-bold text-teal-700 dark:text-teal-300">
            <Lightbulb className="h-4 w-4" />
            Security Rule & Takeaway
          </div>
          <p className="mt-1 text-xs text-zinc-700 dark:text-zinc-200 leading-relaxed font-medium">
            {myth.keyTakeaway}
          </p>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5 pt-2">
          {myth.tags.map((tag) => (
            <span key={tag} className="rounded-md bg-zinc-100 dark:bg-zinc-800 px-2.5 py-1 text-xs text-zinc-600 dark:text-zinc-400">
              #{tag}
            </span>
          ))}
        </div>

        {/* Footer Actions */}
        <div className="border-t border-zinc-100 dark:border-zinc-800 pt-4 flex items-center justify-between">
          {myth.relatedCipherId ? (
            <Link
              href={`/visualizer/${myth.relatedCipherId}`}
              onClick={onClose}
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 text-black font-bold px-4 py-2 text-xs shadow-md shadow-teal-500/20 hover:scale-[1.02] transition-transform"
            >
              Test Algorithm in Playground
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          ) : (
            <span className="text-xs text-zinc-400">Security Standard</span>
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
