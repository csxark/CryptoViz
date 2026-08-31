'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { calculateIndexofCoincidence } from '@/lib/math/quadgrams';
import { runHillClimbStep } from '@/lib/cryptanalysis/hillClimber';

export const AutomatedCryptanalysisWorkbench: React.FC = () => {
  const [ciphertext, setCiphertext] = useState<string>(
    "KNSQ WKBCP XMPRO GQZ ZKSPV KNSQB KNBV RZPKJ QVPKB RMVOM"
  );
  const [ic, setIc] = useState<number>(0);
  const [cipherType, setCipherType] = useState<string>("Unknown");
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [iteration, setIteration] = useState<number>(0);
  const [bestScore, setBestScore] = useState<number>(-9999);
  const [currentKey, setCurrentKey] = useState<string>("ZYXWVUTSRQPONMLKJIHGFEDCBA");
  const [plaintextPreview, setPlaintextPreview] = useState<string>("");
  const [speed, setSpeed] = useState<number>(50); // ms delay

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-detect cipher characteristics via IC
  useEffect(() => {
    const calculatedIc = calculateIndexofCoincidence(ciphertext);
    setIc(calculatedIc);
    if (calculatedIc > 0.060) {
      setCipherType("Monoalphabetic Substitution (High IC)");
    } else if (calculatedIc > 0.038) {
      setCipherType("Polyalphabetic / Vigenère (Medium IC)");
    } else {
      setCipherType("Transposition / Random (Low IC)");
    }
  }, [ciphertext]);

  const stepSolver = useCallback(() => {
    const result = runHillClimbStep(ciphertext, currentKey);
    setIteration(prev => prev + 1);
    setBestScore(result.score);
    setCurrentKey(result.key);
    setPlaintextPreview(result.plaintext);
  }, [ciphertext, currentKey]);

  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(stepSolver, speed);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, speed, stepSolver]);

  const handleReset = () => {
    setIsRunning(false);
    setIteration(0);
    setBestScore(-9999);
    setCurrentKey("ZYXWVUTSRQPONMLKJIHGFEDCBA");
    setPlaintextPreview(ciphertext);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-slate-900 border border-slate-800 rounded-xl text-slate-100 shadow-xl space-y-6">
      <header className="border-b border-slate-800 pb-4">
        <h2 className="text-2xl font-bold text-teal-400">Automated Cryptanalysis & Hill-Climbing Workbench</h2>
        <p className="text-sm text-slate-400 mt-1">Break classical ciphers automatically using statistical quadgram language models and heuristic optimization.</p>
      </header>

      {/* Ciphertext Input & Auto-Detection */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 space-y-2">
          <label className="text-sm font-semibold text-slate-300">Target Ciphertext</label>
          <textarea
            value={ciphertext}
            onChange={(e) => setCiphertext(e.target.value)}
            rows={3}
            className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg text-sm text-teal-300 font-mono focus:ring-2 focus:ring-teal-500 focus:outline-none"
          />
        </div>
        <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 flex flex-col justify-center">
          <span className="text-xs text-slate-400 uppercase tracking-wider">Auto-Detected Type</span>
          <span className="text-sm font-bold text-teal-300 mt-1">{cipherType}</span>
          <span className="text-xs text-slate-500 mt-2">Index of Coincidence (IC): {ic.toFixed(4)}</span>
        </div>
      </div>

      {/* Solver Controls & Live Metrics */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-950 p-4 rounded-lg border border-slate-800">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsRunning(!isRunning)}
            className={`px-5 py-2.5 rounded-lg font-bold text-sm transition-colors ${
              isRunning ? 'bg-amber-600 hover:bg-amber-700 text-white' : 'bg-teal-500 hover:bg-teal-600 text-slate-950'
            }`}
          >
            {isRunning ? 'Pause Solver' : 'Start Hill-Climbing'}
          </button>
          <button
            onClick={handleReset}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold rounded-lg transition-colors"
          >
            Reset
          </button>
        </div>

        <div className="flex items-center gap-4 text-sm">
          <div>
            <span className="text-slate-400">Iterations: </span>
            <span className="font-mono font-bold text-teal-400">{iteration}</span>
          </div>
          <div>
            <span className="text-slate-400">Fitness Score: </span>
            <span className="font-mono font-bold text-teal-400">{bestScore.toFixed(2)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-400">Speed:</span>
            <select
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
              className="bg-slate-900 border border-slate-700 text-xs rounded p-1 text-slate-200"
            >
              <option value={200}>Slow (5 iter/sec)</option>
              <option value={50}>Normal (20 iter/sec)</option>
              <option value={10}>Fast (100 iter/sec)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Live Plaintext Preview & Key Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-2">
          <h4 className="text-sm font-semibold text-slate-300">Live Plaintext Convergence</h4>
          <div className="p-3 bg-black/50 border border-slate-800 rounded font-mono text-sm text-green-400 min-h-[4rem] break-all">
            {plaintextPreview || "Click 'Start Hill-Climbing' to begin automated decryption..."}
          </div>
        </div>

        <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-2">
          <h4 className="text-sm font-semibold text-slate-300">Mutating Substitution Key Map</h4>
          <div className="grid grid-cols-13 gap-1 font-mono text-center text-xs">
            {currentKey.split('').map((char, idx) => (
              <div key={idx} className="bg-slate-900 border border-slate-800 p-1 rounded">
                <div className="text-slate-500">{String.fromCharCode(65 + idx)}</div>
                <div className="text-teal-300 font-bold">{char}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AutomatedCryptanalysisWorkbench;
