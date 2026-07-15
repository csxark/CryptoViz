'use client'

import { useRef, useState, type KeyboardEvent } from 'react'

interface PlayfairGridProps {
  matrix?: string[][] | string
  highlights?: number[] // Indices or coords to highlight
}

export default function PlayfairGrid({ matrix, highlights = [] }: PlayfairGridProps) {
  const [focusedIndex, setFocusedIndex] = useState(0)
  const cellRefs = useRef<Array<HTMLDivElement | null>>([])

  // If the matrix is passed as a flat string or 1D array, construct a 2D array
  let grid: string[][] = []
  if (typeof matrix === 'string') {
    const chars = matrix.split('')
    for (let i = 0; i < 5; i++) {
      grid.push(chars.slice(i * 5, i * 5 + 5))
    }
  } else if (matrix) {
    grid = matrix
  }

  // Derived (not stored) so a shrinking grid can never leave focusedIndex
  // pointing at a cell that no longer exists — no effect/setState needed.
  const isValidGrid =
    grid.length === 5 &&
    grid.every((row) => row.length === 5) &&
    (typeof matrix !== 'string' || matrix.length === 25)

  if (!isValidGrid) return null

  const maxIndex = 24
  const clampedFocusedIndex = Math.min(focusedIndex, maxIndex)
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>, rIdx: number, cIdx: number) => {
    let nextRow = rIdx
    let nextCol = cIdx

    switch (event.key) {
      case 'ArrowRight':
        nextCol = Math.min(cIdx + 1, 4)
        break
      case 'ArrowLeft':
        nextCol = Math.max(cIdx - 1, 0)
        break
      case 'ArrowDown':
        nextRow = Math.min(rIdx + 1, grid.length - 1)
        break
      case 'ArrowUp':
        nextRow = Math.max(rIdx - 1, 0)
        break
      case 'Home':
        nextRow = 0
        nextCol = 0
        break
      case 'End':
        nextRow = grid.length - 1
        nextCol = 4
        break
      default:
        return
    }

    event.preventDefault()
    const nextIndex = nextRow * 5 + nextCol
    setFocusedIndex(nextIndex)
    cellRefs.current[nextIndex]?.focus()
  }

  return (
    <div className="flex flex-col items-center justify-center p-4">
      <h5 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
        Playfair 5x5 Matrix (I/J Shared)
      </h5>
      <div
        role="grid"
        aria-label="Playfair 5x5 key square"
        className="flex flex-col gap-2 rounded-xl border border-zinc-200 bg-zinc-50/50 p-3 dark:border-zinc-800 dark:bg-zinc-950/30"
      >
        {grid.map((row, rIdx) => (
          <div key={rIdx} role="row" className="flex gap-2">
            {row.map((char, cIdx) => {
              const flatIdx = rIdx * 5 + cIdx
              const isHighlighted = highlights.includes(flatIdx)
              const isTabbable = flatIdx === clampedFocusedIndex

              return (
                <div
                  key={flatIdx}
                  ref={(el) => {
                    cellRefs.current[flatIdx] = el
                  }}
                  role="gridcell"
                  aria-label={`Row ${rIdx + 1}, column ${cIdx + 1}: ${char}${isHighlighted ? ', highlighted' : ''}`}
                  aria-selected={isHighlighted}
                  tabIndex={isTabbable ? 0 : -1}
                  onFocus={() => setFocusedIndex(flatIdx)}
                  onKeyDown={(event) => handleKeyDown(event, rIdx, cIdx)}
                  className={`flex h-12 w-12 items-center justify-center rounded-lg border font-mono text-lg font-bold transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 dark:focus:ring-offset-zinc-900 ${
                    isHighlighted
                      ? 'border-teal-500 bg-teal-50 text-teal-700 shadow-md shadow-teal-500/10 dark:border-teal-400 dark:bg-teal-950/50 dark:text-teal-400'
                      : 'border-zinc-200 bg-white text-zinc-800 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200'
                  }`}
                >
                  {char}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
