"use client";

import { useState, useCallback, useMemo } from "react";
import {
  findCollision,
  birthdayStats,
  analyzeHash,
  type HashAlgorithm,
  type CollisionResult,
  type BirthdayAttackStats,
  type HashAnalysis,
  EXPLANATIONS,
  type KnownCollision,
} from "../../lib/hash/collisionFinder";
import {
  Play,
  Pause,
  RotateCcw,
  Zap,
  Target,
  BarChart3,
  Clock,
  AlertTriangle,
  Check,
  Info,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Copy,
} from "lucide-react";
import { cn } from "../../lib/utils";

/* ─── Constants ────────────────────────────────────────────────────────────── */

const ALGORITHMS: { id: HashAlgorithm; label: string; bits: number; security: string }[] = [
  { id: "md5", label: "MD5", bits: 128, security: "broken" },
  { id: "sha-1", label: "SHA-1", bits: 160, security: "deprecated" },
  { id: "sha-256", label: "SHA-256", bits: 256, security: "secure" },
  { id: "sha-512", label: "SHA-512", bits: 512, security: "secure" },
]

const BIT_OPTIONS = [4, 6, 8, 10, 12, 14, 16, 18, 20, 24]

/* ─── Probability Meter ────────────────────────────────────────────────────── */

function ProbabilityMeter({ probability }: { probability: number }) {
  const pct = Math.min(100, probability * 100)
  let colorClass = "bg-zinc-600"
  if (pct > 75) colorClass = "bg-emerald-500"
  else if (pct > 50) colorClass = "bg-amber-500"
  else if (pct > 25) colorClass = "bg-orange-500"

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-zinc-500">Collision Probability</span>
        <span className="font-mono font-bold text-white">
          {(pct).toFixed(2)}%
        </span>
      </div>
      <div className="h-3 w-full rounded-full bg-white/5 overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-300", colorClass)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

/* ─── Stats Grid ───────────────────────────────────────────────────────────── */

function StatsGrid({ stats, attempts }: { stats: BirthdayAttackStats; attempts: number }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="rounded-xl border border-white/5 bg-slate-950/40 p-3">
        <div className="flex items-center gap-1.5 text-zinc-600">
          <Target size={12} />
          <span className="text-[10px] font-bold uppercase tracking-wider">
            Hash Space
          </span>
        </div>
        <p className="mt-1 text-sm font-bold font-mono text-white">
          2^{stats.bitsOfSecurity}
        </p>
        <p className="text-[10px] text-zinc-600">
          = {stats.spaceSize.toLocaleString()} values
        </p>
      </div>
      <div className="rounded-xl border border-white/5 bg-slate-950/40 p-3">
        <div className="flex items-center gap-1.5 text-zinc-600">
          <Zap size={12} />
          <span className="text-[10px] font-bold uppercase tracking-wider">
            Expected (50%)
          </span>
        </div>
        <p className="mt-1 text-sm font-bold font-mono text-teal-400">
          ~{stats.expected50Percent.toLocaleString()}
        </p>
        <p className="text-[10px] text-zinc-600">
          ≈ √(π/2 × 2^n) attempts
        </p>
      </div>
      <div className="rounded-xl border border-white/5 bg-slate-950/40 p-3">
        <div className="flex items-center gap-1.5 text-zinc-600">
          <Clock size={12} />
          <span className="text-[10px] font-bold uppercase tracking-wider">
            Attempts Made
          </span>
        </div>
        <p className="mt-1 text-sm font-bold font-mono text-white">
          {attempts.toLocaleString()}
        </p>
        <p className="text-[10px] text-zinc-600">
          {attempts > 0 ? `${((attempts / stats.expected50Percent) * 100).toFixed(0)}% of expected` : ""}
        </p>
      </div>
      <div className="rounded-xl border border-white/5 bg-slate-950/40 p-3">
        <div className="flex items-center gap-1.5 text-zinc-600">
          <BarChart3 size={12} />
          <span className="text-[10px] font-bold uppercase tracking-wider">
            Expected (99%)
          </span>
        </div>
        <p className="mt-1 text-sm font-bold font-mono text-amber-400">
          ~{stats.expected99Percent.toLocaleString()}
        </p>
        <p className="text-[10px] text-zinc-600">
          Near-certain collision
        </p>
      </div>
    </div>
  )
}

/* ─── Hash Table Display ───────────────────────────────────────────────────── */

