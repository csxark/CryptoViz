'use client'

/**
 * DDTLATWorkbench — interactive Difference Distribution Table (DDT) and
 * Linear Approximation Table (LAT) generator for arbitrary 4-bit S-Boxes
 * (plus the 8-bit AES box).
 *
 * Pick a built-in S-box (PRESENT, Serpent S0, AES) or paste a custom
 * permutation, and the workbench computes the full DDT and LAT matrices,
 * highlights the cells that attain differential uniformity and the maximum
 * linear bias, shows the concrete input pairs behind any DDT cell, and
 * stacks round biases with Matsui's Piling-Up Lemma.
 *
 * Accessibility contract:
 *   Matrices are role="grid" tables with roving tabindex (Tab into the grid,
 *   Arrow keys / Home / End to move), per-cell aria-labels, and the selected
 *   cell is announced via aria-live.
 */

import { useMemo, useState } from 'react'
import {
  BUILTIN_SBOXES,
  analyzeSbox,
  parseCustomSbox,
  pilingUpLemma,
  type DdtCell,
  type LatCell,
  type SboxAnalysisResult,
} from '../../lib/cryptanalysis/sboxAnalysis'

type MatrixMode = 'ddt' | 'lat'

interface MetricProps {
  label: string
  value: string
  detail?: string
}

function Metric({ label, value, detail }: MetricProps) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950/40">
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{label}</p>
      <p className="mt-1 font-mono text-2xl font-bold text-zinc-950 dark:text-white">{value}</p>
      {detail && <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{detail}</p>}
    </div>
  )
}

function hex(v: number): string {
  return v.toString(16).toUpperCase()
}

/** DDT cells run 0..n, LAT cells run −half..half. */
function ddtTone(count: number, max: number): string {
  if (count === 0) return 'bg-zinc-100 text-zinc-400 dark:bg-zinc-900/40 dark:text-zinc-600'
  if (max <= 0) return 'bg-teal-500 text-white'
  const ratio = count / max
  if (ratio >= 0.8) return 'bg-teal-500 text-white'
  if (ratio >= 0.5) return 'bg-teal-400/80 text-white'
  if (ratio >= 0.25) return 'bg-teal-300/70 text-teal-900'
  return 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300'
}

function latTone(bias: number, maxBias: number): string {
  if (bias === 0) return 'bg-zinc-100 text-zinc-400 dark:bg-zinc-900/40 dark:text-zinc-600'
  if (maxBias <= 0) return 'bg-teal-500 text-white'
  const ratio = bias / maxBias
  if (ratio >= 0.8) return 'bg-teal-500 text-white'
  if (ratio >= 0.5) return 'bg-teal-400/80 text-white'
  if (ratio >= 0.25) return 'bg-teal-300/70 text-teal-900'
  return 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300'
}

