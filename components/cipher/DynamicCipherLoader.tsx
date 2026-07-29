"use client";

import { useState, useMemo } from "react";
import {
  DynamicCipherRegistry,
  exportDynamicCipherJSON,
  importDynamicCipherJSON,
  type DynamicCipherDefinition,
  type ModuleLoadMetrics,
} from "@/lib/utils/dynamicCipherLoader";
import ModuleLoadMetricsCard from "./ModuleLoadMetricsCard";
import CustomCipherEditor from "./CustomCipherEditor";
import DynamicCipherPlayground from "./DynamicCipherPlayground";
import { Cpu, Layers, Download, Upload, RefreshCw, Sparkles, Shield, Code, Plus } from "lucide-react";

export default function DynamicCipherLoader() {
  const [ciphers, setCiphers] = useState<DynamicCipherDefinition[]>(() =>
    DynamicCipherRegistry.getCiphers(),
  );
  const [metrics, setMetrics] = useState<ModuleLoadMetrics[]>(() =>
    DynamicCipherRegistry.getMetrics(),
  );
  const [selectedCipherId, setSelectedCipherId] = useState<string>(
    ciphers[0]?.id || "",
  );
  const [activeTab, setActiveTab] = useState<"catalog" | "builder" | "playground" | "telemetry">("catalog");
  const [importError, setImportError] = useState<string | null>(null);

  const selectedCipher = useMemo(
    () => ciphers.find((c) => c.id === selectedCipherId) || ciphers[0],
    [ciphers, selectedCipherId],
  );

  const selectedMetric = useMemo(
    () => metrics.find((m) => m.cipherId === selectedCipherId) || metrics[0],
    [metrics, selectedCipherId],
  );

  const handleLoadCipher = async (cipherId: string) => {
    setSelectedCipherId(cipherId);
    const updatedMetric = await DynamicCipherRegistry.loadCipherDynamically(cipherId);
    setMetrics((prev) =>
      prev.map((m) => (m.cipherId === cipherId ? updatedMetric : m)),
    );
  };

  const handleRegisterCustom = (newCipher: DynamicCipherDefinition) => {
    const updatedList = DynamicCipherRegistry.registerCustomCipher(newCipher);
    setCiphers(updatedList);
    setMetrics(DynamicCipherRegistry.getMetrics());
    setSelectedCipherId(newCipher.id);
  };

  const handleExportJSON = () => {
    if (!selectedCipher) return;
    const json = exportDynamicCipherJSON(selectedCipher);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${selectedCipher.id}-schema.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportError(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const imported = importDynamicCipherJSON(text);
        handleRegisterCustom(imported);
      } catch (err: any) {
        setImportError(err.message || "Failed to import dynamic cipher schema.");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      {/* Header & Sub-Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-100 pb-4 dark:border-zinc-800">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400">
            Runtime Module Extension Framework
          </span>
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
            Dynamic Cipher Loader
          </h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Dynamically load, instantiate, construct, and evaluate custom substitution-permutation and Feistel cipher modules at runtime.
          </p>
        </div>

        <div className="flex flex-wrap gap-1 rounded-xl bg-zinc-100 p-1 dark:bg-zinc-900">
          {[
            { id: "catalog", label: "Module Catalog", icon: Layers },
            { id: "builder", label: "Custom Builder", icon: Sparkles },
            { id: "playground", label: "Live Playground", icon: Cpu },
            { id: "telemetry", label: "Load Telemetry", icon: Code },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                  isActive
                    ? "bg-white text-teal-700 shadow-sm dark:bg-zinc-800 dark:text-teal-300"
                    : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Module Telemetry & Export/Import Toolbar */}
      {selectedMetric && (
        <div className="space-y-4">
          <ModuleLoadMetricsCard metrics={selectedMetric} />

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-100 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/60">
            <div className="flex items-center gap-2">
              <Code className="h-4 w-4 text-teal-600 dark:text-teal-400" />
              <span className="text-xs font-semibold text-zinc-900 dark:text-white">
                Selected Module Schema: <span className="font-mono text-teal-600 dark:text-teal-400">{selectedCipher?.name}</span>
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleExportJSON}
                className="flex items-center gap-1.5 rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                <Download className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
                Export Schema JSON
              </button>

              <label className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-teal-700 dark:bg-teal-500 dark:hover:bg-teal-600">
                <Upload className="h-3.5 w-3.5" />
                Import Schema JSON
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>
      )}

      {importError && (
        <div className="rounded-lg bg-rose-50 p-3 text-xs text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
          {importError}
        </div>
      )}

      {/* Tab Workspaces */}
      {activeTab === "catalog" && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {ciphers.map((c) => {
            const isSelected = selectedCipherId === c.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => handleLoadCipher(c.id)}
                className={`flex flex-col justify-between rounded-xl border p-4 text-left transition-all ${
                  isSelected
                    ? "border-teal-500 bg-teal-50/50 shadow-sm ring-2 ring-teal-500/20 dark:bg-teal-950/30"
                    : "border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="rounded bg-teal-100 px-2 py-0.5 font-mono text-[10px] font-bold text-teal-800 dark:bg-teal-900/40 dark:text-teal-300">
                      {c.cipherType}
                    </span>
                    <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-mono text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                      {c.category}
                    </span>
                  </div>

                  <h4 className="font-semibold text-xs text-zinc-900 dark:text-white line-clamp-1">
                    {c.name}
                  </h4>
                  <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-2">
                    {c.description}
                  </p>
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-zinc-100 pt-2 text-[10px] text-zinc-400 dark:border-zinc-800">
                  <span>Author: {c.author || "CryptoViz Lab"}</span>
                  <span className="font-mono">v{c.version || "1.0.0"}</span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {activeTab === "builder" && (
        <CustomCipherEditor onRegisterCustomCipher={handleRegisterCustom} />
      )}

      {activeTab === "playground" && selectedCipher && (
        <DynamicCipherPlayground cipher={selectedCipher} />
      )}

      {activeTab === "telemetry" && (
        <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-zinc-200 bg-zinc-50 font-semibold text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
              <tr>
                <th className="px-4 py-3">Cipher ID</th>
                <th className="px-4 py-3">Cipher Name</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Init Time</th>
                <th className="px-4 py-3 text-right">Bundle Size</th>
                <th className="px-4 py-3 text-right">RAM Allocation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {metrics.map((m) => (
                <tr key={m.cipherId} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30">
                  <td className="px-4 py-3 font-mono font-semibold text-zinc-900 dark:text-white">
                    {m.cipherId}
                  </td>
                  <td className="px-4 py-3 text-zinc-800 dark:text-zinc-200">{m.cipherName}</td>
                  <td className="px-4 py-3">
                    <span className="rounded bg-emerald-100 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                      {m.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono">{m.initializationTimeMs} ms</td>
                  <td className="px-4 py-3 text-right font-mono">{(m.bundleSizeBytes / 1024).toFixed(1)} KB</td>
                  <td className="px-4 py-3 text-right font-mono">{(m.memoryUsageBytes / 1024).toFixed(1)} KB</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
