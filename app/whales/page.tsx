'use client';

import React, { useEffect, useState } from 'react';
import { whaleTrackerEngine, WhaleEvent } from '../../lib/whale/WhaleTracker';

export default function WhaleDashboardPage() {
  const [alerts, setAlerts] = useState<WhaleEvent[]>([]);
  const [isListening, setIsListening] = useState(false);

  useEffect(() => {
    // Subscribe to the WhaleTracker event stream
    const unsubscribe = whaleTrackerEngine.subscribe((event) => {
      setAlerts((prev) => [event, ...prev].slice(0, 50)); // Keep last 50 alerts
    });

    return () => {
      unsubscribe();
      whaleTrackerEngine.stopStream();
    };
  }, []);

  const toggleStream = () => {
    if (isListening) {
      whaleTrackerEngine.stopStream();
    } else {
      whaleTrackerEngine.startStream();
    }
    setIsListening(!isListening);
  };

  return (
    <div className="min-h-screen bg-gray-950 p-8 font-sans text-gray-200">
      <div className="max-w-5xl mx-auto flex flex-col gap-8">
        
        {/* Header */}
        <div className="flex justify-between items-end border-b border-gray-800 pb-6">
          <div>
            <h1 className="text-4xl font-extrabold text-white tracking-tight mb-2">
              Whale Activity Tracker
            </h1>
            <p className="text-gray-400 max-w-xl">
              Real-time mempool analysis. We monitor the blockchain for massive transactions (>$10M USD) moving into or out of Centralized Exchanges (CEX) to detect impending market dumps or accumulations.
            </p>
          </div>
          
          <button 
            onClick={toggleStream}
            className={\`px-8 py-4 rounded-xl font-bold uppercase tracking-widest transition-all shadow-lg flex items-center gap-3 \${
              isListening 
                ? 'bg-red-900/50 text-red-400 hover:bg-red-900/70 border border-red-800' 
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/50'
            }\`}
          >
            {isListening && (
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
              </span>
            )}
            {isListening ? 'Stop Scanner' : 'Start Mempool Scanner'}
          </button>
        </div>

        {/* Live Feed */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden shadow-2xl min-h-[500px]">
          <div className="bg-gray-950/50 p-4 border-b border-gray-800 flex justify-between items-center">
            <h2 className="text-lg font-bold text-gray-100 flex items-center gap-2">
              📡 Live Alert Feed
            </h2>
            <span className="text-xs font-mono text-gray-500">Listening to Web3 RPC...</span>
          </div>

          <div className="p-6 flex flex-col gap-4 max-h-[600px] overflow-y-auto">
            {alerts.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-gray-600 space-y-4 py-20">
                <svg className="w-16 h-16 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                <p>Waiting for whale movements...</p>
              </div>
            )}

            {alerts.map((alert) => {
              const isDump = alert.type === 'DUMP_ALERT';
              return (
                <div 
                  key={alert.id} 
                  className={\`animate-in slide-in-from-top-4 fade-in duration-300 p-5 rounded-xl border flex items-center justify-between \${
                    isDump 
                      ? 'bg-red-950/30 border-red-900/50' 
                      : 'bg-emerald-950/30 border-emerald-900/50'
                  }\`}
                >
                  
                  {/* Left: Icon & Action */}
                  <div className="flex items-center gap-4 w-1/3">
                    <div className={\`w-12 h-12 rounded-full flex items-center justify-center text-2xl shadow-inner \${
                      isDump ? 'bg-red-900/50 text-red-400' : 'bg-emerald-900/50 text-emerald-400'
                    }\`}>
                      {isDump ? '📉' : '🐋'}
                    </div>
                    <div>
                      <p className={\`font-black text-lg uppercase tracking-wider \${
                        isDump ? 'text-red-400' : 'text-emerald-400'
                      }\`}>
                        {isDump ? 'Potential Dump' : 'Accumulation'}
                      </p>
                      <p className="text-gray-400 text-sm">
                        {isDump ? \`Moving to \${alert.cexName}\` : \`Moving off \${alert.cexName}\`}
                      </p>
                    </div>
                  </div>

                  {/* Middle: Value */}
                  <div className="flex flex-col items-center w-1/3 text-center">
                    <p className="text-3xl font-black text-white font-mono tracking-tight">
                      $\{alert.valueUsd.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </p>
                    <p className="text-gray-500 font-mono text-sm">
                      {alert.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })} {alert.asset}
                    </p>
                  </div>

                  {/* Right: Hash & Time */}
                  <div className="flex flex-col items-end w-1/3 text-right">
                    <p className="text-gray-400 text-xs uppercase tracking-widest mb-1 font-bold">Transaction Hash</p>
                    <a href={\`#\`} className="text-blue-400 hover:text-blue-300 font-mono text-sm mb-2 underline truncate max-w-[200px]">
                      {alert.txHash}
                    </a>
                    <p className="text-gray-600 text-xs font-mono">
                      {new Date(alert.timestamp).toLocaleTimeString()}
                    </p>
                  </div>

                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
