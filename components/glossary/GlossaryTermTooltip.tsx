'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { BookOpen, ExternalLink, ArrowRight } from 'lucide-react';
import { GlossaryTerm } from '@/lib/glossary/types';

interface GlossaryTermTooltipProps {
  term: GlossaryTerm;
  matchedText: string;
  onTermClick?: (term: GlossaryTerm) => void;
}

export default function GlossaryTermTooltip({
  term,
  matchedText,
  onTermClick,
}: GlossaryTermTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close popover on escape or click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const togglePopover = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOpen(prev => !prev);
    if (onTermClick) onTermClick(term);
  };

  return (
    <span className="relative inline-block">
      <button
        ref={triggerRef}
        type="button"
        onClick={togglePopover}
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-label={`Glossary definition for ${term.term}`}
        className="inline-flex items-center underline decoration-teal-500/60 decoration-2 underline-offset-4 text-teal-600 dark:text-teal-400 font-medium hover:text-teal-700 dark:hover:text-teal-300 hover:decoration-teal-500 transition-all rounded px-0.5 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-1 dark:focus:ring-offset-zinc-950"
      >
        {matchedText}
        <span className="ml-0.5 text-[10px] opacity-70">📖</span>
      </button>

      {/* Accessible Popover */}
      {isOpen && (
        <div
          ref={popoverRef}
          role="dialog"
          aria-label={`Definition: ${term.term}`}
          onMouseEnter={() => setIsOpen(true)}
          onMouseLeave={() => setIsOpen(false)}
          className="absolute bottom-full left-1/2 z-50 mb-2 w-72 -translate-x-1/2 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="flex items-start justify-between gap-2 mb-2">
            <span className="rounded-full bg-teal-500/10 px-2.5 py-0.5 text-[11px] font-bold text-teal-600 dark:text-teal-400 border border-teal-500/20">
              {term.category}
            </span>
            <span className="text-[10px] font-mono text-zinc-400">Glossary Term</span>
          </div>

          <h4 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
            <BookOpen className="h-3.5 w-3.5 text-teal-500" />
            {term.term}
          </h4>

          <p className="mt-1.5 text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
            {term.summary}
          </p>

          {term.formula && (
            <div className="mt-2 rounded-lg bg-zinc-950 p-2 font-mono text-[11px] text-emerald-400 border border-zinc-800 word-break break-all">
              {term.formula}
            </div>
          )}

          <div className="mt-3 flex items-center justify-between border-t border-zinc-100 dark:border-zinc-800 pt-2.5 text-xs">
            {term.relatedCipherId ? (
              <Link
                href={`/visualizer/${term.relatedCipherId}`}
                className="flex items-center gap-1 font-semibold text-teal-600 dark:text-teal-400 hover:underline"
              >
                Test in Playground
                <ArrowRight className="h-3 w-3" />
              </Link>
            ) : (
              <span className="text-zinc-400">CryptoViz Term</span>
            )}

            <Link
              href={`/glossary?term=${term.id}`}
              className="flex items-center gap-1 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
            >
              Full Entry
              <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        </div>
      )}
    </span>
  );
}
