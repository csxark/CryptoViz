"use client";

import { useMemo, useState } from "react";
import {
  DEFAULT_AES_KEY_EXPANSION_INPUT,
  expandAes128Key,
  getAesKeyExpansionManualChecklist,
  type AesKeyWord,
} from "../../lib/symmetric/aesKeyExpansionVisualizer";

const sourceStyles: Record<AesKeyWord["source"], string> = {
  key: "border-sky-300/40 bg-sky-300/10 text-sky-100",
  rotword: "border-violet-300/40 bg-violet-300/10 text-violet-100",
  subword: "border-fuchsia-300/40 bg-fuchsia-300/10 text-fuchsia-100",
  rcon: "border-amber-300/40 bg-amber-300/10 text-amber-100",
  xor: "border-emerald-300/40 bg-emerald-300/10 text-emerald-100",
};

export default function AesKeyExpansionVisualizer() {
  const [keyHex, setKeyHex] = useState(DEFAULT_AES_KEY_EXPANSION_INPUT.keyHex);
  const [activeRound, setActiveRound] = useState(0);
  const [activeWordIndex, setActiveWordIndex] = useState(0);

  const result = useMemo(() => {
    try {
      return { value: expandAes128Key(keyHex), error: null as string | null };
    } catch (caught) {
      return {
        value: null,
        error:
          caught instanceof Error
            ? caught.message
            : "Unable to expand AES key.",
      };
    }
  }, [keyHex]);

  const activeRoundData = result.value?.roundKeys[activeRound];
  const activeWord =
    result.value?.expandedWords[
      Math.min(
        activeWordIndex,
        Math.max(0, result.value.expandedWords.length - 1),
      )
    ];
  const manualChecklist = getAesKeyExpansionManualChecklist();

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
        <header className="overflow-hidden rounded-3xl border border-white/10 bg-slate-900 shadow-2xl shadow-black/30">
          <div className="relative isolate px-6 py-10 sm:px-10">
            <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.25),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(99,102,241,0.2),transparent_32%)]" />
            <p className="text-sm font-semibold uppercase tracking-[0.32em] text-cyan-300">
              Symmetric cryptography
            </p>
            <div className="mt-4 grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
              <div>
                <h1 className="text-4xl font-black tracking-tight text-white sm:text-5xl">
                  Interactive AES Key Expansion Visualizer
                </h1>
                <p className="mt-5 max-w-3xl text-base leading-8 text-slate-300">
                  Explore how a 128-bit AES key expands into 44 words and 11
                  round keys using RotWord, SubWord, round constants, and XOR.
                </p>
              </div>
              <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-5">
                <p className="text-sm font-bold text-cyan-100">
                  AES-128 schedule
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  The visualizer focuses on AES-128 because it has 4 original
                  words, 44 total words, and 11 round keys.
                </p>
              </div>
            </div>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-[0.78fr_1.22fr]">
          <aside className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
            <h2 className="text-2xl font-black text-white">Key input</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Enter exactly 32 hexadecimal characters for an AES-128 key.
            </p>

            <label className="mt-6 block text-sm font-bold text-slate-200">
              AES-128 key
            </label>
            <input
              value={keyHex}
              onChange={(event) => {
                setKeyHex(event.target.value);
                setActiveRound(0);
                setActiveWordIndex(0);
              }}
              className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 font-mono text-sm text-white outline-none ring-cyan-400/40 focus:ring-2"
            />

            <button
              type="button"
              onClick={() => {
                setKeyHex(DEFAULT_AES_KEY_EXPANSION_INPUT.keyHex);
                setActiveRound(0);
                setActiveWordIndex(0);
              }}
              className="mt-5 w-full rounded-xl border border-white/10 px-4 py-3 text-sm font-bold text-slate-200 transition hover:border-cyan-300/50 hover:text-cyan-100"
            >
              Reset to NIST-style demo key
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
                label="Expanded words"
                value={result.value?.expandedWords.length ?? "—"}
              />
              <Metric
                label="Round keys"
                value={result.value?.roundKeys.length ?? "—"}
              />
              <Metric label="Active round" value={activeRound} />
            </div>
          </aside>

          <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
            <h2 className="text-2xl font-black text-white">Round keys</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Each AES-128 round key contains four 32-bit words.
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {result.value?.roundKeys.map((round) => (
                <button
                  key={round.round}
                  type="button"
                  onClick={() => {
                    setActiveRound(round.round);
                    setActiveWordIndex(round.round * 4);
                  }}
                  className={`rounded-2xl border p-4 text-left transition ${
                    activeRound === round.round
                      ? "border-cyan-300/70 bg-cyan-300/10"
                      : "border-white/10 bg-slate-900/70 hover:border-cyan-300/50"
                  }`}
                >
                  <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-500">
                    Round {round.round}
                  </p>
                  <p className="mt-2 break-all font-mono text-xs text-cyan-100">
                    {round.roundKey}
                  </p>
                </button>
              ))}
            </div>
          </section>
        </section>

        {activeRoundData ? (
          <section className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
            <article className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
              <h2 className="text-2xl font-black text-white">
                Round {activeRoundData.round} word breakdown
              </h2>
              <div className="mt-5 overflow-x-auto rounded-2xl border border-white/10">
                <table className="w-full min-w-[680px] border-collapse text-left text-sm">
                  <thead className="bg-slate-900 text-xs uppercase tracking-[0.18em] text-slate-400">
                    <tr>
                      <th className="px-4 py-3">Word</th>
                      <th className="px-4 py-3">Bytes</th>
                      <th className="px-4 py-3">Source</th>
                      <th className="px-4 py-3">Expression</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeRoundData.words.map((word) => (
                      <tr key={word.index} className="border-t border-white/5">
                        <td className="px-4 py-3 font-mono text-cyan-100">
                          w[{word.index}]
                        </td>
                        <td className="px-4 py-3 font-mono text-white">
                          {word.bytes.join(" ")}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded-full border px-2.5 py-1 text-xs font-black ${sourceStyles[word.source]}`}
                          >
                            {word.source}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-300">
                          <button
                            type="button"
                            onClick={() => setActiveWordIndex(word.index)}
                            className="text-left underline decoration-cyan-300/40 underline-offset-4 hover:text-cyan-100"
                          >
                            {word.expression}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>

            {activeWord ? (
              <aside className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
                <span
                  className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${sourceStyles[activeWord.source]}`}
                >
                  {activeWord.source}
                </span>
                <h2 className="mt-4 text-3xl font-black text-white">
                  w[{activeWord.index}]
                </h2>
                <p className="mt-4 break-all font-mono text-xl text-cyan-100">
                  {activeWord.bytes.join(" ")}
                </p>
                <div className="mt-6 rounded-2xl border border-violet-300/20 bg-violet-400/10 p-5">
                  <p className="text-sm font-bold text-violet-100">
                    Expression
                  </p>
                  <p className="mt-3 text-sm leading-7 text-slate-200">
                    {activeWord.expression}
                  </p>
                </div>
                <p className="mt-5 text-base leading-8 text-slate-300">
                  {activeWord.note}
                </p>
              </aside>
            ) : null}
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
