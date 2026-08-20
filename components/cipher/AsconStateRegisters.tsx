'use client';

import React from 'react';

interface AsconStateRegistersProps {
  stateWords: string[]; // Array of 5 hex strings representing x0..x4
  rateWordsCount: number; // e.g. 1 for Ascon-128 (64 bits rate)
}

export const AsconStateRegisters: React.FC<AsconStateRegistersProps> = ({ stateWords, rateWordsCount = 1 }) => {
  return (
    <div className="space-y-4 p-4 bg-slate-900 border border-slate-800 rounded-2xl text-slate-100">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold uppercase tracking-wider text-teal-400">Ascon-128 320-Bit State Registers ($b = 320$)</h4>
        <div className="flex items-center gap-3 text-[10px]">
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-teal-500/30 border border-teal-500"></span> Rate ($r$)</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-rose-500/30 border border-rose-500"></span> Capacity ($c$)</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
        {stateWords.map((word, idx) => {
          const isRate = idx < rateWordsCount;
          return (
            <div 
              key={idx} 
              className={`p-3 rounded-xl border flex flex-col justify-between space-y-2 ${
                isRate 
                  ? 'bg-teal-950/20 border-teal-500/40 text-teal-300' 
                  : 'bg-rose-950/20 border-rose-500/40 text-rose-300'
              }`}
            >
              <div className="flex items-center justify-between text-[10px] font-bold">
                <span>x{idx}</span>
                <span className={isRate ? 'text-teal-400' : 'text-rose-400'}>{isRate ? 'Rate' : 'Capacity'}</span>
              </div>
              <div className="font-mono text-xs truncate bg-slate-950 px-2 py-1 rounded border border-slate-800" title={word}>
                {word || '0x0000000000000000'}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
