"use client";

import React, { useState, useMemo } from "react";
import { parsePolynomial, ringPolyMultiply } from "../../lib/math/ringLwe";

interface RingLwePolynomialLabProps {
  className?: string;
}

export default function RingLwePolynomialLab({ className }: RingLwePolynomialLabProps) {
  const [polyA, setPolyA] = useState("1, 2, -1, 3");
  const [polyS, setPolyS] = useState("0, 1, -1, 0");
  const [nParam, setNParam] = useState(4);
  const [qParam, setQParam] = useState(17);
  const [centered, setCentered] = useState(false);

  const results = useMemo(() => {
    try {
      const a = parsePolynomial(polyA);
      const s = parsePolynomial(polyS);
      const res = ringPolyMultiply(a, s, nParam, qParam, centered);
      return {
        success: true,
        a, s,
        rawMult: res.rawMult,
        ringReduced: res.ringReduced,
        fullyReduced: res.fullyReduced
      };
    } catch (e) {
      return { success: false, error: String(e) };
    }
  }, [polyA, polyS, nParam, qParam, centered]);

  const formatPoly = (coeffs: number[]) => {
    if (coeffs.length === 0) return "0";
    let str = "";
    for (let i = 0; i < coeffs.length; i++) {
      const c = coeffs[i];
      if (c === 0) continue;
      
      const sign = c > 0 ? (str ? " + " : "") : (str ? " - " : "-");
      const absC = Math.abs(c);
      const cStr = (absC === 1 && i > 0) ? "" : absC.toString();
      
      let term = "";
      if (i === 0) term = absC.toString();
      else if (i === 1) term = `${cStr}X`;
      else term = `${cStr}X^${i}`;
      
      str += sign + term;
    }
    return str || "0";
  };

  return (
    <div className={`flex flex-col gap-6 ${className || ""}`}>
      <div className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900/40">
        <h3 className="font-semibold text-lg text-zinc-900 dark:text-zinc-100">
          Ring-LWE Polynomial Multiplication Laboratory
        </h3>
        
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          In Ring-LWE (used in Kyber/ML-KEM), arithmetic is performed on polynomials with coefficients modulo $q$, and the polynomial itself is reduced modulo $X^n + 1$. Because $X^n = -1$, terms like $c \cdot X^{n+k}$ wrap around as $-c \cdot X^k$.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-zinc-500">Polynomial A coefficients (a_0, a_1, ...)</label>
            <input 
              type="text" 
              value={polyA} 
              onChange={e => setPolyA(e.target.value)} 
              className="w-full p-2 border rounded-md bg-zinc-50 dark:bg-zinc-950 text-sm font-mono dark:border-zinc-800"
              placeholder="e.g. 1, 2, -1, 3"
            />
            <div className="text-xs text-zinc-400 h-4">{results.success && formatPoly(results.a)}</div>
          </div>
          
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-zinc-500">Polynomial S coefficients (s_0, s_1, ...)</label>
            <input 
              type="text" 
              value={polyS} 
              onChange={e => setPolyS(e.target.value)} 
              className="w-full p-2 border rounded-md bg-zinc-50 dark:bg-zinc-950 text-sm font-mono dark:border-zinc-800"
              placeholder="e.g. 0, 1, -1, 0"
            />
            <div className="text-xs text-zinc-400 h-4">{results.success && formatPoly(results.s)}</div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-zinc-500">Degree (n) for Modulo X^n + 1</label>
            <input 
              type="number" 
              value={nParam} 
              onChange={e => setNParam(parseInt(e.target.value) || 2)} 
              className="w-full p-2 border rounded-md bg-zinc-50 dark:bg-zinc-950 text-sm font-mono dark:border-zinc-800"
              min="2"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-zinc-500">Modulo (q)</label>
            <div className="flex gap-2 items-center">
              <input 
                type="number" 
                value={qParam} 
                onChange={e => setQParam(parseInt(e.target.value) || 2)} 
                className="flex-1 p-2 border rounded-md bg-zinc-50 dark:bg-zinc-950 text-sm font-mono dark:border-zinc-800"
                min="2"
              />
              <label className="flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-400 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={centered} 
                  onChange={e => setCentered(e.target.checked)} 
                  className="rounded border-zinc-300 text-teal-600 focus:ring-teal-600"
                />
                Centered Modulo
              </label>
            </div>
          </div>
        </div>

        {results.success ? (
          <div className="mt-4 flex flex-col gap-4 border-t border-zinc-200 dark:border-zinc-800 pt-4">
            <div>
              <div className="text-xs font-semibold text-zinc-500 uppercase mb-1">Step 1: Standard Multiplication (A * S)</div>
              <div className="font-mono text-sm bg-zinc-50 dark:bg-zinc-950 p-3 rounded border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 overflow-x-auto">
                {formatPoly(results.rawMult)}
                <div className="text-xs text-zinc-400 mt-1">Coefficients: [{results.rawMult.join(", ")}]</div>
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold text-zinc-500 uppercase mb-1">Step 2: Reduce Modulo (X^{nParam} + 1)</div>
              <div className="font-mono text-sm bg-indigo-50 dark:bg-indigo-950/30 p-3 rounded border border-indigo-200 dark:border-indigo-900 text-indigo-900 dark:text-indigo-200 overflow-x-auto">
                {formatPoly(results.ringReduced)}
                <div className="text-xs opacity-70 mt-1">Coefficients: [{results.ringReduced.join(", ")}]</div>
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold text-zinc-500 uppercase mb-1">Step 3: Reduce Coefficients Modulo {qParam}</div>
              <div className="font-mono text-sm bg-teal-50 dark:bg-teal-950/30 p-3 rounded border border-teal-200 dark:border-teal-900 text-teal-900 dark:text-teal-200 overflow-x-auto">
                {formatPoly(results.fullyReduced)}
                <div className="text-xs opacity-70 mt-1">Coefficients: [{results.fullyReduced.join(", ")}]</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-4 text-red-500 text-sm p-4 bg-red-50 dark:bg-red-950/30 rounded border border-red-200 dark:border-red-900">
            Error parsing polynomials. Check your inputs.
          </div>
        )}
      </div>
    </div>
  );
}
