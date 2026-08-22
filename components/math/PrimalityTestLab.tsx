'use client'

import { useMemo, useState } from 'react'
import { bailliePSW, CARMICHAEL_NUMBERS, fermatTest, millerRabinTrace, randomOddCandidate, type MillerRabinTrace } from '../../lib/math/primality'

const BASES = [2n, 3n, 5n, 7n, 11n]

export default function PrimalityTestLab() {
  const [candidate, setCandidate] = useState('561')
  const [rounds, setRounds] = useState(5)
  const [trace, setTrace] = useState<MillerRabinTrace | null>(null)
  const [error, setError] = useState('')
  const [fermatBase, setFermatBase] = useState('2')

  const value = useMemo(() => { try { return BigInt(candidate.trim()) } catch { return null } }, [candidate])
  const fermat = value !== null && value >= 2n ? (() => { try { return fermatTest(value, BigInt(fermatBase || '2')) } catch { return null } })() : null
  const bpsw = value !== null && value >= 2n ? bailliePSW(value) : null

  function run(next = value) {
    if (next === null || next < 2n) { setTrace(null); setError('Enter an integer n ≥ 2.'); return }
    setTrace(millerRabinTrace(next, BASES.slice(0, Math.max(1, Math.min(5, rounds)))))
    setError('')
  }

  function generate() {
    const next = randomOddCandidate(32)
    setCandidate(next.toString())
    run(next)
  }

  return <div className="space-y-6">
    <section className="grid gap-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 lg:grid-cols-[1.2fr_0.8fr]">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-600 dark:text-teal-400">Interactive number inspector</p>
        <h2 className="mt-2 text-3xl font-bold">Miller-Rabin & Baillie-PSW</h2>
        <p className="mt-3 text-sm leading-6 text-zinc-600 dark:text-zinc-400">Trace probabilistic primality testing, Fermat witnesses, Carmichael traps, and the strong Lucas step behind Baillie-PSW.</p>
        <div className="mt-5 grid gap-4 sm:grid-cols-[1fr_auto_auto]">
          <label className="text-sm font-medium">Candidate n<input aria-label="Candidate n" value={candidate} onChange={e => setCandidate(e.target.value)} className="mt-2 w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 font-mono dark:border-zinc-700" /></label>
          <label className="text-sm font-medium">MR rounds<select aria-label="Miller-Rabin rounds" value={rounds} onChange={e => setRounds(Number(e.target.value))} className="mt-2 rounded-lg border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700">{[1,2,3,4,5].map(k => <option key={k} value={k}>{k}</option>)}</select></label>
          <button type="button" onClick={generate} className="self-end rounded-lg bg-teal-600 px-4 py-2 text-sm font-bold text-white hover:bg-teal-700">Random 32-bit odd</button>
        </div>
        <button type="button" onClick={() => run()} className="mt-4 rounded-lg border border-teal-300 px-4 py-2 text-sm font-bold text-teal-700 dark:text-teal-300">Run Miller-Rabin</button>
        {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
      </div>
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-900/60 dark:bg-amber-950/30">
        <p className="text-sm font-bold text-amber-800 dark:text-amber-200">Live error bound</p>
        <p className="mt-2 text-3xl font-black">{((trace?.confidence ?? 0) * 100).toFixed(5)}%</p>
        <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">For k passing rounds, the educational Miller-Rabin bound is 4⁻ᵏ, giving confidence 1 − 4⁻ᵏ.</p>
      </div>
    </section>

    {trace && <section className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex flex-wrap items-end justify-between gap-4"><div><h3 className="text-xl font-bold">Step-by-step Miller-Rabin</h3><p className="mt-1 font-mono text-sm">{trace.n.toString()} − 1 = 2^{trace.s} × {trace.d.toString()}</p></div><span className={`rounded-full px-3 py-1 text-sm font-bold ${trace.probablePrime ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{trace.probablePrime ? 'Probable prime' : 'Composite'}</span></div>
      <div className="mt-5 overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b border-zinc-200 dark:border-zinc-800"><th className="p-3">Base a</th><th className="p-3">aᵈ mod n</th><th className="p-3">Successive squares</th><th className="p-3">Classification</th></tr></thead><tbody>{trace.rounds.map(r => <tr key={r.base.toString()} className="border-b border-zinc-100 align-top dark:border-zinc-800"><td className="p-3 font-mono">{r.base.toString()}</td><td className="p-3 font-mono">{r.initialPower.toString()}</td><td className="p-3 font-mono">{r.squarings.length ? r.squarings.map(x => x.toString()).join(' → ') : '—'}</td><td className={`p-3 font-semibold ${r.passes ? 'text-amber-600' : 'text-red-600'}`}>{r.passes ? 'Strong pseudoprime / passing base' : 'Composite witness'}</td></tr>)}</tbody></table></div>
    </section>}

    <section className="grid gap-6 lg:grid-cols-2">
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900"><h3 className="text-xl font-bold">Carmichael number trap explorer</h3><p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">These composites can fool Fermat's test for base 2.</p><div className="mt-4 grid gap-2 sm:grid-cols-2">{CARMICHAEL_NUMBERS.map(n => { const f = fermatTest(n, 2n); const mr = millerRabinTrace(n, [2n]); return <button key={n.toString()} type="button" onClick={() => { setCandidate(n.toString()); setTrace(mr) }} className="rounded-xl border border-zinc-200 p-4 text-left hover:border-teal-400 dark:border-zinc-800"><p className="font-mono text-lg font-bold">n = {n.toString()}</p><p className="mt-1 text-xs text-zinc-500">Fermat: {f.passes ? 'passes' : 'fails'} · Miller-Rabin: {mr.probablePrime ? 'passes' : 'witness found'}</p></button> })}</div></div>
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900"><h3 className="text-xl font-bold">Fermat vs Baillie-PSW</h3><label className="mt-4 block text-sm font-medium">Fermat base<input value={fermatBase} onChange={e => setFermatBase(e.target.value)} className="mt-2 w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 font-mono dark:border-zinc-700" /></label>{fermat && <div className="mt-4 grid gap-3 text-sm"><div className="rounded-xl bg-zinc-50 p-4 dark:bg-zinc-950"><b>Fermat:</b> {fermat.passes ? 'passes' : 'composite'} ({fermat.result.toString()})</div><div className="rounded-xl bg-zinc-50 p-4 dark:bg-zinc-950"><b>Baillie-PSW:</b> {bpsw?.probablePrime ? 'probable prime' : 'composite / rejected'}</div></div>}<p className="mt-4 text-xs leading-5 text-zinc-500">Baillie-PSW combines base-2 strong Miller-Rabin with a Selfridge strong Lucas test. It is a probable-prime test, not a formal primality proof.</p></div>
    </section>
  </div>
}
