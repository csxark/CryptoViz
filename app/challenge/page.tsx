"use client";

import Breadcrumbs from '../../components/layout/Breadcrumbs'
import WorkspaceLayout from "../../components/layout/WorkspaceLayout";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import ChallengeMode from "../../components/challenge/ChallengeMode";
import DailyQuiz from "../../components/challenge/DailyQuiz";
import QuestionBankQuiz from "../../components/challenge/QuestionBankQuiz"
import CustomChallengeBuilder from "../../components/challenge/CustomChallengeBuilder"
import { deserializeCustomChallengeSet, type CustomChallengeSet } from '@/lib/challenge/customChallengeSerializer';

function ChallengeContent() {
  const searchParams = useSearchParams();
  const urlCipher = searchParams.get('cipher');
  const [activeTab, setActiveTab] = useState<'daily' | 'bank' | 'decryption'>(searchParams.get('custom') ? 'decryption' : 'daily');
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [customChallenge, setCustomChallenge] = useState<CustomChallengeSet | null>(null);
  const [customError, setCustomError] = useState('');

  useEffect(() => {
    const encoded = searchParams.get('custom');
    if (!encoded) return;
    void deserializeCustomChallengeSet(encoded)
      .then(setCustomChallenge)
      .catch((error) => setCustomError(error instanceof Error ? error.message : 'Invalid custom challenge link.'));
  }, [searchParams]);

  return (
    <WorkspaceLayout activeCipherId={urlCipher || undefined}>
      <main className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-12">
        <Breadcrumbs items={[{ label: "Practice" }, { label: "Guided Challenge & Question Bank" }]} />
        
        {/* Background accent */}
        <div className="pointer-events-none absolute inset-0 -z-20 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] dark:bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)]" />

        {/* Hero & Guided Onboarding Header */}
        <div className="text-center flex flex-col items-center mb-8">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-teal-500/30 bg-teal-50/80 px-3.5 py-1 text-xs font-bold uppercase tracking-widest text-teal-800 dark:border-teal-500/30 dark:bg-teal-500/20 dark:text-teal-300">
            ★ Recommended Learning Path
          </div>
          <h1 className="flex items-center justify-center gap-3 text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white sm:text-4xl">
            Guided Practice & Challenge Hub
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
            Master cryptography through structured daily micro-quizzes, comprehensive topic question banks, timed interactive cipher decryption, or custom shareable challenges.
          </p>
        </div>

        {/* Onboarding Guide Box */}
        {showOnboarding && (
          <div className="mb-8 rounded-2xl border border-teal-500/30 bg-teal-50/40 p-6 backdrop-blur-sm dark:border-teal-500/20 dark:bg-teal-950/30">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500/20 text-teal-600 dark:text-teal-400 font-bold text-lg">
                  1
                </div>
                <div>
                  <h2 className="text-base font-bold text-zinc-900 dark:text-white">How Guided Practice Works</h2>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400">Follow our 3-step practice flow to build steady cryptography skills.</p>
                </div>
              </div>
              <button
                onClick={() => setShowOnboarding(false)}
                className="text-xs font-semibold text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-white"
              >
                Dismiss Guide ✕
              </button>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <div className={`rounded-xl border p-4 transition-all ${activeTab === 'daily' ? 'border-teal-500 bg-white shadow-md dark:bg-zinc-900' : 'border-zinc-200 bg-white/50 dark:border-zinc-800 dark:bg-zinc-900/40'}`}>
                <span className="text-xs font-bold text-teal-600 dark:text-teal-400">Step 1 • Daily Recommended</span>
                <h3 className="mt-1 text-sm font-bold text-zinc-900 dark:text-white">Daily Micro-Quiz</h3>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">5 fast daily questions to maintain streak and gain base XP.</p>
              </div>

              <div className={`rounded-xl border p-4 transition-all ${activeTab === 'bank' ? 'border-teal-500 bg-white shadow-md dark:bg-zinc-900' : 'border-zinc-200 bg-white/50 dark:border-zinc-800 dark:bg-zinc-900/40'}`}>
                <span className="text-xs font-bold text-teal-600 dark:text-teal-400">Step 2 • Guided Mastery</span>
                <h3 className="mt-1 text-sm font-bold text-zinc-900 dark:text-white">Topic Question Bank</h3>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Explore 300+ categorized questions across symmetric, asymmetric, and hash primitives.</p>
              </div>

              <div className={`rounded-xl border p-4 transition-all ${activeTab === 'decryption' ? 'border-teal-500 bg-white shadow-md dark:bg-zinc-900' : 'border-zinc-200 bg-white/50 dark:border-zinc-800 dark:bg-zinc-900/40'}`}>
                <span className="text-xs font-bold text-teal-600 dark:text-teal-400">Step 3 • Advanced Lab</span>
                <h3 className="mt-1 text-sm font-bold text-zinc-900 dark:text-white">Interactive Decryption</h3>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Test live decryption against the clock with dynamic hint reveals.</p>
              </div>
            </div>
          </div>
        )}

        {/* Guided Navigation Tabs */}
        <div className="mb-8 flex flex-wrap items-center justify-center gap-3 border-b border-zinc-200 pb-4 dark:border-zinc-800">
          <button
            onClick={() => setActiveTab('daily')}
            className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition-all ${
              activeTab === 'daily'
                ? 'bg-teal-500 text-white shadow-lg shadow-teal-500/25'
                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800'
            }`}
          >
            🎯 Recommended: Daily Quiz
          </button>
          <button
            onClick={() => setActiveTab('bank')}
            className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition-all ${
              activeTab === 'bank'
                ? 'bg-teal-500 text-white shadow-lg shadow-teal-500/25'
                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800'
            }`}
          >
            📚 Question Bank (300+ Qs)
          </button>
          <button
            onClick={() => setActiveTab('decryption')}
            className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition-all ${
              activeTab === 'decryption'
                ? 'bg-teal-500 text-white shadow-lg shadow-teal-500/25'
                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800'
            }`}
          >
            ⚡ Advanced: Timed Decryption
          </button>
        </div>

        {customError && (
          <div role="alert" className="mb-6 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
            Could not open this custom challenge: {customError}
          </div>
        )}

        {activeTab === 'decryption' && !customChallenge && (
          <div className="mb-6">
            <CustomChallengeBuilder onCreated={(serialized) => {
              const url = new URL(window.location.href);
              url.searchParams.set('custom', serialized);
              window.history.replaceState({}, '', url.toString());
              void deserializeCustomChallengeSet(serialized).then(setCustomChallenge);
            }} />
          </div>
        )}

        {/* Active Flow Content */}
        {activeTab === 'daily' && (
          <div>
            <DailyQuiz />
          </div>
        )}

        {activeTab === 'bank' && (
          <div>
            <QuestionBankQuiz />
          </div>
        )}

        {activeTab === 'decryption' && (
          <div>
            <ChallengeMode customChallenge={customChallenge} />
          </div>
        )}
      </main>
    </WorkspaceLayout>
  );
}


export default function ChallengePage() {
  return (
    <Suspense fallback={<div className="p-8">Loading challenge workspace...</div>}>
      <ChallengeContent />
    </Suspense>
  )
}