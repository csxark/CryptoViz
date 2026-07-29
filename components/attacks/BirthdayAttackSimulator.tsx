"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  calculateCollisionProbability,
  calculate50PercentThreshold,
  formatHash,
} from "../../lib/attacks/birthdayAttack";
import { cn } from "../../lib/utils";
import {
  Play,
  Pause,
  RotateCcw,
  Activity,
  Cpu,
  ShieldCheck,
  AlertTriangle,
  HelpCircle,
  Hash,
} from "lucide-react";

interface CollisionDetail {
  index1: number;
  index2: number;
  hash: string;
}

export default function BirthdayAttackSimulator() {
  // Simulator Configurations
  const [bits, setBits] = useState<number>(8);
  const [speed, setSpeed] = useState<number>(5); // hashes generated per frame tick
  const [status, setStatus] = useState<"idle" | "running" | "paused" | "collision">("idle");

  // Output Statistics
  const [samplesCount, setSamplesCount] = useState<number>(0);
  const [firstCollision, setFirstCollision] = useState<CollisionDetail | null>(null);
  const [collisionsCount, setCollisionsCount] = useState<number>(0);
  const [log, setLog] = useState<string[]>(["Click Start to simulate hash generation."]);

  // Visual grid hits (only active for 8-bit = 256 keys)
  const [gridHits, setGridHits] = useState<number[]>(() => new Array(256).fill(0));

  // Refs for off-state values to avoid thread blocking
  const hashRegistryRef = useRef<Map<number, number>>(new Map()); // maps hash -> index
  const generatedCountRef = useRef<number>(0);
  const gridHitsRef = useRef<number[]>(new Array(256).fill(0));
  const requestRef = useRef<number | null>(null);
  const lastTickRef = useRef<number>(0);

  const hashSpaceSize = useMemo(() => {
    return Math.pow(2, bits);
  }, [bits]);

  const threshold50 = useMemo(() => {
    return calculate50PercentThreshold(hashSpaceSize);
  }, [hashSpaceSize]);

  const probability = useMemo(() => {
    return calculateCollisionProbability(samplesCount, hashSpaceSize);
  }, [samplesCount, hashSpaceSize]);

  // Reset simulator
  const resetSimulation = useCallback(() => {
    setStatus("idle");
    setSamplesCount(0);
    setFirstCollision(null);
    setCollisionsCount(0);
    setLog(["Simulator reset. Ready for new run."]);
    setGridHits(new Array(256).fill(0));

    hashRegistryRef.current.clear();
    generatedCountRef.current = 0;
    gridHitsRef.current.fill(0);

    if (requestRef.current) {
      cancelAnimationFrame(requestRef.current);
      requestRef.current = null;
    }
  }, []);

  // Sync state on bit config change
  const handleBitsChange = (newBits: number) => {
    setBits(newBits);
    resetSimulation();
  };

  // Generate hashes loop
  const animateSimulation = useCallback(
    (timestamp: number) => {
      if (status !== "running") return;

      const timeDelta = timestamp - lastTickRef.current;

      // Update calculations at ~60fps
      if (timeDelta > 30) {
        lastTickRef.current = timestamp;

        const space = hashSpaceSize;
        const registry = hashRegistryRef.current;
        const newLogLines: string[] = [];
        let collisionFoundThisTick = false;
        let collisionInfo: CollisionDetail | null = null;

        // Generate batch of hashes based on speed settings
        for (let s = 0; s < speed; s++) {
          const currentSampleIndex = generatedCountRef.current + 1;

          // Generate a pseudo-random hash value within the range [0, space - 1]
          // Math.random() is fine for educational simulations
          const hashValue = Math.floor(Math.random() * space);
          const hashHex = formatHash(hashValue, bits);

          // Update grid tracker if bit size is 8
          if (bits === 8) {
            gridHitsRef.current[hashValue] = (gridHitsRef.current[hashValue] || 0) + 1;
          }

          if (registry.has(hashValue)) {
            // Collision detected!
            const previousIndex = registry.get(hashValue) || 0;
            collisionFoundThisTick = true;
            collisionInfo = {
              index1: previousIndex,
              index2: currentSampleIndex,
              hash: `0x${hashHex}`,
            };
            newLogLines.push(
              `💥 [COLLISION] Sample #${currentSampleIndex} matched Sample #${previousIndex} (Hash: 0x${hashHex})`,
            );
            generatedCountRef.current = currentSampleIndex;
            break;
          } else {
            registry.set(hashValue, currentSampleIndex);
            generatedCountRef.current = currentSampleIndex;

            // Only log some steps to prevent console memory explosion
            if (s === 0 || s === speed - 1 || currentSampleIndex % 100 === 0) {
              newLogLines.push(
                `[Sample #${currentSampleIndex}] Hash generated: 0x${hashHex}`,
              );
            }
          }
        }

        // Apply changes
        setSamplesCount(generatedCountRef.current);
        if (bits === 8) {
          setGridHits([...gridHitsRef.current]);
        }

        if (newLogLines.length > 0) {
          setLog((prev) => [...prev.slice(-15), ...newLogLines]);
        }

        if (collisionFoundThisTick && collisionInfo) {
          setStatus("collision");
          setFirstCollision(collisionInfo);
          setCollisionsCount((prev) => prev + 1);
          return;
        }
      }

      requestRef.current = requestAnimationFrame(animateSimulation);
    },
    [status, speed, bits, hashSpaceSize],
  );

  // Trigger animation loop
  useEffect(() => {
    if (status === "running") {
      requestRef.current = requestAnimationFrame(animateSimulation);
    } else if (requestRef.current) {
      cancelAnimationFrame(requestRef.current);
      requestRef.current = null;
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [status, animateSimulation]);

  const handleStart = () => {
    setStatus("running");
    lastTickRef.current = performance.now();
    setLog((prev) => [...prev, "⚔️ Simulation started..."]);
  };

  const handlePause = () => {
    setStatus("paused");
    setLog((prev) => [...prev, "⏸️ Simulation paused."]);
  };

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-10 text-slate-100 sm:px-6 lg:px-8">
      {/* Title block */}
      <section className="overflow-hidden rounded-3xl border border-white/10 bg-slate-950 shadow-2xl shadow-black/30">
        <div className="relative isolate px-6 py-10 sm:px-10">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(20,184,166,0.18),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(244,63,94,0.1),transparent_35%)]" />
          <p className="text-sm font-semibold uppercase tracking-[0.32em] text-rose-400">
            Attack Simulator
          </p>
          <div className="mt-4 grid gap-8 lg:grid-cols-[1.25fr_0.75fr] lg:items-end">
            <div>
              <h1 className="max-w-4xl text-4xl font-black tracking-tight text-white sm:text-5xl">
                Birthday Attack Simulator
              </h1>
              <p className="mt-5 max-w-3xl text-base leading-8 text-slate-300">
                Witness the power of the birthday paradox. Instead of searching for a specific target hash, a birthday attack searches for any two random outputs that match. Learn why collision resistance is mathematically much easier to break than standard brute force preimage resistance.
              </p>
            </div>
            <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-5">
              <p className="text-sm font-semibold text-rose-300">
                Collision Paradox
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                In a group of 23 people, there is a 50.7% chance that at least two share a birthday, despite 365 possible dates. In cryptography, this means finding collisions requires exponentially fewer attempts than guessing a key.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Inputs/Control Grid */}
      <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-6">
          {/* Controls Card */}
          <section className="rounded-3xl border border-white/10 bg-white/[0.02] p-6 shadow-xl backdrop-blur-sm">
            <h2 className="text-2xl font-bold text-white">1. Configure Hash parameters</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Reduce the output size of the hash space to observe the paradox dynamically.
            </p>

            {/* Bits selector */}
            <div className="mt-6">
              <label className="block text-sm font-semibold text-slate-200" htmlFor="bits-select">
                Hash output size (Bit depth)
              </label>
              <select
                id="bits-select"
                value={bits}
                onChange={(e) => handleBitsChange(parseInt(e.target.value))}
                disabled={status === "running"}
                className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none ring-rose-400/40 focus:ring-2 disabled:opacity-50"
              >
                <option value={8}>8 bits (256 values — visual grid active)</option>
                <option value={16}>16 bits (65,536 values)</option>
                <option value={24}>24 bits (16.7 million values)</option>
                <option value={32}>32 bits (4.29 billion values)</option>
              </select>
            </div>

            {/* Generation speed slider */}
            <div className="mt-6">
              <div className="flex justify-between text-sm">
                <label className="font-semibold text-slate-200" htmlFor="speed-range-input">
                  Simulation Speed:
                </label>
                <span className="font-mono text-rose-400 font-bold">{speed} hashes/tick</span>
              </div>
              <input
                id="speed-range-input"
                type="range"
                min="1"
                max="250"
                value={speed}
                onChange={(e) => setSpeed(parseInt(e.target.value))}
                className="mt-3 w-full accent-rose-500 cursor-pointer"
              />
              <span className="text-[10px] text-slate-500 block mt-1">
                Increase speed to accelerate search inside larger hash spaces.
              </span>
            </div>

            {/* Control buttons */}
            <div className="mt-8 flex gap-4">
              {status !== "running" ? (
                <button
                  onClick={handleStart}
                  disabled={status === "collision"}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-rose-500 px-6 py-3 font-bold text-slate-950 transition-all hover:bg-rose-400 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                >
                  <Play size={16} fill="currentColor" />
                  {status === "paused" ? "Resume Trace" : "Start Attack"}
                </button>
              ) : (
                <button
                  onClick={handlePause}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-6 py-3 font-bold text-white transition-all hover:bg-white/[0.1] cursor-pointer"
                >
                  <Pause size={16} fill="currentColor" />
                  Pause
                </button>
              )}

              <button
                onClick={resetSimulation}
                className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.02] px-6 py-3 font-bold text-slate-300 transition-all hover:bg-white/[0.06] cursor-pointer"
              >
                <RotateCcw size={16} />
                Reset
              </button>
            </div>
          </section>

          {/* Theoretical Calculations Stats */}
          <section className="rounded-3xl border border-white/10 bg-white/[0.02] p-6 shadow-xl backdrop-blur-sm">
            <h2 className="text-2xl font-bold text-white">2. Mathematical Probability</h2>

            {/* Probability Gauge */}
            <div className="mt-6 rounded-2xl border border-white/5 bg-slate-950/40 p-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-semibold text-slate-300">Probability of Collision:</span>
                <span
                  className={cn(
                    "px-3 py-1 rounded-full text-xs font-black border uppercase tracking-wider",
                    probability >= 0.9
                      ? "text-rose-400 bg-rose-500/10 border-rose-500/20"
                      : probability >= 0.5
                        ? "text-amber-400 bg-amber-500/10 border-amber-500/20"
                        : "text-teal-400 bg-teal-500/10 border-teal-500/20",
                  )}
                >
                  {(probability * 100).toFixed(2)}%
                </span>
              </div>
              <div className="mt-3 h-2 w-full rounded-full bg-white/5 overflow-hidden">
                <div
                  className={cn(
                    "h-full transition-all duration-300",
                    probability >= 0.9 ? "bg-rose-500" : probability >= 0.5 ? "bg-amber-500" : "bg-teal-500",
                  )}
                  style={{ width: `${probability * 100}%` }}
                />
              </div>
              <div className="mt-3 flex justify-between text-xs text-slate-500 font-mono">
                <span>Samples: {samplesCount.toLocaleString()}</span>
                <span>50% Threshold: {threshold50.toLocaleString()} hashes</span>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="mt-6 grid grid-cols-2 gap-4">
              <div className="rounded-2xl border border-white/5 bg-slate-950/40 p-4">
                <div className="flex items-center gap-2 text-slate-400">
                  <Activity size={16} className="text-rose-400" />
                  <span className="text-xs font-semibold uppercase tracking-wider">Total Hash Space</span>
                </div>
                <p className="mt-2 text-lg font-black font-mono truncate text-white">
                  {hashSpaceSize > 1000000 ? hashSpaceSize.toExponential(2) : hashSpaceSize.toLocaleString()}
                </p>
                <span className="text-[10px] text-slate-500">Possible outputs ($2^{bits}$)</span>
              </div>

              <div className="rounded-2xl border border-white/5 bg-slate-950/40 p-4">
                <div className="flex items-center gap-2 text-slate-400">
                  <Cpu size={16} className="text-rose-400" />
                  <span className="text-xs font-semibold uppercase tracking-wider">50% Probability Point</span>
                </div>
                <p className="mt-2 text-lg font-black font-mono truncate text-white">
                  {threshold50.toLocaleString()}
                </p>
                <span className="text-[10px] text-slate-500">Expected inputs for collision</span>
              </div>
            </div>
          </section>
        </div>

        {/* Right Column: Visual Heatmap & Live Log */}
        <div className="space-y-6">
          {/* Active collision status banner */}
          {status === "collision" && firstCollision && (
            <section className="rounded-3xl border border-rose-500/40 bg-rose-500/10 p-6 shadow-xl animate-pulse">
              <div className="flex items-center gap-3">
                <AlertTriangle size={24} className="text-rose-400 shrink-0" />
                <div>
                  <h3 className="text-lg font-bold text-white">Collision Found!</h3>
                  <p className="text-sm text-slate-300 mt-1">
                    Matched hash <code className="text-rose-300 font-mono font-bold">{firstCollision.hash}</code> between sample <strong>#{firstCollision.index1}</strong> and sample <strong>#{firstCollision.index2}</strong>.
                  </p>
                  <p className="text-xs text-rose-300/80 mt-2 font-mono">
                    Found after generating only {samplesCount.toLocaleString()} hashes, which is approx {((samplesCount / hashSpaceSize) * 100).toFixed(4)}% of the total search space.
                  </p>
                </div>
              </div>
            </section>
          )}

          {/* Animated Visual Grid / Placeholder */}
          <section className="rounded-3xl border border-white/10 bg-white/[0.02] p-6 shadow-xl backdrop-blur-sm">
            <h2 className="text-2xl font-bold text-white mb-4">Live Hash Space Visualizer</h2>

            {bits === 8 ? (
              <div>
                <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                  Mapping all 256 possible hash outputs in a 16x16 grid. Cells turn <span className="text-teal-400 font-bold">teal</span> when visited. Multiple hits (collisions) flash <span className="text-rose-400 font-bold">rose/gold</span>.
                </p>
                <div className="grid gap-1 bg-slate-950 p-4 rounded-2xl border border-white/5 max-w-sm mx-auto" style={{ gridTemplateColumns: 'repeat(16, minmax(0, 1fr))' }}>
                  {gridHits.map((hits, index) => (
                    <div
                      key={index}
                      className={cn(
                        "aspect-square rounded-sm border transition-all duration-100",
                        hits === 0
                          ? "border-white/5 bg-slate-900/40"
                          : hits === 1
                            ? "border-teal-500/30 bg-teal-500/20 shadow-[0_0_4px_rgba(20,184,166,0.1)]"
                            : "border-rose-500 bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.3)] animate-pulse",
                      )}
                      title={`Hash 0x${index.toString(16).toUpperCase().padStart(2, "0")} — Hits: ${hits}`}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 p-12 text-center bg-slate-950/40">
                <Hash size={40} className="text-slate-600 mb-3" />
                <h3 className="font-semibold text-white">Visual Grid Inactive</h3>
                <p className="mt-2 text-sm text-slate-400 max-w-xs leading-relaxed">
                  A hash space of $2^{bits}$ ({hashSpaceSize.toLocaleString()} possible values) is too large to represent in a 2D cell grid. Track progress via the live registry log below.
                </p>
              </div>
            )}

            {/* Scrolling logs console */}
            <div className="mt-6">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                Live Registry Log
              </label>
              <div className="w-full rounded-2xl bg-black/60 p-4 font-mono text-xs text-rose-400/80 leading-relaxed border border-white/5 h-48 overflow-y-auto">
                {log.map((line, idx) => {
                  const isCollision = line.includes("COLLISION") || line.includes("matched");
                  return (
                    <div
                      key={idx}
                      className={cn(
                        isCollision ? "text-rose-400 font-bold border-l-2 border-rose-500 pl-2 my-1" : "text-teal-400/80",
                      )}
                    >
                      {line}
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Educational Explanation Box */}
      <section className="grid gap-6 rounded-3xl border border-white/10 bg-white/[0.02] p-6 shadow-xl backdrop-blur-sm md:grid-cols-3">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-white">
            <HelpCircle size={16} className="text-rose-400" />
            <h3 className="font-bold">What is the Birthday Paradox?</h3>
          </div>
          <p className="text-sm leading-6 text-slate-400">
            The paradox reveals that counter-intuitive probabilities arise when looking for matches among ANY members of a set rather than matching a single PRE-SPECIFIED member. For collision searches, we compare every generated output with every other generated output.
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-white">
            <AlertTriangle size={16} className="text-rose-400" />
            <h3 className="font-bold">Preimage vs. Collision Resistance</h3>
          </div>
          <p className="text-sm leading-6 text-slate-400">
            Brute forcing a *specific* hash output (preimage resistance) has a complexity of O(2^n). Finding *any* collision (collision resistance) has a complexity of only O(2^(n/2)). Thus, a 256-bit hash function only provides 128 bits of security against collisions.
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-white">
            <ShieldCheck size={16} className="text-rose-400" />
            <h3 className="font-bold">Why Output Size Matters</h3>
          </div>
          <p className="text-sm leading-6 text-slate-400">
            Because birthday attacks cut cryptographic security in half, hashes must have much larger output sizes than symmetric block keys. A symmetric key of 128 bits is secure, but a hash function must output at least 256 bits (like SHA-256) to resist collision searches.
          </p>
        </div>
      </section>
    </div>
  );
}