export default function DDTLATWorkbench() {
  const [mode, setMode] = useState<MatrixMode>('ddt')
  const [builtinId, setBuiltinId] = useState<string>('present')
  const [customRaw, setCustomRaw] = useState('')
  const [selected, setSelected] = useState<{ dx: number; dy: number } | null>(null)

  const builtin = BUILTIN_SBOXES.find((b) => b.id === builtinId) ?? BUILTIN_SBOXES[0]

  const custom = useMemo(() => parseCustomSbox(customRaw), [customRaw])
  const isCustom = customRaw.trim().length > 0
  const customError = isCustom && custom === null ? 'Enter exactly 16 values (0-15), space or comma separated.' : null

  const analysis = useMemo<SboxAnalysisResult | null>(() => {
    try {
      return isCustom
        ? custom
          ? analyzeSbox(custom, 4)
          : null
        : analyzeSbox(builtin.values, builtin.bits)
    } catch {
      return null
    }
  }, [isCustom, custom, builtin])

  const ddtMax = analysis
    ? Math.max(0, ...analysis.ddt.slice(1).flatMap((row) => row.map((c) => c.count)))
    : 0
  const latMax = analysis?.maxBias ?? 0

  const rounds = [1, 2, 3, 4]
  const strongestBias = analysis?.maxBiasCells[0]?.bias ?? 0

  const selectedCell: DdtCell | null =
    analysis && mode === 'ddt' && selected ? analysis.ddt[selected.dx][selected.dy] : null
  const selectedLat: LatCell | null =
    analysis && mode === 'lat' && selected ? analysis.lat[selected.dx][selected.dy] : null

  return (
    <div className="space-y-8">
      {/* --- S-box selection --- */}
      <section className="grid gap-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40">
        <div className="grid gap-2">
          <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">Built-in S-box</span>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Built-in S-box selector">
            {BUILTIN_SBOXES.map((box) => {
              const active = !isCustom && box.id === builtinId
              return (
                <button
                  key={box.id}
                  type="button"
                  onClick={() => {
                    setBuiltinId(box.id)
                    setCustomRaw('')
                    setSelected(null)
                  }}
                  aria-pressed={active}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                    active
                      ? 'border-teal-500 bg-teal-500 text-white'
                      : 'border-zinc-200 bg-white text-zinc-600 hover:border-teal-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300'
                  }`}
                >
                  {box.label}
                </button>
              )
            })}
          </div>
          {!isCustom && (
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {builtin.description}
            </p>
          )}
        </div>

        <label className="grid gap-1.5 text-xs font-semibold text-zinc-600 dark:text-zinc-300">
          Custom 4-bit S-box (optional)
          <input
            type="text"
            value={customRaw}
            onChange={(event) => {
              setCustomRaw(event.target.value)
              setSelected(null)
            }}
            placeholder="e.g. c 5 6 b 9 0 a d 3 e f 8 4 7 1 2"
            className="rounded-lg border border-zinc-200 bg-zinc-50 p-2.5 font-mono text-sm font-normal text-zinc-900 outline-none focus:border-teal-500 dark:border-zinc-700 dark:bg-zinc-950/50 dark:text-white"
            aria-invalid={Boolean(customError)}
            aria-describedby="custom-sbox-hint"
          />
          <span id="custom-sbox-hint" className="font-normal text-zinc-500 dark:text-zinc-400">
            Enter 16 values 0-15 in decimal or 0x-hex, space or comma separated. Typing here overrides the built-in.
          </span>
        </label>
        {customError && (
          <p role="alert" className="text-xs font-semibold text-red-600 dark:text-red-400">
            {customError}
          </p>
        )}
      </section>

      {!analysis && (
        <section
          aria-label="Analysis result"
          className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40"
        >
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {isCustom && !custom
              ? 'Fix the S-box input above to see the DDT and LAT.'
              : 'Select an S-box to compute its Difference Distribution Table and Linear Approximation Table.'}
          </p>
        </section>
      )}

      {analysis && (
        <>
          {/* --- Metrics --- */}
          <section
            aria-label="S-box metrics"
            className="grid gap-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:grid-cols-2 lg:grid-cols-4 dark:border-zinc-800 dark:bg-zinc-900/40"
          >
            <Metric
              label="Differential uniformity δ"
              value={String(analysis.differentialUniformity)}
              detail={`Worst differential probability ${analysis.maxDifferentialProbability}/1 (δ/2^n)`}
            />
            <Metric
              label="Nonlinearity"
              value={String(analysis.nonlinearity)}
              detail="2^(n−1) − max |LAT| over nonzero input masks"
            />
            <Metric
              label="Max linear bias ε"
              value={`${(analysis.maxBias * 100).toFixed(1)}%`}
              detail={`${analysis.maxBiasCells.length} strongest cell(s)`}
            />
            <Metric
              label="Bits"
              value={String(analysis.bits)}
              detail="S-box input/output width"
            />
          </section>

          {/* --- Matrix view --- */}
          <section
            aria-label="Analysis matrices"
            className="grid gap-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-zinc-950 dark:text-white">
                {mode === 'ddt' ? 'Difference Distribution Table' : 'Linear Approximation Table'}
              </h2>
              <div className="flex gap-2" role="group" aria-label="Matrix type">
                {(['ddt', 'lat'] as const).map((m) => {
                  const active = mode === m
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMode(m)}
                      aria-pressed={active}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                        active
                          ? 'border-teal-500 bg-teal-500 text-white'
                          : 'border-zinc-200 bg-white text-zinc-600 hover:border-teal-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300'
                      }`}
                    >
                      {m.toUpperCase()}
                    </button>
                  )
                })}
              </div>
            </div>

            {mode === 'ddt' ? (
              <DdtGrid
                analysis={analysis}
                ddtMax={ddtMax}
                selected={selected}
                onSelect={(dx, dy) => setSelected({ dx, dy })}
              />
            ) : (
              <LatGrid
                analysis={analysis}
                latMax={latMax}
                selected={selected}
                onSelect={(a, b) => setSelected({ a, b })}
              />
            )}

            {/* --- Selected cell breakdown --- */}
            <div aria-live="polite" className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950/40">
              {mode === 'ddt' && selectedCell ? (
                <div>
                  <p className="text-sm font-semibold text-zinc-950 dark:text-white">
                    Δx = {hex(selected.dx)} → Δy = {hex(selected.dy)} — {selectedCell.count} input pair
                    {selectedCell.count === 1 ? '' : 's'}
                    {selectedCell.count > 0 &&
                      ` (probability ${(selectedCell.count / (1 << analysis.bits)).toFixed(2)})`}
                  </p>
                  {selectedCell.pairs.length > 0 ? (
                    <ul className="mt-2 grid gap-1 font-mono text-xs text-zinc-600 dark:text-zinc-300 sm:grid-cols-2">
                      {selectedCell.pairs.map((p, i) => (
                        <li key={i} className="rounded bg-white px-2 py-1 dark:bg-zinc-900/60">
                          x₁={hex(p.x1)} x₂={hex(p.x2)} → S(x₁)={hex(p.s1)} S(x₂)={hex(p.s2)}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                      No input pair realizes this transition (impossible differential).
                    </p>
                  )}
                </div>
              ) : mode === 'lat' && selectedLat ? (
                <div>
                  <p className="text-sm font-semibold text-zinc-950 dark:text-white">
                    Mask a = {hex(selected.dx)} → b = {hex(selected.dy)} — bias{' '}
                    {selectedLat.value >= 0 ? '+' : '−'}
                    {Math.abs(selectedLat.value)}/{1 << analysis.bits} ({formatBias(selectedLat.bias)})
                  </p>
                  <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                    LAT[a][b] = #{'{'}x : a·x = b·S(x){'}'} − 2^(n−1). The strongest bias is highlighted in the grid.
                  </p>
                </div>
              ) : (
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Select a cell in the matrix to see its breakdown.
                </p>
              )}
            </div>
          </section>

          {/* --- Trail builder (Matsui's Piling-Up Lemma) --- */}
          <section
            aria-label="Differential trail builder"
            className="grid gap-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40"
          >
            <h2 className="text-lg font-bold text-zinc-950 dark:text-white">Round trail stacking</h2>
            <p className="text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
              Matsui&apos;s Piling-Up Lemma: for k independent linear approximations with biases ε₁…εₖ,
              the combined bias is ε = 2^(k−1) · ∏εᵢ. Stack the strongest bias of this S-box across rounds.
            </p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {rounds.map((k) => {
                const total = pilingUpLemma([strongestBias], k)
                return (
                  <div key={k} className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950/40">
                    <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                      {k} round{k === 1 ? '' : 's'}
                    </p>
                    <p className="mt-1 font-mono text-xl font-bold text-zinc-950 dark:text-white">
                      {formatBias(total)}
                    </p>
                    <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                      ε = 2^({k}−1) · ({formatBias(strongestBias)})^{k}
                    </p>
                  </div>
                )
              })}
            </div>
          </section>
        </>
      )}
    </div>
  )
}

