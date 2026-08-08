'use client';

import React from 'react';
import { X, Download, FileCode, FileText, Code2, BookOpen, Layers, CheckCircle2 } from 'lucide-react';
import { OfflinePack, ExportFormat } from '@/lib/offline/types';

interface OfflinePackDrawerProps {
  pack: OfflinePack | null;
  isOpen: boolean;
  isCached: boolean;
  onClose: () => void;
  onCache: (packId: string) => void;
  onExport: (pack: OfflinePack, format: ExportFormat) => void;
}

export default function OfflinePackDrawer({
  pack,
  isOpen,
  isCached,
  onClose,
  onCache,
  onExport,
}: OfflinePackDrawerProps) {
  if (!isOpen || !pack) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="drawer-title"
    >
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 md:p-8 shadow-2xl space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-zinc-100 dark:border-zinc-800 pb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="rounded-full bg-teal-500/10 px-3 py-0.5 text-xs font-semibold text-teal-600 dark:text-teal-400 border border-teal-500/20">
                {pack.category.toUpperCase()}
              </span>
              <span className="rounded-full bg-zinc-100 dark:bg-zinc-800 px-2.5 py-0.5 text-xs font-medium text-zinc-600 dark:text-zinc-400">
                {pack.difficulty}
              </span>
            </div>
            <h2 id="drawer-title" className="text-2xl font-bold text-zinc-900 dark:text-white">
              {pack.title}
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              {pack.description}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close detail view"
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Topics List */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400 mb-2">
            Topics & Concepts Covered
          </h3>
          <div className="flex flex-wrap gap-2">
            {pack.topics.map((t) => (
              <span key={t} className="rounded-lg bg-zinc-100 dark:bg-zinc-800 px-3 py-1 text-xs font-medium text-zinc-800 dark:text-zinc-200">
                {t}
              </span>
            ))}
          </div>
        </div>

        {/* Included Docs */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400 mb-3 flex items-center gap-1.5">
            <BookOpen className="h-4 w-4" />
            Included Documentation Articles ({pack.docItems.length})
          </h3>
          <div className="space-y-2.5">
            {pack.docItems.map((doc) => (
              <div key={doc.slug} className="rounded-xl border border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-950/50 p-3.5">
                <div className="font-semibold text-sm text-zinc-900 dark:text-white">{doc.title}</div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{doc.description}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Included Visualizers */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400 mb-3 flex items-center gap-1.5">
            <Layers className="h-4 w-4" />
            Included Visualizer Algorithms ({pack.cipherItems.length})
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {pack.cipherItems.map((cipher) => (
              <div key={cipher.id} className="rounded-xl border border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-950/50 p-3">
                <div className="font-semibold text-xs text-zinc-900 dark:text-white">{cipher.name}</div>
                <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">{cipher.description}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="border-t border-zinc-100 dark:border-zinc-800 pt-5 space-y-3">
          <div className="flex items-center gap-3">
            {isCached ? (
              <div className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 py-3 text-xs font-bold border border-teal-500/20">
                <CheckCircle2 className="h-4 w-4" />
                Cached & Available Offline
              </div>
            ) : (
              <button
                onClick={() => onCache(pack.id)}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-black font-bold py-3 text-xs shadow-lg shadow-teal-500/20 transition-all"
              >
                <Download className="h-4 w-4" />
                Pre-cache Pack ({pack.estimatedSize})
              </button>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => onExport(pack, 'single-html')}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-teal-500/30 bg-teal-500/10 hover:bg-teal-500/20 py-2.5 text-xs font-bold text-teal-600 dark:text-teal-400 transition-colors"
            >
              <FileCode className="h-3.5 w-3.5" />
              HTML App
            </button>
            <button
              onClick={() => onExport(pack, 'json')}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-800/60 hover:bg-zinc-200 dark:hover:bg-zinc-800 py-2.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300 transition-colors"
            >
              <Code2 className="h-3.5 w-3.5" />
              Export JSON
            </button>
            <button
              onClick={() => onExport(pack, 'markdown')}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-800/60 hover:bg-zinc-200 dark:hover:bg-zinc-800 py-2.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300 transition-colors"
            >
              <FileText className="h-3.5 w-3.5" />
              Export MD
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
