'use client'

import { useRef } from 'react'
import type { KeyboardEvent } from 'react'
import type { InteractiveByte } from '@/lib/attacks/interactiveStepper'

export default function AttackMemoryGrid({ bytes }: { bytes: InteractiveByte[] }) {
  const cellRefs = useRef<Array<HTMLDivElement | null>>([])

  const focusCell = (index: number) => {
    const target = Math.min(Math.max(index, 0), bytes.length - 1)
    cellRefs.current[target]?.focus()
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>, index: number) => {
    const columns = event.currentTarget.parentElement?.clientWidth
      ? Math.max(1, Math.floor(event.currentTarget.parentElement.clientWidth / 72))
      : 1
    let next = index
    switch (event.key) {
      case 'ArrowRight':
        next = index + 1
        break
      case 'ArrowLeft':
        next = index - 1
        break
      case 'ArrowDown':
        next = index + columns
        break
      case 'ArrowUp':
        next = index - columns
        break
      case 'Home':
        next = event.ctrlKey ? 0 : Math.floor(index / columns) * columns
        break
      case 'End':
        next = event.ctrlKey ? bytes.length - 1 : Math.min(bytes.length - 1, Math.floor(index / columns) * columns + columns - 1)
        break
      default:
        return
    }
    event.preventDefault()
    focusCell(next)
  }

  return (
    <div
      role="grid"
      aria-label="Attack memory byte grid"
      aria-roledescription="cipher step trace"
      aria-rowcount={bytes.length ? Math.ceil(bytes.length / 4) : 0}
      className="grid grid-cols-4 gap-2 sm:grid-cols-8 md:grid-cols-16"
    >
      {bytes.map((byte, index) => {
        const value = byte.status === 'recovered'
          ? `0x${byte.value!.toString(16).padStart(2, '0')}`
          : byte.status === 'testing'
            ? `0x${(byte.guess ?? 0).toString(16).padStart(2, '0')}`
            : 'Unknown'

        return (
          <div
            key={byte.index}
            ref={(element) => { cellRefs.current[index] = element }}
            role="gridcell"
            tabIndex={index === 0 ? 0 : -1}
            aria-rowindex={Math.floor(index / 4) + 1}
            aria-colindex={(index % 4) + 1}
            aria-label={`Byte ${byte.index}, ${byte.status}, value ${value}`}
            onKeyDown={(event) => handleKeyDown(event, index)}
            className={`rounded border p-2 text-center font-mono text-xs focus:outline-none focus:ring-2 focus:ring-teal-400 ${
              byte.status === 'recovered'
                ? 'border-emerald-400 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300'
                : byte.status === 'testing'
                  ? 'border-amber-400 bg-amber-50 text-amber-800 dark:bg-amber-500/30 dark:text-amber-300'
                  : 'border-zinc-200 bg-white text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900'
            }`}
          >
            <div aria-hidden="true" className="text-[10px] opacity-60">[{byte.index}]</div>
            <span aria-hidden="true">{value}</span>
            <div aria-hidden="true" className="mt-1 text-[9px] uppercase">{byte.status}</div>
          </div>
        )
      })}
    </div>
  )
}
