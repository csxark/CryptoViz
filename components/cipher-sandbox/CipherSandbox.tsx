'use client'

import React, { useState, useMemo } from 'react'
import {
  CipherPipelineStage,
  executeCipherPipeline,
  calculateAvalancheEffect,
  calculateFrequencyAnalysis,
  validatePipelineInvertibility,
  CaesarStageConfig,
  AffineStageConfig,
  XorStageConfig,
  PBoxStageConfig,
  ColumnarStageConfig,
  BlockSwapStageConfig,
  CyclicShiftStageConfig,
  ReverseStageConfig,
  SBoxStageConfig,
} from '@/lib/cipher/sandbox/cipherSandboxEngine'
import { CIPHER_PRESETS, CipherPreset } from '@/lib/cipher/sandbox/presets'
import {
  Play,
  ArrowUp,
  ArrowDown,
  Trash2,
  Plus,
  Lock,
  Unlock,
  Layers,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Copy,
  Download,
  Upload,
  BarChart2,
  Activity,
  Eye,
  RefreshCw,
  Sliders,
} from 'lucide-react'

export default function CipherSandbox() {
    const [selectedPresetId, setSelectedPresetId] = useState<string>('spn_2round')
    const [input, setInput] = useState<string>('CRYPTOGRAPHY')
    const [direction, setDirection] = useState<'encrypt' | 'decrypt'>('encrypt')
    const [rounds, setRounds] = useState<number>(2)
    const [copied, setCopied] = useState<boolean>(false)
    const [activeTab, setActiveTab] = useState<'trace' | 'metrics' | 'export'>('trace')

    // Stages State
    const [stages, setStages] = useState<CipherPipelineStage[]>(
      CIPHER_PRESETS[0].stages
    )

    // Load Preset Handler
    const handleSelectPreset = (presetId: string) => {
      setSelectedPresetId(presetId)
      const preset = CIPHER_PRESETS.find((p) => p.id === presetId)
      if (preset) {
        setStages(JSON.parse(JSON.stringify(preset.stages)))
        setInput(preset.defaultInput)
        setRounds(preset.rounds)
      }
    }

    // Stage Manipulation
    const handleAddStage = (category: 'substitution' | 'permutation', subType: string) => {
      const newId = `stage-${Date.now()}`
      let newStage: CipherPipelineStage

      if (category === 'substitution') {
        if (subType === 'caesar') {
          newStage = {
            id: newId,
            name: 'Caesar Shift',
            category: 'substitution',
            subType: 'caesar',
            shift: 3,
            enabled: true,
          }
        } else if (subType === 'affine') {
          newStage = {
            id: newId,
            name: 'Affine Transform',
            category: 'substitution',
            subType: 'affine',
            a: 5,
            b: 8,
            enabled: true,
          }
        } else if (subType === 'xor') {
          newStage = {
            id: newId,
            name: 'XOR Key',
            category: 'substitution',
            subType: 'xor',
            key: 'KEY',
            enabled: true,
          }
        } else {
          newStage = {
            id: newId,
            name: 'S-Box Mapping',
            category: 'substitution',
            subType: 'sbox',
            mapping: { A: 'Q', B: 'W', C: 'E', D: 'R', E: 'T' },
            enabled: true,
          }
        }
      } else {
        if (subType === 'pbox') {
          newStage = {
            id: newId,
            name: 'P-Box Permutation',
            category: 'permutation',
            subType: 'pbox',
            blockSize: 4,
            permutation: [2, 0, 3, 1],
            enabled: true,
          }
        } else if (subType === 'columnar') {
          newStage = {
            id: newId,
            name: 'Columnar Transposition',
            category: 'permutation',
            subType: 'columnar',
            columns: 3,
            keyOrder: [2, 0, 1],
            enabled: true,
          }
        } else if (subType === 'block_swap') {
          newStage = {
            id: newId,
            name: 'Block Swap',
            category: 'permutation',
            subType: 'block_swap',
            blockSize: 2,
            enabled: true,
          }
        } else if (subType === 'cyclic_shift') {
          newStage = {
            id: newId,
            name: 'Cyclic Shift',
            category: 'permutation',
            subType: 'cyclic_shift',
            shift: 2,
            enabled: true,
          }
        } else {
          newStage = {
            id: newId,
            name: 'Reverse State',
            category: 'permutation',
            subType: 'reverse',
            blockLength: 0,
            enabled: true,
          }
        }
      }

      setStages([...stages, newStage])
    }

    const handleMoveStage = (index: number, dir: 'up' | 'down') => {
      const targetIdx = dir === 'up' ? index - 1 : index + 1
      if (targetIdx < 0 || targetIdx >= stages.length) return
      const newStages = [...stages]
      const temp = newStages[index]
      newStages[index] = newStages[targetIdx]
      newStages[targetIdx] = temp
      setStages(newStages)
    }

    const handleRemoveStage = (index: number) => {
      setStages(stages.filter((_, idx) => idx !== index))
    }

    const handleToggleStage = (index: number) => {
      const newStages = [...stages]
      newStages[index] = { ...newStages[index], enabled: !newStages[index].enabled }
      setStages(newStages)
    }

    const handleUpdateStage = (index: number, updatedProps: Partial<CipherPipelineStage>) => {
      const newStages = [...stages]
      newStages[index] = { ...newStages[index], ...updatedProps } as CipherPipelineStage
      setStages(newStages)
    }

    // Execution & Metrics Computation
    const result = useMemo(() => {
      return executeCipherPipeline(input, stages, direction, rounds)
    }, [input, stages, direction, rounds])

    const invertibility = useMemo(() => {
      return validatePipelineInvertibility(stages)
    }, [stages])

    const avalanche = useMemo(() => {
      return calculateAvalancheEffect(input, stages, rounds)
    }, [input, stages, rounds])

    const frequency = useMemo(() => {
      return calculateFrequencyAnalysis(result.output)
    }, [result.output])

    // JSON Import & Export
    const handleExportJson = () => {
      const exportData = {
        name: 'Custom Sandbox Cipher',
        rounds,
        stages,
      }
      const jsonStr = JSON.stringify(exportData, null, 2)
      navigator.clipboard.writeText(jsonStr)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }

    const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string)
          if (parsed.stages && Array.isArray(parsed.stages)) {
            setStages(parsed.stages)
            if (parsed.rounds) setRounds(parsed.rounds)
          }
        } catch (err) {
          alert('Invalid JSON file format.')
        }
      }
      reader.readAsText(file)
    }

    return (
      <div className="space-y-8">
        {/* Top Presets & Controls Header */}
        <div className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900/80 shadow-sm md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400">
              Cipher Template Presets
            </label>
            <select
              value={selectedPresetId}
              onChange={(e) => handleSelectPreset(e.target.value)}
              className="block w-full md:w-80 rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm font-medium text-zinc-900 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
            >
              {CIPHER_PRESETS.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 dark:border-zinc-800 dark:bg-zinc-800">
              <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Rounds:</span>
              <input
                type="number"
                min={1}
                max={10}
                value={rounds}
                onChange={(e) => setRounds(Math.max(1, Math.min(10, parseInt(e.target.value) || 1)))}
                className="w-12 rounded border border-zinc-300 bg-white px-2 py-0.5 text-center text-sm font-bold text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
              />
            </div>

            <button
              onClick={() => setDirection(direction === 'encrypt' ? 'decrypt' : 'encrypt')}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all ${direction === 'encrypt'
                  ? 'bg-teal-600 text-white hover:bg-teal-700 dark:bg-teal-500 dark:hover:bg-teal-600'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600'
                }`}
            >
              {direction === 'encrypt' ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
              Mode: {direction === 'encrypt' ? 'Encryption' : 'Decryption'}
            </button>
          </div>
        </div>

        {/* Main Grid: Pipeline Builder (Left) & Output / Visualizer (Right) */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* Left Column: Pipeline Builder */}
          <div className="space-y-6 lg:col-span-7">
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900/80 shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-4">
                <div className="flex items-center gap-2">
                  <Layers className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                  <h2 className="text-lg font-bold text-zinc-900 dark:text-white">
                    Pipeline Stages ({stages.length})
                  </h2>
                </div>

                <div className="flex items-center gap-2">
                  {/* Add Stage Dropdown Menu */}
                  <div className="relative inline-block text-left">
                    <select
                      onChange={(e) => {
                        if (e.target.value) {
                          const [cat, sub] = e.target.value.split(':')
                          handleAddStage(cat as any, sub)
                          e.target.value = ''
                        }
                      }}
                      defaultValue=""
                      className="rounded-lg border border-teal-500/50 bg-teal-50 px-3 py-1.5 text-xs font-bold text-teal-700 hover:bg-teal-100 focus:outline-none dark:border-teal-500/30 dark:bg-teal-950/40 dark:text-teal-300 dark:hover:bg-teal-900/50"
                    >
                      <option value="" disabled>
                        + Add Stage...
                      </option>
                      <optgroup label="Substitution Layers (Confusion)">
                        <option value="substitution:caesar">Caesar Shift</option>
                        <option value="substitution:sbox">Custom S-Box</option>
                        <option value="substitution:affine">Affine Transform</option>
                        <option value="substitution:xor">XOR Key</option>
                      </optgroup>
                      <optgroup label="Permutation Layers (Diffusion)">
                        <option value="permutation:pbox">P-Box Permutation</option>
                        <option value="permutation:columnar">Columnar Transposition</option>
                        <option value="permutation:block_swap">Block Swap</option>
                        <option value="permutation:cyclic_shift">Cyclic Shift</option>
                        <option value="permutation:reverse">Reverse State</option>
                      </optgroup>
                    </select>
                  </div>
                </div>
              </div>

              {/* Stages List */}
              {stages.length === 0 ? (
                <div className="rounded-xl border border-dashed border-zinc-300 p-8 text-center dark:border-zinc-800">
                  <Sliders className="mx-auto h-8 w-8 text-zinc-400" />
                  <p className="mt-2 text-sm font-medium text-zinc-500 dark:text-zinc-400">
                    No stages added yet. Add a substitution or permutation block to build your cipher!
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {stages.map((stage, idx) => (
                    <div
                      key={stage.id}
                      className={`rounded-xl border p-4 transition-all ${stage.enabled
                          ? stage.category === 'substitution'
                            ? 'border-teal-500/30 bg-teal-500/5 dark:border-teal-500/20 dark:bg-teal-950/20'
                            : 'border-indigo-500/30 bg-indigo-500/5 dark:border-indigo-500/20 dark:bg-indigo-950/20'
                          : 'border-zinc-200 bg-zinc-50 opacity-60 dark:border-zinc-800 dark:bg-zinc-900'
                        }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={stage.enabled}
                            onChange={() => handleToggleStage(idx)}
                            className="h-4 w-4 rounded border-zinc-300 text-teal-600 focus:ring-teal-500"
                          />
                          <div>
                            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                              Stage {idx + 1} • {stage.category}
                            </span>
                            <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                              {stage.name}
                            </h3>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleMoveStage(idx, 'up')}
                            disabled={idx === 0}
                            className="rounded p-1 text-zinc-400 hover:bg-zinc-200 hover:text-zinc-700 disabled:opacity-30 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                            title="Move stage up"
                          >
                            <ArrowUp className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleMoveStage(idx, 'down')}
                            disabled={idx === stages.length - 1}
                            className="rounded p-1 text-zinc-400 hover:bg-zinc-200 hover:text-zinc-700 disabled:opacity-30 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                            title="Move stage down"
                          >
                            <ArrowDown className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleRemoveStage(idx)}
                            className="rounded p-1 text-red-500 hover:bg-red-100 hover:text-red-700 dark:hover:bg-red-950/50"
                            title="Delete stage"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      {/* Stage Specific Controls */}
                      {stage.enabled && (
                        <div className="mt-3 grid grid-cols-1 gap-3 pt-3 border-t border-zinc-200/60 dark:border-zinc-800/60 sm:grid-cols-2">
                          {stage.subType === 'caesar' && (
                            <div>
                              <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                                Shift Amount:
                              </label>
                              <input
                                type="number"
                                value={(stage as CaesarStageConfig).shift}
                                onChange={(e) =>
                                  handleUpdateStage(idx, { shift: parseInt(e.target.value) || 0 })
                                }
                                className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm font-semibold text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                              />
                            </div>
                          )}

                          {stage.subType === 'affine' && (
                            <>
                              <div>
                                <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                                  Multiplier (a):
                                </label>
                                <input
                                  type="number"
                                  value={(stage as AffineStageConfig).a}
                                  onChange={(e) =>
                                    handleUpdateStage(idx, { a: parseInt(e.target.value) || 1 })
                                  }
                                  className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm font-semibold text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                                />
                              </div>
                              <div>
                                <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                                  Shift (b):
                                </label>
                                <input
                                  type="number"
                                  value={(stage as AffineStageConfig).b}
                                  onChange={(e) =>
                                    handleUpdateStage(idx, { b: parseInt(e.target.value) || 0 })
                                  }
                                  className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm font-semibold text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                                />
                              </div>
                            </>
                          )}

                          {stage.subType === 'xor' && (
                            <div className="sm:col-span-2">
                              <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                                XOR Key String:
                              </label>
                              <input
                                type="text"
                                value={(stage as XorStageConfig).key}
                                onChange={(e) =>
                                  handleUpdateStage(idx, { key: e.target.value })
                                }
                                className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm font-semibold text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                              />
                            </div>
                          )}

                          {stage.subType === 'pbox' && (
                            <>
                              <div>
                                <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                                  Block Size:
                                </label>
                                <input
                                  type="number"
                                  min={2}
                                  max={8}
                                  value={(stage as PBoxStageConfig).blockSize}
                                  onChange={(e) => {
                                    const size = parseInt(e.target.value) || 4
                                    const defaultPerm = Array.from({ length: size }, (_, i) => size - 1 - i)
                                    handleUpdateStage(idx, { blockSize: size, permutation: defaultPerm })
                                  }}
                                  className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm font-semibold text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                                />
                              </div>
                              <div>
                                <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                                  Permutation Array (comma separated):
                                </label>
                                <input
                                  type="text"
                                  value={(stage as PBoxStageConfig).permutation.join(', ')}
                                  onChange={(e) => {
                                    const arr = e.target.value
                                      .split(',')
                                      .map((v) => parseInt(v.trim()))
                                      .filter((v) => !isNaN(v))
                                    handleUpdateStage(idx, { permutation: arr })
                                  }}
                                  className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm font-semibold text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                                />
                              </div>
                            </>
                          )}

                          {stage.subType === 'columnar' && (
                            <>
                              <div>
                                <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                                  Number of Columns:
                                </label>
                                <input
                                  type="number"
                                  min={2}
                                  max={10}
                                  value={(stage as ColumnarStageConfig).columns}
                                  onChange={(e) => {
                                    const cols = parseInt(e.target.value) || 3
                                    const defaultOrder = Array.from({ length: cols }, (_, i) => i)
                                    handleUpdateStage(idx, { columns: cols, keyOrder: defaultOrder })
                                  }}
                                  className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm font-semibold text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                                />
                              </div>
                              <div>
                                <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                                  Key Order [0..N-1]:
                                </label>
                                <input
                                  type="text"
                                  value={(stage as ColumnarStageConfig).keyOrder.join(', ')}
                                  onChange={(e) => {
                                    const arr = e.target.value
                                      .split(',')
                                      .map((v) => parseInt(v.trim()))
                                      .filter((v) => !isNaN(v))
                                    handleUpdateStage(idx, { keyOrder: arr })
                                  }}
                                  className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm font-semibold text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                                />
                              </div>
                            </>
                          )}

                          {stage.subType === 'block_swap' && (
                            <div>
                              <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                                Block Half Length:
                              </label>
                              <input
                                type="number"
                                min={1}
                                value={(stage as BlockSwapStageConfig).blockSize}
                                onChange={(e) =>
                                  handleUpdateStage(idx, { blockSize: parseInt(e.target.value) || 1 })
                                }
                                className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm font-semibold text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                              />
                            </div>
                          )}

                          {stage.subType === 'cyclic_shift' && (
                            <div>
                              <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                                Rotation Shift Count:
                              </label>
                              <input
                                type="number"
                                value={(stage as CyclicShiftStageConfig).shift}
                                onChange={(e) =>
                                  handleUpdateStage(idx, { shift: parseInt(e.target.value) || 0 })
                                }
                                className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm font-semibold text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Execution Output, Trace & Analysis */}
          <div className="space-y-6 lg:col-span-5">
            {/* Input / Output Card */}
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900/80 shadow-sm space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1">
                  Input Text ({direction})
                </label>
                <textarea
                  rows={2}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  className="w-full rounded-xl border border-zinc-300 bg-zinc-50 p-3 text-sm font-mono text-zinc-900 focus:border-teal-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                  placeholder="Type plaintext or ciphertext here..."
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400">
                    Output Result ({result.durationMs.toFixed(2)} ms)
                  </label>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(result.output)
                      setCopied(true)
                      setTimeout(() => setCopied(false), 2000)
                    }}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-500 hover:text-teal-600 dark:text-zinc-400 dark:hover:text-teal-300"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    {copied ? 'Copied!' : 'Copy Result'}
                  </button>
                </div>
                <div className="rounded-xl border border-teal-500/30 bg-teal-500/10 p-3 text-sm font-mono font-bold text-teal-900 dark:border-teal-500/20 dark:text-teal-200 break-all min-h-[48px] flex items-center">
                  {result.output || <span className="text-zinc-400 italic">No output</span>}
                </div>
              </div>

              {/* Invertibility Warning Banner */}
              {!invertibility.isInvertible && (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 dark:border-amber-500/20">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">
                        Invertibility Warning
                      </h4>
                      {invertibility.warnings.map((warn, i) => (
                        <p key={i} className="text-xs text-amber-700 dark:text-amber-400">
                          {warn}
                        </p>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Analysis & Visualization Tabs */}
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900/80 shadow-sm space-y-6">
              <div className="flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-3">
                <button
                  onClick={() => setActiveTab('trace')}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${activeTab === 'trace'
                      ? 'bg-teal-500/10 text-teal-600 dark:bg-teal-500/20 dark:text-teal-400'
                      : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white'
                    }`}
                >
                  <Eye className="h-4 w-4" />
                  Step Trace ({result.steps.length})
                </button>

                <button
                  onClick={() => setActiveTab('metrics')}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${activeTab === 'metrics'
                      ? 'bg-teal-500/10 text-teal-600 dark:bg-teal-500/20 dark:text-teal-400'
                      : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white'
                    }`}
                >
                  <Activity className="h-4 w-4" />
                  Security Metrics
                </button>

                <button
                  onClick={() => setActiveTab('export')}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${activeTab === 'export'
                      ? 'bg-teal-500/10 text-teal-600 dark:bg-teal-500/20 dark:text-teal-400'
                      : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white'
                    }`}
                >
                  <Download className="h-4 w-4" />
                  Export / Import
                </button>
              </div>

              {/* TAB 1: Step Trace Viewer */}
              {activeTab === 'trace' && (
                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
                  {result.steps.length === 0 ? (
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 italic text-center py-4">
                      No steps generated. Enable stages to see execution trace.
                    </p>
                  ) : (
                    result.steps.map((step) => (
                      <div
                        key={step.index}
                        className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-teal-600 dark:text-teal-400">
                            {step.label}
                          </span>
                          <span className="text-[10px] font-semibold text-zinc-400 uppercase">
                            {step.sublabel}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                          <div className="rounded bg-white p-2 border border-zinc-200 dark:bg-zinc-950 dark:border-zinc-800">
                            <span className="text-[10px] text-zinc-400 block mb-0.5">IN:</span>
                            <span className="break-all">{step.inputState}</span>
                          </div>
                          <div className="rounded bg-white p-2 border border-zinc-200 dark:bg-zinc-950 dark:border-zinc-800">
                            <span className="text-[10px] text-zinc-400 block mb-0.5">OUT:</span>
                            <span className="break-all text-teal-600 dark:text-teal-300 font-bold">
                              {step.outputState}
                            </span>
                          </div>
                        </div>

                        <p className="text-[11px] text-zinc-600 dark:text-zinc-400 italic">
                          {step.note}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* TAB 2: Security Metrics */}
              {activeTab === 'metrics' && (
                <div className="space-y-6">
                  {/* Avalanche Card */}
                  <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-white flex items-center gap-1.5">
                        <Sparkles className="h-4 w-4 text-teal-500" />
                        Avalanche Effect Metric
                      </h4>
                      <span className="text-sm font-extrabold text-teal-600 dark:text-teal-400">
                        {avalanche.bitFlipPct}%
                      </span>
                    </div>

                    <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                      Flipping 1 bit in the input input alters{' '}
                      <strong className="text-zinc-900 dark:text-white">
                        {avalanche.changedCharsCount} of {avalanche.totalChars}
                      </strong>{' '}
                      output characters ({avalanche.bitFlipPct}% bit change). High avalanche indicates strong diffusion!
                    </p>

                    <div className="w-full bg-zinc-200 rounded-full h-2 dark:bg-zinc-800 overflow-hidden">
                      <div
                        className="bg-teal-500 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, avalanche.bitFlipPct)}%` }}
                      />
                    </div>
                  </div>

                  {/* Symbol Frequency Histogram */}
                  <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900 space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-white flex items-center gap-1.5">
                      <BarChart2 className="h-4 w-4 text-teal-500" />
                      Ciphertext Symbol Distribution
                    </h4>

                    {frequency.length === 0 ? (
                      <p className="text-xs text-zinc-400 italic">No output text to analyze.</p>
                    ) : (
                      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                        {frequency.slice(0, 6).map((item, i) => (
                          <div key={i} className="flex items-center gap-2 text-xs font-mono">
                            <span className="w-6 font-bold text-teal-600 dark:text-teal-400">
                              {item.char}
                            </span>
                            <div className="flex-1 bg-zinc-200 dark:bg-zinc-800 rounded-full h-2 overflow-hidden">
                              <div
                                className="bg-teal-500 h-2 rounded-full"
                                style={{ width: `${Math.min(100, item.percentage * 2)}%` }}
                              />
                            </div>
                            <span className="w-12 text-right text-zinc-500 dark:text-zinc-400">
                              {item.percentage}%
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: Export & Import JSON */}
              {activeTab === 'export' && (
                <div className="space-y-4">
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                    Export your custom cipher block pipeline as JSON to share with others or restore later.
                  </p>

                  <div className="flex flex-col gap-3 sm:flex-row">
                    <button
                      onClick={handleExportJson}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-teal-700 transition-all"
                    >
                      <Copy className="h-4 w-4" />
                      {copied ? 'Copied JSON!' : 'Copy Pipeline JSON'}
                    </button>

                    <label className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-xs font-bold text-zinc-700 hover:bg-zinc-50 cursor-pointer dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700 transition-all">
                      <Upload className="h-4 w-4" />
                      Import JSON File
                      <input
                        type="file"
                        accept=".json"
                        onChange={handleImportJson}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }
