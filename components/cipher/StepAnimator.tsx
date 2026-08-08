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
                {step.table.map((row) => (
                  <tr key={row.key} className="bg-white dark:bg-zinc-900/10">
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

      
            {/* Timeline */}
      <div className="mb-3">
        <div className="mb-1 flex items-center justify-between text-2xs text-zinc-400 dark:text-zinc-500">
          <span>Timeline</span>
          <span>
            Step {currentStep + 1} / {steps.length}
          </span>
        </div>

        <input
          type="range"
          min={0}
          max={Math.max(steps.length - 1, 0)}
          value={currentStep}
          onChange={(event) => {
            goToStep(Number(event.target.value));
          }}
          disabled={!hasMultipleSteps}
          aria-label="Animation timeline"
          className="h-2 w-full cursor-pointer accent-teal-600 disabled:cursor-not-allowed disabled:opacity-50"
        />

        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
          <div
            className={cn(
              "h-full rounded-full bg-teal-600 dark:bg-teal-400",
              !reducedMotion && "transition-all duration-300 ease-out",
            )}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Playback Controls */}
      <div className="flex flex-col gap-3 border-t border-zinc-100 pt-3 dark:border-zinc-800 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-1.5">
          {/* Restart */}
          <button
            type="button"
            onClick={restart}
            disabled={currentStep === 0 && !isPlaying}
            aria-label="Restart animation"
            className="rounded-lg px-3 py-2 text-sm text-zinc-600 transition-colors hover:bg-zinc-100 disabled:opacity-30 dark:text-zinc-300 dark:hover:bg-zinc-800"
            title="Restart (Home / R)"
          >
            ↺
          </button>

          {/* Previous */}
          <button
            type="button"
            onClick={() => goToStep(currentStep - 1)}
            disabled={currentStep === 0}
            aria-label="Previous step"
            className="rounded-lg px-3 py-2 text-sm text-zinc-600 transition-colors hover:bg-zinc-100 disabled:opacity-30 dark:text-zinc-300 dark:hover:bg-zinc-800"
            title="Previous Step (←)"
          >
            ←
          </button>

          {/* Play / Pause */}
          <button
            type="button"
            onClick={togglePlay}
            disabled={!hasMultipleSteps}
            aria-label={isPlaying ? "Pause animation" : "Play animation"}
            className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-teal-500 dark:hover:bg-teal-400"
          >
            {isPlaying ? "Pause" : "Play"}
          </button>

          {/* Next */}
          <button
            type="button"
            onClick={() => goToStep(currentStep + 1)}
            disabled={currentStep >= steps.length - 1}
            aria-label="Next step"
            className="rounded-lg px-3 py-2 text-sm text-zinc-600 transition-colors hover:bg-zinc-100 disabled:opacity-30 dark:text-zinc-300 dark:hover:bg-zinc-800"
            title="Next Step (→)"
          >
            →
          </button>

          {/* End */}
          <button
            type="button"
            onClick={() => goToStep(steps.length - 1)}
            disabled={currentStep >= steps.length - 1}
            aria-label="Go to last step"
            className="rounded-lg px-3 py-2 text-sm text-zinc-600 transition-colors hover:bg-zinc-100 disabled:opacity-30 dark:text-zinc-300 dark:hover:bg-zinc-800"
            title="Last Step (End)"
          >
            End
          </button>
        </div>

        {/* Speed */}
        <div className="flex items-center gap-2">
          <label
            htmlFor="animation-speed"
            className="text-xs font-medium text-zinc-500 dark:text-zinc-400"
          >
            Speed
          </label>

          <select
            id="animation-speed"
            value={speed}
            onChange={(event) =>
              setSpeed(Number(event.target.value) as AnimationSpeed)
            }
            className="rounded-lg border border-zinc-200 bg-white px-2.5 py-2 text-xs font-medium text-zinc-700 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
            aria-label="Animation speed"
          >
            {SPEED_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}x
              </option>
            ))}
          </select>
        </div>

        {onCopyStepLink && (
          <button
            type="button"
            onClick={copyStepLink}
            className="rounded-lg border border-zinc-200 px-3 py-2 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            {linkCopied ? "Copied!" : "Copy Step Link"}
          </button>
        )}
      </div>
    </div>
  );
});

export default StepAnimator;