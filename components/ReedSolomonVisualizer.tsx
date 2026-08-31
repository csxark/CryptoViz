import React from 'react';

interface Props {
  encoded: number[];
  errorPositions: number[];
}

// Simple grid visualizer for RS symbols
const ReedSolomonVisualizer: React.FC<Props> = ({ encoded, errorPositions }) => {
  return (
    <div className="grid grid-cols-8 gap-2 mt-4">
      {encoded.map((symbol, idx) => (
        <div
          key={`symbol-${idx}-${symbol}`}
          className={`p-2 rounded text-center border ${errorPositions.includes(idx) ? 'bg-[var(--diff-highlight-bg)] text-[var(--diff-highlight-fg)] border-[var(--diff-highlight-border)]' : 'bg-gray-200 border-gray-400'} dark:${errorPositions.includes(idx) ? 'bg-[var(--diff-highlight-bg)] text-[var(--diff-highlight-fg)]' : 'bg-gray-800'} dark:border-gray-600`}
        >
          {symbol}
        </div>
      ))}
    </div>
  );
};

export default ReedSolomonVisualizer;
