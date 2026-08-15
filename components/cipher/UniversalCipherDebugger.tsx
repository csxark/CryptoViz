"use client";

import React, { useState, useEffect, useRef } from "react";
import type { CipherOptions, CipherResult } from "../../lib/cipher/types";
import { useCipherWorker } from "../../lib/hooks/useCipherWorker";
import { flipBitInHex, flipBitInString, computeHexDiff } from "../../lib/utils/cipherDiff";
import { cn } from "../../lib/utils";
import { fromByteArray } from "../../lib/utils/encoding";

interface DebuggerProps {
  cipherId: string;
  action: "encrypt" | "decrypt";
  input: string;
  key: string;
  options: Record<string, unknown>;
}

export default function UniversalCipherDebugger({
  cipherId,
  action,
  input,
  key,
  options,
}: DebuggerProps) {
  const { runCipher } = useCipherWorker();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultOriginal, setResultOriginal] = useState<CipherResult | null>(null);
  const [resultFlipped, setResultFlipped] = useState<CipherResult | null>(null);
  
  const [target, setTarget] = useState<"input" | "key">("input");
  const [byteIndex, setByteIndex] = useState(0);
  const [bitOffset, setBitOffset] = useState(0);
  
  const [currentStep, setCurrentStep] = useState(0);

  // Derive an initial diff to populate maximum valid byte sizes
  const inputLen = (options.hexInput ? input.length / 2 : new TextEncoder().encode(input).length) || 1;
  const keyLen = (options.hexInput ? key.length / 2 : new TextEncoder().encode(key).length) || 1;
  
  const maxBytes = target === "input" ? Math.max(1, inputLen) : Math.max(1, keyLen);

  const runDebugger = async () => {
    setLoading(true);
    setError(null);
    try {
      const bitIndex = byteIndex * 8 + bitOffset;
      
      let flippedInput = input;
      let flippedKey = key;
      
      if (target === "input") {
        flippedInput = options.hexInput ? flipBitInHex(input, bitIndex) : flipBitInString(input, bitIndex);
      } else {
        flippedKey = options.hexInput ? flipBitInHex(key, bitIndex) : flipBitInString(key, bitIndex);
      }
      
      const runOpts: CipherOptions = {
        ...options,
        instrument: true,
      };
      
      // Run both in parallel
      const [resA, resB] = await Promise.all([
        runCipher(action, cipherId, input, key, runOpts),
        runCipher(action, cipherId, flippedInput, flippedKey, runOpts)
      ]);
      
      setResultOriginal(resA);
      setResultFlipped(resB);
      setCurrentStep(0);
    } catch (err: any) {
      setError(err.message || "Failed to run debugger");
      setResultOriginal(null);
      setResultFlipped(null);
    } finally {
      setLoading(false);
    }
  };

  const stepsLength = resultOriginal?.steps.length || 0;
  
  const renderStep = () => {
    if (!resultOriginal || !resultFlipped || stepsLength === 0) return null;
    
    const stepA = resultOriginal.steps[currentStep];
    const stepB = resultFlipped.steps[currentStep];
    
    // We only diff if outputState is hex (most block cipher steps use hex outputState)
    const isHexA = /^[0-9a-f]+$/i.test(stepA.outputState.replace(/\s+/g, ''));
    const isHexB = /^[0-9a-f]+$/i.test(stepB?.outputState?.replace(/\s+/g, '') || '');
    
    let diff = null;
    if (isHexA && isHexB && stepA.outputState.length > 10) {
      const hexA = stepA.outputState.replace(/\s+/g, '');
      const hexB = stepB.outputState.replace(/\s+/g, '');
      diff = computeHexDiff(hexA, hexB);
    }

    return (
      <div className="mt-4 border rounded-xl border-zinc-200 dark:border-zinc-800 p-4 bg-white dark:bg-zinc-900/50">
        <div className="flex justify-between items-center mb-4">
          <h4 className="font-semibold text-zinc-900 dark:text-zinc-100">
            Step {currentStep + 1}: {stepA.label}
          </h4>
          {stepA.isMilestone && (
            <span className="px-2 py-0.5 text-xs rounded-full bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200">
              Milestone
            </span>
          )}
        </div>
        
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">{stepA.note}</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="p-3 bg-zinc-50 dark:bg-zinc-950/40 rounded-lg">
            <span className="text-xs font-semibold text-zinc-500 uppercase">Trace A (Original)</span>
            <div className="mt-2 font-mono text-xs break-all text-zinc-800 dark:text-zinc-300">
              {stepA.outputState}
            </div>
          </div>
          <div className="p-3 bg-zinc-50 dark:bg-zinc-950/40 rounded-lg">
            <span className="text-xs font-semibold text-zinc-500 uppercase">Trace B (Modified)</span>
            <div className="mt-2 font-mono text-xs break-all text-zinc-800 dark:text-zinc-300">
              {stepB?.outputState || 'N/A'}
            </div>
          </div>
        </div>

        {diff && (
          <div className="p-3 bg-zinc-50 dark:bg-zinc-950/40 rounded-lg border border-teal-100 dark:border-teal-900">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-semibold text-teal-600 dark:text-teal-400 uppercase">XOR Difference</span>
              <span className="text-xs font-semibold text-zinc-500">{diff.diffCount} bit(s) flipped</span>
            </div>
            <div className="font-mono text-xs break-all leading-relaxed">
              {/* Highlight non-zero bytes */}
              {Array.from({ length: diff.xorHex.length / 2 }).map((_, i) => {
                const byteStr = diff.xorHex.substring(i * 2, i * 2 + 2);
                const isDiff = byteStr !== '00';
                return (
                  <span key={i} className={cn("inline-block w-4 mr-0.5 text-center", isDiff ? "bg-red-200 dark:bg-red-900/50 text-red-900 dark:text-red-200 font-bold rounded" : "text-zinc-400 dark:text-zinc-600")}>
                    {byteStr}
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="border rounded-xl border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 p-5">
        <h3 className="font-semibold text-lg text-zinc-900 dark:text-zinc-100 mb-4">Differential Analyzer</h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-zinc-500">Target</label>
            <select
              value={target}
              onChange={(e) => setTarget(e.target.value as "input" | "key")}
              className="p-2 border rounded-lg bg-zinc-50 dark:bg-zinc-950 text-sm outline-none dark:border-zinc-700 dark:text-zinc-200"
            >
              <option value="input">Input (Plaintext)</option>
              <option value="key">Key</option>
            </select>
          </div>
          
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-zinc-500">Byte Index (0 - {maxBytes - 1})</label>
            <input
              type="number"
              min={0}
              max={maxBytes - 1}
              value={byteIndex}
              onChange={(e) => setByteIndex(Math.min(maxBytes - 1, Math.max(0, parseInt(e.target.value) || 0)))}
              className="p-2 border rounded-lg bg-zinc-50 dark:bg-zinc-950 text-sm outline-none dark:border-zinc-700 dark:text-zinc-200"
            />
          </div>
          
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-zinc-500">Bit Offset (0 = MSB, 7 = LSB)</label>
            <input
              type="number"
              min={0}
              max={7}
              value={bitOffset}
              onChange={(e) => setBitOffset(Math.min(7, Math.max(0, parseInt(e.target.value) || 0)))}
              className="p-2 border rounded-lg bg-zinc-50 dark:bg-zinc-950 text-sm outline-none dark:border-zinc-700 dark:text-zinc-200"
            />
          </div>
        </div>
        
        <button
          onClick={runDebugger}
          disabled={loading}
          className="w-full bg-teal-600 hover:bg-teal-500 text-white font-semibold py-2 rounded-lg transition-colors disabled:opacity-50"
        >
          {loading ? "Computing Differential Trace..." : "Analyze Differential Propagation"}
        </button>
        
        {error && (
          <div className="mt-4 p-3 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 text-sm rounded-lg border border-red-200 dark:border-red-900/50">
            {error}
          </div>
        )}
      </div>

      {resultOriginal && resultFlipped && stepsLength > 0 && (
        <div>
          <div className="mb-2 flex items-center justify-between text-xs text-zinc-500">
            <span>Timeline</span>
            <span>Step {currentStep + 1} / {stepsLength}</span>
          </div>
          
          <input
            type="range"
            min={0}
            max={stepsLength - 1}
            value={currentStep}
            onChange={(e) => setCurrentStep(parseInt(e.target.value))}
            className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-zinc-200 dark:bg-zinc-700 accent-teal-600 dark:accent-teal-400"
          />
          
          <div className="flex justify-between mt-3 gap-2">
            <button
              onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
              disabled={currentStep === 0}
              className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-lg disabled:opacity-50 text-sm font-semibold hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
            >
              Previous Step
            </button>
            <button
              onClick={() => setCurrentStep(Math.min(stepsLength - 1, currentStep + 1))}
              disabled={currentStep >= stepsLength - 1}
              className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-lg disabled:opacity-50 text-sm font-semibold hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
            >
              Next Step
            </button>
          </div>
          
          {renderStep()}
        </div>
      )}
    </div>
  );
}
