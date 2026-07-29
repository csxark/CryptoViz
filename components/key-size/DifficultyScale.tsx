import React from 'react';
import { motion } from 'framer-motion';

interface DifficultyScaleProps {
  securityBits: number;
}

export default function DifficultyScale({ securityBits }: DifficultyScaleProps) {
  // We cap visual width to 256 for the scale
  const maxScaleBits = 256;
  const percentage = Math.min((securityBits / maxScaleBits) * 100, 100);

  let fillColor = 'bg-red-500';
  if (securityBits >= 112 && securityBits < 128) fillColor = 'bg-yellow-500';
  if (securityBits >= 128 && securityBits < 192) fillColor = 'bg-[#00C2AE]';
  if (securityBits >= 192) fillColor = 'bg-teal-600';

  return (
    <div className="w-full space-y-4">
      <div className="flex justify-between items-end">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          Relative Security Level (Bits)
        </h3>
        <span className="text-xs font-mono font-medium text-zinc-500 dark:text-zinc-400" aria-live="polite">
          {securityBits}-bit Equivalent
        </span>
      </div>

      <div 
        className="relative h-6 w-full rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden shadow-inner"
        role="progressbar"
        aria-valuenow={securityBits}
        aria-valuemin={0}
        aria-valuemax={maxScaleBits}
        aria-label={`Security strength: ${securityBits} bits`}
      >
        <motion.div
          className={`absolute left-0 top-0 h-full rounded-full ${fillColor}`}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
        
        {/* Scale Markers */}
        <div className="absolute inset-0 flex justify-between px-2 text-[10px] font-mono text-zinc-600 dark:text-zinc-400 items-center pointer-events-none opacity-50">
          <span>0</span>
          <span>128</span>
          <span>256+</span>
        </div>
      </div>

      <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
        This scale represents the estimated computational cost to brute-force the key. 
        Each additional bit doubles the required effort (2<sup>N</sup>). 
        NIST recommends a minimum of 112 bits for legacy data and 128 bits for new systems.
      </p>
    </div>
  );
}
