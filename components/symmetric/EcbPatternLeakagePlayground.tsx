"use client"

import { useMemo, useState } from "react"
import {
  DEFAULT_ECB_PATTERN_INPUT,
  ECB_PATTERN_SAMPLES,
  buildEcbPatternManualChecklist,
  runEcbPatternLeakagePlayground,
  type EcbPatternInput,
  type EcbPatternResult,
} from "../../lib/symmetric/ecbPatternLeakagePlayground"

function leakageClass(level: EcbPatternResult["leakageLevel"]) {
  if (level === "high") return "border-red-300/40 bg-red-300/10 text-red-100"
  if (level === "medium") return "border-amber-300/40 bg-amber-300/10 text-amber-100"
  return "border-emerald-300/40 bg-emerald-300/10 text-emerald-100"
}

export default function EcbPatternLeakagePlayground() {
  const [input, setInput] = useState<EcbPatternInput>(DEFAULT_ECB_PATTERN_INPUT)

  const result = useMemo(() => {
    try {
      return { value: runEcbPatternLeakagePlayground(input), error: null as string | null }
    } catch (caught) {
      return {
        value: null,
        error:
          caught instanceof Error
            ? caught.message
            : "Unable to run ECB pattern leakage demo.",
      }
    }
  }, [input])

  const manualChecklist = buildEcbPatternManualChecklist()

  function updateInput<K extends keyof EcbPatternInput>(key: K, value: EcbPatternInput[K]) {
    setInput((current) => ({ ...current, [key]: value }))
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
        <header className="overflow-hidden rounded-3xl border border-white/10 bg-slate-900 shadow-2xl shadow-black/30">
          <div className="relative isolate px-6 py-10 sm:px-10">
            <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.25),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(239,68,68,0.18),transparent_32%)]" />
            <p className="text-sm font-semibold uppercase tracking-[0.32em] text-cyan-300">
              Block cipher modes
            </p>
            <div className="mt-4 grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
              <div>
                <h1 className="text-4xl font-black tracking-tight text-white sm:text-5xl">
                  ECB Pattern Leakage Playground
                </h1>
                <p className="mt-5 max-w-3xl text-base leading-8 text-slate-300">
                  See why ECB mode is unsafe for structured or repeated data. Repeated
                  plaintext blocks become repeated ciphertext blocks, revealing patterns
                  even when the block contents look encrypted.
                </p>
              </div>
              <div className="rounded-2xl border border-amber-300/20 bg-amber-300/10 p-5">
                <p className="text-sm font-bold text-amber-100">Security note</p>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  This demo uses a toy block transform for visual learning. Do not use
                  ECB for real data; prefer authenticated encryption modes.
                </p>
              </div>
            </div>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-[0.78fr_1.22fr]">
          <aside className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
            <h2 className="text-2xl font-black text-white">Plaintext pattern</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Use repeated text blocks to make ECB leakage visible.
            </p>

            <label className="mt-6 block text-sm font-bold text-slate-200">Plaintext</label>
            <textarea
              value={input.plaintext}
              onChange={(event) => updateInput("plaintext", event.target.value)}
              className="mt-2 min-h-44 w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 font-mono text-sm text-white outline-none ring-cyan-400/40 focus:ring-2"
            />

            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              <label className="block text-sm font-bold text-slate-200">
                Key
                <input
                  value={input.key}
                  onChange={(event) => updateInput("key", event.target.value)}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 font-mono text-sm text-white outline-none ring-cyan-400/40 focus:ring-2"
                />
              </label>

              <label className="block text-sm font-bold text-slate-200">
                IV
                <input
                  value={input.iv}
                  onChange={(event) => updateInput("iv", event.target.value)}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 font-mono text-sm text-white outline-none ring-cyan-400/40 focus:ring-2"
                />
              </label>

              <label className="block text-sm font-bold text-slate-200">
                Block size
                <input
                  type="number"
                  min={4}
                  max={16}
                  value={input.blockSize}
                  onChange={(event) => updateInput("blockSize", Number(event.target.value))}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 font-mono text-sm text-white outline-none ring-cyan-400/40 focus:ring-2"
                />
              </label>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {Object.entries(ECB_PATTERN_SAMPLES).map(([name, plaintext]) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => updateInput("plaintext", plaintext)}
                  className="rounded-full border border-white/10 px-3 py-1.5 text-xs font-bold capitalize text-slate-300 transition hover:border-cyan-300/60 hover:text-cyan-100"
                >
                  {name}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setInput(DEFAULT_ECB_PATTERN_INPUT)}
              className="mt-6 w-full rounded-xl border border-white/10 px-4 py-3 text-sm font-bold text-slate-200 transition hover:border-cyan-300/50 hover:text-cyan-100"
            >
              Reset demo
            </button>

            {result.error ? (
              <div
                role="alert"
                className="mt-5 rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-100"
              >
                {result.error}
              </div>
            ) : null}
          </aside>

          <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
            <h2 className="text-2xl font-black text-white">Leakage summary</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              ECB duplicate ciphertext blocks reveal duplicate plaintext blocks.
            </p>

            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Metric label="Blocks" value={result.value?.blocks.length ?? "—"} />
              <Metric label="Repeated plaintext" value={result.value?.repeatedPlaintextCount ?? "—"} />
              <Metric label="ECB duplicates" value={result.value?.ecbDuplicateCount ?? "—"} />
              <div className={`rounded-2xl border p-4 ${result.value ? leakageClass(result.value.leakageLevel) : "border-white/10 bg-slate-900/70 text-slate-300"}`}>
                <p className="text-xs font-bold uppercase tracking-[0.24em] opacity-70">
                  Leakage
                </p>
                <p className="mt-2 text-3xl font-black">{result.value?.leakageLevel ?? "—"}</p>
              </div>
            </div>

            {result.value ? (
              <div className="mt-6 rounded-2xl border border-cyan-300/20 bg-cyan-400/10 p-5">
                <p className="text-sm font-bold text-cyan-100">Explanation</p>
                <p className="mt-2 text-sm leading-7 text-slate-300">
                  {result.value.explanation}
                </p>
              </div>
            ) : null}
          </section>
        </section>

        {result.value ? (
          <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
            <h2 className="text-2xl font-black text-white">Pattern blocks</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Repeated ECB ciphertext cards are highlighted. CBC comparison uses previous
              ciphertext state, so repeated plaintext blocks no longer look identical.
            </p>

            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {result.value.blocks.map((block) => (
                <article
                  key={block.index}
                  className={`rounded-2xl border p-4 ${
                    block.repeatedEcbCiphertext
                      ? "border-red-300/40 bg-red-300/10"
                      : "border-white/10 bg-slate-900/70"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-500">
                      Block {block.index}
                    </p>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-black ${
                        block.repeatedEcbCiphertext
                          ? "bg-red-300 text-slate-950"
                          : "bg-slate-800 text-slate-300"
                      }`}
                    >
                      {block.repeatedEcbCiphertext ? "pattern leak" : "unique"}
                    </span>
                  </div>

                  <p className="mt-3 rounded-xl border border-white/10 bg-slate-950/60 p-3 font-mono text-sm text-white">
                    {block.plaintext}
                  </p>
                  <p className="mt-3 break-all font-mono text-xs text-amber-100">
                    ECB: {block.ecbCiphertext}
                  </p>
                  <p className="mt-2 break-all font-mono text-xs text-emerald-100">
                    CBC: {block.cbcCiphertext}
                  </p>
                  <p className="mt-3 text-sm leading-6 text-slate-400">{block.note}</p>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {result.value ? (
          <section className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
            <article className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
              <h2 className="text-2xl font-black text-white">Block table</h2>
              <div className="mt-5 max-h-96 overflow-auto rounded-2xl border border-white/10">
                <table className="w-full min-w-[900px] border-collapse text-left text-sm">
                  <thead className="sticky top-0 bg-slate-900 text-xs uppercase tracking-[0.18em] text-slate-400">
                    <tr>
                      <th className="px-4 py-3">#</th>
                      <th className="px-4 py-3">Plaintext</th>
                      <th className="px-4 py-3">Plain hex</th>
                      <th className="px-4 py-3">ECB ciphertext</th>
                      <th className="px-4 py-3">CBC comparison</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.value.blocks.map((block) => (
                      <tr key={block.index} className="border-t border-white/5">
                        <td className="px-4 py-3 font-mono text-slate-400">{block.index + 1}</td>
                        <td className="px-4 py-3 font-mono text-white">{block.plaintext}</td>
                        <td className="px-4 py-3 font-mono text-slate-300">{block.plaintextHex}</td>
                        <td className="px-4 py-3 font-mono text-amber-100">{block.ecbCiphertext}</td>
                        <td className="px-4 py-3 font-mono text-emerald-100">{block.cbcCiphertext}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>

            <aside className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
              <h2 className="text-2xl font-black text-white">Manual testing checklist</h2>
              <ol className="mt-5 space-y-3">
                {manualChecklist.map((item, index) => (
                  <li key={item} className="flex gap-3 text-sm leading-6 text-slate-300">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-cyan-300 text-xs font-black text-slate-950">
                      {index + 1}
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ol>
            </aside>
          </section>
        ) : null}
      </section>
    </main>
  )
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
      <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-black text-white">{value}</p>
    </div>
  )
}
