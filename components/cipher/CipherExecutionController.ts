"use client";

import { useCallback, useEffect, useRef } from "react";
import type { CipherDefinition } from "../../lib/cipher/registry";
import type { CipherOptions, CipherResult } from "../../lib/cipher/types";
import { useCipherWorker } from "../../hooks/useCipherWorker";
import { clampStepIndex } from "../../lib/utils/visualizerPermalink";
import { resolveProvenance } from "../../lib/provenance/resolve";
import type { DataProvenanceMetadata } from "../../lib/provenance";
import { saveConversionHistory, type ConversionHistoryEntry } from "../../lib/utils/conversionHistory";

interface Params {
  cipher: CipherDefinition;
  input: string;
  key: string;
  action: "encrypt" | "decrypt";
  autoCompute: boolean;
  options: { hexInput: boolean; rounds: number; demoMode: boolean; bobSecret: string; aesMode: string; padding: boolean; autoCompute: boolean };
  demoMode: boolean;
  onResult: (result: CipherResult) => void;
  onStepRestore: (step: number) => void;
  onHistory: (update: (prev: ConversionHistoryEntry[]) => ConversionHistoryEntry[]) => void;
  onError: (message: string | null) => void;
}

function isSimulated(cipherId: string, demoMode: boolean) {
  return (cipherId === "rsa" && demoMode) || cipherId === "dh";
}

export function buildCipherWorkerOptions(
  cipherId: string,
  options: Params["options"],
  demoMode: boolean,
): CipherOptions {
  const workerOptions: CipherOptions = {
    instrument: true,
    signal: undefined,
    ...options,
  };
  if (["des", "3des", "aes", "camellia"].includes(cipherId)) workerOptions.hexInput = options.hexInput;
  if (["aes", "camellia"].includes(cipherId)) workerOptions.mode = options.aesMode;
  if (cipherId === "bcrypt") workerOptions.rounds = options.rounds;
  if (cipherId === "rsa") workerOptions.mode = demoMode ? "demo" : "real";
  if (cipherId === "dh") { workerOptions.mode = "demo"; workerOptions.bobSecret = options.bobSecret; }
  if (cipherId === "camellia") workerOptions.padding = options.padding ? "PKCS7" : "None";
  return workerOptions;
}

export function useCipherExecutionController({ cipher, input, key, action, autoCompute, options, demoMode, onResult, onStepRestore, onHistory, onError }: Params) {
  const { runCipher, loading, error: workerError } = useCipherWorker();
  const abortRef = useRef<AbortController | null>(null);

  const run = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    onError(null);

    try {
      const workerOptions = buildCipherWorkerOptions(cipher.id, options, demoMode);
      workerOptions.signal = controller.signal;

      const currentAction = cipher.id === "dh" ? "encrypt" : action;
      const result = await runCipher(currentAction, cipher.id, input, key, workerOptions);
      if (controller.signal.aborted) return;

      const provenance = isSimulated(cipher.id, demoMode)
        ? resolveProvenance({ provenance: "simulated", source: "CryptoViz educational simulation" } as DataProvenanceMetadata)
        : resolveProvenance(result.metadata?.provenance);
      const nextResult: CipherResult = { ...result, metadata: { ...result.metadata, provenance } };
      onResult(nextResult);
      onStepRestore(clampStepIndex(0, nextResult.steps?.length ?? 0));

      if (nextResult.output !== undefined) {
        const entry: ConversionHistoryEntry = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          cipherId: cipher.id,
          input,
          key,
          action: currentAction,
          output: String(nextResult.output),
          timestamp: new Date().toLocaleString(),
        };
        onHistory((prev) => saveConversionHistory(cipher.id, [entry, ...prev]));
      }
    } catch (error: unknown) {
      if (error instanceof Error && error.name === "AbortError") return;
      onResult({} as CipherResult);
      onError(error instanceof Error ? error.message : "An error occurred during calculation.");
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
    }
  }, [action, cipher, demoMode, input, key, onError, onHistory, onResult, onStepRestore, options, runCipher]);

  useEffect(() => {
    if (!autoCompute) return;
    const id = window.setTimeout(() => void run(), 450);
    return () => window.clearTimeout(id);
  }, [autoCompute, run]);

  useEffect(() => () => abortRef.current?.abort(), []);

  return { run, loading, workerError };
}
