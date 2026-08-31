"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import {
  encodeMorse,
  decodeMorse,
  generateWaveform,
  farnsworthTiming,
  MORSE_TABLE,
  type MorseResult,
  type WaveformData,
} from "../../lib/encoding/morseCode";
import {
  Play,
  Pause,
  RotateCcw,
  ArrowLeftRight,
  Volume2,
  VolumeX,
  Copy,
  Check,
  Info,
  Zap,
  Clock,
  Target,
} from "lucide-react";
import { cn } from "../../lib/utils";

/* ─── Sample Messages ──────────────────────────────────────────────────────── */

const SAMPLES = [
  { label: "SOS", text: "SOS", hint: "The universal distress signal: ··· — — — ···" },
  { label: "HELLO WORLD", text: "HELLO WORLD", hint: "Classic first Morse message." },
  { label: "SHORT PHRASE", text: "THE QUICK BROWN FOX", hint: "Pangram in Morse." },
  { label: "NUMBERS", text: "12345", hint: "Morse digits 1-5." },
  { label: "PUNCTUATION", text: "STOP!", hint: "Including punctuation marks." },
];

/* ─── Morse Reference Table ────────────────────────────────────────────────── */

function MorseRefTable() {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
  const digits = "0123456789".split("");
  const [showAll, setShowAll] = useState(false);
  const display = showAll ? letters : letters.slice(0, 13);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-600 mb-2">
          Letters
        </h3>
        <div className="grid grid-cols-5 sm:grid-cols-7 md:grid-cols-13 gap-1">
          {display.map((ch) => (
            <div
              key={ch}
              className="flex flex-col items-center rounded-lg border border-white/5 bg-slate-950/40 px-1 py-1.5"
            >
              <span className="text-[10px] font-bold text-white">{ch}</span>
              <span className="text-[10px] font-mono text-teal-400">
                {MORSE_TABLE[ch]}
              </span>
            </div>
          ))}
        </div>
        {!showAll && (
          <button
            onClick={() => setShowAll(true)}
            className="mt-2 text-xs text-teal-400 hover:text-teal-300"
          >
            Show all letters →
          </button>
        )}
      </div>
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-600 mb-2">
          Digits
        </h3>
        <div className="grid grid-cols-5 gap-1">
          {digits.map((ch) => (
            <div
              key={ch}
              className="flex flex-col items-center rounded-lg border border-white/5 bg-slate-950/40 px-1 py-1.5"
            >
              <span className="text-[10px] font-bold text-white">{ch}</span>
              <span className="text-[10px] font-mono text-teal-400">
                {MORSE_TABLE[ch]}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Waveform Renderer ────────────────────────────────────────────────────── */

function WaveformRenderer({
  waveform,
  isPlaying,
  playPosition,
}: {
  waveform: WaveformData;
  isPlaying: boolean;
  playPosition: number;
}) {
  const svgWidth = 800;
  const svgHeight = 80;
  const padding = { left: 10, right: 10, top: 15, bottom: 15 };
  const plotWidth = svgWidth - padding.left - padding.right;
  const plotHeight = svgHeight - padding.top - padding.bottom;
  const unitWidth = plotWidth / Math.max(waveform.totalDuration, 1);

  // Build SVG path for the waveform
  const pathSegments: string[] = [];
  let lastY = padding.top + plotHeight; // Start LOW

  // Start LOW
  pathSegments.push(`M ${padding.left} ${padding.top + plotHeight}`);

  for (const [start, end] of waveform.highRanges) {
    const x1 = padding.left + start * unitWidth;
    const x2 = padding.left + end * unitWidth;
    const highY = padding.top;
    const lowY = padding.top + plotHeight;

    // Go HIGH
    pathSegments.push(`L ${x1} ${lowY}`);
    pathSegments.push(`L ${x1} ${highY}`);
    // Stay HIGH
    pathSegments.push(`L ${x2} ${highY}`);
    // Go LOW
    pathSegments.push(`L ${x2} ${lowY}`);
  }

  // End LOW
  pathSegments.push(
    `L ${padding.left + waveform.totalDuration * unitWidth} ${padding.top + plotHeight}`
  );

  // Play position indicator
  const playX = padding.left + playPosition * unitWidth;

  return (
    <div className="overflow-x-auto rounded-xl border border-white/5 bg-slate-950 p-3">
      <svg
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className="w-full min-w-[400px]"
        style={{ maxHeight: "100px" }}
      >
        {/* Background grid */}
        <line
          x1={padding.left}
          y1={padding.top + plotHeight / 2}
          x2={svgWidth - padding.right}
          y2={padding.top + plotHeight / 2}
          stroke="rgba(255,255,255,0.03)"
          strokeDasharray="4 4"
        />

        {/* Waveform path */}
        <path
          d={pathSegments.join(" ")}
          fill="none"
          stroke="#14b8a6"
          strokeWidth="2"
          strokeLinejoin="round"
        />

        {/* Filled area under waveform */}
        <path
          d={`${pathSegments.join(" ")} L ${padding.left + waveform.totalDuration * unitWidth} ${padding.top + plotHeight} Z`}
          fill="url(#waveGradient)"
          opacity="0.15"
        />

        {/* Gradient definition */}
        <defs>
          <linearGradient id="waveGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#14b8a6" stopOpacity="1" />
            <stop offset="100%" stopColor="#14b8a6" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Character labels at bottom */}
        {waveform.charTimings.map((ct, i) => {
          const x =
            padding.left +
            ((ct.startUnit + ct.endUnit) / 2) * unitWidth;
          return (
            <text
              key={`${ct.char}-${i}`}
              x={x}
              y={svgHeight - 2}
              textAnchor="middle"
              className="fill-zinc-600"
              fontSize="8"
              fontFamily="monospace"
            >
              {ct.char}
            </text>
          );
        })}

        {/* Play position indicator */}
        {isPlaying && (
          <line
            x1={playX}
            y1={padding.top - 5}
            x2={playX}
            y2={padding.top + plotHeight + 5}
            stroke="#f59e0b"
            strokeWidth="2"
            strokeDasharray="3 2"
          />
        )}
      </svg>

      {/* Legend */}
      <div className="mt-2 flex items-center gap-4 text-[10px] text-zinc-600">
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-sm bg-teal-500" />
          Signal HIGH
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-6 rounded-sm bg-slate-700" />
          Gap (LOW)
        </span>
        <span>1 unit = dot duration</span>
      </div>
    </div>
  );
}

/* ─── Character Breakdown ──────────────────────────────────────────────────── */

function CharacterBreakdown({ result }: { result: MorseResult }) {
  if (result.characters.length === 0) return null;

  return (
    <div className="overflow-x-auto rounded-xl border border-white/5">
      <table className="w-full text-xs">
        <thead className="sticky top-0 bg-slate-900">
          <tr className="text-zinc-500">
            <th className="px-3 py-2 text-left font-semibold">Char</th>
            <th className="px-3 py-2 text-left font-semibold">Morse</th>
            <th className="px-3 py-2 text-left font-semibold">Signal</th>
            <th className="px-3 py-2 text-right font-semibold">Units</th>
          </tr>
        </thead>
        <tbody>
          {result.characters.slice(0, 30).map((mc, idx) => {
            const signal = mc.code
              .split("")
              .map((s) => (s === "." ? "●" : s === "-" ? "━" : " "))
              .join(" ");
            const units = mc.code
              .split("")
              .reduce((sum, s, i) => {
                const val = s === "." ? 1 : s === "-" ? 3 : 0;
                const gap = i < mc.code.length - 1 ? 1 : 0;
                return sum + val + gap;
              }, 0);

            return (
              <tr
                key={`${mc.char}-${idx}`}
                className="border-t border-white/5 hover:bg-white/[0.02]"
              >
                <td className="px-3 py-1.5 font-bold text-white font-mono">
                  {mc.char === " " ? "␣" : mc.char}
                </td>
                <td className="px-3 py-1.5 font-mono text-teal-400">
                  {mc.code || "/"}
                </td>
                <td className="px-3 py-1.5 font-mono text-zinc-400">
                  {signal}
                </td>
                <td className="px-3 py-1.5 text-right font-mono text-zinc-500">
                  {units || 7}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {result.characters.length > 30 && (
        <p className="px-3 py-2 text-[10px] text-zinc-600">
          Showing first 30 of {result.characters.length} characters
        </p>
      )}
    </div>
  );
}

/* ─── Timing Visual ────────────────────────────────────────────────────────── */

function TimingVisual({ wpm }: { wpm: number }) {
  const timing = farnsworthTiming(wpm);
  const items = [
    { label: "Dot (·)", ms: timing.dotMs, width: "1fr", color: "bg-teal-500" },
    { label: "Dash (—)", ms: timing.dashMs, width: "3fr", color: "bg-teal-400" },
    { label: "Intra-char gap", ms: timing.intraCharMs, width: "1fr", color: "bg-zinc-700" },
    { label: "Inter-char gap", ms: timing.interCharMs, width: "3fr", color: "bg-zinc-600" },
    { label: "Word gap", ms: timing.wordMs, width: "7fr", color: "bg-zinc-500" },
  ];

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-3">
          <span className="w-28 text-[10px] text-zinc-500 shrink-0 text-right">
            {item.label}
          </span>
          <div className="flex-1 h-4 rounded bg-slate-900 overflow-hidden">
            <div
              className={cn("h-full rounded", item.color)}
              style={{
                width: `${(item.ms / timing.wordMs) * 100}%`,
                minWidth: "4px",
              }}
            />
          </div>
          <span className="w-14 text-[10px] font-mono text-zinc-600 text-right">
            {item.ms.toFixed(1)}ms
          </span>
        </div>
      ))}
    </div>
  );
}

/* ─── Main Component ──────────────────────────────────────────────────────── */

export default function MorseCodeVisualizer() {
  const [mode, setMode] = useState<"encode" | "decode">("encode");
  const [inputText, setInputText] = useState("SOS");
  const [wpm, setWpm] = useState(20);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playPosition, setPlayPosition] = useState(0);
  const playRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  const result: MorseResult | null = useMemo(() => {
    if (!inputText.trim()) return null;
    if (mode === "encode") {
      return encodeMorse(inputText);
    } else {
      return decodeMorse(inputText);
    }
  }, [inputText, mode]);

  const waveform: WaveformData | null = useMemo(() => {
    if (mode !== "encode" || !inputText.trim()) return null;
    return generateWaveform(inputText);
  }, [inputText, mode]);

  // Playback animation
  useEffect(() => {
    if (!isPlaying || !waveform) {
      if (playRef.current) {
        cancelAnimationFrame(playRef.current);
        playRef.current = null;
      }
      return;
    }

    startTimeRef.current = performance.now();
    const totalMs = (waveform.totalDuration / 50) * 1000 * (20 / wpm);

    const animate = (now: number) => {
      const elapsed = now - startTimeRef.current;
      const progress = Math.min(elapsed / totalMs, 1);
      setPlayPosition(progress * waveform.totalDuration);

      if (progress < 1) {
        playRef.current = requestAnimationFrame(animate);
      } else {
        setIsPlaying(false);
        setPlayPosition(0);
      }
    };

    playRef.current = requestAnimationFrame(animate);

    return () => {
      if (playRef.current) cancelAnimationFrame(playRef.current);
    };
  }, [isPlaying, waveform, wpm]);

  const handlePlay = useCallback(() => {
    if (isPlaying) {
      setIsPlaying(false);
      setPlayPosition(0);
    } else {
      setPlayPosition(0);
      setIsPlaying(true);
    }
  }, [isPlaying]);

  const handleCopy = useCallback(() => {
    if (!result) return;
    const text = mode === "encode" ? result.morse : result.decoded;
    navigator.clipboard.writeText(text);
  }, [result, mode]);

  const handleSample = useCallback(
    (text: string) => {
      setInputText(text);
      setMode("encode");
      setIsPlaying(false);
      setPlayPosition(0);
    },
    []
  );

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-10 text-slate-100 sm:px-6 lg:px-8">
      {/* Header */}
      <section className="overflow-hidden rounded-3xl border border-white/10 bg-slate-950 shadow-2xl shadow-black/30">
        <div className="relative isolate px-6 py-10 sm:px-10">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(0,196,174,0.2),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(168,85,247,0.12),transparent_35%)]" />
          <p className="text-sm font-semibold uppercase tracking-[0.32em] text-teal-400">
            Encoding Tool
          </p>
          <div className="mt-4 grid gap-8 lg:grid-cols-[1.25fr_0.75fr] lg:items-end">
            <div>
              <h1 className="max-w-4xl text-4xl font-black tracking-tight text-white sm:text-5xl">
                Morse Code Visualizer
              </h1>
              <p className="mt-5 max-w-3xl text-base leading-8 text-slate-300">
                Encode and decode International Morse Code with real-time signal waveform visualization. Learn timing patterns, character mappings, and the history of the world&apos;s first digital encoding system.
              </p>
            </div>
            <div className="rounded-2xl border border-teal-500/20 bg-teal-500/10 p-5">
              <p className="text-sm font-semibold text-teal-300">
                Interactive Signal
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                Watch the waveform render in real-time. Each dot is 1 time unit, each dash is 3 units. Adjust WPM to see how timing changes.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Sample Messages */}
      <section className="rounded-3xl border border-white/10 bg-white/[0.02] p-6 shadow-xl backdrop-blur-sm">
        <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-500">
          Quick Examples
        </h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {SAMPLES.map((sample) => (
            <button
              key={sample.label}
              onClick={() => handleSample(sample.text)}
              className={cn(
                "rounded-xl border px-3 py-2 text-left transition-all",
                inputText === sample.text && mode === "encode"
                  ? "border-teal-500/40 bg-teal-500/10 text-teal-300"
                  : "border-white/5 bg-white/[0.02] text-zinc-400 hover:border-white/10 hover:text-white"
              )}
            >
              <span className="text-xs font-bold">{sample.label}</span>
              <span className="mt-0.5 block text-[10px] text-zinc-600">
                {sample.hint}
              </span>
            </button>
          ))}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        {/* Left Column: Input & Controls */}
        <div className="space-y-6">
          {/* Mode Toggle & Input */}
          <section className="rounded-3xl border border-white/10 bg-white/[0.02] p-6 shadow-xl backdrop-blur-sm">
            {/* Mode Toggle */}
            <div className="flex items-center gap-2 mb-4">
              <button
                onClick={() => {
                  setMode("encode");
                  setIsPlaying(false);
                  setPlayPosition(0);
                }}
                className={cn(
                  "rounded-xl px-4 py-2 text-sm font-bold transition-all",
                  mode === "encode"
                    ? "bg-teal-500 text-slate-950"
                    : "bg-white/5 text-zinc-400 hover:bg-white/10"
                )}
              >
                Text → Morse
              </button>
              <button
                onClick={() => {
                  setMode("decode");
                  setIsPlaying(false);
                  setPlayPosition(0);
                }}
                className={cn(
                  "rounded-xl px-4 py-2 text-sm font-bold transition-all",
                  mode === "decode"
                    ? "bg-teal-500 text-slate-950"
                    : "bg-white/5 text-zinc-400 hover:bg-white/10"
                )}
              >
                Morse → Text
              </button>
            </div>

            <h2 className="text-2xl font-bold text-white">
              {mode === "encode" ? "Input Text" : "Input Morse Code"}
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              {mode === "encode"
                ? "Type text to encode into Morse code."
                : "Paste Morse code (use spaces between characters, / for words)."}
            </p>
            <div className="mt-4">
              <textarea
                value={inputText}
                onChange={(e) => {
                  setInputText(e.target.value);
                  setIsPlaying(false);
                  setPlayPosition(0);
                }}
                placeholder={
                  mode === "encode"
                    ? "Type text here..."
                    : "Paste morse code (e.g. .... . .-.. .-.. ---)"
                }
                rows={4}
                className="w-full rounded-2xl border border-white/10 bg-slate-900 px-5 py-4 font-mono text-sm text-white outline-none ring-teal-500/40 focus:ring-2 resize-none placeholder:text-zinc-600"
              />
            </div>

            {/* WPM Slider */}
            <div className="mt-4">
              <div className="flex justify-between text-sm">
                <label className="font-semibold text-zinc-300">
                  Speed (WPM)
                </label>
                <span className="font-mono text-teal-400 font-bold">
                  {wpm} WPM
                </span>
              </div>
              <input
                type="range"
                min="5"
                max="40"
                value={wpm}
                onChange={(e) => setWpm(parseInt(e.target.value))}
                className="mt-2 w-full accent-teal-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-zinc-600 mt-1">
                <span>5 WPM (slow)</span>
                <span>40 WPM (fast)</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-4 flex gap-3">
              {mode === "encode" && (
                <button
                  onClick={handlePlay}
                  disabled={!waveform || inputText.trim().length === 0}
                  className="flex items-center gap-2 rounded-xl bg-teal-500 px-5 py-2.5 font-bold text-slate-950 transition-all hover:bg-teal-400 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer text-sm"
                >
                  {isPlaying ? (
                    <>
                      <Pause size={14} fill="currentColor" />
                      Stop
                    </>
                  ) : (
                    <>
                      <Play size={14} fill="currentColor" />
                      Play Signal
                    </>
                  )}
                </button>
              )}
              <button
                onClick={handleCopy}
                disabled={!result}
                className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.02] px-5 py-2.5 font-bold text-zinc-300 transition-all hover:bg-white/[0.06] disabled:opacity-30 cursor-pointer text-sm"
              >
                <Copy size={14} />
                Copy Output
              </button>
            </div>
          </section>

          {/* Timing Visual */}
          <section className="rounded-3xl border border-white/10 bg-white/[0.02] p-6 shadow-xl backdrop-blur-sm">
            <h2 className="text-lg font-bold text-white">
              Farnsworth Timing
            </h2>
            <p className="mt-1 text-xs text-zinc-500">
              Standard Morse timing ratios at {wpm} WPM
            </p>
            <div className="mt-4">
              <TimingVisual wpm={wpm} />
            </div>
          </section>

          {/* Reference Table */}
          <section className="rounded-3xl border border-white/10 bg-white/[0.02] p-6 shadow-xl backdrop-blur-sm">
            <h2 className="text-lg font-bold text-white">
              Morse Code Reference
            </h2>
            <div className="mt-3">
              <MorseRefTable />
            </div>
          </section>
        </div>

        {/* Right Column: Output & Waveform */}
        <div className="space-y-6">
          {/* Output */}
          {result && (
            <section className="rounded-3xl border border-white/10 bg-white/[0.02] p-6 shadow-xl backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white">
                  {mode === "encode" ? "Morse Code Output" : "Decoded Text"}
                </h2>
                <span className="flex items-center gap-1.5 text-xs text-zinc-500">
                  {result.characters.length} characters
                </span>
              </div>
              <div className="mt-4 rounded-2xl border border-white/5 bg-slate-950 p-5">
                <p className="font-mono text-sm text-teal-300 leading-relaxed break-all whitespace-pre-wrap">
                  {mode === "encode" ? result.morse : result.decoded}
                </p>
              </div>
              <div className="mt-3 flex items-center gap-4 text-xs text-zinc-600">
                <span className="flex items-center gap-1">
                  <Zap size={12} />
                  {result.totalElements} elements
                </span>
                <span className="flex items-center gap-1">
                  <Clock size={12} />
                  {result.totalUnits} dot-units
                </span>
                <span className="flex items-center gap-1">
                  <Target size={12} />
                  ~{result.estimatedDurationMs}ms at 20 WPM
                </span>
              </div>
            </section>
          )}

          {/* Waveform */}
          {waveform && mode === "encode" && (
            <section className="rounded-3xl border border-white/10 bg-white/[0.02] p-6 shadow-xl backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white">
                  Signal Waveform
                </h2>
                <span className="text-xs text-zinc-600">
                  {waveform.totalDuration} total units
                </span>
              </div>
              <div className="mt-4">
                <WaveformRenderer
                  waveform={waveform}
                  isPlaying={isPlaying}
                  playPosition={playPosition}
                />
              </div>
            </section>
          )}

          {/* Character Breakdown */}
          {result && (
            <section className="rounded-3xl border border-white/10 bg-white/[0.02] p-6 shadow-xl backdrop-blur-sm">
              <h2 className="text-2xl font-bold text-white">
                Character Breakdown
              </h2>
              <div className="mt-4">
                <CharacterBreakdown result={result} />
              </div>
            </section>
          )}

          {/* Educational Content */}
          <section className="rounded-3xl border border-white/10 bg-white/[0.02] p-6 shadow-xl backdrop-blur-sm">
            <h2 className="text-2xl font-bold text-white">
              About Morse Code
            </h2>
            <div className="mt-4 space-y-4">
              <div className="rounded-xl border border-white/5 bg-slate-950/40 p-4">
                <h3 className="text-sm font-bold text-teal-400">
                  History
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-zinc-400">
                  Developed by Samuel Morse and Alfred Vail in the 1830s-1840s, Morse code was the first
                  widespread digital communication system. It revolutionized long-distance communication
                  by encoding letters and numbers as sequences of short and long signals.
                </p>
              </div>
              <div className="rounded-xl border border-white/5 bg-slate-950/40 p-4">
                <h3 className="text-sm font-bold text-teal-400">
                  Timing Rules
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-zinc-400">
                  The fundamental timing unit is the dot duration. A dash equals 3 dots.
                  The gap between dots/dashes within a character equals 1 dot.
                  The gap between characters equals 3 dots. The gap between words equals 7 dots.
                  This 1:3:1:3:7 ratio is maintained at any speed.
                </p>
              </div>
              <div className="rounded-xl border border-white/5 bg-slate-950/40 p-4">
                <h3 className="text-sm font-bold text-teal-400">
                  Modern Usage
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-zinc-400">
                  While largely replaced by digital communication, Morse code remains used in amateur
                  radio (ham radio), aviation navigation (NDBs), maritime distress signals (SOS),
                  and by some individuals with disabilities as an input method.
                </p>
              </div>
              <div className="rounded-xl border border-white/5 bg-slate-950/40 p-4">
                <h3 className="text-sm font-bold text-teal-400">
                  Cryptographic Connection
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-zinc-400">
                  Morse code was used extensively in military cryptography. Theಛtwas&apos;s famous
                  &quot;Q简&quot; (Q codes) and prosigns are still used today. The encoding itself is not
                  encryption — it&apos;s a character encoding, but it can serve as a simple cipher when
                  combined with frequency analysis techniques.
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
