"use client";

import { Fragment, useMemo, useState } from "react";
import {
  autoExtractRsaBits,
  buildCacheHeatmap,
  buildDpaCandidates,
  buildRsaWaveform,
  DEFAULT_DPA_KEY,
  DEFAULT_RSA_BITS,
  DEFAULT_TRACE_COUNT,
  WAVEFORM_SAMPLES_PER_CYCLE,
  type RsaCycle,
} from "@/lib/attacks/sideChannelWaveformLab";

const COLORS = {
  cyan: "#67e8f9",
  blue: "#38bdf8",
  red: "#fb7185",
  yellow: "#facc15",
  green: "#4ade80",
  purple: "#c084fc",
  slate: "#94a3b8",
};

function formatKey(value: number) {
  return `0x${value.toString(16).padStart(2, "0").toUpperCase()}`;
}

function buildPath(
  points: { sample: number; value: number }[],
  width: number,
  height: number,
  minSample: number,
  maxSample: number,
) {
  if (!points.length) return "";

  return points
    .map((point, index) => {
      const x =
        ((point.sample - minSample) / Math.max(1, maxSample - minSample)) *
        width;
      const y = height - point.value * height * 0.82;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

function cycleFromSample(cycles: RsaCycle[], sample: number) {
  return cycles.find(
    (cycle) => sample >= cycle.startSample && sample <= cycle.endSample,
  );
}

export default function SideChannelWaveformLab() {
  const { waveform, cycles } = useMemo(() => buildRsaWaveform(), []);
  const { cells, accessedLines } = useMemo(() => buildCacheHeatmap(), []);

  const [scrub, setScrub] = useState(Math.floor(waveform.length * 0.5));
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState(0);
  const [traceCount, setTraceCount] = useState(DEFAULT_TRACE_COUNT);

  const maxSample = waveform.length - 1;
  const visibleSpan = Math.max(
    WAVEFORM_SAMPLES_PER_CYCLE * 2,
    Math.floor(maxSample / zoom),
  );
  const maxPan = Math.max(0, maxSample - visibleSpan);
  const startSample = Math.min(pan, maxPan);
  const endSample = Math.min(maxSample, startSample + visibleSpan);

  const visiblePoints = waveform.filter(
    (point) => point.sample >= startSample && point.sample <= endSample,
  );
  const activeCycle = cycleFromSample(cycles, scrub) ?? cycles[0];
  const autoBits = autoExtractRsaBits(cycles);

  const handleZoom = (nextZoom: number) => {
    setZoom(nextZoom);
    setPan((current) =>
      Math.min(current, Math.max(0, maxSample - Math.floor(maxSample / nextZoom))),
    );
  };

  const displayedCandidates = useMemo(
    () => buildDpaCandidates(traceCount, DEFAULT_DPA_KEY).candidates,
    [traceCount],
  );
  const displayedRank =
    displayedCandidates.findIndex((candidate) => candidate.key === DEFAULT_DPA_KEY) + 1;
  const topDpa = displayedCandidates.slice(0, 8);
  const displayedCorrect = displayedCandidates.find(
    (candidate) => candidate.key === DEFAULT_DPA_KEY,
  );

  return (
    <section
      aria-labelledby="side-channel-lab-title"
      className="rounded-3xl border border-cyan-500/20 bg-slate-950 p-5 text-slate-100 shadow-2xl shadow-cyan-950/20 sm:p-8"
    >
      <header className="rounded-2xl border border-white/10 bg-white/[0.035] p-6">
        <p className="text-xs font-black uppercase tracking-[0.3em] text-cyan-300">
          Hardware security laboratory
        </p>
        <h2
          id="side-channel-lab-title"
          className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl"
        >
          Microarchitectural &amp; Power Side-Channel Analyzer
        </h2>
        <p className="mt-3 max-w-4xl text-sm leading-7 text-slate-300">
          A deterministic, local simulation of RSA Simple Power Analysis,
          AES Differential Power Analysis, and Flush+Reload cache leakage.
          Nothing is measured from real hardware or sent over the network.
        </p>
      </header>

      <div className="mt-6 grid gap-6">
        <section className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h3 className="text-xl font-black text-white">
                1. SPA oscilloscope — RSA square-and-multiply
              </h3>
              <p className="mt-1 text-sm leading-6 text-slate-400">
                A narrow Square pulse represents a 0 bit. A wider Square +
                Multiply pair represents a 1 bit.
              </p>
            </div>
            <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/5 px-4 py-3 font-mono text-sm">
              Target bits:{" "}
              <span className="font-black text-cyan-200">
                {DEFAULT_RSA_BITS.join(" ")}
              </span>
            </div>
          </div>

          <div className="mt-5 overflow-hidden rounded-xl border border-white/10 bg-black/30 p-3">
            <svg
              viewBox="0 0 1000 280"
              className="h-64 w-full"
              role="img"
              aria-label="Simulated RSA power consumption waveform"
            >
              <line
                x1="0"
                y1="245"
                x2="1000"
                y2="245"
                stroke="#334155"
                strokeWidth="1"
              />
              {cycles.map((cycle) => {
                const x =
                  ((cycle.startSample - startSample) /
                    Math.max(1, endSample - startSample)) *
                  1000;
                return (
                  <line
                    key={`cycle-${cycle.cycle}`}
                    x1={x}
                    y1="0"
                    x2={x}
                    y2="260"
                    stroke="#1e293b"
                    strokeWidth="1"
                    strokeDasharray="4 5"
                  />
                );
              })}
              <path
                d={buildPath(
                  visiblePoints,
                  1000,
                  260,
                  startSample,
                  endSample,
                )}
                fill="none"
                stroke={COLORS.cyan}
                strokeWidth="2.5"
                vectorEffect="non-scaling-stroke"
              />
              {activeCycle ? (
                <rect
                  x={
                    ((activeCycle.startSample - startSample) /
                      Math.max(1, endSample - startSample)) *
                    1000
                  }
                  y="0"
                  width={
                    ((activeCycle.endSample - activeCycle.startSample) /
                      Math.max(1, endSample - startSample)) *
                    1000
                  }
                  height="260"
                  fill={COLORS.cyan}
                  opacity="0.07"
                />
              ) : null}
            </svg>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Scrub sample {scrub}
              <input
                aria-label="Scrub RSA power trace"
                type="range"
                min={0}
                max={maxSample}
                value={scrub}
                onChange={(event) => setScrub(Number(event.target.value))}
                className="mt-2 w-full accent-cyan-300"
              />
            </label>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Zoom {zoom.toFixed(1)}×
              <input
                aria-label="Zoom RSA power trace"
                type="range"
                min={1}
                max={4}
                step={0.5}
                value={zoom}
                onChange={(event) => handleZoom(Number(event.target.value))}
                className="mt-2 w-full accent-cyan-300"
              />
            </label>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Pan
              <input
                aria-label="Pan RSA power trace"
                type="range"
                min={0}
                max={Math.max(0, maxSample - visibleSpan)}
                value={startSample}
                onChange={(event) => setPan(Number(event.target.value))}
                className="mt-2 w-full accent-cyan-300"
              />
            </label>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-white/10 bg-slate-900/80 p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Selected cycle
              </p>
              <p className="mt-1 font-mono text-lg font-black text-white">
                {activeCycle ? activeCycle.cycle + 1 : "—"}
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-slate-900/80 p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Observed operation
              </p>
              <p className="mt-1 text-lg font-black text-cyan-100">
                {activeCycle?.operation ?? "—"}
              </p>
            </div>
            <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-300">
                Auto extraction
              </p>
              <p className="mt-1 font-mono text-lg font-black text-emerald-100">
                {autoBits.join(" ")}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h3 className="text-xl font-black text-white">
                2. DPA correlation — AES S-Box key byte
              </h3>
              <p className="mt-1 text-sm leading-6 text-slate-400">
                Pearson correlation compares measured traces with the Hamming
                weight predicted for every 8-bit key hypothesis.
              </p>
            </div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Traces: {traceCount}
              <input
                aria-label="Number of DPA traces"
                type="range"
                min={16}
                max={160}
                step={16}
                value={traceCount}
                onChange={(event) => setTraceCount(Number(event.target.value))}
                className="mt-2 w-44 accent-cyan-300"
              />
            </label>
          </div>

          <div className="mt-5 overflow-hidden rounded-xl border border-white/10 bg-black/30 p-3">
            <svg
              viewBox="0 0 1024 300"
              className="h-72 w-full"
              role="img"
              aria-label="DPA correlation coefficient for all 256 AES key candidates"
            >
              <line
                x1="0"
                y1="150"
                x2="1024"
                y2="150"
                stroke="#475569"
                strokeWidth="1"
              />
              {displayedCandidates.map((candidate) => {
                const x = candidate.key * 4;
                const magnitude = Math.min(1, Math.abs(candidate.correlation));
                const barHeight = magnitude * 125;
                const y =
                  candidate.correlation >= 0
                    ? 150 - barHeight
                    : 150;
                const isCorrect = candidate.key === DEFAULT_DPA_KEY;

                return (
                  <rect
                    key={candidate.key}
                    x={x + 0.6}
                    y={y}
                    width="2.8"
                    height={Math.max(1, barHeight)}
                    rx="1"
                    fill={isCorrect ? COLORS.green : COLORS.blue}
                    opacity={isCorrect ? 1 : 0.55}
                  />
                );
              })}
              <text x="4" y="18" fill={COLORS.slate} fontSize="12">
                +r
              </text>
              <text x="4" y="294" fill={COLORS.slate} fontSize="12">
                −r
              </text>
              <text x="970" y="270" fill={COLORS.slate} fontSize="12">
                0xFF
              </text>
              <line
                x1={DEFAULT_DPA_KEY * 4 + 2}
                y1="10"
                x2={DEFAULT_DPA_KEY * 4 + 2}
                y2="285"
                stroke={COLORS.green}
                strokeDasharray="4 4"
                strokeWidth="1"
              />
            </svg>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-300">
                Correct candidate
              </p>
              <p className="mt-1 font-mono text-2xl font-black text-emerald-100">
                {formatKey(DEFAULT_DPA_KEY)}
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-slate-900/80 p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Correlation
              </p>
              <p className="mt-1 font-mono text-2xl font-black text-white">
                {displayedCorrect?.correlation.toFixed(3) ?? "—"}
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-slate-900/80 p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Rank
              </p>
              <p className="mt-1 text-2xl font-black text-white">
                #{displayedRank}
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {topDpa.map((candidate, index) => (
              <div
                key={candidate.key}
                className={`rounded-xl border p-3 ${
                  candidate.key === DEFAULT_DPA_KEY
                    ? "border-emerald-400/30 bg-emerald-400/10"
                    : "border-white/10 bg-slate-900/70"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-slate-500">#{index + 1}</span>
                  <span className="font-mono font-black text-white">
                    {formatKey(candidate.key)}
                  </span>
                </div>
                <p className="mt-1 font-mono text-sm text-cyan-200">
                  r = {candidate.correlation.toFixed(3)}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
          <div>
            <h3 className="text-xl font-black text-white">
              3. Flush+Reload — cache-line eviction heatmap
            </h3>
            <p className="mt-1 text-sm leading-6 text-slate-400">
              Red cells are cache flushes, yellow cells are victim accesses,
              and reload timing distinguishes cached lines from uncached lines.
            </p>
          </div>

          <div className="mt-5 overflow-x-auto rounded-xl border border-white/10 bg-black/30 p-3">
            <div
              className="grid min-w-[760px]"
              style={{
                gridTemplateColumns: "72px repeat(20, minmax(24px, 1fr))",
              }}
            >
              <div className="p-1 text-[10px] font-bold text-slate-500">
                L1 line
              </div>
              {Array.from({ length: 20 }, (_, phase) => (
                <div
                  key={phase}
                  className="p-1 text-center text-[9px] text-slate-600"
                >
                  {phase}
                </div>
              ))}
              {Array.from({ length: 32 }, (_, line) => (
                <Fragment key={`row-${line}`}>
                  <div
                    key={`line-${line}`}
                    className="border-t border-white/5 p-1 font-mono text-[10px] text-slate-500"
                  >
                    {line.toString().padStart(2, "0")}
                  </div>
                  {cells
                    .filter((cell) => cell.line === line)
                    .map((cell) => {
                      const fill =
                        cell.state === "flush"
                          ? COLORS.red
                          : cell.state === "access"
                            ? COLORS.yellow
                            : cell.state === "reload-fast"
                              ? COLORS.green
                              : cell.state === "reload-slow"
                                ? COLORS.purple
                                : "#172033";
                      return (
                        <div
                          key={`${cell.line}-${cell.phase}`}
                          title={`L1 line ${cell.line}, phase ${cell.phase}: ${cell.state}`}
                          className="m-px h-5 rounded-[3px]"
                          style={{
                            backgroundColor: fill,
                            opacity: cell.state === "idle" ? 0.45 : 0.9,
                          }}
                        />
                      );
                    })}
                </Fragment>
              ))}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-3 text-xs font-semibold text-slate-300">
            <Legend color={COLORS.red} label="Flush" />
            <Legend color={COLORS.yellow} label="Victim access" />
            <Legend color={COLORS.green} label="Reload: fast / cached" />
            <Legend color={COLORS.purple} label="Reload: slow / evicted" />
            <span className="rounded-full border border-white/10 px-3 py-1">
              Observed lines: {accessedLines.join(", ")}
            </span>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <article className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
            <h3 className="text-xl font-black text-white">
              Why the leak appears
            </h3>
            <ul className="mt-4 space-y-3 text-sm leading-7 text-slate-300">
              <li>
                <strong className="text-white">SPA:</strong> square-and-multiply
                implementations make secret-dependent operation sequences
                visible in power traces.
              </li>
              <li>
                <strong className="text-white">DPA:</strong> averaging is
                replaced by correlation across many traces; the correct
                hypothesis aligns with the measured leakage.
              </li>
              <li>
                <strong className="text-white">Flush+Reload:</strong> cache
                eviction followed by reload timing can reveal which lookup
                table lines a victim touched.
              </li>
            </ul>
          </article>

          <article className="rounded-2xl border border-emerald-400/20 bg-emerald-400/5 p-5">
            <h3 className="text-xl font-black text-white">Defenses</h3>
            <ul className="mt-4 space-y-3 text-sm leading-7 text-slate-300">
              <li>
                Use constant-time, constant-memory-access implementations for
                secret-dependent operations.
              </li>
              <li>
                Prefer hardware-accelerated AES-NI or other audited primitives
                over software lookup tables where available.
              </li>
              <li>
                Use bitsliced or masked designs when the physical threat model
                requires stronger leakage resistance.
              </li>
              <li>
                For physical devices, add shielding, noise countermeasures,
                randomization, and fault/side-channel evaluation during
                certification.
              </li>
            </ul>
          </article>
        </section>

        <div className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-4 text-sm leading-6 text-amber-100">
          <strong>Safety boundary:</strong> all values, traces, correlations,
          and cache timings above are deterministic teaching data. The lab does
          not access a microphone, oscilloscope, CPU performance counters,
          browser cache, network, or external target.
        </div>
      </div>
    </section>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1">
      <span
        aria-hidden="true"
        className="h-2.5 w-2.5 rounded-sm"
        style={{ backgroundColor: color }}
      />
      {label}
    </span>
  );
}
