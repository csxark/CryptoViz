"use client";

import { useState, useMemo } from "react";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import {
  PipelineStage,
  PIPELINE_PRESETS,
  executePipeline,
  exportPipelineToJson,
  importPipelineFromJson,
  StageCategory,
} from "@/lib/pipeline/pipelineEngine";
import {
  Plus,
  Trash2,
  ArrowDown,
  ArrowUp,
  Play,
  Copy,
  Check,
  Download,
  Upload,
  Layers,
  Sparkles,
  RefreshCw,
  Code,
  ShieldCheck,
  Zap,
} from "lucide-react";

const AVAILABLE_ALGORITHMS: Array<{
  category: StageCategory;
  algorithm: string;
  name: string;
  defaultParams: Record<string, string>;
  paramSchema?: Array<{ key: string; label: string; placeholder: string }>;
}> = [
  {
    category: "encode",
    algorithm: "base64-encode",
    name: "Base64 Encode",
    defaultParams: {},
  },
  {
    category: "decode",
    algorithm: "base64-decode",
    name: "Base64 Decode",
    defaultParams: {},
  },
  {
    category: "encode",
    algorithm: "hex-encode",
    name: "Hex Encode",
    defaultParams: {},
  },
  {
    category: "decode",
    algorithm: "hex-decode",
    name: "Hex Decode",
    defaultParams: {},
  },
  {
    category: "encrypt",
    algorithm: "caesar",
    name: "Caesar Encrypt",
    defaultParams: { shift: "3" },
    paramSchema: [
      { key: "shift", label: "Shift Amount (1–25)", placeholder: "3" },
    ],
  },
  {
    category: "encrypt",
    algorithm: "caesar-decrypt",
    name: "Caesar Decrypt",
    defaultParams: { shift: "3" },
    paramSchema: [
      { key: "shift", label: "Shift Amount (1–25)", placeholder: "3" },
    ],
  },
  {
    category: "encrypt",
    algorithm: "atbash",
    name: "Atbash Cipher",
    defaultParams: {},
  },
  {
    category: "hash",
    algorithm: "sha256",
    name: "SHA-256 Digest",
    defaultParams: {},
  },
  {
    category: "sign",
    algorithm: "rsa-sign",
    name: "RSA Digital Signature",
    defaultParams: { key: "priv-key-2048" },
    paramSchema: [
      {
        key: "key",
        label: "Signing Key Identifier",
        placeholder: "priv-key-2048",
      },
    ],
  },
  {
    category: "verify",
    algorithm: "rsa-verify",
    name: "RSA Verify Signature",
    defaultParams: { key: "pub-key-2048" },
    paramSchema: [
      {
        key: "key",
        label: "Verification Key Identifier",
        placeholder: "pub-key-2048",
      },
    ],
  },
];

const CATEGORY_BADGES: Record<
  StageCategory,
  { bg: string; text: string; label: string }
> = {
  encode: {
    bg: "bg-blue-500/10 border-blue-500/30",
    text: "text-blue-600 dark:text-blue-400",
    label: "ENCODE",
  },
  decode: {
    bg: "bg-indigo-500/10 border-indigo-500/30",
    text: "text-indigo-600 dark:text-indigo-400",
    label: "DECODE",
  },
  encrypt: {
    bg: "bg-teal-500/10 border-teal-500/30",
    text: "text-teal-600 dark:text-teal-400",
    label: "ENCRYPT",
  },
  hash: {
    bg: "bg-purple-500/10 border-purple-500/30",
    text: "text-purple-600 dark:text-purple-400",
    label: "HASH",
  },
  sign: {
    bg: "bg-amber-500/10 border-amber-500/30",
    text: "text-amber-600 dark:text-amber-400",
    label: "SIGN",
  },
  verify: {
    bg: "bg-emerald-500/10 border-emerald-500/30",
    text: "text-emerald-600 dark:text-emerald-400",
    label: "VERIFY",
  },
};

