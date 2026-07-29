"use client"

import { useMemo, useState } from "react"
import { DEFAULT_MERKLE_PROOF_INPUT, buildMerkleProofManualChecklist, buildMerkleProofVisualization, parseMerkleLeaves, type MerkleProofInput } from "../../lib/hash/merkleProofVisualizer"

export default function MerkleProofDemo() {
  const [input, setInput] = useState<MerkleProofInput>(DEFAULT_MERKLE_PROOF_INPUT)
  const result = useMemo(() => {
    try { return { value: buildMerkleProofVisualization(input), error: null as string | null } }
    catch (caught) { return { value: null, error: caught instanceof Error ? caught.message : "Unable to build Merkle proof." } }
  }, [input])
  const leaves = parseMerkleLeaves(input.leavesText)
  const manualChecklist = buildMerkleProofManualChecklist()

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
        <header className="overflow-hidden rounded-3xl border border-white/10 bg-slate-900 shadow-2xl shadow-black/30">
          <div className="relative isolate px-6 py-10 sm:px-10">
            <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.25),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(34,197,94,0.18),transparent_32%)]" />
            <p className="text-sm font-semibold uppercase tracking-[0.32em] text-cyan-300">Hash structures</p>
            <div className="mt-4 grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
              <div>
                <h1 className="text-4xl font-black tracking-tight text-white sm:text-5xl">Merkle Proof Demonstration</h1>
                <p className="mt-5 max-w-3xl text-base leading-8 text-slate-300">Build a Merkle tree from transaction-like leaves, select one leaf, and verify that the proof path reconstructs the same root without needing every leaf in the tree.</p>
              </div>
              <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-5">
                <p className="text-sm font-bold text-cyan-100">Educational hash note</p>
                <p className="mt-2 text-sm leading-6 text-slate-300">This demo uses a deterministic toy hash so the tree is easy to inspect. Production Merkle trees should use a secure hash such as SHA-256.</p>
              </div>
            </div>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-[0.78fr_1.22fr]">
          <aside className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
            <h2 className="text-2xl font-black text-white">Leaves</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">Enter one leaf per line. Choose which leaf should receive a proof.</p>
            <label className="mt-6 block text-sm font-bold text-slate-200">Leaf values</label>
            <textarea value={input.leavesText} onChange={(event) => setInput({ leavesText: event.target.value, selectedLeafIndex: 0 })} className="mt-2 min-h-52 w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 font-mono text-sm text-white outline-none ring-cyan-400/40 focus:ring-2" />
            <div className="mt-6">
              <p className="text-sm font-bold text-slate-200">Select proof leaf</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {leaves.map((leaf, index) => (
                  <button key={`${leaf}-${index}`} type="button" onClick={() => setInput((current) => ({ ...current, selectedLeafIndex: index }))} className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${input.selectedLeafIndex === index ? "border-cyan-300/70 bg-cyan-300/10 text-cyan-100" : "border-white/10 text-slate-300 hover:border-cyan-300/60 hover:text-cyan-100"}`}>Leaf {index}</button>
                ))}
              </div>
            </div>
            <button type="button" onClick={() => setInput(DEFAULT_MERKLE_PROOF_INPUT)} className="mt-6 w-full rounded-xl border border-white/10 px-4 py-3 text-sm font-bold text-slate-200 transition hover:border-cyan-300/50 hover:text-cyan-100">Reset demo</button>
            {result.error ? <div role="alert" className="mt-5 rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-100">{result.error}</div> : null}
          </aside>

          <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
            <h2 className="text-2xl font-black text-white">Merkle root</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">The root commits to all leaves. If any leaf changes, the root changes.</p>
            <div className="mt-5 rounded-2xl border border-cyan-300/20 bg-cyan-400/10 p-5">
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-cyan-100">Root hash</p>
              <p className="mt-3 break-all font-mono text-2xl text-white">{result.value?.root ?? "—"}</p>
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-3">
              <Metric label="Leaves" value={result.value?.leaves.length ?? "—"} />
              <Metric label="Levels" value={result.value?.levels.length ?? "—"} />
              <Metric label="Proof steps" value={result.value?.proof.length ?? "—"} />
            </div>
          </section>
        </section>

        {result.value ? <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
          <h2 className="text-2xl font-black text-white">Tree levels</h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">Level 0 contains leaf hashes. Each higher level hashes pairs together until only the Merkle root remains.</p>
          <div className="mt-6 flex flex-col gap-5">
            {result.value.levels.map((level, levelIndex) => <div key={levelIndex} className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
              <div className="flex items-center justify-between gap-3"><h3 className="font-black text-white">Level {levelIndex}</h3><span className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">{level.length} node{level.length === 1 ? "" : "s"}</span></div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {level.map((node) => <article key={`${node.level}-${node.index}`} className={`rounded-xl border p-3 ${node.level === 0 && node.index === result.value.selectedLeaf.index ? "border-cyan-300/70 bg-cyan-300/10" : "border-white/10 bg-slate-950/60"}`}>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Node {node.index}</p>
                  <p className="mt-2 break-all font-mono text-sm text-cyan-100">{node.hash}</p>
                  {node.duplicated ? <p className="mt-2 text-xs font-bold text-amber-100">duplicated odd node</p> : null}
                </article>)}
              </div>
            </div>)}
          </div>
        </section> : null}

        {result.value ? <section className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
          <article className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
            <p className="text-sm font-bold uppercase tracking-[0.24em] text-cyan-300">Selected leaf</p>
            <h2 className="mt-2 text-3xl font-black text-white">Leaf {result.value.selectedLeaf.index}</h2>
            <p className="mt-4 rounded-2xl border border-white/10 bg-slate-900/70 p-4 font-mono text-sm text-slate-200">{result.value.selectedLeaf.value}</p>
            <p className="mt-4 break-all rounded-2xl border border-cyan-300/20 bg-cyan-400/10 p-4 font-mono text-sm text-cyan-100">{result.value.selectedLeaf.hash}</p>
            <h3 className="mt-6 text-xl font-black text-white">Proof path</h3>
            <div className="mt-4 flex flex-col gap-3">
              {result.value.proof.map((step) => <div key={`${step.level}-${step.siblingIndex}`} className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
                <div className="flex items-start justify-between gap-3"><p className="font-black text-white">Level {step.level}</p><span className="rounded-full border border-amber-300/30 bg-amber-300/10 px-2.5 py-1 text-xs font-black text-amber-100">sibling on {step.siblingPosition}</span></div>
                <p className="mt-3 break-all font-mono text-sm text-cyan-100">{step.siblingHash}</p>
                <p className="mt-3 text-sm leading-6 text-slate-400">{step.note}</p>
              </div>)}
            </div>
          </article>
          <aside className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
            <h2 className="text-2xl font-black text-white">Verification</h2>
            <div className={`mt-4 rounded-2xl border p-4 ${result.value.verified ? "border-emerald-300/40 bg-emerald-300/10 text-emerald-100" : "border-red-300/40 bg-red-300/10 text-red-100"}`}><p className="text-3xl font-black">{result.value.verified ? "Verified" : "Not verified"}</p><p className="mt-2 text-sm opacity-80">The proof recomputes the same root from the selected leaf.</p></div>
            <div className="mt-5 flex flex-col gap-3">{result.value.verificationSteps.map((step) => <div key={`${step.level}-${step.resultingHash}`} className="rounded-2xl border border-white/10 bg-slate-900/70 p-4"><p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Verification level {step.level}</p><p className="mt-2 break-all font-mono text-sm text-cyan-100">{step.resultingHash}</p></div>)}</div>
          </aside>
        </section> : null}

        <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
          <h2 className="text-2xl font-black text-white">Manual testing checklist</h2>
          <ol className="mt-5 grid gap-3 md:grid-cols-2">{manualChecklist.map((item, index) => <li key={item} className="flex gap-3 rounded-2xl border border-white/10 bg-slate-900/70 p-4 text-sm leading-6 text-slate-300"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-cyan-300 text-xs font-black text-slate-950">{index + 1}</span><span>{item}</span></li>)}</ol>
        </section>
      </section>
    </main>
  )
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4"><p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-500">{label}</p><p className="mt-2 text-3xl font-black text-white">{value}</p></div>
}
