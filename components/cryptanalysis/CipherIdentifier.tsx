"use client";

import { useState, useMemo, useCallback } from "react";
import {
  identifyCipher,
  type IdentificationReport,
  type CipherCandidate,
  type AnalysisResult,
  ENGLISH_FREQUENCIES,
} from "../../lib/cryptanalysis/cipherIdentifier";
import {
  Search,
  Fingerprint,
  BarChart3,
  Activity,
  Eye,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Zap,
  Target,
  Info,
  Clipboard,
  Check,
} from "lucide-react";
import { cn } from "../../lib/utils";

/* ─── Sample Ciphertexts for Educational Purposes ─────────────────────────── */

const SAMPLE_TEXTS = [
  {
    label: "Caesar Cipher (shift 3)",
    text: "KHOOR ZRUOG",
    hint: "Simple shift cipher — notice how frequency patterns are preserved.",
  },
  {
    label: "Vigenère Cipher",
    text: "LXFOPVEFRNHR",
    hint: "Polyalphabetic — letter frequencies are flattened compared to English.",
  },
  {
    label: "Rot13",
    text: "URYYB JBEYQ",
    hint: "Fixed Caesar shift of 13 — self-inverse cipher.",
  },
  {
    label: "Hexadecimal Encoding",
    text: "48656c6c6f20576f726c6421",
    hint: "Only hex characters (0-9, a-f). Each pair represents one byte.",
  },
  {
    label: "Base64 Encoding",
    text: "SGVsbG8gV29ybGQh",
    hint: "Base64 alphabet (A-Z, a-z, 0-9, +, /). Padded with '='.",
  },
  {
    label: "Binary Encoding",
    text: "01001000 01100101 01101100 01101100 01101111",
    hint: "Only 0s and 1s. Each 8-bit group is one ASCII character.",
  },
  {
    label: "Atbash Cipher",
    text: "SVOOL DLIOW",
    hint: "Alphabet mirror: A→Z, B→Y, C→X, etc.",
  },
  {
    label: "Monoalphabetic Substitution",
    text: "WKLV LV D VHFUHW PHVVDJH",
    hint: "Fixed letter mapping — frequency patterns match English.",
  },
  {
    label: "Hex Cipher Text (AES-like)",
    text: "2b7e151628aed2a6abf7158809cf4f3c",
    hint: "Looks like encrypted data — high entropy, non-alphabetic.",
  },
  {
    label: "Rail Fence (3 rails)",
    text: "WSFOAH TEE CV  EDLN RCEOAT",
    hint: "Transposition — letters are the same, just rearranged.",
  },
]

/* ─── Confidence Badge ────────────────────────────────────────────────────── */

function ConfidenceBadge({ confidence }: { confidence: number }) {
  let colorClass = "bg-zinc-500/10 text-zinc-400 border-zinc-500/20"
  if (confidence >= 80) colorClass = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
  else if (confidence >= 50) colorClass = "bg-amber-500/10 text-amber-400 border-amber-500/20"
  else if (confidence >= 25) colorClass = "bg-orange-500/10 text-orange-400 border-orange-500/20"

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold",
        colorClass
      )}
    >
      {confidence.toFixed(1)}%
    </span>
  )
}

/* ─── Frequency Bar Chart ─────────────────────────────────────────────────── */

function FrequencyChart({ analysis }: { analysis: AnalysisResult }) {
  const maxFreq = Math.max(
    ...analysis.frequencies.map((f) => f.frequency),
    ...Object.values(ENGLISH_FREQUENCIES)
  )

  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
  const letterData = alphabet.split("").map((letter) => {
    const entry = analysis.frequencies.find((f) => f.letter === letter)
    return {
      letter,
      observed: entry ? entry.frequency : 0,
      expected: ENGLISH_FREQUENCIES[letter] || 0,
    }
  })

  return (
    <div className="grid grid-cols-26 gap-1 sm:grid-cols-13 md:grid-cols-26">
      {letterData.map((d) => (
        <div key={d.letter} className="flex flex-col items-center gap-1">
          <div className="relative h-24 w-full flex items-end justify-center">
            {/* Expected bar */}
            <div
              className="absolute bottom-0 w-full rounded-t bg-teal-500/20"
              style={{ height: `${(d.expected / maxFreq) * 100}%` }}
            />
            {/* Observed bar */}
            <div
              className="absolute bottom-0 w-full rounded-t bg-teal-500/70"
              style={{ height: `${(d.observed / maxFreq) * 100}%` }}
            />
          </div>
          <span className="text-[10px] font-bold text-zinc-500">{d.letter}</span>
        </div>
      ))}
    </div>
  )
}

