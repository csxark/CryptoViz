'use client'

import { useState } from 'react'
import { runBB84, type BB84Result, type Basis } from '@/lib/quantum/bb84'

const basisGlyph = (b: Basis) => (b === 'rectilinear' ? '+' : '×')

export default function BB84Simulator() {
  const [numQubits, setNumQubits] = useState(24)
  const [eavesdropper, setEavesdropper] = useState(false)
  const [result, setResult] = useState<BB84Result | null>(null)

  function run() {
    const n = Math.max(1, Math.min(200, Math.floor(numQubits) || 1))
    setResult(runBB84({ numQubits: n, eavesdropper }))
  }

  return (
    <section className="mx-auto max-w-5xl space-y-6 px-4 py-8 text-slate-200">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold text-white">BB84 Quantum Key Distribution</h1>
        <p className="text-sm text-slate-400">
          Grover and Shor <em>break</em> cryptography; BB84 <em>builds</em> a shared key whose
          security rests on physics. Toggle the eavesdropper and watch the error rate betray her —
          measuring a qubit in the wrong basis unavoidably disturbs it.
        </p>
      </header>

      <div className="flex flex-wrap items-end gap-4 rounded-lg border border-slate-700 bg-slate-900/40 p-5">
        <label className="text-sm">Number of qubits
          <input
            type="number" min={1} max={200}
            className="mt-1 block w-28 rounded border border-slate-700 bg-slate-950 px-2 py-2"
            value={numQubits}
            onChange={(e) => setNumQubits(+e.target.value)}
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={eavesdropper} onChange={(e) => setEavesdropper(e.target.checked)} />
          Eve is intercepting (eavesdropper)
        </label>
        <button onClick={run} className="rounded bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-500">
          Run key exchange
        </button>
      </div>

      {result && (
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-slate-700 bg-slate-900/40 p-4">
              <div className="text-xs uppercase text-slate-500">Sifted key length</div>
              <div className="text-xl font-semibold text-white">{result.siftedLength}</div>
            </div>
            <div className="rounded-lg border border-slate-700 bg-slate-900/40 p-4">
              <div className="text-xs uppercase text-slate-500">QBER (error rate)</div>
              <div className="text-xl font-semibold text-white">{(result.errorRate * 100).toFixed(1)}%</div>
            </div>
            <div className={`rounded-lg border p-4 ${result.eavesdropperDetected ? 'border-red-500/60 bg-red-950/20' : 'border-emerald-500/50 bg-emerald-950/20'}`}>
              <div className="text-xs uppercase text-slate-500">Verdict</div>
              <div className="text-lg font-semibold text-white">
                {result.eavesdropperDetected ? '🚨 Eavesdropper — key discarded' : '✅ Key accepted'}
              </div>
            </div>
          </div>

          <ol className="space-y-2">
            {result.steps.map((s) => (
              <li key={s.index}
                className={`rounded-lg border p-3 ${s.isMilestone ? 'border-cyan-500/40 bg-cyan-950/20' : 'border-slate-700 bg-slate-900/30'}`}>
                <div className="font-medium text-white">{s.label}</div>
                <div className="text-sm text-slate-400">{s.detail}</div>
                {s.value && <div className="mt-1 font-mono text-xs text-emerald-300">{s.value}</div>}
              </li>
            ))}
          </ol>

          {result.siftedLength > 0 && (
            <div className="rounded-lg border border-slate-700 bg-slate-900/40 p-4">
              <div className="mb-2 text-sm font-semibold text-white">Shared sifted key (Alice)</div>
              <code className="break-all font-mono text-xs text-emerald-300">{result.siftedKey.join('')}</code>
            </div>
          )}

          <div className="overflow-x-auto rounded-lg border border-slate-700">
            <table className="min-w-full text-center font-mono text-xs">
              <thead className="bg-slate-900 text-slate-400">
                <tr>
                  <th className="px-2 py-2">#</th>
                  <th className="px-2 py-2">Alice bit</th>
                  <th className="px-2 py-2">Alice basis</th>
                  {eavesdropper && <th className="px-2 py-2">Eve basis</th>}
                  {eavesdropper && <th className="px-2 py-2">Eve bit</th>}
                  <th className="px-2 py-2">Bob basis</th>
                  <th className="px-2 py-2">Bob bit</th>
                  <th className="px-2 py-2">Sifted?</th>
                </tr>
              </thead>
              <tbody>
                {result.qubits.map((q) => (
                  <tr key={q.index}
                    className={q.error ? 'bg-red-950/30' : q.basesMatch ? 'bg-emerald-950/20' : ''}>
                    <td className="px-2 py-1 text-slate-500">{q.index}</td>
                    <td className="px-2 py-1">{q.aliceBit}</td>
                    <td className="px-2 py-1">{basisGlyph(q.aliceBasis)}</td>
                    {eavesdropper && <td className="px-2 py-1">{q.eveBasis ? basisGlyph(q.eveBasis) : ''}</td>}
                    {eavesdropper && <td className="px-2 py-1">{q.eveBit ?? ''}</td>}
                    <td className="px-2 py-1">{basisGlyph(q.bobBasis)}</td>
                    <td className={`px-2 py-1 ${q.error ? 'font-bold text-red-400' : ''}`}>{q.bobBit}</td>
                    <td className="px-2 py-1">{q.basesMatch ? (q.error ? '⚠️' : '✓') : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-500">
            Green rows survived sifting (bases matched); red rows are sifted positions where Bob&apos;s
            bit disagrees with Alice&apos;s — the signature of an eavesdropper.
          </p>
        </div>
      )}
    </section>
  )
}
