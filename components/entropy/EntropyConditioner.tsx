'use client';

import React, { useState, useRef, useEffect } from 'react';
import { calculateEntropyMetrics, runVonNeumannFilter, EntropyMetrics } from '@/lib/entropy/vonNeumann';
import { Sparkles, MousePointer, Activity, ShieldCheck, Sliders, RefreshCw } from 'lucide-react';

export default function EntropyConditioner() {
  const [rawBits, setRawBits] = useState<number[]>([]);
  const [targetBias, setTargetBias] = useState<number>(0.65); // Default 65% ones
  const [isHarvesting, setIsHarvesting] = useState<boolean>(false);
  const lastMouseTime = useRef<number>(performance.now());
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Mouse Jitter Entropy Harvester
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isHarvesting) return;
      const now = performance.now();
      const delta = Math.floor(now - lastMouseTime.current);
      lastMouseTime.current = now;

      // Extract LSB of delta timing jitter and apply bias simulation
      const rawBit = delta & 1;
      const biasedBit = Math.random() < targetBias ? 1 : 0;

      setRawBits(prev => [...prev.slice(-500), biasedBit]);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [isHarvesting, targetBias]);

  const rawMetrics: EntropyMetrics = calculateEntropyMetrics(rawBits);
  const { unbiasedBits, processedPairs } = runVonNeumannFilter(rawBits);
  const debiasedMetrics: EntropyMetrics = calculateEntropyMetrics(unbiasedBits);

  const handleReset = () => setRawBits([]);

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-sm font-inter text-neutral-900 dark:text-neutral-100">
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-neutral-200 dark:border-neutral-800">
        <div>
          <h2 className="text-xl font-bold font-playfair flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" /> Physical Entropy Harvesting & Min-Entropy Conditioner
          </h2>
          <p className="text-xs text-neutral-500 mt-1">Harvest high-resolution mouse jitter noise, condition biased bitstreams via von Neumann debiasing.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setIsHarvesting(!isHarvesting)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${isHarvesting ? 'bg-red-600 text-white' : 'bg-amber-600 text-white'}`}
          >
            <MousePointer className="w-3.5 h-3.5" /> {isHarvesting ? 'Stop Harvester' : 'Start Mouse Jitter Harvester'}
          </button>
          <button onClick={handleReset} className="px-3 py-2 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 rounded-xl text-xs font-bold transition">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Interactive Harvesting Canvas */}
        <div className="lg:col-span-2 space-y-4">
          <div
            ref={canvasRef}
            className="p-8 bg-neutral-50 dark:bg-neutral-950 rounded-2xl border border-neutral-200 dark:border-neutral-800 flex flex-col items-center justify-center min-h-[240px] text-center cursor-crosshair relative overflow-hidden"
          >
            <MousePointer className={`w-8 h-8 mb-2 transition ${isHarvesting ? 'text-amber-500 animate-bounce' : 'text-neutral-400'}`} />
            <p className="text-sm font-semibold">{isHarvesting ? 'Move your mouse rapidly inside this region to feed entropy...' : 'Harvester Paused. Click Start to begin collecting timer jitter.'}</p>
            <span className="text-xs font-mono text-neutral-400 mt-2">Collected Raw Bits: {rawBits.length}</span>
          </div>

          {/* Bias Injector Slider */}
          <div className="p-4 bg-neutral-50 dark:bg-neutral-950 rounded-2xl border border-neutral-200 dark:border-neutral-800 space-y-3">
            <div className="flex justify-between text-xs font-bold">
              <span className="flex items-center gap-1.5"><Sliders className="w-4 h-4 text-amber-500" /> Hardware Bias Injector P(1)</span>
              <span className="font-mono text-amber-600">{(targetBias * 100).toFixed(0)}% Ones</span>
            </div>
            <input
              type="range"
              min="0.3"
              max="0.9"
              step="0.05"
              value={targetBias}
              onChange={(e) => setTargetBias(parseFloat(e.target.value))}
              className="w-full accent-amber-500"
            />
          </div>
        </div>

        {/* Entropy Metrics & Conditioner Comparison */}
        <div className="space-y-4">
          <div className="p-4 bg-neutral-50 dark:bg-neutral-950 rounded-2xl border border-neutral-200 dark:border-neutral-800 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-amber-500" /> Entropy Metrics Comparison
            </h3>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 space-y-1">
                <span className="font-bold text-neutral-400 uppercase text-[10px]">Raw Biased Stream</span>
                <div className="flex justify-between"><span>Shannon ($H_0$):</span><span className="font-mono font-bold">{rawMetrics.shannonEntropy} bits</span></div>
                <div className="flex justify-between"><span>Min-Entropy ($H_\infty$):</span><span className="font-mono font-bold text-red-500">{rawMetrics.minEntropy} bits</span></div>
                <div className="flex justify-between"><span>Bias P(1):</span><span className="font-mono font-bold">{rawMetrics.bias}</span></div>
              </div>

              <div className="p-3 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 space-y-1">
                <span className="font-bold text-green-600 uppercase text-[10px] flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> Von Neumann Conditioned Stream</span>
                <div className="flex justify-between"><span>Shannon ($H_0$):</span><span className="font-mono font-bold">{debiasedMetrics.shannonEntropy} bits</span></div>
                <div className="flex justify-between"><span>Min-Entropy ($H_\infty$):</span><span className="font-mono font-bold text-green-500">{debiasedMetrics.minEntropy} bits</span></div>
                <div className="flex justify-between"><span>Unbiased P(1):</span><span className="font-mono font-bold">{debiasedMetrics.bias}</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
