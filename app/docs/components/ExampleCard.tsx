import React from 'react';

interface Step {
  description: string;
  result: string;
}

interface ExampleCardProps {
  plaintext: string;
  parameters: string;
  steps: Step[];
  finalCiphertext: string;
}

export const ExampleCard: React.FC<ExampleCardProps> = ({ plaintext, parameters, steps, finalCiphertext }) => {
  return (
<div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden my-6 shadow-sm dark:shadow-xl transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md dark:hover:shadow-2xl">      {/* Header */}
      <div className="bg-zinc-50 dark:bg-zinc-900/40 p-4 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center transition-colors">
        <div>
          <span className="text-xs text-zinc-500 dark:text-zinc-400 font-mono block mb-1">Plaintext</span>
          <span className="text-zinc-900 dark:text-white font-mono font-bold tracking-widest">{plaintext}</span>
        </div>
        <div className="text-right">
          <span className="text-xs text-zinc-500 dark:text-zinc-400 font-mono block mb-1">Parameters</span>
          <span className="text-teal-600 dark:text-teal-400 font-mono text-sm">{parameters}</span>
        </div>
      </div>

      {/* Steps */}
      <div className="p-4 space-y-3">
        {steps.map((step, index) => (
          <div key={`step-${index}-${step.description.slice(0, 20)}`} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm font-mono pb-3 border-b border-zinc-200 dark:border-zinc-800/50 last:border-0 last:pb-0 transition-colors">
            <span className="text-zinc-400 dark:text-zinc-500 min-w-[24px]">
              {(index + 1).toString().padStart(2, '0')}
            </span>
            <span className="text-zinc-600 dark:text-zinc-400 flex-1">{step.description}</span>
            <span className="text-teal-600 dark:text-teal-400 font-bold bg-teal-500/10 px-2 py-0.5 rounded">
              {step.result}
            </span>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="bg-teal-50 dark:bg-teal-500/5 p-4 border-t border-teal-200 dark:border-teal-500/20 flex justify-between items-center transition-colors">
        <span className="text-xs text-teal-600/70 dark:text-teal-500/70 font-mono font-bold uppercase tracking-widest">Final Ciphertext</span>
        <span className="text-teal-600 dark:text-teal-400 font-mono font-bold text-lg tracking-widest">{finalCiphertext}</span>
      </div>
    </div>
  );
};
