"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  BenchmarkResult,
  BenchmarkSession,
  DeviceInfo,
} from "@/types/benchmark";
import { BenchmarkEngine } from "@/lib/utils/benchmark";
import { getDeviceInfo } from "@/lib/utils/deviceInfo";
import { useCipherWorker } from "@/lib/hooks/useCipherWorker";
import {
  addBenchmarkSession,
  loadBenchmarkHistory,
  saveBenchmarkHistory,
} from "@/lib/utils/benchmarkHistory";
import dynamic from 'next/dynamic'
import AlgorithmSelector from "@/components/benchmark/AlgorithmSelector";
import BenchmarkControls from "@/components/benchmark/BenchmarkControls";
import PerformanceMetrics from "@/components/benchmark/PerformanceMetrics";
const ComparisonChart = dynamic(() => import('@/components/benchmark/ComparisonChart'), { 
  ssr: false, 
  loading: () => <div className="h-96 flex items-center justify-center rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"><p className="text-zinc-500 dark:text-zinc-400">Loading chart components...</p></div> 
});
import DeviceInfoDisplay from "@/components/benchmark/DeviceInfoDisplay";
import ExportButton from "@/components/benchmark/ExportButton";
import CategoryTabs from "@/components/benchmark/CategoryTabs";
import BenchmarkHistory from "@/components/benchmark/BenchmarkHistory";
import Navbar from "@/components/layout/Navbar";
import { CIPHER_REGISTRY } from "@/lib/cipher/registry";

type Category = "all" | "classical" | "symmetric" | "asymmetric" | "hash";
const average = (values: number[]) =>
  values.length
    ? values.reduce((sum, value) => sum + value, 0) / values.length
    : 0;

const getBenchmarkParams = (
  cipherId: string,
  category: string,
  inputSize: number,
  defaultKey: string,
): { input: string; key: string; options: Record<string, unknown> } => {
  const input = BenchmarkEngine.generateInput(inputSize);
  let key = "";
  let options: Record<string, unknown> = {};

  switch (cipherId) {
    case "otp":
      key = BenchmarkEngine.generateInput(inputSize);
      break;
    case "caesar":
      key = Math.floor(Math.random() * 25 + 1).toString();
      break;
    case "railfence":
      key = Math.floor(Math.random() * 8 + 3).toString();
      break;
    case "rot13":
      key = "";
      break;
    case "aes":
      key = BenchmarkEngine.generateKey(32);
      break;
    case "des":
      key = BenchmarkEngine.generateKey(16);
      break;
    case "3des":
      key = BenchmarkEngine.generateKey(32);
      break;
    case "rsa":
    case "dh":
      options = { mode: "real" };
      key = defaultKey;
      break;
    case "ecc":
      key = BenchmarkEngine.generateKey(64);
      break;
    case "bcrypt":
      options = { rounds: 4 };
      key = defaultKey;
      break;
    default:
      key = category === "hash" ? "" : defaultKey;
  }

  return { input, key, options };
};

