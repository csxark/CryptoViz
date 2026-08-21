'use client';

import React, { useState, useEffect } from 'react';
import { YieldFarmingServiceHandler } from '../../lib/CryptoYieldFarmingService';
import {
  LiquidityPoolYieldOpportunity,
  YieldExecutionAuditRecord,
  YieldFilterOptions,
} from '../../lib/CryptoYieldFarmingModel';
import { CryptoYieldFarmingCard } from '../../components/yield/CryptoYieldFarmingCard';
import { CryptoYieldFarmingTimeline } from '../../components/yield/CryptoYieldFarmingTimeline';
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
  Sprout,
} from 'lucide-react';

export default function CryptoYieldFarmingAnalyticsPage() {
  const [opportunities, setOpportunities] = useState<LiquidityPoolYieldOpportunity[]>([]);
  const [records, setRecords] = useState<YieldExecutionAuditRecord[]>([]);

  const [filters, setFilters] = useState<YieldFilterOptions>({
    protocol: 'All',
    riskCategory: 'All',
    rewardTokenSymbol: 'All',
    searchQuery: '',
  });

  const [selectedOpportunity, setSelectedOpportunity] = useState<LiquidityPoolYieldOpportunity | null>(null);
  const [simulationResult, setSimulationResult] = useState<YieldExecutionAuditRecord | null>(null);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [customDeposit, setCustomDeposit] = useState<string>('5000');

  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [newPool, setNewPool] = useState<string>('USDC / USDT High Yield Vault');
  const [newProtocol, setNewProtocol] = useState<any>('Yearn Vaults');
  const [newPair, setNewPair] = useState<string>('USDC / USDT');
  const [newTvl, setNewTvl] = useState<string>('85000000');
  const [newBaseApy, setNewBaseApy] = useState<string>('4.50');
  const [newRewardApy, setNewRewardApy] = useState<string>('6.20');
  const [newRewardSymbol, setNewRewardSymbol] = useState<string>('YFI');
  const [newMinDeposit, setNewMinDeposit] = useState<string>('1000');

  useEffect(() => {
    setOpportunities(YieldFarmingServiceHandler.fetchOpportunities(filters));
    setRecords(YieldFarmingServiceHandler.fetchAuditRecords());
  }, []);

  const applyFilterChanges = (updatedFilters: Partial<YieldFilterOptions>) => {
    const nextFilters = { ...filters, ...updatedFilters };
    setFilters(nextFilters);
    setOpportunities(YieldFarmingServiceHandler.fetchOpportunities(nextFilters));
  };

  const handleRunSimulationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOpportunity) return;

    setIsSimulating(true);
    const amount = parseFloat(customDeposit);

    setTimeout(() => {
      const record = YieldFarmingServiceHandler.executeDepositSimulation(selectedOpportunity.id, {
        depositAmountUsd: amount,
      });
      setSimulationResult(record);
      setOpportunities(YieldFarmingServiceHandler.fetchOpportunities(filters));
      setRecords(YieldFarmingServiceHandler.fetchAuditRecords());
      setIsSimulating(false);
    }, 600);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const tvl = parseFloat(newTvl);
    const baseApy = parseFloat(newBaseApy);
    const rewardApy = parseFloat(newRewardApy);
    const minDep = parseFloat(newMinDeposit);

    if (!Number.isFinite(tvl) || !Number.isFinite(baseApy) || !Number.isFinite(rewardApy) || !Number.isFinite(minDep)) {
      alert('Please enter valid numerical values.');
      return;
    }

    YieldFarmingServiceHandler.registerOpportunity({
      poolName: newPool,
      protocol: newProtocol,
      tokenPair: newPair,
      totalValueLockedUsd: tvl,
      baseApyPercent: baseApy,
      rewardTokenApyPercent: rewardApy,
      netTotalApyPercent: Number((baseApy + rewardApy).toFixed(2)),
      rewardTokenSymbol: newRewardSymbol,
      impermanentLossRisk: {
        projectedTokenAPriceRatio: 1.02,
        estimatedImpermanentLossPercent: 0.15,
        netApyAfterImpermanentLoss: Number((baseApy + rewardApy - 0.15).toFixed(2)),
        breakEvenDays: 3,
      },
      minimumDepositUsd: minDep,
      autoCompoundingFrequency: 'Daily',
      riskCategory: 'Low Risk',
    });

    setOpportunities(YieldFarmingServiceHandler.fetchOpportunities(filters));
    setShowCreateModal(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-10 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950/40 rounded-3xl p-8 sm:p-10 border border-slate-800 shadow-2xl relative overflow-hidden">
          <div className="relative z-10 max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 px-3.5 py-1.5 rounded-full text-xs font-bold text-emerald-300">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Liquidity Pool Yield Farming & Impermanent Loss Analytics Suite
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white">
              Yield Farming Analytics Suite
            </h1>
            <p className="text-slate-300 text-base sm:text-lg leading-relaxed">
              Optimize multi-DEX yield farming strategies, calculate impermanent loss risk parameters, and monitor auto-compounding LP vaults.
            </p>
            <div className="pt-2 flex flex-wrap gap-4 items-center">
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black px-6 py-3 rounded-2xl shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2 text-sm"
              >
                <PlusCircle className="w-5 h-5 fill-current" />
                Register Yield Farming Pool
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
                placeholder="Search by pool name, token pair (stETH/ETH), or protocol (Curve, Convex)..."
                value={filters.searchQuery}
                onChange={(e) => applyFilterChanges({ searchQuery: e.target.value })}
                className="w-full pl-12 pr-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 text-sm"
              />
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={filters.protocol}
                onChange={(e) => applyFilterChanges({ protocol: e.target.value })}
                className="px-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-slate-200 text-sm font-semibold focus:outline-none focus:border-emerald-500/50"
              >
                <option value="All">All Protocols</option>
                <option value="Curve Finance">Curve Finance</option>
                <option value="Convex Finance">Convex Finance</option>
                <option value="Beefy Finance">Beefy Finance</option>
              </select>

              <select
                value={filters.riskCategory}
                onChange={(e) => applyFilterChanges({ riskCategory: e.target.value })}
                className="px-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-slate-200 text-sm font-semibold focus:outline-none focus:border-emerald-500/50"
              >
                <option value="All">All Risk Profiles</option>
                <option value="Low Risk">Low Risk</option>
                <option value="Moderate Risk">Moderate Risk</option>
                <option value="Degenerate Yield">Degenerate Yield</option>
              </select>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="font-extrabold text-2xl text-white flex items-center gap-2 tracking-tight">
            <Sprout className="w-6 h-6 text-emerald-400" />
            Active Yield Pools ({opportunities.length})
          </h2>

          {opportunities.length === 0 ? (
            <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-12 text-center">
              <Activity className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <h3 className="text-white font-bold text-lg">No yield pools found</h3>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {opportunities.map((opp) => (
                <CryptoYieldFarmingCard
                  key={opp.id}
                  opportunity={opp}
                  onExecuteClick={(o) => {
                    setSelectedOpportunity(o);
                    setCustomDeposit(o.minimumDepositUsd.toString());
                    setSimulationResult(null);
                  }}
                />
              ))}
            </div>
          )}
        </div>

        <CryptoYieldFarmingTimeline records={records} />

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
                  {simulationResult.status === 'FARMING_ACTIVE' ? (
                    <>
                      <CheckCircle2 className="w-16 h-16 text-emerald-400 mx-auto" />
                      <h3 className="text-2xl font-black text-white">FARMING_ACTIVE</h3>
                      <p className="text-sm text-slate-300">
                        LP deposit successful! Projected Yield: +${simulationResult.projectedAnnualYieldUsd.toLocaleString()}/yr.
                      </p>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-16 h-16 text-rose-500 mx-auto" />
                      <h3 className="text-2xl font-black text-white">RISK_REVERT</h3>
                      <p className="text-sm text-rose-400 font-semibold">
                        Reason: {simulationResult.failureReason}
                      </p>
                    </>
                  )}
                  <button
                    onClick={() => setSelectedOpportunity(null)}
                    className="w-full bg-slate-800 text-white font-bold py-3 rounded-2xl hover:bg-slate-700 text-sm"
                  >
                    Return to Yield Dashboard
                  </button>
                </div>
              ) : (
                <form onSubmit={handleRunSimulationSubmit} className="space-y-5">
                  <div>
                    <h3 className="font-black text-white text-2xl">
                      {selectedOpportunity.poolName}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Protocol: {selectedOpportunity.protocol} | APY: {selectedOpportunity.netTotalApyPercent}%
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Deposit Amount ($ USD)
                    </label>
                    <input
                      type="text"
                      value={customDeposit}
                      onChange={(e) => setCustomDeposit(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-white text-sm"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSimulating}
                    className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-extrabold py-3.5 rounded-2xl shadow-lg transition-all text-sm flex items-center justify-center gap-2"
                  >
                    <Zap className="w-4 h-4 fill-slate-950" />
                    {isSimulating ? 'Simulating LP Deposit...' : 'Simulate LP Deposit'}
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
                <h3 className="text-2xl font-black text-white">Register Yield Farming Pool</h3>
              </div>

              <form onSubmit={handleCreateSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Pool Name</label>
                    <input type="text" required value={newPool} onChange={(e) => setNewPool(e.target.value)} className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Token Pair</label>
                    <input type="text" required value={newPair} onChange={(e) => setNewPair(e.target.value)} className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm" />
                  </div>
                </div>

                <button type="submit" className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 font-black py-3.5 rounded-2xl shadow-lg">
                  Register Pool Node
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
