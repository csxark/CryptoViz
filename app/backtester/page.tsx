'use client';

import React, { useState, useRef, useEffect } from 'react';

const DEFAULT_STRATEGY = `// Write your algorithmic strategy here.
// Available variables: tick (current candle), portfolio (balances), history (array of past candles)
// You MUST return 'BUY', 'SELL', or 'HOLD'.

// Example: Simple Moving Average Crossover (Fast vs Slow)
if (history.length < 50) return 'HOLD';

let sumFast = 0;
let sumSlow = 0;

for(let i = history.length - 10; i < history.length; i++) sumFast += history[i].close;
for(let i = history.length - 50; i < history.length; i++) sumSlow += history[i].close;

const maFast = sumFast / 10;
const maSlow = sumSlow / 50;

if (maFast > maSlow && portfolio.usd > 0) return 'BUY';
if (maFast < maSlow && portfolio.crypto > 0) return 'SELL';

return 'HOLD';
`;

export default function BacktesterPage() {
  const [code, setCode] = useState(DEFAULT_STRATEGY);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    // Initialize Web Worker
    workerRef.current = new Worker(new URL('/workers/backtest.worker.js', window.location.href));
    
    workerRef.current.onmessage = (e) => {
      const { type, progress, result, error } = e.data;
      
      if (type === 'PROGRESS') {
        setProgress(progress);
      } else if (type === 'COMPLETE') {
        setResult(result);
        setIsRunning(false);
        setProgress(100);
      } else if (type === 'ERROR') {
        setError(error);
        setIsRunning(false);
      }
    };

    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  const handleRun = () => {
    setIsRunning(true);
    setProgress(0);
    setResult(null);
    setError(null);
    
    // Post the raw stringified code to the worker sandbox
    workerRef.current?.postMessage({
      code,
      initialBalance: 10000
    });
  };

  return (
    <div className="min-h-screen bg-gray-950 p-8 text-gray-200 font-sans flex justify-center">
      <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Left Column: Code Editor */}
        <div className="flex flex-col h-[80vh]">
          <div className="bg-gray-900 border border-gray-800 rounded-t-xl p-4 flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-100">Algorithmic Editor</h2>
            <button 
              onClick={handleRun}
              disabled={isRunning}
              className={\`px-6 py-2 rounded-lg font-bold transition-all \${
                isRunning 
                  ? 'bg-gray-700 text-gray-500 cursor-not-allowed' 
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/50'
              }\`}
            >
              {isRunning ? 'Crunching Data...' : 'Run Backtest'}
            </button>
          </div>
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="flex-1 w-full bg-gray-950 border-x border-b border-gray-800 rounded-b-xl p-4 font-mono text-sm text-green-400 focus:outline-none resize-none"
            spellCheck="false"
          />
        </div>

        {/* Right Column: Execution Output */}
        <div className="flex flex-col gap-6">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h2 className="text-xl font-bold text-gray-100 mb-4">Simulation Engine</h2>
            
            {/* Progress Bar */}
            <div className="w-full bg-gray-800 rounded-full h-4 mb-2 overflow-hidden">
              <div 
                className="bg-blue-600 h-4 rounded-full transition-all duration-300 ease-out" 
                style={{ width: \`\${progress}%\` }}
              ></div>
            </div>
            <p className="text-right text-xs text-gray-500 font-mono">{progress}% Iterated</p>
            
            {error && (
              <div className="mt-4 p-4 bg-red-900/30 border border-red-800 text-red-400 rounded-lg font-mono text-sm">
                ⚠️ Worker Error: {error}
              </div>
            )}
          </div>

          {/* Results Dashboard */}
          {result && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 grid grid-cols-2 gap-4">
              <div className="col-span-2 mb-4 border-b border-gray-800 pb-4">
                <h3 className="text-gray-400 text-sm font-bold uppercase tracking-wider">Final Portfolio Value</h3>
                <p className="text-4xl font-black text-white">$\{(Number(result.finalBalance)).toLocaleString()}</p>
              </div>

              <div className="p-4 bg-gray-950 rounded-lg">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Net Profit</p>
                <p className={\`text-xl font-bold \${Number(result.pnl) >= 0 ? 'text-emerald-500' : 'text-red-500'}\`}>
                  {Number(result.pnl) >= 0 ? '+' : ''}${(Number(result.pnl)).toLocaleString()}
                </p>
              </div>

              <div className="p-4 bg-gray-950 rounded-lg">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Total Return</p>
                <p className={\`text-xl font-bold \${Number(result.pnlPercent) >= 0 ? 'text-emerald-500' : 'text-red-500'}\`}>
                  {Number(result.pnlPercent) >= 0 ? '+' : ''}{result.pnlPercent}%
                </p>
              </div>

              <div className="p-4 bg-gray-950 rounded-lg">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Total Trades</p>
                <p className="text-xl font-bold text-gray-200">{result.trades}</p>
              </div>

              <div className="p-4 bg-gray-950 rounded-lg">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Max Drawdown</p>
                <p className="text-xl font-bold text-red-400">-{result.maxDrawdown}%</p>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
