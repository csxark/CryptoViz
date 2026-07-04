"use client";

import React, { useState } from 'react';
import { docCategories, DocCategory } from './data';

export default function DocumentationPage() {
  // Sets the default starting section to the first item (Getting Started)
  const [activeSection, setActiveSection] = useState<DocCategory>(docCategories[0]);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopy = (text: string, index: number) => {
    // Sanitizes step numbers out of terminal code strings
    const cleanText = text.replace(/^\d+\.\s*/, '');
    navigator.clipboard.writeText(cleanText);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-cyan-500 selection:text-slate-950">
      
      {/* 📚 HERO SECTION */}
      <header className="relative bg-gradient-to-b from-slate-900 to-slate-950 py-16 px-6 text-center border-b border-slate-900">
        <div className="max-w-3xl mx-auto">
          <span className="inline-block text-xs font-semibold tracking-wider uppercase text-cyan-400 bg-cyan-400/10 px-3 py-1 rounded-full mb-4">
            Docs & Architecture
          </span>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent mb-4">
            CryptoViz Documentation
          </h1>
          <p className="text-base md:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Your comprehensive resource center for running, testing, understanding, and expanding the visual cryptographic framework.
          </p>
        </div>
      </header>

      {/* 🧭 LAYOUT STRATEGY */}
      <main className="max-w-7xl mx-auto px-4 md:px-8 py-12 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT ELEMENT: CATEGORY NAV CARDS */}
        <section className="lg:col-span-1 space-y-4">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-2 mb-2">
            Categories
          </h2>
          <div className="space-y-3">
            {docCategories.map((category) => {
              const isSelected = activeSection.title === category.title;
              return (
                <button
                  key={category.title}
                  onClick={() => setActiveSection(category)}
                  className={`w-full text-left p-4 rounded-xl border transition-all duration-200 group relative overflow-hidden ${
                    isSelected
                      ? 'bg-slate-900 border-cyan-500 shadow-lg shadow-cyan-500/5'
                      : 'bg-slate-900/40 border-slate-900 hover:bg-slate-900/80 hover:border-slate-800'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <span className="text-2xl mt-1 p-2 bg-slate-950/60 rounded-lg group-hover:scale-110 transition-transform duration-200">
                      {category.icon}
                    </span>
                    <div className="flex-1">
                      <h3 className={`font-semibold text-sm md:text-base ${isSelected ? 'text-cyan-400' : 'text-slate-200'}`}>
                        {category.title}
                      </h3>
                      <p className="text-xs text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                        {category.description}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* RIGHT ELEMENT: INTERACTIVE DYNAMIC CONTENT PANEL */}
        <section className="lg:col-span-2 bg-slate-900/30 border border-slate-900 rounded-2xl p-6 md:p-8 min-h-[450px] backdrop-blur-sm">
          <div className="flex items-center gap-3 border-b border-slate-900 pb-4 mb-6">
            <span className="text-3xl">{activeSection.icon}</span>
            <h2 className="text-2xl font-bold text-white">{activeSection.title}</h2>
          </div>

          <div className="text-slate-300 space-y-6 leading-relaxed text-sm md:text-base">
            {activeSection.content.split('\n').map((paragraph, idx) => {
              
              // Custom rendering rule for bullet points
              if (paragraph.startsWith('•')) {
                return (
                  <div key={idx} className="flex items-center gap-3 pl-2 py-1 text-slate-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 flex-shrink-0" />
                    <span>{paragraph.replace('• ', '')}</span>
                  </div>
                );
              }

              // Custom rendering rule for terminal script blocks
              if (paragraph.includes('git clone') || paragraph.includes('npm install') || paragraph.includes('npm run')) {
                return (
                  <div key={idx} className="bg-slate-950 rounded-xl p-4 border border-slate-900 font-mono text-xs md:text-sm text-cyan-400 flex justify-between items-center group/code shadow-inner my-2">
                    <code className="break-all">{paragraph}</code>
                    <button 
                      onClick={() => handleCopy(paragraph, idx)}
                      className="text-xs bg-slate-900 text-slate-400 hover:text-white px-2.5 py-1 rounded-md border border-slate-800 transition-all cursor-pointer"
                    >
                      {copiedIndex === idx ? 'Copied! ✓' : 'Copy'}
                    </button>
                  </div>
                );
              }

              // Normal text presentation block
              return <p key={idx} className="whitespace-pre-line">{paragraph}</p>;
            })}
          </div>

          {/* 💡 USER HELPER CALLOUT INFO BOX */}
          <div className="mt-8 p-4 bg-cyan-500/5 border border-cyan-500/10 rounded-xl flex gap-3 items-start">
            <span className="text-cyan-400 text-lg mt-0.5">💡</span>
            <div>
              <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-wider mb-1">Onboarding Tip</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Want to look closer into unit implementations? Browse through your project directory structure under the <code className="text-slate-300">tests/unit/</code> subfolders to analyze precise code validation methods.
              </p>
            </div>
          </div>
        </section>

      </main>
    </div>
  );
}