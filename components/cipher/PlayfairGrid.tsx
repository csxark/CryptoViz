'use client'

import { useMemo, useRef,useState, type KeyboardEvent } from 'react'
import { narratePlayfairMatrix, narrateGridCell } from '@/lib/accessibility/narrator'

interface PlayfairGridProps {
  matrix?: string[][] | string
  highlights?: number[]
}

function normalizeMatrix(
  matrix?: string[][] | string,
): string[][] {
  if (typeof matrix === 'string') {
    const chars = matrix.split('')

    return Array.from({ length: 5 }, (_, rowIndex) =>
      chars.slice(rowIndex * 5, rowIndex * 5 + 5),
    )
  }

  if (matrix) {
    return matrix
  }

  return []
}

export default function PlayfairGrid({
  matrix,
  highlights = [],
}: PlayfairGridProps) {
  const [focusedIndex, setFocusedIndex] = useState(0)
  const [textMode, setTextMode] = useState(false)

  const cellRefs = useRef<
    Array<HTMLDivElement | null>
  >([])

  const grid = useMemo(
    () => normalizeMatrix(matrix),
    [matrix],
  )

  const isValidGrid =
    grid.length === 5 &&
    grid.every((row) => row.length === 5) &&
    (typeof matrix !== 'string' ||
      matrix.length === 25)

  const clampedFocusedIndex = Math.min(
    focusedIndex,
    24,
  )

  const matrixDescription = useMemo(
    () => narratePlayfairMatrix(grid, highlights),
    [grid, highlights],
  )

  if (!isValidGrid) return null

  const handleKeyDown = (
    event: KeyboardEvent<HTMLDivElement>,
    rowIndex: number,
    columnIndex: number,
  ) => {
    let nextRow = rowIndex
    let nextColumn = columnIndex

    switch (event.key) {
      case 'ArrowRight':
        nextColumn = Math.min(
          columnIndex + 1,
          4,
        )
        break

      case 'ArrowLeft':
        nextColumn = Math.max(
          columnIndex - 1,
          0,
        )
        break

      case 'ArrowDown':
        nextRow = Math.min(
          rowIndex + 1,
          grid.length - 1,
        )
        break

      case 'ArrowUp':
        nextRow = Math.max(
          rowIndex - 1,
          0,
        )
        break

      case 'Home':
        nextRow = 0
        nextColumn = 0
        break

      case 'End':
        nextRow = grid.length - 1
        nextColumn = 4
        break

      default:
        return
    }

    event.preventDefault()

    const nextIndex =
      nextRow * 5 + nextColumn

    setFocusedIndex(nextIndex)
    cellRefs.current[nextIndex]?.focus()
  }

  return (
    <div className="flex flex-col items-center justify-center p-4">
      <div className="mb-3 flex w-full max-w-md items-center justify-between gap-3">
        <h5 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
          Playfair 5x5 Matrix (I/J Shared)
        </h5>

        <button
          type="button"
          onClick={() => setTextMode((current) => !current)}
          aria-pressed={textMode}
          className="shrink-0 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-zinc-700 transition-colors hover:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-teal-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          {textMode
            ? 'Visual View'
            : 'Text / Tactile View'}
        </button>
      </div>

      {/* Screen-reader summary */}
      <p className="sr-only">
        {matrixDescription}
      </p>

      {textMode ? (
        <div className="w-full max-w-md rounded-xl border border-zinc-200 bg-zinc-50/50 p-3 dark:border-zinc-800 dark:bg-zinc-950/30">
          <div className="mb-3">
            <h6 className="text-sm font-semibold text-zinc-900 dark:text-white">
              Text / Tactile Representation
            </h6>

            <p className="mt-1 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
              Use the table to navigate the Playfair
              key square by row and column.
            </p>
          </div>

          <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
            <table className="w-full min-w-[280px] border-collapse text-center text-sm">
              <caption className="sr-only">
                Playfair 5 by 5 key square. Each
                cell contains one letter. Highlighted
                cells are marked as selected.
              </caption>

              <thead>
                <tr className="bg-zinc-100 dark:bg-zinc-900">
                  <th
                    scope="col"
                    className="border-b border-r border-zinc-200 px-3 py-2 text-xs font-semibold text-zinc-500 dark:border-zinc-800 dark:text-zinc-400"
                  >
                    Row
                  </th>

                  {[1, 2, 3, 4, 5].map(
                    (column) => (
                      <th
                        key={column}
                        scope="col"
                        className="border-b border-zinc-200 px-3 py-2 text-xs font-semibold text-zinc-500 dark:border-zinc-800 dark:text-zinc-400"
                      >
                        {column}
                      </th>
                    ),
                  )}
                </tr>
              </thead>

              <tbody>
                {grid.map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    <th
                      scope="row"
                      className="border-r border-zinc-200 bg-zinc-100 px-3 py-2 text-xs font-semibold text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400"
                    >
                      {rowIndex + 1}
                    </th>

                    {row.map(
                      (char, columnIndex) => {
                        const flatIndex =
                          rowIndex * 5 +
                          columnIndex

                        const highlighted =
                          highlights.includes(
                            flatIndex,
                          )

                        return (
                          <td
                            key={flatIndex}
                            aria-label={narrateGridCell(
                              rowIndex,
                              columnIndex,
                              char,
                              highlighted,
                            )}
                            className={`border-t border-zinc-200 px-3 py-2 font-mono font-bold dark:border-zinc-800 ${
                              highlighted
                                ? 'diff-highlight border-2 border-[var(--diff-highlight-border)] bg-[var(--diff-highlight-bg)] text-[color:var(--diff-highlight-fg)] shadow-sm'
                                : 'bg-white text-zinc-800 dark:bg-zinc-950 dark:text-zinc-200'
                            }`}
                          >
                            {char || '—'}
                            {highlighted && (
                              <span className="sr-only">
                                , highlighted
                              </span>
                            )}
                          </td>
                        )
                      },
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-3 rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900/50">
            <p className="text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
              <span className="font-semibold text-zinc-900 dark:text-zinc-200">
                Navigation:
              </span>{' '}
              Screen-reader and keyboard users can
              move through the matrix using the
              table navigation provided by the browser
              and assistive technology.
            </p>
          </div>
        </div>
      ) : (
        <div
          role="grid"
          aria-label="Playfair 5x5 key square"
          aria-rowcount={5}
          aria-colcount={5}
          className="flex flex-col gap-2 rounded-xl border border-zinc-200 bg-zinc-50/50 p-3 dark:border-zinc-800 dark:bg-zinc-950/30"
        >
          {grid.map((row, rowIndex) => (
            <div
              key={rowIndex}
              role="row"
              aria-rowindex={rowIndex + 1}
              className="flex gap-2"
            >
              {row.map((char, columnIndex) => {
                const flatIndex =
                  rowIndex * 5 +
                  columnIndex

                const isHighlighted =
                  highlights.includes(
                    flatIndex,
                  )

                const isTabbable =
                  flatIndex ===
                  clampedFocusedIndex

                return (
                  <div
                    key={flatIndex}
                    ref={(element) => {
                      cellRefs.current[
                        flatIndex
                      ] = element
                    }}
                    role="gridcell"
                    aria-rowindex={
                      rowIndex + 1
                    }
                    aria-colindex={
                      columnIndex + 1
                    }
                    aria-label={narrateGridCell(
                      rowIndex,
                      columnIndex,
                      char,
                      isHighlighted,
                    )}
                    aria-selected={
                      isHighlighted
                    }
                    tabIndex={
                      isTabbable ? 0 : -1
                    }
                    onFocus={() =>
                      setFocusedIndex(
                        flatIndex,
                      )
                    }
                    onKeyDown={(event) =>
                      handleKeyDown(
                        event,
                        rowIndex,
                        columnIndex,
                      )
                    }
                    className={`flex h-12 w-12 items-center justify-center rounded-lg border font-mono text-lg font-bold transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 dark:focus:ring-offset-zinc-900 ${
                      isHighlighted
                        ? 'diff-highlight border-2 border-[var(--diff-highlight-border)] bg-[var(--diff-highlight-bg)] text-[color:var(--diff-highlight-fg)] shadow-md'
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
      )}

      {/* Keyboard instructions */}
      <p className="sr-only">
        In visual mode, use the arrow keys to move
        between cells. Home moves to the first cell
        and End moves to the last cell. The current
        cell is announced with its row, column, value,
        and highlighted state.
      </p>
    </div>
  )
}