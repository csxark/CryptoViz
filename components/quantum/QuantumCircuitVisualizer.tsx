"use client";

import React, { useState, useMemo } from "react";
import { simulateShor } from "../../lib/quantum/shorSimulator";
import { simulateGrover, getProbabilities, getOptimalIterations } from "../../lib/quantum/groverSimulator";

interface QuantumCircuitVisualizerProps {
  className?: string;
}

export default function QuantumCircuitVisualizer({ className }: QuantumCircuitVisualizerProps) {
  const [activeTab, setActiveTab] = useState<"shor" | "grover">("shor");

  // Shor State
  const [shorN, setShorN] = useState<number>(15);
  const [shorA, setShorA] = useState<number>(7);
  
  const shorResults = useMemo(() => {
    return simulateShor(shorN, shorA);
  }, [shorN, shorA]);

  // Grover State
  const [groverQubits, setGroverQubits] = useState<number>(3);
  const [groverTarget, setGroverTarget] = useState<number>(5);
  const [groverIter, setGroverIter] = useState<number>(0);

  const numItems = Math.pow(2, groverQubits);
  const optimalIters = getOptimalIterations(numItems);

  const groverResults = useMemo(() => {
    try {
      const amplitudes = simulateGrover(numItems, groverTarget, groverIter);
      const probabilities = getProbabilities(amplitudes);
      return { success: true, amplitudes, probabilities };
    } catch (e) {
      return { success: false, error: String(e) };
    }
  }, [numItems, groverTarget, groverIter]);

  return (
    <div className={`flex flex-col gap-6 ${className || ""}`}>
      <div className="flex bg-zinc-100 dark:bg-zinc-900 rounded-lg p-1">
        <button
          onClick={() => setActiveTab("shor")}
          className={`flex-1 py-2 text-sm font-semibold rounded-md transition-colors ${activeTab === "shor" ? "bg-white dark:bg-zinc-800 shadow-sm text-zinc-900 dark:text-white" : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"}`}
        >
          Shor's Algorithm (Factoring)
        </button>
        <button
          onClick={() => setActiveTab("grover")}
          className={`flex-1 py-2 text-sm font-semibold rounded-md transition-colors ${activeTab === "grover" ? "bg-white dark:bg-zinc-800 shadow-sm text-zinc-900 dark:text-white" : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"}`}
        >
          Grover's Algorithm (Search)
        </button>
      </div>

      {activeTab === "shor" ? (
        <div className="flex flex-col gap-6 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900/40">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-zinc-500">Number to Factor (N)</label>
              <select 
                value={shorN} 
                onChange={e => setShorN(parseInt(e.target.value))}
                className="p-2 border rounded-md bg-zinc-50 dark:bg-zinc-950 text-sm font-mono dark:border-zinc-800"
              >
                <option value={15}>15 (3 × 5)</option>
                <option value={21}>21 (3 × 7)</option>
                <option value={35}>35 (5 × 7)</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-zinc-500">Guess Base (a)</label>
              <input 
                type="number" 
                value={shorA} 
                onChange={e => setShorA(parseInt(e.target.value) || 2)} 
                className="p-2 border rounded-md bg-zinc-50 dark:bg-zinc-950 text-sm font-mono dark:border-zinc-800"
                min="2"
                max={shorN - 1}
              />
            </div>
          </div>

          <div className="p-4 bg-zinc-50 dark:bg-zinc-950 rounded-lg border border-zinc-200 dark:border-zinc-800">
            <h4 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 mb-3">Algorithm Execution</h4>
            
            <div className="space-y-4 text-sm font-mono text-zinc-700 dark:text-zinc-300">
              <div className="flex gap-2">
                <span className="text-zinc-400">1.</span>
                <span>Initialize registers. Upper register in superposition (Hadamard gates).</span>
              </div>
              <div className="flex gap-2">
                <span className="text-zinc-400">2.</span>
                <span>Apply controlled modular exponentiation: |x⟩|{shorA}^x mod {shorN}⟩</span>
              </div>
              <div className="flex gap-2">
                <span className="text-zinc-400">3.</span>
                <span>Apply Inverse Quantum Fourier Transform (IQFT) to upper register.</span>
              </div>
              <div className="flex gap-2">
                <span className="text-zinc-400">4.</span>
                <span className="flex-1">Measure upper register. This gives a state close to k*(Q/r).<br/>
                {shorResults.success || shorResults.r ? (
                  <span className="text-teal-600 dark:text-teal-400">Found period r = {shorResults.r}</span>
                ) : (
                  <span className="text-red-500">{shorResults.message}</span>
                )}
                </span>
              </div>
              {(shorResults.success && shorResults.r) && (
                <div className="flex gap-2">
                  <span className="text-zinc-400">5.</span>
                  <span className="flex-1">
                    Classical post-processing:<br/>
                    gcd({shorA}^({shorResults.r}/2) - 1, {shorN}) = {shorResults.factors![0]}<br/>
                    gcd({shorA}^({shorResults.r}/2) + 1, {shorN}) = {shorResults.factors![1]}<br/>
                    <strong className="text-teal-700 dark:text-teal-300">Factors: {shorResults.factors!.join(" × ")}</strong>
                  </span>
                </div>
              )}
            </div>
          </div>
          
          {shorResults.probs && (
            <div className="p-4 bg-zinc-50 dark:bg-zinc-950 rounded-lg border border-zinc-200 dark:border-zinc-800 h-48 flex flex-col">
              <h4 className="text-xs font-semibold text-zinc-500 uppercase mb-2">Simulated Measurement Probability (Upper Register)</h4>
              <div className="flex-1 flex items-end gap-1 relative overflow-hidden">
                {Array.from({ length: 64 }).map((_, i) => {
                  const state = i * 4; // Mocking 256 states grouped into 64 bins
                  const hit = shorResults.probs!.find(p => Math.abs(p.state - state) < 4);
                  const height = hit ? hit.prob * 100 : 2; // tiny noise
                  return (
                    <div 
                      key={i} 
                      className="flex-1 bg-teal-500 dark:bg-teal-600 rounded-t transition-all duration-500 hover:bg-teal-400"
                      style={{ height: `${height}%` }}
                      title={`State ~${state}: ${(hit?.prob || 0) * 100}%`}
                    />
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-6 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900/40">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-zinc-500">Number of Qubits</label>
              <input 
                type="number" 
                value={groverQubits} 
                onChange={e => setGroverQubits(Math.min(8, Math.max(2, parseInt(e.target.value) || 2)))}
                className="p-2 border rounded-md bg-zinc-50 dark:bg-zinc-950 text-sm font-mono dark:border-zinc-800"
                min="2"
                max="8"
              />
              <div className="text-[10px] text-zinc-400">Search Space: {numItems}</div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-zinc-500">Target Item (Secret Key)</label>
              <input 
                type="number" 
                value={groverTarget} 
                onChange={e => setGroverTarget(Math.min(numItems - 1, Math.max(0, parseInt(e.target.value) || 0)))}
                className="p-2 border rounded-md bg-zinc-50 dark:bg-zinc-950 text-sm font-mono dark:border-zinc-800"
                min="0"
                max={numItems - 1}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-zinc-500">Grover Iterations</label>
              <div className="flex gap-2">
                <input 
                  type="number" 
                  value={groverIter} 
                  onChange={e => setGroverIter(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full p-2 border rounded-md bg-zinc-50 dark:bg-zinc-950 text-sm font-mono dark:border-zinc-800"
                  min="0"
                />
                <button 
                  onClick={() => setGroverIter(optimalIters)}
                  className="px-2 bg-zinc-200 dark:bg-zinc-800 rounded text-xs font-semibold hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors"
                  title={`Set to optimal (${optimalIters})`}
                >
                  Optimal
                </button>
              </div>
            </div>
          </div>

          {groverResults.success && (
            <div className="p-4 bg-zinc-50 dark:bg-zinc-950 rounded-lg border border-zinc-200 dark:border-zinc-800 flex flex-col gap-4">
              <h4 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                Probability Distribution (State: |{groverTarget}⟩ is the target)
              </h4>
              <div className="text-xs text-zinc-600 dark:text-zinc-400">
                Probability of finding target: <strong className="text-indigo-600 dark:text-indigo-400">{(groverResults.probabilities![groverTarget] * 100).toFixed(2)}%</strong> 
                {groverIter > optimalIters && " (Note: Over-iterating causes amplitude to drop!)"}
              </div>
              
              <div className="h-48 flex items-end gap-[1px] md:gap-1 mt-2">
                {groverResults.probabilities!.map((prob, idx) => (
                  <div 
                    key={idx}
                    className={`flex-1 rounded-t transition-all duration-300 ${idx === groverTarget ? "bg-indigo-500 dark:bg-indigo-600 shadow-[0_0_8px_rgba(99,102,241,0.5)]" : "bg-zinc-300 dark:bg-zinc-700"}`}
                    style={{ height: `${Math.max(1, prob * 100)}%` }}
                    title={`State |${idx}⟩: ${(prob * 100).toFixed(2)}%`}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
