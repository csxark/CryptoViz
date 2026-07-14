"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { CipherDefinition } from "../../lib/cipher/registry";
import type { CipherResult } from "../../lib/cipher/types";
import { useCipherWorker } from "../../lib/hooks/useCipherWorker";
import type { AnimationSpeed } from "./StepAnimator";
import WorkspacePresetManager from "./WorkspacePresetManager";
import type { WorkspacePreset } from "../../lib/utils/workspacePresets";
import {
  buildVisualizerPermalink,
  clampStepIndex,
  parseVisualizerPermalink,
  updateStepInCurrentUrl,
} from "../../lib/utils/visualizerPermalink";
import TraceTransferControls from "./TraceTransferControls";
import {
  traceToCipherResult,
  type CipherTraceFile,
} from "../../lib/utils/cipherTrace";

const StepAnimator = dynamic(() => import("./StepAnimator"), { ssr: false });
const PlayfairGrid = dynamic(() => import("./PlayfairGrid"), { ssr: false });
const RailFenceViz = dynamic(() => import("./RailFenceViz"), { ssr: false });
const DHVisualizer = dynamic(() => import("./DHVisualizer"), { ssr: false });

interface CipherLayoutProps {
  cipher: CipherDefinition;
}

interface HistoryEntry {
  id: string;
  input: string;
  key: string;
  action: "encrypt" | "decrypt";
  output: string;
  timestamp: string;
}

const getHistoryStorageKey = (cipherId: string) =>
  `cryptoviz-history-${cipherId}`;

const isValidHistoryEntry = (entry: unknown): entry is HistoryEntry => {
  return (
    typeof entry === "object" &&
    entry !== null &&
    "id" in entry &&
    "input" in entry &&
    "key" in entry &&
    "action" in entry &&
    "output" in entry &&
    "timestamp" in entry
  );
};

const isValidHistoryArray = (data: unknown): data is HistoryEntry[] => {
  return Array.isArray(data) && data.every(isValidHistoryEntry);
};

