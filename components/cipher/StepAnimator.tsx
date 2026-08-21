"use client";

import { useState, useEffect, useCallback, useMemo, memo } from "react";
import type { CipherStep } from "../../lib/cipher/types";
import type { StepMetadata } from "../../lib/cipher/stepVirtualization";
import { cn } from "../../lib/utils";
import A11yStepNarrator from "@/components/ui/A11yStepNarrator";

const SPEED_OPTIONS = [0.5, 1, 2, 4] as const;

export type AnimationSpeed = (typeof SPEED_OPTIONS)[number];

interface StepAnimatorProps {
  steps: CipherStep[];
  /** Optional lightweight descriptors used to avoid hydrating every step. */
  stepMetadata?: StepMetadata[];
  currentStep: number;
  onStepChange: (index: number) => void;
  speed?: AnimationSpeed;
  onSpeedChange?: (speed: AnimationSpeed) => void;
  onCopyStepLink?: () => Promise<void> | void;
}

const BASE_INTERVAL_MS = 1500;

interface StepTableRowProps {
  rowKey: string;
  value: React.ReactNode;
}

const StepTableRow = memo(function StepTableRow({
  rowKey,
  value,
}: StepTableRowProps) {
  return (
    <tr className="bg-white dark:bg-zinc-900/10">
      <td className="px-3 py-1.5 font-medium text-zinc-500 dark:text-zinc-400">
        {rowKey}
      </td>
      <td className="break-all px-3 py-1.5 text-zinc-900 dark:text-zinc-200">
        {value}
      </td>
    </tr>
  );
});

