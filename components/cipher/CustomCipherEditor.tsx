"use client";

import { useState } from "react";
import type { DynamicCipherDefinition, DynamicCipherType } from "@/lib/utils/dynamicCipherLoader";
import { Plus, Sliders, Layers, Sparkles, Check } from "lucide-react";

interface CustomCipherEditorProps {
  onRegisterCustomCipher: (cipher: DynamicCipherDefinition) => void;
}

export default function CustomCipherEditor({
  onRegisterCustomCipher,
}: CustomCipherEditorProps) {
  const [cipherName, setCipherName] = useState("Custom S-Box Block Cipher");
  const [cipherType, setCipherType] = useState<DynamicCipherType>("sbox-block");
  const [category, setCategory] = useState<"classical" | "symmetric">("symmetric");
  const [description, setDescription] = useState(
    "A custom user-defined substitution-permutation block cipher constructed with custom S-Box values.",
  );
  const [defaultInput, setDefaultInput] = useState("CRYPTOVIZ LAB");
  const [defaultKey, setDefaultKey] = useState("MYSECRETKEY");
  const [sboxInput, setSboxInput] = useState("14, 4, 13, 1, 2, 15, 11, 8, 3, 10, 6, 12, 5, 9, 0, 7");
  const [affineKeyA, setAffineKeyA] = useState(5);
  const [affineKeyB, setAffineKeyB] = useState(8);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const id = `custom-${cipherType}-${Date.now().toString().slice(-4)}`;
    const parsedSbox = sboxInput
      .split(",")
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !isNaN(n));

    const newCipher: DynamicCipherDefinition = {
      id,
      name: cipherName,
      category,
      cipherType,
      description,
      defaultInput,
      defaultKey,
      securityStatus: "legacy",
      isDynamic: true,
      author: "Custom User Extension",
      version: "1.0.0",
      bundleSizeBytes: Math.floor(Math.random() * 5000 + 8000),
      initializationTimeMs: Number((Math.random() * 3 + 1.5).toFixed(2)),
      ...(cipherType === "sbox-block"
        ? { sboxConfig: { substitutionTable: parsedSbox.length ? parsedSbox : [1, 2, 3, 4] } }
        : cipherType === "affine"
          ? { affineConfig: { keyA: affineKeyA, keyB: affineKeyB } }
          : { feistelConfig: { rounds: 4, subkeys: ["K1", "K2", "K3", "K4"] } }),
    };

    onRegisterCustomCipher(newCipher);
    setIsSuccess(true);
    setTimeout(() => setIsSuccess(false), 2500);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-xl border border-teal-200/80 bg-teal-50/40 p-5 dark:border-teal-900/50 dark:bg-teal-950/20"
    >
      <div className="flex items-center gap-2 border-b border-teal-100 pb-3 dark:border-teal-900/60">
        <Sparkles className="h-4.5 w-4.5 text-teal-600 dark:text-teal-400" />
        <h3 className="text-base font-semibold text-teal-950 dark:text-teal-200">
          Build & Dynamically Register Custom Cipher Module
        </h3>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
            Cipher Module Name
          </label>
          <input
            type="text"
            required
            value={cipherName}
            onChange={(e) => setCipherName(e.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 focus:border-teal-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
            Cipher Architecture Type
          </label>
          <select
            value={cipherType}
            onChange={(e) => setCipherType(e.target.value as DynamicCipherType)}
            className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 focus:border-teal-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
          >
            <option value="sbox-block">S-Box Block Cipher</option>
            <option value="affine">Affine Substitution (a·x + b)</option>
            <option value="feistel">Feistel Round Network</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
          Description & Algorithmic Notes
        </label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 focus:border-teal-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
        />
      </div>

      {cipherType === "sbox-block" && (
        <div>
          <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
            S-Box Substitution Vector (Comma-separated Integers)
          </label>
          <input
            type="text"
            value={sboxInput}
            onChange={(e) => setSboxInput(e.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 font-mono text-xs text-zinc-900 focus:border-teal-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
          />
        </div>
      )}

      {cipherType === "affine" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Multiplicative Key (a) - Coprime to 26
            </label>
            <input
              type="number"
              value={affineKeyA}
              onChange={(e) => setAffineKeyA(parseInt(e.target.value, 10))}
              className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 focus:border-teal-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Additive Shift Key (b)
            </label>
            <input
              type="number"
              value={affineKeyB}
              onChange={(e) => setAffineKeyB(parseInt(e.target.value, 10))}
              className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 focus:border-teal-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
            />
          </div>
        </div>
      )}

      <div className="flex items-center justify-between pt-2">
        <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
          Module will be dynamically instantiated in runtime registry.
        </span>

        <button
          type="submit"
          className="flex items-center gap-1.5 rounded-lg bg-teal-600 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-700 dark:bg-teal-500 dark:hover:bg-teal-600"
        >
          {isSuccess ? (
            <>
              <Check className="h-3.5 w-3.5 text-emerald-300" />
              Registered!
            </>
          ) : (
            <>
              <Plus className="h-3.5 w-3.5" />
              Instantiate Custom Cipher
            </>
          )}
        </button>
      </div>
    </form>
  );
}
