'use client'

import { useState, useEffect, memo } from 'react'
import type { CipherStep } from '../../lib/cipher/types'

interface StepAnimatorProps {
  steps: CipherStep[]
  currentStep: number
  onStepChange: (index: number) => void
}

const StepAnimator = memo(function StepAnimator({ steps, currentStep, onStepChange }: StepAnimatorProps) {
  const [isPlaying, setIsPlaying] = useState(false)

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null

    if (isPlaying) {
      interval = setInterval(() => {
        if (currentStep < steps.length - 1) {
          onStepChange(currentStep + 1)
        } else {
          setIsPlaying(false)
        }
      }, 1500)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isPlaying, currentStep, steps.length, onStepChange])

  if (steps.length === 0) return null

  const step = steps[currentStep]

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
      <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-teal-50 text-xs font-bold text-teal-700 dark:bg-teal-950/50 dark:text-teal-400">
            {currentStep + 1}
          </span>
          <h4 className="font-semibold text-zinc-900 dark:text-white">{step.label}</h4>
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
                  {step.inputState || <span className="italic text-zinc-400">None</span>}
                </div>
              </div>
            )}
            {step.outputState !== undefined && (
              <div className="rounded-lg bg-zinc-50 p-2.5 dark:bg-zinc-950/40">
                <span className="text-2xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                  Output State
                </span>
                <div className="mt-1 font-mono text-xs break-all text-zinc-700 dark:text-zinc-300">
                  {step.outputState || <span className="italic text-zinc-400">None</span>}
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
                    <td className="px-3 py-1.5 font-medium text-zinc-500 dark:text-zinc-400">{row.key}</td>
                    <td className="px-3 py-1.5 break-all text-zinc-900 dark:text-zinc-200">{row.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Control bar */}
      <div className="mt-2 flex flex-col gap-3 border-t border-zinc-100 pt-3 dark:border-zinc-800 sm:flex-row sm:items-center">
        {/* Playback Controls */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onStepChange(0)}
            disabled={currentStep === 0}
            className="rounded p-1.5 text-zinc-500 hover:bg-zinc-100 disabled:opacity-30 dark:text-zinc-400 dark:hover:bg-zinc-800"
            title="First Step"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0019 16V8a1 1 0 00-1.6-.8l-5.334 4z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0011 16V8a1 1 0 00-1.6-.8l-5.334 4z" />
            </svg>
          </button>
          
          <button
            onClick={() => onStepChange(Math.max(0, currentStep - 1))}
            disabled={currentStep === 0}
            className="rounded p-1.5 text-zinc-500 hover:bg-zinc-100 disabled:opacity-30 dark:text-zinc-400 dark:hover:bg-zinc-800"
            title="Previous Step"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-600 text-white hover:bg-teal-500 focus:outline-none dark:bg-teal-500 dark:hover:bg-teal-400"
            title={isPlaying ? 'Pause' : 'Play Auto-Advance'}
          >
            {isPlaying ? (
              // Pause Icon
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                <path fillRule="evenodd" d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" clipRule="evenodd" />
              </svg>
            ) : (
              // Play Icon
              <svg className="h-4 w-4 translate-x-[1px]" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>

          <button
            onClick={() => onStepChange(Math.min(steps.length - 1, currentStep + 1))}
            disabled={currentStep === steps.length - 1}
            className="rounded p-1.5 text-zinc-500 hover:bg-zinc-100 disabled:opacity-30 dark:text-zinc-400 dark:hover:bg-zinc-800"
            title="Next Step"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
            </svg>
          </button>

          <button
            onClick={() => onStepChange(steps.length - 1)}
            disabled={currentStep === steps.length - 1}
            className="rounded p-1.5 text-zinc-500 hover:bg-zinc-100 disabled:opacity-30 dark:text-zinc-400 dark:hover:bg-zinc-800"
            title="Last Step"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.934 12.8a1 1 0 000-1.6l-5.334-4A1 1 0 005 8v8a1 1 0 001.6.8l5.334-4z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.934 12.8a1 1 0 000-1.6l-5.334-4A1 1 0 0013 8v8a1 1 0 001.6.8l5.334-4z" />
            </svg>
          </button>
        </div>

        {/* Timeline Scrub Slider */}
        <div className="flex flex-1 items-center gap-3">
          <input
            type="range"
            min="0"
            max={steps.length - 1}
            value={currentStep}
            onChange={(e) => onStepChange(parseInt(e.target.value))}
            className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-zinc-200 dark:bg-zinc-700 accent-teal-600 dark:accent-teal-400"
          />
          <span className="shrink-0 font-mono text-xs text-zinc-400 dark:text-zinc-500">
            {currentStep + 1} / {steps.length}
          </span>
        </div>
      </div>
    </div>
  )
})

export default StepAnimator