const StepAnimator = memo(function StepAnimator({
  steps,
  stepMetadata,
  currentStep,
  onStepChange,
  speed: controlledSpeed,
  onSpeedChange,
  onCopyStepLink,
}: StepAnimatorProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [internalSpeed, setInternalSpeed] = useState<AnimationSpeed>(1);
  const [reducedMotion, setReducedMotion] = useState(false);

  const speed = controlledSpeed ?? internalSpeed;
  const hasMultipleSteps = steps.length > 1;

  const safeCurrentStep = Math.min(
    Math.max(currentStep, 0),
    Math.max(steps.length - 1, 0),
  );

  const milestones = useMemo(
    () => {
      if (stepMetadata) {
        return stepMetadata
          .filter((step) => step.isMilestone)
          .map((step) => ({ step, index: step.index }))
      }

      return steps
        .map((step, index) => ({ step, index }))
        .filter(({ step }) => step.isMilestone)
    },
    [steps, stepMetadata],
  )

  const currentMilestoneIndex = useMemo(() => {
    let found = -1
    milestones.forEach(({ index }, milestoneIndex) => {
      if (index <= safeCurrentStep) found = milestoneIndex
    })
    return found
  }, [milestones, safeCurrentStep])

  const currentPhase = useMemo(() => {
    if (currentMilestoneIndex < 0) return null
    const milestone = milestones[currentMilestoneIndex]
    return milestone?.step.label ?? null
  }, [currentMilestoneIndex, milestones])

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

      window.setTimeout(() => {
        setLinkCopied(false);
      }, 1800);
    } catch {
      setLinkCopied(false);
    }
  }, [onCopyStepLink]);

  useEffect(() => {
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mql.matches);

    const handleChange = (event: MediaQueryListEvent) => {
      setReducedMotion(event.matches);
      if (event.matches) {
        setIsPlaying(false);
      }
    };

    mql.addEventListener("change", handleChange);
    return () => {
      mql.removeEventListener("change", handleChange);
    };
  }, []);

  const goToStep = useCallback(
    (index: number) => {
      setIsPlaying(false);
      const nextIndex = Math.min(
        Math.max(index, 0),
        Math.max(steps.length - 1, 0),
      );
      onStepChange(nextIndex);
    },
    [onStepChange, steps.length],
  );

  const restart = useCallback(() => {
    setIsPlaying(false);
    onStepChange(0);
  }, [onStepChange]);

  const goToPreviousMilestone = useCallback(() => {
    if (milestones.length === 0) return

    const previous = [...milestones]
      .reverse()
      .find(({ index }) => index < safeCurrentStep)

    if (previous) {
      goToStep(previous.index)
    } else {
      goToStep(milestones[0].index)
    }
  }, [goToStep, milestones, safeCurrentStep])

  const goToNextMilestone = useCallback(() => {
    if (milestones.length === 0) return

    const next = milestones.find(({ index }) => index > safeCurrentStep)

    if (next) {
      goToStep(next.index)
    } else {
      goToStep(milestones[milestones.length - 1].index)
    }
  }, [goToStep, milestones, safeCurrentStep])

  const togglePlay = useCallback(() => {
    if (!hasMultipleSteps) return;

    if (reducedMotion) {
      onStepChange(steps.length - 1);
      return;
    }

    if (!isPlaying && safeCurrentStep === steps.length - 1) {
      onStepChange(0);
    }

    setIsPlaying((previous) => !previous);
  }, [
    hasMultipleSteps,
    reducedMotion,
    isPlaying,
    safeCurrentStep,
    steps.length,
    onStepChange,
  ]);

  useEffect(() => {
    if (!isPlaying || reducedMotion) return;

    const msPerStep = BASE_INTERVAL_MS / speed;

    const interval = window.setInterval(() => {
      if (safeCurrentStep < steps.length - 1) {
        onStepChange(safeCurrentStep + 1);
      } else {
        setIsPlaying(false);
      }
    }, msPerStep);

    return () => window.clearInterval(interval);
  }, [
    isPlaying,
    reducedMotion,
    speed,
    safeCurrentStep,
    steps.length,
    onStepChange,
  ]);

  // Keyboard shortcuts.
  useEffect(() => {
    if (steps.length === 0) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName;

      if (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        target?.isContentEditable
      ) {
        return;
      }

      if (event.key === '[' || (event.key === 'ArrowLeft' && event.shiftKey)) {
        event.preventDefault()
        goToPreviousMilestone()
        return
      }

      if (event.key === ']' || (event.key === 'ArrowRight' && event.shiftKey)) {
        event.preventDefault()
        goToNextMilestone()
        return
      }

      switch (event.key) {
        case " ":
        case "Spacebar":
          event.preventDefault();
          togglePlay();
          break;

        case "ArrowRight":
          event.preventDefault();
          goToStep(safeCurrentStep + 1);
          break;

        case "ArrowLeft":
          event.preventDefault();
          goToStep(safeCurrentStep - 1);
          break;

        case "Home":
        case "r":
        case "R":
          event.preventDefault();
          restart();
          break;

        case "End":
          event.preventDefault();
          goToStep(steps.length - 1);
          break;

        default:
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [steps.length, safeCurrentStep, togglePlay, goToStep, restart]);

  if (steps.length === 0) return null;

  const step = steps[safeCurrentStep];
  const progressPercent = hasMultipleSteps
    ? (safeCurrentStep / (steps.length - 1)) * 100
    : 100;
  const announcement = `Step ${safeCurrentStep + 1} of ${steps.length}: ${step.label}`;

  const mobileMilestoneValue =
    currentMilestoneIndex >= 0
      ? String(milestones[currentMilestoneIndex].index)
      : ''

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50 [content-visibility:auto]">
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </div>

      <A11yStepNarrator
        step={step}
        stepIndex={safeCurrentStep}
        totalSteps={steps.length}
      />

      <div
        className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 pb-3 dark:border-zinc-800"
        aria-label={`Current step: ${step.label}`}
      >
        <div className="flex min-w-0 items-center gap-2">
          <span
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-50 text-xs font-bold text-teal-700 dark:bg-teal-950/50 dark:text-teal-400"
            aria-hidden="true"
          >
            {safeCurrentStep + 1}
          </span>
          <div className="min-w-0">
            <h4 className="truncate font-semibold text-zinc-900 dark:text-white">
              {step.label}
            </h4>
            {currentPhase && (
              <p className="truncate text-2xs text-zinc-500 dark:text-zinc-400">
                Phase: {currentPhase}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {currentPhase && (
            <span
              data-testid="phase-badge"
              className="max-w-[12rem] truncate rounded-full bg-teal-50 px-2 py-0.5 text-2xs font-semibold text-teal-700 dark:bg-teal-950/50 dark:text-teal-400"
              title={currentPhase}
            >
              Phase: {currentPhase}
            </span>
          )}
          {step.isMilestone && (
            <span className="rounded-full bg-teal-50 px-2 py-0.5 text-2xs font-semibold uppercase tracking-wider text-teal-700 dark:bg-teal-950/50 dark:text-teal-400">
              Milestone
            </span>
          )}
        </div>
      </div>

      <div className="py-4">
        {step.note && (
          <p className="mb-4 whitespace-pre-line font-sans text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            {step.note}
          </p>
        )}

        {(step.inputState || step.outputState) && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {step.inputState !== undefined && (
              <div className="rounded-lg bg-zinc-50 p-2.5 dark:bg-zinc-950/40">
                <span className="text-2xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                  Input State
                </span>
                <div className="mt-1 break-all font-mono text-xs text-zinc-700 dark:text-zinc-300">
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
                <div className="mt-1 break-all font-mono text-xs text-zinc-700 dark:text-zinc-300">
                  {step.outputState || (
                    <span className="italic text-zinc-400">None</span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {step.table && step.table.length > 0 && (
          <div className="mt-3 overflow-hidden rounded-lg border border-zinc-150 dark:border-zinc-800">
            <table className="w-full text-left font-mono text-xs">
              <thead className="bg-zinc-50 text-zinc-500 dark:bg-zinc-950/40 dark:text-zinc-500">
                <tr>
                  <th scope="col" className="px-3 py-1.5 font-semibold">
                    Parameter
                  </th>
                  <th scope="col" className="px-3 py-1.5 font-semibold">
                    Value
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {step.table.map((row) => (
                  <StepTableRow
                    key={row.key}
                    rowKey={row.key}
                    value={row.value}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mb-3">
        <div className="mb-1 flex items-center justify-between gap-2 text-2xs text-zinc-400 dark:text-zinc-500">
          <span>Timeline</span>
          <span>
            Step {safeCurrentStep + 1} / {steps.length} ({Math.round(progressPercent)}%)
          </span>
        </div>

        <input
          type="range"
          min={0}
          max={Math.max(steps.length - 1, 0)}
          value={safeCurrentStep}
          onChange={(event) => {
            goToStep(Number(event.target.value));
          }}
          disabled={!hasMultipleSteps}
          aria-label="Animation timeline"
          aria-valuemin={0}
          aria-valuemax={Math.max(steps.length - 1, 0)}
          aria-valuenow={safeCurrentStep}
          aria-valuetext={`Step ${safeCurrentStep + 1} of ${steps.length}: ${step.label}`}
          className="h-2 w-full cursor-pointer accent-teal-600 disabled:cursor-not-allowed disabled:opacity-50"
        />

        <div
          className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700"
          aria-hidden="true"
        >
          <div
            className={cn(
              "h-full rounded-full bg-teal-600 dark:bg-teal-400",
              !reducedMotion && "transition-all duration-300 ease-out",
            )}
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {hasMultipleSteps && milestones.length > 0 && (
          <>
            <div className="mt-3 hidden gap-2 overflow-x-auto pb-1 md:flex">
              {milestones.map(({ step: milestone, index }) => (
                <button
                  key={`${index}-${milestone.label}-chip`}
                  type="button"
                  onClick={() => goToStep(index)}
                  aria-label={`Jump to milestone: ${milestone.label}`}
                  aria-current={safeCurrentStep === index ? 'step' : undefined}
                  className={cn(
                    'shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                    safeCurrentStep === index
                      ? 'border-teal-500 bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300'
                      : 'border-zinc-200 text-zinc-600 hover:border-teal-400 hover:text-teal-700 dark:border-zinc-700 dark:text-zinc-300',
                  )}
                >
                  {milestone.label}
                </button>
              ))}
            </div>

            <div className="mt-3 md:hidden">
              <label
                htmlFor="milestone-select"
                className="mb-1 block text-2xs font-semibold uppercase tracking-wider text-zinc-400"
              >
                Jump to phase
              </label>
              <select
                id="milestone-select"
                aria-label="Jump to milestone"
                value={mobileMilestoneValue}
                onChange={(event) => goToStep(Number(event.target.value))}
                className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
              >
                {milestones.map(({ step: milestone, index }) => (
                  <option key={`${index}-${milestone.label}-option`} value={index}>
                    {milestone.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-2 flex flex-wrap gap-2 text-2xs text-zinc-400 dark:text-zinc-500">
              <span>Milestones: {milestones.length}</span>
              <span aria-hidden="true">•</span>
              <span>[ / ] jump phases</span>
              <span aria-hidden="true">•</span>
              <span>Shift + ← / → also works</span>
            </div>
          </>
        )}
      </div>

      <div className="flex flex-col gap-3 border-t border-zinc-100 pt-3 dark:border-zinc-800 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={restart}
            disabled={safeCurrentStep === 0 && !isPlaying}
            aria-label="Restart"
            className="rounded-lg px-3 py-2 text-sm text-zinc-600 transition-colors hover:bg-zinc-100 disabled:opacity-30 dark:text-zinc-300 dark:hover:bg-zinc-800"
            title="Restart (Home / R)"
          >
            ↺
          </button>

          <button
            type="button"
            onClick={() => goToStep(safeCurrentStep - 1)}
            disabled={safeCurrentStep === 0}
            aria-label="Previous step"
            className="rounded-lg px-3 py-2 text-sm text-zinc-600 transition-colors hover:bg-zinc-100 disabled:opacity-30 dark:text-zinc-300 dark:hover:bg-zinc-800"
            title="Previous Step (←)"
          >
            ←
          </button>

          <button
            type="button"
            onClick={togglePlay}
            disabled={!hasMultipleSteps}
            aria-label={isPlaying ? "Pause animation" : "Play animation"}
            className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-teal-500 dark:hover:bg-teal-400"
          >
            {isPlaying ? "Pause" : "Play"}
          </button>

          <button
            type="button"
            onClick={() => goToStep(safeCurrentStep + 1)}
            disabled={safeCurrentStep >= steps.length - 1}
            aria-label="Next step"
            className="rounded-lg px-3 py-2 text-sm text-zinc-600 transition-colors hover:bg-zinc-100 disabled:opacity-30 dark:text-zinc-300 dark:hover:bg-zinc-800"
            title="Next Step (→)"
          >
            →
          </button>

          <button
            type="button"
            onClick={() => goToStep(steps.length - 1)}
            disabled={safeCurrentStep >= steps.length - 1}
            aria-label="Go to last step"
            className="rounded-lg px-3 py-2 text-sm text-zinc-600 transition-colors hover:bg-zinc-100 disabled:opacity-30 dark:text-zinc-300 dark:hover:bg-zinc-800"
            title="Last Step (End)"
          >
            End
          </button>

          {milestones.length > 0 && (
            <>
              <button
                type="button"
                onClick={goToPreviousMilestone}
                disabled={!hasMultipleSteps}
                aria-label="Previous milestone"
                title="Previous Milestone ([ / Shift + ←)"
                className="rounded-lg border border-zinc-200 px-3 py-2 text-xs font-medium text-zinc-600 transition-colors hover:border-teal-400 hover:text-teal-700 disabled:opacity-30 dark:border-zinc-700 dark:text-zinc-300"
              >
                Prev phase
              </button>
              <button
                type="button"
                onClick={goToNextMilestone}
                disabled={!hasMultipleSteps}
                aria-label="Next milestone"
                title="Next Milestone (] / Shift + →)"
                className="rounded-lg border border-zinc-200 px-3 py-2 text-xs font-medium text-zinc-600 transition-colors hover:border-teal-400 hover:text-teal-700 disabled:opacity-30 dark:border-zinc-700 dark:text-zinc-300"
              >
                Next phase
              </button>
            </>
          )}
        </div>

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