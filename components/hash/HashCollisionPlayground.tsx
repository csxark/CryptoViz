"use client"

import { useMemo, useState } from "react"
import {
  DEFAULT_HASH_COLLISION_INPUT,
  HASH_COLLISION_SAMPLE_SETS,
  buildHashCollisionManualChecklist,
  estimateBirthdayCollisionChance,
  runHashCollisionPlayground,
  type HashCollisionInput,
} from "../../lib/hash/hashCollisionPlayground"

export default function HashCollisionPlayground() {
  const [input, setInput] = useState<HashCollisionInput>(DEFAULT_HASH_COLLISION_INPUT)

  const result = useMemo(() => {
    try {
      return { value: runHashCollisionPlayground(input), error: null as string | null }
    } catch (caught) {
      return {
        value: null,
        error: caught instanceof Error ? caught.message : "Unable to run collision playground.",
      }
    }
  }, [input])

  const birthdayChance = result.value
    ? estimateBirthdayCollisionChance(result.value.values.length, result.value.hashBits)
    : 0

  const manualChecklist = buildHashCollisionManualChecklist()

  function updateInput<K extends keyof HashCollisionInput>(key: K, value: HashCollisionInput[K]) {
    setInput((current) => ({ ...current, [key]: value }))
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
        <header className="overflow-hidden rounded-3xl border border-white/10 bg-slate-900 shadow-2xl shadow-black/30">
          <div className="relative isolate px-6 py-10 sm:px-10">
            <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.25),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(244,63,94,0.18),transparent_32%)]" />
            <p className="text-sm font-semibold uppercase tracking-[0.32em] text-cyan-300">
              Hash functions
            </p>
            <div className="mt-4 grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
              <div>
                <h1 className="text-4xl font-black tracking-tight text-white sm:text-5xl">
                  Hash Collision Playground
                </h1>
                <p className="mt-5 max-w-3xl text-base leading-8 text-slate-300">
                  See how different inputs can map to the same shortened hash bucket.
                  Adjust the hash size and watch collisions become more or less likely.
                </p>
              </div>
              <div className="rounded-2xl border border-amber-300/20 bg-amber-300/10 p-5">
                <p className="text-sm font-bold text-amber-100">Educational demo only</p>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  This playground intentionally truncates a toy hash so collisions are visible.
                  It is not a cryptographic hash implementation.
                </p>
              </div>
            </div>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-[0.78fr_1.22fr]">
          <aside className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
            <h2 className="text-2xl font-black text-white">Inputs</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Enter one value per line or comma-separated values.
            </p>

            <label className="mt-6 block text-sm font-bold text-slate-200">
              Values
            </label>
            <textarea
              value={input.valuesText}
              onChange={(event) => updateInput("valuesText", event.target.value)}
              className="mt-2 min-h-56 w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 font-mono text-sm text-white outline-none ring-cyan-400/40 focus:ring-2"
            />

            <label className="mt-5 block text-sm font-bold text-slate-200">
              Truncated hash bits: {input.hashBits}
            </label>
            <input
              type="range"
              min={4}
              max={16}
              value={input.hashBits}
              onChange={(event) => updateInput("hashBits", Number(event.target.value))}
              className="mt-3 w-full"
            />

            <div className="mt-5 flex flex-wrap gap-2">
              {Object.entries(HASH_COLLISION_SAMPLE_SETS).map(([name, valuesText]) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => updateInput("valuesText", valuesText)}
                  className="rounded-full border border-white/10 px-3 py-1.5 text-xs font-bold capitalize text-slate-300 transition hover:border-cyan-300/60 hover:text-cyan-100"
                >
                  {name}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setInput(DEFAULT_HASH_COLLISION_INPUT)}
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
            <h2 className="text-2xl font-black text-white">Collision summary</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              The same full demo hash is shortened to a smaller bucket space so collisions
              are easier to observe.
            </p>

            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Metric label="Values" value={result.value?.values.length ?? "—"} />
              <Metric label="Buckets" value={result.value?.bucketCount ?? "—"} />
              <Metric label="Collision groups" value={result.value?.collisionGroups.length ?? "—"} />
              <Metric label="Birthday chance" value={`${(birthdayChance * 100).toFixed(1)}%`} />
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
            <h2 className="text-2xl font-black text-white">Hash buckets</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Buckets with more than one value are collisions.
            </p>

            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {result.value.groups.map((group) => (
                <article
                  key={group.hash}
                  className={`rounded-2xl border p-4 ${
                    group.values.length > 1
                      ? "border-red-300/40 bg-red-300/10"
                      : "border-white/10 bg-slate-900/70"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-500">
                        Bucket {group.bucket}
                      </p>
                      <p className="mt-1 font-mono text-xl font-black text-cyan-100">
                        {group.hash}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-black ${
                        group.values.length > 1
                          ? "bg-red-300 text-slate-950"
                          : "bg-slate-800 text-slate-300"
                      }`}
                    >
                      {group.values.length > 1 ? "collision" : "unique"}
                    </span>
                  </div>

                  <div className="mt-4 flex flex-col gap-2">
                    {group.values.map((value) => (
                      <div
                        key={`${value.index}-${value.value}`}
                        className="rounded-xl border border-white/10 bg-slate-950/60 p-3"
                      >
                        <p className="font-semibold text-white">{value.value}</p>
                        <p className="mt-1 break-all font-mono text-xs text-slate-400">
                          full: {value.fullHash}
                        </p>
                      </div>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {result.value ? (
          <section className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
            <article className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
              <h2 className="text-2xl font-black text-white">Value table</h2>
              <div className="mt-5 max-h-96 overflow-auto rounded-2xl border border-white/10">
                <table className="w-full min-w-[760px] border-collapse text-left text-sm">
                  <thead className="sticky top-0 bg-slate-900 text-xs uppercase tracking-[0.18em] text-slate-400">
                    <tr>
                      <th className="px-4 py-3">#</th>
                      <th className="px-4 py-3">Value</th>
                      <th className="px-4 py-3">Full demo hash</th>
                      <th className="px-4 py-3">Truncated hash</th>
                      <th className="px-4 py-3">Bucket</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.value.values.map((value) => (
                      <tr key={`${value.index}-${value.value}`} className="border-t border-white/5">
                        <td className="px-4 py-3 font-mono text-slate-400">{value.index + 1}</td>
                        <td className="px-4 py-3 font-semibold text-white">{value.value}</td>
                        <td className="px-4 py-3 font-mono text-slate-300">{value.fullHash}</td>
                        <td className="px-4 py-3 font-mono text-cyan-100">{value.truncatedHash}</td>
                        <td className="px-4 py-3 font-mono text-amber-100">{value.bucket}</td>
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
      <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-3xl font-black text-white">{value}</p>
    </div>
  )
}
