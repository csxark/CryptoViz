"use client";

import { useState } from "react";
import { 
  calculateShannonEntropy, 
  calculateMinEntropy, 
  calculateUnicityDistance 
} from "../../lib/utils/entropy";

export default function ShannonEntropyWorkbench() {
  const [activeTab, setActiveTab] = useState<"secrecy" | "unicity" | "spectrum">("secrecy");

  // Secrecy tab states
  const [keySpaceSize, setKeySpaceSize] = useState<number>(2); // 2 keys vs 2 messages
  const [msgSpaceSize, setMsgSpaceSize] = useState<number>(2);

  // Unicity Distance states
  const [cipherType, setCipherType] = useState<"caesar" | "substitution" | "vigenere" | "otp">("caesar");
  const [customKeyBits, setCustomKeyBits] = useState<number>(12);
  const [redundancy, setRedundancy] = useState<number>(3.2); // English redundancy bits/char approx

  const getKeyEntropy = () => {
    switch (cipherType) {
      case "caesar": return Math.log2(25);
      case "substitution": return Math.log2(26); // roughly 88.4 bits
      case "vigenere": return 128;
      case "otp": return customKeyBits;
    }
  };

  const unicity = cipherType === "otp" ? Infinity : calculateUnicityDistance(getKeyEntropy(), redundancy);

  return (
    <div className="flex flex-col gap-6">
      {/* Navigation Tabs */}
      <div className="flex rounded-lg bg-zinc-100 p-1 dark:bg-zinc-800">
        <button
          onClick={() => setActiveTab("secrecy")}
          className={`flex-1 rounded-md py-2 text-xs font-semibold transition-all ${
            activeTab === "secrecy" ? "bg-white text-zinc-950 shadow dark:bg-zinc-900 dark:text-white" : "text-zinc-500"
          }`}
        >
          Perfect Secrecy Proof
        </button>
        <button
          onClick={() => setActiveTab("unicity")}
          className={`flex-1 rounded-md py-2 text-xs font-semibold transition-all ${
            activeTab === "unicity" ? "bg-white text-zinc-950 shadow dark:bg-zinc-900 dark:text-white" : "text-zinc-500"
          }`}
        >
          Unicity Distance Calculator
        </button>
        <button
          onClick={() => setActiveTab("spectrum")}
          className={`flex-1 rounded-md py-2 text-xs font-semibold transition-all ${
            activeTab === "spectrum" ? "bg-white text-zinc-950 shadow dark:bg-zinc-900 dark:text-white" : "text-zinc-500"
          }`}
        >
          Shannon vs. Min-Entropy
        </button>
      </div>

      {/* Tab 1: Perfect Secrecy */}
      {activeTab === "secrecy" && (
        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Shannon&apos;s Perfect Secrecy Theorem</h2>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            A cryptosystem has perfect secrecy if the posterior probability equals the prior probability: 
            $P(M=m | C=c) = P(M=m)$. This requires key space $|K| \geq |M|$.
          </p>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Message Space Size (|M|): {msgSpaceSize}</label>
              <input 
                type="range" min="2" max="8" value={msgSpaceSize} 
                onChange={(e) => setMsgSpaceSize(Number(e.target.value))}
                className="accent-teal-600"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Key Space Size (|K|): {keySpaceSize}</label>
              <input 
                type="range" min="1" max="8" value={keySpaceSize} 
                onChange={(e) => setKeySpaceSize(Number(e.target.value))}
                className="accent-teal-600"
              />
            </div>
          </div>

          <div className={`mt-6 rounded-lg p-4 border ${
            keySpaceSize >= msgSpaceSize 
              ? "border-teal-200 bg-teal-50/50 text-teal-800 dark:border-teal-900 dark:bg-teal-950/20 dark:text-teal-300"
              : "border-amber-200 bg-amber-50/50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/20 dark:text-amber-300"
          }`}>
            <p className="text-xs font-bold">
              {keySpaceSize >= msgSpaceSize 
                ? "✓ Perfect Secrecy Achieved: Ciphertext leaks zero information about the plaintext."
                : "⚠️ Condition Violated: Key space smaller than message space. Perfect secrecy breaks!"}
            </p>
          </div>
        </div>
      )}

      {/* Tab 2: Unicity Distance */}
      {activeTab === "unicity" && (
        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Unicity Distance ($U = \frac&#123;H(K)&#125;&#123;D&#125;$)</h2>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Minimum ciphertext length required to uniquely determine the secret key using language redundancy $D$.
          </p>

          <div className="mt-4 flex gap-2">
            {(["caesar", "substitution", "vigenere", "otp"] as const).map((type) => (
              <button
                key={type}
                onClick={() => setCipherType(type)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold uppercase ${
                  cipherType === type ? "bg-teal-600 text-white" : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                }`}
              >
                {type}
              </button>
            ))}
          </div>

          <div className="mt-6 rounded-lg bg-zinc-50 p-4 border border-zinc-200 dark:bg-zinc-950 dark:border-zinc-800">
            <span className="text-2xs uppercase tracking-wider text-zinc-400">Calculated Unicity Distance</span>
            <div className="mt-1 font-mono text-2xl font-bold text-teal-600 dark:text-teal-400">
              {unicity === Infinity ? "∞ (Unbreakable)" : `${unicity.toFixed(2)} characters`}
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Shannon vs Min-Entropy */}
      {activeTab === "spectrum" && (
        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Shannon Entropy ($H$) vs. Min-Entropy ($H_\infty$)</h2>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Min-entropy measures vulnerability against the worst-case single guess, whereas Shannon entropy measures average uncertainty across all possibilities.
          </p>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Example 1: Uniform Distribution */}
            {(() => {
              const dist = [0.25, 0.25, 0.25, 0.25];
              const h = calculateShannonEntropy(dist);
              const hInf = calculateMinEntropy(dist);
              return (
                <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300">Uniform (e.g., Random Bytes)</h3>
                  <div className="mt-3 flex flex-col gap-1 font-mono text-sm">
                    <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
                      <span>Shannon ($H$):</span>
                      <span className="font-bold text-teal-600 dark:text-teal-400">{h.toFixed(2)} bits</span>
                    </div>
                    <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
                      <span>Min ($H_\infty$):</span>
                      <span className="font-bold text-teal-600 dark:text-teal-400">{hInf.toFixed(2)} bits</span>
                    </div>
                  </div>
                  <p className="mt-3 text-2xs text-zinc-500">Both metrics align because every outcome carries equal weight.</p>
                </div>
              );
            })()}

            {/* Example 2: Skewed Distribution */}
            {(() => {
              const dist = [0.7, 0.2, 0.08, 0.02];
              const h = calculateShannonEntropy(dist);
              const hInf = calculateMinEntropy(dist);
              return (
                <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300">Skewed (e.g., English Letters)</h3>
                  <div className="mt-3 flex flex-col gap-1 font-mono text-sm">
                    <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
                      <span>Shannon ($H$):</span>
                      <span className="font-bold text-teal-600 dark:text-teal-400">{h.toFixed(2)} bits</span>
                    </div>
                    <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
                      <span>Min ($H_\infty$):</span>
                      <span className="font-bold text-amber-600 dark:text-amber-400">{hInf.toFixed(2)} bits</span>
                    </div>
                  </div>
                  <p className="mt-3 text-2xs text-zinc-500">Min-entropy drops lower due to the heavy bias of the most probable outcome ($70\%$ chance).</p>
                </div>
              );
            })()}

            {/* Example 3: Predictable Passwords */}
            {(() => {
              const dist = [0.9, 0.05, 0.03, 0.02];
              const h = calculateShannonEntropy(dist);
              const hInf = calculateMinEntropy(dist);
              return (
                <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300">Predictable (e.g., Bad Passwords)</h3>
                  <div className="mt-3 flex flex-col gap-1 font-mono text-sm">
                    <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
                      <span>Shannon ($H$):</span>
                      <span className="font-bold text-teal-600 dark:text-teal-400">{h.toFixed(2)} bits</span>
                    </div>
                    <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
                      <span>Min ($H_\infty$):</span>
                      <span className="font-bold text-rose-600 dark:text-rose-400">{hInf.toFixed(2)} bits</span>
                    </div>
                  </div>
                  <p className="mt-3 text-2xs text-zinc-500">Extremely low min-entropy exposes systems to fast offline brute-force attacks on common guesses.</p>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
