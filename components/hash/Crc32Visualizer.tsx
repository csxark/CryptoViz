"use client"

import { useMemo, useState } from "react"
import {
  DEFAULT_CRC32_INPUT,
  getCrc32ManualChecklist,
  runCrc32Visualization,
  type Crc32Input,
} from "../../lib/hash/crc32Visualizer"

export default function Crc32Visualizer() {
  const [input, setInput] = useState<Crc32Input>(DEFAULT_CRC32_INPUT)

  const result = useMemo(() => {
    try {
      return { value: runCrc32Visualization(input), error: null as string | null }
    } catch (caught) {
      return {
        value: null,
        error: caught instanceof Error ? caught.message : "Unable to calculate CRC32.",
      }
    }
  }, [input])

  const manualChecklist = getCrc32ManualChecklist()

  function updateInput<K extends keyof Crc32Input>(key: K, value: Crc32Input[K]) {
    setInput((current) => ({ ...current, [key]: value }))
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
        <header className="overflow-hidden rounded-3xl border border-white/10 bg-slate-900 shadow-2xl shadow-black/30">
          <div className="relative isolate px-6 py-10 sm:px-10">
            <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.25),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(34,197,94,0.18),transparent_32%)]" />
            <p className="text-sm font-semibold uppercase tracking-[0.32em] text-cyan-300">
              Checksums
            </p>
            <div className="mt-4 grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
              <div>
                <h1 className="text-4xl font-black tracking-tight text-white sm:text-5xl">
                  CRC32 Visualization
                </h1>
                <p className="mt-5 max-w-3xl text-base leading-8 text-slate-300">
                  Explore how CRC32 processes data byte by byte using a reflected
                  polynomial, lookup table, shifting, and XOR to produce a checksum.
                </p>
              </div>
              <div className="rounded-2xl border border-amber-300/20 bg-amber-300/10 p-5">
                <p className="text-sm font-bold text-amber-100">Checksum note</p>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  CRC32 detects accidental corruption. It is not a cryptographic hash
                  and should not be used for passwords, signatures, or tamper proofing.
                </p>
              </div>
            </div>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-[0.78fr_1.22fr]">
          <aside className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
            <h2 className="text-2xl font-black text-white">Input</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Try the standard test vector or any short UTF-8 message.
            </p>

            <label className="mt-6 block text-sm font-bold text-slate-200">
              Message
            </label>
            <textarea
              value={input.message}
              onChange={(event) => updateInput("message", event.target.value)}
              className="mt-2 min-h-32 w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none ring-cyan-400/40 focus:ring-2"
            />

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-bold text-slate-200">
                Initial value
                <input
                  value={input.initialValue}
                  onChange={(event) => updateInput("initialValue", event.target.value)}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 font-mono text-sm text-white outline-none ring-cyan-400/40 focus:ring-2"
                />
              </label>

              <label className="block text-sm font-bold text-slate-200">
                Final XOR
                <input
                  value={input.finalXorValue}
                  onChange={(event) => updateInput("finalXorValue", event.target.value)}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 font-mono text-sm text-white outline-none ring-cyan-400/40 focus:ring-2"
                />
              </label>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {["CryptoViz", "123456789", "hello", "checksum"].map((message) => (
                <button
                  key={message}
                  type="button"
                  onClick={() => updateInput("message", message)}
                  className="rounded-full border border-white/10 px-3 py-1.5 text-xs font-bold text-slate-300 transition hover:border-cyan-300/60 hover:text-cyan-100"
                >
                  {message}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setInput(DEFAULT_CRC32_INPUT)}
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
            <h2 className="text-2xl font-black text-white">CRC32 result</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              The checksum is the final register after all bytes are processed and the
              final XOR is applied.
            </p>

            <div className="mt-5 rounded-2xl border border-cyan-300/20 bg-cyan-400/10 p-5">
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-cyan-100">
                Checksum hex
              </p>
              <p className="mt-3 break-all font-mono text-4xl font-black text-white">
                {result.value?.checksum ?? "—"}
              </p>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-3">
              <Metric label="Bytes processed" value={result.value?.steps.length ?? "—"} />
              <Metric label="Polynomial" value={result.value?.polynomial ?? "—"} mono />
              <Metric label="Decimal" value={result.value?.checksumDecimal ?? "—"} />
            </div>
          </section>
        </section>

        {result.value ? (
          <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
            <h2 className="text-2xl font-black text-white">Byte-by-byte trace</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Each step shows the current byte, table lookup, and updated CRC register.
            </p>

            <div className="mt-5 max-h-96 overflow-auto rounded-2xl border border-white/10">
              <table className="w-full min-w-[900px] border-collapse text-left text-sm">
                <thead className="sticky top-0 bg-slate-900 text-xs uppercase tracking-[0.18em] text-slate-400">
                  <tr>
                    <th className="px-4 py-3">#</th>
                    <th className="px-4 py-3">Char</th>
                    <th className="px-4 py-3">Byte</th>
                    <th className="px-4 py-3">Before</th>
                    <th className="px-4 py-3">Table index</th>
                    <th className="px-4 py-3">Table value</th>
                    <th className="px-4 py-3">After</th>
                  </tr>
                </thead>
                <tbody>
                  {result.value.steps.map((step) => (
                    <tr key={step.index} className="border-t border-white/5">
                      <td className="px-4 py-3 font-mono text-slate-400">{step.index + 1}</td>
                      <td className="px-4 py-3 font-mono text-white">{step.character}</td>
                      <td className="px-4 py-3 font-mono text-cyan-100">{step.byteHex}</td>
                      <td className="px-4 py-3 font-mono text-slate-300">{step.before}</td>
                      <td className="px-4 py-3 font-mono text-amber-100">{step.tableIndex}</td>
                      <td className="px-4 py-3 font-mono text-violet-100">{step.tableValue}</td>
                      <td className="px-4 py-3 font-mono text-emerald-100">{step.afterShiftXor}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        {result.value ? (
          <section className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
            <article className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
              <h2 className="text-2xl font-black text-white">Lookup table preview</h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                CRC32 uses a 256-entry table. This preview shows the first sixteen
                entries generated from the reflected polynomial.
              </p>
              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {result.value.tablePreview.map((entry, index) => (
                  <div key={entry} className="rounded-2xl border border-white/10 bg-slate-900/70 p-3">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                      {index.toString(16).toUpperCase().padStart(2, "0")}
                    </p>
                    <p className="mt-2 font-mono text-sm text-cyan-100">{entry}</p>
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
      <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-500">
        {label}
      </p>
      <p className={`mt-2 break-all ${mono ? "font-mono text-sm text-cyan-200" : "text-3xl font-black text-white"}`}>
        {value}
      </p>
    </div>
  )
}
