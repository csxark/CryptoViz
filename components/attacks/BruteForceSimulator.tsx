"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  SPEED_PRESETS,
  CHARACTER_SETS,
  calculateKeyspace,
  calculateEntropy,
  calculateEstimatedTime,
  formatDuration,
  getStrengthIndicator,
} from "../../lib/attacks/bruteForce";
import { cn } from "../../lib/utils";

function formatLargeValue(value: number | bigint): string {
  if (typeof value === "bigint") {
    return value.toString();
  }

  if (value >= 1_000_000_000_000) {
    return value.toExponential(3);
  }

  return value.toLocaleString();
}
import {
  ShieldCheck,
  Timer,
  Activity,
  Cpu,
  Play,
  Pause,
  RotateCcw,
  Lock,
  Unlock,
} from "lucide-react";

export default function BruteForceSimulator() {
  // Simulator State
  const [password, setPassword] = useState("secure123");
  const [length, setLength] = useState(9);
  const [selectedCharsets, setSelectedCharsets] = useState<string[]>([
    "lowercase",
    "numbers",
  ]);
  const [selectedPresetId, setSelectedPresetId] = useState<string>("wifi");
  const [customSpeed, setCustomSpeed] = useState<number>(500_000);

  // Animation State
  const [simStatus, setSimStatus] = useState<"idle" | "running" | "paused" | "success">("idle");
  const [simAttempts, setSimAttempts] = useState<number>(0);
  const [simCurrentGuess, setSimCurrentGuess] = useState<string>("");
  const [simLockedCount, setSimLockedCount] = useState<number>(0);
  const [simLog, setSimLog] = useState<string[]>([]);

  const requestRef = useRef<number | null>(null);
  const lastTickRef = useRef<number>(0);

  // Sync password input with sliders/checkboxes
  const handlePasswordChange = (val: string) => {
    setPassword(val);
    if (val.length === 0) return;

    const newLength = Math.min(Math.max(val.length, 1), 32);
    setLength(newLength);

    const activeSets: string[] = [];
    if (/[a-z]/.test(val)) activeSets.push("lowercase");
    if (/[A-Z]/.test(val)) activeSets.push("uppercase");
    if (/[0-9]/.test(val)) activeSets.push("numbers");
    if (/[^a-zA-Z0-9]/.test(val)) activeSets.push("symbols");

    // If no character set is detected (e.g. empty symbols), keep at least lowercase
    if (activeSets.length === 0) activeSets.push("lowercase");
    setSelectedCharsets(activeSets);

    // Reset animation if inputs change
    resetSimulation();
  };

  // Handle manual adjustments (clears active custom password text to show custom mode)
  const handleManualLengthChange = (newLen: number) => {
    setLength(newLen);
    setPassword("");
    resetSimulation();
  };

  const handleCharsetToggle = (id: string) => {
    setSelectedCharsets((prev) => {
      let next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      if (next.length === 0) {
        next = [id]; // Prevent zero charsets
      }
      return next;
    });
    setPassword("");
    resetSimulation();
  };

  // Speed math
  const activeSpeed = useMemo(() => {
    if (selectedPresetId === "custom") {
      return customSpeed;
    }
    const preset = SPEED_PRESETS.find((p) => p.id === selectedPresetId);
    return preset ? preset.speed : 100_000;
  }, [selectedPresetId, customSpeed]);

  // Keyspace details
  const totalCharsetSize = useMemo(() => {
    return selectedCharsets.reduce((acc, cid) => {
      const set = CHARACTER_SETS.find((c) => c.id === cid);
      return acc + (set ? set.size : 0);
    }, 0);
  }, [selectedCharsets]);

  const keyspace = useMemo(() => {
    return calculateKeyspace(length, totalCharsetSize);
  }, [length, totalCharsetSize]);

  const entropy = useMemo(() => {
    return calculateEntropy(length, totalCharsetSize);
  }, [length, totalCharsetSize]);

  const crackTimes = useMemo(() => {
    return calculateEstimatedTime(keyspace, activeSpeed);
  }, [keyspace, activeSpeed]);

  const strength = useMemo(() => {
    return getStrengthIndicator(entropy);
  }, [entropy]);

  // Get active characters for random generation
  const activeCharactersPool = useMemo(() => {
    return selectedCharsets.reduce((acc, cid) => {
      const set = CHARACTER_SETS.find((c) => c.id === cid);
      return acc + (set ? set.characters : "");
    }, "");
  }, [selectedCharsets]);

  // Reset simulation variables
  const resetSimulation = useCallback(() => {
    setSimStatus("idle");
    setSimAttempts(0);
    setSimCurrentGuess("");
    setSimLockedCount(0);
    setSimLog(["Simulator initialized. Click Start to trace attack."]);
    if (requestRef.current) {
      cancelAnimationFrame(requestRef.current);
      requestRef.current = null;
    }
  }, []);

  // Effect to clean up animation frame
  useEffect(() => {
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, []);

  // Attack sequence animation loop
  const animateAttack = useCallback(
    (timestamp: number) => {
      if (simStatus !== "running") return;

      const timeDelta = timestamp - lastTickRef.current;

      // Update guess visual at ~60fps
      if (timeDelta > 50) {
        lastTickRef.current = timestamp;

        // Generate target text to match (use input password or a mock fallback)
        const targetText = password.trim() || "x".repeat(length);
        const resolvedText = targetText.slice(0, Math.min(length, 32));

        // Generate random characters for non-locked slots
        let guess = "";
        const pool = activeCharactersPool || "abcdefghijklmnopqrstuvwxyz";

        for (let i = 0; i < resolvedText.length; i++) {
          if (i < simLockedCount) {
            guess += resolvedText[i];
          } else {
            const randIndex = Math.floor(Math.random() * pool.length);
            guess += pool[randIndex] || "x";
          }
        }

        setSimCurrentGuess(guess);
        setSimAttempts((prev) => prev + Math.floor(activeSpeed / 20) + 1);

        // Periodically lock-in a character (simulating brute force matching slots)
        // Rate of locking in is scaled to keep simulation around 4-5 seconds
        const probability = 0.04;
        if (Math.random() < probability && simLockedCount < resolvedText.length) {
          const nextLock = simLockedCount + 1;
          setSimLockedCount(nextLock);
          const lockedChar = resolvedText[simLockedCount];

          setSimLog((prev) => [
            ...prev.slice(-4),
            `[Locked] Position ${nextLock} successfully matched: "${lockedChar}"`,
          ]);

          if (nextLock === resolvedText.length) {
            setSimStatus("success");
            setSimCurrentGuess(resolvedText);
            setSimLog((prev) => [
              ...prev,
              "🛡️ [Success] Password fully cracked in educational simulation!",
            ]);
            return;
          }
        }
      }

      requestRef.current = requestAnimationFrame(animateAttack);
    },
    [simStatus, simLockedCount, password, length, activeCharactersPool, activeSpeed],
  );

  // Trigger loop on status change
  useEffect(() => {
    if (simStatus === "running") {
      requestRef.current = requestAnimationFrame(animateAttack);
    } else if (requestRef.current) {
      cancelAnimationFrame(requestRef.current);
      requestRef.current = null;
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [simStatus, animateAttack]);

  const handleStart = () => {
    if (totalCharsetSize === 0) return;
    setSimStatus("running");
    lastTickRef.current = performance.now();
    setSimLog((prev) => [...prev, "⚔️ Attack simulation started..."]);
  };

  const handlePause = () => {
    setSimStatus("paused");
    setSimLog((prev) => [...prev, "⏸️ Simulation paused."]);
  };

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-10 text-slate-100 sm:px-6 lg:px-8">
      {/* Header Banner */}
      <section className="overflow-hidden rounded-3xl border border-white/10 bg-slate-950 shadow-2xl shadow-black/30">
        <div className="relative isolate px-6 py-10 sm:px-10">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(0,196,174,0.2),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(168,85,247,0.12),transparent_35%)]" />
          <p className="text-sm font-semibold uppercase tracking-[0.32em] text-teal-400">
            Security tool
          </p>
          <div className="mt-4 grid gap-8 lg:grid-cols-[1.25fr_0.75fr] lg:items-end">
            <div>
              <h1 className="max-w-4xl text-4xl font-black tracking-tight text-white sm:text-5xl">
                Brute Force Attack Time Estimator
              </h1>
              <p className="mt-5 max-w-3xl text-base leading-8 text-slate-300">
                Understand how key spacing, entropy levels, and hashing algorithms determine password security. Adjust lengths, character complexities, and computing budgets to witness the math of exponential complexity.
              </p>
            </div>
            <div className="rounded-2xl border border-teal-500/20 bg-teal-500/10 p-5">
              <p className="text-sm font-semibold text-teal-300">
                Educational Playground
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                This simulator operates completely locally on your system. It is designed to illustrate password strength mathematical properties without sending any inputs to external servers.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Main Grid Layout */}
      <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        {/* Left Column: Controls */}
        <div className="space-y-6">
          <section className="rounded-3xl border border-white/10 bg-white/[0.02] p-6 shadow-xl backdrop-blur-sm">
            <h2 className="text-2xl font-bold text-white">1. Choose Password Options</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Type an active password to analyze it directly, or tweak parameters below to estimate a hypothetical target.
            </p>

            {/* Custom password field */}
            <div className="mt-6">
              <label className="block text-sm font-semibold text-slate-200" htmlFor="test-password-input">
                Test Password String
              </label>
              <input
                id="test-password-input"
                type="text"
                value={password}
                onChange={(e) => handlePasswordChange(e.target.value)}
                placeholder="Type here (e.g. secret123)..."
                className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none ring-teal-500/40 focus:ring-2"
              />
            </div>

            {/* Password length slider */}
            <div className="mt-6">
              <div className="flex justify-between text-sm">
                <label className="font-semibold text-slate-200" htmlFor="length-range-input">
                  Password Length:
                </label>
                <span className="font-mono text-teal-400 font-bold">{length} characters</span>
              </div>
              <input
                id="length-range-input"
                type="range"
                min="1"
                max="32"
                value={length}
                onChange={(e) => handleManualLengthChange(parseInt(e.target.value))}
                className="mt-3 w-full accent-teal-500 cursor-pointer"
              />
            </div>

            {/* Character Set Checkboxes */}
            <div className="mt-6">
              <label className="block text-sm font-semibold text-slate-200 mb-3">
                Character Sets Used ({totalCharsetSize} total chars)
              </label>
              <div className="grid grid-cols-2 gap-3">
                {CHARACTER_SETS.map((set) => {
                  const isChecked = selectedCharsets.includes(set.id);
                  return (
                    <button
                      key={set.id}
                      onClick={() => handleCharsetToggle(set.id)}
                      className={cn(
                        "flex flex-col items-start rounded-xl border p-3 text-left transition-all duration-200",
                        isChecked
                          ? "border-teal-500/40 bg-teal-500/5 text-white"
                          : "border-white/5 bg-slate-950/40 text-slate-400 hover:border-white/10",
                      )}
                    >
                      <span className="text-sm font-bold">{set.name}</span>
                      <span className="text-xs text-slate-500 mt-1 font-mono">
                        {set.example} (size: {set.size})
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          {/* Speed Preset Selector */}
          <section className="rounded-3xl border border-white/10 bg-white/[0.02] p-6 shadow-xl backdrop-blur-sm">
            <h2 className="text-2xl font-bold text-white">2. Attack Speed Configuration</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Select standard hardware options or specify custom configurations to estimate cracking times.
            </p>

            <div className="mt-6">
              <label className="block text-sm font-semibold text-slate-200" htmlFor="speed-preset-select">
                Attacker Capability Preset
              </label>
              <select
                id="speed-preset-select"
                value={selectedPresetId}
                onChange={(e) => setSelectedPresetId(e.target.value)}
                className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none ring-teal-500/40 focus:ring-2"
              >
                {SPEED_PRESETS.map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {preset.name} — {preset.speed.toLocaleString()} H/s
                  </option>
                ))}
                <option value="custom">Custom Speed (Specify below)</option>
              </select>
            </div>

            {selectedPresetId === "custom" && (
              <div className="mt-4">
                <label className="block text-sm font-semibold text-slate-200" htmlFor="custom-speed-input">
                  Custom speed (hashes/second)
                </label>
                <input
                  id="custom-speed-input"
                  type="number"
                  min="1"
                  value={customSpeed}
                  onChange={(e) => setCustomSpeed(Math.max(1, parseInt(e.target.value) || 1))}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none ring-teal-500/40 focus:ring-2 font-mono"
                />
              </div>
            )}
          </section>
        </div>

        {/* Right Column: Statistics & Animations */}
        <div className="space-y-6">
          {/* Output Estimates */}
          <section className="rounded-3xl border border-white/10 bg-white/[0.02] p-6 shadow-xl backdrop-blur-sm">
            <h2 className="text-2xl font-bold text-white">3. Estimate Calculations</h2>

            {/* Strength Gauge */}
            <div className="mt-6 rounded-2xl border border-white/5 bg-slate-950/40 p-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-semibold text-slate-300">Password Strength:</span>
                <span className={cn("px-3 py-1 rounded-full text-xs font-black border uppercase tracking-wider", strength.colorClass)}>
                  {strength.label}
                </span>
              </div>
              <div className="mt-3 h-2 w-full rounded-full bg-white/5 overflow-hidden">
                <div
                  className={cn("h-full transition-all duration-300", strength.progressColor)}
                  style={{ width: `${Math.min(100, (entropy / 128) * 100)}%` }}
                />
              </div>
              <div className="mt-3 flex justify-between text-xs text-slate-500 font-mono">
                <span>Entropy: {entropy.toFixed(1)} bits</span>
                <span>Minimum target: 60 bits</span>
              </div>
            </div>

            {/* Calculations Panel */}
            <div className="mt-6 grid grid-cols-2 gap-4">
              <div className="rounded-2xl border border-white/5 bg-slate-950/40 p-4">
                <div className="flex items-center gap-2 text-slate-400">
                  <Activity size={16} className="text-teal-400" />
                  <span className="text-xs font-semibold uppercase tracking-wider">Total Keyspace</span>
                </div>
                <p className="mt-2 text-lg font-black font-mono truncate text-white" title={keyspace.toString()}>
                  {formatLargeValue(keyspace)}
                </p>
                <span className="text-[10px] text-slate-500">Possible combinations ({totalCharsetSize}^{length})</span>
              </div>

              <div className="rounded-2xl border border-white/5 bg-slate-950/40 p-4">
                <div className="flex items-center gap-2 text-slate-400">
                  <Cpu size={16} className="text-teal-400" />
                  <span className="text-xs font-semibold uppercase tracking-wider">Cracking Speed</span>
                </div>
                <p className="mt-2 text-lg font-black font-mono truncate text-white">
                  {activeSpeed >= 1_000_000_000 ? activeSpeed.toExponential(1) : activeSpeed.toLocaleString()} H/s
                </p>
                <span className="text-[10px] text-slate-500">Attempts processed per sec</span>
              </div>
            </div>

            {/* Estimated Times */}
            <div className="mt-6 space-y-3">
              <div className="flex justify-between items-center rounded-xl bg-slate-950/30 border border-white/5 p-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Timer size={14} className="text-amber-400" />
                    <p className="text-xs font-semibold text-slate-400">Average Crack Time (50% keyspace)</p>
                  </div>
                  <p className="mt-1 text-xl font-extrabold text-white">
                    {formatDuration(crackTimes.averageSec)}
                  </p>
                </div>
              </div>

              <div className="flex justify-between items-center rounded-xl bg-slate-950/30 border border-white/5 p-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Timer size={14} className="text-red-400" />
                    <p className="text-xs font-semibold text-slate-400">Worst Case Time (100% keyspace)</p>
                  </div>
                  <p className="mt-1 text-xl font-extrabold text-white">
                    {formatDuration(crackTimes.worstSec)}
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Animation Visualization */}
          <section className="rounded-3xl border border-white/10 bg-white/[0.02] p-6 shadow-xl backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">4. Visual Decryption Trace</h2>
              <span className="text-xs text-slate-500 font-semibold uppercase tracking-[0.16em]">
                Educational Trace
              </span>
            </div>

            {/* Visual Combinator Display */}
            <div className="mt-6 flex flex-col items-center justify-center rounded-2xl border border-white/5 bg-slate-950 p-6 relative overflow-hidden">
              <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_center,rgba(20,216,194,0.06),transparent_60%)]" />

              <div className="flex gap-2">
                {(simCurrentGuess || " ".repeat(length)).split("").map((char, index) => {
                  const isLocked = index < simLockedCount || simStatus === "success";
                  return (
                    <div
                      key={`char-${index}-${char}`} // character position + value is unique
                      className={cn(
                        "flex h-12 w-10 items-center justify-center rounded-lg border text-lg font-black font-mono transition-all duration-150",
                        isLocked
                          ? "border-teal-500/40 bg-teal-500/20 text-teal-300 shadow-[0_0_12px_rgba(20,216,194,0.2)] animate-pulse"
                          : "border-white/10 bg-white/[0.02] text-slate-400",
                      )}
                    >
                      {char === " " ? "•" : char}
                    </div>
                  );
                })}
              </div>

              {/* Status information */}
              <div className="mt-6 w-full space-y-2 text-center text-xs">
                <div className="flex justify-between font-mono text-slate-400 border-b border-white/5 pb-2">
                  <span>Simulated Attempts:</span>
                  <span className="text-teal-400 font-bold">{simAttempts.toLocaleString()}</span>
                </div>
                <div className="flex justify-between font-mono text-slate-400">
                  <span>Matched Characters:</span>
                  <span className="text-teal-400 font-bold">
                    {simLockedCount} / {length} ({((simLockedCount / length) * 100).toFixed(0)}%)
                  </span>
                </div>
              </div>

              {/* Scrolling Console log */}
              <div className="mt-4 w-full rounded-lg bg-black/60 p-3 font-mono text-[10px] text-teal-400/80 leading-relaxed border border-white/5 max-h-24 overflow-y-auto">
                {simLog.map((logLine, idx) => (
                  <div key={`log-${idx}-${logLine.slice(0, 20)}`}>{logLine}</div>
                ))}
              </div>
            </div>

            {/* Animation Controls */}
            <div className="mt-6 flex justify-center gap-4">
              {simStatus !== "running" ? (
                <button
                  onClick={handleStart}
                  disabled={totalCharsetSize === 0 || simStatus === "success"}
                  className="flex items-center gap-2 rounded-xl bg-teal-500 px-6 py-3 font-bold text-slate-950 transition-all hover:bg-teal-400 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                >
                  <Play size={16} fill="currentColor" />
                  {simStatus === "paused" ? "Resume Simulation" : "Start Simulation"}
                </button>
              ) : (
                <button
                  onClick={handlePause}
                  className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-6 py-3 font-bold text-white transition-all hover:bg-white/[0.1] cursor-pointer"
                >
                  <Pause size={16} fill="currentColor" />
                  Pause Simulation
                </button>
              )}

              <button
                onClick={resetSimulation}
                className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.02] px-6 py-3 font-bold text-slate-300 transition-all hover:bg-white/[0.06] cursor-pointer"
              >
                <RotateCcw size={16} />
                Reset
              </button>
            </div>
          </section>
        </div>
      </div>

      {/* Educational Explanation Box */}
      <section className="grid gap-6 rounded-3xl border border-white/10 bg-white/[0.02] p-6 shadow-xl backdrop-blur-sm md:grid-cols-3">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-white">
            <Lock size={16} className="text-teal-400" />
            <h3 className="font-bold">Exponential Growth Math</h3>
          </div>
          <p className="text-sm leading-6 text-slate-400">
            Adding complexity increases $S$ linearly, but adding length increases $L$ exponentially. For example, adding one symbol to a 10-char password increases keyspace by a small factor, but making it 14 chars makes it billions of times harder to crack.
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-white">
            <Unlock size={16} className="text-teal-400" />
            <h3 className="font-bold">Offline vs. Online Hashing</h3>
          </div>
          <p className="text-sm leading-6 text-slate-400">
            Online attacks target APIs that rate-limit logins, restricting speed to e.g. 10 H/s. Offline attacks happen when databases are leaked, letting attackers run cracking rigs directly on hashes at billions of keys per second.
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-white">
            <ShieldCheck size={16} className="text-teal-400" />
            <h3 className="font-bold">The Slow-Hashing Defense</h3>
          </div>
          <p className="text-sm leading-6 text-slate-400">
            KDF algorithms (like Scrypt, PBKDF2, Bcrypt, and Argon2) are deliberately slow. They raise the computation cost of checking keys, reducing an attacker's speed from billions of hashes per second to mere hundreds, saving user databases.
          </p>
        </div>
      </section>
    </div>
  );
}
