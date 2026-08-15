'use client';

import React, { useState } from 'react';
import { generateRsaCrtKeys, rsaSignCrt, executeBellcoreAttack, RsaCrtKey } from '@/lib/cipher/asymmetric/rsa';
import { Sparkles, ShieldAlert, Cpu, CheckCircle2, RefreshCw } from 'lucide-react';

export default function BellcoreFaultSimulator() {
  const [key, setKey] = useState<RsaCrtKey>(() => generateRsaCrtKeys(61n, 53n, 17n));
  const [message, setMessage] = useState<bigint>(65n);
  const [faultInMp, setFaultInMp] = useState<boolean>(false);
  const [signatureResult, setSignatureResult] = useState<{ signature: bigint; mp: bigint; mq: bigint } | null>(null);
  const [extractedFactor, setExtractedFactor] = useState<bigint | null>(null);

  const handleGenerateKeys = () => {
    // Use larger mock primes for demonstration
    const newKey = generateRsaCrtKeys(1009n, 1013n, 17n);
    setKey(newKey);
    setSignatureResult(null);
    setExtractedFactor(null);
  };

  const handleSign = () => {
    const res = rsaSignCrt(message, key, faultInMp);
    setSignatureResult(res);
    setExtractedFactor(null);
  };

  const handleRunAttack = () => {
    if (!signatureResult) return;
    const factor = executeBellcoreAttack(signatureResult.signature, key.e, message, key.n);
    setExtractedFactor(factor);
  };

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-sm font-inter text-neutral-900 dark:text-neutral-100">
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-neutral-200 dark:border-neutral-800">
        <div>
          <h2 className="text-xl font-bold font-playfair flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" /> RSA-CRT & Bellcore Fault Attack Simulator
          </h2>
          <p className="text-xs text-neutral-500 mt-1">Simulate CRT decryption acceleration and explore how hardware bit-flips break RSA private keys.</p>
        </div>
        <button onClick={handleGenerateKeys} className="px-3 py-1.5 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5">
          <RefreshCw className="w-3.5 h-3.5" /> Generate RSA-CRT Keys
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Parallel Execution Trace */}
        <div className="lg:col-span-2 space-y-4">
          <div className="p-5 bg-neutral-50 dark:bg-neutral-950 rounded-2xl border border-neutral-200 dark:border-neutral-800 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-amber-500" /> Parallel Sub-Ring Execution & Garner's Recombination
            </h3>

            <div className="grid grid-cols-2 gap-4 text-xs font-mono">
              <div className="p-3 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 space-y-1">
                <span className="text-neutral-400 font-bold block text-[10px]">Prime $p$ Sub-Ring</span>
                <div>$d_p = d \pmod{p-1} = {key.dp.toString()}$</div>
                <div>$m_p = c^{d_p} \pmod{p} = {signatureResult ? signatureResult.mp.toString() : '---'}$</div>
              </div>

              <div className="p-3 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 space-y-1">
                <span className="text-neutral-400 font-bold block text-[10px]">Prime $q$ Sub-Ring</span>
                <div>$d_q = d \pmod{q-1} = {key.dq.toString()}$</div>
                <div>$m_q = c^{d_q} \pmod{q} = {signatureResult ? signatureResult.mq.toString() : '---'}$</div>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between p-3 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800">
                <span className="text-xs font-semibold">Simulate Hardware Fault (Bit-flip in $m_p$):</span>
                <input
                  type="checkbox"
                  checked={faultInMp}
                  onChange={(e) => setFaultInMp(e.target.checked)}
                  className="w-4 h-4 accent-amber-500"
                />
              </div>

              <div className="flex gap-2">
                <button onClick={handleSign} className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition">
                  Generate Signature $s$
                </button>
                {signatureResult && faultInMp && (
                  <button onClick={handleRunAttack} className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs transition">
                    Execute Bellcore GCD Cryptanalysis
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Cryptanalysis Factorization Result */}
        <div className="space-y-4">
          <div className="p-5 bg-neutral-50 dark:bg-neutral-950 rounded-2xl border border-neutral-200 dark:border-neutral-800 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-amber-500" /> GCD Factorization Extractor
            </h3>

            {extractedFactor ? (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs space-y-2">
                <div className="font-bold text-red-600 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" /> Modulus Factored Successfully!
                </div>
                <div className="font-mono break-all text-neutral-700 dark:text-neutral-300">
                  Extracted Prime Factor $p = {extractedFactor.toString()}$
                </div>
                <p className="text-[11px] text-neutral-500">The private key has been completely broken using a single faulty signature via $\gcd(s'^e - m, n)$.</p>
              </div>
            ) : (
              <p className="text-xs text-neutral-400 italic">Inject a bit-flip and generate a faulty signature to execute the Bellcore fault attack.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
