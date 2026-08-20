'use client'

/**
 * ByteHeatmap — a per-byte grid that highlights which bytes of an output
 * changed after a single-bit input flip. Changed bytes are tinted by how many
 * of their 8 bits differ, so the diffusion pattern is visible at a glance.
 *
 * Accessibility contract (GUIDELINES.md § ByteHeatmap):
 *   Every cell exposes
 *   `aria-label="Byte ${index}: ${hex} (${changed ? 'changed' : 'unchanged'})"`.
 *   The grid is keyboard-navigable with Tab + arrow keys (roving tabindex).
 */

import { useCallback, useRef, useState } from 'react'
import type { ByteCell } from '../../lib/utils/bitDiff'

interface ByteHeatmapProps {
  bytes: ByteCell[]
  /** Grid columns; defaults to 8 for a compact square-ish layout. */
  columns?: number
  /** Accessible name for the whole grid. */
  label?: string
}

/** Tailwind background classes keyed by how many bits changed in a byte. */
function cellTone(cell: ByteCell): string {
  if (!cell.changed) {
    return 'border border-zinc-200 bg-zinc-100 text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-400'
  }

  // Use one WCAG-AA palette for changed bytes and encode intensity with the
  // border geometry so the heatmap never relies on hue alone.
  if (cell.changedBits >= 6) {
    return 'diff-highlight border-2 border-[var(--diff-highlight-border)] bg-[var(--diff-highlight-bg)] text-[color:var(--diff-highlight-fg)]'
  }
  if (cell.changedBits >= 4) {
    return 'diff-highlight border-2 border-dashed border-[var(--diff-highlight-border)] bg-[var(--diff-highlight-bg)] text-[color:var(--diff-highlight-fg)]'
  }
  if (cell.changedBits >= 2) {
    return 'diff-highlight border-2 border-dotted border-[var(--diff-highlight-border)] bg-[var(--diff-highlight-bg)] text-[color:var(--diff-highlight-fg)]'
  }
  return 'diff-highlight border border-[var(--diff-highlight-border)] bg-[var(--diff-highlight-bg)] text-[color:var(--diff-highlight-fg)]'
}

export default function ByteHeatmap({
  bytes,
  columns = 8,
  label = 'Output byte diff heatmap',
}: ByteHeatmapProps) {
  const [focusIndex, setFocusIndex] = useState(0)
  const cellRefs = useRef<(HTMLDivElement | null)[]>([])

  const focusCell = useCallback((index: number) => {
    const clamped = Math.max(0, Math.min(bytes.length - 1, index))
    setFocusIndex(clamped)
    cellRefs.current[clamped]?.focus()
  }, [bytes.length])

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>, index: number) => {
      switch (event.key) {
        case 'ArrowRight':
          event.preventDefault()
          focusCell(index + 1)
          break
        case 'ArrowLeft':
          event.preventDefault()
          focusCell(index - 1)
          break
        case 'ArrowDown':
          event.preventDefault()
          focusCell(index + columns)
          break
        case 'ArrowUp':
          event.preventDefault()
          focusCell(index - columns)
          break
        case 'Home':
          event.preventDefault()
          focusCell(0)
          break
        case 'End':
          event.preventDefault()
          focusCell(bytes.length - 1)
          break
        default:
          break
      }
    },
    [columns, focusCell, bytes.length],
  )

  if (bytes.length === 0) {
    return null
  }

  return (
    <div
      role="grid"
      aria-label={label}
      className="grid gap-1"
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
    >
      {bytes.map((cell, index) => (
        <div
          key={cell.index}
          ref={(node) => {
            cellRefs.current[index] = node
          }}
          role="gridcell"
          tabIndex={index === focusIndex ? 0 : -1}
          aria-label={`Byte ${cell.index}: ${cell.hex} (${cell.changed ? 'changed' : 'unchanged'})`}
          onKeyDown={(event) => handleKeyDown(event, index)}
          onFocus={() => setFocusIndex(index)}
          className={`relative flex aspect-square items-center justify-center rounded-md font-mono text-[11px] font-semibold tabular-nums outline-none transition-colors focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-1 dark:focus-visible:ring-offset-zinc-950 ${cellTone(cell)}`}
        >
          {cell.hex}
          {cell.changed && (
            <span
              aria-hidden="true"
              className="absolute bottom-0.5 right-0.5 h-1.5 w-1.5 rounded-full bg-[var(--diff-highlight-pattern)]"
            />
          )}
        </div>
      ))}
    </div>
  )
}
