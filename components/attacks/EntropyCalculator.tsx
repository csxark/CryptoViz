"use client";

import { useState } from "react";
import {
  CHARACTER_SETS,
  calculateEntropy,
  getStrengthIndicator,
  calculateKeyspace,
} from "../../lib/attacks/bruteForce";
import { ShieldCheck, Activity, KeyRound, AlertCircle, Info } from "lucide-react";
import { cn } from "../../lib/utils";

export default function EntropyCalculator() {
  const [password, setPassword] = useState("secure123");
  const [length, setLength] = useState(9);
  const [selectedCharsets, setSelectedCharsets] = useState<string[]>(["lowercase", "numbers"]);

  const handlePasswordChange = (val: string) => {
    setPassword(val);
    if (val.length === 0) {
      setLength(0);
      return;
    }

    const newLength = Math.min(Math.max(val.length, 1), 64);
    setLength(newLength);

    const activeSets: string[] = [];
    if (/[a-z]/.test(val)) activeSets.push("lowercase");
    if (/[A-Z]/.test(val)) activeSets.push("uppercase");
    if (/[0-9]/.test(val)) activeSets.push("numbers");
    if (/[^a-zA-Z0-9]/.test(val)) activeSets.push("symbols");

    if (activeSets.length === 0) activeSets.push("lowercase");
    setSelectedCharsets(activeSets);
  };

  const handleManualLengthChange = (newLen: number) => {
    setLength(newLen);
    setPassword("");
  };

  const handleCharsetToggle = (id: string) => {
    setSelectedCharsets((prev) => {
      let next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      if (next.length === 0) {
        next = [id];
      }
      return next;
    });
    setPassword("");
  };

  const activeCharsetSize = selectedCharsets.reduce((total, id) => {
    const set = CHARACTER_SETS.find((s) => s.id === id);
    return total + (set ? set.size : 0);
  }, 0);

  const entropy = calculateEntropy(length, activeCharsetSize);
  const keyspace = calculateKeyspace(length, activeCharsetSize);
  const strength = getStrengthIndicator(entropy);

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Password Entropy Calculator
        </h1>
        <p className="mt-4 text-lg text-slate-400">
          Understand the mathematical strength of a password based on its length and character complexity.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left Column: Inputs */}
        <div className="flex flex-col gap-6">
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 backdrop-blur-sm">
            <h2 className="mb-6 flex items-center gap-2 text-xl font-semibold text-white">
              <KeyRound className="h-5 w-5 text-teal-500" />
              Password Configuration
            </h2>

            <div className="space-y-6">
              <div>
                <label htmlFor="password-input" className="mb-2 block text-sm font-medium text-slate-300">
                  Test a Password
                </label>
                <input
                  id="password-input"
                  type="text"
                  value={password}
                  onChange={(e) => handlePasswordChange(e.target.value)}
                  placeholder="Enter a password to analyze..."
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-white placeholder-slate-500 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                  autoComplete="off"
                  spellCheck="false"
                />
              </div>

              <div className="relative py-4">
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  <div className="w-full border-t border-slate-800"></div>
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-slate-900/50 px-2 text-sm text-slate-500">OR CONFIGURE MANUALLY</span>
                </div>
              </div>

              <div>
                <div className="mb-2 flex justify-between">
                  <label htmlFor="length-slider" className="text-sm font-medium text-slate-300">
                    Password Length
                  </label>
                  <span className="text-sm font-bold text-teal-400">{length}</span>
                </div>
                <input
                  id="length-slider"
                  type="range"
                  min="1"
                  max="64"
                  value={length}
                  onChange={(e) => handleManualLengthChange(Number(e.target.value))}
                  className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-700 accent-teal-500"
                />
              </div>

              <div>
                <label className="mb-3 block text-sm font-medium text-slate-300">
                  Character Sets Used
                </label>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {CHARACTER_SETS.map((charset) => {
                    const isSelected = selectedCharsets.includes(charset.id);
                    return (
                      <label
                        key={charset.id}
                        className={cn(
                          "flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors",
                          isSelected
                            ? "border-teal-500/50 bg-teal-500/10"
                            : "border-slate-800 bg-slate-900 hover:border-slate-700"
                        )}
                      >
                        <div className="flex h-5 items-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleCharsetToggle(charset.id)}
                            className="h-4 w-4 rounded border-slate-600 bg-slate-700 text-teal-500 focus:ring-teal-500 focus:ring-offset-slate-900"
                          />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-white">{charset.name}</span>
                          <span className="text-xs text-slate-400">
                            Size: {charset.size} characters
                          </span>
                        </div>
                      </label>
                    );
                  })}
                </div>
                <p className="mt-3 text-sm text-slate-400">
                  Total Pool Size (N): <span className="font-mono text-teal-400">{activeCharsetSize}</span> characters
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Results */}
        <div className="flex flex-col gap-6">
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 backdrop-blur-sm">
            <h2 className="mb-6 flex items-center gap-2 text-xl font-semibold text-white">
              <Activity className="h-5 w-5 text-teal-500" />
              Entropy Analysis
            </h2>

            <div className="space-y-6">
              <div className="rounded-lg bg-slate-950 p-5 border border-slate-800">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-400">Calculated Entropy</span>
                  <span className="text-2xl font-bold text-white">
                    {entropy.toFixed(1)} <span className="text-sm font-normal text-slate-500">bits</span>
                  </span>
                </div>
                
                <div className="mb-4">
                  <div className="mb-2 flex justify-between text-sm">
                    <span className="text-slate-400">Strength: {strength.label}</span>
                  </div>
                  <div className={`h-2 w-full overflow-hidden rounded-full ${strength.bgClass}`}>
                    <div
                      className={`h-full transition-all duration-500 ${strength.progressColor}`}
                      style={{ width: `${Math.min((entropy / 128) * 100, 100)}%` }}
                    />
                  </div>
                </div>

                <div className={cn("rounded-lg border p-3 flex items-start gap-3", strength.colorClass)}>
                  {strength.score >= 3 ? (
                    <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" />
                  ) : (
                    <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                  )}
                  <p className="text-sm">
                    {strength.score >= 3
                      ? "This password has high entropy, making it extremely resistant to brute-force guessing attacks."
                      : "This password has low entropy and is vulnerable to targeted guessing or brute-force attacks."}
                  </p>
                </div>
              </div>

              <div className="rounded-lg bg-slate-950 p-5 border border-slate-800">
                <span className="text-sm font-medium text-slate-400 mb-2 block">Total Combinations (Keyspace)</span>
                <span className="text-lg font-mono text-white break-all">
                  {typeof keyspace === 'bigint' ? keyspace.toLocaleString() : '0'}
                </span>
              </div>
              
              <div className="rounded-lg border border-slate-800 bg-slate-900 p-5">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-white">
                  <Info className="h-4 w-4 text-teal-500" />
                  How is this calculated?
                </h3>
                <div className="space-y-3 text-sm text-slate-400">
                  <p>
                    Information entropy measures the unpredictability of a password. It is calculated using the formula:
                  </p>
                  <div className="rounded bg-slate-950 p-3 text-center font-mono text-teal-400 border border-slate-800">
                    E = L × log₂(N)
                  </div>
                  <ul className="list-disc space-y-1 pl-5">
                    <li><strong>E</strong> = Entropy in bits</li>
                    <li><strong>L</strong> = Length of the password ({length})</li>
                    <li><strong>N</strong> = Size of the character pool ({activeCharsetSize})</li>
                  </ul>
                  <p className="mt-2 text-xs">
                    * This calculation assumes the password was generated completely at random. Predictable patterns or dictionary words significantly reduce actual real-world entropy.
                  </p>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
