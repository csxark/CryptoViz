"use client";

import { useState } from "react";
import {
  encryptCustomSBoxBlock,
  encryptAffine,
  decryptAffine,
  type DynamicCipherDefinition,
} from "@/lib/utils/dynamicCipherLoader";
import { Play, ArrowRightLeft, ShieldCheck, Cpu } from "lucide-react";

interface DynamicCipherPlaygroundProps {
  cipher: DynamicCipherDefinition;
}

export default function DynamicCipherPlayground({
  cipher,
}: DynamicCipherPlaygroundProps) {
  const [inputText, setInputText] = useState(cipher.defaultInput || "CRYPTOVIZ");
  const [direction, setDirection] = useState<"encrypt" | "decrypt">("encrypt");
  const [resultText, setResultText] = useState<string>("");
  const [executionTimeMs, setExecutionTimeMs] = useState<number | null>(null);

  const handleRunCipher = () => {
    const start = performance.now();
    let output = "";

    if (cipher.cipherType === "affine") {
      const keyA = cipher.affineConfig?.keyA || 5;
      const keyB = cipher.affineConfig?.keyB || 8;
      output =
        direction === "encrypt"
          ? encryptAffine(inputText, keyA, keyB)
          : decryptAffine(inputText, keyA, keyB);
    } else if (cipher.cipherType === "sbox-block") {
      const sbox = cipher.sboxConfig?.substitutionTable || [
        14, 4, 13, 1, 2, 15, 11, 8, 3, 10, 6, 12, 5, 9, 0, 7,
      ];
      output = encryptCustomSBoxBlock(inputText, sbox);
    } else {
      // Feistel mock execution representation
      output = Array.from(new TextEncoder().encode(inputText))
        .map((b) => (b ^ 0x5a).toString(16).padStart(2, "0"))
        .join("");
    }

    const duration = performance.now() - start;
    setResultText(output);
    setExecutionTimeMs(Number(duration.toFixed(3)));
  };

  return (
    <div className="space-y-4 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 pb-3 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <Cpu className="h-4.5 w-4.5 text-teal-600 dark:text-teal-400" />
          <h3 className="font-semibold text-base text-zinc-900 dark:text-white">
            Dynamic Playground: <span className="text-teal-600 dark:text-teal-400">{cipher.name}</span>
          </h3>
        </div>

        <div className="flex items-center gap-1 rounded-lg bg-zinc-100 p-1 dark:bg-zinc-800">
          <button
            type="button"
            onClick={() => setDirection("encrypt")}
            className={`rounded px-2.5 py-1 text-xs font-semibold transition-all ${
              direction === "encrypt"
                ? "bg-white text-teal-700 shadow-sm dark:bg-zinc-700 dark:text-teal-300"
                : "text-zinc-500 dark:text-zinc-400"
            }`}
          >
            Encrypt
          </button>
          <button
            type="button"
            onClick={() => setDirection("decrypt")}
            className={`rounded px-2.5 py-1 text-xs font-semibold transition-all ${
              direction === "decrypt"
                ? "bg-white text-teal-700 shadow-sm dark:bg-zinc-700 dark:text-teal-300"
                : "text-zinc-500 dark:text-zinc-400"
            }`}
          >
            Decrypt
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
            Input Plaintext / Ciphertext
          </label>
          <textarea
            rows={3}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-200 bg-white p-3 font-mono text-xs text-zinc-900 focus:border-teal-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
            Output Result
          </label>
          <div className="mt-1 min-h-[74px] w-full rounded-lg border border-zinc-200 bg-zinc-50 p-3 font-mono text-xs text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white break-all">
            {resultText || <span className="text-zinc-400">Click "Run Execution" to compute output...</span>}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        {executionTimeMs !== null ? (
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            Compute Duration: <span className="font-mono font-bold text-teal-600 dark:text-teal-400">{executionTimeMs} ms</span>
          </span>
        ) : (
          <span className="text-xs text-zinc-400">Ready for execution</span>
        )}

        <button
          type="button"
          onClick={handleRunCipher}
          className="flex items-center gap-1.5 rounded-lg bg-teal-600 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-700 dark:bg-teal-500 dark:hover:bg-teal-600"
        >
          <Play className="h-3.5 w-3.5" />
          Run Execution
        </button>
      </div>
    </div>
  );
}
