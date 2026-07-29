"use client";

import React, { useState } from "react";
import { useCipherWorker } from "@/lib/hooks/useCipherWorker";

interface LogEntry {
  id: string;
  timestamp: string;
  type: "sent" | "received" | "error";
  message: string;
}

export const WorkerCommunicationDashboard: React.FC = () => {
  const { runCipher } = useCipherWorker();
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [latency, setLatency] = useState<number | null>(null);

  const addLog = (type: LogEntry["type"], message: string) => {
    setLogs((prev) => [
      {
        id: Math.random().toString(36).substring(7),
        timestamp: new Date().toLocaleTimeString(),
        type,
        message,
      },
      ...prev,
    ]);
  };

  const handleTestWorker = async () => {
    setIsRunning(true);
    const start = performance.now();
    addLog("sent", "POST message -> Worker: { action: 'encrypt', cipherId: 'caesar', input: 'WORKER TEST' }");

    try {
      const res = await runCipher("encrypt", "caesar", "WORKER TEST", "3", { bypassCache: true });
      const duration = performance.now() - start;
      setLatency(Number(duration.toFixed(2)));

      addLog("received", `RECV message <- Worker: Output: '${res.output}' (${duration.toFixed(2)} ms)`);
    } catch (err: any) {
      addLog("error", `ERROR <- Worker: ${err?.message || "Communication failed"}`);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-5xl mx-auto p-4">
      {/* Action Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white">
            Web Worker Diagnostics
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Test background thread message serialization, round-trip latency, and thread availability.
          </p>
        </div>
        <button
          onClick={handleTestWorker}
          disabled={isRunning}
          className="px-5 py-2.5 bg-teal-600 hover:bg-teal-500 disabled:bg-zinc-300 dark:disabled:bg-zinc-800 text-white font-medium text-sm rounded-lg transition-all"
        >
          {isRunning ? "Testing Worker..." : "Ping Web Worker"}
        </button>
      </div>

      {/* Latency Metric */}
      {latency !== null && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
            <span className="text-xs text-zinc-500 dark:text-zinc-400">Round-Trip Message Latency</span>
            <p className="text-2xl font-bold text-teal-600 dark:text-teal-400 mt-1">{latency} ms</p>
          </div>
          <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
            <span className="text-xs text-zinc-500 dark:text-zinc-400">Thread Status</span>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">Active (Non-Blocking)</p>
          </div>
        </div>
      )}

      {/* Live Log Feed */}
      <div className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-900 text-zinc-100 font-mono text-xs space-y-3">
        <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
          <span className="text-zinc-400 font-bold">Worker Event Log</span>
          <button
            onClick={() => setLogs([])}
            className="text-[10px] text-zinc-500 hover:text-zinc-300 uppercase tracking-wider"
          >
            Clear Console
          </button>
        </div>

        <div className="max-h-64 overflow-y-auto space-y-2">
          {logs.length === 0 ? (
            <p className="text-zinc-600 italic">No events logged yet. Click 'Ping Web Worker' above to begin.</p>
          ) : (
            logs.map((log) => (
              <div key={log.id} className="flex items-start gap-2">
                <span className="text-zinc-500 text-[10px]">{log.timestamp}</span>
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                    log.type === "sent"
                      ? "bg-blue-900/50 text-blue-300"
                      : log.type === "received"
                      ? "bg-emerald-900/50 text-emerald-300"
                      : "bg-red-900/50 text-red-300"
                  }`}
                >
                  {log.type.toUpperCase()}
                </span>
                <span className="text-zinc-300">{log.message}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};