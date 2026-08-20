'use client';

import React, { useState } from 'react';
import { CryptoPortfolioServiceHandler } from '../../lib/CryptoPortfolioService';
import { PortfolioRiskMetric, RebalanceExecutionLog, PortfolioFilterOptions } from '../../lib/CryptoPortfolioModel';
import { PortfolioRiskCardTile } from '../../components/portfolio/PortfolioRiskCardTile';
import { RebalanceExecutionList } from '../../components/portfolio/RebalanceExecutionList';
import { PieChart, Scale, Search, Filter, PlusCircle, ShieldAlert, TrendingUp, X, CheckCircle2 } from 'lucide-react';

export default function CryptoPortfolioRiskDashboardPage() {
  const [portfolios, setPortfolios] = useState<PortfolioRiskMetric[]>(() =>
    CryptoPortfolioServiceHandler.fetchPortfolios()
  );
  const [logs, setLogs] = useState<RebalanceExecutionLog[]>(() =>
    CryptoPortfolioServiceHandler.fetchRebalanceLogs()
  );

  const [filters, setFilters] = useState<PortfolioFilterOptions>({
    fundStrategy: 'All',
    riskRating: 'All',
    searchQuery: '',
  });

  const [selectedPortfolio, setSelectedPortfolio] = useState<PortfolioRiskMetric | null>(null);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);

  // Form State
  const [newName, setNewName] = useState<string>('L1 Staking Yield Fund');
  const [newStrategy, setNewStrategy] = useState<'DeFi High-Yield' | 'Macro Core Alpha' | 'L1 Staking Basket' | 'Arbitrage Neutral'>('L1 Staking Basket');
  const [newValue, setNewValue] = useState<number>(5500000);
  const [newSharpe, setNewSharpe] = useState<number>(2.10);
  const [newVar, setNewVar] = useState<number>(3.8);
  const [newBeta, setNewBeta] = useState<number>(0.92);
  const [newRisk, setNewRisk] = useState<'Low' | 'Moderate' | 'High' | 'Aggressive'>('Moderate');

  const applyFilterChanges = (updated: Partial<PortfolioFilterOptions>) => {
    const next = { ...filters, ...updated };
    setFilters(next);
    setPortfolios(CryptoPortfolioServiceHandler.fetchPortfolios(next));
  };

  const handleRebalanceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPortfolio) return;

    CryptoPortfolioServiceHandler.executePortfolioRebalance(selectedPortfolio.id);
    setPortfolios(CryptoPortfolioServiceHandler.fetchPortfolios(filters));
    setLogs(CryptoPortfolioServiceHandler.fetchRebalanceLogs());
    setIsSuccess(true);
    setTimeout(() => {
      setIsSuccess(false);
      setSelectedPortfolio(null);
    }, 1800);
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    CryptoPortfolioServiceHandler.registerNewPortfolio({
      portfolioName: newName,
      fundStrategy: newStrategy,
      totalValueUsd: newValue,
      sharpeRatio: newSharpe,
      valueAtRiskPercent: newVar,
      betaVsBtc: newBeta,
      maxDrawdownPercentage: 12.5,
      rebalanceDriftPercentage: 7.2,
      riskRating: newRisk,
      assetAllocations: [
        { asset: 'ETH', currentPercent: 60, targetPercent: 50 },
        { asset: 'SOL', currentPercent: 40, targetPercent: 50 },
      ],
    });

    setPortfolios(CryptoPortfolioServiceHandler.fetchPortfolios(filters));
    setShowCreateModal(false);
  };

  return (
    <div className="min-h-screen bg-gray-50/50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header Hero Banner */}
        <div className="bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950 rounded-3xl p-8 sm:p-10 text-white shadow-xl relative overflow-hidden">
          <div className="relative z-10 max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 bg-purple-500/20 backdrop-blur-md border border-purple-400/30 px-3.5 py-1.5 rounded-full text-xs font-semibold text-purple-200">
              <PieChart className="w-4 h-4 text-purple-300" />
              Institutional Portfolio Risk Matrix & Automated Rebalancing Engine
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight">
              Crypto Portfolio Risk Assessment & Rebalancing Suite
            </h1>
            <p className="text-purple-200 text-base sm:text-lg leading-relaxed">
              Evaluate portfolio Sharpe ratios, 95% Value at Risk (VaR), beta volatility, and execute automated rebalancing transactions to correct asset allocation drifts.
            </p>
            <div className="pt-2">
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-white text-slate-950 font-bold px-6 py-3 rounded-xl shadow-lg hover:bg-purple-50 transition-all flex items-center gap-2 text-sm"
              >
                <PlusCircle className="w-5 h-5 text-purple-600" />
                Register Portfolio Node
              </button>
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative flex-1 w-full">
            <Search className="w-5 h-5 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search portfolios by name or fund strategy (e.g. Macro Alpha, Arbitrage)..."
              value={filters.searchQuery}
              onChange={(e) => applyFilterChanges({ searchQuery: e.target.value })}
              className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 text-sm text-gray-900"
            />
          </div>

          <div className="flex gap-2 w-full md:w-auto">
            <select
              value={filters.fundStrategy}
              onChange={(e) => applyFilterChanges({ fundStrategy: e.target.value })}
              className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-800 font-medium bg-white"
            >
              <option value="All">All Fund Strategies</option>
              <option value="Macro Core Alpha">Macro Core Alpha</option>
              <option value="Arbitrage Neutral">Arbitrage Neutral</option>
              <option value="DeFi High-Yield">DeFi High-Yield</option>
            </select>
          </div>
        </div>

        {/* Portfolios Grid */}
        <div className="space-y-4">
          <h2 className="font-bold text-xl text-gray-900 flex items-center gap-2">
            <Scale className="w-6 h-6 text-purple-600" />
            Monitored Crypto Portfolios ({portfolios.length})
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {portfolios.map((p) => (
              <PortfolioRiskCardTile key={p.id} portfolio={p} onSelect={(selected) => setSelectedPortfolio(selected)} />
            ))}
          </div>
        </div>

        {/* Rebalance Execution List */}
        <RebalanceExecutionList logs={logs} />

        {/* Rebalance Modal */}
        {selectedPortfolio && (
          <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative">
              <button
                onClick={() => setSelectedPortfolio(null)}
                className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>

              {isSuccess ? (
                <div className="text-center py-8 space-y-3">
                  <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto animate-bounce" />
                  <h3 className="text-2xl font-bold text-gray-900">Portfolio Rebalanced & Settled!</h3>
                  <p className="text-sm text-gray-600">
                    Allocations corrected to 0.0% drift for {selectedPortfolio.portfolioName}.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleRebalanceSubmit} className="space-y-4 text-xs">
                  <div>
                    <h3 className="font-bold text-gray-900 text-xl">{selectedPortfolio.portfolioName}</h3>
                    <p className="text-xs text-purple-600 font-semibold mt-0.5">
                      Strategy: {selectedPortfolio.fundStrategy} | Current Drift: {selectedPortfolio.rebalanceDriftPercentage}%
                    </p>
                  </div>

                  <div className="p-4 bg-gray-50 rounded-2xl space-y-2 font-mono">
                    <div>Portfolio AUM: <strong>${(selectedPortfolio.totalValueUsd / 1000000).toFixed(2)}M USD</strong></div>
                    <div>Sharpe Ratio: <strong>{selectedPortfolio.sharpeRatio}</strong></div>
                    <div>1-Day 95% VaR: <strong className="text-red-600">{selectedPortfolio.valueAtRiskPercent}%</strong></div>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 rounded-xl shadow-md transition-colors text-sm"
                  >
                    Execute Target Rebalance Trades
                  </button>
                </form>
              )}
            </div>
          </div>
        )}

        {/* Register Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative">
              <button
                onClick={() => setShowCreateModal(false)}
                className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="mb-4">
                <h3 className="text-2xl font-bold text-gray-900">Register Portfolio Node</h3>
                <p className="text-xs text-gray-500">Configure strategy type and risk metrics.</p>
              </div>

              <form onSubmit={handleRegisterSubmit} className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Portfolio Name</label>
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Fund Strategy</label>
                    <select
                      value={newStrategy}
                      onChange={(e) => setNewStrategy(e.target.value as any)}
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm bg-white"
                    >
                      <option value="Macro Core Alpha">Macro Core Alpha</option>
                      <option value="Arbitrage Neutral">Arbitrage Neutral</option>
                      <option value="DeFi High-Yield">DeFi High-Yield</option>
                      <option value="L1 Staking Basket">L1 Staking Basket</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Portfolio AUM ($)</label>
                    <input
                      type="number"
                      required
                      value={newValue}
                      onChange={(e) => setNewValue(Number(e.target.value))}
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Sharpe Ratio</label>
                    <input
                      type="number"
                      required
                      step="0.01"
                      value={newSharpe}
                      onChange={(e) => setNewSharpe(Number(e.target.value))}
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">VaR %</label>
                    <input
                      type="number"
                      required
                      step="0.1"
                      value={newVar}
                      onChange={(e) => setNewVar(Number(e.target.value))}
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Beta</label>
                    <input
                      type="number"
                      required
                      step="0.01"
                      value={newBeta}
                      onChange={(e) => setNewBeta(Number(e.target.value))}
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 rounded-xl shadow-md transition-colors text-sm"
                >
                  Register Portfolio Node
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
