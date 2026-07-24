"use client";

import { useMemo, useState } from "react";
import {
  VISUALIZATION_GUIDE_QUALITY_CHECKS,
  VISUALIZATION_GUIDE_STAGES,
  buildManualTestingChecklist,
  calculateGuideCompletion,
  getVisualizationGuideStage,
  type GuideStageId,
} from "../../lib/docs/visualizationGuide";

const stageIds = VISUALIZATION_GUIDE_STAGES.map((stage) => stage.id);

export default function VisualizationDevelopmentGuide() {
  const [activeStageId, setActiveStageId] = useState<GuideStageId>("scope");
  const [completedStageIds, setCompletedStageIds] = useState<GuideStageId[]>(
    [],
  );
  const [featureName, setFeatureName] = useState("XXHash32 visualization");

  const activeStage = getVisualizationGuideStage(activeStageId);
  const completion = calculateGuideCompletion(completedStageIds);
  const manualTestingChecklist = useMemo(
    () => buildManualTestingChecklist(featureName),
    [featureName],
  );

  function toggleStage(stageId: GuideStageId) {
    setCompletedStageIds((current) =>
      current.includes(stageId)
        ? current.filter((id) => id !== stageId)
        : [...current, stageId],
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-3xl border border-white/10 bg-slate-900 shadow-2xl shadow-black/30">
          <div className="relative isolate px-6 py-10 sm:px-10">
            <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.25),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(168,85,247,0.2),transparent_32%)]" />
            <p className="text-sm font-semibold uppercase tracking-[0.32em] text-cyan-300">
              CryptoViz guide
            </p>
            <div className="mt-4 grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
              <div>
                <h1 className="text-4xl font-black tracking-tight text-white sm:text-5xl">
                  Visualization Development Guide
                </h1>
                <p className="mt-5 max-w-3xl text-base leading-8 text-slate-300">
                  A practical checklist for building cryptography visualizations
                  that are educational, deterministic, accessible, responsive,
                  and easy to review.
                </p>
              </div>
              <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-5">
                <p className="text-sm font-bold text-cyan-100">
                  Guide completion
                </p>
                <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full bg-cyan-300 transition-all"
                    style={{ width: `${completion}%` }}
                  />
                </div>
                <p className="mt-3 text-3xl font-black text-white">
                  {completion}%
                </p>
                <p className="text-sm text-slate-300">
                  Mark stages complete as your feature becomes PR-ready.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[0.82fr_1.18fr]">
          <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
            <h2 className="text-xl font-bold text-white">Development stages</h2>
            <div className="mt-5 flex flex-col gap-2">
              {VISUALIZATION_GUIDE_STAGES.map((stage, index) => {
                const active = stage.id === activeStageId;
                const complete = completedStageIds.includes(stage.id);

                return (
                  <button
                    key={stage.id}
                    type="button"
                    onClick={() => setActiveStageId(stage.id)}
                    className={`rounded-2xl border p-4 text-left transition ${
                      active
                        ? "border-cyan-300/70 bg-cyan-300/10"
                        : "border-white/10 bg-slate-900/60 hover:border-cyan-300/40"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-500">
                          Stage {index + 1}
                        </p>
                        <p className="mt-1 font-bold text-white">
                          {stage.title}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-black ${
                          complete
                            ? "bg-emerald-300 text-slate-950"
                            : "bg-slate-800 text-slate-300"
                        }`}
                      >
                        {complete ? "done" : "todo"}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.24em] text-cyan-300">
                  Active stage
                </p>
                <h2 className="mt-2 text-3xl font-black text-white">
                  {activeStage.title}
                </h2>
                <p className="mt-3 leading-7 text-slate-300">
                  {activeStage.summary}
                </p>
              </div>
              <button
                type="button"
                onClick={() => toggleStage(activeStage.id)}
                className="rounded-xl bg-cyan-300 px-4 py-3 text-sm font-black text-slate-950 transition hover:bg-cyan-200"
              >
                {completedStageIds.includes(activeStage.id)
                  ? "Mark incomplete"
                  : "Mark complete"}
              </button>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-5">
                <h3 className="font-bold text-white">Checklist</h3>
                <ul className="mt-4 space-y-3">
                  {activeStage.checklist.map((item) => (
                    <li
                      key={item}
                      className="flex gap-3 text-sm leading-6 text-slate-300"
                    >
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-cyan-300" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-2xl border border-violet-300/20 bg-violet-400/10 p-5">
                <h3 className="font-bold text-violet-100">Example</h3>
                <p className="mt-4 text-sm leading-7 text-slate-300">
                  {activeStage.example}
                </p>
              </div>
            </div>
          </section>
        </div>

        <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
          <h2 className="text-2xl font-black text-white">Quality gates</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
            Use these checks before opening a PR so reviewers can quickly verify
            the feature without guessing what changed.
          </p>
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {VISUALIZATION_GUIDE_QUALITY_CHECKS.map((check) => (
              <article
                key={check.label}
                className="rounded-2xl border border-white/10 bg-slate-900/70 p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-bold text-white">{check.label}</h3>
                  <span
                    className={`rounded-full px-2 py-1 text-[11px] font-black uppercase tracking-wide ${
                      check.required
                        ? "bg-rose-300 text-slate-950"
                        : "bg-slate-700 text-slate-200"
                    }`}
                  >
                    {check.required ? "required" : "optional"}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-400">
                  {check.description}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
          <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <h2 className="text-2xl font-black text-white">
                Manual testing checklist builder
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Enter your feature name and copy the generated checklist into
                your PR.
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
            <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-5">
              <ol className="space-y-3">
                {manualTestingChecklist.map((item, index) => (
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
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}
