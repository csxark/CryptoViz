"use client";

import type { CipherDefinition } from "../../lib/cipher/registry";

interface CipherOptionsPanelProps {
  cipher: CipherDefinition;
  action: "encrypt" | "decrypt";
  autoCompute: boolean;
  hexInput: boolean;
  rounds: number;
  demoMode: boolean;
  bobSecret: string;
  aesMode: string;
  padding: boolean;
  loading: boolean;
  onActionChange: (action: "encrypt" | "decrypt") => void;
  onAutoComputeChange: (value: boolean) => void;
  onHexInputChange: (value: boolean) => void;
  onRoundsChange: (value: number) => void;
  onDemoModeChange: (value: boolean) => void;
  onBobSecretChange: (value: string) => void;
  onAesModeChange: (value: string) => void;
  onPaddingChange: (value: boolean) => void;
  onRun: () => void;
}

export default function CipherOptionsPanel(props: CipherOptionsPanelProps) {
  const { cipher, action, autoCompute, hexInput, rounds, demoMode, bobSecret, aesMode, padding, loading } = props;
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900/40">
      {cipher.category !== "hash" && cipher.id !== "dh" && (
        <div className="flex rounded-lg bg-zinc-100 p-0.5 dark:bg-zinc-800/80" role="tablist" aria-label="Cipher direction">
          {(["encrypt", "decrypt"] as const).map((value) => (
            <button key={value} type="button" onClick={() => props.onActionChange(value)} aria-selected={action === value}
              className={`flex-1 rounded-md py-2.5 text-center text-xs font-semibold ${action === value ? "bg-white text-zinc-950 shadow dark:bg-zinc-900 dark:text-white" : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"}`}>
              {value === "encrypt" ? "Encrypt / Sign" : "Decrypt / Verify"}
            </button>
          ))}
        </div>
      )}

      {cipher.id === "bcrypt" && (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Cost Factor (Rounds)</label>
            <span className="font-mono text-xs font-bold text-teal-600 dark:text-teal-400">{rounds}</span>
          </div>
          <input type="range" min="4" max="12" value={rounds} onChange={(event) => props.onRoundsChange(Number(event.target.value))} className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-zinc-200 accent-teal-600 dark:bg-zinc-700 dark:accent-teal-400" aria-label="Bcrypt cost factor" />
        </div>
      )}

      {cipher.id === "dh" && (
        <label className="flex flex-col gap-1.5 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
          Bob Private Secret (b)
          <input type="text" value={bobSecret} onChange={(event) => props.onBobSecretChange(event.target.value)} className="w-full rounded-lg border border-zinc-200 bg-zinc-50/50 p-2.5 font-mono text-sm text-zinc-900 outline-none focus:border-teal-500 dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-zinc-100" />
        </label>
      )}

      {cipher.id === "rsa" && (
        <label className="flex items-center justify-between border-t border-zinc-100 pt-3 text-xs font-semibold text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
          Demo Mode (Square & Multiply walkthrough)
          <input type="checkbox" checked={demoMode} onChange={(event) => props.onDemoModeChange(event.target.checked)} className="h-4 w-4 rounded border-zinc-300 text-teal-600 focus:ring-teal-500" />
        </label>
      )}

      {["des", "3des", "aes", "camellia"].includes(cipher.id) && (
        <label className="flex items-center justify-between border-t border-zinc-100 pt-3 text-xs font-semibold text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
          Input / Key in Hex Format
          <input type="checkbox" checked={hexInput} onChange={(event) => props.onHexInputChange(event.target.checked)} className="h-4 w-4 rounded border-zinc-300 text-teal-600 focus:ring-teal-500" />
        </label>
      )}

      {["aes", "camellia"].includes(cipher.id) && (
        <label className="flex flex-col gap-1.5 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
          Mode of Operation
          <select value={aesMode} onChange={(event) => props.onAesModeChange(event.target.value)} className="w-full rounded-lg border border-zinc-200 bg-zinc-50/50 p-2.5 font-mono text-sm text-zinc-900 outline-none focus:border-teal-500 dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-zinc-100">
            <option value="ECB">ECB (Electronic Codebook)</option>
            <option value="CBC">CBC (Cipher Block Chaining)</option>
            {cipher.id === "aes" && <><option value="CTR">CTR (Counter)</option><option value="CFB">CFB (Cipher Feedback)</option><option value="OFB">OFB (Output Feedback)</option></>}
          </select>
        </label>
      )}

      {cipher.id === "camellia" && (
        <label className="flex items-center justify-between border-t border-zinc-100 pt-3 text-xs font-semibold text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
          PKCS#7 Padding
          <input type="checkbox" checked={padding} onChange={(event) => props.onPaddingChange(event.target.checked)} className="h-4 w-4 rounded border-zinc-300 text-teal-600 focus:ring-teal-500" />
        </label>
      )}

      <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button type="button" onClick={props.onRun} disabled={loading} className="flex h-10 w-full items-center justify-center rounded-lg bg-teal-600 text-sm font-semibold text-white shadow-sm hover:bg-teal-500 disabled:opacity-50 dark:bg-teal-500 dark:hover:bg-teal-400 sm:flex-1">
          {loading ? "Running in Web Worker..." : "Run Computation"}
        </button>
        <label className="flex h-10 cursor-pointer select-none items-center gap-3 rounded-lg border border-zinc-200 px-3.5 text-xs font-semibold text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
          Auto Compute
          <input type="checkbox" checked={autoCompute} onChange={(event) => props.onAutoComputeChange(event.target.checked)} className="h-5 w-9 cursor-pointer appearance-none rounded-full border border-zinc-300 bg-zinc-200 checked:bg-teal-600 dark:border-zinc-700 dark:bg-zinc-700 dark:checked:bg-teal-500" />
        </label>
      </div>
    </div>
  );
}
