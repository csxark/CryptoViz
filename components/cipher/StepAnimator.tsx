"use client";

import { useState, useEffect, useCallback, memo } from "react";
import type { CipherStep } from "../../lib/cipher/types";
import { cn } from "../../lib/utils";

const SPEED_OPTIONS = [0.5, 1, 2, 4] as const;
export type AnimationSpeed = (typeof SPEED_OPTIONS)[number];

interface StepAnimatorProps {
  steps: CipherStep[];
  currentStep: number;
  onStepChange: (index: number) => void;
  speed?: AnimationSpeed;
  onSpeedChange?: (speed: AnimationSpeed) => void;
  onCopyStepLink?: () => Promise<void> | void;
}

const BASE_INTERVAL_MS = 1500;

const StepAnimator = memo(function StepAnimator({
  steps,
  currentStep,
  onStepChange,
  speed: controlledSpeed,
  onSpeedChange,
  onCopyStepLink,
}: StepAnimatorProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [internalSpeed, setInternalSpeed] = useState<AnimationSpeed>(1);
  const speed = controlledSpeed ?? internalSpeed;
  const setSpeed = useCallback(
    (nextSpeed: AnimationSpeed) => {
      if (onSpeedChange) {
        onSpeedChange(nextSpeed);
      } else {
        setInternalSpeed(nextSpeed);
      }
    },
    [onSpeedChange],
  );
  const copyStepLink = useCallback(async () => {
    if (!onCopyStepLink) return;

    try {
      await onCopyStepLink();
      setLinkCopied(true);
      window.setTimeout(() => setLinkCopied(false), 1800);
    } catch {
      setLinkCopied(false);
    }
  }, [onCopyStepLink]);

  const [reducedMotion, setReducedMotion] = useState(false);

  const hasMultipleSteps = steps.length > 1;

  // Respect the user's OS-level motion preference.
  useEffect(() => {
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mql.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setReducedMotion(e.matches);
      if (e.matches) setIsPlaying(false);
    };
    mql.addEventListener("change", handleChange);
    return () => mql.removeEventListener("change", handleChange);
  }, []);

  // Any manual navigation should interrupt auto-advance playback.
  const goToStep = useCallback(
    (index: number) => {
      setIsPlaying(false);
      onStepChange(Math.min(Math.max(index, 0), Math.max(steps.length - 1, 0)));
    },
    [onStepChange, steps.length],
  );

  const restart = useCallback(() => {
    setIsPlaying(false);
    onStepChange(0);
  }, [onStepChange]);

  const togglePlay = useCallback(() => {
    if (!hasMultipleSteps) return;

    if (reducedMotion) {
      // Skip the animated tween entirely and jump straight to the end.
      onStepChange(steps.length - 1);
      return;
    }

    if (!isPlaying && currentStep === steps.length - 1) {
      onStepChange(0);
    }
    setIsPlaying(!isPlaying);
  }, [
    hasMultipleSteps,
    reducedMotion,
    isPlaying,
    currentStep,
    steps.length,
    onStepChange,
  ]);

  // Auto-advance loop.
  useEffect(() => {
    if (!isPlaying || reducedMotion) return;

    const msPerStep = BASE_INTERVAL_MS / speed;
    const interval = setInterval(() => {
      if (currentStep < steps.length - 1) {
        onStepChange(currentStep + 1);
      } else {
        setIsPlaying(false);
      }
    }, msPerStep);

    return () => clearInterval(interval);
  }, [
    isPlaying,
    reducedMotion,
    speed,
    currentStep,
    steps.length,
    onStepChange,
  ]);

  // Keyboard shortcuts: space to play/pause, arrows to step, home/r to restart, end to jump to last step.
  useEffect(() => {
    if (steps.length === 0) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        target?.isContentEditable
      ) {
        return;
      }

      switch (e.key) {
        case " ":
        case "Spacebar":
          e.preventDefault();
          togglePlay();
          break;
        case "ArrowRight":
          e.preventDefault();
          goToStep(currentStep + 1);
          break;
        case "ArrowLeft":
          e.preventDefault();
          goToStep(currentStep - 1);
          break;
        case "Home":
        case "r":
        case "R":
          e.preventDefault();
          restart();
          break;
        case "End":
          e.preventDefault();
          goToStep(steps.length - 1);
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [steps.length, currentStep, togglePlay, goToStep, restart]);

  if (steps.length === 0) return null;

  const step = steps[currentStep];
  const progressPercent = hasMultipleSteps
    ? (currentStep / (steps.length - 1)) * 100
    : 100;

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
      <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-teal-50 text-xs font-bold text-teal-700 dark:bg-teal-950/50 dark:text-teal-400">
            {currentStep + 1}
          </span>
          <h4 className="font-semibold text-zinc-900 dark:text-white">
            {step.label}
          </h4>
        </div>

        {step.isMilestone && (
          <span className="rounded-full bg-teal-50 px-2 py-0.5 text-2xs font-semibold uppercase tracking-wider text-teal-700 dark:bg-teal-950/50 dark:text-teal-400">
            Milestone
          </span>
        )}
      </div>

      {/* Main Content Area */}
      <div className="py-4">
        {step.note && (
          <p className="mb-4 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400 whitespace-pre-line font-sans">
            {step.note}
          </p>
        )}

        {/* Input/Output comparison if present */}
        {(step.inputState || step.outputState) && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {step.inputState !== undefined && (
              <div className="rounded-lg bg-zinc-50 p-2.5 dark:bg-zinc-950/40">
                <span className="text-2xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                  Input State
                </span>
                <div className="mt-1 font-mono text-xs break-all text-zinc-700 dark:text-zinc-300">
                  {step.inputState || (
                    <span className="italic text-zinc-400">None</span>
                  )}
                </div>
              </div>
            )}
            {step.outputState !== undefined && (
              <div className="rounded-lg bg-zinc-50 p-2.5 dark:bg-zinc-950/40">
                <span className="text-2xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                  Output State
                </span>
                <div className="mt-1 font-mono text-xs break-all text-zinc-700 dark:text-zinc-300">
                  {step.outputState || (
                    <span className="italic text-zinc-400">None</span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Table values if present */}
        {step.table && step.table.length > 0 && (
          <div className="mt-3 overflow-hidden rounded-lg border border-zinc-150 dark:border-zinc-800">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-zinc-50 text-zinc-500 dark:bg-zinc-950/40 dark:text-zinc-500">
                <tr>
                  <th className="px-3 py-1.5 font-semibold">Parameter</th>
                  <th className="px-3 py-1.5 font-semibold">Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {step.table.map((row, idx) => (
                  <tr key={idx} className="bg-white dark:bg-zinc-900/10">
                    <td className="px-3 py-1.5 font-medium text-zinc-500 dark:text-zinc-400">
                      {row.key}
                    </td>
                    <td className="px-3 py-1.5 break-all text-zinc-900 dark:text-zinc-200">
                      {row.value}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Progress Bar */}
      <div className="mb-3">
        <div className="mb-1 flex items-center justify-between text-2xs text-zinc-400 dark:text-zinc-500">
          <span>Progress</span>
          <span>{Math.round(progressPercent)}%</span>
        </div>
        <div
          className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700"
          role="progressbar"
          aria-label="Step progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progressPercent)}
        >
          <div
            className={cn(
              "h-full rounded-full bg-teal-600 dark:bg-teal-400",
              !reducedMotion && "transition-all duration-300 ease-out",
            )}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Control bar */}
      <div className="flex flex-col gap-3 border-t border-zinc-100 pt-3 dark:border-zinc-800 lg:flex-row lg:items-center">
        {/* Playback Controls */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={restart}
            disabled={currentStep === 0 && !isPlaying}
            aria-label="Restart"
            className="rounded p-1.5 text-zinc-500 hover:bg-zinc-100 disabled:opacity-30 dark:text-zinc-400 dark:hover:bg-zinc-800"
            title="Restart (Home / R)"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
              />
            </svg>
          </button>

          <button
            onClick={() => goToStep(currentStep - 1)}
            disabled={currentStep === 0}
            aria-label="Previous step"
            className="rounded p-1.5 text-zinc-500 hover:bg-zinc-100 disabled:opacity-30 dark:text-zinc-400 dark:hover:bg-zinc-800"
            title="Previous Step (←)"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>

          <button
            onClick={togglePlay}
            disabled={!hasMultipleSteps}
            aria-label={isPlaying ? "Pause" : "Play"}
            aria-pressed={isPlaying}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-600 text-white hover:bg-teal-500 focus:outline-none disabled:opacity-30 dark:bg-teal-500 dark:hover:bg-teal-400"
            title={isPlaying ? "Pause (Space)" : "Play (Space)"}
          >
            {isPlaying ? (
              // Pause Icon
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                <path
                  fillRule="evenodd"
                  d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"
                  clipRule="evenodd"
                />
              </svg>
            ) : (
              // Play Icon
              <svg
                className="h-4 w-4 translate-x-[1px]"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>

          <button
            onClick={() => goToStep(currentStep + 1)}
            disabled={currentStep === steps.length - 1}
            aria-label="Next step"
            className="rounded p-1.5 text-zinc-500 hover:bg-zinc-100 disabled:opacity-30 dark:text-zinc-400 dark:hover:bg-zinc-800"
            title="Next Step (→)"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>

          <button
            onClick={() => goToStep(steps.length - 1)}
            disabled={currentStep === steps.length - 1}
            aria-label="Jump to end"
            className="rounded p-1.5 text-zinc-500 hover:bg-zinc-100 disabled:opacity-30 dark:text-zinc-400 dark:hover:bg-zinc-800"
            title="Jump to End (End)"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M11.934 12.8a1 1 0 000-1.6l-5.334-4A1 1 0 005 8v8a1 1 0 001.6.8l5.334-4z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M19.934 12.8a1 1 0 000-1.6l-5.334-4A1 1 0 0013 8v8a1 1 0 001.6.8l5.334-4z"
              />
            </svg>
          </button>

          {/* Playback Speed */}
          <div
            className="ml-1 flex items-center gap-0.5 rounded-md bg-zinc-100 p-0.5 dark:bg-zinc-800"
            role="group"
            aria-label="Playback speed"
          >
            {SPEED_OPTIONS.map((s) => (
              <button
                key={s}
                onClick={() => setSpeed(s)}
                aria-pressed={speed === s}
                className={cn(
                  "rounded px-1.5 py-0.5 text-2xs font-mono font-semibold transition-colors",
                  speed === s
                    ? "bg-white text-teal-700 shadow-sm dark:bg-zinc-900 dark:text-teal-400"
                    : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200",
                )}
                title={`${s}x speed`}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>

        {/* Timeline Scrub Slider */}
        <div className="min-w-0 flex flex-1 items-center gap-3">
          <input
            type="range"
            min="0"
            max={steps.length - 1}
            value={currentStep}
            onChange={(e) => goToStep(parseInt(e.target.value))}
            aria-label="Scrub to step"
            aria-valuemin={0}
            aria-valuemax={steps.length - 1}
            aria-valuenow={currentStep}
            className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-zinc-200 dark:bg-zinc-700 accent-teal-600 dark:accent-teal-400"
          />
          <span className="shrink-0 font-mono text-xs text-zinc-400 dark:text-zinc-500">
            {currentStep + 1} / {steps.length}
          </span>
        </div>
      </div>

      {onCopyStepLink && (
        <div className="mt-3 flex justify-end border-t border-zinc-100 pt-3 dark:border-zinc-800">
          <button
            type="button"
            onClick={() => void copyStepLink()}
            className="rounded-md border border-zinc-200 px-2.5 py-1.5 text-xs font-semibold text-zinc-600 transition-colors hover:border-teal-400 hover:text-teal-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-teal-700 dark:hover:text-teal-400"
            aria-label="Copy link to this visualization step"
          >
            {linkCopied ? "Link copied!" : "Copy link to this step"}
          </button>
        </div>
      )}

      <p className="mt-2 text-2xs text-zinc-400 dark:text-zinc-600">
        Shortcuts: Space play/pause · ←/→ step · Home/R restart · End jump to
        last step
      </p>
    </div>
  );
});

export default StepAnimator;