/* ─── Candidate Card ──────────────────────────────────────────────────────── */

function CandidateCard({
  candidate,
  rank,
  isExpanded,
  onToggle,
}: {
  candidate: CipherCandidate
  rank: number
  isExpanded: boolean
  onToggle: () => void
}) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      navigator.clipboard.writeText(candidate.explanation)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    },
    [candidate.explanation]
  )

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
            "flex h-9 w-9 items-center justify-center rounded-xl text-sm font-black",
            rank === 0
              ? "bg-teal-500 text-slate-950"
              : "bg-white/10 text-zinc-400"
          )}
        >
          {rank + 1}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-bold text-white truncate">
              {candidate.name}
            </h3>
            <ConfidenceBadge confidence={candidate.confidence} />
          </div>
          <p className="mt-0.5 text-xs text-zinc-500 truncate">
            {candidate.description}
          </p>
        </div>
        <button
          onClick={handleCopy}
          className="rounded-lg p-2 text-zinc-500 hover:bg-white/5 hover:text-white transition-colors"
          title="Copy analysis"
        >
          {copied ? <Check size={14} /> : <Clipboard size={14} />}
        </button>
        {isExpanded ? (
          <ChevronUp size={16} className="text-zinc-500" />
        ) : (
          <ChevronDown size={16} className="text-zinc-500" />
        )}
      </button>
      {isExpanded && (
        <div className="border-t border-white/5 px-5 pb-5 pt-4 space-y-3">
          <p className="text-sm leading-relaxed text-zinc-300">
            {candidate.explanation}
          </p>
          {candidate.recommendedActions.length > 0 && (
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-2">
                Suggested Next Steps
              </h4>
              <ul className="space-y-1.5">
                {candidate.recommendedActions.map((action, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-xs text-zinc-400"
                  >
                    <Target size={10} className="mt-1 text-teal-500 shrink-0" />
                    {action}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/* ─── Metric Stat Card ────────────────────────────────────────────────────── */

function StatCard({
  icon: Icon,
  label,
  value,
  sublabel,
  color = "text-teal-400",
}: {
  icon: React.ElementType
  label: string
  value: string | number
  sublabel?: string
  color?: string
}) {
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
      <div className="flex items-center gap-2 text-zinc-500">
        <Icon size={14} className={color} />
        <span className="text-xs font-semibold uppercase tracking-wider">
          {label}
        </span>
      </div>
      <p className="mt-2 text-xl font-black font-mono text-white">{value}</p>
      {sublabel && (
        <p className="mt-1 text-[10px] text-zinc-600">{sublabel}</p>
      )}
    </div>
  )
}

/* ─── Main Component ──────────────────────────────────────────────────────── */

export default function CipherIdentifier() {
  const [inputText, setInputText] = useState("KHOOR ZRUOG")
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0)

  const report: IdentificationReport | null = useMemo(() => {
    if (!inputText.trim()) return null
    return identifyCipher(inputText)
  }, [inputText])

  const handleSampleClick = useCallback((text: string) => {
    setInputText(text)
    setExpandedIndex(0)
  }, [])

  const handleClear = useCallback(() => {
    setInputText("")
    setExpandedIndex(null)
  }, [])

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
                Cipher Identifier
              </h1>
              <p className="mt-5 max-w-3xl text-base leading-8 text-slate-300">
                Paste any ciphertext and run automated statistical analysis to identify the likely encryption method. Uses frequency analysis, index of coincidence, entropy, Kasiski examination, and pattern matching.
              </p>
            </div>
            <div className="rounded-2xl border border-teal-500/20 bg-teal-500/10 p-5">
              <p className="text-sm font-semibold text-teal-300">
                How It Works
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                The analyzer computes 12+ statistical metrics and compares them against known signatures for each cipher type. Confidence scores reflect how well the ciphertext matches each cipher&apos;s characteristics.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Sample Texts */}
      <section className="rounded-3xl border border-white/10 bg-white/[0.02] p-6 shadow-xl backdrop-blur-sm">
        <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-500">
          Quick Examples — Click to Analyze
        </h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {SAMPLE_TEXTS.map((sample) => (
            <button
              key={sample.label}
              onClick={() => handleSampleClick(sample.text)}
              className={cn(
                "group relative rounded-xl border px-3 py-2 text-left transition-all duration-200",
                inputText === sample.text
                  ? "border-teal-500/40 bg-teal-500/10 text-teal-300"
                  : "border-white/5 bg-white/[0.02] text-zinc-400 hover:border-white/10 hover:text-white"
              )}
            >
              <span className="text-xs font-bold">{sample.label}</span>
              <span className="mt-0.5 block max-w-[200px] truncate font-mono text-[10px] text-zinc-600">
                {sample.text}
              </span>
            </button>
          ))}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        {/* Left Column: Input & Stats */}
        <div className="space-y-6">
          {/* Input Section */}
          <section className="rounded-3xl border border-white/10 bg-white/[0.02] p-6 shadow-xl backdrop-blur-sm">
            <h2 className="text-2xl font-bold text-white">
              Input Ciphertext
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Paste any encrypted text, encoding, or ciphertext for analysis.
            </p>
            <div className="mt-4">
              <div className="relative">
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Paste ciphertext here..."
                  rows={6}
                  className="w-full rounded-2xl border border-white/10 bg-slate-900 px-5 py-4 font-mono text-sm text-white outline-none ring-teal-500/40 focus:ring-2 resize-none placeholder:text-zinc-600"
                />
                {inputText && (
                  <button
                    onClick={handleClear}
                    className="absolute right-3 top-3 rounded-lg bg-white/5 p-1.5 text-zinc-500 hover:bg-white/10 hover:text-white transition-colors"
                  >
                    ✕
                  </button>
                )}
              </div>
              <div className="mt-2 flex items-center justify-between text-xs text-zinc-600">
                <span>{inputText.length} characters</span>
                <span>
                  {(inputText.match(/[A-Za-z]/g) || []).length} alphabetic
                </span>
              </div>
            </div>
          </section>

          {/* Statistical Metrics */}
          {report && (
            <section className="rounded-3xl border border-white/10 bg-white/[0.02] p-6 shadow-xl backdrop-blur-sm">
              <h2 className="text-2xl font-bold text-white">
                Statistical Metrics
              </h2>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <StatCard
                  icon={Activity}
                  label="Index of Coincidence"
                  value={report.analysis.indexCoincidence.toFixed(4)}
                  sublabel="English ≈ 0.065 | Random ≈ 0.038"
                  color={
                    report.analysis.indexCoincidence > 0.06
                      ? "text-emerald-400"
                      : report.analysis.indexCoincidence > 0.04
                      ? "text-amber-400"
                      : "text-red-400"
                  }
                />
                <StatCard
                  icon={BarChart3}
                  label="Shannon Entropy"
                  value={`${report.analysis.entropy.toFixed(2)} bits`}
                  sublabel={`Max for 26 letters: ${Math.log2(26).toFixed(2)} bits`}
                  color={
                    report.analysis.entropy > 5
                      ? "text-red-400"
                      : report.analysis.entropy > 4
                      ? "text-amber-400"
                      : "text-emerald-400"
                  }
                />
                <StatCard
                  icon={Zap}
                  label="Chi-Squared (χ²)"
                  value={report.analysis.chiSquared.toFixed(1)}
                  sublabel="Lower ≈ English-like | Higher ≈ random"
                  color={
                    report.analysis.chiSquared < 100
                      ? "text-emerald-400"
                      : report.analysis.chiSquared < 300
                      ? "text-amber-400"
                      : "text-red-400"
                  }
                />
                <StatCard
                  icon={Fingerprint}
                  label="Unique Characters"
                  value={`${report.analysis.uniqueChars} (${(
                    report.analysis.uniqueRatio * 100
                  ).toFixed(0)}%)`}
                  sublabel={`${(
                    report.analysis.alphaRatio * 100
                  ).toFixed(1)}% alphabetic`}
                />
                <StatCard
                  icon={Eye}
                  label="Digram Score"
                  value={`${(report.analysis.digramScore * 100).toFixed(1)}%`}
                  sublabel="Cosine similarity to English digrams"
                />
                <StatCard
                  icon={Search}
                  label="Key Length Estimate"
                  value={
                    report.analysis.suggestedKeyLength > 0
                      ? `~${report.analysis.suggestedKeyLength}`
                      : "N/A"
                  }
                  sublabel="From Kasiski / Friedman analysis"
                />
              </div>
            </section>
          )}

          {/* Frequency Distribution */}
          {report && report.analysis.frequencies.length > 0 && (
            <section className="rounded-3xl border border-white/10 bg-white/[0.02] p-6 shadow-xl backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white">
                  Letter Frequency Distribution
                </h2>
                <div className="flex items-center gap-4 text-[10px] text-zinc-500">
                  <span className="flex items-center gap-1">
                    <span className="inline-block h-2 w-2 rounded bg-teal-500/70" />
                    Observed
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="inline-block h-2 w-2 rounded bg-teal-500/20" />
                    Expected English
                  </span>
                </div>
              </div>
              <div className="mt-4 overflow-x-auto">
                <FrequencyChart analysis={report.analysis} />
              </div>
              {/* Frequency Table */}
              <div className="mt-4 max-h-48 overflow-y-auto rounded-xl border border-white/5">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-slate-900">
                    <tr className="text-zinc-500">
                      <th className="px-3 py-2 text-left font-semibold">Letter</th>
                      <th className="px-3 py-2 text-right font-semibold">Count</th>
                      <th className="px-3 py-2 text-right font-semibold">Observed %</th>
                      <th className="px-3 py-2 text-right font-semibold">English %</th>
                      <th className="px-3 py-2 text-right font-semibold">Diff</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.analysis.frequencies.slice(0, 15).map((f) => (
                      <tr
                        key={f.letter}
                        className="border-t border-white/5 hover:bg-white/[0.02]"
                      >
                        <td className="px-3 py-1.5 font-bold text-white">
                          {f.letter}
                        </td>
                        <td className="px-3 py-1.5 text-right font-mono text-zinc-400">
                          {f.count}
                        </td>
                        <td className="px-3 py-1.5 text-right font-mono text-teal-400">
                          {(f.frequency * 100).toFixed(2)}%
                        </td>
                        <td className="px-3 py-1.5 text-right font-mono text-zinc-500">
                          {(f.englishFrequency * 100).toFixed(2)}%
                        </td>
                        <td
                          className={cn(
                            "px-3 py-1.5 text-right font-mono",
                            Math.abs(f.frequency - f.englishFrequency) < 0.01
                              ? "text-emerald-400"
                              : "text-amber-400"
                          )}
                        >
                          {f.frequency > f.englishFrequency ? "+" : ""}
                          {((f.frequency - f.englishFrequency) * 100).toFixed(2)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>

        {/* Right Column: Results */}
        <div className="space-y-6">
          {/* Identification Results */}
          {report && (
            <section className="rounded-3xl border border-white/10 bg-white/[0.02] p-6 shadow-xl backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white">
                  Identification Results
                </h2>
                <span className="text-xs text-zinc-600 font-semibold">
                  {report.candidates.length} candidate{report.candidates.length !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="mt-4 space-y-3">
                {report.candidates.length === 0 ? (
                  <div className="rounded-2xl border border-white/5 bg-slate-950/40 p-8 text-center">
                    <AlertTriangle size={32} className="mx-auto text-zinc-600" />
                    <p className="mt-3 text-sm text-zinc-500">
                      No clear cipher pattern detected. Try providing more text.
                    </p>
                  </div>
                ) : (
                  report.candidates.map((candidate, index) => (
                    <CandidateCard
                      key={candidate.cipherType}
                      candidate={candidate}
                      rank={index}
                      isExpanded={expandedIndex === index}
                      onToggle={() =>
                        setExpandedIndex(expandedIndex === index ? null : index)
                      }
                    />
                  ))
                )}
              </div>
            </section>
          )}

          {/* Educational Insights */}
          {report && report.candidates.length > 0 && (
            <section className="rounded-3xl border border-white/10 bg-white/[0.02] p-6 shadow-xl backdrop-blur-sm">
              <h2 className="text-2xl font-bold text-white">
                Understanding the Metrics
              </h2>
              <div className="mt-4 space-y-4">
                <div className="rounded-xl border border-white/5 bg-slate-950/40 p-4">
                  <h3 className="flex items-center gap-2 text-sm font-bold text-teal-400">
                    <Activity size={14} />
                    Index of Coincidence (IC)
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-zinc-400">
                    Measures how likely two randomly chosen letters are the same.
                    English plaintext ≈ 0.065, random text ≈ 0.038.
                    <strong className="text-zinc-300">
                      {" "}Current: {report.analysis.indexCoincidence.toFixed(4)}
                    </strong>
                    {" "}—{" "}
                    {report.analysis.indexCoincidence > 0.06
                      ? "Consistent with monoalphabetic cipher (Caesar, substitution)."
                      : report.analysis.indexCoincidence > 0.04
                      ? "Suggests polyalphabetic encryption (Vigenère)."
                      : "Consistent with strong encryption or random data."}
                  </p>
                </div>
                <div className="rounded-xl border border-white/5 bg-slate-950/40 p-4">
                  <h3 className="flex items-center gap-2 text-sm font-bold text-teal-400">
                    <BarChart3 size={14} />
                    Shannon Entropy
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-zinc-400">
                    Measures information density per character. Normal English ≈ 4.1-4.5 bits,
                    high entropy ({'>'}5.5) suggests encryption or encoding.
                    <strong className="text-zinc-300">
                      {" "}Current: {report.analysis.entropy.toFixed(2)} bits/char
                    </strong>
                  </p>
                </div>
                <div className="rounded-xl border border-white/5 bg-slate-950/40 p-4">
                  <h3 className="flex items-center gap-2 text-sm font-bold text-teal-400">
                    <Search size={14} />
                    Kasiski Examination
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-zinc-400">
                    Finds repeated sequences and computes distances between them.
                    Common factors in these distances reveal the key length for polyalphabetic ciphers.
                    {report.analysis.suggestedKeyLength > 0 && (
                      <strong className="text-zinc-300">
                        {" "}Suggested key length: ~{report.analysis.suggestedKeyLength}
                      </strong>
                    )}
                  </p>
                </div>
              </div>
            </section>
          )}

          {/* How-To Section */}
          <section className="rounded-3xl border border-white/10 bg-white/[0.02] p-6 shadow-xl backdrop-blur-sm">
            <h2 className="text-2xl font-bold text-white">
              Cryptanalysis Workflow
            </h2>
            <div className="mt-4 space-y-3">
              {[
                {
                  step: 1,
                  title: "Input the Ciphertext",
                  desc: "Paste the unknown encrypted text into the input field.",
                },
                {
                  step: 2,
                  title: "Review Statistical Metrics",
                  desc: "Check IC, entropy, and chi-squared values to narrow down cipher type.",
                },
                {
                  step: 3,
                  title: "Examine Top Candidates",
                  desc: "Read the identification explanations and confidence scores.",
                },
                {
                  step: 4,
                  title: "Apply Recommended Attacks",
                  desc: "Follow the suggested next steps for the most likely cipher type.",
                },
              ].map((item) => (
                <div
                  key={item.step}
                  className="flex items-start gap-4 rounded-xl border border-white/5 bg-slate-950/40 p-4"
                >
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-teal-500/10 text-xs font-bold text-teal-400">
                    {item.step}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">{item.title}</h3>
                    <p className="mt-0.5 text-xs text-zinc-500">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Limitations */}
          <section className="rounded-3xl border border-white/10 bg-white/[0.02] p-6 shadow-xl backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <Info size={16} className="text-amber-400" />
              <h2 className="text-lg font-bold text-white">Limitations</h2>
            </div>
            <ul className="mt-3 space-y-2 text-xs text-zinc-400">
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-zinc-600" />
                Statistical analysis works best with longer texts (&gt;50 characters).
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-zinc-600" />
                Modern ciphers (AES, ChaCha20) produce output indistinguishable from random data.
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-zinc-600" />
                Confidence scores are heuristic estimates, not definitive proofs.
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-zinc-600" />
                Short texts may produce misleading frequency distributions.
              </li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  )
}
