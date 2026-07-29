'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, Hash, Layers, ShieldCheck, Binary, Cpu } from 'lucide-react'
import type { CipherResult } from '../../lib/cipher/types'

interface Sm3VisualizerProps {
  currentStep: number
  result: CipherResult | null
}

export default function Sm3Visualizer({ currentStep, result }: Sm3VisualizerProps) {
  if (!result || !result.steps || result.steps.length === 0) return null

  const steps = result.steps
  const activeStep = steps[currentStep] || steps[0]

  // Pipeline stage highlights based on step label/index
  const isPaddingStage = currentStep === 0
  const isIvStage = currentStep === 1
  const isScheduleStage = currentStep >= 2 && currentStep <= 4
  const isRoundsStage = currentStep >= 5 && currentStep <= 69
  const isXorStateStage = currentStep === 70
  const isFinalStage = currentStep === 71

  // Extract table rows for current round step
  const tableMap: Record<string, string> = {}
  if (activeStep.table) {
    activeStep.table.forEach((row) => {
      tableMap[row.key] = row.value
    })
  }

  // Parse working variables if available
  const workingRegisters = [
    { name: 'A', value: tableMap['A'] || tableMap['new a'] || tableMap['TT1 (new A)'] || '—' },
    { name: 'B', value: tableMap['B'] || '—' },
    { name: 'C', value: tableMap['C'] || '—' },
    { name: 'D', value: tableMap['D'] || '—' },
    { name: 'E', value: tableMap['E'] || tableMap['new e'] || tableMap['P0(TT2) (new E)'] || '—' },
    { name: 'F', value: tableMap['F'] || '—' },
    { name: 'G', value: tableMap['G'] || '—' },
    { name: 'H', value: tableMap['H'] || '—' },
  ]

  const roundNum = currentStep >= 6 && currentStep <= 69 ? currentStep - 6 : null

  return (
    <div className="flex flex-col gap-6 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-100 pb-4 dark:border-zinc-800">
        <div>
          <h3 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            <Cpu className="h-5 w-5 text-teal-600 dark:text-teal-400" />
            SM3 Compression Engine Pipeline
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            GB/T 32905-2016 64-round ARX transformation & bitwise XOR state update pipeline.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-teal-50 border border-teal-200 px-3 py-1 text-xs font-mono font-semibold text-teal-700 dark:bg-teal-950/40 dark:border-teal-900 dark:text-teal-300">
            256-bit Digest
          </span>
          <span className="rounded-full bg-zinc-100 border border-zinc-200 px-3 py-1 text-xs font-mono font-medium text-zinc-600 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-300">
            512-bit Block
          </span>
        </div>
      </div>

      {/* Execution Stage Breadcrumbs */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 select-none text-xs">
        <div
          className={`flex items-center justify-center p-2 rounded-lg border font-medium text-center transition-all ${
            isPaddingStage
              ? 'border-teal-500 bg-teal-500/10 text-teal-700 dark:text-teal-300 ring-1 ring-teal-500'
              : 'border-zinc-200 bg-zinc-50/50 text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950/20 dark:text-zinc-400'
          }`}
        >
          1. Padding & Length
        </div>
        <div
          className={`flex items-center justify-center p-2 rounded-lg border font-medium text-center transition-all ${
            isIvStage
              ? 'border-teal-500 bg-teal-500/10 text-teal-700 dark:text-teal-300 ring-1 ring-teal-500'
              : 'border-zinc-200 bg-zinc-50/50 text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950/20 dark:text-zinc-400'
          }`}
        >
          2. IV Registers
        </div>
        <div
          className={`flex items-center justify-center p-2 rounded-lg border font-medium text-center transition-all ${
            isScheduleStage
              ? 'border-teal-500 bg-teal-500/10 text-teal-700 dark:text-teal-300 ring-1 ring-teal-500'
              : 'border-zinc-200 bg-zinc-50/50 text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950/20 dark:text-zinc-400'
          }`}
        >
          3. Message W & W'
        </div>
        <div
          className={`flex items-center justify-center p-2 rounded-lg border font-medium text-center transition-all ${
            isRoundsStage
              ? 'border-teal-500 bg-teal-500/10 text-teal-700 dark:text-teal-300 ring-1 ring-teal-500'
              : 'border-zinc-200 bg-zinc-50/50 text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950/20 dark:text-zinc-400'
          }`}
        >
          4. 64 ARX Rounds
        </div>
        <div
          className={`flex items-center justify-center p-2 rounded-lg border font-medium text-center transition-all ${
            isXorStateStage || isFinalStage
              ? 'border-teal-500 bg-teal-500/10 text-teal-700 dark:text-teal-300 ring-1 ring-teal-500'
              : 'border-zinc-200 bg-zinc-50/50 text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950/20 dark:text-zinc-400'
          }`}
        >
          5. State XOR Update
        </div>
      </div>

      {/* Main Interactive Inspector Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Working Registers Panel (7 columns) */}
        <div className="lg:col-span-7 flex flex-col gap-4 bg-zinc-50/60 p-4 rounded-xl border border-zinc-200 dark:bg-zinc-950/30 dark:border-zinc-800">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
              <Binary className="h-4 w-4 text-teal-600 dark:text-teal-400" />
              Working Registers (A..H)
            </h4>
            {roundNum !== null && (
              <span className="text-2xs font-mono font-bold text-teal-600 dark:text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded border border-teal-500/30">
                Round {roundNum} / 63 ({roundNum < 16 ? 'FF/GG XOR' : 'FF/GG Maj/Choice'})
              </span>
            )}
          </div>

          {/* 8 Registers Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {workingRegisters.map((reg) => (
              <motion.div
                key={reg.name}
                layout
                className={`flex flex-col p-2.5 rounded-lg border transition-all ${
                  reg.value !== '—'
                    ? 'bg-white border-teal-500/30 text-zinc-900 dark:bg-zinc-900 dark:border-teal-500/40 dark:text-zinc-100 shadow-xs'
                    : 'bg-zinc-100/60 border-zinc-200 text-zinc-400 dark:bg-zinc-900/20 dark:border-zinc-800'
                }`}
              >
                <span className="text-[10px] font-mono font-bold text-teal-600 dark:text-teal-400">
                  Register {reg.name}
                </span>
                <span className="font-mono text-xs font-semibold tracking-wide truncate mt-0.5">
                  {reg.value}
                </span>
              </motion.div>
            ))}
          </div>

          {/* Round Specific Calculation Variables (SS1, SS2, TT1, TT2, W_j, W'_j) */}
          {isRoundsStage && (
            <div className="mt-2 border-t border-zinc-200/80 pt-3 dark:border-zinc-800/80 flex flex-col gap-2">
              <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
                Round Variables & Message Words:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 font-mono text-xs">
                <div className="bg-white p-2 rounded border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 flex flex-col">
                  <span className="text-[10px] text-zinc-400">W[{roundNum}]</span>
                  <span className="font-bold text-teal-600 dark:text-teal-400 truncate">
                    {tableMap[`W[${roundNum}]`] || '—'}
                  </span>
                </div>
                <div className="bg-white p-2 rounded border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 flex flex-col">
                  <span className="text-[10px] text-zinc-400">W'[{roundNum}]</span>
                  <span className="font-bold text-teal-600 dark:text-teal-400 truncate">
                    {tableMap[`W'[${roundNum}]`] || '—'}
                  </span>
                </div>
                <div className="bg-white p-2 rounded border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 flex flex-col">
                  <span className="text-[10px] text-zinc-400">SS1</span>
                  <span className="font-bold text-indigo-600 dark:text-indigo-400 truncate">
                    {tableMap['SS1'] || '—'}
                  </span>
                </div>
                <div className="bg-white p-2 rounded border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 flex flex-col">
                  <span className="text-[10px] text-zinc-400">SS2</span>
                  <span className="font-bold text-indigo-600 dark:text-indigo-400 truncate">
                    {tableMap['SS2'] || '—'}
                  </span>
                </div>
                <div className="bg-white p-2 rounded border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 flex flex-col">
                  <span className="text-[10px] text-zinc-400">TT1 (new A)</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 truncate">
                    {tableMap['TT1 (new A)'] || '—'}
                  </span>
                </div>
                <div className="bg-white p-2 rounded border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 flex flex-col">
                  <span className="text-[10px] text-zinc-400">P0(TT2) (new E)</span>
                  <span className="font-bold text-amber-600 dark:text-amber-400 truncate">
                    {tableMap['P0(TT2) (new E)'] || '—'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Step Note & Technical Formula Reference (5 columns) */}
        <div className="lg:col-span-5 flex flex-col gap-4 bg-white p-4 rounded-xl border border-zinc-200 dark:bg-zinc-900/60 dark:border-zinc-800 justify-between">
          <div>
            <span className="text-2xs font-semibold uppercase tracking-wider text-teal-600 dark:text-teal-400 block mb-1">
              Active Step Telemetry
            </span>
            <h4 className="text-sm font-bold text-zinc-900 dark:text-white">
              {activeStep.label}
            </h4>
            <p className="mt-2 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
              {activeStep.note}
            </p>
          </div>

          {/* Educational Formula Reference Box */}
          <div className="rounded-lg bg-zinc-50 p-3 border border-zinc-200/80 dark:bg-zinc-950/40 dark:border-zinc-800/80 text-2xs space-y-1.5 font-mono text-zinc-600 dark:text-zinc-400">
            <div className="font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1 font-sans">
              <ShieldCheck className="h-3.5 w-3.5 text-teal-500" />
              SM3 Core Specifications
            </div>
            <div>
              <span className="text-teal-600 dark:text-teal-400 font-bold">P0(X):</span> X ⊕ (X ≪ 9) ⊕ (X ≪ 17)
            </div>
            <div>
              <span className="text-teal-600 dark:text-teal-400 font-bold">P1(X):</span> X ⊕ (X ≪ 15) ⊕ (X ≪ 23)
            </div>
            <div>
              <span className="text-teal-600 dark:text-teal-400 font-bold">State Update:</span> V<sup>(i+1)</sup> = V<sup>(i)</sup> ⊕ (A..H)
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
