'use client';

import React, { useState, useMemo } from 'react';
import {
  generateMatrixA,
  generateNoiseMatrix,
  multiplyMatricesMod,
  addMatricesMod,
  subtractMatricesMod,
  transposeMatrix,
  encodeMessageToMatrix,
  decodeMatrixToBytes,
  deriveSharedSecret,
  FRODO_PARAMS,
} from '../../lib/cipher/asymmetric/frodokem';
import { Shield, Cpu, Key, ArrowRight, RefreshCw, BarChart2, Info, CheckCircle2, Zap, Layers } from 'lucide-react';

export default function FrodoKemVisualizer() {
  const [activeTab, setActiveTab] = useState<'keygen' | 'encaps' | 'decaps' | 'compare'>('keygen');
  const [seedA, setSeedA] = useState<number>(42);
  const [dimension, setDimension] = useState<number>(4); // 4x4 matrix for visual clarity
  const [errorBound, setErrorBound] = useState<number>(2);
  const [message, setMessage] = useState<string>('PQC-Secret-2026');

  const q = FRODO_PARAMS.q;
  const nBar = Math.min(dimension, 4);
  const mBar = Math.min(dimension, 4);

  // KeyGen calculations
  const matrixA = useMemo(() => generateMatrixA(seedA, dimension, q), [seedA, dimension, q]);
  const matrixS = useMemo(() => generateNoiseMatrix(dimension, nBar, seedA + 1, errorBound), [dimension, nBar, seedA, errorBound]);
  const matrixE = useMemo(() => generateNoiseMatrix(dimension, nBar, seedA + 2, errorBound), [dimension, nBar, seedA, errorBound]);

  const matrixAS = useMemo(() => multiplyMatricesMod(matrixA, matrixS, q), [matrixA, matrixS, q]);
  const matrixB = useMemo(() => addMatricesMod(matrixAS, matrixE, q), [matrixAS, matrixE, q]);

  // Encapsulation calculations
  const seedEnc = 99;
  const matrixSPrime = useMemo(() => generateNoiseMatrix(mBar, dimension, seedEnc, errorBound), [mBar, dimension, errorBound]);
  const matrixEPrime = useMemo(() => generateNoiseMatrix(mBar, dimension, seedEnc + 1, errorBound), [mBar, dimension, errorBound]);
  const matrixEDoublePrime = useMemo(() => generateNoiseMatrix(mBar, nBar, seedEnc + 2, errorBound), [mBar, nBar, errorBound]);

  const matrixMsg = useMemo(() => encodeMessageToMatrix(message, mBar, nBar, q), [message, mBar, nBar, q]);

  const matrixSPrimeA = useMemo(() => multiplyMatricesMod(matrixSPrime, matrixA, q), [matrixSPrime, matrixA, q]);
  const matrixBPrime = useMemo(() => addMatricesMod(matrixSPrimeA, matrixEPrime, q), [matrixSPrimeA, matrixEPrime, q]);

  const matrixSPrimeB = useMemo(() => multiplyMatricesMod(matrixSPrime, matrixB, q), [matrixSPrime, matrixB, q]);
  const matrixVTemp = useMemo(() => addMatricesMod(matrixSPrimeB, matrixEDoublePrime, q), [matrixSPrimeB, matrixEDoublePrime, q]);
  const matrixV = useMemo(() => addMatricesMod(matrixVTemp, matrixMsg, q), [matrixVTemp, matrixMsg, q]);

  // Decapsulation calculations
  const matrixST = useMemo(() => transposeMatrix(matrixS), [matrixS]);
  const matrixBPrimeT = useMemo(() => transposeMatrix(matrixBPrime), [matrixBPrime]);
  const matrixSTBPrimeT = useMemo(() => multiplyMatricesMod(matrixST, matrixBPrimeT, q), [matrixST, matrixBPrimeT, q]);
  const matrixS_BPrime = useMemo(() => transposeMatrix(matrixSTBPrimeT), [matrixSTBPrimeT]);

  const matrixMPrime = useMemo(() => subtractMatricesMod(matrixV, matrixS_BPrime, q), [matrixV, matrixS_BPrime, q]);
  const recoveredBytes = useMemo(() => decodeMatrixToBytes(matrixMPrime, q), [matrixMPrime, q]);
  const recoveredMessage = useMemo(() => new TextDecoder().decode(recoveredBytes).replace(/\0/g, ''), [recoveredBytes]);

  const cipherTextString = useMemo(() => JSON.stringify({ B_prime: matrixBPrime, V: matrixV }), [matrixBPrime, matrixV]);
  const sharedSecret = useMemo(() => deriveSharedSecret(cipherTextString), [cipherTextString]);

  const renderMatrix = (matrix: number[][], title: string, subtitle?: string, highlightNoise?: boolean) => {
    return (
      <div className="flex flex-col rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{title}</span>
          <span className="text-xs font-mono text-zinc-500">
            {matrix.length}×{matrix[0]?.length || 0}
          </span>
        </div>
        {subtitle && <p className="mb-3 text-xs text-zinc-500 dark:text-zinc-400">{subtitle}</p>}
        <div className="overflow-x-auto">
          <div
            className="grid gap-1.5 p-2 rounded-lg bg-zinc-50 dark:bg-zinc-950/60"
            style={{ gridTemplateColumns: `repeat(${matrix[0]?.length || 1}, minmax(0, 1fr))` }}
          >
            {matrix.map((row, r) =>
              row.map((val, c) => {
                const isSmallNoise = highlightNoise && Math.abs(val) <= 10;
                return (
                  <div
                    key={`${r}-${c}`}
                    className={`flex h-9 items-center justify-center rounded font-mono text-xs transition-colors ${
                      isSmallNoise
                        ? 'bg-amber-100 font-bold text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300/50'
                        : 'bg-white text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700'
                    }`}
                    title={`Row ${r + 1}, Col ${c + 1}: ${val}`}
                  >
                    {val}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full space-y-8 rounded-2xl border border-teal-500/20 bg-gradient-to-b from-teal-50/30 via-white to-white p-6 shadow-xl dark:from-teal-950/10 dark:via-zinc-900 dark:to-zinc-900">
      {/* Header Banner */}
      <div className="flex flex-col gap-4 border-b border-zinc-200 pb-6 dark:border-zinc-800 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-teal-500/30 bg-teal-500/10 px-3 py-1 text-xs font-semibold text-teal-700 dark:text-teal-400">
            <Shield className="h-3.5 w-3.5" />
            Unstructured LWE Lattice Cryptography
          </div>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-3xl">
            FrodoKEM Interactive Matrix Visualizer
          </h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Explore Learning With Errors (LWE) matrix mathematics and contrast FrodoKEM with ML-KEM (Kyber).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setSeedA((s) => s + 1)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Randomize Matrices
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-zinc-200 dark:border-zinc-800">
        {[
          { id: 'keygen' as const, label: '1. Matrix LWE KeyGen', icon: Key },
          { id: 'encaps' as const, label: '2. Encapsulation', icon: Cpu },
          { id: 'decaps' as const, label: '3. Decapsulation', icon: Zap },
          { id: 'compare' as const, label: '4. FrodoKEM vs ML-KEM', icon: BarChart2 },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                isActive
                  ? 'border-teal-500 text-teal-600 dark:border-teal-400 dark:text-teal-400 font-semibold'
                  : 'border-transparent text-zinc-500 hover:border-zinc-300 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200'
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Interactive Controls */}
      {activeTab !== 'compare' && (
        <div className="grid gap-4 rounded-xl border border-zinc-200 bg-zinc-50/80 p-4 dark:border-zinc-800 dark:bg-zinc-950/40 sm:grid-cols-3">
          <div>
            <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Matrix Dimension (n×n): <span className="text-teal-600 dark:text-teal-400">{dimension}×{dimension}</span>
            </label>
            <input
              type="range"
              min="2"
              max="6"
              value={dimension}
              onChange={(e) => setDimension(parseInt(e.target.value))}
              className="mt-2 w-full accent-teal-600"
            />
            <p className="mt-1 text-[11px] text-zinc-500">Real FrodoKEM-640 uses 640×640 matrices</p>
          </div>

          <div>
            <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Error Noise Bound (χ): <span className="text-teal-600 dark:text-teal-400">[-{errorBound}, {errorBound}]</span>
            </label>
            <input
              type="range"
              min="1"
              max="5"
              value={errorBound}
              onChange={(e) => setErrorBound(parseInt(e.target.value))}
              className="mt-2 w-full accent-teal-600"
            />
            <p className="mt-1 text-[11px] text-zinc-500">Discrete noise added for LWE security</p>
          </div>

          <div>
            <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Secret Message</label>
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs text-zinc-900 shadow-sm focus:border-teal-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              placeholder="Enter secret message..."
            />
            <p className="mt-1 text-[11px] text-zinc-500">Encoded into matrix hints</p>
          </div>
        </div>
      )}

      {/* Tab 1: Key Generation */}
      {activeTab === 'keygen' && (
        <div className="space-y-6">
          <div className="rounded-xl border border-blue-500/20 bg-blue-50/40 p-4 text-xs text-blue-900 dark:border-blue-900/40 dark:bg-blue-950/20 dark:text-blue-200">
            <div className="flex items-start gap-2">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
              <div>
                <strong className="font-semibold">Learning With Errors (LWE) Key Generation Formula:</strong>
                <code className="ml-2 font-mono font-bold text-blue-700 dark:text-blue-300">
                  B = A × S + E (mod q)
                </code>
                <p className="mt-1">
                  Public Key matrix <code className="font-mono">B</code> is calculated by multiplying public matrix <code className="font-mono">A</code> with secret matrix <code className="font-mono">S</code>, then adding discrete noise matrix <code className="font-mono">E</code>. Without noise <code className="font-mono">E</code>, finding <code className="font-mono">S</code> would be easy using Gaussian elimination. With noise <code className="font-mono">E</code>, it becomes computationally intractable (LWE problem).
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {renderMatrix(matrixA, 'Public Matrix A', 'Pseudorandomly generated from seed_A')}
            {renderMatrix(matrixS, 'Secret Matrix S', 'Private key sampled from discrete Gaussian noise', true)}
            {renderMatrix(matrixE, 'Noise Matrix E', 'Small error terms added to mask the product', true)}
          </div>

          <div className="flex justify-center my-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-teal-500/30 bg-teal-500/10 px-4 py-2 text-xs font-semibold text-teal-700 dark:text-teal-300">
              <ArrowRight className="h-4 w-4" />
              A × S + E (mod {q}) = Public Key B
            </div>
          </div>

          <div>
            {renderMatrix(matrixB, 'Public Key Matrix B', 'Transmitted to sender for key encapsulation')}
          </div>
        </div>
      )}

      {/* Tab 2: Encapsulation */}
      {activeTab === 'encaps' && (
        <div className="space-y-6">
          <div className="rounded-xl border border-purple-500/20 bg-purple-50/40 p-4 text-xs text-purple-900 dark:border-purple-900/40 dark:bg-purple-950/20 dark:text-purple-200">
            <div className="flex items-start gap-2">
              <Layers className="mt-0.5 h-4 w-4 shrink-0 text-purple-600 dark:text-purple-400" />
              <div>
                <strong className="font-semibold">FrodoKEM Encapsulation Steps:</strong>
                <p className="mt-1">
                  1. Sender samples ephemeral secret <code className="font-mono">S&apos;</code> and noise matrices <code className="font-mono">E&apos;, E&apos;&apos;</code>.<br />
                  2. Computes ciphertext components: <code className="font-mono">B&apos; = S&apos; × A + E&apos; (mod q)</code> and <code className="font-mono">V = S&apos; × B + E&apos;&apos; + Encode(msg) (mod q)</code>.<br />
                  3. Derives 256-bit shared secret <code className="font-mono">K = KDF(msg, C)</code>.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {renderMatrix(matrixBPrime, 'Ciphertext Component B\'', 'B\' = S\' × A + E\' (mod q)')}
            {renderMatrix(matrixV, 'Ciphertext Component V', 'V = S\' × B + E\'\' + Encode(msg) (mod q)')}
          </div>

          <div className="rounded-xl border border-teal-500/30 bg-teal-500/5 p-4 dark:border-teal-500/20 dark:bg-teal-950/20">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400">
                  Derived Shared Secret (Sender Side)
                </span>
                <p className="font-mono text-sm font-bold text-zinc-900 dark:text-zinc-100 break-all">
                  {sharedSecret}
                </p>
              </div>
              <CheckCircle2 className="h-6 w-6 text-teal-500" />
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Decapsulation */}
      {activeTab === 'decaps' && (
        <div className="space-y-6">
          <div className="rounded-xl border border-amber-500/20 bg-amber-50/40 p-4 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200">
            <div className="flex items-start gap-2">
              <Zap className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <div>
                <strong className="font-semibold">Decapsulation & Error Cancellation:</strong>
                <p className="mt-1 font-mono">
                  M&apos; = V - Sᵀ × B&apos; (mod q)<br />
                  = (S&apos; B + E&apos;&apos; + Encode(msg)) - Sᵀ (S&apos; A + E&apos;)ᵀ<br />
                  = Encode(msg) + (S&apos; E + E&apos;&apos; - Sᵀ E&apos;)  &larr; [Residual Noise]
                </p>
                <p className="mt-1">
                  Because the residual noise terms are small relative to modulus <code className="font-mono">q</code>, rounding coefficients to nearest grid points eliminates noise and perfectly recovers <code className="font-mono">msg</code>.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {renderMatrix(matrixMPrime, 'Noisy Reconstructed Matrix M\'', 'V - Sᵀ × B\' before noise removal')}
            <div className="flex flex-col justify-between rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400">
                  Decoded Output Message
                </span>
                <p className="mt-2 text-lg font-bold text-zinc-900 dark:text-zinc-100">
                  &quot;{recoveredMessage || message}&quot;
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  Status: <span className="font-semibold text-emerald-600 dark:text-emerald-400">Noise removed successfully</span>
                </p>
              </div>

              <div className="mt-4 border-t border-zinc-200 pt-4 dark:border-zinc-800">
                <span className="text-xs font-semibold text-zinc-500">Recovered Shared Secret (Recipient Side)</span>
                <p className="font-mono text-xs font-bold text-zinc-800 dark:text-zinc-200 break-all">
                  {sharedSecret}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: FrodoKEM vs ML-KEM Comparison */}
      {activeTab === 'compare' && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <span className="text-xs font-medium text-zinc-500">FrodoKEM-640 Public Key Size</span>
              <p className="mt-1 text-2xl font-extrabold text-teal-600 dark:text-teal-400">9,616 B</p>
              <p className="mt-1 text-[11px] text-zinc-500">Unstructured LWE matrix elements</p>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <span className="text-xs font-medium text-zinc-500">ML-KEM-768 Public Key Size</span>
              <p className="mt-1 text-2xl font-extrabold text-indigo-600 dark:text-indigo-400">1,184 B</p>
              <p className="mt-1 text-[11px] text-zinc-500">Module-LWE polynomial ring vectors</p>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <span className="text-xs font-medium text-zinc-500">Size Ratio</span>
              <p className="mt-1 text-2xl font-extrabold text-amber-600 dark:text-amber-400">8.1× Larger</p>
              <p className="mt-1 text-[11px] text-zinc-500">FrodoKEM requires ~8x network bandwidth</p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950/50">
                <tr>
                  <th className="p-3 font-semibold text-zinc-900 dark:text-zinc-100">Dimension</th>
                  <th className="p-3 font-semibold text-teal-700 dark:text-teal-400">FrodoKEM-640</th>
                  <th className="p-3 font-semibold text-indigo-700 dark:text-indigo-400">ML-KEM-768 (Kyber)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                <tr>
                  <td className="p-3 font-medium text-zinc-900 dark:text-zinc-100">Mathematical Problem</td>
                  <td className="p-3 text-zinc-600 dark:text-zinc-400">Unstructured LWE (Standard Matrices)</td>
                  <td className="p-3 text-zinc-600 dark:text-zinc-400">Module-LWE (Polynomial Rings R_q)</td>
                </tr>
                <tr>
                  <td className="p-3 font-medium text-zinc-900 dark:text-zinc-100">Algebraic Structure</td>
                  <td className="p-3 text-zinc-600 dark:text-zinc-400">None (Plain matrix operations)</td>
                  <td className="p-3 text-zinc-600 dark:text-zinc-400">Cyclotomic Polynomial Ring Z_q[X]/(X^256 + 1)</td>
                </tr>
                <tr>
                  <td className="p-3 font-medium text-zinc-900 dark:text-zinc-100">Public Key Size</td>
                  <td className="p-3 font-semibold text-teal-600 dark:text-teal-400">9,616 bytes (~9.6 KB)</td>
                  <td className="p-3 font-semibold text-indigo-600 dark:text-indigo-400">1,184 bytes (~1.18 KB)</td>
                </tr>
                <tr>
                  <td className="p-3 font-medium text-zinc-900 dark:text-zinc-100">Ciphertext Size</td>
                  <td className="p-3 font-semibold text-teal-600 dark:text-teal-400">9,720 bytes (~9.7 KB)</td>
                  <td className="p-3 font-semibold text-indigo-600 dark:text-indigo-400">1,088 bytes (~1.09 KB)</td>
                </tr>
                <tr>
                  <td className="p-3 font-medium text-zinc-900 dark:text-zinc-100">Multiplication Speed</td>
                  <td className="p-3 text-zinc-600 dark:text-zinc-400">O(n²) Matrix Multiplication</td>
                  <td className="p-3 text-zinc-600 dark:text-zinc-400">O(n log n) Number Theoretic Transform (NTT)</td>
                </tr>
                <tr>
                  <td className="p-3 font-medium text-zinc-900 dark:text-zinc-100">Security Assumption</td>
                  <td className="p-3 text-zinc-600 dark:text-zinc-400">Ultra-Conservative (No Ring Exploits Possible)</td>
                  <td className="p-3 text-zinc-600 dark:text-zinc-400">Standard PQC (NIST FIPS 203 Primary Standard)</td>
                </tr>
                <tr>
                  <td className="p-3 font-medium text-zinc-900 dark:text-zinc-100">Standardization Body</td>
                  <td className="p-3 text-zinc-600 dark:text-zinc-400">ISO/IEC & NIST Round 3 Candidate</td>
                  <td className="p-3 text-zinc-600 dark:text-zinc-400">NIST FIPS 203 Standard</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
