'use client';

import React, { useState } from 'react';
import { evaluatePolynomial, computeQuotientPolynomial, generateSRS, verifyBilinearPairing, Polynomial } from '@/lib/math/pairing';
import { Sparkles, Calculator, CheckCircle2, ShieldCheck, Layers } from 'lucide-react';

export default function KZGVisualizer() {
  const [polyCoeffs, setPolyCoeffs] = useState<number[]>([1, 2, 3]); // P(X) = 1 + 2X + 3X^2
  const [evaluationZ, setEvaluationZ] = useState<number>(4);
  const [tau] = useState<number>(5); // Secret toxic waste parameter

  const poly: Polynomial = { coeffs: polyCoeffs };
  const y = evaluatePolynomial(poly, evaluationZ);
  const quotient = computeQuotientPolynomial(poly, evaluationZ, y);
  const srs = generateSRS(polyCoeffs.length + 1, tau);

  const commitment = evaluatePolynomial(poly, tau);
  const proof = evaluatePolynomial(quotient, tau);
  const isVerified = verifyBilinearPairing(commitment, y, proof, tau, evaluationZ);

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-sm font-inter text-neutral-900 dark:text-neutral-100">
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-neutral-200 dark:border-neutral-800">
        <div>
          <h2 className="text-xl font-bold font-playfair flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" /> KZG Polynomial Commitment & Bilinear Pairing Visualizer
          </h2>
          <p className="text-xs text-neutral-500 mt-1">Explore polynomial commitments, SRS setup, quotient polynomial division, and bilinear pairing verification.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Polynomial & Evaluation Input Panel */}
        <div className="lg:col-span-2 space-y-4">
          <div className="p-5 bg-neutral-50 dark:bg-neutral-950 rounded-2xl border border-neutral-200 dark:border-neutral-800 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
              <Calculator className="w-4 h-4 text-amber-500" /> Polynomial Definition $P(X) = a_0 + a_1X + a_2X^2$
            </h3>

            <div className="grid grid-cols-3 gap-3">
              {polyCoeffs.map((coeff, idx) => (
                <div key={idx} className="space-y-1">
                  <label className="text-[10px] font-bold text-neutral-400 uppercase">Coefficient $a_{idx}$</label>
                  <input
                    type="number"
                    value={coeff}
                    onChange={(e) => {
                      const newCoeffs = [...polyCoeffs];
                      newCoeffs[idx] = parseFloat(e.target.value) || 0;
                      setPolyCoeffs(newCoeffs);
                    }}
                    className="w-full p-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-mono"
                  />
                </div>
              ))}
            </div>

            <div className="pt-2 space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-neutral-400">Evaluation Challenge Point ($z$)</label>
              <input
                type="number"
                value={evaluationZ}
                onChange={(e) => setEvaluationZ(parseFloat(e.target.value) || 0)}
                className="w-full p-2.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-mono"
              />
            </div>
          </div>

          <div className="p-5 bg-neutral-50 dark:bg-neutral-950 rounded-2xl border border-neutral-200 dark:border-neutral-800 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-amber-500" /> Quotient Polynomial $Q(X) = \frac{P(X) - y}{X - z}$
            </h3>
            <div className="p-3 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 font-mono text-xs">
              <div>$P(z) = {y}$</div>
              <div className="mt-1 text-neutral-500">Quotient Coefficients: [{quotient.coeffs.join(', ')}]</div>
            </div>
          </div>
        </div>

        {/* Bilinear Pairing Verification Panel */}
        <div className="space-y-4">
          <div className="p-5 bg-neutral-50 dark:bg-neutral-950 rounded-2xl border border-neutral-200 dark:border-neutral-800 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-amber-500" /> Bilinear Pairing Check ($e: G_1 \times G_2 \to G_T$)
            </h3>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 space-y-1">
                <span className="font-bold text-neutral-400 uppercase text-[10px]">Commitment $C = P(\tau)G_1$</span>
                <div className="font-mono font-bold text-amber-600">{commitment}</div>
              </div>

              <div className="p-3 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 space-y-1">
                <span className="font-bold text-neutral-400 uppercase text-[10px]">Evaluation Proof $\pi = Q(\tau)G_1$</span>
                <div className="font-mono font-bold text-amber-600">{proof}</div>
              </div>

              <div className={`p-3 rounded-xl border font-bold flex items-center gap-2 ${isVerified ? 'bg-green-500/10 border-green-500/30 text-green-600' : 'bg-red-500/10 border-red-500/30 text-red-600'}`}>
                <CheckCircle2 className="w-4 h-4" />
                {isVerified ? 'Pairing Equality Verified: TRUE' : 'Verification Failed'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
