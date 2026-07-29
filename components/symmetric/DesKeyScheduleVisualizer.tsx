"use client";

import { useMemo, useState } from "react";
import {
  DEFAULT_DES_KEY_SCHEDULE_INPUT,
  generateDesKeySchedule,
  getDesKeyScheduleManualChecklist,
} from "../../lib/symmetric/desKeyScheduleVisualizer";

export default function DesKeyScheduleVisualizer() {
  const [keyHex, setKeyHex] = useState(DEFAULT_DES_KEY_SCHEDULE_INPUT.keyHex);
  const [activeRoundIndex, setActiveRoundIndex] = useState(0);

  const result = useMemo(() => {
    try {
      return {
        value: generateDesKeySchedule(keyHex),
        error: null as string | null,
      };
    } catch (caught) {
      return {
        value: null,
        error:
          caught instanceof Error
            ? caught.message
            : "Unable to generate DES key schedule.",
      };
    }
  }, [keyHex]);

  const activeRound = result.value?.rounds[activeRoundIndex];
  const manualChecklist = getDesKeyScheduleManualChecklist();

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
        <header className="overflow-hidden rounded-3xl border border-white/10 bg-slate-900 shadow-2xl shadow-black/30">
          <div className="relative isolate px-6 py-10 sm:px-10">
            <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.25),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(245,158,11,0.2),transparent_32%)]" />
            <p className="text-sm font-semibold uppercase tracking-[0.32em] text-cyan-300">
              Symmetric cryptography
            </p>
            <div className="mt-4 grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
              <div>
                <h1 className="text-4xl font-black tracking-tight text-white sm:text-5xl">
                  DES Key Schedule Visualizer
                </h1>
                <p className="mt-5 max-w-3xl text-base leading-8 text-slate-300">
                  Explore how DES turns one 64-bit key into sixteen 48-bit round
                  subkeys using PC-1, left rotations, and PC-2 compression.
                </p>
              </div>
              <div className="rounded-2xl border border-amber-300/20 bg-amber-300/10 p-5">
                <p className="text-sm font-bold text-amber-100">
                  Legacy algorithm note
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  DES is cryptographically broken today. This visualizer is for
                  understanding the historical key schedule only.
                </p>
              </div>
            </div>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-[0.78fr_1.22fr]">
          <aside className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
            <h2 className="text-2xl font-black text-white">Key input</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Enter exactly 16 hexadecimal characters for the DES key.
            </p>

            <label className="mt-6 block text-sm font-bold text-slate-200">
              DES key
            </label>
            <input
              value={keyHex}
              onChange={(event) => {
                setKeyHex(event.target.value);
                setActiveRoundIndex(0);
              }}
              className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 font-mono text-sm text-white outline-none ring-cyan-400/40 focus:ring-2"
            />

            <button
              type="button"
              onClick={() => {
                setKeyHex(DEFAULT_DES_KEY_SCHEDULE_INPUT.keyHex);
                setActiveRoundIndex(0);
              }}
              className="mt-5 w-full rounded-xl border border-white/10 px-4 py-3 text-sm font-bold text-slate-200 transition hover:border-cyan-300/50 hover:text-cyan-100"
            >
              Reset to DES reference key
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
              <Metric label="Input bits" value={result.value ? 64 : "—"} />
              <Metric label="After PC-1" value={result.value ? 56 : "—"} />
              <Metric
                label="Round subkeys"
                value={result.value?.rounds.length ?? "—"}
              />
            </div>
          </aside>

          <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
            <h2 className="text-2xl font-black text-white">Round subkeys</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Every DES round receives a unique 48-bit subkey from the schedule.
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {result.value?.rounds.map((round, index) => (
                <button
                  key={round.round}
                  type="button"
                  onClick={() => setActiveRoundIndex(index)}
                  className={`rounded-2xl border p-4 text-left transition ${
                    activeRoundIndex === index
                      ? "border-cyan-300/70 bg-cyan-300/10"
                      : "border-white/10 bg-slate-900/70 hover:border-cyan-300/50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-500">
                      Round {round.round}
                    </p>
                    <span className="rounded-full border border-amber-300/30 bg-amber-300/10 px-2 py-1 text-xs font-black text-amber-100">
                      shift {round.shift}
                    </span>
                  </div>
                  <p className="mt-2 break-all font-mono text-sm text-cyan-100">
                    {round.subkey}
                  </p>
                </button>
              ))}
            </div>
          </section>
        </section>

        {result.value ? (
          <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
            <h2 className="text-2xl font-black text-white">Schedule setup</h2>
            <div className="mt-5 grid gap-4 lg:grid-cols-3">
              {result.value.steps.map((step) => (
                <article
                  key={step.id}
                  className="rounded-2xl border border-white/10 bg-slate-900/70 p-5"
                >
                  <h3 className="font-black text-white">{step.title}</h3>
                  <p className="mt-3 break-all font-mono text-xs leading-6 text-cyan-100">
                    {step.value}
                  </p>
                  <p className="mt-3 text-sm leading-6 text-slate-400">
                    {step.explanation}
                  </p>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {activeRound ? (
          <section className="grid gap-6 lg:grid-cols-[1fr_0.85fr]">
            <article className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
              <p className="text-sm font-bold uppercase tracking-[0.24em] text-cyan-300">
                Active round
              </p>
              <h2 className="mt-2 text-3xl font-black text-white">
                Round {activeRound.round}
              </h2>
              <p className="mt-4 text-base leading-8 text-slate-300">
                {activeRound.note}
              </p>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <Info label="Left shifts" value={String(activeRound.shift)} />
                <Info label="C half" value={activeRound.c} mono />
                <Info label="D half" value={activeRound.d} mono />
                <Info label="48-bit subkey" value={activeRound.subkey} mono />
              </div>
            </article>

            <aside className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
              <h2 className="text-2xl font-black text-white">Combined C + D</h2>
              <p className="mt-4 break-all rounded-2xl border border-violet-300/20 bg-violet-400/10 p-4 font-mono text-sm leading-7 text-violet-100">
                {activeRound.combined}
              </p>
              <p className="mt-5 text-sm leading-7 text-slate-400">
                PC-2 selects and permutes 48 positions from this 56-bit combined
                value to produce the round subkey.
              </p>
            </aside>
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

function Info({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
      <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-500">
        {label}
      </p>
      <p
        className={`mt-2 break-all ${mono ? "font-mono text-sm text-cyan-200" : "text-2xl font-black text-white"}`}
      >
        {value}
      </p>
    </div>
  );
}
