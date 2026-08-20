'use client';

import React from 'react';

interface KeccakStateMatrixProps {
  rateBits: number;
  capacityBits: number;
  activeLane?: { x: number; y: number };
}

export const KeccakStateMatrix: React.FC<KeccakStateMatrixProps> = ({ rateBits, capacityBits, activeLane }) => {
  // 5x5 lanes = 25 lanes total, each 64 bits (total 1600 bits)
  const totalLanes = 25;
  const rateLanesCount = Math.ceil(rateBits / 64);

  return (
    <div className="space-y-4 p-4 bg-slate-900 border border-slate-800 rounded-2xl text-slate-100">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold uppercase tracking-wider text-teal-400">Keccak 1600-Bit State Matrix ($5 \times 5 \times 64$)</h4>
        <div className="text-[11px] text-slate-400">
          Rate ($r$): <span className="text-teal-400 font-bold">{rateBits} bits</span> | Capacity ($c$): <span className="text-rose-400 font-bold">{capacityBits} bits</span>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-2">
        {Array.from({ length: totalLanes }).map((_, idx) => {
          const x = idx % 5;
          const y = Math.floor(idx / 5);
          const isRate = idx < rateLanesCount;
          const isActive = activeLane?.x === x && activeLane?.y === y;

          return (
            <div
              key={idx}
              className={`p-2.5 rounded-xl border flex flex-col items-center justify-center text-center transition-all ${
                isActive ? 'ring-2 ring-teal-400 scale-105' : ''
              } ${
                isRate 
                  ? 'bg-teal-950/30 border-teal-500/40 text-teal-300' 
                  : 'bg-rose-950/30 border-rose-500/40 text-rose-300'
              }`}
            >
              <span className="text-[10px] font-mono font-bold">[{x},{y}]</span>
              <span className="text-[9px] text-slate-400">{isRate ? 'Rate' : 'Cap'}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
