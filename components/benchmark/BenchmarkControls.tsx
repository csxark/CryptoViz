'use client'

import React, { useCallback } from 'react'
import { PRESET_INPUT_SIZES, PRESET_ITERATIONS } from '@/lib/utils/benchmark'

interface BenchmarkControlsProps {
  inputSize: number
  iterations: number
  isRunning: boolean
  onInputSizeChange: (size: number) => void
  onIterationsChange: (iterations: number) => void
  onBenchmarkStart: () => void
  onScalingBenchmarkStart?: () => void
  enableScaling?: boolean
}

export default React.memo(function BenchmarkControls({
  inputSize,
  iterations,
  isRunning,
  onInputSizeChange,
  onIterationsChange,
  onBenchmarkStart,
  onScalingBenchmarkStart,
  enableScaling = false,
}: BenchmarkControlsProps) {
  const handleCustomInputSize = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = parseInt(e.target.value, 10)
      if (!isNaN(value) && value > 0) {
        onInputSizeChange(value)
      }
    },
    [onInputSizeChange],
  )

  const handleCustomIterations = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = parseInt(e.target.value, 10)
      if (!isNaN(value) && value > 0) {
        onIterationsChange(value)
      }
    },
    [onIterationsChange],
  )

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className="space-y-6 rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      {/* Input Size Configuration */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="font-medium text-zinc-900 dark:text-white">Input Size</label>
          <span className="text-sm font-mono text-zinc-500 dark:text-zinc-400">
            {formatBytes(inputSize)}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {PRESET_INPUT_SIZES.map((preset) => (
            <button
              key={preset.value}
              onClick={() => onInputSizeChange(preset.value)}
              className={`rounded-lg border px-3 py-2 text-sm font-medium transition-all duration-200 hover:scale-[1.03] active:scale-95 ${
                inputSize === preset.value
                  ? 'border-teal-600 bg-teal-50 text-teal-700 dark:border-teal-400 dark:bg-teal-900/20 dark:text-teal-300'
                  : 'border-zinc-200 text-zinc-700 hover:border-zinc-300 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-zinc-600'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Custom Size (bytes):
          </label>
          <input
            type="number"
            value={inputSize}
            onChange={handleCustomInputSize}
            min="1"
className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none transition-all duration-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"            placeholder="Enter custom size in bytes"
          />
        </div>
      </div>

      {/* Iterations Configuration */}
      <div className="space-y-3">
        <label className="font-medium text-zinc-900 dark:text-white">Test Iterations</label>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {PRESET_ITERATIONS.map((preset) => (
            <button
              key={preset.value}
              onClick={() => onIterationsChange(preset.value)}
             className={`rounded-lg border px-3 py-2 text-sm font-medium transition-all duration-200 hover:scale-[1.03] active:scale-95 ${
                iterations === preset.value
                  ? 'border-teal-600 bg-teal-50 text-teal-700 dark:border-teal-400 dark:bg-teal-900/20 dark:text-teal-300'
                  : 'border-zinc-200 text-zinc-700 hover:border-zinc-300 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-zinc-600'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Custom Iterations:
          </label>
          <input
            type="number"
            value={iterations}
            onChange={handleCustomIterations}
            min="1"
            max="10000"
className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none transition-all duration-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"            placeholder="Enter custom iteration count"
          />
        </div>
      </div>

      {/* Info */}
      <div className="rounded-lg bg-blue-50 p-3 text-sm text-blue-800 dark:bg-blue-900/30 dark:text-blue-200">
        <p className="font-medium">Performance Tip:</p>
        <p className="mt-1 text-xs">
          Higher iterations provide more accurate results but take longer. Smaller input sizes benchmark algorithm efficiency, while larger sizes test scalability.
        </p>
      </div>

      {/* Start Button */}
      {enableScaling && onScalingBenchmarkStart && (
        <button
          onClick={onScalingBenchmarkStart}
          disabled={isRunning}
          className="w-full rounded-lg bg-purple-600 px-4 py-3 font-semibold text-white shadow-sm transition-all duration-200 hover:scale-[1.01] hover:bg-purple-700 hover:shadow-md active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100 dark:bg-purple-500 dark:hover:bg-purple-600"
        >
          {isRunning ? (
            <div className="flex items-center justify-center gap-2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
              Running Scaling Sweep...
            </div>
          ) : (
            'Start Payload Scaling Sweep'
          )}
        </button>
      )}
      <button
        onClick={onBenchmarkStart}
        disabled={isRunning}
className="w-full rounded-lg bg-teal-600 px-4 py-3 font-semibold text-white shadow-sm transition-all duration-200 hover:scale-[1.01] hover:bg-teal-700 hover:shadow-md active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100 dark:bg-teal-500 dark:hover:bg-teal-600"      >
        {isRunning ? (
          <div className="flex items-center justify-center gap-2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
            Running Benchmarks...
          </div>
        ) : (
          'Start Benchmarks'
        )}
      </button>
    </div>
  )
})
