"use client";

import { useMemo, useState } from "react";
import {
  DEFAULT_ARGON2ID_PARAMS,
  describeArgon2idRisk,
  runArgon2idVisualization,
  type Argon2idMemoryBlock,
  type Argon2idVisualizerParams,
} from "../../lib/kdf/argon2idVisualizer";

const phaseStyles: Record<Argon2idMemoryBlock["phase"], string> = {
  initialization: "border-sky-300/40 bg-sky-300/10 text-sky-100",
  argon2i: "border-violet-300/40 bg-violet-300/10 text-violet-100",
  argon2d: "border-emerald-300/40 bg-emerald-300/10 text-emerald-100",
  finalization: "border-amber-300/40 bg-amber-300/10 text-amber-100",
};

const phaseLabels: Record<Argon2idMemoryBlock["phase"], string> = {
  initialization: "Initialization",
  argon2i: "Argon2i-style",
  argon2d: "Argon2d-style",
  finalization: "Finalization",
};

export default function Argon2idVisualizer() {
  const [params, setParams] = useState<Argon2idVisualizerParams>(
    DEFAULT_ARGON2ID_PARAMS,
  );
  const [selectedBlockIndex, setSelectedBlockIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const result = useMemo(() => {
    try {
      setError(null);
      return runArgon2idVisualization(params);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to run Argon2id demo.",
      );
      return null;
    }
  }, [params]);

  const selectedBlock =
    result?.blocks[
      Math.min(selectedBlockIndex, Math.max(0, result.blocks.length - 1))
    ];
  const riskLabel = useMemo(() => {
    try {
      return describeArgon2idRisk(params);
    } catch {
      return "invalid setting";
    }
  }, [params]);

  function updateParam<K extends keyof Argon2idVisualizerParams>(
    key: K,
    value: Argon2idVisualizerParams[K],
  ) {
    setSelectedBlockIndex(0);
    setParams((current) => ({ ...current, [key]: value }));
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
        <header className="overflow-hidden rounded-3xl border border-white/10 bg-slate-900 shadow-2xl shadow-black/30">
          <div className="relative isolate px-6 py-10 sm:px-10">
            <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.25),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.18),transparent_32%)]" />
            <p className="text-sm font-semibold uppercase tracking-[0.32em] text-cyan-300">
              Password hashing
            </p>
            <div className="mt-4 grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
              <div>
                <h1 className="text-4xl font-black tracking-tight text-white sm:text-5xl">
                  Argon2id Visualizer
                </h1>
                <p className="mt-5 max-w-3xl text-base leading-8 text-slate-300">
                  Explore how Argon2id uses salt, memory, iterations, and lanes
                  to make password hashing expensive for attackers while staying
                  practical for legitimate authentication.
                </p>
              </div>
              <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-5">
                <p className="text-sm font-bold text-cyan-100">
                  Educational note
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  This page visualizes Argon2id concepts with deterministic demo
                  mixing. Use a trusted Argon2id library for real password
                  storage.
                </p>
              </div>
            </div>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-[0.82fr_1.18fr]">
          <aside className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
            <h2 className="text-2xl font-black text-white">Parameters</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Adjust safe demo limits to see how memory and iterations change
              the visualized work factor.
            </p>

            <label className="mt-6 block text-sm font-bold text-slate-200">
              Password
            </label>
            <input
              value={params.password}
              onChange={(e) => updateParam("password", e.target.value)}
              className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none ring-cyan-400/40 focus:ring-2"
            />

            <label className="mt-5 block text-sm font-bold text-slate-200">
              Salt
            </label>
            <input
              value={params.salt}
              onChange={(e) => updateParam("salt", e.target.value)}
              className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none ring-cyan-400/40 focus:ring-2"
            />

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {[
                ["memoryBlocks", "Memory blocks", 8, 64],
                ["iterations", "Iterations", 1, 6],
                ["lanes", "Lanes", 1, 4],
                ["outputBytes", "Output bytes", 8, 32],
              ].map(([key, label, min, max]) => (
                <label
                  key={String(key)}
                  className="block text-sm font-bold text-slate-200"
                >
                  {label}
                  <input
                    type="number"
                    min={Number(min)}
                    max={Number(max)}
                    value={
                      params[key as keyof Argon2idVisualizerParams] as number
                    }
                    onChange={(e) =>
                      updateParam(
                        key as keyof Argon2idVisualizerParams,
                        Number(e.target.value) as never,
                      )
                    }
                    className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none ring-cyan-400/40 focus:ring-2"
                  />
                </label>
              ))}
            </div>

            <button
              type="button"
              onClick={() => {
                setSelectedBlockIndex(0);
                setParams(DEFAULT_ARGON2ID_PARAMS);
              }}
              className="mt-6 w-full rounded-xl border border-white/10 px-4 py-3 text-sm font-bold text-slate-200 transition hover:border-cyan-300/50 hover:text-cyan-100"
            >
              Reset demo parameters
            </button>

            {error ? (
              <div
                role="alert"
                className="mt-5 rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-100"
              >
                {error}
              </div>
            ) : null}
          </aside>

          <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-500">
                  Demo digest
                </p>
                <p className="mt-3 break-all font-mono text-sm text-cyan-200">
                  {result?.digest ?? "—"}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-500">
                  Work factor
                </p>
                <p className="mt-3 text-3xl font-black text-white">
                  {result?.estimatedWorkFactor ?? "—"}
                </p>
                <p className="mt-1 text-sm text-slate-400">{riskLabel}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-500">
                  Blocks shown
                </p>
                <p className="mt-3 text-3xl font-black text-white">
                  {result?.blocks.length ?? 0}
                </p>
                <p className="mt-1 text-sm text-slate-400">
                  Memory grid + finalization
                </p>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-white/10 bg-slate-900/70 p-5">
              <h2 className="text-xl font-black text-white">
                Memory block map
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Each cell represents a demo memory block. Color indicates which
                Argon2id phase produced it.
              </p>
              <div className="mt-5 grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12">
                {result?.blocks.map((block, index) => (
                  <button
                    key={`${block.iteration}-${block.index}-${block.phase}-${index}`}
                    type="button"
                    onClick={() => setSelectedBlockIndex(index)}
                    className={`rounded-xl border p-2 text-left text-xs transition ${index === selectedBlockIndex ? "ring-2 ring-cyan-300" : "hover:border-cyan-300/50"} ${phaseStyles[block.phase]}`}
                    aria-label={`Inspect block ${block.index}, ${phaseLabels[block.phase]}`}
                  >
                    <span className="block font-black">B{block.index}</span>
                    <span className="block truncate font-mono opacity-80">
                      {block.value.slice(0, 4)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </section>
        </section>

        {selectedBlock ? (
          <section className="grid gap-6 lg:grid-cols-[1fr_0.85fr]">
            <article className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
              <span
                className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${phaseStyles[selectedBlock.phase]}`}
              >
                {phaseLabels[selectedBlock.phase]}
              </span>
              <h2 className="mt-4 text-3xl font-black text-white">
                Block {selectedBlock.index}
              </h2>
              <p className="mt-4 text-base leading-8 text-slate-300">
                {selectedBlock.note}
              </p>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <Info
                  label="Iteration"
                  value={String(selectedBlock.iteration)}
                />
                <Info label="Lane" value={String(selectedBlock.lane)} />
                <Info
                  label="Reference block"
                  value={
                    selectedBlock.referenceBlock === null
                      ? "none"
                      : String(selectedBlock.referenceBlock)
                  }
                />
                <Info label="Demo value" value={selectedBlock.value} mono />
              </div>
            </article>

            <aside className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
              <h2 className="text-2xl font-black text-white">Phase summary</h2>
              <div className="mt-5 flex flex-col gap-3">
                {result?.phases.map((phase) => (
                  <div
                    key={phase.id}
                    className={`rounded-2xl border p-4 ${phaseStyles[phase.id]}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-black">{phase.title}</h3>
                      <span className="font-mono text-xs">
                        {phase.blockCount} blocks
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-6 opacity-90">
                      {phase.description}
                    </p>
                  </div>
                ))}
              </div>
            </aside>
          </section>
        ) : null}

        <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
          <h2 className="text-2xl font-black text-white">Security notes</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {result?.securityNotes.map((note) => (
              <div
                key={note}
                className="rounded-2xl border border-white/10 bg-slate-900/70 p-4 text-sm leading-7 text-slate-300"
              >
                {note}
              </div>
            ))}
          </div>
        </section>
      </section>
    </main>
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
