// components/differential-cryptanalysis/DDTMatrix.tsx
"use client";

import React, { useMemo } from "react";
import { generateDDT, DEFAULT_SBOX } from "@/lib/attacks/differential-cryptanalysis";

interface DDTMatrixProps {
  sbox?: number[];
  onSelectCell?: (inputDiff: number, outputDiff: number) => void;
  selectedInputDiff?: number;
  selectedOutputDiff?: number;
}

export const DDTMatrix: React.FC<DDTMatrixProps> = ({
  sbox = DEFAULT_SBOX,
  onSelectCell,
  selectedInputDiff,
  selectedOutputDiff,
}) => {
  const ddt = useMemo(() => generateDDT(sbox), [sbox]);

  const getCellColor = (count: number, inDiff: number, outDiff: number) => {
    if (inDiff === 0 && outDiff === 0) return "bg-zinc-800 text-zinc-500"; // Trivial case (ΔX=0 -> ΔY=0)
    if (count === 0) return "bg-zinc-950 text-zinc-700";
    if (count >= 6) return "bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 font-bold";
    if (count >= 4) return "bg-blue-500/20 text-blue-400 border border-blue-500/30";
    return "bg-zinc-900 text-zinc-300";
  };

  return (
    <div className="flex flex-col gap-3 p-4 rounded-xl border border-zinc-800 bg-zinc-900/50 backdrop-blur-sm">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-zinc-100">
          Difference Distribution Table (DDT)
        </h3>
        <span className="text-xs text-zinc-400">
          Showing $\Delta X \to \Delta Y$ counts (out of 16)
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-center text-xs font-mono border-collapse">
          <thead>
            <tr>
              <th className="p-2 border-b border-zinc-800 text-zinc-500">ΔX \ ΔY</th>
              {Array.from({ length: 16 }).map((_, i) => (
                <th key={i} className="p-1 border-b border-zinc-800 text-zinc-400">
                  {i.toString(16).toUpperCase()}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ddt.map((row, inDiff) => (
              <tr key={inDiff}>
                <td className="p-1 font-bold border-r border-zinc-800 text-zinc-400">
                  {inDiff.toString(16).toUpperCase()}
                </td>
                {row.map((cell, outDiff) => {
                  const isSelected =
                    selectedInputDiff === inDiff && selectedOutputDiff === outDiff;

                  return (
                    <td
                      key={outDiff}
                      onClick={() => onSelectCell?.(inDiff, outDiff)}
                      className={`p-2 cursor-pointer transition-all rounded ${getCellColor(
                        cell.count,
                        inDiff,
                        outDiff
                      )} ${isSelected ? "ring-2 ring-emerald-400 ring-offset-2 ring-offset-zinc-950" : "hover:scale-105"}`}
                      title={`ΔX = 0x${inDiff.toString(16)}, ΔY = 0x${outDiff.toString(16)} | Count: ${cell.count}/16 (p = ${(cell.probability * 100).toFixed(1)}%)`}
                    >
                      {cell.count}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};