'use client';

import React, { useState, useEffect } from 'react';
import { PortfolioRiskServiceHandler } from '../../lib/CryptoPortfolioRiskService';
import {
  PortfolioRiskOpportunity,
  PortfolioRebalanceAuditRecord,
  PortfolioFilterOptions,
  PortfolioRiskCategory,
} from '../../lib/CryptoPortfolioRiskModel';
import { CryptoPortfolioRiskCard } from '../../components/portfolio/CryptoPortfolioRiskCard';
import { CryptoPortfolioRiskTimeline } from '../../components/portfolio/CryptoPortfolioRiskTimeline';
import {
  Zap,
  Search,
  Filter,
  PlusCircle,
  ShieldCheck,
  Activity,
  X,
  CheckCircle2,
  XCircle,
  PieChart,
} from 'lucide-react';

export default function CryptoPortfolioRiskAnalyticsPage() {
  const [opportunities, setOpportunities] = useState<PortfolioRiskOpportunity[]>([]);
  const [records, setRecords] = useState<PortfolioRebalanceAuditRecord[]>([]);

  const [filters, setFilters] = useState<PortfolioFilterOptions>({
    riskCategory: 'All',
    searchQuery: '',
  });

  const [selectedOpportunity, setSelectedOpportunity] = useState<PortfolioRiskOpportunity | null>(null);
  const [simulationResult, setSimulationResult] = useState<PortfolioRebalanceAuditRecord | null>(null);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);

  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [newName, setNewName] = useState<string>('Web3 Venture Portfolio');
  const [newOwner, setNewOwner] = useState<string>('0x1111222233334444555566667777888899990000');
  const [newValue, setNewValue] = useState<string>('750000');
  const [newCategory, setNewCategory] = useState<PortfolioRiskCategory>('Balanced');

  useEffect(() => {
    setOpportunities(PortfolioRiskServiceHandler.fetchOpportunities(filters));
    setRecords(PortfolioRiskServiceHandler.fetchAuditRecords());
  }, []);

  const applyFilterChanges = (updatedFilters: Partial<PortfolioFilterOptions>) => {
    const nextFilters = { ...filters, ...updatedFilters };
    setFilters(nextFilters);
    setOpportunities(PortfolioRiskServiceHandler.fetchOpportunities(nextFilters));
  };

  const handleRunSimulationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOpportunity) return;

    setIsSimulating(true);

    setTimeout(() => {
      const record = PortfolioRiskServiceHandler.executeRebalanceSimulation(selectedOpportunity.id);
      setSimulationResult(record);
      setOpportunities(PortfolioRiskServiceHandler.fetchOpportunities(filters));
      setRecords(PortfolioRiskServiceHandler.fetchAuditRecords());
      setIsSimulating(false);
    }, 600);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(newValue);

    if (!Number.isFinite(val)) {
      alert('Please enter valid numerical values.');
      return;
    }

    PortfolioRiskServiceHandler.registerOpportunity({
      portfolioName: newName,
      ownerAddress: newOwner,
      totalPortfolioValueUsd: val,
      allocations: [
        { assetSymbol: 'ETH', currentWeightPercent: 50, targetWeightPercent: 40, currentValueUsd: val * 0.5, driftPercent: +10 },
        { assetSymbol: 'BTC', currentWeightPercent: 50, targetWeightPercent: 60, currentValueUsd: val * 0.5, driftPercent: -10 },
      ],
      riskMetrics: {
        sharpeRatio: 1.85,
        maxDrawdownPercent: 18.0,
        volatilityAnnualPercent: 32.0,
        betaToBtc: 1.0,
      },
      riskCategory: newCategory,
      rebalanceThresholdPercent: 5.0,
      estimatedRebalanceGasUsd: 65,
    });

    setOpportunities(PortfolioRiskServiceHandler.fetchOpportunities(filters));
    setShowCreateModal(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-10 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-purple-950/40 rounded-3xl p-8 sm:p-10 border border-slate-800 shadow-2xl relative overflow-hidden">
          <div className="relative z-10 max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 bg-purple-500/10 border border-purple-500/30 px-3.5 py-1.5 rounded-full text-xs font-bold text-purple-300">
              <ShieldCheck className="w-4 h-4 text-purple-400" />
              Portfolio Risk Analysis & Automated Rebalancing Suite
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white">
              Portfolio Risk & Rebalancing Suite
            </h1>
            <p className="text-slate-300 text-base sm:text-lg leading-relaxed">
              Monitor multi-asset portfolio drift, evaluate Sharpe ratio & drawdown limits, and execute automated gas-optimized rebalancing.
            </p>
            <div className="pt-2 flex flex-wrap gap-4 items-center">
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-slate-950 font-black px-6 py-3 rounded-2xl shadow-lg shadow-purple-500/20 transition-all flex items-center gap-2 text-sm"
              >
                <PlusCircle className="w-5 h-5 fill-current" />
                Register Portfolio Node
              </button>
            </div>
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative flex-1 w-full">
              <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by portfolio name or owner wallet address..."
                value={filters.searchQuery}
                onChange={(e) => applyFilterChanges({ searchQuery: e.target.value })}
                className="w-full pl-12 pr-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/50 text-sm"
              />
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={filters.riskCategory}
                onChange={(e) => applyFilterChanges({ riskCategory: e.target.value })}
                className="px-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-slate-200 text-sm font-semibold focus:outline-none focus:border-purple-500/50"
              >
                <option value="All">All Risk Categories</option>
                <option value="Conservative">Conservative</option>
                <option value="Balanced">Balanced</option>
                <option value="Aggressive Growth">Aggressive Growth</option>
              </select>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="font-extrabold text-2xl text-white flex items-center gap-2 tracking-tight">
            <PieChart className="w-6 h-6 text-purple-400" />
            Monitored Portfolios ({opportunities.length})
          </h2>

          {opportunities.length === 0 ? (
            <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-12 text-center">
              <Activity className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <h3 className="text-white font-bold text-lg">No portfolios found</h3>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {opportunities.map((opp) => (
                <CryptoPortfolioRiskCard
                  key={opp.id}
                  opportunity={opp}
                  onExecuteClick={(o) => {
                    setSelectedOpportunity(o);
                    setSimulationResult(null);
                  }}
                />
              ))}
            </div>
          )}
        </div>

        <CryptoPortfolioRiskTimeline records={records} />

        {selectedOpportunity && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative">
              <button
                onClick={() => setSelectedOpportunity(null)}
                className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-xl bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>

              {simulationResult ? (
                <div className="text-center py-6 space-y-4">
                  {simulationResult.status === 'REBALANCED_SUCCESS' ? (
                    <>
                      <CheckCircle2 className="w-16 h-16 text-emerald-400 mx-auto" />
                      <h3 className="text-2xl font-black text-white">REBALANCED_SUCCESS</h3>
                      <p className="text-sm text-slate-300">
                        Portfolio successfully rebalanced back to target weights! Gas paid: ${simulationResult.gasPaidUsd}.
                      </p>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-16 h-16 text-rose-500 mx-auto" />
                      <h3 className="text-2xl font-black text-white">REBALANCE_REVERT</h3>
                      <p className="text-sm text-rose-400 font-semibold">
                        Reason: {simulationResult.failureReason}
                      </p>
                    </>
                  )}
                  <button
                    onClick={() => setSelectedOpportunity(null)}
                    className="w-full bg-slate-800 text-white font-bold py-3 rounded-2xl hover:bg-slate-700 text-sm"
                  >
                    Return to Portfolio Dashboard
                  </button>
                </div>
              ) : (
                <form onSubmit={handleRunSimulationSubmit} className="space-y-5">
                  <div>
                    <h3 className="font-black text-white text-2xl">
                      {selectedOpportunity.portfolioName}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Total Value: ${selectedOpportunity.totalPortfolioValueUsd.toLocaleString()} USD
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={isSimulating}
                    className="w-full bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-slate-950 font-extrabold py-3.5 rounded-2xl shadow-lg transition-all text-sm flex items-center justify-center gap-2"
                  >
                    <Zap className="w-4 h-4 fill-slate-950" />
                    {isSimulating ? 'Simulating Rebalance Execution...' : 'Confirm & Execute Rebalance'}
                  </button>
                </form>
              )}
            </div>
          </div>
        )}

        {showCreateModal && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative">
              <button
                onClick={() => setShowCreateModal(false)}
                className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-xl bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="mb-6">
                <h3 className="text-2xl font-black text-white">Register Portfolio Node</h3>
              </div>

              <form onSubmit={handleCreateSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Portfolio Name</label>
                    <input type="text" required value={newName} onChange={(e) => setNewName(e.target.value)} className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Value ($)</label>
                    <input type="text" required value={newValue} onChange={(e) => setNewValue(e.target.value)} className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm" />
                  </div>
                </div>

                <button type="submit" className="w-full bg-gradient-to-r from-purple-500 to-indigo-600 text-slate-950 font-black py-3.5 rounded-2xl shadow-lg">
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
