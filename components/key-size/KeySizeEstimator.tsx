'use client';

import React, { useState } from 'react';
import { AlgorithmFamily, ALGORITHM_FAMILIES, getSearchSpaceString } from '../../lib/utils/keyEquivalence';
import DifficultyScale from './DifficultyScale';
import EducationalContext from './EducationalContext';

export default function KeySizeEstimator() {
  const [family, setFamily] = useState<AlgorithmFamily>('Symmetric');
  const [keyIndex, setKeyIndex] = useState(2); // Default to AES-128 / RSA-3072 / ECC-256

  const options = ALGORITHM_FAMILIES[family];
  // Safeguard index if switching families
  const safeIndex = keyIndex >= options.length ? options.length - 1 : keyIndex;
  const currentOption = options[safeIndex];

  const handleFamilyChange = (newFamily: AlgorithmFamily) => {
    setFamily(newFamily);
    // Try to find the closest security equivalent or just stick to standard (index 2)
    setKeyIndex(2);
  };

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      {/* Left Column: Interactive Controls */}
      <div className="space-y-8">
        
        {/* Family Selector */}
        <section aria-labelledby="family-heading">
          <h2 id="family-heading" className="text-sm font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-4">
            1. Select Algorithm Family
          </h2>
          <div className="flex space-x-2 p-1 rounded-xl bg-zinc-100 dark:bg-zinc-800/50">
            {(Object.keys(ALGORITHM_FAMILIES) as AlgorithmFamily[]).map((f) => (
              <button
                key={f}
                onClick={() => handleFamilyChange(f)}
                className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#00C2AE] focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-zinc-900 ${
                  family === f 
                    ? 'bg-white dark:bg-[#2A2A31] text-[#00C2AE] shadow-sm' 
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200/50 dark:hover:bg-zinc-700/50'
                }`}
                aria-pressed={family === f}
              >
                {f}
              </button>
            ))}
          </div>
        </section>

        {/* Key Size Slider */}
        <section aria-labelledby="keysize-heading">
          <h2 id="keysize-heading" className="text-sm font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-4">
            2. Adjust Key Size
          </h2>
          
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#16161A] p-6 shadow-sm">
            <div className="flex justify-between items-end mb-6">
              <div>
                <div className="text-4xl font-extrabold text-zinc-900 dark:text-zinc-100 font-mono tracking-tight">
                  {currentOption.label}
                </div>
                <div className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                  Search Space: {getSearchSpaceString(currentOption.securityBits)} combinations
                </div>
              </div>
            </div>

            <div className="relative pt-2 pb-6">
              <input 
                type="range" 
                min="0" 
                max={options.length - 1} 
                step="1"
                value={safeIndex}
                onChange={(e) => setKeyIndex(parseInt(e.target.value, 10))}
                className="w-full h-2 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-[#00C2AE] focus:outline-none focus:ring-2 focus:ring-[#00C2AE] focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-zinc-900"
                aria-label={`${family} key size`}
                aria-valuetext={currentOption.label}
              />
              <div className="absolute w-full flex justify-between text-[10px] text-zinc-400 dark:text-zinc-500 mt-2 font-mono" aria-hidden="true">
                {options.map((opt, idx) => (
                  <span 
                    key={opt.value} 
                    className={`cursor-pointer transition-colors ${idx === safeIndex ? 'text-zinc-900 dark:text-zinc-100 font-bold' : 'hover:text-zinc-600 dark:hover:text-zinc-300'}`}
                    onClick={() => setKeyIndex(idx)}
                  >
                    {opt.value}
                  </span>
                ))}
              </div>
            </div>
            
            <div className="mt-4 pt-6 border-t border-zinc-100 dark:border-zinc-800">
              <DifficultyScale securityBits={currentOption.securityBits} />
            </div>
          </div>
        </section>

      </div>

      {/* Right Column: Educational Context */}
      <div>
        <EducationalContext family={family} option={currentOption} />
      </div>
    </div>
  );
}
