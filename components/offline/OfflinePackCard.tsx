'use client';

import React from 'react';
import { Download, CheckCircle, FileCode, FileText, Code2, Shield, KeyRound, Hash, Zap, BookOpen, Layers } from 'lucide-react';
import { OfflinePack, ExportFormat } from '@/lib/offline/types';

interface OfflinePackCardProps {
  pack: OfflinePack;
  isCached: boolean;
  onCache: (packId: string) => void;
  onExport: (pack: OfflinePack, format: ExportFormat) => void;
  onOpenDetails: (pack: OfflinePack) => void;
}

export default function OfflinePackCard({
  pack,
  isCached,
  onCache,
  onExport,
  onOpenDetails,
}: OfflinePackCardProps) {
  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'Shield': return <Shield className="h-6 w-6" />;
      case 'KeyRound': return <KeyRound className="h-6 w-6" />;
      case 'Hash': return <Hash className="h-6 w-6" />;
      case 'Zap': return <Zap className="h-6 w-6" />;
      case 'BookOpen': return <BookOpen className="h-6 w-6" />;
      default: return <Layers className="h-6 w-6" />;
    }
  };

  return (
    <div
      className="group relative flex flex-col justify-between rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white/70 dark:bg-zinc-900/70 p-6 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-teal-500/50 hover:shadow-xl hover:shadow-teal-500/10"
      tabIndex={0}
      aria-label={`Learning Pack: ${pack.title}`}
    >
      <div>
        {/* Header Icon & Badges */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500/20 to-cyan-500/20 text-teal-600 dark:text-teal-400 border border-teal-500/30">
            {getIcon(pack.icon)}
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-teal-500/10 px-3 py-1 text-xs font-semibold text-teal-600 dark:text-teal-400 border border-teal-500/20">
              {pack.estimatedSize}
            </span>
            <span className="rounded-full bg-zinc-100 dark:bg-zinc-800 px-2.5 py-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">
              {pack.difficulty}
            </span>
          </div>
        </div>

        {/* Title & Description */}
        <h3 className="text-xl font-bold text-zinc-900 dark:text-white group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
          {pack.title}
        </h3>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
          {pack.description}
        </p>

        {/* Included Content Metrics */}
        <div className="mt-4 flex items-center gap-4 text-xs font-medium text-zinc-500 dark:text-zinc-400">
          <span>📚 {pack.docItems.length} Docs & References</span>
          <span>⚡ {pack.cipherItems.length} Visualizer Tools</span>
        </div>

        {/* Topic Pills */}
        <div className="mt-4 flex flex-wrap gap-1.5">
          {pack.topics.slice(0, 4).map((topic) => (
            <span
              key={topic}
              className="rounded-md bg-zinc-100 dark:bg-zinc-800/80 px-2.5 py-1 text-xs text-zinc-700 dark:text-zinc-300"
            >
              {topic}
            </span>
          ))}
          {pack.topics.length > 4 && (
            <span className="rounded-md bg-zinc-100 dark:bg-zinc-800/80 px-2 py-1 text-xs text-zinc-500 dark:text-zinc-400">
              +{pack.topics.length - 4} more
            </span>
          )}
        </div>
      </div>

      {/* Card Actions */}
      <div className="mt-6 border-t border-zinc-100 dark:border-zinc-800/60 pt-4 flex flex-col gap-3">
        <div className="flex items-center gap-2">
          {isCached ? (
            <button
              disabled
              aria-label={`Pack ${pack.title} is cached offline`}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-teal-500/15 text-teal-700 dark:text-teal-300 px-4 py-2.5 text-xs font-bold border border-teal-500/30 cursor-default"
            >
              <CheckCircle className="h-4 w-4 text-teal-500" />
              Cached for Offline Use
            </button>
          ) : (
            <button
              onClick={() => onCache(pack.id)}
              aria-label={`Pre-cache ${pack.title} for offline access`}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white font-bold px-4 py-2.5 text-xs shadow-md shadow-teal-500/20 transition-all hover:scale-[1.02]"
            >
              <Download className="h-4 w-4" />
              Pre-cache for Offline
            </button>
          )}

          <button
            onClick={() => onOpenDetails(pack)}
            aria-label={`View details for ${pack.title}`}
            className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800/80 px-3.5 py-2.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-700"
          >
            Details
          </button>
        </div>

        {/* Download Standalone Files */}
        <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 pt-1">
          <span className="font-medium">Download Standalone:</span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onExport(pack, 'single-html')}
              title="Download Self-Contained Offline HTML App"
              aria-label="Download Single-File HTML Visualizer App"
              className="flex items-center gap-1 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 px-2 py-1 text-[11px] font-semibold text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-950/40 transition-colors"
            >
              <FileCode className="h-3 w-3" />
              HTML App
            </button>
            <button
              onClick={() => onExport(pack, 'json')}
              title="Export Structured JSON Pack Data"
              aria-label="Export JSON Data"
              className="flex items-center gap-1 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 px-2 py-1 text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <Code2 className="h-3 w-3" />
              JSON
            </button>
            <button
              onClick={() => onExport(pack, 'markdown')}
              title="Download Markdown Documentation Pack"
              aria-label="Export Markdown Documentation"
              className="flex items-center gap-1 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 px-2 py-1 text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <FileText className="h-3 w-3" />
              MD
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
