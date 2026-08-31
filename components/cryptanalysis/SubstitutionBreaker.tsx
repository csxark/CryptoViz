"use client";

import { useState, useCallback, useRef, useMemo } from "react";
import {
  breakSubstitution,
  frequencyAnalysisSeed,
  applyKey,
  buildKeyMapping,
  scoreKey,
  randomKey,
  identityKey,
  type BreakerResult,
  type SubstitutionKey,
  type ConvergencePoint,
  DEFAULT_CONFIG,
} from "../../lib/cryptanalysis/substitutionBreaker";
import {
  Play,
  Pause,
  RotateCcw,
  Zap,
  Target,
  BarChart3,
  Key,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Clock,
  Brain,
  Check,
  Copy,
} from "lucide-react";
import { cn } from "../../lib/utils";

/* ─── Sample Ciphertexts ──────────────────────────────────────────────────── */

const SAMPLES = [
  {
    label: "Simple (short)",
    ciphertext: "GUVF VF N GRFG",
    hint: "Caesar shift — frequency seed can crack it instantly.",
  },
  {
    label: "Medium length",
    ciphertext:
      "XJCRU JWQCU YQTFI YJ QJTWF YMJ JWQ XZJI JSYJW JXJQJW YMFY JWSJ YMJ JFQUJW YMJ QJFWI JSYJW JXJQJW YMFY JWSJ YMJ JFQUJW",
    hint: "Longer text gives better frequency analysis.",
  },
  {
    label: "Substitution cipher",
    ciphertext:
      "KZ BRXU VKRSC YLBYB RXU YLBYB RXU KZ YBFX VRZZ YBFX YLBYB RXU KZ YBFX VRZZ",
    hint: "General monoalphabetic substitution — needs hill climbing.",
  },
  {
    label: "Block of English",
    ciphertext:
      "THE QUICK BROWN FOX JUMPS OVER THE LAZY DOG",
    hint: "Already plaintext — the key is the identity mapping.",
  },
];

/* ─── Key Mapping Visual ───────────────────────────────────────────────────── */

