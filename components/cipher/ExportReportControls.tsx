"use client";

import { useState } from "react";
import type { CipherDirection, CipherResult } from "../../lib/cipher/types";
import { createCipherTrace } from "../../lib/utils/cipherTrace";
import { traceToMarkdown } from "../../lib/utils/markdownExport";
import { stepToLatex } from "../../lib/utils/latexExport";
import { citationToBibtex } from "../../lib/utils/citationRegistry";

interface ExportReportControlsProps {
  cipherId: string;
  direction: CipherDirection;
  input: string;
  cipherKey: string;
  options: Record<string, unknown>;
  result: CipherResult | null;
  currentStepIndex: number;
}

export default function ExportReportControls({
  cipherId,
  direction,
  input,
  cipherKey,
  options,
  result,
  currentStepIndex,
}: ExportReportControlsProps) {
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  const showMessage = (msg: string, error = false) => {
    setMessage(msg);
    setIsError(error);
    setTimeout(() => setMessage(null), 3000);
  };

  const handleCopyStepLatex = async () => {
    if (!result || !result.steps || result.steps.length === 0) {
      showMessage("No step available to copy.", true);
      return;
    }
    const step = result.steps[currentStepIndex] || result.steps[0];
    const latex = stepToLatex(step, cipherId);
    try {
      await navigator.clipboard.writeText(latex);
      showMessage("Active step copied to clipboard as LaTeX.");
    } catch {
      showMessage("Failed to copy to clipboard.", true);
    }
  };

  const handleDownloadMarkdown = () => {
    if (!result) return;
    try {
      const trace = createCipherTrace({
        cipherId,
        direction,
        input,
        key: cipherKey,
        options,
        result,
      });
      const md = traceToMarkdown(trace);
      const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;

      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      anchor.download = `cryptoviz-${cipherId}-${direction}-${timestamp}.md`;

      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);

      showMessage("Session Markdown downloaded.");
    } catch {
      showMessage("Failed to generate Markdown export.", true);
    }
  };

  const handleCopyBibtex = async () => {
    if (!result) return;
    const bibtex = citationToBibtex(cipherId, result.metadata);
    if (!bibtex) {
      showMessage("No citation available for this cipher.", true);
      return;
    }
    try {
      await navigator.clipboard.writeText(bibtex);
      showMessage("BibTeX citation copied to clipboard.");
    } catch {
      showMessage("Failed to copy to clipboard.", true);
    }
  };

  const hasCitation = result ? !!citationToBibtex(cipherId, result.metadata) : false;

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-indigo-100 bg-indigo-50/50 p-3 shadow-sm dark:border-indigo-900/50 dark:bg-indigo-950/20">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleCopyStepLatex}
          disabled={!result || !result.steps?.length}
          className="rounded-lg border border-indigo-300 bg-white px-3 py-2 text-xs font-semibold text-indigo-700 transition-colors hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300 dark:hover:bg-indigo-900/60"
        >
          Copy Step as LaTeX
        </button>

        <button
          type="button"
          onClick={handleDownloadMarkdown}
          disabled={!result}
          className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-indigo-500 dark:hover:bg-indigo-400"
        >
          Download Session (Markdown)
        </button>

        {hasCitation && (
          <button
            type="button"
            onClick={handleCopyBibtex}
            disabled={!result}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            Copy BibTeX
          </button>
        )}
      </div>

      <p className="text-2xs text-zinc-500 dark:text-zinc-400">
        Generate academic representations of the cipher execution trace.
      </p>

      {message && (
        <p
          role={isError ? "alert" : "status"}
          className={`text-xs ${
            isError
              ? "text-red-600 dark:text-red-400"
              : "text-emerald-600 dark:text-emerald-400"
          }`}
        >
          {message}
        </p>
      )}
    </div>
  );
}
