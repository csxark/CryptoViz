"use client";

import type { CipherDefinition } from "../../lib/cipher/registry";

interface CipherInputPanelProps {
  cipher: CipherDefinition;
  input: string;
  key: string;
  onInputChange: (value: string) => void;
  onKeyChange: (value: string) => void;
  keylessCiphers: readonly string[];
}

export default function CipherInputPanel({
  cipher,
  input,
  key,
  onInputChange,
  onKeyChange,
  keylessCiphers,
}: CipherInputPanelProps) {
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900/40">
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
          Plaintext / Input Message
        </label>
        <textarea
          value={input}
          onChange={(event) => onInputChange(event.target.value)}
          className="min-h-[120px] w-full resize-y rounded-lg border border-zinc-200 bg-zinc-50/50 p-2.5 font-mono text-sm leading-relaxed text-zinc-900 outline-none transition-all focus:border-teal-500 focus:bg-white dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-zinc-100 dark:focus:border-teal-400 dark:focus:bg-zinc-950"
          placeholder="Enter input here..."
          aria-label="Plaintext or input message"
        />
      </div>

      {!keylessCiphers.includes(cipher.id) && cipher.defaultKey !== undefined && (
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
            Cryptographic Key / Shift
          </label>
          <input
            type="text"
            value={key}
            onChange={(event) => onKeyChange(event.target.value)}
            className="w-full rounded-lg border border-zinc-200 bg-zinc-50/50 p-2.5 font-mono text-sm text-zinc-900 outline-none transition-all focus:border-teal-500 focus:bg-white dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-zinc-100 dark:focus:border-teal-400"
            placeholder={cipher.keyPlaceholder || "Enter key..."}
            aria-label="Cryptographic key or shift"
          />
        </div>
      )}
    </div>
  );
}
