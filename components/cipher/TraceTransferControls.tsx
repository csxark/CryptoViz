"use client";

import { useRef, useState } from "react";
import type { ChangeEvent } from "react";
import type { CipherDirection, CipherResult } from "../../lib/cipher/types";
import {
  createCipherTrace,
  getTraceFilename,
  parseCipherTraceJson,
  type CipherTraceFile,
} from "../../lib/utils/cipherTrace";
import {
  parseLessonPackageJson,
  verifyLessonIntegrity,
  type LessonPackage,
} from "../../lib/utils/lessonPackage";

interface TraceTransferControlsProps {
  cipherId: string;
  direction: CipherDirection;
  input: string;
  cipherKey: string;
  options: Record<string, unknown>;
  result: CipherResult | null;
  onImport: (trace: CipherTraceFile) => void;
  onOpenLessonModal?: () => void;
  onLessonImported?: (lesson: LessonPackage) => void;
}

function downloadJson(trace: CipherTraceFile) {
  const blob = new Blob([JSON.stringify(trace, null, 2)], {
    type: "application/json;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = getTraceFilename(trace);
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export default function TraceTransferControls({
  cipherId,
  direction,
  input,
  cipherKey,
  options,
  result,
  onImport,
  onOpenLessonModal,
  onLessonImported,
}: TraceTransferControlsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lessonFileInputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  const handleExport = () => {
    if (!result) return;

    const trace = createCipherTrace({
      cipherId,
      direction,
      input,
      key: cipherKey,
      options,
      result,
    });

    downloadJson(trace);
    setIsError(false);
    setMessage("Trace exported successfully.");
  };

  const handleImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (
      file.type &&
      file.type !== "application/json" &&
      !file.name.toLowerCase().endsWith(".json")
    ) {
      setIsError(true);
      setMessage("Choose a JSON trace file.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setIsError(true);
      setMessage("Trace files must be smaller than 5 MB.");
      return;
    }

    try {
      const parsed = parseCipherTraceJson(await file.text());

      if (!parsed.success) {
        setIsError(true);
        setMessage(parsed.error);
        return;
      }

      if (parsed.trace.cipherId !== cipherId) {
        setIsError(true);
        setMessage(
          `This trace belongs to “${parsed.trace.cipherId}”. Open that cipher before importing it.`,
        );
        return;
      }

      onImport(parsed.trace);
      setIsError(false);
      setMessage("Trace imported. It was loaded without executing the cipher.");
    } catch {
      setIsError(true);
      setMessage("The trace file could not be read.");
    }
  };

  const handleLessonImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setIsError(true);
      setMessage("Lesson files must be smaller than 10 MB.");
      return;
    }

    try {
      const result = parseLessonPackageJson(await file.text());

      if (!result.success) {
        setIsError(true);
        setMessage(result.error);
        return;
      }

      if (result.lesson.executionContext.algorithmId !== cipherId) {
        setIsError(true);
        setMessage(
          `This lesson belongs to "${result.lesson.executionContext.algorithmId}". Open that cipher before importing it.`,
        );
        return;
      }

      const valid = verifyLessonIntegrity(result.lesson);
      if (!valid) {
        setIsError(true);
        setMessage("Integrity check failed — the lesson file may have been tampered with.");
        return;
      }

      if (onLessonImported) {
        onLessonImported(result.lesson);
      }
      setIsError(false);
      setMessage("Lesson imported and verified successfully.");
    } catch {
      setIsError(true);
      setMessage("The lesson file could not be read.");
    }
  };

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-zinc-200 bg-white p-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleExport}
          disabled={!result}
          className="rounded-lg bg-teal-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-teal-500 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-teal-500 dark:hover:bg-teal-400"
        >
          Export Trace
        </button>

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="rounded-lg border border-zinc-300 px-3 py-2 text-xs font-semibold text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          Import Trace
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          className="sr-only"
          onChange={handleImport}
          aria-label="Import cipher visualization trace"
        />

        {onOpenLessonModal && (
          <button
            type="button"
            onClick={onOpenLessonModal}
            disabled={!result}
            className="rounded-lg border border-teal-300 bg-teal-50 px-3 py-2 text-xs font-semibold text-teal-700 transition-colors hover:bg-teal-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-teal-800 dark:bg-teal-950/30 dark:text-teal-300 dark:hover:bg-teal-900/50"
          >
            Lesson Package
          </button>
        )}

        {onLessonImported && (
          <>
            <button
              type="button"
              onClick={() => lessonFileInputRef.current?.click()}
              className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700 transition-colors hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300 dark:hover:bg-amber-900/50"
            >
              Import Lesson
            </button>
            <input
              ref={lessonFileInputRef}
              type="file"
              accept=".cryptoviz,application/json"
              className="sr-only"
              onChange={handleLessonImport}
              aria-label="Import lesson package"
            />
          </>
        )}
      </div>

      <p className="text-2xs text-zinc-500 dark:text-zinc-400">
        Imported traces are validated and replayed locally. They never run a
        cipher operation automatically.
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