function HashTable({ result }: { result: CollisionResult }) {
  if (result.history.length === 0) return null

  return (
    <div className="max-h-64 overflow-y-auto rounded-xl border border-white/5">
      <table className="w-full text-xs">
        <thead className="sticky top-0 bg-slate-900">
          <tr className="text-zinc-500">
            <th className="px-3 py-2 text-left font-semibold">#</th>
            <th className="px-3 py-2 text-left font-semibold">Input</th>
            <th className="px-3 py-2 text-left font-semibold">Hash (truncated)</th>
          </tr>
        </thead>
        <tbody>
          {result.history.slice(-30).map((attempt) => (
            <tr
              key={attempt.attemptNumber}
              className="border-t border-white/5 hover:bg-white/[0.02]"
            >
              <td className="px-3 py-1.5 font-mono text-zinc-600">
                {attempt.attemptNumber}
              </td>
              <td className="px-3 py-1.5 font-mono text-zinc-400">
                {attempt.input}
              </td>
              <td className="px-3 py-1.5 font-mono text-teal-400">
                {attempt.hash}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/* ─── Known Collision Card ─────────────────────────────────────────────────── */

function CollisionCard({ collision }: { collision: KnownCollision }) {
  return (
    <div className="rounded-xl border border-white/5 bg-slate-950/40 p-4">
      <div className="flex items-start gap-3">
        <ShieldAlert size={16} className="text-amber-400 mt-0.5 shrink-0" />
        <div>
          <h4 className="text-sm font-bold text-white">{collision.algorithm}</h4>
          <p className="mt-1 text-xs text-zinc-400 leading-relaxed">
            {collision.description}
          </p>
          <p className="mt-1 text-[10px] text-zinc-600 italic">
            {collision.reference}
          </p>
        </div>
      </div>
    </div>
  )
}

/* ─── Main Component ──────────────────────────────────────────────────────── */

export default function HashCollisionFinder() {
  const [algorithm, setAlgorithm] = useState<HashAlgorithm>("sha-256")
  const [bits, setBits] = useState(12)
  const [inputLength, setInputLength] = useState(8)
  const [result, setResult] = useState<CollisionResult | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [progress, setProgress] = useState({ attempts: 0, lastHash: "" })
  const [stats, setStats] = useState<BirthdayAttackStats | null>(null)

  const currentStats = useMemo(() => {
    return birthdayStats(bits, progress.attempts)
  }, [bits, progress.attempts])

  const handleFind = useCallback(async () => {
    setIsRunning(true)
    setResult(null)
    setProgress({ attempts: 0, lastHash: "" })

    try {
      const res = await findCollision(algorithm, bits, inputLength, (attempts, hash) => {
        setProgress({ attempts, lastHash: hash })
      })
      setResult(res)
      setStats(birthdayStats(bits, res.attempts))
    } catch (err) {
      console.error("Collision finding failed:", err)
    } finally {
      setIsRunning(false)
    }
  }, [algorithm, bits, inputLength])

  const handleReset = useCallback(() => {
    setResult(null)
    setProgress({ attempts: 0, lastHash: "" })
    setStats(null)
    setIsRunning(false)
  }, [])

  const selectedAlgo = ALGORITHMS.find((a) => a.id === algorithm)!

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-10 text-slate-100 sm:px-6 lg:px-8">
      {/* Header */}
      <section className="overflow-hidden rounded-3xl border border-white/10 bg-slate-950 shadow-2xl shadow-black/30">
        <div className="relative isolate px-6 py-10 sm:px-10">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(0,196,174,0.2),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(168,85,247,0.12),transparent_35%)]" />
          <p className="text-sm font-semibold uppercase tracking-[0.32em] text-teal-400">
            Cryptanalysis Tool
          </p>
          <div className="mt-4 grid gap-8 lg:grid-cols-[1.25fr_0.75fr] lg:items-end">
            <div>
              <h1 className="max-w-4xl text-4xl font-black tracking-tight text-white sm:text-5xl">
                Hash Collision Finder
              </h1>
              <p className="mt-5 max-w-3xl text-base leading-8 text-slate-300">
                Find hash collisions using the Birthday Attack method. Demonstrates why collision resistance requires hash outputs at least twice the desired security level — and why MD5 and SHA-1 are no longer safe.
              </p>
            </div>
            <div className="rounded-2xl border border-teal-500/20 bg-teal-500/10 p-5">
              <p className="text-sm font-semibold text-teal-300">
                Birthday Attack
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                Finding two inputs with the same hash takes O(√N) attempts — not O(N). With only 12 bits of hash, collisions appear in hundreds of tries, not millions.
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        {/* Left Column: Controls */}
        <div className="space-y-6">
          {/* Configuration */}
          <section className="rounded-3xl border border-white/10 bg-white/[0.02] p-6 shadow-xl backdrop-blur-sm">
            <h2 className="text-2xl font-bold text-white">Configuration</h2>

            {/* Algorithm Selection */}
            <div className="mt-4">
              <label className="block text-sm font-semibold text-zinc-300 mb-2">
                Hash Algorithm
              </label>
              <div className="grid grid-cols-2 gap-2">
                {ALGORITHMS.map((algo) => (
                  <button
                    key={algo.id}
                    onClick={() => setAlgorithm(algo.id)}
                    className={cn(
                      "flex items-center gap-2 rounded-xl border p-3 text-left transition-all",
                      algorithm === algo.id
                        ? "border-teal-500/40 bg-teal-500/10"
                        : "border-white/5 bg-white/[0.02] hover:border-white/10"
                    )}
                  >
                    <span className="text-xs font-bold text-white">
                      {algo.label}
                    </span>
                    <span
                      className={cn(
                        "text-[10px] font-bold uppercase px-1.5 py-0.5 rounded",
                        algo.security === "secure"
                          ? "bg-emerald-500/10 text-emerald-400"
                          : algo.security === "deprecated"
                          ? "bg-amber-500/10 text-amber-400"
                          : "bg-red-500/10 text-red-400"
                      )}
                    >
                      {algo.security}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Bit Truncation */}
            <div className="mt-4">
              <div className="flex justify-between text-sm">
                <label className="font-semibold text-zinc-300">
                  Hash Bits Used
                </label>
                <span className="font-mono text-teal-400 font-bold">
                  {bits} bits (of {selectedAlgo.bits})
                </span>
              </div>
              <input
                type="range"
                min="4"
                max="24"
                step="2"
                value={bits}
                onChange={(e) => setBits(parseInt(e.target.value))}
                className="mt-2 w-full accent-teal-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-zinc-600 mt-1">
                <span>4 (easy)</span>
                <span>24 (hard)</span>
              </div>
            </div>

            {/* Input Length */}
            <div className="mt-4">
              <div className="flex justify-between text-sm">
                <label className="font-semibold text-zinc-300">
                  Input Length
                </label>
                <span className="font-mono text-teal-400 font-bold">
                  {inputLength} chars
                </span>
              </div>
              <input
                type="range"
                min="4"
                max="16"
                value={inputLength}
                onChange={(e) => setInputLength(parseInt(e.target.value))}
                className="mt-2 w-full accent-teal-500 cursor-pointer"
              />
            </div>

            {/* Action Buttons */}
            <div className="mt-6 flex gap-3">
              <button
                onClick={handleFind}
                disabled={isRunning}
                className="flex items-center gap-2 rounded-xl bg-teal-500 px-6 py-3 font-bold text-slate-950 transition-all hover:bg-teal-400 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              >
                {isRunning ? (
                  <>
                    <Pause size={16} fill="currentColor" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Zap size={16} />
                    Find Collision
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

          {/* Live Statistics */}
          <section className="rounded-3xl border border-white/10 bg-white/[0.02] p-6 shadow-xl backdrop-blur-sm">
            <h2 className="text-lg font-bold text-white">
              Birthday Attack Statistics
            </h2>
            <div className="mt-4">
              <StatsGrid stats={currentStats} attempts={progress.attempts} />
            </div>
            {progress.attempts > 0 && (
              <div className="mt-4">
                <ProbabilityMeter probability={currentStats.currentProbability} />
              </div>
            )}
          </section>

          {/* Known Collisions */}
          <section className="rounded-3xl border border-white/10 bg-white/[0.02] p-6 shadow-xl backdrop-blur-sm">
            <h2 className="text-lg font-bold text-white">
              Historical Hash Collisions
            </h2>
            <div className="mt-3 space-y-3">
              {[
                {
                  algorithm: "MD5",
                  description: "Wang & Yu (2004) found practical MD5 collisions. Two different files can produce identical MD5 hashes, enabling certificate forgery and malware evasion.",
                  reference: "First practical MD5 collision — cryptanalyzed in seconds on modern hardware",
                },
                {
                  algorithm: "SHA-1",
                  description: "Google's SHAttered attack (2017) created the first practical SHA-1 collision, prefixing two PDFs with the same SHA-1 hash.",
                  reference: "Cost: ~$110,000 in cloud computing (2^63 operations)",
                },
                {
                  algorithm: "Birthday Paradox",
                  description: "With 23 people in a room, there's a >50% chance two share a birthday. This is the same math behind hash collisions: O(√N) not O(N).",
                  reference: "Dirichlet's box principle — the foundation of birthday attacks",
                },
              ].map((item, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-white/5 bg-slate-950/40 p-4"
                >
                  <div className="flex items-start gap-3">
                    <ShieldAlert size={14} className="text-amber-400 mt-0.5 shrink-0" />
                    <div>
                      <h4 className="text-sm font-bold text-white">
                        {item.algorithm}
                      </h4>
                      <p className="mt-1 text-xs text-zinc-400 leading-relaxed">
                        {item.description}
                      </p>
                      <p className="mt-1 text-[10px] text-zinc-600 italic">
                        {item.reference}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Right Column: Results */}
        <div className="space-y-6">
          {/* Collision Result */}
          {result && result.found && (
            <section className="rounded-3xl border border-emerald-500/20 bg-emerald-500/5 p-6 shadow-xl backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500">
                  <Check size={20} className="text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">
                    Collision Found!
                  </h2>
                  <p className="text-sm text-emerald-300">
                    Two different inputs produce the same {bits}-bit hash
                  </p>
                </div>
              </div>
              <div className="mt-6 grid grid-cols-2 gap-4">
                <div className="rounded-2xl border border-white/10 bg-slate-950 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-600 mb-2">
                    Input 1
                  </p>
                  <p className="font-mono text-sm text-teal-300 break-all">
                    {result.input1}
                  </p>
                  <p className="mt-2 font-mono text-xs text-zinc-500 break-all">
                    Hash: {result.hash1}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-950 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-600 mb-2">
                    Input 2
                  </p>
                  <p className="font-mono text-sm text-teal-300 break-all">
                    {result.input2}
                  </p>
                  <p className="mt-2 font-mono text-xs text-zinc-500 break-all">
                    Hash: {result.hash2}
                  </p>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-4 text-xs text-zinc-500">
                <span className="flex items-center gap-1">
                  <Clock size={12} />
                  {result.durationMs.toFixed(0)}ms
                </span>
                <span>{result.attempts.toLocaleString()} attempts</span>
                <span>
                  {((result.attempts / result.expectedAttempts) * 100).toFixed(0)}% of expected
                </span>
              </div>
            </section>
          )}

          {/* No Collision Found */}
          {result && !result.found && (
            <section className="rounded-3xl border border-amber-500/20 bg-amber-500/5 p-6 shadow-xl backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <AlertTriangle size={20} className="text-amber-400" />
                <div>
                  <h2 className="text-xl font-bold text-white">
                    No Collision Found
                  </h2>
                  <p className="text-sm text-amber-300">
                    Reached the attempt limit without finding a collision.
                    Try fewer bits or a weaker algorithm.
                  </p>
                </div>
              </div>
            </section>
          )}

          {/* Hash Table */}
          {result && result.history.length > 0 && (
            <section className="rounded-3xl border border-white/10 bg-white/[0.02] p-6 shadow-xl backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white">
                  Hash Attempts
                </h2>
                <span className="text-xs text-zinc-600">
                  Last {Math.min(30, result.history.length)} of {result.attempts.toLocaleString()}
                </span>
              </div>
              <div className="mt-4">
                <HashTable result={result} />
              </div>
            </section>
          )}

          {/* Educational Content */}
          <section className="rounded-3xl border border-white/10 bg-white/[0.02] p-6 shadow-xl backdrop-blur-sm">
            <h2 className="text-2xl font-bold text-white">
              Understanding Hash Collisions
            </h2>
            <div className="mt-4 space-y-4">
              {Object.values(EXPLANATIONS).map((exp, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-white/5 bg-slate-950/40 p-4"
                >
                  <h3 className="text-sm font-bold text-teal-400">
                    {exp.title}
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-zinc-400">
                    {exp.content}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Why This Matters */}
          <section className="rounded-3xl border border-white/10 bg-white/[0.02] p-6 shadow-xl backdrop-blur-sm">
            <h2 className="text-2xl font-bold text-white">
              Why Collision Resistance Matters
            </h2>
            <div className="mt-4 space-y-3">
              {[
                {
                  icon: Shield,
                  title: "Digital Signatures",
                  desc: "If two documents have the same hash, an attacker can forge a signature on one by getting the other signed.",
                },
                {
                  icon: ShieldCheck,
                  title: "Certificate Authority",
                  desc: "TLS certificates use hash functions for signing. A collision could create a fraudulent certificate trusted by browsers.",
                },
                {
                  icon: ShieldAlert,
                  title: "Password Storage",
                  desc: "If an attacker finds a collision, they can log in with a different password than the one you stored.",
                },
                {
                  icon: Info,
                  title: "Git Integrity",
                  desc: "Git uses SHA-1 to identify commits. A collision could inject malicious code that appears to be a legitimate commit.",
                },
              ].map((item, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 rounded-xl border border-white/5 bg-slate-950/40 p-3"
                >
                  <item.icon size={14} className="text-teal-400 mt-0.5 shrink-0" />
                  <div>
                    <h4 className="text-xs font-bold text-white">{item.title}</h4>
                    <p className="mt-0.5 text-[11px] text-zinc-500">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
