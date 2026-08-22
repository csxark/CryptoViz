'use client'
import type { InteractiveByte } from '@/lib/attacks/interactiveStepper'

export default function AttackMemoryGrid({ bytes }: { bytes: InteractiveByte[] }) {
  return (
    <div className="grid grid-cols-4 gap-2 sm:grid-cols-8 md:grid-cols-16">
      {bytes.map((byte) => (
        <div key={byte.index}
          className={`rounded border p-2 text-center font-mono text-xs ${
            byte.status === 'recovered'
              ? 'border-emerald-400 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300'
              : byte.status === 'testing'
                ? 'border-amber-400 bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-300'
                : 'border-zinc-200 bg-white text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900'
          }`}>
          <div className="text-[10px] opacity-60">[{byte.index}]</div>
          {byte.status === 'recovered' ? `0x${byte.value!.toString(16).padStart(2,'0')}` :
            byte.status === 'testing' ? `0x${(byte.guess ?? 0).toString(16).padStart(2,'0')}` : 'Unknown'}
          <div className="mt-1 text-[9px] uppercase">{byte.status}</div>
        </div>
      ))}
    </div>
  )
}
