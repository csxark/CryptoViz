"use client";

import Breadcrumbs from "../../components/layout/Breadcrumbs";
import WorkspaceLayout from "../../components/layout/WorkspaceLayout";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import ChallengeMode from "../../components/challenge/ChallengeMode";
import DailyQuiz from "../../components/challenge/DailyQuiz";
import QuestionBankQuiz from "../../components/challenge/QuestionBankQuiz";
import CustomChallengeBuilder from "../../components/challenge/CustomChallengeBuilder";
import {
  deserializeCustomChallengeSet, type CustomChallengeSet } from "@/lib/challenge/customChallengeSerializer";
import { QUESTION_BANK } from "@/lib/challenge/questionBank";

type ChallengeTab = "daily" | "bank" | "decryption";

function ChallengeContent() {
  const searchParams = useSearchParams();
  const urlCipher = searchParams.get("cipher");
  const customChallengeParam = searchParams.get("custom");
  const [activeTab, setActiveTab] = useState<ChallengeTab>(
    customChallengeParam ? "decryption" : "daily",);
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [customChallenge, setCustomChallenge] = useState<CustomChallengeSet | null>(null);
  const [customError, setCustomError] = useState("");

  useEffect(() => {
    if (!customChallengeParam) {
      setCustomChallenge(null);
      setCustomError("");
      return;
    }

    let cancelled = false;

    void deserializeCustomChallengeSet(customChallengeParam)
      .then((challenge) => {
        if (cancelled) return;

        setCustomChallenge(challenge);
        setCustomError("");
        setActiveTab("decryption");
      })
      .catch((error: unknown) => {
        if (cancelled) return;

        setCustomChallenge(null);
        setCustomError(
          error instanceof Error
            ? error.message
            : "Invalid custom challenge link.",
        );
      });

    return () => {
      cancelled = true;
    };
  }, [customChallengeParam]);

  const questionCount = QUESTION_BANK.length;

  const handleCustomChallengeCreated = (serialized: string) => {
    const url = new URL(window.location.href);

    url.searchParams.set("custom", serialized);

    window.history.replaceState({}, "", url.toString());

    void deserializeCustomChallengeSet(serialized)
      .then((challenge) => {
        setCustomChallenge(challenge);
        setCustomError("");
        setActiveTab("decryption");
      })
      .catch((error: unknown) => {
        setCustomChallenge(null);
        setCustomError(
          error instanceof Error
            ? error.message
            : "Invalid custom challenge link.",
        );
      });
  };

  return (
    <WorkspaceLayout activeCipherId={urlCipher || undefined}>
      <main className="relative mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <Breadcrumbs
          items={[
            { label: "Practice" },
            { label: "Practice Challenges" },
          ]}
        />

        {/* Background accent */}
        <div className="pointer-events-none absolute inset-0 -z-20 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] dark:bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)]" />

        {/* Practice Challenge Header */}
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-teal-500/30 bg-teal-50/80 px-3.5 py-1 text-xs font-bold uppercase tracking-widest text-teal-800 dark:border-teal-500/30 dark:bg-teal-500/20 dark:text-teal-300">
            ★ Adaptive Practice Challenges
          </div>

          <h1 className="flex items-center justify-center gap-3 text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white sm:text-4xl">
            Practice Challenge Hub
          </h1>

          <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
            Build cryptography skills through daily practice, a comprehensive
            question bank, timed decryption challenges, and custom
            shareable challenges.
          </p>
        </div>

        {/* Onboarding Guide */}
        {showOnboarding && (
          <div className="mb-8 rounded-2xl border border-teal-500/30 bg-teal-50/40 p-6 backdrop-blur-sm dark:border-teal-500/20 dark:bg-teal-950/30">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500/20 text-lg font-bold text-teal-600 dark:text-teal-400">
                  1
                </div>

                <div>
                  <h2 className="text-base font-bold text-zinc-900 dark:text-white">
                    How Practice Challenges Work
                  </h2>

                  <p className="text-xs text-zinc-600 dark:text-zinc-400">
                    Follow our three-step practice flow to build steady
                    cryptography skills.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowOnboarding(false)}
                className="text-xs font-semibold text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-white"
              >
                Dismiss Guide ✕
              </button>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {/* Daily Challenge */}
              <div
                className={`rounded-xl border p-4 transition-all ${
                  activeTab === "daily"
                    ? "border-teal-500 bg-white shadow-md dark:bg-zinc-900"
                    : "border-zinc-200 bg-white/50 dark:border-zinc-800 dark:bg-zinc-900/40"
                }`}
              >
                <span className="text-xs font-bold text-teal-600 dark:text-teal-400">
                  Step 1 • Daily Recommended
                </span>

                <h3 className="mt-1 text-sm font-bold text-zinc-900 dark:text-white">
                  Daily Practice Challenge
                </h3>

                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  Five focused questions to maintain your practice streak and
                  build foundational cryptography skills.
                </p>
              </div>

              {/* Question Bank */}
              <div
                className={`rounded-xl border p-4 transition-all ${
                  activeTab === "bank"
                    ? "border-teal-500 bg-white shadow-md dark:bg-zinc-900"
                    : "border-zinc-200 bg-white/50 dark:border-zinc-800 dark:bg-zinc-900/40"
                }`}
              >
                <span className="text-xs font-bold text-teal-600 dark:text-teal-400">
                  Step 2 • Guided Mastery
                </span>

                <h3 className="mt-1 text-sm font-bold text-zinc-900 dark:text-white">
                  Cryptographic Question Bank
                </h3>

                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  Explore {questionCount} curated multiple-choice questions
                  across classical, symmetric, asymmetric, hash, and attack
                  categories.
                </p>
              </div>

              {/* Timed Decryption */}
              <div
                className={`rounded-xl border p-4 transition-all ${
                  activeTab === "decryption"
                    ? "border-teal-500 bg-white shadow-md dark:bg-zinc-900"
                    : "border-zinc-200 bg-white/50 dark:border-zinc-800 dark:bg-zinc-900/40"
                }`}
              >
                <span className="text-xs font-bold text-teal-600 dark:text-teal-400">
                  Step 3 • Advanced Lab
                </span>

                <h3 className="mt-1 text-sm font-bold text-zinc-900 dark:text-white">
                  Decryption Time Attack
                </h3>

                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  Test your decryption skills against the clock with dynamic
                  hints and challenge scenarios.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Practice Challenge Navigation */}
        <div
          className="mb-8 flex flex-wrap items-center justify-center gap-3 border-b border-zinc-200 pb-4 dark:border-zinc-800"
          role="tablist"
          aria-label="Practice challenge types"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "daily"}
            onClick={() => setActiveTab("daily")}
            className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition-all ${
              activeTab === "daily"
                ? "bg-teal-500 text-white shadow-lg shadow-teal-500/25"
                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800"
            }`}
          >
            🎯 Daily Challenge
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "bank"}
            onClick={() => setActiveTab("bank")}
            className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition-all ${
              activeTab === "bank"
                ? "bg-teal-500 text-white shadow-lg shadow-teal-500/25"
                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800"
            }`}
          >
            📚 Comprehensive Question Bank
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "decryption"}
            onClick={() => setActiveTab("decryption")}
            className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition-all ${
              activeTab === "decryption"
                ? "bg-teal-500 text-white shadow-lg shadow-teal-500/25"
                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800"
            }`}
          >
            ⚡ Timed Decryption Challenge
          </button>
        </div>

        {/* Custom Challenge Error */}
        {customError && (
          <div
            role="alert"
            className="mb-6 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300"
          >
            Could not open this custom challenge: {customError}
          </div>
        )}

        {/* Custom Challenge Builder */}
        {activeTab === "decryption" && !customChallenge && (
          <div className="mb-6">
            <CustomChallengeBuilder
              onCreated={handleCustomChallengeCreated}
            />
          </div>
        )}

        {/* Active Practice Challenge */}
        {activeTab === "daily" && (
          <div>
            <DailyQuiz />
          </div>
        )}

        {activeTab === "bank" && (
          <div>
            <QuestionBankQuiz />
          </div>
        )}

        {activeTab === "decryption" && (
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
    <Suspense
      fallback={
        <div className="p-8">Loading practice challenge workspace...</div>
      }
    >
      <ChallengeContent />
    </Suspense>
  );
}