export default function CipherPipelineBuilder() {
  const [inputText, setInputText] = useState<string>(
    "CryptoViz Secure Message 2026",
  );
  const [stages, setStages] = useState<PipelineStage[]>([
    {
      id: "stg-1",
      category: "encode",
      algorithm: "base64-encode",
      name: "Base64 Encode",
      params: {},
    },
    {
      id: "stg-2",
      category: "encrypt",
      algorithm: "caesar",
      name: "Caesar Encrypt",
      params: { shift: "5" },
    },
    {
      id: "stg-3",
      category: "hash",
      algorithm: "sha256",
      name: "SHA-256 Digest",
      params: {},
    },
  ]);
  const [copied, setCopied] = useState<boolean>(false);
  const [importJsonInput, setImportJsonInput] = useState<string>("");
  const [showImportModal, setShowImportModal] = useState(false);

  const importModalRef = useFocusTrap({
    enabled: showImportModal,
    onEscape: () => {
      setShowImportModal(false);
      setImportError(null);
    },
  });
  const [importError, setImportError] = useState<string | null>(null);

  const result = useMemo(
    () => executePipeline(inputText, stages),
    [inputText, stages],
  );

  const addStage = (algChoice: (typeof AVAILABLE_ALGORITHMS)[number]) => {
    const newStage: PipelineStage = {
      id: `stg-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      category: algChoice.category,
      algorithm: algChoice.algorithm,
      name: algChoice.name,
      params: { ...algChoice.defaultParams },
    };
    setStages((prev) => [...prev, newStage]);
  };

  const removeStage = (id: string) => {
    setStages((prev) => prev.filter((s) => s.id !== id));
  };

  const moveStage = (index: number, direction: "up" | "down") => {
    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === stages.length - 1)
    ) {
      return;
    }
    const newIndex = direction === "up" ? index - 1 : index + 1;
    setStages((prev) => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[newIndex];
      copy[newIndex] = temp;
      return copy;
    });
  };

  const updateParam = (stageId: string, paramKey: string, value: string) => {
    setStages((prev) =>
      prev.map((stg) =>
        stg.id === stageId
          ? { ...stg, params: { ...stg.params, [paramKey]: value } }
          : stg,
      ),
    );
  };

  const loadPreset = (presetId: string) => {
    const found = PIPELINE_PRESETS.find((p) => p.id === presetId);
    if (!found) return;
    setStages(
      found.stages.map((stg, idx) => ({
        ...stg,
        id: `preset-stg-${Date.now()}-${idx}`,
      })),
    );
  };

  const handleCopyExport = () => {
    const jsonStr = exportPipelineToJson(stages);
    navigator.clipboard.writeText(jsonStr);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleImportSubmit = () => {
    try {
      setImportError(null);
      const importedStages = importPipelineFromJson(importJsonInput);
      setStages(importedStages);
      setShowImportModal(false);
      setImportJsonInput("");
    } catch (err: any) {
      setImportError(err.message || "Invalid JSON format");
    }
  };

  return (
    <div className="space-y-8">
      {/* ── Hero Section ── */}
      <section className="relative overflow-hidden rounded-3xl border border-zinc-200/80 dark:border-zinc-800/80 bg-gradient-to-br from-purple-500/10 via-teal-500/5 to-transparent p-8 sm:p-12 backdrop-blur-2xl">
        <div className="max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/10 px-3.5 py-1 text-xs font-bold text-purple-600 dark:text-purple-400">
            <Zap className="h-3.5 w-3.5" />
            WORKFLOW ORCHESTRATION ENGINE
          </div>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-zinc-900 dark:text-white">
            Cipher <span className="text-purple-500">Pipeline Builder</span>
          </h1>
          <p className="text-base sm:text-lg text-zinc-600 dark:text-zinc-300 leading-relaxed max-w-2xl">
            Chain multiple cryptographic transformations together (Encode →
            Encrypt → Hash → Sign → Verify) to build, simulate, and analyze
            complete end-to-end security protocols in real time.
          </p>

          {/* Action Bar */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={handleCopyExport}
              className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2 text-xs font-bold text-white shadow-lg hover:bg-purple-500 transition-colors"
            >
              {copied ? (
                <Check className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              {copied ? "Copied JSON!" : "Export Pipeline JSON"}
            </button>
            <button
              onClick={() => setShowImportModal(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white/80 dark:bg-zinc-800/80 px-4 py-2 text-xs font-bold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
            >
              <Upload className="h-4 w-4" />
              Import Pipeline
            </button>
          </div>
        </div>
      </section>

      {/* ── Control Row: Input & Presets ── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Initial Input */}
        <div className="lg:col-span-2 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 p-6 shadow-sm backdrop-blur-xl space-y-3">
          <label className="text-xs font-bold tracking-wider text-zinc-500 dark:text-zinc-400 uppercase">
            Initial Pipeline Payload (Plaintext)
          </label>
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            rows={3}
            placeholder="Type payload message to pass through pipeline..."
            className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 p-3 font-mono text-sm text-zinc-900 dark:text-white focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 transition-colors"
          />
        </div>

        {/* Quick Presets */}
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 p-6 shadow-sm backdrop-blur-xl space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold tracking-wider text-zinc-500 dark:text-zinc-400 uppercase">
              Load Preset Workflows
            </span>
            <Sparkles className="h-4 w-4 text-purple-500" />
          </div>
          <div className="space-y-2">
            {PIPELINE_PRESETS.map((preset) => (
              <button
                key={preset.id}
                onClick={() => loadPreset(preset.id)}
                className="w-full text-left rounded-xl border border-zinc-200/60 dark:border-zinc-800/60 bg-zinc-50 dark:bg-zinc-800/40 p-3 text-xs font-semibold text-zinc-800 dark:text-zinc-200 hover:border-purple-500/50 hover:bg-purple-500/10 transition-all"
              >
                <div className="font-bold text-zinc-900 dark:text-white">
                  {preset.name}
                </div>
                <div className="mt-0.5 text-[11px] font-normal text-zinc-500 dark:text-zinc-400 line-clamp-1">
                  {preset.description}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Main Workspace: Pipeline Stages & Add Menu ── */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Left Column: Stages Sequence */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              <Layers className="h-5 w-5 text-purple-500" />
              Pipeline Execution Flow ({stages.length} Stages)
            </h2>
            {stages.length > 0 && (
              <button
                onClick={() => setStages([])}
                className="text-xs font-semibold text-red-500 hover:underline"
              >
                Clear All Stages
              </button>
            )}
          </div>

          {stages.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-800 p-12 text-center">
              <Code className="mx-auto h-8 w-8 text-zinc-400 mb-2" />
              <p className="text-zinc-500 dark:text-zinc-400 font-medium text-sm">
                Your pipeline is currently empty. Add stages from the right
                panel or load a preset above.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {stages.map((stage, idx) => {
                const badge = CATEGORY_BADGES[stage.category];
                const stageExec = result.stageResults.find(
                  (r) => r.stageId === stage.id,
                );
                const algInfo = AVAILABLE_ALGORITHMS.find(
                  (a) => a.algorithm === stage.algorithm,
                );

                return (
                  <div
                    key={stage.id}
                    className="relative rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-sm space-y-4 backdrop-blur-xl"
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-purple-500/10 font-mono text-xs font-bold text-purple-600 dark:text-purple-400">
                          {idx + 1}
                        </span>
                        <span
                          className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${badge.bg} ${badge.text}`}
                        >
                          {badge.label}
                        </span>
                        <h3 className="font-bold text-zinc-900 dark:text-white text-base">
                          {stage.name}
                        </h3>
                      </div>

                      {/* Reorder / Delete Controls */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => moveStage(idx, "up")}
                          disabled={idx === 0}
                          className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-30"
                          aria-label="Move stage up"
                        >
                          <ArrowUp className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => moveStage(idx, "down")}
                          disabled={idx === stages.length - 1}
                          className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-30"
                          aria-label="Move stage down"
                        >
                          <ArrowDown className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => removeStage(stage.id)}
                          className="rounded-lg p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
                          aria-label="Remove stage"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {/* Parameter inputs if schema exists */}
                    {algInfo?.paramSchema && algInfo.paramSchema.length > 0 && (
                      <div className="flex flex-wrap gap-4 border-t border-zinc-100 dark:border-zinc-800/80 pt-3">
                        {algInfo.paramSchema.map((schema) => (
                          <div
                            key={schema.key}
                            className="flex items-center gap-2 text-xs"
                          >
                            <label className="font-medium text-zinc-600 dark:text-zinc-400">
                              {schema.label}:
                            </label>
                            <input
                              type="text"
                              value={stage.params[schema.key] ?? ""}
                              onChange={(e) =>
                                updateParam(
                                  stage.id,
                                  schema.key,
                                  e.target.value,
                                )
                              }
                              placeholder={schema.placeholder}
                              className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-2.5 py-1 text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                            />
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Stage Preview Output */}
                    {stageExec && (
                      <div className="rounded-xl bg-zinc-50 dark:bg-zinc-950/70 p-3 space-y-1 font-mono text-xs">
                        <div className="text-zinc-400 text-[10px] uppercase font-bold flex justify-between">
                          <span>Output Data</span>
                          <span>{stageExec.durationMs}ms</span>
                        </div>
                        <div className="text-teal-600 dark:text-teal-400 break-all">
                          {stageExec.error ? (
                            <span className="text-red-500 font-sans font-semibold">
                              Error: {stageExec.error}
                            </span>
                          ) : (
                            stageExec.output
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Palette & Final Output */}
        <div className="space-y-6">
          {/* Add Stage Palette */}
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 p-6 shadow-sm backdrop-blur-xl space-y-4">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white uppercase tracking-wider">
              Add Transformation Stage
            </h3>
            <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
              {AVAILABLE_ALGORITHMS.map((alg) => {
                const badge = CATEGORY_BADGES[alg.category];
                return (
                  <button
                    key={alg.algorithm}
                    onClick={() => addStage(alg)}
                    className="w-full flex items-center justify-between rounded-xl border border-zinc-200/60 dark:border-zinc-800/60 bg-zinc-50 dark:bg-zinc-800/40 p-3 text-left hover:border-purple-500/50 hover:bg-purple-500/10 transition-all"
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`rounded-md border px-2 py-0.5 text-[9px] font-bold ${badge.bg} ${badge.text}`}
                      >
                        {badge.label}
                      </span>
                      <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                        {alg.name}
                      </span>
                    </div>
                    <Plus className="h-4 w-4 text-purple-500" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Final Result Card */}
          <div className="rounded-2xl border border-purple-500/30 bg-purple-500/5 p-6 shadow-lg backdrop-blur-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold tracking-wider text-purple-600 dark:text-purple-400 uppercase flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4" /> Final Pipeline Output
              </span>
              <span className="text-xs font-mono font-bold text-zinc-500 dark:text-zinc-400">
                {result.totalDurationMs} ms
              </span>
            </div>

            <div className="rounded-xl border border-purple-500/20 bg-white dark:bg-zinc-950 p-4 font-mono text-xs text-purple-700 dark:text-purple-300 break-all leading-relaxed min-h-[80px]">
              {result.finalOutput || "(No output produced)"}
            </div>
          </div>
        </div>
      </div>

      {/* ── Import Modal ── */}
      {showImportModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          role="presentation"
        >
          <div
            ref={importModalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="import-pipeline-dialog-title"
            aria-describedby="import-pipeline-dialog-description"
            tabIndex={-1}
            className="w-full max-w-lg rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-2xl space-y-4"
          >
            <h3
              id="import-pipeline-dialog-title"
              className="text-lg font-bold text-zinc-900 dark:text-white"
            >
              Import Pipeline Configuration
            </h3>

            <p
              id="import-pipeline-dialog-description"
              className="text-xs text-zinc-500 dark:text-zinc-400"
            >
              Paste a previously exported pipeline JSON object below to restore
              stage sequence.
            </p>

            <textarea
              value={importJsonInput}
              onChange={(event) => setImportJsonInput(event.target.value)}
              rows={6}
              placeholder={`{
  "version": "1.0",
  "stages": [...]
}`}
              className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 p-3 font-mono text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
            />

            {importError && (
              <p role="alert" className="text-xs font-bold text-red-500">
                {importError}
              </p>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowImportModal(false);
                  setImportError(null);
                }}
                className="rounded-xl border border-zinc-300 dark:border-zinc-700 px-4 py-2 text-xs font-bold text-zinc-600 dark:text-zinc-400"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleImportSubmit}
                className="rounded-xl bg-purple-600 px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-purple-500"
              >
                Load Stages
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
