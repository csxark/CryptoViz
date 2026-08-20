'use client';

import React, { useState } from 'react';
import { computeNTTSteps, Q } from '@/lib/math/ntt';

export function NTTVisualizer() {
  const [inputPoly, setInputPoly] = useState<number[]>([3, 2, 1, 4, 0, 0, 0, 0]); // N=8 demo
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [mode, setMode] = useState<'ntt' | 'comparison'>('ntt');

  const { steps, result } = computeNTTSteps(inputPoly);
  const activeStep = steps[currentStepIdx] || steps[0];

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Negacyclic NTT Laboratory ($q = {Q}$)</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Visualize Cooley-Tukey butterfly operations for ring $R_q = \mathbb{Z}_q[X]/(X^n + 1)$</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { setMode('ntt'); setCurrentStepIdx(0); }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg ${mode === 'ntt' ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'}`}
          >
            NTT Visualizer
          </button>
          <button
            onClick={() => setMode('comparison')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg ${mode === 'comparison' ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'}`}
          >
            $O(N^2)$ vs $O(N \log N)$
          </button>
        </div>
      </div>

      {mode === 'ntt' ? (
        <div className="space-y-6">
          {/* Step Control Bar */}
          <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-800/60 p-4 rounded-xl">
            <div className="space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                Stage {activeStep.stage} / {steps.length - 1}
              </span>
              <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{activeStep.description}</p>
            </div>
            <div className="flex gap-2">
              <button
                disabled={currentStepIdx === 0}
                onClick={() => setCurrentStepIdx(prev => Math.max(0, prev - 1))}
                className="px-3 py-1.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-xs font-semibold disabled:opacity-50"
              >
                Previous Step
              </button>
              <button
                disabled={currentStepIdx === steps.length - 1}
                onClick={() => setCurrentStepIdx(prev => Math.min(steps.length - 1, prev + 1))}
                className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold disabled:opacity-50"
              >
                Next Butterfly Step
              </button>
            </div>
          </div>

          {/* Polynomial Coefficients Array Grid */}
          <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
            {activeStep.coefficients.map((coeff, idx) => {
              const isActive = activeStep.activeIndices.includes(idx);
              return (
                <div
                  key={idx}
                  className={`p-4 rounded-xl border text-center transition-all ${
                    isActive
                      ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-500 ring-2 ring-blue-400/30'
                      : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                  }`}
                >
                  <span className="block text-[10px] text-gray-400 uppercase">coeff [$X^{idx}$]</span>
                  <span className="block text-lg font-mono font-bold text-gray-900 dark:text-white mt-1">{coeff}</span>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/40 space-y-3">
            <h3 className="font-bold text-gray-900 dark:text-white">Schoolbook Multiplication</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">Computes cross-products directly term by term.</p>
            <div className="p-3 bg-white dark:bg-gray-900 rounded-lg font-mono text-xs text-red-600 dark:text-red-400">
              Complexity: $O(N^2)$ — ~65,536 operations for $N=256$
            </div>
          </div>
          <div className="p-5 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/30 space-y-3">
            <h3 className="font-bold text-gray-900 dark:text-white">NTT Multiplication</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">Transforms vectors into NTT domain for $O(1)$ pointwise multiplication.</p>
            <div className="p-3 bg-white dark:bg-gray-900 rounded-lg font-mono text-xs text-emerald-600 dark:text-emerald-400">
              Complexity: $O(N \log N)$ — ~2,048 operations for $N=256$
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
