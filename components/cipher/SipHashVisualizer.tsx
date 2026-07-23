'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowDown, HelpCircle, RefreshCw } from 'lucide-react'
import type { CipherStep } from '../../lib/cipher/types'
import { useSipHashStore } from '../../lib/store/siphashStore'

interface SipHashVisualizerProps {
  steps: CipherStep[]
  currentStep: number
  cRounds?: number
  dRounds?: number
}

// Helper to parse v0-v3 state from step outputState string
function parseRegisters(stateStr: string) {
  const defaultVal = '0000000000000000'
  if (!stateStr) return { v0: defaultVal, v1: defaultVal, v2: defaultVal, v3: defaultVal }
  
  const matchV0 = stateStr.match(/v0:([0-9a-fA-F]{16})/)
  const matchV1 = stateStr.match(/v1:([0-9a-fA-F]{16})/)
  const matchV2 = stateStr.match(/v2:([0-9a-fA-F]{16})/)
  const matchV3 = stateStr.match(/v3:([0-9a-fA-F]{16})/)
  
  return {
    v0: matchV0 ? matchV0[1] : defaultVal,
    v1: matchV1 ? matchV1[1] : defaultVal,
    v2: matchV2 ? matchV2[1] : defaultVal,
    v3: matchV3 ? matchV3[1] : defaultVal,
  }
}

// Convert a 16-character hex string to an array of 8 two-character byte strings
function hexToBytes(hex: string): string[] {
  const bytes: string[] = []
  for (let i = 0; i < 16; i += 2) {
    bytes.push(hex.substring(i, i + 2))
  }
  return bytes
}

// Helper to convert hex to binary array of length 64 (for bit matrix display)
function hexToBits(hex: string): number[] {
  const bits: number[] = []
  for (let i = 0; i < hex.length; i++) {
    const val = parseInt(hex[i], 16)
    for (let b = 3; b >= 0; b--) {
      bits.push((val >> b) & 1)
    }
  }
  return bits
}

