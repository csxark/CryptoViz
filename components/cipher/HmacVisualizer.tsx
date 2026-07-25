'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, Key, FileText, Hash, Info, Plus } from 'lucide-react'
import type { CipherResult } from '../../lib/cipher/types'

interface HmacVisualizerProps {
  currentStep: number
  result: CipherResult | null
}

export default function HmacVisualizer({ currentStep, result }: HmacVisualizerProps) {
  if (!result || result.steps.length === 0) return null

  const steps = result.steps
  const activeStep = steps[currentStep] || steps[0]

  // Helper to check if a block in the flow should be highlighted for the current step
  const isHighlighted = (blocks: number[]) => blocks.includes(currentStep)

  // Extract values from step states
  const originalKey = steps[0].inputState
  const preparedKey = steps[0].outputState
  const innerKey = steps[1].outputState
  const innerHash = steps[2].outputState
  const outerKey = steps[3].outputState
  const finalHmac = steps[4].outputState

  const formatHex = (hex: string, length = 16) => {
    if (!hex) return ''
    if (hex.length <= length) return hex
    return `${hex.slice(0, length)}...`
  }

  return (
    <div className="flex flex-col gap-6 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40">
      <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
        <div>
          <h3 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            HMAC Execution Pipeline
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Interactive visualization mapping the inner/outer hashing and key preparation steps.
          </p>
        </div>
      </div>

      {/* Main Grid: Flowchart (Left/Top) & Details (Right/Bottom) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Flowchart Diagram (7 cols) */}
        <div className="lg:col-span-7 flex flex-col items-center justify-center bg-zinc-50/50 p-4 rounded-xl border border-zinc-100 dark:bg-zinc-950/20 dark:border-zinc-800/60 min-h-[400px]">
          <div className="w-full max-w-lg flex flex-col gap-6 text-2xs select-none">
            
            {/* Stage 1: Key Prep */}
            <div className="flex flex-col items-center gap-2">
              <div className="flex items-center gap-4 w-full justify-center">
                {/* Secret Key Input */}
                <div className={`flex flex-col items-center justify-center p-2 rounded-lg border w-24 h-16 transition-all ${
                  isHighlighted([0])
                    ? 'border-teal-500 bg-teal-500/10 text-teal-700 dark:text-teal-400 shadow-md ring-1 ring-teal-400'
                    : 'border-zinc-200 bg-white text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950'
                }`}>
                  <Key className="h-4.5 w-4.5 mb-1" />
                  <span className="font-bold">Secret Key (K)</span>
                </div>

                <ArrowRight className="h-4 w-4 text-zinc-300 dark:text-zinc-700" />

                {/* Key Prep Function */}
                <div className={`flex flex-col items-center justify-center p-2 rounded-lg border w-28 h-16 text-center transition-all ${
                  isHighlighted([0])
                    ? 'border-teal-500 bg-teal-500/10 text-teal-700 dark:text-teal-400 shadow-md ring-1 ring-teal-400'
                    : 'border-zinc-200 bg-white text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950'
                }`}>
                  <span className="font-semibold block">Key Preparation</span>
                  <span className="opacity-60 mt-0.5">Pad or Hash</span>
                </div>

                <ArrowRight className="h-4 w-4 text-zinc-300 dark:text-zinc-700" />

                {/* Prepared Key */}
                <div className={`flex flex-col items-center justify-center p-2 rounded-lg border w-24 h-16 transition-all ${
                  isHighlighted([0, 1, 3])
                    ? 'border-teal-500 bg-teal-500/10 text-teal-700 dark:text-teal-400 shadow-md ring-1 ring-teal-400'
                    : 'border-zinc-200 bg-white text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950'
                }`}>
                  <span className="font-bold">Prepared Key (K')</span>
                  <span className="font-mono mt-0.5">{formatHex(preparedKey, 6)}</span>
                </div>
              </div>
            </div>

            {/* Stage 2: Parallel XOR Paths */}
            <div className="grid grid-cols-2 gap-4 w-full border-t border-b border-zinc-100 py-6 dark:border-zinc-800">
              
              {/* Left Path: Inner XOR */}
              <div className="flex flex-col items-center gap-3 border-r border-zinc-100 pr-2 dark:border-zinc-800">
                <div className="font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider text-[9px]">
                  Inner Path
                </div>

                {/* XOR ipad */}
                <div className={`flex items-center gap-2 p-2.5 rounded-lg border w-36 transition-all ${
                  isHighlighted([1])
                    ? 'border-teal-500 bg-teal-500/10 text-teal-700 dark:text-teal-400 shadow-md ring-1 ring-teal-400'
                    : 'border-zinc-200 bg-white text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950'
                }`}>
                  <div className="bg-zinc-100 p-1 rounded font-bold dark:bg-zinc-900 shrink-0">XOR</div>
                  <div>
                    <span className="font-bold block">K' ⊕ ipad</span>
                    <span className="opacity-60 text-[9px]">ipad = 0x36</span>
                  </div>
                </div>

                <ArrowRight className="h-4 w-4 rotate-90 text-zinc-300 dark:text-zinc-700" />

                {/* Inner Key */}
                <div className={`flex flex-col items-center justify-center p-2 rounded-lg border w-32 h-12 transition-all ${
                  isHighlighted([1, 2])
                    ? 'border-teal-500 bg-teal-500/10 text-teal-700 dark:text-teal-400 shadow-md ring-1 ring-teal-400'
                    : 'border-zinc-200 bg-white text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950'
                }`}>
                  <span className="font-bold">Inner Key</span>
                  <span className="font-mono opacity-60">{formatHex(innerKey, 6)}</span>
                </div>

                <Plus className="h-3.5 w-3.5 text-zinc-400" />

                {/* Message Input */}
                <div className={`flex items-center gap-2 p-2 rounded-lg border w-32 transition-all ${
                  isHighlighted([2])
                    ? 'border-teal-500 bg-teal-500/10 text-teal-700 dark:text-teal-400 shadow-md ring-1 ring-teal-400'
                    : 'border-zinc-200 bg-white text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950'
                }`}>
                  <FileText className="h-3.5 w-3.5 shrink-0" />
                  <span className="font-bold">Message (m)</span>
                </div>

                <ArrowRight className="h-4 w-4 rotate-90 text-zinc-300 dark:text-zinc-700" />

                {/* Inner Hash Block */}
                <div className={`flex flex-col items-center justify-center p-2 rounded-lg border w-32 text-center transition-all ${
                  isHighlighted([2, 4])
                    ? 'border-teal-500 bg-teal-500/10 text-teal-700 dark:text-teal-400 shadow-md ring-1 ring-teal-400'
                    : 'border-zinc-200 bg-white text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950'
                }`}>
                  <Hash className="h-3.5 w-3.5 mb-1" />
                  <span className="font-bold">Inner Hash</span>
                  <span className="font-mono text-[9px] opacity-60">{formatHex(innerHash, 6)}</span>
                </div>
              </div>

              {/* Right Path: Outer XOR */}
              <div className="flex flex-col items-center gap-3">
                <div className="font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider text-[9px]">
                  Outer Path
                </div>

                {/* XOR opad */}
                <div className={`flex items-center gap-2 p-2.5 rounded-lg border w-36 transition-all ${
                  isHighlighted([3])
                    ? 'border-teal-500 bg-teal-500/10 text-teal-700 dark:text-teal-400 shadow-md ring-1 ring-teal-400'
                    : 'border-zinc-200 bg-white text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950'
                }`}>
                  <div className="bg-zinc-100 p-1 rounded font-bold dark:bg-zinc-900 shrink-0">XOR</div>
                  <div>
                    <span className="font-bold block">K' ⊕ opad</span>
                    <span className="opacity-60 text-[9px]">opad = 0x5c</span>
                  </div>
                </div>

                <ArrowRight className="h-4 w-4 rotate-90 text-zinc-300 dark:text-zinc-700" />

                {/* Outer Key */}
                <div className={`flex flex-col items-center justify-center p-2 rounded-lg border w-32 h-12 transition-all ${
                  isHighlighted([3, 4])
                    ? 'border-teal-500 bg-teal-500/10 text-teal-700 dark:text-teal-400 shadow-md ring-1 ring-teal-400'
                    : 'border-zinc-200 bg-white text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950'
                }`}>
                  <span className="font-bold">Outer Key</span>
                  <span className="font-mono opacity-60">{formatHex(outerKey, 6)}</span>
                </div>

                <Plus className="h-3.5 w-3.5 text-zinc-400" />

                {/* Inner Hash Reference */}
                <div className={`flex items-center gap-2 p-2 rounded-lg border w-32 transition-all ${
                  isHighlighted([4])
                    ? 'border-teal-500 bg-teal-500/10 text-teal-700 dark:text-teal-400 shadow-md ring-1 ring-teal-400'
                    : 'border-zinc-200 bg-white text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950'
                }`}>
                  <span className="font-bold">Inner Hash</span>
                </div>

                <ArrowRight className="h-4 w-4 rotate-90 text-zinc-300 dark:text-zinc-700" />

                {/* Outer Hash (Final HMAC) */}
                <div className={`flex flex-col items-center justify-center p-2 rounded-lg border w-32 text-center transition-all ${
                  isHighlighted([4])
                    ? 'border-teal-500 bg-teal-500/10 text-teal-700 dark:text-teal-400 shadow-md ring-1 ring-teal-400'
                    : 'border-zinc-200 bg-white text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950'
                }`}>
                  <Hash className="h-3.5 w-3.5 mb-1" />
                  <span className="font-bold">Outer Hash (Final)</span>
                  <span className="font-mono text-[9px] opacity-60">{formatHex(finalHmac, 6)}</span>
                </div>
              </div>
            </div>

            {/* Stage 3: Final Output Output */}
            <div className="flex flex-col items-center">
              <div className={`flex flex-col items-center justify-center p-3 rounded-lg border w-44 text-center transition-all ${
                isHighlighted([4])
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-800 dark:border-emerald-500 dark:bg-emerald-950/20 dark:text-emerald-400 shadow-md ring-1 ring-emerald-500'
                  : 'border-zinc-200 bg-white text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950'
              }`}>
                <span className="font-bold uppercase tracking-wider text-[9px] opacity-60">Final HMAC Digest</span>
                <span className="font-mono mt-1 font-bold text-xs">{formatHex(finalHmac, 12)}</span>
              </div>
            </div>

          </div>
        </div>

        {/* Step details inspection (5 cols) */}
        <div className="lg:col-span-5 flex flex-col justify-between rounded-xl border border-zinc-100 bg-zinc-50/50 p-4 dark:border-zinc-800/60 dark:bg-zinc-950/15">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-zinc-200 px-2.5 py-0.5 text-xs font-bold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400">
                Step {currentStep} of 4
              </span>
              <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                {activeStep.label}
              </span>
            </div>

            <div className="space-y-3">
              <p className="text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
                {activeStep.note}
              </p>

              {/* Hex trace block breakout */}
              <div className="rounded-lg border border-zinc-200 bg-white p-3.5 dark:border-zinc-800 dark:bg-zinc-900/60 font-mono text-xs space-y-3.5">
                <div>
                  <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider block mb-1">
                    Input State
                  </span>
                  <div className="text-[11px] leading-relaxed break-all select-all font-semibold text-zinc-800 dark:text-zinc-300">
                    {activeStep.inputState || 'None'}
                  </div>
                </div>

                <div>
                  <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider block mb-1">
                    Output State
                  </span>
                  <div className="text-[11px] leading-relaxed break-all select-all font-bold text-teal-600 dark:text-teal-400">
                    {activeStep.outputState}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Educational Math block */}
          <div className="border-t border-zinc-200 pt-4 mt-4 dark:border-zinc-800">
            <div className="flex gap-2 text-2xs text-zinc-500 dark:text-zinc-400">
              <Info className="h-4 w-4 text-teal-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-zinc-800 dark:text-zinc-200 block mb-0.5">
                  How HMAC prevents padding attacks:
                </span>
                By nesting the hash function twice with two independent keys (inner and outer key derivation), HMAC successfully breaks the length-extension properties of Merkle–Damgård structures.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