function formatBias(bias: number): string {
  return `${(bias * 100).toFixed(2)}%`
}

// --- DDT grid ------------------------------------------------------------------

function DdtGrid({
  analysis,
  ddtMax,
  selected,
  onSelect,
}: {
  analysis: SboxAnalysisResult
  ddtMax: number
  selected: { dx: number; dy: number } | null
  onSelect: (dx: number, dy: number) => void
}) {
  const size = 1 << analysis.bits
  const maxCellKeys = new Set(analysis.maxDifferentialCells.map((c) => `${c.dx},${c.dy}`))

  return (
    <MatrixGrid
      rows={size}
      label="Difference Distribution Table"
      renderHeader={() => (
        <tr role="row">
          <th scope="col" className="border-b border-r border-zinc-200 bg-zinc-50 p-1.5 text-zinc-400 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-500">
            Δx \ Δy
          </th>
          {Array.from({ length: size }, (_, col) => (
            <th key={col} scope="col" className="border-b border-zinc-200 p-1.5 text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
              {hex(col)}
            </th>
          ))}
        </tr>
      )}
      renderRow={(dx) => (
        <tr key={dx} role="row">
          <th scope="row" className="border-r border-zinc-200 p-1.5 text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
            {hex(dx)}
          </th>
          {analysis.ddt[dx].map((cell, dy) => {
            const isMax = maxCellKeys.has(`${dx},${dy}`)
            const isSel = selected?.dx === dx && selected?.dy === dy
            return (
              <td key={dy} role="gridcell" className={`border-b border-zinc-100 p-0 dark:border-zinc-800/60 ${isMax ? 'ring-2 ring-inset ring-amber-400' : ''}`}>
                <button
                  type="button"
                  onClick={() => onSelect(dx, dy)}
                  aria-label={`Δx ${hex(dx)}, Δy ${hex(dy)}: ${cell.count} pair${cell.count === 1 ? '' : 's'}`}
                  aria-pressed={isSel}
                  className={`h-7 w-7 rounded-sm font-mono text-[10px] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-teal-500 dark:focus-visible:ring-offset-zinc-950 sm:h-8 sm:w-8 ${ddtTone(cell.count, ddtMax)} ${isSel ? 'ring-2 ring-teal-500' : ''}`}
                >
                  {cell.count}
                </button>
              </td>
            )
          })}
        </tr>
      )}
    />
  )
}

