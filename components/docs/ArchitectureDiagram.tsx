"use client";

import React, { useState } from "react";

interface FlowStep {
  id: string;
  title: string;
  description: string;
  activeTarget: "main" | "worker" | "crypto";
}

const STEPS: FlowStep[] = [
  {
    id: "step-1",
    title: "1. UI Event Trigger",
    description: "User initiates an encrypt/decrypt or benchmark action. The React UI collects inputs and dispatches a task via `useCipherWorker` hook.",
    activeTarget: "main",
  },
  {
    id: "step-2",
    title: "2. Worker Message Dispatch",
    description: "The main thread posts a structured message to the dedicated Web Worker, preventing main thread freezing during intensive computations.",
    activeTarget: "worker",
  },
  {
    id: "step-3",
    title: "3. Hardware Acceleration Check",
    description: "The worker checks if native `window.crypto.subtle` (WebCrypto API) supports the primitive. If supported, hardware-accelerated C++ primitives are invoked.",
    activeTarget: "crypto",
  },
  {
    id: "step-4",
    title: "4. Result Postback & State Update",
    description: "Execution metrics, step breakdown, and ciphertexts are posted back to the main thread, updating React state and benchmark charts.",
    activeTarget: "main",
  },
];

export const ArchitectureDiagram: React.FC = () => {
  const [activeStep, setActiveStep] = useState<number>(0);

  const step = STEPS[activeStep];

  return (
    <div className="flex flex-col gap-6 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
        <div>
          <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
            Interactive Architecture & Data Flow
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Click through execution steps to visualize thread isolation and WebCrypto hardware acceleration.
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          {STEPS.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setActiveStep(idx)}
              className={`w-3 h-3 rounded-full transition-all ${
                activeStep === idx
                  ? "bg-teal-600 scale-125"
                  : "bg-zinc-300 dark:bg-zinc-700 hover:bg-zinc-400"
              }`}
              aria-label={`Go to step ${idx + 1}`}
            />
          ))}
        </div>
      </div>

      {/* Visual Pipeline Nodes */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-2">
        {/* Node 1: Main Thread */}
        <div
          className={`p-4 rounded-xl border transition-all ${
            step.activeTarget === "main"
              ? "border-teal-500 bg-teal-50/50 dark:bg-teal-950/30 ring-2 ring-teal-500/20"
              : "border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/50 opacity-70"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400">
              Main Thread
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-mono">
              React UI / DOM
            </span>
          </div>
          <p className="text-xs text-zinc-600 dark:text-zinc-400">
            Manages UI state, chart visualizations, user inputs, and worker hook lifecycle.
          </p>
        </div>

        {/* Node 2: Web Worker */}
        <div
          className={`p-4 rounded-xl border transition-all ${
            step.activeTarget === "worker"
              ? "border-teal-500 bg-teal-50/50 dark:bg-teal-950/30 ring-2 ring-teal-500/20"
              : "border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/50 opacity-70"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400">
              Web Worker
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-mono">
              Background Thread
            </span>
          </div>
          <p className="text-xs text-zinc-600 dark:text-zinc-400">
            Offloads non-blocking JS cipher execution, classical ciphers, and memory management.
          </p>
        </div>

        {/* Node 3: WebCrypto API */}
        <div
          className={`p-4 rounded-xl border transition-all ${
            step.activeTarget === "crypto"
              ? "border-teal-500 bg-teal-50/50 dark:bg-teal-950/30 ring-2 ring-teal-500/20"
              : "border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/50 opacity-70"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400">
              WebCrypto API
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-mono">
              Browser Native (SubtleCrypto)
            </span>
          </div>
          <p className="text-xs text-zinc-600 dark:text-zinc-400">
            Hardware-accelerated AES, SHA-256, RSA/ECC operations provided natively by OS/browser.
          </p>
        </div>
      </div>

      {/* Step Detail Explanation Box */}
      <div className="p-4 rounded-xl bg-zinc-100 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h4 className="text-sm font-semibold text-zinc-900 dark:text-white">
            {step.title}
          </h4>
          <p className="text-xs text-zinc-600 dark:text-zinc-300 mt-1 max-w-2xl">
            {step.description}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setActiveStep((prev) => Math.max(0, prev - 1))}
            disabled={activeStep === 0}
            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 disabled:opacity-40"
          >
            Previous
          </button>
          <button
            onClick={() => setActiveStep((prev) => Math.min(STEPS.length - 1, prev + 1))}
            disabled={activeStep === STEPS.length - 1}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-teal-600 hover:bg-teal-500 text-white disabled:opacity-40"
          >
            Next Step
          </button>
        </div>
      </div>
    </div>
  );
};