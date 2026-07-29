"use client";

import { useMemo, useState } from "react";
import {
  DEFAULT_SHA256_COMPRESSION_INPUT,
  getSha256CompressionManualChecklist,
  runSha256CompressionVisualization,
} from "../../lib/hash/sha256CompressionVisualizer";

export default function Sha256CompressionVisualizer() {
  const [message, setMessage] = useState(
    DEFAULT_SHA256_COMPRESSION_INPUT.message,
  );
  const [activeRound, setActiveRound] = useState(0);

  const result = useMemo(() => {
    try {
      return {
        value: runSha256CompressionVisualization(message),
        error: null as string | null,
      };
    } catch (caught) {
      return {
        value: null,
        error:
          caught instanceof Error
            ? caught.message
            : "Unable to run SHA-256 compression demo.",
      };
    }
  }, [message]);

  const activeRoundData = result.value?.rounds[activeRound];
  const manualChecklist = getSha256CompressionManualChecklist();

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
        <header className="overflow-hidden rounded-3xl border border-white/10 bg-slate-900 shadow-2xl shadow-black/30">
          <div className="relative isolate px-6 py-10 sm:px-10">
            <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.25),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(34,197,94,0.18),transparent_32%)]" />
            <p className="text-sm font-semibold uppercase tracking-[0.32em] text-cyan-300">
              Hash functions
            </p>
            <div className="mt-4 grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
              <div>
                <h1 className="text-4xl font-black tracking-tight text-white sm:text-5xl">
                  SHA-256 Compression Round Visualizer
                </h1>
                <p className="mt-5 max-w-3xl text-base leading-8 text-slate-300">
                  Step through the single-block SHA-256 compression function.
                  Inspect padding, the 64-word message schedule, constants,
                  working variables, choice, majority, and the final compressed
                  digest.
                </p>
              </div>
              <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-5">
                <p className="text-sm font-bold text-cyan-100">
                  Single-block focus
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  This visualizer accepts up to 55 UTF-8 bytes so the full
                  message fits into one SHA-256 compression block.
                </p>
              </div>
            </div>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-[0.78fr_1.22fr]">
          <aside className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
            <h2 className="text-2xl font-black text-white">Message input</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Try a short message and inspect every compression round.
            </p>

            <label className="mt-6 block text-sm font-bold text-slate-200">
              Message
            </label>
            <textarea
              value={message}
              onChange={(event) => {
                setMessage(event.target.value);
                setActiveRound(0);
              }}
              className="mt-2 min-h-32 w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none ring-cyan-400/40 focus:ring-2"
            />

            <button
              type="button"
              onClick={() => {
                setMessage(DEFAULT_SHA256_COMPRESSION_INPUT.message);
                setActiveRound(0);
              }}
              className="mt-5 w-full rounded-xl border border-white/10 px-4 py-3 text-sm font-bold text-slate-200 transition hover:border-cyan-300/50 hover:text-cyan-100"
            >
              Reset to abc
            </button>

            {result.error ? (
              <div
                role="alert"
                className="mt-5 rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-100"
              >
                {result.error}
              </div>
            ) : null}

            <div className="mt-6 grid gap-3">
              <Metric
                label="Message schedule words"
                value={result.value?.messageSchedule.length ?? "—"}
              />
              <Metric
                label="Compression rounds"
                value={result.value?.rounds.length ?? "—"}
              />
              <Metric label="Active round" value={activeRound} />
            </div>
          </aside>

          <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
            <h2 className="text-2xl font-black text-white">Digest output</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              For the default message abc, the digest should match the standard
              SHA-256 vector.
            </p>

            <div className="mt-5 rounded-2xl border border-cyan-300/20 bg-cyan-400/10 p-5">
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-cyan-100">
                Compressed hash digest
              </p>
              <p className="mt-3 break-all font-mono text-sm leading-7 text-white">
                {result.value?.digest ?? "—"}
              </p>
            </div>

            <div className="mt-5 rounded-2xl border border-white/10 bg-slate-900/70 p-5">
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-500">
                Padded 512-bit block
              </p>
              <p className="mt-3 break-all font-mono text-xs leading-6 text-cyan-100">
                {result.value?.paddedBlockHex ?? "—"}
              </p>
            </div>
          </section>
        </section>

        {result.value ? (
          <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
            <h2 className="text-2xl font-black text-white">Round selector</h2>
            <div className="mt-5 grid gap-2 sm:grid-cols-4 md:grid-cols-8 lg:grid-cols-16">
              {result.value.rounds.map((round) => (
                <button
                  key={round.round}
                  type="button"
                  onClick={() => setActiveRound(round.round)}
                  className={`rounded-xl border p-3 text-center text-xs font-black transition ${
                    activeRound === round.round
                      ? "border-cyan-300/70 bg-cyan-300/10 text-cyan-100"
                      : "border-white/10 bg-slate-900/70 text-slate-300 hover:border-cyan-300/50"
                  }`}
                >
                  {round.round}
                </button>
              ))}
            </div>
          </section>
        ) : null}

        {activeRoundData ? (
          <section className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
            <article className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
              <p className="text-sm font-bold uppercase tracking-[0.24em] text-cyan-300">
                Active compression round
              </p>
              <h2 className="mt-2 text-3xl font-black text-white">
                Round {activeRoundData.round}
              </h2>
              <p className="mt-4 text-base leading-8 text-slate-300">
                {activeRoundData.note}
              </p>

              <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  ["a", activeRoundData.a],
                  ["b", activeRoundData.b],
                  ["c", activeRoundData.c],
                  ["d", activeRoundData.d],
                  ["e", activeRoundData.e],
                  ["f", activeRoundData.f],
                  ["g", activeRoundData.g],
                  ["h", activeRoundData.h],
                ].map(([label, value]) => (
                  <Info key={label} label={label} value={value} />
                ))}
              </div>
            </article>

            <aside className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
              <h2 className="text-2xl font-black text-white">Round formulas</h2>
              <div className="mt-5 grid gap-3">
                <Info label="W[t]" value={activeRoundData.w} />
                <Info label="K[t]" value={activeRoundData.k} />
                <Info label="Ch(e,f,g)" value={activeRoundData.ch} />
                <Info label="Maj(a,b,c)" value={activeRoundData.maj} />
                <Info label="Σ0(a)" value={activeRoundData.sigma0} />
                <Info label="Σ1(e)" value={activeRoundData.sigma1} />
                <Info label="T1" value={activeRoundData.temp1} />
                <Info label="T2" value={activeRoundData.temp2} />
              </div>
            </aside>
          </section>
        ) : null}

        {result.value ? (
          <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
            <h2 className="text-2xl font-black text-white">Message schedule</h2>
            <div className="mt-5 max-h-96 overflow-auto rounded-2xl border border-white/10">
              <table className="w-full min-w-[760px] border-collapse text-left text-sm">
                <thead className="sticky top-0 bg-slate-900 text-xs uppercase tracking-[0.18em] text-slate-400">
                  <tr>
                    <th className="px-4 py-3">Word</th>
                    <th className="px-4 py-3">Value</th>
                    <th className="px-4 py-3">Formula</th>
                    <th className="px-4 py-3">Note</th>
                  </tr>
                </thead>
                <tbody>
                  {result.value.messageSchedule.map((word) => (
                    <tr key={word.index} className="border-t border-white/5">
                      <td className="px-4 py-3 font-mono text-cyan-100">
                        W[{word.index}]
                      </td>
                      <td className="px-4 py-3 font-mono text-white">
                        {word.value}
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {word.formula}
                      </td>
                      <td className="px-4 py-3 text-slate-400">{word.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
          <h2 className="text-2xl font-black text-white">
            Manual testing checklist
          </h2>
          <ol className="mt-5 grid gap-3 md:grid-cols-2">
            {manualChecklist.map((item, index) => (
              <li
                key={item}
                className="flex gap-3 rounded-2xl border border-white/10 bg-slate-900/70 p-4 text-sm leading-6 text-slate-300"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-cyan-300 text-xs font-black text-slate-950">
                  {index + 1}
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ol>
        </section>
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
      <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-3xl font-black text-white">{value}</p>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
      <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 break-all font-mono text-sm text-cyan-200">{value}</p>
    </div>
  );
}
