"use client";

import React, { useState, useMemo } from "react";
import { DDTMatrix } from "./DDTMatrix";
import {
  generateDifferentialPairs,
  DEFAULT_SBOX,
} from "@/lib/attacks/differential-cryptanalysis";
import { DifferencePair } from "@/types/differential-cryptanalysis";

export const DifferentialCryptanalysisSimulator: React.FC = () => {
  const [selectedInputDiff, setSelectedInputDiff] = useState<number>(0x0f);
  const [selectedOutputDiff, setSelectedOutputDiff] = useState<number>(0x05);
  const [pairCount, setPairCount] = useState<number>(10);
  const [pairs, setPairs] = useState<DifferencePair[]>([]);

  // Simulated round keys (16-bit keys)
  const roundKeys = useMemo(() => [0x2b7e, 0x1516, 0x28ae, 0xd2a6, 0xabf7], []);

  const handleCellSelect = (inDiff: number, outDiff: number) => {
    setSelectedInputDiff(inDiff);
    setSelectedOutputDiff(outDiff);
  };

  const handleGeneratePairs = () => {
    const generated = generateDifferentialPairs(
      pairCount,
      selectedInputDiff,
      roundKeys,
      DEFAULT_SBOX
    );
    setPairs(generated);
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-6xl mx-auto p-4">
      {/* Header / Intro */}
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-bold text-zinc-100">
          Differential Cryptanalysis Simulator
        </h2>
        <p className="text-sm text-zinc-400">
          Analyze non-uniformities in S-box difference distributions to trace high-probability propagation paths and recover subkeys.
        </p>
      </div>

      {/* Controls & Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: DDT Matrix */}
        <div className="lg:col-span-2">
          <DDTMatrix
            sbox={DEFAULT_SBOX}
            selectedInputDiff={selectedInputDiff}
            selectedOutputDiff={selectedOutputDiff}
            onSelectCell={handleCellSelect}
          />
        </div>

        {/* Right Column: Active Characteristic & Pair Generator */}
        <div className="flex flex-col gap-4 p-4 rounded-xl border border-zinc-800 bg-zinc-900/50">
          <h3 className="text-lg font-semibold text-zinc-100">
            Attack Parameters
          </h3>

          <div className="flex flex-col gap-2 text-sm">
            <div className="flex justify-between items-center py-2 border-b border-zinc-800">
              <span className="text-zinc-400">Target Input Diff (ΔX):</span>
              <span className="font-mono text-emerald-400 font-bold">
                0x{selectedInputDiff.toString(16).toUpperCase().padStart(2, "0")}
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-zinc-800">
              <span className="text-zinc-400">Target Output Diff (ΔY):</span>
              <span className="font-mono text-blue-400 font-bold">
                0x{selectedOutputDiff.toString(16).toUpperCase().padStart(2, "0")}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-2 mt-2">
            <label className="text-xs text-zinc-400">
              Number of Differential Pairs ({pairCount})
            </label>
            <input
              type="range"
              min={5}
              max={50}
              value={pairCount}
              onChange={(e) => setPairCount(Number(e.target.value))}
              className="w-full accent-emerald-500 cursor-pointer"
            />
          </div>

          <button
            onClick={handleGeneratePairs}
            className="mt-4 w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg transition-all"
          >
            Generate Differential Pairs
          </button>
        </div>
      </div>

      {/* Generated Pairs Table */}
      {pairs.length > 0 && (
        <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/50 flex flex-col gap-3">
          <h3 className="text-lg font-semibold text-zinc-100">
            Sampled Differential Pairs ($\Delta P = 0x{selectedInputDiff.toString(16).toUpperCase()}$)
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="text-zinc-500 border-b border-zinc-800">
                  <th className="p-2">#</th>
                  <th className="p-2">P1</th>
                  <th className="p-2">P2 (P1 ⊕ ΔP)</th>
                  <th className="p-2">C1</th>
                  <th className="p-2">C2</th>
                  <th className="p-2">Ciphertext Diff (ΔC)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {pairs.map((pair, idx) => (
                  <tr key={idx} className="hover:bg-zinc-800/30">
                    <td className="p-2 text-zinc-500">{idx + 1}</td>
                    <td className="p-2 text-zinc-300">0x{pair.p1.toString(16).padStart(4, "0")}</td>
                    <td className="p-2 text-zinc-300">0x{pair.p2.toString(16).padStart(4, "0")}</td>
                    <td className="p-2 text-emerald-400">0x{pair.c1.toString(16).padStart(4, "0")}</td>
                    <td className="p-2 text-emerald-400">0x{pair.c2.toString(16).padStart(4, "0")}</td>
                    <td className="p-2 text-blue-400 font-bold">
                      0x{pair.outputDiff.toString(16).padStart(4, "0")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};