function KeyMappingVisual({
  key,
  label,
  compact = false,
}: {
  key: SubstitutionKey;
  label?: string;
  compact?: boolean;
}) {
  const mapping = buildKeyMapping(key);
  return (
    <div className="space-y-1">
      {label && (
        <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-600">
          {label}
        </p>
      )}
      <div
        className={cn(
          "font-mono text-xs leading-relaxed",
          compact ? "grid grid-cols-13 gap-x-1" : "flex flex-wrap gap-x-2 gap-y-0.5"
        )}
      >
        {mapping.map((m) => (
          <span
            key={m.cipher}
            className={cn(
              "inline-flex flex-col items-center",
              compact ? "text-center" : ""
            )}
          >
            <span className="text-zinc-500">{m.cipher}</span>
            <span
              className={cn(
                "font-bold",
                m.cipher === m.plain ? "text-zinc-600" : "text-teal-400"
              )}
            >
              {m.plain}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

/* ─── Convergence Chart ────────────────────────────────────────────────────── */

function ConvergenceChart({
  history,
}: {
  history: ConvergencePoint[];
}) {
  if (history.length < 2) return null;

  const scores = history.map((h) => h.score);
  const minScore = Math.min(...scores);
  const maxScore = Math.max(...scores);
  const range = maxScore - minScore || 1;

  const svgWidth = 600
  const svgHeight = 120
  const padding = { top: 10, right: 10, bottom: 20, left: 50 }
  const plotWidth = svgWidth - padding.left - padding.right
  const plotHeight = svgHeight - padding.top - padding.bottom

  const points = history.map((h, i) => ({
    x: padding.left + (i / (history.length - 1)) * plotWidth,
    y: padding.top + plotHeight - ((h.score - minScore) / range) * plotHeight,
  }))

  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ")

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className="w-full max-w-[600px]"
      >
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
          const y = padding.top + plotHeight * (1 - frac)
          const val = minScore + range * frac
          return (
            <g key={frac}>
              <line
                x1={padding.left}
                y1={y}
                x2={svgWidth - padding.right}
                y2={y}
                stroke="rgba(255,255,255,0.05)"
              />
              <text
                x={padding.left - 5}
                y={y + 3}
                textAnchor="end"
                className="fill-zinc-600"
                fontSize="8"
              >
                {val.toFixed(0)}
              </text>
            </g>
          )
        })}

        {/* Line */}
        <path d={pathD} fill="none" stroke="#14b8a6" strokeWidth="1.5" />

        {/* End dot */}
        {points.length > 0 && (
          <circle
            cx={points[points.length - 1].x}
            cy={points[points.length - 1].y}
            r="3"
            fill="#14b8a6"
          />
        )}

        {/* X axis label */}
        <text
          x={svgWidth / 2}
          y={svgHeight - 2}
          textAnchor="middle"
          className="fill-zinc-600"
          fontSize="8"
        >
          Iteration
        </text>
      </svg>
    </div>
  );
}

/* ─── Candidate Result Card ────────────────────────────────────────────────── */

function CandidateCard({
  result,
  rank,
  isExpanded,
  onToggle,
}: {
  result: {
    key: SubstitutionKey;
    plaintext: string;
    score: number;
    restartIndex: number;
    iterations: number;
    converged: boolean;
  };
  rank: number;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      navigator.clipboard.writeText(result.plaintext);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    },
    [result.plaintext]
  );

  return (
    <div
      className={cn(
        "rounded-2xl border transition-all duration-200",
        rank === 0
          ? "border-teal-500/30 bg-teal-500/5"
          : "border-white/5 bg-white/[0.02]"
      )}
    >
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-4 p-5 text-left"
      >
        <div
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-xl text-sm font-black shrink-0",
            rank === 0
              ? "bg-teal-500 text-slate-950"
              : "bg-white/10 text-zinc-400"
          )}
        >
          {rank + 1}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white truncate font-mono">
            {result.plaintext.slice(0, 80)}
            {result.plaintext.length > 80 ? "..." : ""}
          </p>
          <div className="mt-1 flex items-center gap-3 text-xs text-zinc-500">
            <span>Score: {result.score.toFixed(1)}</span>
            <span>Restart #{result.restartIndex}</span>
            <span>{result.iterations} iters</span>
            {result.converged && (
              <span className="text-emerald-500">converged</span>
            )}
          </div>
        </div>
        <button
          onClick={handleCopy}
          className="rounded-lg p-2 text-zinc-500 hover:bg-white/5 hover:text-white transition-colors shrink-0"
          title="Copy plaintext"
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
        </button>
        {isExpanded ? (
          <ChevronUp size={16} className="text-zinc-500 shrink-0" />
        ) : (
          <ChevronDown size={16} className="text-zinc-500 shrink-0" />
        )}
      </button>
      {isExpanded && (
        <div className="border-t border-white/5 px-5 pb-5 pt-4 space-y-4">
          {/* Full plaintext */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-600 mb-1">
              Full Decrypted Text
            </p>
            <p className="rounded-xl bg-slate-900 p-3 font-mono text-sm text-teal-300 leading-relaxed break-all">
              {result.plaintext}
            </p>
          </div>
          {/* Key mapping */}
          <KeyMappingVisual key={result.key} label="Substitution Key" />
        </div>
      )}
    </div>
  );
}

/* ─── Main Component ──────────────────────────────────────────────────────── */

