"use client"

import { useMemo, useState } from "react"
import {
  DEFAULT_SIDE_CHANNEL_INPUT,
  SIDE_CHANNEL_DEMO_GUESSES,
  SIDE_CHANNEL_MODE_LABELS,
  buildSideChannelManualChecklist,
  runSideChannelPlayground,
  type SideChannelInput,
  type SideChannelMode,
  type SideChannelResult,
} from "../../lib/attacks/sideChannelPlayground"

function riskClass(risk: SideChannelResult["inferredRisk"]) {
  if (risk === "high") return "border-red-300/40 bg-red-300/10 text-red-100"
  if (risk === "medium") return "border-amber-300/40 bg-amber-300/10 text-amber-100"
  return "border-emerald-300/40 bg-emerald-300/10 text-emerald-100"
}

export default function SideChannelPlayground() {
  const [input, setInput] = useState<SideChannelInput>(DEFAULT_SIDE_CHANNEL_INPUT)

  const result = useMemo(() => {
    try {
      return { value: runSideChannelPlayground(input), error: null as string | null }
    } catch (caught) {
      return {
        value: null,
        error:
          caught instanceof Error
            ? caught.message
            : "Unable to run side-channel playground.",
      }
    }
  }, [input])

  const manualChecklist = buildSideChannelManualChecklist()

  function updateInput<K extends keyof SideChannelInput>(key: K, value: SideChannelInput[K]) {
    setInput((current) => ({ ...current, [key]: value }))
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
        <header className="overflow-hidden rounded-3xl border border-white/10 bg-slate-900 shadow-2xl shadow-black/30">
          <div className="relative isolate px-6 py-10 sm:px-10">
            <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.25),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(244,63,94,0.18),transparent_32%)]" />
            <p className="text-sm font-semibold uppercase tracking-[0.32em] text-cyan-300">
              Side-channel security
            </p>
            <div className="mt-4 grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
              <div>
                <h1 className="text-4xl font-black tracking-tight text-white sm:text-5xl">
                  Side-Channel Attack Playground
                </h1>
                <p className="mt-5 max-w-3xl text-base leading-8 text-slate-300">
                  Compare safe local simulations of timing, cache, and power-style
                  leakage. See how secret-dependent behavior can reveal hints even
                  when the cryptographic output itself is not directly exposed.
                </p>
              </div>
              <div className="rounded-2xl border border-amber-300/20 bg-amber-300/10 p-5">
                <p className="text-sm font-bold text-amber-100">Safe simulation only</p>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  This module uses deterministic educational signals. It does not probe
                  external systems, measure real hardware, or attack real services.
                </p>
              </div>
            </div>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-[0.78fr_1.22fr]">
          <aside className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
            <h2 className="text-2xl font-black text-white">Demo controls</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Change the mode and guess to see how different side channels expose
              different kinds of hints.
            </p>

            <label className="mt-6 block text-sm font-bold text-slate-200">Mode</label>
            <select
              value={input.mode}
              onChange={(event) => updateInput("mode", event.target.value as SideChannelMode)}
              className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none ring-cyan-400/40 focus:ring-2"
            >
              {Object.entries(SIDE_CHANNEL_MODE_LABELS).map(([mode, label]) => (
                <option key={mode} value={mode}>
                  {label}
                </option>
              ))}
            </select>

            <label className="mt-5 block text-sm font-bold text-slate-200">Secret</label>
            <input
              value={input.secret}
              onChange={(event) => updateInput("secret", event.target.value)}
              className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 font-mono text-sm text-white outline-none ring-cyan-400/40 focus:ring-2"
            />

            <label className="mt-5 block text-sm font-bold text-slate-200">Guess</label>
            <input
              value={input.guess}
              onChange={(event) => updateInput("guess", event.target.value)}
              className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 font-mono text-sm text-white outline-none ring-cyan-400/40 focus:ring-2"
            />

            <label className="mt-5 block text-sm font-bold text-slate-200">
              Samples
            </label>
            <input
              type="number"
              min={1}
              max={50}
              value={input.samples}
              onChange={(event) => updateInput("samples", Number(event.target.value))}
              className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 font-mono text-sm text-white outline-none ring-cyan-400/40 focus:ring-2"
            />

            <div className="mt-6">
              <p className="text-sm font-bold text-slate-200">Quick guesses</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {SIDE_CHANNEL_DEMO_GUESSES.map((guess) => (
                  <button
                    key={guess}
                    type="button"
                    onClick={() => updateInput("guess", guess)}
                    className="rounded-full border border-white/10 px-3 py-1.5 text-xs font-bold text-slate-300 transition hover:border-cyan-300/60 hover:text-cyan-100"
                  >
                    {guess}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setInput(DEFAULT_SIDE_CHANNEL_INPUT)}
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
              The signal is a safe deterministic teaching value, not a real clock,
              cache probe, or hardware measurement.
            </p>

            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Metric
                label="Average signal"
                value={result.value ? result.value.averageSignal.toFixed(2) : "—"}
              />
              <Metric
                label="Leaked prefix"
                value={result.value?.leakedPrefix || "none"}
                mono
              />
              <Metric
                label="Samples"
                value={result.value?.samples.length ?? "—"}
              />
              <div className={`rounded-2xl border p-4 ${result.value ? riskClass(result.value.inferredRisk) : "border-white/10 bg-slate-900/70 text-slate-300"}`}>
                <p className="text-xs font-bold uppercase tracking-[0.24em] opacity-70">
                  Risk
                </p>
                <p className="mt-2 text-3xl font-black">{result.value?.inferredRisk ?? "—"}</p>
              </div>
            </div>

            {result.value ? (
              <div className="mt-6 rounded-2xl border border-cyan-300/20 bg-cyan-400/10 p-5">
                <p className="text-sm font-bold text-cyan-100">
                  {SIDE_CHANNEL_MODE_LABELS[result.value.input.mode]}
                </p>
                <p className="mt-2 text-sm leading-7 text-slate-300">
                  {result.value.modeExplanation}
                </p>
              </div>
            ) : null}
          </section>
        </section>

        {result.value ? (
          <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
            <h2 className="text-2xl font-black text-white">Signal samples</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Higher bars indicate stronger observable side-channel signal in this
              educational scenario.
            </p>

            <div className="mt-5 grid gap-3">
              {result.value.samples.map((sample) => (
                <div key={sample.index} className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
                        Sample {sample.index + 1}
                      </p>
                      <p className="mt-1 text-sm text-slate-300">{sample.leakedHint}</p>
                    </div>
                    <p className="font-mono text-lg font-black text-cyan-100">
                      {sample.signal}
                    </p>
                  </div>
                  <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="h-full rounded-full bg-cyan-300"
                      style={{ width: `${sample.normalizedSignal}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {result.value ? (
          <section className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
            <article className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
              <h2 className="text-2xl font-black text-white">Mitigation guidance</h2>
              <div className="mt-5 grid gap-4">
                {result.value.mitigationNotes.map((note) => (
                  <div
                    key={note}
                    className="rounded-2xl border border-white/10 bg-slate-900/70 p-4 text-sm leading-7 text-slate-300"
                  >
                    {note}
                  </div>
                ))}
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

function Metric({
  label,
  value,
  mono = false,
}: {
  label: string
  value: string | number
  mono?: boolean
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
      <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-500">{label}</p>
      <p className={`mt-2 break-all ${mono ? "font-mono text-xl text-cyan-200" : "text-3xl font-black text-white"}`}>
        {value}
      </p>
    </div>
  )
}
