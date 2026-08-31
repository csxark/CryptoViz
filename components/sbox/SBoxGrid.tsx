'use client'

import {
  memo,
  useCallback,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
} from 'react'

interface SBoxGridProps {
  grid: number[][]
  activeRow: number | null
  activeCol: number | null
  label: string
  format?: 'hex' | 'decimal'
  onCellSelect?: (row: number, col: number) => void
}

interface SBoxCellProps {
  row: number
  col: number
  value: number
  format: 'hex' | 'decimal'
  active: boolean
  activeLine: boolean
  tabbable: boolean
  onSelect?: (row: number, col: number) => void
  onNavigate: (
    event: KeyboardEvent<HTMLButtonElement>,
    row: number,
    col: number,
  ) => void
  onFocus: (row: number, col: number) => void
  register: (row: number, col: number, element: HTMLButtonElement | null) => void
}

function formatValue(value: number, format: 'hex' | 'decimal'): string {
  return format === 'hex' ? value.toString(16).padStart(2, '0') : String(value)
}

/**
 * Individual cells are memoized because an S-box contains up to 256 cells.
 * A lookup normally changes only one row, one column, and one selected cell.
 * Keeping the cell component isolated means React can retain the other cells
 * instead of reconciling 256 button subtrees for every lookup change.
 */
const SBoxCell = memo(function SBoxCell({
  row,
  col,
  value,
  format,
  active,
  activeLine,
  tabbable,
  onSelect,
  onNavigate,
  onFocus,
  register,
}: SBoxCellProps) {
  const handleClick = useCallback(
    (_event: MouseEvent<HTMLButtonElement>) => {
      onSelect?.(row, col)
    },
    [col, onSelect, row],
  )

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>) => {
      onNavigate(event, row, col)
    },
    [col, onNavigate, row],
  )

  const handleFocus = useCallback(() => {
    onFocus(row, col)
  }, [col, onFocus, row])

  const handleRef = useCallback(
    (element: HTMLButtonElement | null) => {
      register(row, col, element)
    },
    [col, register, row],
  )

  return (
    <td
      role="gridcell"
      className={`border-b border-zinc-100 p-0 dark:border-zinc-800/60 ${
        activeLine ? 'bg-teal-500/5' : ''
      }`}
    >
      <button
        ref={handleRef}
        type="button"
        tabIndex={tabbable ? 0 : -1}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        aria-selected={active}
        aria-pressed={active}
        aria-label={`Row ${row}, column ${col}: output ${formatValue(value, format)}`}
        className={`h-7 w-7 rounded-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-1 dark:focus-visible:ring-offset-zinc-950 sm:h-8 sm:w-8 ${
          active
            ? 'bg-teal-500 font-bold text-white'
            : 'text-zinc-700 hover:bg-teal-500/20 dark:text-zinc-300'
        }`}
      >
        {formatValue(value, format)}
      </button>
    </td>
  )
}, areCellPropsEqual)

function areCellPropsEqual(
  previous: Readonly<SBoxCellProps>,
  next: Readonly<SBoxCellProps>,
): boolean {
  return (
    previous.row === next.row &&
    previous.col === next.col &&
    previous.value === next.value &&
    previous.format === next.format &&
    previous.active === next.active &&
    previous.activeLine === next.activeLine &&
    previous.tabbable === next.tabbable &&
    previous.onSelect === next.onSelect &&
    previous.onNavigate === next.onNavigate &&
    previous.onFocus === next.onFocus &&
    previous.register === next.register
  )
}

