'use client';

import React, { useState } from 'react';
import { AsconStateRegisters } from './AsconStateRegisters';
import { KeccakStateMatrix } from './KeccakStateMatrix';
import { Play, Pause, RotateCcw, ArrowRight } from 'lucide-react';

interface SpongeVisualizerProps {
  cipherType: 'sha3-256' | 'shake128' | 'ascon-128';
}

export const SpongeConstructionVisualizer: React.FC<SpongeVisualizerProps> = ({ cipherType }) => {
  const [phase, setPhase] = useState<'absorbing' | 'permuting' | 'squeezing'>('absorbing');
  const [stepIndex, setStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const isAscon = cipherType === 'ascon-128';
  const rateBits = cipherType === 'sha3-256' ? 1088 : cipherType === 'shake128' ? 1344 : 64;
  const capacityBits = 1600 - rateBits;

  return (
    <div className="space-y-6 bg-slate-950 border border-slate-800 p-6 rounded-3xl text-slate-100">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-teal-400 uppercase tracking-widest bg-teal-500/10 px-3 py-1 rounded-full border border-teal-500/20">
            Sponge & Duplex Construction
          </span>
          <h3 className="text-xl font-bold text-white mt-2">Interactive Sponge Visualizer ({cipherType.toUpperCase()})</h3>
        </div>

        {/* Phase Indicator */}
        <div className="flex items-center gap-2 bg-slate-900 p-1.5 rounded-xl border border-slate-800 text-xs font-semibold">
          <span className={`px-3 py-1 rounded-lg ${phase === 'absorbing' ? 'bg-teal-500 text-slate-950' : 'text-slate-400'}`}>Absorbing</span>
          <ArrowRight className="h-3.5 w-3.5 text-slate-600" />
          <span className={`px-3 py-1 rounded-lg ${phase === 'permuting' ? 'bg-amber-500 text-slate-950' : 'text-slate-400'}`}>Permuting ($f$)</span>
          <ArrowRight className="h-3.5 w-3.5 text-slate-600" />
          <span className={`px-3 py-1 rounded-lg ${phase === 'squeezing' ? 'bg-indigo-500 text-white' : 'text-slate-400'}`}>Squeezing</span>
        </div>
      </div>

      {/* State Visualizer Render */}
      {isAscon ? (
        <AsconStateRegisters stateWords={['0x0147', '0x0000', '0x0000', '0x0000', '0x0000']} rateWordsCount={1} />
      ) : (
        <KeccakStateMatrix rateBits={rateBits} capacityBits={capacityBits} activeLane={{ x: 0, y: 0 }} />
      )}

      {/* Controls Bar */}
      <div className="flex items-center justify-between bg-slate-900 border border-slate-800 p-4 rounded-2xl">
        <div className="text-xs text-slate-400">
          Current Phase: <strong className="text-white uppercase">{phase}</strong> (Step {stepIndex + 1})
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setStepIndex(prev => Math.max(0, prev - 1))}
            className="p-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl text-slate-300 transition-colors"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
          <button 
            onClick={() => setIsPlaying(!isPlaying)}
            className="px-4 py-2 bg-teal-500 hover:bg-teal-600 text-slate-950 text-xs font-bold rounded-xl flex items-center gap-2 transition-colors"
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {isPlaying ? 'Pause' : 'Play Animation'}
          </button>
        </div>
      </div>
    </div>
  );
};
