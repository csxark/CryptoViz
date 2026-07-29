"use client";

import { useMemo, useState } from "react";
import {
  DEFAULT_TIMING_ATTACK_INPUT,
  TIMING_ATTACK_DEMO_GUESSES,
  buildTimingAttackManualChecklist,
  runTimingAttackVisualization,
  type TimingAttackInput,
  type TimingAttackResult,
} from "../../lib/attacks/timingAttackVisualizer";

function riskClass(risk: TimingAttackResult["risk"]) {
  if (risk === "high") return "border-red-300/40 bg-red-300/10 text-red-100";
  if (risk === "medium")
    return "border-amber-300/40 bg-amber-300/10 text-amber-100";
  return "border-emerald-300/40 bg-emerald-300/10 text-emerald-100";
}

export default function TimingAttackVisualizer() {
  const [input, setInput] = useState<TimingAttackInput>(
    DEFAULT_TIMING_ATTACK_INPUT,
  );

  const result = useMemo(() => {
    try {
      return {
        value: runTimingAttackVisualization(input),
        error: null as string | null,
      };
    } catch (caught) {
      return {
        value: null,
        error:
          caught instanceof Error
            ? caught.message
            : "Unable to run timing attack demo.",
      };
    }
  }, [input]);

  const manualChecklist = buildTimingAttackManualChecklist();

  function updateInput<K extends keyof TimingAttackInput>(
    key: K,
    value: TimingAttackInput[K],
  ) {
    setInput((current) => ({ ...current, [key]: value }));
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
        <header className="overflow-hidden rounded-3xl border border-white/10 bg-slate-900 shadow-2xl shadow-black/30">
          <div className="relative isolate px-6 py-10 sm:px-10">
            <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.25),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(244,63,94,0.18),transparent_32%)]" />
            <p className="text-sm font-semibold uppercase tracking-[0.32em] text-cyan-300">
              Side-channel attacks
            </p>
            <div className="mt-4 grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
              <div>
                <h1 className="text-4xl font-black tracking-tight text-white sm:text-5xl">
                  Timing Attack Visualization
                </h1>
                <p className="mt-5 max-w-3xl text-base leading-8 text-slate-300">
                  See how early-exit comparisons can leak information through
                  timing. Compare a vulnerable string comparison with a
                  constant-time approach using safe local demo values.
                </p>
              </div>
              <div className="rounded-2xl border border-amber-300/20 bg-amber-300/10 p-5">
                <p className="text-sm font-bold text-amber-100">
                  Ethical demo only
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  This page simulates timing costs locally. Do not use timing
                  tests against systems or accounts you do not own or have
                  permission to test.
                </p>
              </div>
            </div>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-[0.78fr_1.22fr]">
          <aside className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
            <h2 className="text-2xl font-black text-white">Demo inputs</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Try guesses with longer matching prefixes and watch the vulnerable
              comparison become measurably slower.
            </p>

            <label className="mt-6 block text-sm font-bold text-slate-200">
              Secret
            </label>
            <input
              value={input.secret}
              onChange={(event) => updateInput("secret", event.target.value)}
              className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 font-mono text-sm text-white outline-none ring-cyan-400/40 focus:ring-2"
            />

            <label className="mt-5 block text-sm font-bold text-slate-200">
              Guess
            </label>
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
              onChange={(event) =>
                updateInput("samples", Number(event.target.value))
              }
              className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 font-mono text-sm text-white outline-none ring-cyan-400/40 focus:ring-2"
            />

            <div className="mt-6">
              <p className="text-sm font-bold text-slate-200">Quick guesses</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {TIMING_ATTACK_DEMO_GUESSES.map((guess) => (
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
              onClick={() => setInput(DEFAULT_TIMING_ATTACK_INPUT)}
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
            <h2 className="text-2xl font-black text-white">
              Timing comparison
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Vulnerable comparison cost grows with the matched prefix.
              Constant-time comparison keeps the cost closer to the full input
              length.
            </p>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <Metric
                label="Vulnerable avg cost"
                value={
                  result.value ? result.value.vulnerableAverage.toFixed(2) : "—"
                }
                note="Leaks prefix length"
              />
              <Metric
                label="Constant-time avg cost"
                value={
                  result.value
                    ? result.value.constantTimeAverage.toFixed(2)
                    : "—"
                }
                note="Avoids early exit"
              />
              <Metric
                label="Leaked prefix"
                value={result.value?.leakedPrefix || "none"}
                note="What timing may reveal"
                mono
              />
              <div
                className={`rounded-2xl border p-4 ${result.value ? riskClass(result.value.risk) : "border-white/10 bg-slate-900/70 text-slate-300"}`}
              >
                <p className="text-xs font-bold uppercase tracking-[0.24em] opacity-70">
                  Risk
                </p>
                <p className="mt-2 text-3xl font-black">
                  {result.value?.risk ?? "—"}
                </p>
                <p className="mt-1 text-sm opacity-80">
                  Based on matched-prefix length
                </p>
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
            <h2 className="text-2xl font-black text-white">Attempt samples</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Costs are deterministic demo units, not real wall-clock timings.
              They make the leak visible without attacking any external system.
            </p>

            <div className="mt-5 max-h-96 overflow-auto rounded-2xl border border-white/10">
              <table className="w-full min-w-[760px] border-collapse text-left text-sm">
                <thead className="sticky top-0 bg-slate-900 text-xs uppercase tracking-[0.18em] text-slate-400">
                  <tr>
                    <th className="px-4 py-3">Sample</th>
                    <th className="px-4 py-3">Guess</th>
                    <th className="px-4 py-3">Matched prefix</th>
                    <th className="px-4 py-3">Vulnerable cost</th>
                    <th className="px-4 py-3">Constant-time cost</th>
                    <th className="px-4 py-3">Match</th>
                  </tr>
                </thead>
                <tbody>
                  {result.value.attempts.map((attempt) => (
                    <tr key={attempt.index} className="border-t border-white/5">
                      <td className="px-4 py-3 font-mono text-slate-400">
                        {attempt.index + 1}
                      </td>
                      <td className="px-4 py-3 font-mono text-cyan-100">
                        {attempt.guess}
                      </td>
                      <td className="px-4 py-3 text-white">
                        {attempt.matchedPrefixLength}
                      </td>
                      <td className="px-4 py-3 font-mono text-amber-100">
                        {attempt.vulnerableCost}
                      </td>
                      <td className="px-4 py-3 font-mono text-emerald-100">
                        {attempt.constantTimeCost}
                      </td>
                      <td className="px-4 py-3">
                        {attempt.vulnerableMatched ? (
                          <span className="rounded-full bg-emerald-300 px-2.5 py-1 text-xs font-black text-slate-950">
                            matched
                          </span>
                        ) : (
                          <span className="text-slate-500">no</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        <section className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
          <article className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
            <h2 className="text-2xl font-black text-white">How to defend</h2>
            <div className="mt-5 grid gap-4">
              {[
                "Use constant-time comparison for secrets, tokens, MACs, and signatures.",
                "Avoid early return when comparing sensitive values.",
                "Add rate limits and lockouts around authentication flows.",
                "Prefer battle-tested framework utilities instead of hand-written comparison code.",
              ].map((note) => (
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
            <h2 className="text-2xl font-black text-white">
              Manual testing checklist
            </h2>
            <ol className="mt-5 space-y-3">
              {manualChecklist.map((item, index) => (
                <li
                  key={item}
                  className="flex gap-3 text-sm leading-6 text-slate-300"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-cyan-300 text-xs font-black text-slate-950">
                    {index + 1}
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ol>
          </aside>
        </section>
      </section>
    </main>
  );
}

function Metric({
  label,
  value,
  note,
  mono = false,
}: {
  label: string;
  value: string | number;
  note: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
      <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-500">
        {label}
      </p>
      <p
        className={`mt-2 break-all ${mono ? "font-mono text-xl text-cyan-200" : "text-3xl font-black text-white"}`}
      >
        {value}
      </p>
      <p className="mt-1 text-sm text-slate-400">{note}</p>
    </div>
  );
}
