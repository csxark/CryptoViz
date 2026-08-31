"use client";

import { useState } from "react";
import type { BenchmarkSession } from "@/types/benchmark";
import {
  exportSessionComparisonJSON,
  exportSessionComparisonCSV,
} from "@/lib/utils/sessionComparison";
import { reviveBenchmarkSession } from "@/lib/utils/dateReviver";
import { Download, Upload, FileCode, FileSpreadsheet, Check, AlertCircle } from "lucide-react";

interface SessionExportImportProps {
  sessionA: BenchmarkSession;
  sessionB: BenchmarkSession;
  onImportSession?: (session: BenchmarkSession) => void;
}

export default function SessionExportImport({
  sessionA,
  sessionB,
  onImportSession,
}: SessionExportImportProps) {
  const [copiedFormat, setCopiedFormat] = useState<"json" | "csv" | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);

  const downloadFile = (content: string, filename: string, mime: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportJSON = () => {
    const json = exportSessionComparisonJSON(sessionA, sessionB);
    downloadFile(
      json,
      `cryptoviz-benchmark-comparison-${Date.now()}.json`,
      "application/json",
    );
    setCopiedFormat("json");
    setTimeout(() => setCopiedFormat(null), 2000);
  };

  const handleExportCSV = () => {
    const csv = exportSessionComparisonCSV(sessionA, sessionB);
    downloadFile(
      csv,
      `cryptoviz-benchmark-comparison-${Date.now()}.csv`,
      "text/csv",
    );
    setCopiedFormat("csv");
    setTimeout(() => setCopiedFormat(null), 2000);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportError(null);
    setImportSuccess(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);

        // Check if file is a direct BenchmarkSession or exported session report
        let importedSession: BenchmarkSession | null = null;

        if (parsed.id && Array.isArray(parsed.results)) {
          importedSession = parsed as BenchmarkSession;
        } else if (parsed.sessionB && Array.isArray(parsed.sessionB.results)) {
          importedSession = parsed.sessionB as BenchmarkSession;
        }

        if (!importedSession) {
          throw new Error("Invalid session format. Missing session ID or results array.");
        }

        importedSession = reviveBenchmarkSession(importedSession);

        if (onImportSession) {
          onImportSession(importedSession);
          setImportSuccess(`Successfully imported session (${importedSession.results.length} ciphers).`);
        }
      } catch (err: unknown) {
        setImportError(err instanceof Error ? err.message : "Failed to parse benchmark session JSON file.");
      }
    };

    reader.readAsText(file);
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center gap-2">
        <Download className="h-4 w-4 text-teal-600 dark:text-teal-400" />
        <span className="text-xs font-semibold text-zinc-900 dark:text-white">
          Export / Import Benchmark Comparison Report
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handleExportJSON}
          className="flex items-center gap-1.5 rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          {copiedFormat === "json" ? (
            <Check className="h-3.5 w-3.5 text-emerald-500" />
          ) : (
            <FileCode className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
          )}
          <span>Export JSON</span>
        </button>

        <button
          type="button"
          onClick={handleExportCSV}
          className="flex items-center gap-1.5 rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          {copiedFormat === "csv" ? (
            <Check className="h-3.5 w-3.5 text-emerald-500" />
          ) : (
            <FileSpreadsheet className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
          )}
          <span>Export CSV</span>
        </button>

        {onImportSession && (
          <label className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-teal-700 dark:bg-teal-500 dark:hover:bg-teal-600">
            <Upload className="h-3.5 w-3.5" />
            <span>Import Session JSON</span>
            <input
              type="file"
              accept=".json"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        )}
      </div>

      {importError && (
        <div className="w-full flex items-center gap-1.5 rounded-lg bg-rose-50 p-2 text-xs text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>{importError}</span>
        </div>
      )}

      {importSuccess && (
        <div className="w-full flex items-center gap-1.5 rounded-lg bg-emerald-50 p-2 text-xs text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
          <Check className="h-3.5 w-3.5 shrink-0" />
          <span>{importSuccess}</span>
        </div>
      )}
    </div>
  );
}
