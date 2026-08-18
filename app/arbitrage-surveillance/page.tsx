'use client';

import React, { useState } from 'react';
import {
  CryptoArbitrageServiceHandler,
} from '../../lib/CryptoArbitrageService';
import {
  FlashLoanArbitrageOpportunity,
  ArbitrageExecutionRecord,
  ArbitrageFilterOptions,
} from '../../lib/CryptoArbitrageModel';
import { ArbitrageOpportunityCard } from '../../components/arbitrage/ArbitrageOpportunityCard';
import { ArbitrageExecutionTimeline } from '../../components/arbitrage/ArbitrageExecutionTimeline';
import {
  Zap,
  Search,
  Filter,
  PlusCircle,
  Sparkles,
  CheckCircle2,
  X,
  TrendingUp,
  Activity,
} from 'lucide-react';

export default function CryptoArbitrageSurveillanceDashboardPage() {
  const [opportunities, setOpportunities] = useState<FlashLoanArbitrageOpportunity[]>(() =>
    CryptoArbitrageServiceHandler.fetchOpportunities()
  );
  const [records, setRecords] = useState<ArbitrageExecutionRecord[]>(() =>
    CryptoArbitrageServiceHandler.fetchExecutionRecords()
  );

  const [filters, setFilters] = useState<ArbitrageFilterOptions>({
    borrowAsset: 'All',
    executionRisk: 'All',
    searchQuery: '',
  });

  const [selectedOpportunity, setSelectedOpportunity] = useState<FlashLoanArbitrageOpportunity | null>(null);
  const [isExecutionSuccess, setIsExecutionSuccess] = useState<boolean>(false);

  // Register Modal State
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [newPair, setNewPair] = useState<string>('WETH / USDT');
  const [newSourceDex, setNewSourceDex] = useState<string>('Uniswap V3');
  const [newTargetDex, setNewTargetDex] = useState<string>('Balancer');
  const [newBorrowAsset, setNewBorrowAsset] = useState<string>('WETH');
  const [newLoanAmount, setNewLoanAmount] = useState<number>(300000);
  const [newGrossProfit, setNewGrossProfit] = useState<number>(3500);
  const [newGasFee, setNewGasFee] = useState<number>(450);
  const [newRisk, setNewRisk] = useState<'low' | 'moderate' | 'high' | 'extreme'>('low');

  const applyFilterChanges = (updatedFilters: Partial<ArbitrageFilterOptions>) => {
    const nextFilters = { ...filters, ...updatedFilters };
    setFilters(nextFilters);
    setOpportunities(CryptoArbitrageServiceHandler.fetchOpportunities(nextFilters));
  };

  const handleExecuteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOpportunity) return;

    CryptoArbitrageServiceHandler.executeArbitrageBotTrade(selectedOpportunity.id);

    setRecords(CryptoArbitrageServiceHandler.fetchExecutionRecords());
    setIsExecutionSuccess(true);
    setTimeout(() => {
      setIsExecutionSuccess(false);
      setSelectedOpportunity(null);
    }, 1800);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const netProfit = newGrossProfit - newGasFee;
    const margin = Number(((netProfit / newLoanAmount) * 100).toFixed(2));

    CryptoArbitrageServiceHandler.registerNewOpportunity({
      tokenPair: newPair,
      sourceDex: newSourceDex,
      targetDex: newTargetDex,
      borrowAsset: newBorrowAsset,
      loanAmountUsd: newLoanAmount,
      expectedGrossProfitUsd: newGrossProfit,
      estimatedGasFeeUsd: newGasFee,
      netProfitUsd: netProfit,
      profitMarginPercentage: margin,
      executionRisk: newRisk,
    });

    setOpportunities(CryptoArbitrageServiceHandler.fetchOpportunities(filters));
    setShowCreateModal(false);
    setNewPair('');
  };

  return (
    <div className="min-h-screen bg-gray-50/50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Hero Banner */}
        <div className="bg-gradient-to-r from-amber-950 via-slate-900 to-yellow-950 rounded-3xl p-8 sm:p-10 text-white shadow-xl relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 bg-amber-500/20 backdrop-blur-md border border-amber-400/30 px-3.5 py-1.5 rounded-full text-xs font-semibold text-amber-200">
              <Sparkles className="w-4 h-4 text-amber-300" />
              Real-Time Cross-DEX MEV & Flash Loan Arbitrage Radar
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight">
              Crypto Flash Loan Arbitrage Surveillance Suite
            </h1>
            <p className="text-amber-200 text-base sm:text-lg leading-relaxed">
              Detect cross-DEX price discrepancies in real time, calculate gas fees and net profit margins, and execute flash loan arbitrage bots with zero initial capital.
            </p>
            <div className="pt-2 flex flex-wrap gap-4 items-center">
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-white text-slate-950 font-bold px-6 py-3 rounded-xl shadow-lg hover:bg-amber-50 transition-all flex items-center gap-2 text-sm"
              >
                <PlusCircle className="w-5 h-5 text-amber-600" />
                Register Arbitrage Radar Node
              </button>
            </div>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-4">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            {/* Search Input */}
            <div className="relative flex-1 w-full">
              <Search className="w-5 h-5 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by token pair (WETH/DAI), source DEX (Uniswap V3), or target DEX..."
                value={filters.searchQuery}
                onChange={(e) => applyFilterChanges({ searchQuery: e.target.value })}
                className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 text-sm text-gray-900"
              />
            </div>

            {/* Borrow Asset Dropdown */}
            <div className="flex items-center gap-2 w-full md:w-auto">
              <Filter className="w-4 h-4 text-gray-500" />
              <select
                value={filters.borrowAsset}
                onChange={(e) => applyFilterChanges({ borrowAsset: e.target.value })}
                className="w-full md:w-auto px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 text-sm text-gray-800 font-medium bg-white"
              >
                <option value="All">All Borrow Assets</option>
                <option value="WETH">WETH</option>
                <option value="USDC">USDC</option>
                <option value="USDT">USDT</option>
                <option value="WBTC">WBTC</option>
              </select>

              {/* Execution Risk Dropdown */}
              <select
                value={filters.executionRisk}
                onChange={(e) => applyFilterChanges({ executionRisk: e.target.value })}
                className="w-full md:w-auto px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 text-sm text-gray-800 font-medium bg-white"
              >
                <option value="All">All Risk Profiles</option>
                <option value="low">Low Risk</option>
                <option value="moderate">Moderate Risk</option>
                <option value="high">High Risk</option>
              </select>
            </div>
          </div>
        </div>

        {/* Opportunities Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-xl text-gray-900 flex items-center gap-2">
              <Zap className="w-6 h-6 text-amber-600" />
              Detected Arbitrage Opportunities ({opportunities.length})
            </h2>
          </div>

          {opportunities.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-gray-100">
              <Activity className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h3 className="text-gray-800 font-semibold text-lg">No arbitrage opportunities detected</h3>
              <p className="text-gray-500 text-sm mt-1">Try broadening your search or asset filters.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
              {opportunities.map((o) => (
                <ArbitrageOpportunityCard
                  key={o.id}
                  opportunity={o}
                  onExecuteClick={(selected) => setSelectedOpportunity(selected)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Audit Log Timeline */}
        <ArbitrageExecutionTimeline records={records} />

        {/* Execution Modal */}
        {selectedOpportunity && (
          <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative animate-in fade-in zoom-in duration-200">
              <button
                onClick={() => setSelectedOpportunity(null)}
                className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>

              {isExecutionSuccess ? (
                <div className="text-center py-8 space-y-3">
                  <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto animate-bounce" />
                  <h3 className="text-2xl font-bold text-gray-900">Flash Loan Executed & Settled!</h3>
                  <p className="text-sm text-gray-600">
                    Realized profit of +${selectedOpportunity.netProfitUsd.toLocaleString()} captured from {selectedOpportunity.tokenPair}.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleExecuteSubmit} className="space-y-5">
                  <div>
                    <h3 className="font-bold text-gray-900 text-xl">{selectedOpportunity.tokenPair}</h3>
                    <p className="text-xs text-amber-600 font-semibold mt-1">
                      Route: {selectedOpportunity.sourceDex} ➔ {selectedOpportunity.targetDex}
                    </p>
                  </div>

                  <div className="bg-gray-50 rounded-2xl p-4 space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-500 font-medium">Flash Loan Amount:</span>
                      <span className="font-bold text-gray-900">${selectedOpportunity.loanAmountUsd.toLocaleString()} ({selectedOpportunity.borrowAsset})</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 font-medium">Estimated Gas Fee:</span>
                      <span className="font-bold text-red-600">${selectedOpportunity.estimatedGasFeeUsd}</span>
                    </div>
                    <div className="flex justify-between border-t border-gray-200 pt-2">
                      <span className="text-gray-900 font-extrabold">Net Profit After Gas:</span>
                      <span className="font-extrabold text-emerald-600 text-sm">+${selectedOpportunity.netProfitUsd.toLocaleString()}</span>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold py-3 rounded-xl shadow-md transition-colors text-sm flex items-center justify-center gap-2"
                  >
                    <Zap className="w-4 h-4 fill-slate-950" />
                    Confirm & Execute MEV Flash Loan Bot
                  </button>
                </form>
              )}
            </div>
          </div>
        )}

        {/* Create Radar Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative">
              <button
                onClick={() => setShowCreateModal(false)}
                className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="mb-6">
                <h3 className="text-2xl font-bold text-gray-900">Register Arbitrage Radar Node</h3>
                <p className="text-xs text-gray-500 mt-1">Configure DEX surveillance parameters and flash loan thresholds.</p>
              </div>

              <form onSubmit={handleCreateSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Token Pair</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. WETH / DAI"
                    value={newPair}
                    onChange={(e) => setNewPair(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Source DEX</label>
                    <input
                      type="text"
                      required
                      placeholder="Uniswap V3"
                      value={newSourceDex}
                      onChange={(e) => setNewSourceDex(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Target DEX</label>
                    <input
                      type="text"
                      required
                      placeholder="Sushiswap"
                      value={newTargetDex}
                      onChange={(e) => setNewTargetDex(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Borrow Asset</label>
                    <input
                      type="text"
                      required
                      placeholder="WETH"
                      value={newBorrowAsset}
                      onChange={(e) => setNewBorrowAsset(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Loan Amount ($)</label>
                    <input
                      type="number"
                      required
                      min={10000}
                      value={newLoanAmount}
                      onChange={(e) => setNewLoanAmount(Number(e.target.value))}
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Gross Profit ($)</label>
                    <input
                      type="number"
                      required
                      min={100}
                      value={newGrossProfit}
                      onChange={(e) => setNewGrossProfit(Number(e.target.value))}
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Gas Fee ($)</label>
                    <input
                      type="number"
                      required
                      min={10}
                      value={newGasFee}
                      onChange={(e) => setNewGasFee(Number(e.target.value))}
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Risk Profile</label>
                    <select
                      value={newRisk}
                      onChange={(e) => setNewRisk(e.target.value as any)}
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 bg-white"
                    >
                      <option value="low">Low</option>
                      <option value="moderate">Moderate</option>
                      <option value="high">High</option>
                      <option value="extreme">Extreme</option>
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold py-3 rounded-xl shadow-md transition-colors text-sm"
                >
                  Register Surveillance Radar
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
