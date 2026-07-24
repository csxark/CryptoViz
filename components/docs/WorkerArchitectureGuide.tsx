"use client";

import { useMemo, useState } from "react";
import {
  WORKER_ARCHITECTURE_SECTIONS,
  WORKER_MESSAGE_FLOW,
  buildWorkerManualTestingChecklist,
  calculateWorkerFlowProgress,
  getWorkerArchitectureSection,
  type WorkerArchitectureSectionId,
} from "../../lib/docs/workerArchitecture";

const actorStyles = {
  UI: "border-cyan-300/40 bg-cyan-300/10 text-cyan-100",
  Hook: "border-violet-300/40 bg-violet-300/10 text-violet-100",
  Worker: "border-emerald-300/40 bg-emerald-300/10 text-emerald-100",
  "Cipher Module": "border-amber-300/40 bg-amber-300/10 text-amber-100",
};

export default function WorkerArchitectureGuide() {
  const [activeSectionId, setActiveSectionId] =
    useState<WorkerArchitectureSectionId>("overview");
  const [activeStageIndex, setActiveStageIndex] = useState(0);
  const [featureName, setFeatureName] = useState("XXHash32 visualization");

  const activeSection = getWorkerArchitectureSection(activeSectionId);
  const activeStage = WORKER_MESSAGE_FLOW[activeStageIndex];
  const progress = calculateWorkerFlowProgress(activeStageIndex);
  const manualChecklist = useMemo(
    () => buildWorkerManualTestingChecklist(featureName),
    [featureName],
  );

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
        <header className="overflow-hidden rounded-3xl border border-white/10 bg-slate-900 shadow-2xl shadow-black/30">
          <div className="relative isolate px-6 py-10 sm:px-10">
            <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.26),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(34,197,94,0.18),transparent_30%)]" />
            <p className="text-sm font-semibold uppercase tracking-[0.32em] text-cyan-300">
              CryptoViz architecture
            </p>
            <div className="mt-4 grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
              <div>
                <h1 className="text-4xl font-black tracking-tight text-white sm:text-5xl">
                  Worker Architecture Documentation
                </h1>
                <p className="mt-5 max-w-3xl text-base leading-8 text-slate-300">
                  Learn how CryptoViz moves heavy cryptographic operations into
                  Web Workers, keeps the visualizer responsive, and returns
                  structured output for steps, errors, and timing.
                </p>
              </div>
              <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-5">
                <p className="text-sm font-bold text-cyan-100">
                  Current message stage
                </p>
                <p className="mt-2 text-2xl font-black text-white">
                  {activeStage.label}
                </p>
                <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full bg-cyan-300 transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="mt-3 text-sm text-slate-300">
                  {progress}% through the worker message flow
                </p>
              </div>
            </div>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-[0.78fr_1.22fr]">
          <aside className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
            <h2 className="text-xl font-bold text-white">
              Architecture sections
            </h2>
            <div className="mt-5 flex flex-col gap-2">
              {WORKER_ARCHITECTURE_SECTIONS.map((section, index) => {
                const active = section.id === activeSectionId;

                return (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() => setActiveSectionId(section.id)}
                    className={`rounded-2xl border p-4 text-left transition ${
                      active
                        ? "border-cyan-300/70 bg-cyan-300/10"
                        : "border-white/10 bg-slate-900/60 hover:border-cyan-300/40"
                    }`}
                  >
                    <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-500">
                      Section {index + 1}
                    </p>
                    <p className="mt-1 font-bold text-white">{section.title}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-400">
                      {section.summary}
                    </p>
                  </button>
                );
              })}
            </div>
          </aside>

          <article className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
            <p className="text-sm font-bold uppercase tracking-[0.24em] text-cyan-300">
              Selected topic
            </p>
            <h2 className="mt-2 text-3xl font-black text-white">
              {activeSection.title}
            </h2>
            <p className="mt-3 leading-7 text-slate-300">
              {activeSection.summary}
            </p>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-5">
                <h3 className="font-bold text-white">Key points</h3>
                <ul className="mt-4 space-y-3">
                  {activeSection.details.map((detail) => (
                    <li
                      key={detail}
                      className="flex gap-3 text-sm leading-6 text-slate-300"
                    >
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-cyan-300" />
                      <span>{detail}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-2xl border border-violet-300/20 bg-violet-400/10 p-5">
                <h3 className="font-bold text-violet-100">Code pattern</h3>
                <pre className="mt-4 overflow-x-auto rounded-xl bg-slate-950 p-4 text-xs leading-6 text-cyan-100">
                  <code>{activeSection.codeExample}</code>
                </pre>
              </div>
            </div>
          </article>
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-2xl font-black text-white">
                Worker message flow
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
                Step through how a visualizer request moves from the UI to the
                worker, into the cipher module, and back to the rendered result.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() =>
                  setActiveStageIndex((index) => Math.max(0, index - 1))
                }
                className="rounded-xl border border-white/10 px-4 py-2 text-sm font-bold text-slate-200 hover:border-cyan-300/50"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() =>
                  setActiveStageIndex((index) =>
                    Math.min(WORKER_MESSAGE_FLOW.length - 1, index + 1),
                  )
                }
                className="rounded-xl bg-cyan-300 px-4 py-2 text-sm font-black text-slate-950 hover:bg-cyan-200"
              >
                Next
              </button>
            </div>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="flex flex-col gap-2">
              {WORKER_MESSAGE_FLOW.map((stage, index) => (
                <button
                  key={stage.id}
                  type="button"
                  onClick={() => setActiveStageIndex(index)}
                  className={`rounded-2xl border p-4 text-left transition ${
                    index === activeStageIndex
                      ? "border-cyan-300/70 bg-cyan-300/10"
                      : "border-white/10 bg-slate-900/60 hover:border-cyan-300/40"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-500">
                        Step {index + 1}
                      </p>
                      <p className="mt-1 font-bold text-white">{stage.label}</p>
                    </div>
                    <span
                      className={`rounded-full border px-2.5 py-1 text-xs font-black ${
                        actorStyles[stage.actor]
                      }`}
                    >
                      {stage.actor}
                    </span>
                  </div>
                </button>
              ))}
            </div>

            <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-6">
              <span
                className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${
                  actorStyles[activeStage.actor]
                }`}
              >
                {activeStage.actor}
              </span>
              <h3 className="mt-4 text-3xl font-black text-white">
                {activeStage.label}
              </h3>
              <p className="mt-4 text-base leading-8 text-slate-300">
                {activeStage.description}
              </p>
              <div className="mt-6 rounded-2xl border border-white/10 bg-slate-950 p-5">
                <p className="text-sm font-bold text-white">
                  Architecture rule
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Keep message payloads structured and deterministic so worker
                  results can be tested, cached, cancelled, and rendered
                  consistently.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
          <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <h2 className="text-2xl font-black text-white">
                Worker manual testing checklist
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Generate PR-ready testing notes for features that touch workers
                or worker-backed cipher modules.
              </p>
              <label className="mt-5 block text-sm font-bold text-slate-200">
                Feature name
              </label>
              <input
                value={featureName}
                onChange={(event) => setFeatureName(event.target.value)}
                className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none ring-cyan-400/40 placeholder:text-slate-500 focus:ring-2"
              />
            </div>
            <ol className="rounded-2xl border border-white/10 bg-slate-900/70 p-5">
              {manualChecklist.map((item, index) => (
                <li
                  key={item}
                  className="flex gap-3 py-2 text-sm leading-6 text-slate-300"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-cyan-300 text-xs font-black text-slate-950">
                    {index + 1}
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ol>
          </div>
        </section>
      </section>
    </main>
  );
}
