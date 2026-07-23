"use client";

import React, { useState } from "react";
import { runCipherIntegrationTests, TestSuiteSummary } from "@/lib/utils/cipherTestRunner";
import { useCipherWorker } from "@/lib/hooks/useCipherWorker";

export const CipherIntegrationDashboard: React.FC = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, name: "" });
  const [summary, setSummary] = useState<TestSuiteSummary | null>(null);
  const { runCipher } = useCipherWorker();

  const handleStartTests = async () => {
    setIsRunning(true);
    setSummary(null);

    // Pass executeCipherFn first, then progress callback second
    const testSummary = await runCipherIntegrationTests(
      async (action, cipherId, input, key) => {
        return await runCipher(action, cipherId, input, key, { bypassCache: true });
      },
      (current, total, name) => {
        setProgress({ current, total, name });
      }
    );

    setSummary(testSummary);
    setIsRunning(false);
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-6xl mx-auto p-4">
      {/* Test Execution Control Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white">
            Integration Test Runner
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Execute automated end-to-end encrypt/decrypt round-trip verification across all registered ciphers.
          </p>
        </div>
        <button
          onClick={handleStartTests}
          disabled={isRunning}
          className="px-5 py-2.5 bg-teal-600 hover:bg-teal-500 disabled:bg-zinc-300 dark:disabled:bg-zinc-800 text-white font-medium text-sm rounded-lg transition-all"
        >
          {isRunning ? "Executing Test Suite..." : "Run All Integration Tests"}
        </button>
      </div>

      {/* Progress Indicator */}
      {isRunning && (
        <div className="p-4 rounded-xl border border-teal-200 dark:border-teal-900 bg-teal-50 dark:bg-teal-950/30 flex flex-col gap-2">
          <div className="flex justify-between text-xs font-semibold text-teal-800 dark:text-teal-200">
            <span>Testing: {progress.name}</span>
            <span>{progress.current} / {progress.total}</span>
          </div>
          <div className="w-full h-2 bg-teal-200 dark:bg-teal-900 rounded-full overflow-hidden">
            <div
              className="h-full bg-teal-600 transition-all duration-200"
              style={{ width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%` }}
            />
          </div>
        </div>
      )}

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
            <span className="text-xs text-zinc-500 dark:text-zinc-400">Total Ciphers</span>
            <p className="text-2xl font-bold text-zinc-900 dark:text-white mt-1">{summary.total}</p>
          </div>
          <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50/50 dark:bg-emerald-950/20">
            <span className="text-xs text-emerald-600 dark:text-emerald-400">Passed</span>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{summary.passed}</p>
          </div>
          <div className="p-4 rounded-xl border border-red-200 dark:border-red-900 bg-red-50/50 dark:bg-red-950/20">
            <span className="text-xs text-red-600 dark:text-red-400">Failed</span>
            <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">{summary.failed}</p>
          </div>
          <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
            <span className="text-xs text-zinc-500 dark:text-zinc-400">Total Duration</span>
            <p className="text-2xl font-bold text-teal-600 dark:text-teal-400 mt-1">{summary.durationMs} ms</p>
          </div>
        </div>
      )}

      {/* Test Results Table */}
      {summary && (
        <div className="p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="text-zinc-500 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-800">
                <th className="pb-2">Cipher</th>
                <th className="pb-2">Category</th>
                <th className="pb-2">Status</th>
                <th className="pb-2">Round-Trip</th>
                <th className="pb-2">Latency</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {summary.results.map((res) => (
                <tr key={res.cipherId} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30">
                  <td className="py-3 font-bold text-zinc-900 dark:text-zinc-100">{res.cipherName}</td>
                  <td className="py-3 uppercase text-zinc-500 dark:text-zinc-400">{res.category}</td>
                  <td className="py-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        res.status === "passed"
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
                          : "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300"
                      }`}
                    >
                      {res.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="py-3">
                    {res.roundTripSuccess ? (
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold">✓ Verified</span>
                    ) : (
                      <span className="text-red-600 dark:text-red-400 font-semibold">✗ Failed</span>
                    )}
                  </td>
                  <td className="py-3 text-zinc-600 dark:text-zinc-400">{res.durationMs} ms</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