export default function CipherLayout({ cipher }: CipherLayoutProps) {
  const { runCipher, loading, error: workerError } = useCipherWorker();
  const abortControllerRef = useRef<AbortController | null>(null);
  const pendingSharedStepRef = useRef<number | null>(null);

  const [input, setInput] = useState(cipher.defaultInput);
  const [key, setKey] = useState(cipher.defaultKey);
  const [action, setAction] = useState<"encrypt" | "decrypt">("encrypt");
  const [autoCompute, setAutoCompute] = useState(true);

  // Custom options states
  const [hexInput, setHexInput] = useState(true);
  const [rounds, setRounds] = useState(4);
  const [demoMode, setDemoMode] = useState(true);
  const [bobSecret, setBobSecret] = useState("15");

  const [result, setResult] = useState<CipherResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [animationSpeed, setAnimationSpeed] = useState<AnimationSpeed>(1);
  const [activeTab, setActiveTab] = useState<"result" | "history">("result");
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  // Restore a shared visualizer configuration from the URL.
  useEffect(() => {
    const shared = parseVisualizerPermalink(window.location.search);

    if (shared.input !== undefined) setInput(shared.input);
    if (shared.key !== undefined) setKey(shared.key);
    if (shared.direction !== undefined && cipher.id !== "dh") {
      setAction(shared.direction);
    }
    if (shared.options.hexInput !== undefined) {
      setHexInput(shared.options.hexInput);
    }
    if (shared.options.rounds !== undefined) {
      setRounds(shared.options.rounds);
    }
    if (shared.options.demoMode !== undefined) {
      setDemoMode(shared.options.demoMode);
    }
    if (shared.options.bobSecret !== undefined) {
      setBobSecret(shared.options.bobSecret);
    }

    pendingSharedStepRef.current = shared.step ?? null;
  }, [cipher.id]);

  // Reset inputs when cipher changes
  useEffect(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const shared = parseVisualizerPermalink(window.location.search);
    setInput(shared.input ?? cipher.defaultInput);
    setKey(shared.key ?? cipher.defaultKey);
    setResult(null);
    setError(null);
    setCurrentStep(0);
    setAnimationSpeed(1);
    setActiveTab("result");

    try {
      const stored = window.localStorage.getItem(
        getHistoryStorageKey(cipher.id),
      );
      if (stored) {
        const parsed = JSON.parse(stored);
        if (isValidHistoryArray(parsed)) {
          setHistory(parsed);
        } else {
          setHistory([]);
        }
      } else {
        setHistory([]);
      }
    } catch {
      setHistory([]);
    }

    // Reset option defaults
    if (cipher.options) {
      cipher.options.forEach((opt) => {
        if (opt.id === "hexInput" && shared.options.hexInput === undefined)
          setHexInput(opt.default);
        if (opt.id === "rounds" && shared.options.rounds === undefined)
          setRounds(opt.default);
        if (opt.id === "demoMode" && shared.options.demoMode === undefined)
          setDemoMode(opt.default);
        if (opt.id === "bobSecret" && shared.options.bobSecret === undefined)
          setBobSecret(opt.default);
      });
    }

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [cipher]);

  const workspaceOptions: Record<string, unknown> = {
    hexInput,
    rounds,
    demoMode,
    bobSecret,
  };

  const handlePresetLoad = (preset: WorkspacePreset) => {
    if (preset.cipherId !== cipher.id) {
      setError("This preset belongs to a different cipher.");
      return;
    }

    setAutoCompute(false);
    setAction(cipher.id === "dh" ? "encrypt" : preset.direction);
    setInput(preset.input);

    if (preset.key !== undefined) {
      setKey(preset.key);
    }

    if (typeof preset.options.hexInput === "boolean") {
      setHexInput(preset.options.hexInput);
    }
    if (typeof preset.options.rounds === "number") {
      setRounds(preset.options.rounds);
    }
    if (typeof preset.options.demoMode === "boolean") {
      setDemoMode(preset.options.demoMode);
    }
    if (typeof preset.options.bobSecret === "string") {
      setBobSecret(preset.options.bobSecret);
    }

    setAnimationSpeed(preset.animationSpeed);
    setResult(null);
    setCurrentStep(0);
    setActiveTab("result");
    setError(null);
  };

  const handleRun = async () => {
    const cleanUrl = updateStepInCurrentUrl(window.location.href, null);
    window.history.replaceState(window.history.state, "", cleanUrl);
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setError(null);
    try {
      // Gather options
      const options: any = {
        instrument: true, // Always request instrumented steps for visualizer
        signal: controller.signal,
      };

      if (cipher.id === "des" || cipher.id === "3des" || cipher.id === "aes") {
        options.hexInput = hexInput;
      }
      if (cipher.id === "bcrypt") {
        options.rounds = rounds;
      }
      if (cipher.id === "rsa") {
        options.mode = demoMode ? "demo" : "real";
      }
      if (cipher.id === "dh") {
        options.mode = "demo"; // Always demo for paint mixing
        options.bobSecret = bobSecret;
      }

      // DH does not support decrypt
      const currentAction = cipher.id === "dh" ? "encrypt" : action;

      const res = await runCipher(
        currentAction,
        cipher.id,
        input,
        key,
        options,
      );

      if (!controller.signal.aborted) {
        setResult(res);
        const restoredStep = pendingSharedStepRef.current;
        setCurrentStep(
          restoredStep === null
            ? 0
            : clampStepIndex(restoredStep, res.steps?.length ?? 0),
        );
        pendingSharedStepRef.current = null;

        if (res?.output !== undefined) {
          const entry: HistoryEntry = {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            input,
            key,
            action: currentAction,
            output: String(res.output),
            timestamp: new Date().toLocaleString(),
          };

          setHistory((prev) => {
            const next = [entry, ...prev].slice(0, 5);
            if (typeof window !== "undefined") {
              try {
                window.localStorage.setItem(
                  getHistoryStorageKey(cipher.id),
                  JSON.stringify(next),
                );
              } catch (e) {
                // Silently fail if localStorage is unavailable (quota exceeded, disabled, private mode, etc.)
                console.warn("Failed to save history:", e);
              }
            }
            return next;
          });
        }
      }
    } catch (err: any) {
      if (err.name === "AbortError") {
        return;
      }
      setError(err.message || "An error occurred during calculation.");
      setResult(null);
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
    }
  };

  const handleTraceImport = (trace: CipherTraceFile) => {
    // Loading a trace only updates local UI state. It does not call runCipher().
    setAutoCompute(false);
    setInput(trace.input);
    setKey(trace.key);
    setAction(trace.direction);

    if (typeof trace.options.hexInput === "boolean") {
      setHexInput(trace.options.hexInput);
    }
    if (typeof trace.options.rounds === "number") {
      setRounds(trace.options.rounds);
    }
    if (typeof trace.options.demoMode === "boolean") {
      setDemoMode(trace.options.demoMode);
    }
    if (typeof trace.options.bobSecret === "string") {
      setBobSecret(trace.options.bobSecret);
    }

    const importedResult = traceToCipherResult(trace);
    setResult(importedResult);
    const restoredStep = pendingSharedStepRef.current;
    setCurrentStep(
      restoredStep === null
        ? 0
        : clampStepIndex(restoredStep, importedResult.steps?.length ?? 0),
    );
    pendingSharedStepRef.current = null;
    setActiveTab("result");
    setError(null);
  };

  // Auto-run with debounce when computation inputs change
  useEffect(() => {
    if (!autoCompute) return;

    const debounceId = setTimeout(() => {
      void handleRun();
    }, 450);

    return () => clearTimeout(debounceId);
  }, [
    autoCompute,
    cipher,
    input,
    key,
    action,
    hexInput,
    rounds,
    demoMode,
    bobSecret,
  ]);

  // Helper for status badge styling
  const getStatusBadge = (status: "secure" | "deprecated" | "broken") => {
    switch (status) {
      case "secure":
        return "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900";
      case "deprecated":
        return "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 border-amber-200 dark:border-amber-900";
      case "broken":
        return "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400 border-red-200 dark:border-red-900";
    }
  };

  // Specific visualizer rendering based on current step
  const renderSpecificVisualizer = () => {
    if (!result || result.steps.length === 0) return null;

    const step = result.steps[currentStep];

    if (cipher.id === "playfair" && step.matrix) {
      return <PlayfairGrid matrix={step.matrix} highlights={step.highlight} />;
    }

    if (cipher.id === "railfence" && step.matrix) {
      return <RailFenceViz matrix={step.matrix} highlight={step.highlight} />;
    }

    if (cipher.id === "dh") {
      return <DHVisualizer currentStep={currentStep} />;
    }

    return null;
  };

  const handleStepChange = (nextStep: number) => {
    const safeStep = clampStepIndex(nextStep, result?.steps?.length ?? 0);
    setCurrentStep(safeStep);

    if (result?.steps?.length) {
      const nextUrl = updateStepInCurrentUrl(window.location.href, safeStep);
      window.history.replaceState(window.history.state, "", nextUrl);
    }
  };

  const handleCopyStepLink = async () => {
    const permalink = buildVisualizerPermalink(window.location.href, {
      input,
      key,
      direction: cipher.id === "dh" ? "encrypt" : action,
      step: currentStep,
      options: {
        hexInput,
        rounds,
        demoMode,
        bobSecret,
      },
    });

    await navigator.clipboard.writeText(permalink);
  };

  const traceOptions: Record<string, unknown> = {
    hexInput,
    rounds,
    demoMode,
    bobSecret,
  };

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 lg:p-8 max-w-5xl mx-auto">
      {/* Title & Metadata Card */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-200 pb-5 dark:border-zinc-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-950 dark:text-white sm:text-3xl">
            {cipher.name}
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400 max-w-2xl">
            {cipher.description}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider ${getStatusBadge(
              cipher.securityStatus,
            )}`}
          >
            {cipher.securityStatus}
          </span>
          <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-0.5 text-xs font-medium text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
            {cipher.category}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Controls Column (Left) */}
        <div className="flex flex-col gap-4 lg:col-span-5">
          {/* Action toggle (Encrypt / Decrypt) */}
          {cipher.category !== "hash" && cipher.id !== "dh" && (
            <div className="flex rounded-lg bg-zinc-100 p-0.5 dark:bg-zinc-800/80">
              <button
                onClick={() => setAction("encrypt")}
                className={`flex-1 rounded-md py-1.5 text-center text-xs font-semibold transition-all duration-200 active:scale-95 ${
                  action === "encrypt"
                    ? "bg-white text-zinc-950 shadow dark:bg-zinc-900 dark:text-white"
                    : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                }`}
              >
                Encrypt / Sign
              </button>
              <button
                onClick={() => setAction("decrypt")}
                className={`flex-1 rounded-md py-1.5 text-center text-xs font-semibold transition-all duration-200 active:scale-95 ${
                  action === "decrypt"
                    ? "bg-white text-zinc-950 shadow dark:bg-zinc-900 dark:text-white"
                    : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                }`}
              >
                Decrypt / Verify
              </button>
            </div>
          )}

          {/* Inputs Section */}
          <div className="flex flex-col gap-3.5 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
            {/* Input message */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                {cipher.id === "ecc" && action === "decrypt"
                  ? "Original Message (to verify)"
                  : "Plaintext / Input Message"}
              </label>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="min-h-[90px] w-full rounded-lg border border-zinc-200 bg-zinc-50/50 p-2.5 font-mono text-sm leading-relaxed text-zinc-900 outline-none transition-all focus:border-teal-500 focus:bg-white dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-zinc-100 dark:focus:border-teal-400 dark:focus:bg-zinc-950"
                placeholder="Enter input here..."
              />
            </div>

            {/* Key Field (if cipher requires key) */}
            {cipher.defaultKey !== undefined && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                  {cipher.id === "ecc"
                    ? action === "encrypt"
                      ? "Private Key (Hex)"
                      : "Signature, Public Key (comma separated)"
                    : cipher.id === "dh"
                      ? "Alice Private Secret (a) & Public Parameters (p, g)"
                      : "Cryptographic Key / Shift"}
                </label>
                <input
                  type="text"
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                  className="w-full rounded-lg border border-zinc-200 bg-zinc-50/50 p-2.5 font-mono text-sm text-zinc-900 outline-none transition-all focus:border-teal-500 focus:bg-white dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-zinc-100 dark:focus:border-teal-400 dark:focus:bg-zinc-950"
                  placeholder={cipher.keyPlaceholder || "Enter key..."}
                />
              </div>
            )}

            {/* Specific algorithm options */}
            {cipher.id === "bcrypt" && (
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                    Bcrypt Rounds (Cost Factor)
                  </label>
                  <span className="font-mono text-xs font-bold text-teal-600 dark:text-teal-400">
                    {rounds}
                  </span>
                </div>
                <input
                  type="range"
                  min="4"
                  max="12"
                  value={rounds}
                  onChange={(e) => setRounds(parseInt(e.target.value))}
                  className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-zinc-200 dark:bg-zinc-700 accent-teal-600 dark:accent-teal-400"
                />
              </div>
            )}

            {cipher.id === "dh" && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                  Bob Private Secret (b)
                </label>
                <input
                  type="text"
                  value={bobSecret}
                  onChange={(e) => setBobSecret(e.target.value)}
                  className="w-full rounded-lg border border-zinc-200 bg-zinc-50/50 p-2.5 font-mono text-sm text-zinc-900 outline-none transition-all focus:border-teal-500 focus:bg-white dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-zinc-100 dark:focus:border-teal-400"
                />
              </div>
            )}

            {cipher.id === "rsa" && (
              <div className="flex items-center justify-between border-t border-zinc-100 pt-3 dark:border-zinc-800">
                <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                  Demo Mode (Square & Multiply walkthrough)
                </span>
                <input
                  type="checkbox"
                  checked={demoMode}
                  onChange={(e) => setDemoMode(e.target.checked)}
                  className="h-4 w-4 rounded border-zinc-300 text-teal-600 focus:ring-teal-500 dark:border-zinc-700 dark:bg-zinc-800"
                />
              </div>
            )}

            {["des", "3des", "aes"].includes(cipher.id) && (
              <div className="flex items-center justify-between border-t border-zinc-100 pt-3 dark:border-zinc-800">
                <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                  Input / Key in Hex Format
                </span>
                <input
                  type="checkbox"
                  checked={hexInput}
                  onChange={(e) => setHexInput(e.target.checked)}
                  className="h-4 w-4 rounded border-zinc-300 text-teal-600 focus:ring-teal-500 dark:border-zinc-700 dark:bg-zinc-800"
                />
              </div>
            )}

            {/* Run button + Auto Compute toggle */}
            <div className="mt-2 flex items-center gap-3">
              <button
                onClick={handleRun}
                disabled={loading}
                className="h-10 flex-1 flex items-center justify-center rounded-lg bg-teal-600 text-center text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:scale-[1.01] hover:bg-teal-500 hover:shadow-md focus:outline-none disabled:opacity-50 disabled:hover:scale-100 active:scale-[0.98] dark:bg-teal-500 dark:hover:bg-teal-400"
              >
                {loading ? (
                  <span className="flex items-center gap-1.5">
                    <svg
                      className="h-4 w-4 animate-spin text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Running in Web Worker...
                  </span>
                ) : (
                  "Run Computation"
                )}
              </button>

              <label
                className={`h-10 flex items-center gap-3 rounded-lg border px-3.5 text-xs font-semibold cursor-pointer select-none transition-all duration-200 ${
                  autoCompute
                    ? "border-teal-500/30 bg-teal-50/10 text-teal-700 dark:border-teal-500/30 dark:bg-teal-950/20 dark:text-teal-400"
                    : "border-zinc-200 bg-zinc-50/30 text-zinc-500 hover:bg-zinc-50 hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900/10 dark:text-zinc-400 dark:hover:bg-zinc-900/30 dark:hover:border-zinc-700"
                }`}
              >
                <span className="tracking-wide">Auto Compute</span>
                <input
                  type="checkbox"
                  checked={autoCompute}
                  onChange={(e) => setAutoCompute(e.target.checked)}
                  className="relative h-5 w-9 cursor-pointer appearance-none rounded-full border border-zinc-300 bg-zinc-200 transition-all duration-200 before:absolute before:left-0.5 before:top-0.5 before:h-4 before:w-4 before:rounded-full before:bg-white before:shadow-sm before:transition-all before:duration-200 checked:border-teal-600 checked:bg-teal-600 checked:before:translate-x-4 dark:border-zinc-700 dark:bg-zinc-700 dark:before:bg-zinc-100 dark:checked:border-teal-500 dark:checked:bg-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
                />
              </label>
            </div>
          </div>

          <WorkspacePresetManager
            cipherId={cipher.id}
            workspace={{
              cipherId: cipher.id,
              direction: cipher.id === "dh" ? "encrypt" : action,
              input,
              key,
              options: workspaceOptions,
              animationSpeed,
            }}
            onLoad={handlePresetLoad}
          />

          {/* Errors Display */}
          {(error || workerError) && (
            <div className="rounded-xl border border-red-100 bg-red-50 p-4 dark:border-red-950/40 dark:bg-red-950/10">
              <div className="flex gap-2.5">
                <svg
                  className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <div className="flex flex-col gap-0.5">
                  <h4 className="text-xs font-bold text-red-800 dark:text-red-300">
                    Execution Error
                  </h4>
                  <p className="text-xs text-red-700 dark:text-red-400">
                    {error || workerError}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Output & Trace Column (Right) */}
        <div className="flex flex-col gap-4 lg:col-span-7">
          <div className="flex rounded-lg bg-zinc-100 p-0.5 dark:bg-zinc-800/80">
            <button
              onClick={() => setActiveTab("result")}
              className={`flex-1 rounded-md py-1.5 text-center text-xs font-semibold transition-all duration-200 active:scale-95 ${
                activeTab === "result"
                  ? "bg-white text-zinc-950 shadow dark:bg-zinc-900 dark:text-white"
                  : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
              }`}
            >
              Result
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`flex-1 rounded-md py-1.5 text-center text-xs font-semibold transition-all duration-200 active:scale-95 ${
                activeTab === "history"
                  ? "bg-white text-zinc-950 shadow dark:bg-zinc-900 dark:text-white"
                  : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
              }`}
            >
              History
            </button>
          </div>

          {activeTab === "result" ? (
            <>
              {/* Main output display */}
              <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40">
                <span className="text-2xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                  {cipher.category === "hash"
                    ? "Generated Hash Digest"
                    : "Output Result"}
                </span>
                <div className="mt-2 min-h-[48px] rounded-lg bg-zinc-50 p-3 font-mono text-sm leading-relaxed break-all text-zinc-800 dark:bg-zinc-950/40 dark:text-zinc-200">
                  {loading ? (
                    <span className="flex items-center gap-1.5 text-zinc-400">
                      <span className="h-1.5 w-1.5 animate-ping rounded-full bg-teal-500" />
                      Computing...
                    </span>
                  ) : result ? (
                    result.output
                  ) : (
                    <span className="italic text-zinc-400">No output</span>
                  )}
                </div>

                {result && result.durationMs !== undefined && (
                  <div className="mt-3 flex items-center justify-between border-t border-zinc-100 pt-3 text-xs text-zinc-400 dark:border-zinc-800 dark:text-zinc-500">
                    <span>Off-thread Execution time</span>
                    <span className="font-mono">
                      {result.durationMs.toFixed(2)} ms
                    </span>
                  </div>
                )}
              </div>

              <TraceTransferControls
                cipherId={cipher.id}
                direction={cipher.id === "dh" ? "encrypt" : action}
                input={input}
                cipherKey={key}
                options={traceOptions}
                result={result}
                onImport={handleTraceImport}
              />

              {/* Custom Visualizer rendering (like grids, paint mixer, etc.) */}
              {renderSpecificVisualizer()}

              {/* Interactive Walkthrough Trace */}
              {result && result.steps && result.steps.length > 0 && (
                <div className="flex flex-col gap-2">
                  <span className="text-2xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 px-1">
                    Step-by-Step Mathematical Trace
                  </span>
                  <StepAnimator
                    steps={result.steps}
                    currentStep={currentStep}
                    onStepChange={handleStepChange}
                    speed={animationSpeed}
                    onSpeedChange={setAnimationSpeed}
                    onCopyStepLink={handleCopyStepLink}
                  />
                </div>
              )}
            </>
          ) : (
            <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40">
              <div className="flex items-center justify-between">
                <span className="text-2xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                  Recent Conversions
                </span>
                <span className="text-xs text-zinc-400 dark:text-zinc-500">
                  Last 5
                </span>
              </div>

              {history.length === 0 ? (
                <div className="mt-4 rounded-lg border border-dashed border-zinc-200 p-4 text-sm text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                  No conversions saved yet.
                </div>
              ) : (
                <ul className="mt-4 flex flex-col gap-3">
                  {history.map((item) => (
                    <li
                      key={item.id}
                      className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-950/40"
                    >
                      <div className="flex items-center justify-between gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                        <span className="font-semibold uppercase tracking-wide">
                          {item.action}
                        </span>
                        <span>{item.timestamp}</span>
                      </div>
                      <p className="mt-2 text-sm font-medium text-zinc-800 dark:text-zinc-200">
                        {item.input || "—"}
                      </p>
                      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                        Output: {item.output}
                      </p>
                      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                        Key: {item.key || "—"}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