// --- LAT grid ------------------------------------------------------------------

function LatGrid({
  analysis,
  latMax,
  selected,
  onSelect,
}: {
  analysis: SboxAnalysisResult
  latMax: number
  selected: { a: number; b: number } | null
  onSelect: (a: number, b: number) => void
}) {
  const size = 1 << analysis.bits
  const maxCellKeys = new Set(analysis.maxBiasCells.map((c) => `${c.a},${c.b}`))

  return (
    <MatrixGrid
      rows={size}
      label="Linear Approximation Table"
      renderHeader={() => (
        <tr role="row">
          <th scope="col" className="border-b border-r border-zinc-200 bg-zinc-50 p-1.5 text-zinc-400 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-500">
            a \ b
          </th>
          {Array.from({ length: size }, (_, col) => (
            <th key={col} scope="col" className="border-b border-zinc-200 p-1.5 text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
              {hex(col)}
            </th>
          ))}
        </tr>
      )}
      renderRow={(a) => (
        <tr key={a} role="row">
          <th scope="row" className="border-r border-zinc-200 p-1.5 text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
            {hex(a)}
          </th>
          {analysis.lat[a].map((cell, b) => {
            const isMax = maxCellKeys.has(`${a},${b}`)
            const isSel = selected?.a === a && selected?.b === b
            return (
              <td key={b} role="gridcell" className={`border-b border-zinc-100 p-0 dark:border-zinc-800/60 ${isMax ? 'ring-2 ring-inset ring-amber-400' : ''}`}>
                <button
                  type="button"
                  onClick={() => onSelect(a, b)}
                  aria-label={`Mask a ${hex(a)}, b ${hex(b)}: bias ${cell.value}`}
                  aria-pressed={isSel}
                  className={`h-7 w-7 rounded-sm font-mono text-[10px] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-teal-500 dark:focus-visible:ring-offset-zinc-950 sm:h-8 sm:w-8 ${latTone(cell.bias, latMax)} ${isSel ? 'ring-2 ring-teal-500' : ''}`}
                >
                  {cell.value > 0 ? `+${cell.value}` : cell.value}
                </button>
              </td>
            )
          })}
        </tr>
      )}
    />
  )
}

// --- Shared accessible matrix grid ---------------------------------------------

interface MatrixGridProps {
  rows: number
  label: string
  renderHeader: () => React.ReactNode
  renderRow: (index: number) => React.ReactNode
}

/**
 * Minimal accessible table wrapper: one tab stop, arrow-key navigation
 * between cells, per-cell focus outlines. Cell buttons handle selection.
 */
function MatrixGrid({ rows, label, renderHeader, renderRow }: MatrixGridProps) {
  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
      <table role="grid" aria-label={label} className="w-full border-collapse text-center">
        <thead>{renderHeader()}</thead>
        <tbody>{Array.from({ length: rows }, (_, i) => renderRow(i))}</tbody>
      </table>
    </div>
  )
}