export default function SipHashVisualizer({
  steps,
  currentStep: propCurrentStep,
  cRounds = 2,
  dRounds = 4,
}: SipHashVisualizerProps) {
  const store = useSipHashStore()
  const [hoveredRegister, setHoveredRegister] = useState<string | null>(null)

  // Synchronize prop currentStep to Zustand store
  useEffect(() => {
    store.setStep(propCurrentStep)
    store.setRounds(cRounds, dRounds)
  }, [propCurrentStep, cRounds, dRounds])

  if (!steps || steps.length === 0) return null

  const step = steps[store.currentStep]
  if (!step) return null

  const label = step.label
  const registers = parseRegisters(step.outputState || step.inputState)

  // Parse input message blocks from step table if present
  let blocks: string[] = []
  const blockTableRows = step.table?.filter(row => row.key.startsWith('Block m_')) || []
  if (blockTableRows.length > 0) {
    blocks = blockTableRows.map(row => {
      const match = row.value.match(/\(([^)]+)\)/)
      return match ? match[1] : '0000000000000000'
    })
  }

  // Determine current active block and operation highlight
  const isInitStep = label === 'State Initialization'
  const isPaddingStep = label === 'Padding & Chunking'
  const isV3XorStep = label.includes('Inject to v3')
  const isV0XorStep = label.includes('Inject to v0')
  const isRoundStep = label.includes('SipRound')
  const isFinalizeSetupStep = label.includes('Finalization Setup')
  const isFinalReductionStep = label === 'Final Tag Generation'

  // Extract current block index if active
  const blockIndexMatch = label.match(/Block m_(\d+)/)
  const activeBlockIdx = blockIndexMatch ? parseInt(blockIndexMatch[1], 10) : -1

  // Highlight specific registers based on current operation
  const highlightedRegisters = {
    v0: isInitStep || isV0XorStep || (isRoundStep && label.includes('SipRound')) || isFinalReductionStep,
    v1: isInitStep || (isRoundStep && label.includes('SipRound')) || isFinalReductionStep,
    v2: isInitStep || isFinalizeSetupStep || (isRoundStep && label.includes('SipRound')) || isFinalReductionStep,
    v3: isInitStep || isV3XorStep || (isRoundStep && label.includes('SipRound')) || isFinalReductionStep,
  }

  // Descriptions for registers
  const regDescriptions: Record<string, string> = {
    v0: 'Initialized with Key Word k0 ⊕ Constant "somepseu". Receives block XOR injection at the end of compression.',
    v1: 'Initialized with Key Word k1 ⊕ Constant "domorand". Permuted heavily during intermediate rounds.',
    v2: 'Initialized with Key Word k0 ⊕ Constant "lygenera". XORed with 0xff constant during finalization.',
    v3: 'Initialized with Key Word k1 ⊕ Constant "tedbytes". Receives block XOR injection at the start of compression.',
  }

  return (
    <div className="flex flex-col gap-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40">
      <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
        <div>
          <h4 className="text-sm font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400">
            SipHash-c-d State Machine
          </h4>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Step {store.currentStep + 1} of {steps.length}: {step.sublabel || 'Processing'}
          </p>
        </div>
        <div className="flex items-center gap-1.5 rounded-full bg-zinc-50 px-2.5 py-1 text-2xs font-semibold text-zinc-600 dark:bg-zinc-950/40 dark:text-zinc-400">
          <RefreshCw className={`h-3 w-3 ${isRoundStep ? 'animate-spin' : ''}`} />
          <span>c={cRounds}, d={dRounds}</span>
        </div>
      </div>

      {/* Message Blocks Visualizer */}
      <div className="flex flex-col gap-2 rounded-xl bg-zinc-50/50 p-4 dark:bg-zinc-950/20">
        <span className="text-2xs font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
          Input Message Blocks (64-bit Little Endian)
        </span>
        <div className="flex flex-wrap gap-2.5">
          {blocks.length === 0 ? (
            <div className="text-xs italic text-zinc-400">Loading message blocks...</div>
          ) : (
            blocks.map((block, idx) => {
              const isActive = idx === activeBlockIdx
              const isPadded = idx === blocks.length - 1
              return (
                <div key={idx} className="relative">
                  <motion.div
                    animate={isActive ? { scale: [1, 1.02, 1], borderColor: ['#14b8a6', '#0d9488', '#14b8a6'] } : {}}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                    className={`flex flex-col rounded-lg border-2 bg-white px-3.5 py-2 text-xs font-mono shadow-sm transition-colors dark:bg-zinc-900/60 ${
                      isActive
                        ? 'border-teal-500 bg-teal-50/20 text-teal-950 dark:bg-teal-950/20 dark:text-teal-300'
                        : 'border-zinc-200 text-zinc-700 dark:border-zinc-800 dark:text-zinc-300'
                    }`}
                  >
                    <span className="text-3xs font-bold uppercase text-zinc-400">
                      m_{idx} {isPadded ? '(padded)' : ''}
                    </span>
                    <span className="mt-0.5 font-bold">{block}</span>
                  </motion.div>

                  {/* Flow animation arrow */}
                  {isActive && (isV3XorStep || isV0XorStep) && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 5 }}
                      transition={{ repeat: Infinity, duration: 1, ease: 'easeInOut' }}
                      className="absolute -bottom-6 left-1/2 -translate-x-1/2"
                    >
                      <ArrowDown className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                    </motion.div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* 2x2 Registers Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {(['v0', 'v1', 'v2', 'v3'] as const).map((regKey) => {
          const isHighlighted = highlightedRegisters[regKey]
          const hexVal = registers[regKey]
          const bytes = hexToBytes(hexVal)
          const bits = hexToBits(hexVal)

          return (
            <div
              key={regKey}
              onMouseEnter={() => setHoveredRegister(regKey)}
              onMouseLeave={() => setHoveredRegister(null)}
              className={`relative flex flex-col justify-between overflow-hidden rounded-xl border-2 p-4 transition-all duration-300 ${
                isHighlighted
                  ? 'border-teal-500 bg-teal-50/10 shadow-md shadow-teal-500/5 dark:border-teal-400/40 dark:bg-teal-950/10'
                  : 'border-zinc-200 bg-zinc-50/20 dark:border-zinc-800 dark:bg-zinc-900/10'
              }`}
            >
              {/* Register Header */}
              <div className="flex items-center justify-between border-b border-zinc-100 pb-2 dark:border-zinc-800">
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-sm font-bold text-zinc-900 dark:text-white">
                    {regKey.toUpperCase()}
                  </span>
                  <span className="text-[10px] text-zinc-400 dark:text-zinc-500 uppercase">
                    (64-bit state)
                  </span>
                </div>
                <HelpCircle className="h-3.5 w-3.5 cursor-pointer text-zinc-400 hover:text-teal-500 transition-colors" />
              </div>

              {/* Hex Display */}
              <div className="mt-3 flex flex-col">
                <span className="font-mono text-base font-bold tracking-wide text-zinc-900 dark:text-white sm:text-lg">
                  0x{hexVal}
                </span>

                {/* Bytes breakdown */}
                <div className="mt-2.5 flex flex-wrap gap-1">
                  {bytes.map((byte, idx) => (
                    <span
                      key={idx}
                      className="rounded bg-zinc-100 px-1 py-0.5 font-mono text-3xs font-semibold text-zinc-600 dark:bg-zinc-850 dark:text-zinc-400 border border-zinc-200/50 dark:border-zinc-800/50"
                      title={`Byte ${idx}`}
                    >
                      {byte}
                    </span>
                  ))}
                </div>
              </div>

              {/* Bit Matrix Visualization (8x8 grid of dots) */}
              <div className="mt-4 flex flex-col gap-1.5">
                <div className="flex justify-between items-center text-[10px] text-zinc-400">
                  <span>Register Bit Grid</span>
                  <span className="font-mono">{bits.filter(b => b === 1).length} bits set</span>
                </div>
                <div className="grid grid-cols-8 gap-1 rounded bg-zinc-100/50 p-1.5 dark:bg-zinc-950/30">
                  {bits.map((bit, idx) => (
                    <span
                      key={idx}
                      className={`h-1.5 w-1.5 rounded-full transition-all duration-300 ${
                        bit === 1
                          ? 'bg-teal-500 shadow-sm shadow-teal-500/50'
                          : 'bg-zinc-300 dark:bg-zinc-800'
                      }`}
                      title={`Bit ${idx}`}
                    />
                  ))}
                </div>
              </div>

              {/* Tooltip Overlay */}
              <AnimatePresence>
                {hoveredRegister === regKey && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 z-10 flex flex-col justify-center bg-zinc-950/90 p-4 text-white backdrop-blur-sm"
                  >
                    <span className="font-bold text-xs text-teal-400">{regKey.toUpperCase()} Register Info</span>
                    <p className="mt-1 text-[11px] leading-relaxed text-zinc-300">
                      {regDescriptions[regKey]}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )
        })}
      </div>

      {/* ARX Operation Diagram */}
      <div className="rounded-xl border border-zinc-150 bg-zinc-50/30 p-4 dark:border-zinc-800 dark:bg-zinc-950/15">
        <h5 className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-3">
          Step Formula & Active Permutation
        </h5>
        
        <div className="font-mono text-xs flex flex-col gap-1.5 text-zinc-700 dark:text-zinc-300">
          {isInitStep && (
            <div className="flex flex-col gap-1">
              <span className="text-teal-600 dark:text-teal-400 font-bold">Initialization Formula:</span>
              <span>v0 = k0 ⊕ 0x736f6d6570736575 ("somepseu")</span>
              <span>v1 = k1 ⊕ 0x646f72616e646f6d ("domorand")</span>
              <span>v2 = k0 ⊕ 0x6c7967656e657261 ("lygenera")</span>
              <span>v3 = k1 ⊕ 0x7465646279746573 ("tedbytes")</span>
            </div>
          )}
          {isPaddingStep && (
            <div className="flex flex-col gap-1">
              <span className="text-teal-600 dark:text-teal-400 font-bold">Message Padding Rule:</span>
              <span>Blocks: m_0, m_1, ..., m_(w-1)</span>
              <span>Last byte of last block = message length mod 256</span>
              <span>Fills unused space with null bytes (0x00)</span>
            </div>
          )}
          {isV3XorStep && (
            <div className="flex flex-col gap-1">
              <span className="text-teal-600 dark:text-teal-400 font-bold">Block Injection (v3):</span>
              <span>v3 = v3 ⊕ m_{activeBlockIdx}</span>
              <span className="text-zinc-400 text-3xs">Mixing input block bytes into v3 register before running compression rounds</span>
            </div>
          )}
          {isV0XorStep && (
            <div className="flex flex-col gap-1">
              <span className="text-teal-600 dark:text-teal-400 font-bold">Block Injection (v0):</span>
              <span>v0 = v0 ⊕ m_{activeBlockIdx}</span>
              <span className="text-zinc-400 text-3xs">Mixing input block bytes into v0 register to seal the block compression</span>
            </div>
          )}
          {isRoundStep && (
            <div className="flex flex-col gap-1">
              <span className="text-teal-600 dark:text-teal-400 font-bold">SipRound Permutation (ARX):</span>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-1 text-[11px] text-zinc-500">
                <span>1. v0 += v1</span>
                <span>2. v1 = (v1 ≪ 13) ⊕ v0</span>
                <span>3. v0 = v0 ≪ 32</span>
                <span>4. v2 += v3</span>
                <span>5. v3 = (v3 ≪ 16) ⊕ v2</span>
                <span>6. v0 += v3</span>
                <span>7. v3 = (v3 ≪ 21) ⊕ v0</span>
                <span>8. v2 += v1</span>
                <span>9. v1 = (v1 ≪ 17) ⊕ v2</span>
                <span>10. v2 = v2 ≪ 32</span>
              </div>
            </div>
          )}
          {isFinalizeSetupStep && (
            <div className="flex flex-col gap-1">
              <span className="text-teal-600 dark:text-teal-400 font-bold">Finalization Padding Injection:</span>
              <span>v2 = v2 ⊕ 0xff</span>
              <span className="text-zinc-400 text-3xs">Applying padding block constant to isolate hash intermediate state</span>
            </div>
          )}
          {isFinalReductionStep && (
            <div className="flex flex-col gap-1">
              <span className="text-teal-600 dark:text-teal-400 font-bold">XOR Reduction Tag Output:</span>
              <span>Hash = v0 ⊕ v1 ⊕ v2 ⊕ v3</span>
              <span className="text-zinc-400 text-3xs">All 4 mixing registers combined to form the final 64-bit output tag</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
