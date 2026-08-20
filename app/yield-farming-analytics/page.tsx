'use client';

import React, { useState } from 'react';
import { CryptoYieldServiceHandler } from '../../lib/CryptoYieldService';
import { YieldFarmingPool, LiquidityPositionRecord, YieldFilterOptions } from '../../lib/CryptoYieldModel';
import { YieldPoolCardTile } from '../../components/yield/YieldPoolCardTile';
import { ActivePositionsList } from '../../components/yield/ActivePositionsList';
import { Coins, TrendingUp, Search, Filter, PlusCircle, AlertTriangle, ShieldCheck, X, CheckCircle2 } from 'lucide-react';

export default function YieldFarmingAnalyticsDashboardPage() {
  const [pools, setPools] = useState<YieldFarmingPool[]>(() =>
    CryptoYieldServiceHandler.fetchPools()
  );
  const [positions, setPositions] = useState<LiquidityPositionRecord[]>(() =>
    CryptoYieldServiceHandler.fetchPositions()
  );

  const [filters, setFilters] = useState<YieldFilterOptions>({
    dexProtocol: 'All',
    impermanentLossRisk: 'All',
    searchQuery: '',
  });

  const [selectedPool, setSelectedPool] = useState<YieldFarmingPool | null>(null);
  const [depositAmount, setDepositAmount] = useState<number>(5000);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);

  // Form State
  const [newPoolName, setNewPoolName] = useState<string>('Balancer 80/20 WETH/BAL');
  const [newProtocol, setNewProtocol] = useState<'Uniswap V3' | 'Curve Finance' | 'Balancer' | 'Raydium' | 'Aerodrome'>('Balancer');
  const [newPair, setNewPair] = useState<string>('WETH / BAL');
  const [newTvl, setNewTvl] = useState<number>(45000000);
  const [newBaseApy, setNewBaseApy] = useState<number>(11.5);
  const [newRewardApy, setNewRewardApy] = useState<number>(14.2);
  const [newRisk, setNewRisk] = useState<'Low' | 'Moderate' | 'High' | 'Extreme'>('Moderate');

  const applyFilterChanges = (updated: Partial<YieldFilterOptions>) => {
    const next = { ...filters, ...updated };
    setFilters(next);
    setPools(CryptoYieldServiceHandler.fetchPools(next));
  };

  const handleDepositSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPool) return;

    CryptoYieldServiceHandler.executeDeposit(selectedPool.id, depositAmount);
    setPositions(CryptoYieldServiceHandler.fetchPositions());
    setIsSuccess(true);
    setTimeout(() => {
      setIsSuccess(false);
      setSelectedPool(null);
    }, 1800);
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const total = newBaseApy + newRewardApy;
    CryptoYieldServiceHandler.registerNewPool({
      poolName: newPoolName,
      dexProtocol: newProtocol,
      tokenPair: newPair,
      tvlUsd: newTvl,
      baseApyPercentage: newBaseApy,
      rewardTokenApyPercentage: newRewardApy,
      totalApyPercentage: total,
      impermanentLossRisk: newRisk,
      feeTierPercentage: 0.3,
    });

    setPools(CryptoYieldServiceHandler.fetchPools(filters));
    setShowCreateModal(false);
  };

  return (
    <div className="min-h-screen bg-gray-50/50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header Hero Banner */}
        <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 rounded-3xl p-8 sm:p-10 text-white shadow-xl relative overflow-hidden">
          <div className="relative z-10 max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 bg-emerald-500/20 backdrop-blur-md border border-emerald-400/30 px-3.5 py-1.5 rounded-full text-xs font-semibold text-emerald-200">
              <Coins className="w-4 h-4 text-emerald-300" />
              DeFi Yield Optimization & Impermanent Loss Radar
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight">
              Liquidity Pool Yield Farming & Impermanent Loss Suite
            </h1>
            <p className="text-emerald-200 text-base sm:text-lg leading-relaxed">
              Calculate APY/APR yields, model impermanent loss risk across volatile token pairs, and deposit liquidity into top-performing cross-DEX pools.
            </p>
            <div className="pt-2">
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-white text-slate-950 font-bold px-6 py-3 rounded-xl shadow-lg hover:bg-emerald-50 transition-all flex items-center gap-2 text-sm"
              >
                <PlusCircle className="w-5 h-5 text-emerald-600" />
                Register Liquidity Pool Node
              </button>
            </div>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative flex-1 w-full">
            <Search className="w-5 h-5 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search pools by name or token pair (e.g. Uniswap, WETH/USDC)..."
              value={filters.searchQuery}
              onChange={(e) => applyFilterChanges({ searchQuery: e.target.value })}
              className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm text-gray-900"
            />
          </div>

          <div className="flex gap-2 w-full md:w-auto">
            <select
              value={filters.dexProtocol}
              onChange={(e) => applyFilterChanges({ dexProtocol: e.target.value })}
              className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-800 font-medium bg-white"
            >
              <option value="All">All DEX Protocols</option>
              <option value="Uniswap V3">Uniswap V3</option>
              <option value="Curve Finance">Curve Finance</option>
              <option value="Balancer">Balancer</option>
              <option value="Raydium">Raydium</option>
            </select>
          </div>
        </div>

        {/* Yield Pools Grid */}
        <div className="space-y-4">
          <h2 className="font-bold text-xl text-gray-900 flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-emerald-600" />
            High-Yield Farming Pools ({pools.length})
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pools.map((p) => (
              <YieldPoolCardTile key={p.id} pool={p} onSelect={(selected) => setSelectedPool(selected)} />
            ))}
          </div>
        </div>

        {/* Active Positions List */}
        <ActivePositionsList positions={positions} />

        {/* Deposit Modal */}
        {selectedPool && (
          <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative">
              <button
                onClick={() => setSelectedPool(null)}
                className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>

              {isSuccess ? (
                <div className="text-center py-8 space-y-3">
                  <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto animate-bounce" />
                  <h3 className="text-2xl font-bold text-gray-900">Liquidity Position Deposited!</h3>
                  <p className="text-sm text-gray-600">
                    Deposited ${depositAmount.toLocaleString()} into {selectedPool.poolName}.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleDepositSubmit} className="space-y-4 text-xs">
                  <div>
                    <h3 className="font-bold text-gray-900 text-xl">{selectedPool.poolName}</h3>
                    <p className="text-xs text-emerald-600 font-semibold mt-0.5">
                      Net APY: {selectedPool.totalApyPercentage}% ({selectedPool.dexProtocol})
                    </p>
                  </div>

                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Deposit Amount ($ USD)</label>
                    <input
                      type="number"
                      required
                      min={100}
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl shadow-md transition-colors text-sm"
                  >
                    Confirm & Deposit Liquidity
                  </button>
                </form>
              )}
            </div>
          </div>
        )}

        {/* Register Pool Modal */}
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
                <h3 className="text-2xl font-bold text-gray-900">Register Liquidity Pool Node</h3>
                <p className="text-xs text-gray-500">Configure yield parameters and impermanent loss risk profile.</p>
              </div>

              <form onSubmit={handleRegisterSubmit} className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Pool Name</label>
                  <input
                    type="text"
                    required
                    value={newPoolName}
                    onChange={(e) => setNewPoolName(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">DEX Protocol</label>
                    <select
                      value={newProtocol}
                      onChange={(e) => setNewProtocol(e.target.value as any)}
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm bg-white"
                    >
                      <option value="Uniswap V3">Uniswap V3</option>
                      <option value="Curve Finance">Curve Finance</option>
                      <option value="Balancer">Balancer</option>
                      <option value="Raydium">Raydium</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Token Pair</label>
                    <input
                      type="text"
                      required
                      value={newPair}
                      onChange={(e) => setNewPair(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">TVL ($)</label>
                    <input
                      type="number"
                      required
                      value={newTvl}
                      onChange={(e) => setNewTvl(Number(e.target.value))}
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Base APY %</label>
                    <input
                      type="number"
                      required
                      value={newBaseApy}
                      onChange={(e) => setNewBaseApy(Number(e.target.value))}
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Reward APR %</label>
                    <input
                      type="number"
                      required
                      value={newRewardApy}
                      onChange={(e) => setNewRewardApy(Number(e.target.value))}
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl shadow-md transition-colors text-sm"
                >
                  Register Yield Pool
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
