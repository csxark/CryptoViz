'use client';

import React, { useState } from 'react';
import {
  CryptoPortfolioRiskServiceHandler,
} from '../../lib/CryptoPortfolioRiskService';
import {
  PortfolioRiskMetric,
  RebalanceExecutionLog,
  CryptoFilterOptions,
} from '../../lib/CryptoPortfolioRiskModel';
import { PortfolioRiskCard } from '../../components/risk/PortfolioRiskCard';
import { PortfolioRebalanceTimeline } from '../../components/risk/PortfolioRebalanceTimeline';
import {
  ShieldAlert,
  Search,
  Filter,
  PlusCircle,
  Sparkles,
  CheckCircle2,
  X,
  RefreshCw,
  TrendingUp,
} from 'lucide-react';

export default function CryptoPortfolioRiskDashboardPage() {
  const [portfolios, setPortfolios] = useState<PortfolioRiskMetric[]>(() =>
    CryptoPortfolioRiskServiceHandler.fetchPortfolios()
  );
  const [logs, setLogs] = useState<RebalanceExecutionLog[]>(() =>
    CryptoPortfolioRiskServiceHandler.fetchRebalanceExecutionLogs()
  );

  const [filters, setFilters] = useState<CryptoFilterOptions>({
    riskCategory: 'All',
    rebalanceOnly: false,
    searchQuery: '',
  });

  const [selectedPortfolio, setSelectedPortfolio] = useState<PortfolioRiskMetric | null>(null);
  const [tradeSymbol, setTradeSymbol] = useState<string>('BTC');
  const [tradeType, setTradeType] = useState<'buy' | 'sell'>('sell');
  const [tradeAmount, setTradeAmount] = useState<number>(15000);
  const [isRebalanceSuccess, setIsRebalanceSuccess] = useState<boolean>(false);

  // Register Modal State
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [newPortfolioName, setNewPortfolioName] = useState<string>('');
  const [newRiskScore, setNewRiskScore] = useState<number>(50);
  const [newRiskCategory, setNewRiskCategory] = useState<'low' | 'moderate' | 'high' | 'degen'>('moderate');
  const [newTotalValue, setNewTotalValue] = useState<number>(100000);
  const [newAsset1Symbol, setNewAsset1Symbol] = useState<string>('BTC');
  const [newAsset1Curr, setNewAsset1Curr] = useState<number>(60);
  const [newAsset1Tgt, setNewAsset1Tgt] = useState<number>(50);

  const applyFilterChanges = (updatedFilters: Partial<CryptoFilterOptions>) => {
    const nextFilters = { ...filters, ...updatedFilters };
    setFilters(nextFilters);
    setPortfolios(CryptoPortfolioRiskServiceHandler.fetchPortfolios(nextFilters));
  };

  const handleRebalanceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPortfolio) return;

    CryptoPortfolioRiskServiceHandler.triggerRebalanceExecution(
      selectedPortfolio.id,
      tradeSymbol,
      tradeType,
      tradeAmount
    );

    setLogs(CryptoPortfolioRiskServiceHandler.fetchRebalanceExecutionLogs());
    setIsRebalanceSuccess(true);
    setTimeout(() => {
      setIsRebalanceSuccess(false);
      setSelectedPortfolio(null);
    }, 1800);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    CryptoPortfolioRiskServiceHandler.registerNewPortfolio({
      portfolioName: newPortfolioName,
      riskScore: newRiskScore,
      riskCategory: newRiskCategory,
      totalValueUsd: newTotalValue,
      allocations: [
        {
          symbol: newAsset1Symbol,
          name: `${newAsset1Symbol} Asset`,
          currentAllocationPercentage: newAsset1Curr,
          targetAllocationPercentage: newAsset1Tgt,
          holdingsValueUsd: (newTotalValue * newAsset1Curr) / 100,
          sharpeRatio: 1.9,
          volatilityIndex: 22.5,
          maxDrawdownPercentage: -15.0,
        },
      ],
    });

    setPortfolios(CryptoPortfolioRiskServiceHandler.fetchPortfolios(filters));
    setShowCreateModal(false);
    setNewPortfolioName('');
  };

  return (
    <div className="min-h-screen bg-gray-50/50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Hero Banner */}
        <div className="bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950 rounded-3xl p-8 sm:p-10 text-white shadow-xl relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 bg-purple-500/20 backdrop-blur-md border border-purple-400/30 px-3.5 py-1.5 rounded-full text-xs font-semibold text-purple-200">
              <Sparkles className="w-4 h-4 text-purple-300" />
              Automated On-Chain Risk Index & Rebalancing Engine
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight">
              Crypto Portfolio Risk & Rebalancing Analytics Suite
            </h1>
            <p className="text-purple-200 text-base sm:text-lg leading-relaxed">
              Monitor portfolio risk scores, Sharpe ratios, volatility indices, asset allocation drifts, and automated multi-dex rebalancing execution logs.
            </p>
            <div className="pt-2 flex flex-wrap gap-4 items-center">
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-white text-slate-950 font-bold px-6 py-3 rounded-xl shadow-lg hover:bg-purple-50 transition-all flex items-center gap-2 text-sm"
              >
                <PlusCircle className="w-5 h-5 text-purple-600" />
                Register Crypto Portfolio Vault
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
                placeholder="Search by portfolio name, crypto symbol (BTC, ETH), or risk parameters..."
                value={filters.searchQuery}
                onChange={(e) => applyFilterChanges({ searchQuery: e.target.value })}
                className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 text-sm text-gray-900"
              />
            </div>

            {/* Risk Category Dropdown */}
            <div className="flex items-center gap-2 w-full md:w-auto">
              <Filter className="w-4 h-4 text-gray-500" />
              <select
                value={filters.riskCategory}
                onChange={(e) => applyFilterChanges({ riskCategory: e.target.value })}
                className="w-full md:w-auto px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 text-sm text-gray-800 font-medium bg-white"
              >
                <option value="All">All Risk Profiles</option>
                <option value="low">Low Risk</option>
                <option value="moderate">Moderate Risk</option>
                <option value="high">High Risk</option>
                <option value="degen">Degen Risk</option>
              </select>

              {/* Rebalance Checkbox Filter */}
              <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 cursor-pointer px-3 py-2 bg-gray-50 rounded-xl border border-gray-200">
                <input
                  type="checkbox"
                  checked={filters.rebalanceOnly}
                  onChange={(e) => applyFilterChanges({ rebalanceOnly: e.target.checked })}
                  className="rounded text-purple-600 focus:ring-purple-500"
                />
                Drifting Allocations Only
              </label>
            </div>
          </div>
        </div>

        {/* Portfolios Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-xl text-gray-900 flex items-center gap-2">
              <ShieldAlert className="w-6 h-6 text-purple-600" />
              Monitored Crypto Portfolios ({portfolios.length})
            </h2>
          </div>

          {portfolios.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-gray-100">
              <TrendingUp className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h3 className="text-gray-800 font-semibold text-lg">No portfolios found</h3>
              <p className="text-gray-500 text-sm mt-1">Try broadening your search or risk category filters.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
              {portfolios.map((p) => (
                <PortfolioRiskCard
                  key={p.id}
                  portfolio={p}
                  onRebalanceClick={(selected) => setSelectedPortfolio(selected)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Audit Log Timeline */}
        <PortfolioRebalanceTimeline logs={logs} />

        {/* Rebalance Modal */}
        {selectedPortfolio && (
          <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative animate-in fade-in zoom-in duration-200">
              <button
                onClick={() => setSelectedPortfolio(null)}
                className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>

              {isRebalanceSuccess ? (
                <div className="text-center py-8 space-y-3">
                  <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto animate-bounce" />
                  <h3 className="text-2xl font-bold text-gray-900">Rebalance Executed!</h3>
                  <p className="text-sm text-gray-600">
                    Swap trade of ${tradeAmount.toLocaleString()} ({tradeSymbol}) submitted for {selectedPortfolio.portfolioName}.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleRebalanceSubmit} className="space-y-5">
                  <div>
                    <h3 className="font-bold text-gray-900 text-xl">{selectedPortfolio.portfolioName}</h3>
                    <p className="text-xs text-purple-600 font-semibold mt-1">
                      Total Vault Balance: ${selectedPortfolio.totalValueUsd.toLocaleString()}
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Asset Symbol</label>
                        <input
                          type="text"
                          required
                          value={tradeSymbol}
                          onChange={(e) => setTradeSymbol(e.target.value.toUpperCase())}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Trade Action</label>
                        <select
                          value={tradeType}
                          onChange={(e) => setTradeType(e.target.value as any)}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 bg-white"
                        >
                          <option value="sell">Sell (Over-allocated)</option>
                          <option value="buy">Buy (Under-allocated)</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Trade Swap Volume ($)</label>
                      <input
                        type="number"
                        required
                        min={100}
                        value={tradeAmount}
                        onChange={(e) => setTradeAmount(Number(e.target.value))}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-xl shadow-md transition-colors text-sm flex items-center justify-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Execute On-Chain Rebalance Swap
                  </button>
                </form>
              )}
            </div>
          </div>
        )}

        {/* Create Vault Modal */}
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
                <h3 className="text-2xl font-bold text-gray-900">Register Crypto Vault</h3>
                <p className="text-xs text-gray-500 mt-1">Configure target allocations and automated risk tracking parameters.</p>
              </div>

              <form onSubmit={handleCreateSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Portfolio Vault Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. DeFi Yield & Staking Vault"
                    value={newPortfolioName}
                    onChange={(e) => setNewPortfolioName(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Risk Score (0-100)</label>
                    <input
                      type="number"
                      required
                      min={0}
                      max={100}
                      value={newRiskScore}
                      onChange={(e) => setNewRiskScore(Number(e.target.value))}
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Risk Category</label>
                    <select
                      value={newRiskCategory}
                      onChange={(e) => setNewRiskCategory(e.target.value as any)}
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 bg-white"
                    >
                      <option value="low">Low Risk</option>
                      <option value="moderate">Moderate Risk</option>
                      <option value="high">High Risk</option>
                      <option value="degen">Degen Risk</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Total Vault Value ($)</label>
                  <input
                    type="number"
                    required
                    min={1000}
                    value={newTotalValue}
                    onChange={(e) => setNewTotalValue(Number(e.target.value))}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Asset Symbol</label>
                    <input
                      type="text"
                      required
                      placeholder="BTC"
                      value={newAsset1Symbol}
                      onChange={(e) => setNewAsset1Symbol(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Current %</label>
                    <input
                      type="number"
                      required
                      min={0}
                      max={100}
                      value={newAsset1Curr}
                      onChange={(e) => setNewAsset1Curr(Number(e.target.value))}
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Target %</label>
                    <input
                      type="number"
                      required
                      min={0}
                      max={100}
                      value={newAsset1Tgt}
                      onChange={(e) => setNewAsset1Tgt(Number(e.target.value))}
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-xl shadow-md transition-colors text-sm"
                >
                  Register Portfolio Vault
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
