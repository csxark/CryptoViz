"use client";

import { useState } from "react";
import type { SessionDelta } from "@/lib/utils/sessionComparison";
import { Lightbulb, Cpu, Activity, ShieldCheck, Zap, ChevronDown, ChevronUp } from "lucide-react";

interface EducationalSessionInsightsProps {
  delta: SessionDelta;
}

export default function EducationalSessionInsights({
  delta,
}: EducationalSessionInsightsProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);

  const insights = [
    {
      icon: Zap,
      title: "WebCrypto Hardware Acceleration vs JavaScript Fallback",
      tagline: "Native AES-NI and SHA hardware instructions deliver 5x-20x throughput gains",
      summary:
        "Modern CPUs include dedicated instruction sets like AES-NI and SHA extensions. Browsers expose these via the native WebCrypto API (`window.crypto.subtle`), executing directly in optimized C++/assembly code without JavaScript engine overhead.",
      details: [
        "Pure JS cipher implementations run through V8/JIT interpretation, requiring memory allocation for byte arrays and bitwise operations.",
        "WebCrypto bypasses V8 execution entirely, leveraging CPU SIMD registers and hardware instructions.",
        "When comparing sessions where WebCrypto is enabled versus JS fallback, symmetric ciphers (AES-GCM, AES-CBC) and hashes (SHA-256) experience massive speedups.",
      ],
      color: "teal",
    },
    {
      icon: Activity,
      title: "Algorithmic Complexity & Payload Scaling O(N) vs O(N³)",
      tagline: "Symmetric payload size scales linearly; Asymmetric ciphers scale super-linearly",
      summary:
        "Stream and block ciphers process data block-by-block, making encryption time proportional to message length O(N). In contrast, asymmetric key exchanges (RSA, Diffie-Hellman) perform modular exponentiation on large integers (2048-bit to 4096-bit).",
      details: [
        "Increasing payload size from 1 KB to 64 KB increases AES encryption time ~64x (linear O(N)).",
        "RSA key sizes scale with cubic computational complexity O(N³) during key generation and signing operations.",
        "Hybrid Cryptography: Real-world systems use asymmetric ciphers (RSA/ECC) only to exchange a temporary symmetric key, then encrypt message payloads using symmetric AES-GCM.",
      ],
      color: "blue",
    },
    {
      icon: Cpu,
      title: "Web Worker IPC Serialization & Threading Overhead",
      tagline: "Structured Clone algorithm adds round-trip overhead on micro-benchmarks",
      summary:
        "Offloading cryptography to Web Workers keeps the UI main thread smooth. However, transferring data between threads requires message serialization via the HTML structured clone algorithm.",
      details: [
        "For extremely tiny payloads (e.g. 16-byte Caesar cipher), worker IPC message transfer (0.2 - 0.5 ms RTT) dominates the actual cipher compute duration (0.01 ms).",
        "For heavy workloads (e.g. 1 MB AES or Bcrypt hash iterations), worker threading prevents UI freeze and achieves true multi-core parallel speedups.",
        "ArrayBuffer Transferables allow zero-copy memory transfers between main thread and Web Workers for high-volume benchmarks.",
      ],
      color: "purple",
    },
    {
      icon: ShieldCheck,
      title: "Memory-Hard KDFs vs Fast Cryptographic Hashes",
      tagline: "Bcrypt, Scrypt, and Argon2 deliberate slowdown to defeat GPU brute-force attacks",
      summary:
        "While SHA-256 aims for maximum speed, Key Derivation Functions (KDFs) intentionally consume significant CPU cycles and RAM to resist specialized ASIC/GPU password cracking.",
      details: [
        "Argon2id and Scrypt allocate megabytes of pseudo-random memory vectors, forcing GPU cracking units to stall on memory bandwidth.",
        "Bcrypt cost factors exponentially double compute time for each increment.",
        "In session benchmarks, KDF throughput is measured in tens of operations per second, compared to millions for SHA-256.",
      ],
      color: "amber",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-100 text-teal-600 dark:bg-teal-950/40 dark:text-teal-400">
          <Lightbulb className="h-4.5 w-4.5" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-zinc-900 dark:text-white">
            Educational Insights: Understanding Session Performance Variance
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Cryptographic principles explaining performance deltas between environments and parameters.
          </p>
        </div>
      </div>

      <div className="grid gap-3">
        {insights.map((item, idx) => {
          const Icon = item.icon;
          const isExpanded = expandedIndex === idx;

          return (
            <div
              key={idx}
              className={`rounded-xl border transition-all ${
                isExpanded
                  ? "border-teal-300 bg-white shadow-md dark:border-teal-800 dark:bg-zinc-900"
                  : "border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900/80"
              }`}
            >
              <button
                type="button"
                onClick={() => setExpandedIndex(isExpanded ? null : idx)}
                className="flex w-full items-start justify-between p-4 text-left"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 rounded-lg bg-zinc-100 p-2 text-teal-600 dark:bg-zinc-800 dark:text-teal-400">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-zinc-900 dark:text-white">
                      {item.title}
                    </h4>
                    <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                      {item.tagline}
                    </p>
                  </div>
                </div>
                <div className="text-zinc-400">
                  {isExpanded ? (
                    <ChevronUp className="h-5 w-5" />
                  ) : (
                    <ChevronDown className="h-5 w-5" />
                  )}
                </div>
              </button>

              {isExpanded && (
                <div className="border-t border-zinc-100 px-4 pb-4 pt-3 text-xs dark:border-zinc-800">
                  <p className="leading-relaxed text-zinc-700 dark:text-zinc-300 font-sans">
                    {item.summary}
                  </p>
                  <ul className="mt-3 space-y-1.5 list-disc pl-4 text-zinc-600 dark:text-zinc-400">
                    {item.details.map((detail, dIdx) => (
                      <li key={dIdx} className="leading-relaxed">
                        {detail}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