export default function SubstitutionBreaker() {
  const [ciphertext, setCiphertext] = useState(
    "KZ BRXU VKRSC YLBYB RXU YLBYB RXU KZ YBFX VRZZ YBFX YLBYB RXU KZ YBFX VRZZ"
  );
  const [result, setResult] = useState<BreakerResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);
  const [convergenceHistory, setConvergenceHistory] = useState<ConvergencePoint[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  const initialKey = useMemo(() => {
    if (!ciphertext.trim()) return identityKey();
    return frequencyAnalysisSeed(ciphertext);
  }, [ciphertext]);

  const initialPlaintext = useMemo(() => {
    return applyKey(ciphertext, initialKey);
  }, [ciphertext, initialKey]);

  const handleBreak = useCallback(() => {
    if (!ciphertext.trim()) return;
    setIsRunning(true);
    setConvergenceHistory([]);

    // Run synchronously (non-blocking for short texts, runs in main thread)
    requestAnimationFrame(() => {
      const res = breakSubstitution(ciphertext, DEFAULT_CONFIG, (point) => {
        setConvergenceHistory((prev) => [...prev, point]);
      });
      setResult(res);
      setExpandedIndex(0);
      setIsRunning(false);
    });
  }, [ciphertext]);

  const handleReset = useCallback(() => {
    setResult(null);
    setConvergenceHistory([]);
    setExpandedIndex(null);
    setIsRunning(false);
  }, []);

  const handleSample = useCallback((text: string) => {
    setCiphertext(text);
    setResult(null);
    setConvergenceHistory([]);
    setExpandedIndex(null);
  }, []);

  const keyMapping = useMemo(
    () => (result ? buildKeyMapping(result.best.key) : []),
    [result]
  );

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-10 text-slate-100 sm:px-6 lg:px-8">
      {/* Header Banner */}
      <section className="overflow-hidden rounded-3xl border border-white/10 bg-slate-950 shadow-2xl shadow-black/30">
        <div className="relative isolate px-6 py-10 sm:px-10">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(0,196,174,0.2),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(168,85,247,0.12),transparent_35%)]" />
          <p className="text-sm font-semibold uppercase tracking-[0.32em] text-teal-400">
            Cryptanalysis Tool
          </p>
          <div className="mt-4 grid gap-8 lg:grid-cols-[1.25fr_0.75fr] lg:items-end">
            <div>
              <h1 className="max-w-4xl text-4xl font-black tracking-tight text-white sm:text-5xl">
                Substitution Cipher Breaker
              </h1>
              <p className="mt-5 max-w-3xl text-base leading-8 text-slate-300">
                Automatically crack monoalphabetic substitution ciphers using frequency analysis for the initial seed, then hill climbing with simulated annealing to refine the key mapping. Works on any fixed-letter-substitution cipher.
              </p>
            </div>
            <div className="rounded-2xl border border-teal-500/20 bg-teal-500/10 p-5">
              <p className="text-sm font-semibold text-teal-300">
                How It Works
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                The breaker maps the most frequent ciphertext letters to expected English frequencies, then iteratively improves the mapping by swapping letter assignments and scoring with quadgram log-likelihood.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Sample Ciphertexts */}
      <section className="rounded-3xl border border-white/10 bg-white/[0.02] p-6 shadow-xl backdrop-blur-sm">
        <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-500">
          Quick Examples — Click to Load
        </h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {SAMPLES.map((sample) => (
            <button
              key={sample.label}
              onClick={() => handleSample(sample.ciphertext)}
              className={cn(
                "group relative rounded-xl border px-3 py-2 text-left transition-all duration-200",
                ciphertext === sample.ciphertext
                  ? "border-teal-500/40 bg-teal-500/10 text-teal-300"
                  : "border-white/5 bg-white/[0.02] text-zinc-400 hover:border-white/10 hover:text-white"
              )}
            >
              <span className="text-xs font-bold">{sample.label}</span>
              <span className="mt-0.5 block max-w-[200px] truncate font-mono text-[10px] text-zinc-600">
                {sample.ciphertext}
              </span>
            </button>
          ))}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        {/* Left Column: Input & Controls */}
        <div className="space-y-6">
          {/* Input Section */}
          <section className="rounded-3xl border border-white/10 bg-white/[0.02] p-6 shadow-xl backdrop-blur-sm">
            <h2 className="text-2xl font-bold text-white">
              Ciphertext Input
            </h2>
            <p className="mt-2 text-sm leading-6 text-zinc-400">
              Paste a monoalphabetic substitution cipher for automated breaking.
            </p>
            <div className="mt-4">
              <textarea
                value={ciphertext}
                onChange={(e) => {
                  setCiphertext(e.target.value);
                  setResult(null);
                  setConvergenceHistory([]);
                }}
                placeholder="Paste substitution cipher text here..."
                rows={5}
                className="w-full rounded-2xl border border-white/10 bg-slate-900 px-5 py-4 font-mono text-sm text-white outline-none ring-teal-500/40 focus:ring-2 resize-none placeholder:text-zinc-600"
              />
              <div className="mt-2 flex items-center justify-between text-xs text-zinc-600">
                <span>{ciphertext.length} characters</span>
                <span>
                  {(ciphertext.match(/[A-Z]/gi) || []).length} alphabetic
                </span>
              </div>
            </div>

            {/* Frequency Analysis Preview */}
            <div className="mt-4 rounded-xl border border-white/5 bg-slate-950/40 p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-zinc-600 mb-2">
                Initial Frequency Analysis Seed
              </p>
              <p className="font-mono text-xs text-zinc-500 break-all leading-relaxed">
                {initialPlaintext.slice(0, 120)}
                {initialPlaintext.length > 120 ? "..." : ""}
              </p>
              <p className="mt-2 text-[10px] text-zinc-600">
                Score: {scoreKey(ciphertext, initialKey).toFixed(1)}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="mt-4 flex gap-3">
              <button
                onClick={handleBreak}
                disabled={isRunning || !ciphertext.trim()}
                className="flex items-center gap-2 rounded-xl bg-teal-500 px-6 py-3 font-bold text-slate-950 transition-all hover:bg-teal-400 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              >
                {isRunning ? (
                  <>
                    <Pause size={16} fill="currentColor" />
                    Breaking...
                  </>
                ) : (
                  <>
                    <Zap size={16} />
                    Break Cipher
                  </>
                )}
              </button>
              <button
                onClick={handleReset}
                className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.02] px-6 py-3 font-bold text-slate-300 transition-all hover:bg-white/[0.06] cursor-pointer"
              >
                <RotateCcw size={16} />
                Reset
              </button>
            </div>
          </section>

          {/* Algorithm Settings */}
          <section className="rounded-3xl border border-white/10 bg-white/[0.02] p-6 shadow-xl backdrop-blur-sm">
            <h2 className="text-2xl font-bold text-white">
              Algorithm Settings
            </h2>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {[
                { label: "Method", value: "Hill Climbing + SA", icon: Brain },
                { label: "Restarts", value: `${DEFAULT_CONFIG.numRestarts}`, icon: Target },
                { label: "Max Iterations", value: `${DEFAULT_CONFIG.maxIterations}`, icon: Zap },
                {
                  label: "Swaps/Step",
                  value: `${DEFAULT_CONFIG.swapsPerStep}`,
                  icon: BarChart3,
                },
                {
                  label: "Initial Temp",
                  value: `${DEFAULT_CONFIG.initialTemperature}`,
                  icon: BarChart3,
                },
                {
                  label: "Cooling Rate",
                  value: `${DEFAULT_CONFIG.coolingRate}`,
                  icon: BarChart3,
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-xl border border-white/5 bg-slate-950/40 p-3"
                >
                  <div className="flex items-center gap-1.5 text-zinc-600">
                    <item.icon size={12} />
                    <span className="text-[10px] font-bold uppercase tracking-wider">
                      {item.label}
                    </span>
                  </div>
                  <p className="mt-1 text-sm font-bold font-mono text-white">
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Convergence Chart */}
          {result && convergenceHistory.length > 1 && (
            <section className="rounded-3xl border border-white/10 bg-white/[0.02] p-6 shadow-xl backdrop-blur-sm">
              <h2 className="text-2xl font-bold text-white">
                Convergence History
              </h2>
              <p className="mt-1 text-xs text-zinc-500">
                Quadgram fitness score over iterations (higher = more English-like)
              </p>
              <div className="mt-4">
                <ConvergenceChart history={convergenceHistory} />
              </div>
              <div className="mt-3 grid grid-cols-3 gap-3 text-center">
                <div className="rounded-xl bg-slate-950/40 p-2 border border-white/5">
                  <p className="text-[10px] text-zinc-600">Start Score</p>
                  <p className="text-sm font-bold font-mono text-zinc-400">
                    {convergenceHistory[0]?.score.toFixed(1) ?? "N/A"}
                  </p>
                </div>
                <div className="rounded-xl bg-slate-950/40 p-2 border border-white/5">
                  <p className="text-[10px] text-zinc-600">Final Score</p>
                  <p className="text-sm font-bold font-mono text-teal-400">
                    {convergenceHistory[convergenceHistory.length - 1]?.score.toFixed(1) ?? "N/A"}
                  </p>
                </div>
                <div className="rounded-xl bg-slate-950/40 p-2 border border-white/5">
                  <p className="text-[10px] text-zinc-600">Improvement</p>
                  <p className="text-sm font-bold font-mono text-emerald-400">
                    {(
                      (convergenceHistory[convergenceHistory.length - 1]?.score ?? 0) -
                      (convergenceHistory[0]?.score ?? 0)
                    ).toFixed(1)}
                  </p>
                </div>
              </div>
            </section>
          )}
        </div>

        {/* Right Column: Results */}
        <div className="space-y-6">
          {/* Key Mapping */}
          {result && (
            <section className="rounded-3xl border border-white/10 bg-white/[0.02] p-6 shadow-xl backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white">
                  Decrypted Key Mapping
                </h2>
                <span className="flex items-center gap-1.5 text-xs text-zinc-500">
                  <Key size={12} />
                  Best key (score: {result.best.score.toFixed(1)})
                </span>
              </div>
              <div className="mt-4 rounded-2xl border border-white/5 bg-slate-950 p-5">
                <div className="grid grid-cols-2 gap-4">
                  {/* Cipher alphabet */}
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-600 mb-2">
                      Ciphertext
                    </p>
                    <p className="font-mono text-sm text-zinc-400 tracking-wider">
                      ABCDEFGHIJKLMNOPQRSTUVWXYZ
                    </p>
                  </div>
                  {/* Plain alphabet */}
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-600 mb-2">
                      Plaintext
                    </p>
                    <p className="font-mono text-sm text-teal-400 tracking-wider font-bold">
                      {result.best.key}
                    </p>
                  </div>
                </div>
                {/* Visual mapping */}
                <div className="mt-4 pt-4 border-t border-white/5">
                  <KeyMappingVisual key={result.best.key} label="Letter-by-Letter Mapping" />
                </div>
              </div>
            </section>
          )}

          {/* Full Decrypted Text */}
          {result && (
            <section className="rounded-3xl border border-white/10 bg-white/[0.02] p-6 shadow-xl backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white">
                  Best Decryption
                </h2>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(result.best.plaintext);
                  }}
                  className="flex items-center gap-1.5 rounded-lg bg-white/5 px-3 py-1.5 text-xs font-bold text-zinc-400 hover:bg-white/10 hover:text-white transition-colors"
                >
                  <Copy size={12} />
                  Copy
                </button>
              </div>
              <div className="mt-4 rounded-2xl border border-white/5 bg-slate-950 p-5">
                <p className="font-mono text-sm text-teal-300 leading-relaxed break-all whitespace-pre-wrap">
                  {result.best.plaintext}
                </p>
              </div>
              <div className="mt-3 flex items-center gap-4 text-xs text-zinc-600">
                <span className="flex items-center gap-1">
                  <Clock size={12} />
                  {result.durationMs.toFixed(0)}ms
                </span>
                <span>{result.totalIterations} total iterations</span>
                <span>{result.candidates.length} candidates</span>
              </div>
            </section>
          )}

          {/* All Candidates */}
          {result && result.candidates.length > 0 && (
            <section className="rounded-3xl border border-white/10 bg-white/[0.02] p-6 shadow-xl backdrop-blur-sm">
              <h2 className="text-2xl font-bold text-white">
                All Candidates ({result.candidates.length})
              </h2>
              <div className="mt-4 space-y-3">
                {result.candidates.map((candidate, index) => (
                  <CandidateCard
                    key={`${candidate.restartIndex}-${candidate.score}`}
                    result={candidate}
                    rank={index}
                    isExpanded={expandedIndex === index}
                    onToggle={() =>
                      setExpandedIndex(expandedIndex === index ? null : index)
                    }
                  />
                ))}
              </div>
            </section>
          )}

          {/* Educational Content */}
          <section className="rounded-3xl border border-white/10 bg-white/[0.02] p-6 shadow-xl backdrop-blur-sm">
            <h2 className="text-2xl font-bold text-white">
              How Substitution Ciphers Work
            </h2>
            <div className="mt-4 space-y-4">
              <div className="rounded-xl border border-white/5 bg-slate-950/40 p-4">
                <h3 className="text-sm font-bold text-teal-400">
                  The Cipher
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-zinc-400">
                  A monoalphabetic substitution cipher replaces each letter with a fixed different letter.
                  Unlike Caesar ciphers, the mapping is arbitrary — A might become Q, B might become Z, etc.
                  The mapping is described by a 26-letter key showing what each ciphertext letter decrypts to.
                </p>
              </div>
              <div className="rounded-xl border border-white/5 bg-slate-950/40 p-4">
                <h3 className="text-sm font-bold text-teal-400">
                  Frequency Analysis Attack
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-zinc-400">
                  English has predictable letter frequencies (E≈12.7%, T≈9.1%, A≈8.2%...). By counting letter
                  frequencies in the ciphertext and mapping the most common cipher letters to the most common
                  English letters, we get a good initial approximation.
                </p>
              </div>
              <div className="rounded-xl border border-white/5 bg-slate-950/40 p-4">
                <h3 className="text-sm font-bold text-teal-400">
                  Hill Climbing + Simulated Annealing
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-zinc-400">
                  The initial frequency seed is refined by hill climbing: randomly swap two letter assignments
                  in the key and keep the swap if the quadgram fitness score improves. Simulated annealing
                  occasionally accepts worse swaps at high temperatures to escape local optima, gradually cooling
                  to converge on the best solution.
                </p>
              </div>
              <div className="rounded-xl border border-white/5 bg-slate-950/40 p-4">
                <h3 className="text-sm font-bold text-teal-400">
                  Quadgram Scoring
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-zinc-400">
                  The fitness function scores candidate plaintext by summing log-likelihoods of every 4-character
                  sequence (quadgram). Natural English has high-probability quadgrams like &quot;TION&quot;, &quot;TING&quot;, &quot;THAT&quot;
                  while random text has low-probability quadgrams. Higher total score = more English-like.
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
