'use client';

import React, { useState } from 'react';
import {
  CryptoYieldFarmingServiceHandler,
} from '../../lib/CryptoYieldFarmingService';
import {
  LiquidityPool,
  YieldHarvestRecord,
  PoolFilterOptions,
} from '../../lib/CryptoYieldFarmingModel';
import { LiquidityPoolCard } from '../../components/yield/LiquidityPoolCard';
import { YieldHarvestTimeline } from '../../components/yield/YieldHarvestTimeline';
import {
  Coins,
  Search,
  Filter,
  PlusCircle,
  Sparkles,
  CheckCircle2,
  X,
  Layers,
  TrendingUp,
} from 'lucide-react';

export default function CryptoYieldFarmingDashboardPage() {
  const [pools, setPools] = useState<LiquidityPool[]>(() =>
    CryptoYieldFarmingServiceHandler.fetchLiquidityPools()
  );
  const [harvests, setHarvests] = useState<YieldHarvestRecord[]>(() =>
    CryptoYieldFarmingServiceHandler.fetchHarvestHistory()
  );

  const [filters, setFilters] = useState<PoolFilterOptions>({
    protocol: 'All',
    impermanentLossRisk: 'All',
    searchQuery: '',
  });

  const [selectedPool, setSelectedPool] = useState<LiquidityPool | null>(null);
  const [rewardToken, setRewardToken] = useState<string>('UNI');
  const [harvestAmount, setHarvestAmount] = useState<number>(150);
  const [isHarvestSuccess, setIsHarvestSuccess] = useState<boolean>(false);

  // Add Pool Modal State
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [newPoolName, setNewPoolName] = useState<string>('');
  const [newProtocol, setNewProtocol] = useState<'Uniswap V3' | 'Curve Finance' | 'Balancer' | 'PancakeSwap' | 'SushiSwap'>('Uniswap V3');
  const [newSymbols, setNewSymbols] = useState<string>('ETH, USDC');
  const [newTvl, setNewTvl] = useState<number>(50000000);
  const [newApy, setNewApy] = useState<number>(25);
  const [newRisk, setNewRisk] = useState<'low' | 'moderate' | 'high' | 'severe'>('moderate');
  const [newDailyFee, setNewDailyFee] = useState<number>(500);
  const [newStakedLp, setNewStakedLp] = useState<number>(10);

  const applyFilterChanges = (updatedFilters: Partial<PoolFilterOptions>) => {
    const nextFilters = { ...filters, ...updatedFilters };
    setFilters(nextFilters);
    setPools(CryptoYieldFarmingServiceHandler.fetchLiquidityPools(nextFilters));
  };

  const handleHarvestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPool) return;

    CryptoYieldFarmingServiceHandler.executeRewardClaim(
      selectedPool.id,
      rewardToken,
      harvestAmount
    );

    setHarvests(CryptoYieldFarmingServiceHandler.fetchHarvestHistory());
    setIsHarvestSuccess(true);
    setTimeout(() => {
      setIsHarvestSuccess(false);
      setSelectedPool(null);
    }, 1800);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    CryptoYieldFarmingServiceHandler.registerLiquidityPool({
      poolName: newPoolName,
      protocol: newProtocol,
      pairSymbols: newSymbols.split(',').map((s) => s.trim().toUpperCase()),
      totalValueLockedUsd: newTvl,
      apyPercentage: newApy,
      impermanentLossRisk: newRisk,
      dailyFeeYieldUsd: newDailyFee,
      stakedLpTokens: newStakedLp,
      status: 'active',
    });

    setPools(CryptoYieldFarmingServiceHandler.fetchLiquidityPools(filters));
    setShowCreateModal(false);
    setNewPoolName('');
  };

  return (
    <div className="min-h-screen bg-gray-50/50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-emerald-950 via-teal-900 to-slate-900 rounded-3xl p-8 sm:p-10 text-white shadow-xl relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 bg-emerald-500/20 backdrop-blur-md border border-emerald-400/30 px-3.5 py-1.5 rounded-full text-xs font-semibold text-emerald-200">
              <Sparkles className="w-4 h-4 text-emerald-300" />
              Automated LP Staking & Multi-Protocol Yield Optimization Engine
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight">
              Liquidity Pool & Yield Farming Analytics Suite
            </h1>
            <p className="text-emerald-200 text-base sm:text-lg leading-relaxed">
              Track TVL across Uniswap V3, Curve, and Balancer, monitor real-time APY yield rates, assess impermanent loss risk, and claim accrued yield rewards.
            </p>
            <div className="pt-2 flex flex-wrap gap-4 items-center">
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-white text-slate-950 font-bold px-6 py-3 rounded-xl shadow-lg hover:bg-emerald-50 transition-all flex items-center gap-2 text-sm"
              >
                <PlusCircle className="w-5 h-5 text-emerald-600" />
                Add Liquidity Pool Vault
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
                placeholder="Search by pool name, protocol (Curve, Uniswap), or pair symbols (ETH, USDC)..."
                value={filters.searchQuery}
                onChange={(e) => applyFilterChanges({ searchQuery: e.target.value })}
                className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 text-sm text-gray-900"
              />
            </div>

            {/* Protocol Dropdown */}
            <div className="flex items-center gap-2 w-full md:w-auto">
              <Filter className="w-4 h-4 text-gray-500" />
              <select
                value={filters.protocol}
                onChange={(e) => applyFilterChanges({ protocol: e.target.value })}
                className="w-full md:w-auto px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm text-gray-800 font-medium bg-white"
              >
                <option value="All">All Protocols</option>
                <option value="Uniswap V3">Uniswap V3</option>
                <option value="Curve Finance">Curve Finance</option>
                <option value="Balancer">Balancer</option>
                <option value="PancakeSwap">PancakeSwap</option>
                <option value="SushiSwap">SushiSwap</option>
              </select>

              {/* Impermanent Loss Risk Dropdown */}
              <select
                value={filters.impermanentLossRisk}
                onChange={(e) => applyFilterChanges({ impermanentLossRisk: e.target.value })}
                className="w-full md:w-auto px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm text-gray-800 font-medium bg-white"
              >
                <option value="All">All IL Risk Profiles</option>
                <option value="low">Low IL Risk</option>
                <option value="moderate">Moderate IL Risk</option>
                <option value="high">High IL Risk</option>
              </select>
            </div>
          </div>
        </div>

        {/* Pools Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-xl text-gray-900 flex items-center gap-2">
              <Coins className="w-6 h-6 text-emerald-600" />
              Monitored Liquidity Pools ({pools.length})
            </h2>
          </div>

          {pools.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-gray-100">
              <Layers className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h3 className="text-gray-800 font-semibold text-lg">No liquidity pools found</h3>
              <p className="text-gray-500 text-sm mt-1">Try broadening your search or protocol filters.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
              {pools.map((p) => (
                <LiquidityPoolCard
                  key={p.id}
                  pool={p}
                  onHarvestClick={(selected) => setSelectedPool(selected)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Harvest Audit Timeline */}
        <YieldHarvestTimeline harvests={harvests} />

        {/* Harvest Modal */}
        {selectedPool && (
          <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative animate-in fade-in zoom-in duration-200">
              <button
                onClick={() => setSelectedPool(null)}
                className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>

              {isHarvestSuccess ? (
                <div className="text-center py-8 space-y-3">
                  <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto animate-bounce" />
                  <h3 className="text-2xl font-bold text-gray-900">Rewards Harvested!</h3>
                  <p className="text-sm text-gray-600">
                    Harvested {harvestAmount} {rewardToken} from {selectedPool.poolName}. Transaction submitted to network.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleHarvestSubmit} className="space-y-5">
                  <div>
                    <h3 className="font-bold text-gray-900 text-xl">{selectedPool.poolName}</h3>
                    <p className="text-xs text-emerald-600 font-semibold mt-1">
                      Protocol: {selectedPool.protocol} (Est. APY: +{selectedPool.apyPercentage}%)
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Reward Token Symbol</label>
                      <input
                        type="text"
                        required
                        value={rewardToken}
                        onChange={(e) => setRewardToken(e.target.value.toUpperCase())}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Harvest Amount</label>
                      <input
                        type="number"
                        required
                        min={1}
                        value={harvestAmount}
                        onChange={(e) => setHarvestAmount(Number(e.target.value))}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl shadow-md transition-colors text-sm flex items-center justify-center gap-2"
                  >
                    <Coins className="w-4 h-4" />
                    Claim & Harvest Yield Rewards
                  </button>
                </form>
              )}
            </div>
          </div>
        )}

        {/* Add Pool Modal */}
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
                <h3 className="text-2xl font-bold text-gray-900">Add Liquidity Pool</h3>
                <p className="text-xs text-gray-500 mt-1">Track APY yield, TVL, and impermanent loss risk.</p>
              </div>

              <form onSubmit={handleCreateSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Pool Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. ETH / USDC Concentrated Liquidity"
                    value={newPoolName}
                    onChange={(e) => setNewPoolName(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Protocol</label>
                    <select
                      value={newProtocol}
                      onChange={(e) => setNewProtocol(e.target.value as any)}
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 bg-white"
                    >
                      <option value="Uniswap V3">Uniswap V3</option>
                      <option value="Curve Finance">Curve Finance</option>
                      <option value="Balancer">Balancer</option>
                      <option value="PancakeSwap">PancakeSwap</option>
                      <option value="SushiSwap">SushiSwap</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Pair Symbols (comma-separated)</label>
                    <input
                      type="text"
                      required
                      placeholder="ETH, USDC"
                      value={newSymbols}
                      onChange={(e) => setNewSymbols(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Total Value Locked ($)</label>
                    <input
                      type="number"
                      required
                      min={10000}
                      value={newTvl}
                      onChange={(e) => setNewTvl(Number(e.target.value))}
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Estimated APY (%)</label>
                    <input
                      type="number"
                      required
                      min={0}
                      value={newApy}
                      onChange={(e) => setNewApy(Number(e.target.value))}
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">IL Risk</label>
                    <select
                      value={newRisk}
                      onChange={(e) => setNewRisk(e.target.value as any)}
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 bg-white"
                    >
                      <option value="low">Low Risk</option>
                      <option value="moderate">Moderate Risk</option>
                      <option value="high">High Risk</option>
                      <option value="severe">Severe Risk</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Daily Fee Yield ($)</label>
                    <input
                      type="number"
                      required
                      min={0}
                      value={newDailyFee}
                      onChange={(e) => setNewDailyFee(Number(e.target.value))}
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Staked LP Tokens</label>
                    <input
                      type="number"
                      required
                      min={0}
                      value={newStakedLp}
                      onChange={(e) => setNewStakedLp(Number(e.target.value))}
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl shadow-md transition-colors text-sm"
                >
                  Register Liquidity Vault
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
