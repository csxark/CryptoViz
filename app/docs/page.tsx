"use client";

import React, { useState } from 'react';
import { docCategories, DocCategory } from './data';

export default function DocumentationPage() {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopy = (text: string, index: number) => {
    const cleanText = text.replace(/^\d+\.\s*/, '');
    navigator.clipboard.writeText(cleanText);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

 return (
    <div className="min-h-screen bg-black text-slate-100 font-sans selection:bg-emerald-500 selection:text-black">
      
      {/* 🟢 MINIMALIST HERO SECTION */}
      <header className="relative bg-zinc-950 py-16 px-6 text-center border-b border-zinc-900">
        <div className="max-w-3xl mx-auto">
          <span className="inline-block text-xs font-mono tracking-wider uppercase text-emerald-400 bg-emerald-400/10 px-3 py-1 rounded-sm mb-4 border border-emerald-500/20">
            Core Documentation
          </span>
          <h1 className="text-3xl md:text-4xl font-mono font-bold tracking-tight text-white mb-4">
            CryptoViz Docs
          </h1>
          <p className="text-sm md:text-base text-zinc-400 max-w-xl mx-auto leading-relaxed font-sans">
            A comprehensive reference center for configuring, deploying, and contributing to the visual cryptographic architecture.
          </p>
        </div>
      </header>

      {/* 🧭 VERTICALLY STACKED CONTENT FLOW */}
      <main className="max-w-4xl mx-auto px-4 md:px-6 py-12 space-y-12">
        
        {docCategories.map((category, sectionIdx) => (
          <section 
            key={category.title}
            className="bg-zinc-950 border border-zinc-900 rounded-xl p-6 md:p-8 transition-colors duration-200 hover:border-emerald-500/30"
          >
            {/* Section Header */}
            <div className="flex items-center gap-3 border-b border-zinc-900 pb-3 mb-4">
              <span className="text-xs font-mono text-emerald-500 tracking-wider">
                [0{sectionIdx + 1}]
              </span>
              <h2 className="text-xl font-mono font-bold text-white tracking-wide">
                {category.title}
              </h2>
            </div>

            {/* Section Description */}
            <p className="text-xs font-mono text-zinc-500 mb-6 italic">
              {category.description}
            </p>

            {/* Main Interactive Paragraph Formatting */}
            <div className="text-zinc-300 space-y-4 leading-relaxed text-sm font-sans">
              {category.content.split('\n').map((paragraph, idx) => {
                
                // Rule: If it starts with an itemized point, apply matching green accent bullets
                if (paragraph.startsWith('•')) {
                  return (
                    <div key={idx} className="flex items-center gap-3 pl-2 py-1 text-zinc-300 font-sans">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
                      <span>{paragraph.replace('• ', '')}</span>
                    </div>
                  );
                }

                // Rule: For functional terminal commands, style them cleanly inside code blocks
                if (paragraph.includes('git clone') || paragraph.includes('npm install') || paragraph.includes('npm run')) {
                  const uniqueKey = sectionIdx * 100 + idx;
                  return (
                    <div key={idx} className="bg-black rounded-lg p-4 border border-zinc-900 font-mono text-xs text-emerald-400 flex justify-between items-center group shadow-inner my-3">
                      <code className="break-all">{paragraph}</code>
                      <button 
                        onClick={() => handleCopy(paragraph, uniqueKey)}
                        className="text-xs bg-zinc-900 text-zinc-400 hover:text-emerald-400 hover:border-emerald-500 px-2.5 py-1 rounded border border-zinc-800 transition-all font-mono"
                      >
                        {copiedIndex === uniqueKey ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                  );
                }

                // Rule: Regular prose fallback blocks
                return <p key={idx} className="whitespace-pre-line">{paragraph}</p>;
              })}
            </div>
          </section>
        ))}

        {/* 🟢 ARCHITECTURE FOOTNOTE CALLOUT BOX */}
        <footer className="p-4 bg-zinc-950 border border-zinc-900 rounded-lg flex gap-3 items-start max-w-4xl mx-auto">
          <div className="font-sans text-xs text-zinc-500 leading-relaxed">
            <span className="font-mono text-emerald-400 font-semibold mr-1">Note:</span> 
            To view detailed validation testing rules across specific modules, examine the corresponding framework definitions within your local <code className="text-zinc-300 font-mono">tests/unit/</code> structures.
          </div>
        </footer>

      </main>
    </div>
  );
}