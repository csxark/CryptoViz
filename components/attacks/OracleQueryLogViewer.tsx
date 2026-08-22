'use client'

export interface OracleLogEntry {
  index: number
  label: string
  detail: string
  status?: 'valid' | 'invalid' | 'match' | 'info'
}
export default function OracleQueryLogViewer({ entries }: { entries: OracleLogEntry[] }) {
  return (
    <div className="max-h-72 overflow-y-auto rounded-lg bg-slate-950 p-3 font-mono text-xs text-slate-200">
      {entries.length === 0 ? <div className="text-slate-500">No queries executed yet.</div> : entries.map((entry) => (
        <div key={`${entry.index}-${entry.label}`} className="border-b border-slate-800 py-1.5 last:border-0">
          <span className="text-slate-500">#{entry.index + 1}</span>{' '}
          <span className={entry.status === 'valid' || entry.status === 'match' ? 'text-emerald-400' : entry.status === 'invalid' ? 'text-rose-400' : 'text-cyan-300'}>
            {entry.label}
          </span>{' '}
          <span className="text-slate-400">{entry.detail}</span>
        </div>
      ))}
    </div>
  )
}