export default function SBoxGrid({
  grid,
  activeRow,
  activeCol,
  label,
  format = 'hex',
  onCellSelect,
}: SBoxGridProps) {
  const rowCount = grid.length
  const colCount = grid[0]?.length ?? 0

  const [focusedCell, setFocusedCell] = useState<{ row: number; col: number }>({
    row: activeRow ?? 0,
    col: activeCol ?? 0,
  })

  const cellRefs = useRef<Map<string, HTMLButtonElement | null>>(new Map())

  const effectiveRow =
    activeRow !== null
      ? activeRow
      : Math.min(focusedCell.row, Math.max(0, rowCount - 1))
  const effectiveCol =
    activeCol !== null
      ? activeCol
      : Math.min(focusedCell.col, Math.max(0, colCount - 1))

  const registerCell = useCallback(
    (row: number, col: number, element: HTMLButtonElement | null) => {
      cellRefs.current.set(`${row}-${col}`, element)
    },
    [],
  )

  const focusCell = useCallback(
    (row: number, col: number) => {
      const clampedRow = Math.max(0, Math.min(rowCount - 1, row))
      const clampedCol = Math.max(0, Math.min(colCount - 1, col))
      setFocusedCell({ row: clampedRow, col: clampedCol })
      cellRefs.current.get(`${clampedRow}-${clampedCol}`)?.focus()
    },
    [rowCount, colCount],
  )

  const handleFocus = useCallback((row: number, col: number) => {
    setFocusedCell({ row, col })
  }, [])

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>, row: number, col: number) => {
      let nextRow = row
      let nextCol = col

      switch (event.key) {
        case 'ArrowRight':
          nextCol = Math.min(col + 1, colCount - 1)
          break
        case 'ArrowLeft':
          nextCol = Math.max(col - 1, 0)
          break
        case 'ArrowDown':
          nextRow = Math.min(row + 1, rowCount - 1)
          break
        case 'ArrowUp':
          nextRow = Math.max(row - 1, 0)
          break
        case 'Home':
          nextRow = 0
          nextCol = 0
          break
        case 'End':
          nextRow = rowCount - 1
          nextCol = colCount - 1
          break
        default:
          return
      }

      event.preventDefault()
      focusCell(nextRow, nextCol)
    },
    [colCount, focusCell, rowCount],
  )

  if (rowCount === 0 || colCount === 0) return null

  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
      <table
        role="grid"
        aria-label={label}
        className="w-full border-collapse text-center font-mono text-[11px] sm:text-xs"
      >
        <thead>
          <tr role="row">
            <th
              scope="col"
              className="border-b border-r border-zinc-200 bg-zinc-50 p-1.5 text-zinc-400 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-500"
            >
              row \ col
            </th>
            {Array.from({ length: colCount }, (_, col) => (
              <th
                key={col}
                scope="col"
                className={`border-b border-zinc-200 p-1.5 font-semibold transition-colors dark:border-zinc-800 ${
                  col === activeCol
                    ? 'bg-teal-500/15 text-teal-700 dark:text-teal-300'
                    : 'text-zinc-500 dark:text-zinc-400'
                }`}
              >
                {col.toString(16)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {grid.map((row, rowIndex) => (
            <tr key={rowIndex} role="row">
              <th
                scope="row"
                className={`border-r border-zinc-200 p-1.5 font-semibold transition-colors dark:border-zinc-800 ${
                  rowIndex === activeRow
                    ? 'bg-teal-500/15 text-teal-700 dark:text-teal-300'
                    : 'text-zinc-500 dark:text-zinc-400'
                }`}
              >
                {rowIndex.toString(16)}
              </th>
              {row.map((value, colIndex) => {
                const active =
                  rowIndex === activeRow && colIndex === activeCol
                const activeLine =
                  rowIndex === activeRow || colIndex === activeCol
                const tabbable =
                  rowIndex === effectiveRow && colIndex === effectiveCol

                return (
                  <SBoxCell
                    key={colIndex}
                    row={rowIndex}
                    col={colIndex}
                    value={value}
                    format={format}
                    active={active}
                    activeLine={activeLine}
                    tabbable={tabbable}
                    onSelect={onCellSelect}
                    onNavigate={handleKeyDown}
                    onFocus={handleFocus}
                    register={registerCell}
                  />
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