export default function BenchmarkPage() {
  const [selectedAlgorithms, setSelectedAlgorithms] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category>("all");
  const [inputSize, setInputSize] = useState(1024);
  const [iterations, setIterations] = useState(100);
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<BenchmarkResult[]>([]);
  const [session, setSession] = useState<BenchmarkSession | null>(null);
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);
  const [history, setHistory] = useState<BenchmarkSession[]>([]);
  const [selectedHistoryIds, setSelectedHistoryIds] = useState<string[]>([]);
  const [chartType, setChartType] = useState<"bar" | "line" | "scatter">("bar");
  const [error, setError] = useState<string | null>(null);
  const [progressMessage, setProgressMessage] = useState("");
  const { runCipher } = useCipherWorker();

  useEffect(() => {
    setDeviceInfo(getDeviceInfo());
    setHistory(loadBenchmarkHistory());
  }, []);

  const handleCategoryChange = useCallback((category: Category) => {
    setSelectedCategory(category);
    const filtered = CIPHER_REGISTRY.filter(
      (cipher) => category === "all" || cipher.category === category,
    );
    setSelectedAlgorithms(filtered.map((cipher) => cipher.id).slice(0, 3));
  }, []);

  const storeSession = useCallback((completedSession: BenchmarkSession) => {
    setSession(completedSession);
    setHistory((current) => {
      const next = addBenchmarkSession(current, completedSession);
      saveBenchmarkHistory(next);
      return next;
    });
  }, []);

  const handleBenchmarkStart = useCallback(async () => {
    if (!selectedAlgorithms.length) {
      setError("Please select at least one algorithm to benchmark");
      return;
    }

    setIsRunning(true);
    setError(null);
    setResults([]);
    setProgressMessage("");

    try {
      const benchmarkResults: BenchmarkResult[] = [];

      for (let index = 0; index < selectedAlgorithms.length; index += 1) {
        const cipherId = selectedAlgorithms[index];
        const cipherDef = CIPHER_REGISTRY.find(
          (cipher) => cipher.id === cipherId,
        );
        if (!cipherDef) continue;

        setProgressMessage(
          `Benchmarking ${index + 1}/${selectedAlgorithms.length}: ${cipherDef.name}...`,
        );

        const cipherMeasurements: number[] = [];
        const workerMeasurements: number[] = [];
        const { input, key, options } = getBenchmarkParams(
          cipherId,
          cipherDef.category,
          inputSize,
          cipherDef.defaultKey,
        );

        try {
          await runCipher("encrypt", cipherId, input, key, {
            ...options,
            bypassCache: true,
          });
        } catch {
          // Warm-up failures are handled by the measured iterations.
        }

        for (let iteration = 0; iteration < iterations; iteration += 1) {
          const workerStart = performance.now();

          try {
            const result = await runCipher("encrypt", cipherId, input, key, {
              ...options,
              bypassCache: true,
            });
            const workerDuration = performance.now() - workerStart;

            cipherMeasurements.push(BenchmarkEngine.measureCipherTime(result));
            workerMeasurements.push(workerDuration);
          } catch (iterationError) {
            console.error(
              `Iteration ${iteration + 1} failed for ${cipherId}:`,
              iterationError,
            );
          }
        }

        if (cipherMeasurements.length) {
          benchmarkResults.push({
            ...BenchmarkEngine.createBenchmarkResult(
              cipherId,
              cipherMeasurements,
              inputSize,
              cipherMeasurements.length,
            ),
            workerExecutionTime: average(workerMeasurements),
          });
        } else {
          setError(
            (current) =>
              `${current ?? ""}No successful measurements for ${cipherDef.name}. `,
          );
        }

        await new Promise((resolve) => setTimeout(resolve, 200));
      }

      const renderStart = performance.now();
      setResults(benchmarkResults);

      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => resolve());
      });

      const renderTime = performance.now() - renderStart;
      const finalResults = benchmarkResults.map((result) => ({
        ...result,
        renderTime,
      }));
      const completedSession: BenchmarkSession = {
        id: `session-${Date.now()}`,
        timestamp: new Date(),
        deviceInfo: deviceInfo ?? getDeviceInfo(),
        results: finalResults,
        inputSize,
        iterations,
        selectedAlgorithms: [...selectedAlgorithms],
      };

      setResults(finalResults);
      storeSession(completedSession);
    } finally {
      setProgressMessage("");
      setIsRunning(false);
    }
  }, [
    deviceInfo,
    inputSize,
    iterations,
    runCipher,
    selectedAlgorithms,
    storeSession,
  ]);

  const clearHistory = () => {
    saveBenchmarkHistory([]);
    setHistory([]);
    setSelectedHistoryIds([]);
  };

  return (
    <div className="min-h-screen bg-zinc-50 font-sans transition-colors duration-300 dark:bg-zinc-950">
      <Navbar />
      <main className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">
            Performance Benchmark Dashboard
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            Compare cipher time, worker round-trip time, rendering cost, and
            historical sessions.
          </p>
        </header>

        {error && (
          <div
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-900/20 dark:text-red-200"
          >
            {error}
          </div>
        )}
        {progressMessage && (
          <div
            role="status"
            className="rounded-lg border border-teal-200 bg-teal-50 p-4 text-sm text-teal-800 dark:border-teal-900 dark:bg-teal-900/20 dark:text-teal-200"
          >
            {progressMessage}
          </div>
        )}

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-white">
            Algorithm Categories
          </h2>
          <CategoryTabs
            selectedCategory={selectedCategory}
            onCategoryChange={handleCategoryChange}
          />
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-white">
            Select Algorithms to Benchmark
          </h2>
          <AlgorithmSelector
            selectedAlgorithms={selectedAlgorithms}
            onSelectionChange={setSelectedAlgorithms}
            category={selectedCategory === "all" ? null : selectedCategory}
          />
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-white">
            Benchmark Configuration
          </h2>
          <div className="grid gap-6 lg:grid-cols-2">
            <BenchmarkControls
              inputSize={inputSize}
              iterations={iterations}
              isRunning={isRunning}
              onInputSizeChange={setInputSize}
              onIterationsChange={setIterations}
              onBenchmarkStart={handleBenchmarkStart}
            />
            {deviceInfo && (
              <DeviceInfoDisplay
                deviceInfo={session?.deviceInfo ?? deviceInfo}
              />
            )}
          </div>
        </section>

        {results.length > 0 && (
          <>
            <section className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-xl font-semibold text-zinc-900 dark:text-white">
                  Performance Metrics
                </h2>
                <ExportButton results={results} session={session} />
              </div>
              <PerformanceMetrics results={results} />
            </section>

            <section className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-xl font-semibold text-zinc-900 dark:text-white">
                  Performance Visualization
                </h2>
                <div className="flex flex-wrap gap-2">
                  {(["bar", "line", "scatter"] as const).map((type) => (
                    <button
                      type="button"
                      key={type}
                      onClick={() => setChartType(type)}
                      className={`rounded-lg px-4 py-2 text-sm font-medium capitalize ${
                        chartType === type
                          ? "bg-teal-600 text-white"
                          : "border border-zinc-200 text-zinc-700 dark:border-zinc-700 dark:text-zinc-300"
                      }`}
                    >
                      {type} chart
                    </button>
                  ))}
                </div>
              </div>
              <ComparisonChart results={results} chartType={chartType} />
            </section>
          </>
        )}

        {!results.length && !isRunning && (
          <div className="rounded-lg border border-dashed border-zinc-300 p-8 text-center dark:border-zinc-700">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
              Ready to benchmark?
            </h2>
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
              Select algorithms and start a run.
            </p>
          </div>
        )}

        <BenchmarkHistory
          sessions={history}
          selectedIds={selectedHistoryIds}
          onSelectedIdsChange={setSelectedHistoryIds}
          onClear={clearHistory}
        />
      </main>
    </div>
  );
}
