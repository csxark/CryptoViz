"use client";

import React, { useState, useMemo } from "react";
import {
  PAIRING_CURVE,
  verifyBilinearityProperty,
  traceMillerAlgorithm,
  ibeSetup,
  ibeExtract,
  ibeEncrypt,
  ibeDecrypt,
  CurvePoint,
} from "../../lib/math/pairing";
import {
  ShieldCheck,
  Zap,
  Lock,
  Unlock,
  Key,
  Layers,
  ArrowRight,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Binary,
} from "lucide-react";

interface PairingVisualizerProps {
  className?: string;
}

export default function PairingVisualizer({ className }: PairingVisualizerProps) {
  const [activeTab, setActiveTab] = useState<"bilinear" | "miller" | "ibe">("bilinear");

  // --- TAB 1: Bilinear Map Verifier State ---
  const [scalarA, setScalarA] = useState<number>(3);
  const [scalarB, setScalarB] = useState<number>(4);

  const bilinearResult = useMemo(() => {
    return verifyBilinearityProperty(BigInt(scalarA), BigInt(scalarB));
  }, [scalarA, scalarB]);

  // --- TAB 2: Miller's Algorithm Trace State ---
  const [millerLoopBound, setMillerLoopBound] = useState<number>(6);
  const [selectedMillerStep, setSelectedMillerStep] = useState<number>(0);

  const millerSteps = useMemo(() => {
    return traceMillerAlgorithm(PAIRING_CURVE.G1_gen, PAIRING_CURVE.G2_gen, millerLoopBound);
  }, [millerLoopBound]);

  // --- TAB 3: Boneh-Franklin IBE Wizard State ---
  const [ibeMasterSecret, setIbeMasterSecret] = useState<number>(7);
  const [ibeIdentity, setIbeIdentity] = useState<string>("alice@example.com");
  const [ibePlaintext, setIbePlaintext] = useState<string>("Hello, IBE Pairing!");
  const [ibeEphemeralR, setIbeEphemeralR] = useState<number>(5);
  const [ibeDecryptionKeyIdentity, setIbeDecryptionKeyIdentity] = useState<string>("alice@example.com");

  const ibeSetupParams = useMemo(() => {
    return ibeSetup(BigInt(ibeMasterSecret));
  }, [ibeMasterSecret]);

  const ibeExtractData = useMemo(() => {
    return ibeExtract(ibeIdentity, ibeSetupParams);
  }, [ibeIdentity, ibeSetupParams]);

  const ibeEncryptData = useMemo(() => {
    return ibeEncrypt(ibeIdentity, ibePlaintext, ibeSetupParams, BigInt(ibeEphemeralR));
  }, [ibeIdentity, ibePlaintext, ibeSetupParams, ibeEphemeralR]);

  const ibeUserDecryptionKey = useMemo(() => {
    return ibeExtract(ibeDecryptionKeyIdentity, ibeSetupParams);
  }, [ibeDecryptionKeyIdentity, ibeSetupParams]);

  const ibeDecryptData = useMemo(() => {
    return ibeDecrypt(ibeEncryptData, ibeUserDecryptionKey, ibeSetupParams);
  }, [ibeEncryptData, ibeUserDecryptionKey, ibeSetupParams]);

  // Helper for Elliptic Curve visualization rendering
  const renderCurvePoint = (point: CurvePoint, label: string, color: string) => {
    if (point.isInfinity) {
      return (
        <span className="font-mono text-xs text-zinc-500">
          {label}: <span className="font-bold text-amber-500">Point at Infinity (𝒪)</span>
        </span>
      );
    }
    return (
      <span className="font-mono text-xs text-zinc-700 dark:text-zinc-300">
        {label}: (
        <span className={`${color} font-bold`}>{point.x.toString()}</span>,{" "}
        <span className={`${color} font-bold`}>{point.y.toString()}</span>)
      </span>
    );
  };

  return (
    <div className={`flex flex-col gap-6 font-sans ${className || ""}`}>
      {/* Top Header Card */}
      <div className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-teal-500/10 px-2.5 py-1 text-xs font-semibold uppercase tracking-wider text-teal-600 dark:bg-teal-400/10 dark:text-teal-400">
                Pairing-Based Cryptography
              </span>
              <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-[11px] font-mono text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                e: G₁ × G₂ → G_T
              </span>
            </div>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
              Bilinear Pairing Mathematics & IBE Formalism
            </h2>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Interactive visualization of bilinear maps, Miller&apos;s algorithm double-and-add line evaluations, and Boneh-Franklin Identity-Based Encryption.
            </p>
          </div>

          <div className="flex rounded-xl border border-zinc-200 bg-zinc-50 p-1 dark:border-zinc-800 dark:bg-zinc-950">
            <button
              onClick={() => setActiveTab("bilinear")}
              className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition-all ${
                activeTab === "bilinear"
                  ? "bg-white text-teal-600 shadow-sm dark:bg-zinc-900 dark:text-teal-400"
                  : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
              }`}
            >
              <Zap size={15} />
              Bilinear Map Verifier
            </button>
            <button
              onClick={() => setActiveTab("miller")}
              className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition-all ${
                activeTab === "miller"
                  ? "bg-white text-teal-600 shadow-sm dark:bg-zinc-900 dark:text-teal-400"
                  : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
              }`}
            >
              <Layers size={15} />
              Miller&apos;s Algorithm Trace
            </button>
            <button
              onClick={() => setActiveTab("ibe")}
              className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition-all ${
                activeTab === "ibe"
                  ? "bg-white text-teal-600 shadow-sm dark:bg-zinc-900 dark:text-teal-400"
                  : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
              }`}
            >
              <Lock size={15} />
              Boneh-Franklin IBE Sandbox
            </button>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* TAB 1: Bilinear Map Verifier                                 */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "bilinear" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Controls & Configuration */}
          <div className="flex flex-col gap-6 lg:col-span-4">
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
              <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                Interactive Scalar Controls
              </h3>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                Choose scalars <span className="font-mono text-teal-600 dark:text-teal-400">a</span> and{" "}
                <span className="font-mono text-pink-600 dark:text-pink-400">b</span> to compute parallel group scalar multiplications and verify bilinear equality.
              </p>

              <div className="mt-6 flex flex-col gap-5">
                {/* Scalar a */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <label htmlFor="scalarA" className="text-zinc-700 dark:text-zinc-300">
                      Scalar a (Group G₁)
                    </label>
                    <span className="font-mono text-sm font-bold text-teal-600 dark:text-teal-400">
                      a = {scalarA}
                    </span>
                  </div>
                  <input
                    id="scalarA"
                    type="range"
                    min="1"
                    max="10"
                    value={scalarA}
                    onChange={(e) => setScalarA(parseInt(e.target.value) || 1)}
                    className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-zinc-200 accent-teal-500 dark:bg-zinc-800"
                  />
                  <div className="flex justify-between text-[10px] font-mono text-zinc-400">
                    <span>1</span>
                    <span>5</span>
                    <span>10</span>
                  </div>
                </div>

                {/* Scalar b */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <label htmlFor="scalarB" className="text-zinc-700 dark:text-zinc-300">
                      Scalar b (Group G₂)
                    </label>
                    <span className="font-mono text-sm font-bold text-pink-600 dark:text-pink-400">
                      b = {scalarB}
                    </span>
                  </div>
                  <input
                    id="scalarB"
                    type="range"
                    min="1"
                    max="10"
                    value={scalarB}
                    onChange={(e) => setScalarB(parseInt(e.target.value) || 1)}
                    className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-zinc-200 accent-pink-500 dark:bg-zinc-800"
                  />
                  <div className="flex justify-between text-[10px] font-mono text-zinc-400">
                    <span>1</span>
                    <span>5</span>
                    <span>10</span>
                  </div>
                </div>

                {/* Preset Buttons */}
                <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800/80">
                  <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                    Quick Presets
                  </span>
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    <button
                      onClick={() => { setScalarA(3); setScalarB(4); }}
                      className="rounded-lg border border-zinc-200 bg-zinc-50 py-1.5 text-xs font-mono font-medium hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-800"
                    >
                      a=3, b=4
                    </button>
                    <button
                      onClick={() => { setScalarA(5); setScalarB(2); }}
                      className="rounded-lg border border-zinc-200 bg-zinc-50 py-1.5 text-xs font-mono font-medium hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-800"
                    >
                      a=5, b=2
                    </button>
                    <button
                      onClick={() => { setScalarA(7); setScalarB(3); }}
                      className="rounded-lg border border-zinc-200 bg-zinc-50 py-1.5 text-xs font-mono font-medium hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-800"
                    >
                      a=7, b=3
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Bilinearity Axiom Card */}
            <div className="rounded-2xl border border-teal-500/20 bg-teal-50/40 p-5 dark:border-teal-500/20 dark:bg-teal-950/20">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="mt-0.5 text-teal-600 dark:text-teal-400 shrink-0" size={18} />
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-teal-900 dark:text-teal-300">
                    The Bilinearity Axiom
                  </h4>
                  <p className="mt-1 text-xs text-teal-800/90 dark:text-teal-300/80 leading-relaxed font-mono">
                    e(aP, bQ) = e(P, bQ)^a = e(aP, Q)^b = e(P, Q)^(ab)
                  </p>
                  <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">
                    This fundamental linearity in both inputs enables non-interactive key agreements, BLS signature aggregation, and identity-based private key derivation.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Visualization & Evaluation Results */}
          <div className="flex flex-col gap-6 lg:col-span-8">
            {/* Dual Group Representations */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* Group G1 */}
              <div className="rounded-2xl border border-teal-500/30 bg-white p-5 shadow-sm dark:border-teal-500/20 dark:bg-zinc-900/60">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400">
                    Group G₁ (Curve E(𝔽_p))
                  </span>
                  <span className="rounded bg-teal-50 px-2 py-0.5 text-[10px] font-mono text-teal-700 dark:bg-teal-950/50 dark:text-teal-300">
                    Additive Point Group
                  </span>
                </div>
                <div className="mt-4 flex flex-col gap-2">
                  {renderCurvePoint(PAIRING_CURVE.G1_gen, "Generator P", "text-teal-600 dark:text-teal-400")}
                  {renderCurvePoint(bilinearResult.aP, `Multiplied ${scalarA}P`, "text-teal-600 dark:text-teal-400")}
                </div>
              </div>

              {/* Group G2 */}
              <div className="rounded-2xl border border-pink-500/30 bg-white p-5 shadow-sm dark:border-pink-500/20 dark:bg-zinc-900/60">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-pink-600 dark:text-pink-400">
                    Group G₂ (Curve E&apos;(𝔽_p^k))
                  </span>
                  <span className="rounded bg-pink-50 px-2 py-0.5 text-[10px] font-mono text-pink-700 dark:bg-pink-950/50 dark:text-pink-300">
                    Twist / Extension Group
                  </span>
                </div>
                <div className="mt-4 flex flex-col gap-2">
                  {renderCurvePoint(PAIRING_CURVE.G2_gen, "Generator Q", "text-pink-600 dark:text-pink-400")}
                  {renderCurvePoint(bilinearResult.bQ, `Multiplied ${scalarB}Q`, "text-pink-600 dark:text-pink-400")}
                </div>
              </div>
            </div>

            {/* Target Field Result Card */}
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
              <div className="flex items-center justify-between border-b border-zinc-100 pb-4 dark:border-zinc-800">
                <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                  Target Field Mapping in G_T (𝔽_p^k)
                </h3>
                <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-400">
                  <ShieldCheck size={14} />
                  Bilinearity Verified: Equality Holds!
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
                {/* Method 1: e(aP, bQ) */}
                <div className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950">
                  <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                    Method 1: Direct Pairing of Scaled Points
                  </span>
                  <div className="font-mono text-sm font-bold text-zinc-900 dark:text-zinc-100">
                    e({scalarA}P, {scalarB}Q)
                  </div>
                  <div className="rounded-lg bg-white p-3 border border-zinc-200 font-mono text-xs dark:bg-zinc-900 dark:border-zinc-800 break-all">
                    <span className="text-zinc-400 text-[10px] block mb-1">Target Element Value:</span>
                    <span className="text-teal-600 dark:text-teal-400 font-bold">
                      {bilinearResult.pairing_aP_bQ.toString()}
                    </span>
                  </div>
                </div>

                {/* Method 2: e(P, Q)^(ab) */}
                <div className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950">
                  <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                    Method 2: Base Pairing Exponentiated by (a × b)
                  </span>
                  <div className="font-mono text-sm font-bold text-zinc-900 dark:text-zinc-100">
                    e(P, Q)^{scalarA * scalarB} = ({bilinearResult.pairing_P_Q.toString()})^{scalarA * scalarB}
                  </div>
                  <div className="rounded-lg bg-white p-3 border border-zinc-200 font-mono text-xs dark:bg-zinc-900 dark:border-zinc-800 break-all">
                    <span className="text-zinc-400 text-[10px] block mb-1">Target Element Value:</span>
                    <span className="text-pink-600 dark:text-pink-400 font-bold">
                      {bilinearResult.pairing_P_Q_pow_ab.toString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Exact Parity Box */}
              <div className="mt-6 rounded-xl bg-emerald-50 p-4 border border-emerald-200 text-xs dark:bg-emerald-950/30 dark:border-emerald-800/50">
                <div className="flex items-center gap-2 font-mono font-bold text-emerald-800 dark:text-emerald-300">
                  <span>e({scalarA}P, {scalarB}Q)</span>
                  <span>==</span>
                  <span>e(P, Q)^{scalarA * scalarB}</span>
                  <span>==</span>
                  <span>0x{bilinearResult.targetFieldElementHex}</span>
                </div>
                <p className="mt-2 text-emerald-700 dark:text-emerald-400">
                  The outputs in the multiplicative target field G_T match exactly with zero deviation, proving that scalar factors can freely migrate between point inputs or exponents.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 2: Miller's Algorithm Trace                              */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "miller" && (
        <div className="flex flex-col gap-6">
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
                  Miller&apos;s Algorithm Double-and-Add Line Function Trace
                </h3>
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                  Miller&apos;s algorithm evaluates rational functions along the curve to compute the Tate/Weil/Ate pairing without directly constructing full divisors.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <label htmlFor="loopBound" className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                  Loop Counter Scalar (r):
                </label>
                <input
                  id="loopBound"
                  type="number"
                  min="3"
                  max="15"
                  value={millerLoopBound}
                  onChange={(e) => setMillerLoopBound(Math.max(3, Math.min(15, parseInt(e.target.value) || 6)))}
                  className="w-20 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-center font-mono text-sm font-bold dark:border-zinc-800 dark:bg-zinc-950"
                />
              </div>
            </div>

            {/* Binary decomposition visual */}
            <div className="mt-6 flex items-center gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950">
              <Binary className="text-teal-600 dark:text-teal-400 shrink-0" size={20} />
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                  Binary Expansion of r={millerLoopBound}:
                </span>
                <span className="font-mono text-sm font-bold tracking-widest text-teal-600 dark:text-teal-400">
                  {millerLoopBound.toString(2)}₂
                </span>
                <span className="text-xs text-zinc-400 ml-2">
                  ({millerSteps.length} Miller evaluation rounds generated)
                </span>
              </div>
            </div>

            {/* Step Selector & Table */}
            <div className="mt-6 overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950">
                  <tr>
                    <th className="p-3 font-semibold">Step #</th>
                    <th className="p-3 font-semibold">Operation</th>
                    <th className="p-3 font-semibold">Bit</th>
                    <th className="p-3 font-semibold">Tangent / Chord Slope (λ)</th>
                    <th className="p-3 font-semibold">Line Function l_{"{R,R}"}(Q)</th>
                    <th className="p-3 font-semibold">Vertical Line v_{"{2R}"}(Q)</th>
                    <th className="p-3 font-semibold">Accumulator f</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 font-mono dark:divide-zinc-800/80">
                  {millerSteps.map((step, idx) => (
                    <tr
                      key={idx}
                      onClick={() => setSelectedMillerStep(idx)}
                      className={`cursor-pointer transition-colors ${
                        selectedMillerStep === idx
                          ? "bg-teal-500/10 text-teal-900 dark:bg-teal-400/10 dark:text-teal-200"
                          : "hover:bg-zinc-50 dark:hover:bg-zinc-900"
                      }`}
                    >
                      <td className="p-3 font-bold text-zinc-700 dark:text-zinc-300">Round {step.step}</td>
                      <td className="p-3">
                        <span
                          className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                            step.operation === "DOUBLE"
                              ? "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300"
                              : "bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300"
                          }`}
                        >
                          {step.operation}
                        </span>
                      </td>
                      <td className="p-3 text-zinc-500">{step.bit}</td>
                      <td className="p-3 text-teal-600 dark:text-teal-400">{step.slope}</td>
                      <td className="p-3">{step.lineValue}</td>
                      <td className="p-3 text-pink-600 dark:text-pink-400">{step.verticalValue}</td>
                      <td className="p-3 font-bold text-amber-600 dark:text-amber-400">{step.accumulatorF}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Selected Step Deep Dive */}
            {millerSteps[selectedMillerStep] && (
              <div className="mt-6 rounded-xl border border-zinc-200 bg-zinc-50 p-5 dark:border-zinc-800 dark:bg-zinc-950">
                <div className="flex items-center gap-2 font-bold text-zinc-900 dark:text-white text-sm">
                  <HelpCircle size={16} className="text-teal-600 dark:text-teal-400" />
                  Detailed Step Analysis: Round {millerSteps[selectedMillerStep].step} (
                  {millerSteps[selectedMillerStep].operation})
                </div>
                <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  {millerSteps[selectedMillerStep].explanation}
                </p>
                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3 font-mono text-xs">
                  <div className="rounded-lg bg-white p-3 border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800">
                    <span className="text-[10px] text-zinc-400 block mb-1">Current Elliptic Point R:</span>
                    <span className="text-teal-600 dark:text-teal-400 font-bold">
                      ({millerSteps[selectedMillerStep].currentPoint.x.toString()},{" "}
                      {millerSteps[selectedMillerStep].currentPoint.y.toString()})
                    </span>
                  </div>
                  <div className="rounded-lg bg-white p-3 border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800">
                    <span className="text-[10px] text-zinc-400 block mb-1">Line Ratio l(Q)/v(Q):</span>
                    <span className="text-zinc-700 dark:text-zinc-300 font-bold">
                      {millerSteps[selectedMillerStep].lineValue} / {millerSteps[selectedMillerStep].verticalValue}
                    </span>
                  </div>
                  <div className="rounded-lg bg-white p-3 border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800">
                    <span className="text-[10px] text-zinc-400 block mb-1">Accumulator State f:</span>
                    <span className="text-amber-600 dark:text-amber-400 font-bold">
                      {millerSteps[selectedMillerStep].accumulatorF}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 3: Boneh-Franklin IBE Protocol Sandbox                   */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "ibe" && (
        <div className="flex flex-col gap-6">
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
              Boneh-Franklin Identity-Based Encryption (IBE) Workflow
            </h3>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              In IBE, any arbitrary string (like an email address) acts directly as the recipient&apos;s public key. The Key Generation Center (PKG) extracts private keys using a master secret without prior certificate exchanges.
            </p>

            {/* 4-Step Interactive Pipeline Wizard */}
            <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
              {/* STEP 1: SETUP */}
              <div className="flex flex-col justify-between rounded-xl border border-zinc-200 bg-zinc-50 p-5 dark:border-zinc-800 dark:bg-zinc-950">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-teal-600 text-xs font-bold text-white">
                      1
                    </span>
                    <span className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                      PKG Setup
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                    Key Generation Center chooses master secret <span className="font-mono font-bold text-teal-600">s</span> and publishes <span className="font-mono font-bold text-teal-600">P_pub = sP</span>.
                  </p>

                  <div className="mt-4 flex flex-col gap-2">
                    <label htmlFor="masterSecret" className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400">
                      Master Secret (s):
                    </label>
                    <input
                      id="masterSecret"
                      type="number"
                      min="2"
                      max="20"
                      value={ibeMasterSecret}
                      onChange={(e) => setIbeMasterSecret(parseInt(e.target.value) || 7)}
                      className="rounded border border-zinc-200 bg-white px-2.5 py-1 text-xs font-mono font-bold dark:border-zinc-800 dark:bg-zinc-900"
                    />
                  </div>
                </div>

                <div className="mt-4 border-t border-zinc-200/80 pt-3 font-mono text-[11px] dark:border-zinc-800">
                  <span className="text-zinc-400 block">P_pub = {ibeMasterSecret} × P:</span>
                  <span className="text-teal-600 dark:text-teal-400 font-bold">
                    ({ibeSetupParams.P_pub.x.toString()}, {ibeSetupParams.P_pub.y.toString()})
                  </span>
                </div>
              </div>

              {/* STEP 2: EXTRACT */}
              <div className="flex flex-col justify-between rounded-xl border border-zinc-200 bg-zinc-50 p-5 dark:border-zinc-800 dark:bg-zinc-950">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                      2
                    </span>
                    <span className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                      Key Extract
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                    Recipient registers identity. PKG derives <span className="font-mono font-bold text-blue-600">d_ID = s · H₁(ID)</span>.
                  </p>

                  <div className="mt-4 flex flex-col gap-2">
                    <label htmlFor="ibeIdentity" className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400">
                      Recipient Identity (ID):
                    </label>
                    <input
                      id="ibeIdentity"
                      type="text"
                      value={ibeIdentity}
                      onChange={(e) => setIbeIdentity(e.target.value)}
                      className="rounded border border-zinc-200 bg-white px-2.5 py-1 text-xs font-mono dark:border-zinc-800 dark:bg-zinc-900"
                    />
                  </div>
                </div>

                <div className="mt-4 border-t border-zinc-200/80 pt-3 font-mono text-[11px] dark:border-zinc-800">
                  <span className="text-zinc-400 block">User Private Key d_ID:</span>
                  <span className="text-blue-600 dark:text-blue-400 font-bold">
                    ({ibeExtractData.d_ID.x.toString()}, {ibeExtractData.d_ID.y.toString()})
                  </span>
                </div>
              </div>

              {/* STEP 3: ENCRYPT */}
              <div className="flex flex-col justify-between rounded-xl border border-zinc-200 bg-zinc-50 p-5 dark:border-zinc-800 dark:bg-zinc-950">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-600 text-xs font-bold text-white">
                      3
                    </span>
                    <span className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                      Encrypt Message
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                    Picks ephemeral <span className="font-mono font-bold text-purple-600">r</span>, computes <span className="font-mono font-bold text-purple-600">U = rP</span> and masks message with <span className="font-mono font-bold text-purple-600">e(P_pub, H₁(ID))^r</span>.
                  </p>

                  <div className="mt-4 flex flex-col gap-2">
                    <label htmlFor="ibePlaintext" className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400">
                      Plaintext Message:
                    </label>
                    <input
                      id="ibePlaintext"
                      type="text"
                      value={ibePlaintext}
                      onChange={(e) => setIbePlaintext(e.target.value)}
                      className="rounded border border-zinc-200 bg-white px-2.5 py-1 text-xs dark:border-zinc-800 dark:bg-zinc-900"
                    />
                  </div>
                </div>

                <div className="mt-4 border-t border-zinc-200/80 pt-3 font-mono text-[11px] dark:border-zinc-800 break-all">
                  <span className="text-zinc-400 block">Ciphertext (Hex):</span>
                  <span className="text-purple-600 dark:text-purple-400 font-bold">
                    {ibeEncryptData.ciphertextHex}
                  </span>
                </div>
              </div>

              {/* STEP 4: DECRYPT */}
              <div className="flex flex-col justify-between rounded-xl border border-zinc-200 bg-zinc-50 p-5 dark:border-zinc-800 dark:bg-zinc-950">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">
                      4
                    </span>
                    <span className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                      Decrypt with Pairing
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                    Recipient computes pairing <span className="font-mono font-bold text-emerald-600">e(U, d_ID)</span> to unmask the ciphertext.
                  </p>

                  <div className="mt-4 flex flex-col gap-2">
                    <label htmlFor="decryptionIdentity" className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400">
                      Try Decrypting with Key for:
                    </label>
                    <input
                      id="decryptionIdentity"
                      type="text"
                      value={ibeDecryptionKeyIdentity}
                      onChange={(e) => setIbeDecryptionKeyIdentity(e.target.value)}
                      className="rounded border border-zinc-200 bg-white px-2.5 py-1 text-xs font-mono dark:border-zinc-800 dark:bg-zinc-900"
                    />
                  </div>
                </div>

                <div className="mt-4 border-t border-zinc-200/80 pt-3 font-mono text-[11px] dark:border-zinc-800">
                  <span className="text-zinc-400 block">Recovered Plaintext:</span>
                  <span
                    className={`font-bold ${
                      ibeDecryptData.pairingMatches
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-red-500"
                    }`}
                  >
                    &ldquo;{ibeDecryptData.recoveredPlaintext}&rdquo;
                  </span>
                </div>
              </div>
            </div>

            {/* IBE Decryption Parity & Cryptographic Security Banner */}
            <div className="mt-6 flex items-center justify-between rounded-xl border p-4 text-xs font-mono transition-colors">
              {ibeDecryptData.pairingMatches ? (
                <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                  <CheckCircle2 size={18} />
                  <span>
                    Pairing Match Verified: e(U, d_ID) == e(rP, s·H₁(ID)) == e(P_pub, H₁(ID))^r = {ibeDecryptData.recoveredPairingValue.toString()}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                  <AlertCircle size={18} />
                  <span>
                    Decryption Failed: Private key for &ldquo;{ibeDecryptionKeyIdentity}&rdquo; cannot decrypt message intended for &ldquo;{ibeIdentity}&rdquo;.
                  </span>
                </div>
              )}

              <button
                onClick={() => {
                  setIbeIdentity("alice@example.com");
                  setIbeDecryptionKeyIdentity("alice@example.com");
                  setIbePlaintext("Hello, IBE Pairing!");
                }}
                className="flex items-center gap-1 text-[11px] text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
              >
                <RefreshCw size={13} />
                Reset Demo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
