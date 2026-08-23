'use client';

/**
 * Enterprise Flash Loan Arbitrage Visualizer Component
 * 
 * Architectural Specifications:
 * - Interactive glassmorphic React dashboard for Flash Loan Arbitrage scanning and atomic execution.
 * - Displays multi-DEX price discrepancies, flash loan fee calculations, gas estimation, and net ROI telemetry.
 *
 * @module FlashLoanArbitrageVisualizer
 * @version 5.0.0
 * @author Enterprise Cryptographic Architecture Team
 */

import React, { useState, useMemo } from 'react';
import { FlashLoanArbitrageService } from '@/lib/FlashLoanArbitrageService';
import { FlashLoanExecutionResult } from '@/lib/FlashLoanArbitrageModel';

export default function FlashLoanArbitrageVisualizer() {
  const [service] = useState(() => new FlashLoanArbitrageService());
  const [, setRefreshState] = useState(0);
  const [borrowAmountUsd, setBorrowAmountUsd] = useState<number>(1000000);
  const [gasGwei, setGasGwei] = useState<number>(25);
  const [executionResult, setExecutionResult] = useState<FlashLoanExecutionResult | null>(null);

  const forceRender = () => setRefreshState(prev => prev + 1);

  const feeds = service.getState().getFeeds();
  const opportunities = useMemo(() => {
    return service.findArbitrageOpportunities(borrowAmountUsd, gasGwei);
  }, [service, borrowAmountUsd, gasGwei, feeds]);

  const handlePriceUpdate = (dexId: string, newPrice: number) => {
    service.getState().updateFeedPrice(dexId, newPrice);
    forceRender();
  };

  const handleExecute = (opp: any) => {
    const result = service.executeFlashLoanArbitrage(opp);
    setExecutionResult(result);
    forceRender();
  };

  return (
    <div className="w-full min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 font-sans">
      {/* Banner */}
      <header className="mb-8 border-b border-slate-800 pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="px-3 py-1 bg-amber-500/20 text-amber-400 text-xs font-semibold rounded-full border border-amber-500/30 uppercase tracking-wider">
              Atomic DeFi Arbitrage
            </span>
            <span className="text-slate-400 text-xs font-mono">v5.0.0 • Flash Loan Multi-Call Engine</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-300 to-emerald-400">
            Flash Loan Arbitrage & Execution Analytics
          </h1>
          <p className="text-slate-400 text-sm mt-1 max-w-3xl">
            Real-time multi-DEX price discrepancy scanner, uncollateralized flash loan fee calculation, atomic bundle execution simulator.
          </p>
        </div>
      </header>

      {/* Inputs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 shadow-xl">
          <label className="text-xs text-slate-400 font-medium block mb-2">Flash Loan Principal ($USD)</label>
          <input
            type="number"
            value={borrowAmountUsd}
            onChange={e => setBorrowAmountUsd(Math.max(1000, parseInt(e.target.value) || 0))}
            className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-slate-200 font-mono focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 shadow-xl">
          <label className="text-xs text-slate-400 font-medium block mb-2">Gas Price (Gwei)</label>
          <input
            type="number"
            value={gasGwei}
            onChange={e => setGasGwei(Math.max(1, parseInt(e.target.value) || 0))}
            className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-slate-200 font-mono focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 shadow-xl flex flex-col justify-center">
          <div className="text-xs text-slate-400 mb-1">Active Opportunities Detected</div>
          <div className="text-2xl font-bold text-amber-400 font-mono">{opportunities.filter(o => o.isViable).length} Viable</div>
        </div>
      </div>

      {/* Multi-DEX Price Feed Inputs */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 shadow-xl mb-8">
        <h2 className="text-lg font-bold text-slate-200 mb-4">Multi-DEX Price Feed Inspector</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {feeds.map(feed => (
            <div key={feed.dexId} className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
              <div className="flex justify-between items-center">
                <span className="font-bold text-amber-300 text-sm">{feed.dexName}</span>
                <span className="text-xs text-slate-500 font-mono">{feed.pairSymbol}</span>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-slate-400 block">ETH Price ($USD):</span>
                <input
                  type="number"
                  value={feed.token0PriceUsd}
                  onChange={e => handlePriceUpdate(feed.dexId, parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Opportunities Table */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 shadow-xl mb-8">
        <h2 className="text-lg font-bold text-slate-200 mb-4">Arbitrage Execution Routes</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase tracking-wider">
                <th className="py-3 px-3">Route (Buy → Sell)</th>
                <th className="py-3 px-3">Discrepancy</th>
                <th className="py-3 px-3">Flash Loan Fee</th>
                <th className="py-3 px-3">Est. Gas Fee</th>
                <th className="py-3 px-3">Net Profit ($USD)</th>
                <th className="py-3 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
              {opportunities.map(opp => (
                <tr key={opp.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-3.5 px-3 font-semibold text-slate-200">
                    {opp.buyDex} → {opp.sellDex}
                  </td>
                  <td className="py-3.5 px-3 text-amber-400 font-bold">+{opp.priceDiscrepancyPercent}%</td>
                  <td className="py-3.5 px-3 text-slate-400">${opp.flashLoanFeeUsd}</td>
                  <td className="py-3.5 px-3 text-slate-400">${opp.estimatedGasFeeUsd}</td>
                  <td className={`py-3.5 px-3 font-bold ${opp.netProfitUsd > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    ${opp.netProfitUsd.toLocaleString()} ({opp.roiPercent}%)
                  </td>
                  <td className="py-3.5 px-3 text-right">
                    <button
                      onClick={() => handleExecute(opp)}
                      disabled={!opp.isViable}
                      className={`px-3 py-1 text-xs rounded font-semibold transition-colors ${
                        opp.isViable
                          ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow'
                          : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                      }`}
                    >
                      ⚡ Execute Arbitrage
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Execution Result Log */}
      {executionResult && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 shadow-xl">
          <h2 className="text-lg font-bold text-slate-200 mb-2">EVM Atomic Execution Receipt</h2>
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-xs space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-400">Transaction Hash:</span>
              <span className="text-cyan-300">{executionResult.txHash}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Execution Status:</span>
              <span className="text-emerald-400 font-bold">✓ {executionResult.status}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Net Profit Realized:</span>
              <span className="text-emerald-400 font-bold">${executionResult.actualNetProfitUsd.toLocaleString()}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
