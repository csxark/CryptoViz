'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import type { CipherDefinition } from '../../lib/cipher/registry'
import { useCipherWorker } from '../../lib/hooks/useCipherWorker'
import StepAnimator from './StepAnimator'
import PlayfairGrid from './PlayfairGrid'
import RailFenceViz from './RailFenceViz'
import DHVisualizer from './DHVisualizer'
import { SkeletonOutput, SkeletonStep } from '../ui/Skeleton'

interface CipherLayoutProps {
  cipher: CipherDefinition
}

export default function CipherLayout({ cipher }: CipherLayoutProps) {
  const { runCipher, loading, error: workerError } = useCipherWorker()

  const [input, setInput] = useState(cipher.defaultInput)
  const [key, setKey] = useState(cipher.defaultKey)
  const [action, setAction] = useState<'encrypt' | 'decrypt'>('encrypt')
  const [initialLoading, setInitialLoading] = useState(true)
  
  // Custom options states
  const [hexInput, setHexInput] = useState(true)
  const [rounds, setRounds] = useState(4)
  const [demoMode, setDemoMode] = useState(true)
  const [bobSecret, setBobSecret] = useState('15')

  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [currentStep, setCurrentStep] = useState(0)

  // Reset inputs when cipher changes
  useEffect(() => {
    setInput(cipher.defaultInput)
    setKey(cipher.defaultKey)
    setResult(null)
    setError(null)
    setCurrentStep(0)
    setInitialLoading(true)

    // Reset option defaults
    if (cipher.options) {
      cipher.options.forEach((opt) => {
        if (opt.id === 'hexInput') setHexInput(opt.default)
        if (opt.id === 'rounds') setRounds(opt.default)
        if (opt.id === 'demoMode') setDemoMode(opt.default)
        if (opt.id === 'bobSecret') setBobSecret(opt.default)
      })
    }
  }, [cipher])

  const handleRun = async () => {
    setError(null)
    try {
      // Gather options
      const options: any = {
        instrument: true, // Always request instrumented steps for visualizer
      }

      if (cipher.id === 'des' || cipher.id === '3des' || cipher.id === 'aes') {
        options.hexInput = hexInput
      }
      if (cipher.id === 'bcrypt') {
        options.rounds = rounds
      }
      if (cipher.id === 'rsa') {
        options.mode = demoMode ? 'demo' : 'real'
      }
      if (cipher.id === 'dh') {
        options.mode = 'demo' // Always demo for paint mixing
        options.bobSecret = bobSecret
      }

      // DH does not support decrypt
      const currentAction = cipher.id === 'dh' ? 'encrypt' : action

      const res = await runCipher(currentAction, cipher.id, input, key, options)
      setResult(res)
      setCurrentStep(0)
      setInitialLoading(false)
    } catch (err: any) {
      setError(err.message || 'An error occurred during calculation.')
      setResult(null)
      setInitialLoading(false)
    }
  }

  // Auto-run once on mount/load
  useEffect(() => {
    handleRun()
  }, [cipher, action, hexInput, rounds, demoMode])

  // Helper for status badge styling
  const getStatusBadge = (status: 'secure' | 'deprecated' | 'broken') => {
    switch (status) {
      case 'secure':
        return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900'
      case 'deprecated':
        return 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 border-amber-200 dark:border-amber-900'
      case 'broken':
        return 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400 border-red-200 dark:border-red-900'
    }
  }

  // Specific visualizer rendering based on current step
  const renderSpecificVisualizer = () => {
    if (!result || result.steps.length === 0) return null

    const step = result.steps[currentStep]

    if (cipher.id === 'playfair' && step.matrix) {
      return <PlayfairGrid matrix={step.matrix} highlights={step.highlight} />
    }

    if (cipher.id === 'railfence' && step.matrix) {
      return <RailFenceViz matrix={step.matrix} highlight={step.highlight} />
    }

    if (cipher.id === 'dh') {
      return <DHVisualizer currentStep={currentStep} />
    }

    return null
  }

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
              cipher.securityStatus
            )}`}
          >
            {cipher.securityStatus}
          </span>
          <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-0.5 text-xs font-medium text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
            {cipher.category}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
        {/* Controls Column (Left) */}
        <div className="flex flex-col gap-4 md:col-span-5">
          {/* Action toggle (Encrypt / Decrypt) */}
          {cipher.category !== 'hash' && cipher.id !== 'dh' && (
            <div className="flex rounded-lg bg-zinc-100 p-0.5 dark:bg-zinc-800/80">
              <button
                onClick={() => setAction('encrypt')}
                className={`flex-1 rounded-md py-1.5 text-center text-xs font-semibold transition-all ${
                  action === 'encrypt'
                    ? 'bg-white text-zinc-950 shadow dark:bg-zinc-900 dark:text-white'
                    : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                Encrypt / Sign
              </button>
              <button
                onClick={() => setAction('decrypt')}
                className={`flex-1 rounded-md py-1.5 text-center text-xs font-semibold transition-all ${
                  action === 'decrypt'
                    ? 'bg-white text-zinc-950 shadow dark:bg-zinc-900 dark:text-white'
                    : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
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
                {cipher.id === 'ecc' && action === 'decrypt'
                  ? 'Original Message (to verify)'
                  : 'Plaintext / Input Message'}
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
                  {cipher.id === 'ecc'
                    ? action === 'encrypt'
                      ? 'Private Key (Hex)'
                      : 'Signature, Public Key (comma separated)'
                    : cipher.id === 'dh'
                    ? 'Alice Private Secret (a) & Public Parameters (p, g)'
                    : 'Cryptographic Key / Shift'}
                </label>
                <input
                  type="text"
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                  className="w-full rounded-lg border border-zinc-200 bg-zinc-50/50 p-2.5 font-mono text-sm text-zinc-900 outline-none transition-all focus:border-teal-500 focus:bg-white dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-zinc-100 dark:focus:border-teal-400 dark:focus:bg-zinc-950"
                  placeholder={cipher.keyPlaceholder || 'Enter key...'}
                />
              </div>
            )}

            {/* Specific algorithm options */}
            {cipher.id === 'bcrypt' && (
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                    Bcrypt Rounds (Cost Factor)
                  </label>
                  <span className="font-mono text-xs font-bold text-teal-600 dark:text-teal-400">{rounds}</span>
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

            {cipher.id === 'dh' && (
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

            {cipher.id === 'rsa' && (
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

            {['des', '3des', 'aes'].includes(cipher.id) && (
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

            {/* Run button */}
            <button
              onClick={handleRun}
              disabled={loading}
              className="mt-2 flex w-full items-center justify-center rounded-lg bg-teal-600 py-2.5 text-center text-sm font-semibold text-white shadow-sm transition-all hover:bg-teal-500 focus:outline-none disabled:opacity-50 dark:bg-teal-500 dark:hover:bg-teal-400"
            >
              {loading ? (
                <span className="flex items-center gap-1.5">
                  <svg className="h-4 w-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Running in Web Worker...
                </span>
              ) : (
                'Run Computation'
              )}
            </button>
          </div>

          {/* Errors Display */}
          {(error || workerError) && (
            <div className="rounded-xl border border-red-100 bg-red-50 p-4 dark:border-red-950/40 dark:bg-red-950/10">
              <div className="flex gap-2.5">
                <svg className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
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
        <div className="flex flex-col gap-4 md:col-span-7">
          {/* Main output display */}
          <AnimatePresence mode="wait">
            {initialLoading && loading ? (
              <motion.div
                key="skeleton"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <SkeletonOutput />
              </motion.div>
            ) : (
              <motion.div
                key="output"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40"
              >
                <span className="text-2xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                  {cipher.category === 'hash' ? 'Generated Hash Digest' : 'Output Result'}
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
                    <span className="font-mono">{result.durationMs.toFixed(2)} ms</span>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Custom Visualizer rendering (like grids, paint mixer, etc.) */}
          {renderSpecificVisualizer()}

          {/* Interactive Walkthrough Trace */}
          <AnimatePresence mode="wait">
            {initialLoading && loading ? (
              <motion.div
                key="steps-skeleton"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <SkeletonStep />
              </motion.div>
            ) : result && result.steps && result.steps.length > 0 ? (
              <motion.div
                key="steps"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: 0.1 }}
                className="flex flex-col gap-2"
              >
                <span className="text-2xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 px-1">
                  Step-by-Step Mathematical Trace
                </span>
                <StepAnimator
                  steps={result.steps}
                  currentStep={currentStep}
                  onStepChange={setCurrentStep}
                />
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
