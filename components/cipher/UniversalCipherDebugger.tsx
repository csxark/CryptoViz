"use client";

import { useState, useRef, useEffect, useCallback, memo } from "react";
import type { CipherStep } from "../../lib/cipher/types";
import StepAnimator, { AnimationSpeed } from "./StepAnimator";
import { cn } from "../../lib/utils";

interface UniversalCipherDebuggerProps {
  title?: string;
  steps: CipherStep[];
  initialStep?: number;
  speed?: AnimationSpeed;
  onSpeedChange?: (speed: AnimationSpeed) => void;
  onCopyStepLink?: () => Promise<void> | void;
}

const ITEM_HEIGHT = 42; // Height in px for each virtualized step list row
const OVERSCAN = 5;     // Extra rows rendered above and below viewport

export const UniversalCipherDebugger = memo(function UniversalCipherDebugger({
  title = "Trace Execution Visualizer",
  steps,
  initialStep = 0,
  speed,
  onSpeedChange,
  onCopyStepLink,
}: UniversalCipherDebuggerProps) {
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const viewportHeight = 320; // Default height for viewport virtual calculation

  useEffect(() => {
    if (initialStep >= 0 && initialStep < steps.length) {
      setCurrentStep(initialStep);
    }
  }, [initialStep, steps.length]);

  // Keep current active step scrolled into view on step advancement
  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const targetTop = currentStep * ITEM_HEIGHT;
    const targetBottom = targetTop + ITEM_HEIGHT;

    if (targetTop < container.scrollTop) {
      container.scrollTop = targetTop;
    } else if (targetBottom > container.scrollTop + container.clientHeight) {
      container.scrollTop = targetBottom - container.clientHeight;
    }
  }, [currentStep]);

  const handleScroll = useCallback(() => {
    if (containerRef.current) {
      setScrollTop(containerRef.current.scrollTop);
    }
  }, []);

  const totalSteps = steps.length;
  const totalHeight = totalSteps * ITEM_HEIGHT;

  const startIndex = Math.max(0, Math.floor(scrollTop / ITEM_HEIGHT) - OVERSCAN);
  const endIndex = Math.min(
    totalSteps - 1,
    Math.floor((scrollTop + viewportHeight) / ITEM_HEIGHT) + OVERSCAN
  );

  const visibleSteps = steps.slice(startIndex, endIndex + 1);
  const translateY = startIndex * ITEM_HEIGHT;

  return (
    <div className="space-y-4 rounded-xl border border-zinc-200 bg-zinc-50/50 p-4 dark:border-zinc-800 dark:bg-zinc-950/20 [content-visibility:auto]">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-zinc-900 dark:text-white">
          {title}
        </h3>
        <span className="text-xs font-mono text-zinc-500 dark:text-zinc-400">
          {totalSteps} Total Steps
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Virtualized Step Selection List */}
        <div className="lg:col-span-4">
          <div
            ref={containerRef}
            onScroll={handleScroll}
            data-testid="virtualized-step-list"
            className="relative h-[320px] overflow-y-auto rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div style={{ height: `${totalHeight}px`, position: "relative" }}>
              <div
                style={{
                  transform: `translateY(${translateY}px)`,
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                }}
              >
                {visibleSteps.map((step, idx) => {
                  const actualIndex = startIndex + idx;
                  const isActive = actualIndex === currentStep;

                  return (
                    <button
                      key={`step-${step.index ?? actualIndex}`}
                      type="button"
                      onClick={() => setCurrentStep(actualIndex)}
                      className={cn(
                        "flex h-[42px] w-full items-center justify-between px-3 text-left font-mono text-xs transition-colors border-b border-zinc-100 dark:border-zinc-800/50",
                        isActive
                          ? "bg-teal-50 text-teal-700 font-semibold dark:bg-teal-950/60 dark:text-teal-300"
                          : "text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800/40"
                      )}
                    >
                      <span className="truncate pr-2">
                        {actualIndex + 1}. {step.label}
                      </span>
                      {step.isMilestone && (
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-teal-500" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Step Animator & Inspector Viewport */}
        <div className="lg:col-span-8">
          <StepAnimator
            steps={steps}
            currentStep={currentStep}
            onStepChange={setCurrentStep}
            speed={speed}
            onSpeedChange={onSpeedChange}
            onCopyStepLink={onCopyStepLink}
          />
        </div>
      </div>
    </div>
  );
});

export default UniversalCipherDebugger;
