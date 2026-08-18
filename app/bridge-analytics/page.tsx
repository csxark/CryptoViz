'use client';

import React, { useState } from 'react';
import {
  CryptoBridgeServiceHandler,
} from '../../lib/CryptoBridgeService';
import {
  CrossChainBridgeRoute,
  BridgeTransferTransaction,
  BridgeFilterOptions,
} from '../../lib/CryptoBridgeModel';
import { CrossChainBridgeCard } from '../../components/bridge/CrossChainBridgeCard';
import { BridgeTransferTimeline } from '../../components/bridge/BridgeTransferTimeline';
import {
  Network,
  Search,
  Filter,
  PlusCircle,
  Sparkles,
  CheckCircle2,
  X,
  Layers,
  ArrowRight,
} from 'lucide-react';

export default function CryptoBridgeLiquidityDashboardPage() {
  const [routes, setRoutes] = useState<CrossChainBridgeRoute[]>(() =>
    CryptoBridgeServiceHandler.fetchBridgeRoutes()
  );
  const [transfers, setTransfers] = useState<BridgeTransferTransaction[]>(() =>
    CryptoBridgeServiceHandler.fetchTransferHistory()
  );

  const [filters, setFilters] = useState<BridgeFilterOptions>({
    sourceChain: 'All',
    targetChain: 'All',
    bridgeProtocol: 'All',
    searchQuery: '',
  });

  const [selectedRoute, setSelectedRoute] = useState<CrossChainBridgeRoute | null>(null);
  const [transferToken, setTransferToken] = useState<string>('USDC');
  const [transferAmount, setTransferAmount] = useState<number>(10000);
  const [isTransferSuccess, setIsTransferSuccess] = useState<boolean>(false);

  // Register Route Modal State
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [newSourceChain, setNewSourceChain] = useState<'Ethereum' | 'Arbitrum' | 'Optimism' | 'Solana' | 'Polygon' | 'Avalanche'>('Ethereum');
  const [newTargetChain, setNewTargetChain] = useState<'Ethereum' | 'Arbitrum' | 'Optimism' | 'Solana' | 'Polygon' | 'Avalanche'>('Arbitrum');
  const [newBridgeProtocol, setNewBridgeProtocol] = useState<'Stargate' | 'Hop Protocol' | 'Synapse' | 'Wormhole' | 'Across'>('Stargate');
  const [newTokens, setNewTokens] = useState<string>('USDC, ETH');
  const [newLiquidity, setNewLiquidity] = useState<number>(50000000);
  const [newTime, setNewTime] = useState<number>(3);
  const [newFee, setNewFee] = useState<number>(0.05);
  const [newGas, setNewGas] = useState<number>(12);
  const [newSecurity, setNewSecurity] = useState<number>(95);

  const applyFilterChanges = (updatedFilters: Partial<BridgeFilterOptions>) => {
    const nextFilters = { ...filters, ...updatedFilters };
    setFilters(nextFilters);
    setRoutes(CryptoBridgeServiceHandler.fetchBridgeRoutes(nextFilters));
  };

  const handleTransferSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoute) return;

    CryptoBridgeServiceHandler.executeCrossChainRelay(
      selectedRoute.id,
      transferToken,
      transferAmount
    );

    setTransfers(CryptoBridgeServiceHandler.fetchTransferHistory());
    setIsTransferSuccess(true);
    setTimeout(() => {
      setIsTransferSuccess(false);
      setSelectedRoute(null);
    }, 1800);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    CryptoBridgeServiceHandler.registerNewBridgeRoute({
      sourceChain: newSourceChain,
      targetChain: newTargetChain,
      bridgeProtocol: newBridgeProtocol,
      supportedTokens: newTokens.split(',').map((s) => s.trim().toUpperCase()),
      totalBridgeLiquidityUsd: newLiquidity,
      estimatedTransferTimeMinutes: newTime,
      protocolFeePercentage: newFee,
      gasCostEstimateUsd: newGas,
      bridgeSecurityScore: newSecurity,
    });

    setRoutes(CryptoBridgeServiceHandler.fetchBridgeRoutes(filters));
    setShowCreateModal(false);
  };

  return (
    <div className="min-h-screen bg-gray-50/50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Hero Banner */}
        <div className="bg-gradient-to-r from-cyan-950 via-teal-900 to-slate-950 rounded-3xl p-8 sm:p-10 text-white shadow-xl relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 bg-cyan-500/20 backdrop-blur-md border border-cyan-400/30 px-3.5 py-1.5 rounded-full text-xs font-semibold text-cyan-200">
              <Sparkles className="w-4 h-4 text-cyan-300" />
              Cross-Chain Liquidity & Relayer Telemetry Engine
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight">
              Cross-Chain Bridge Liquidity & Analytics Suite
            </h1>
            <p className="text-cyan-200 text-base sm:text-lg leading-relaxed">
              Monitor bridge pool liquidity across Stargate, Wormhole, Hop, and Across, track estimated relay latency, gas costs, and audit security scores.
            </p>
            <div className="pt-2 flex flex-wrap gap-4 items-center">
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-white text-slate-950 font-bold px-6 py-3 rounded-xl shadow-lg hover:bg-cyan-50 transition-all flex items-center gap-2 text-sm"
              >
                <PlusCircle className="w-5 h-5 text-cyan-600" />
                Register Bridge Protocol Route
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
                placeholder="Search by bridge protocol (Stargate, Wormhole), source/target chain, or token (USDC)..."
                value={filters.searchQuery}
                onChange={(e) => applyFilterChanges({ searchQuery: e.target.value })}
                className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-600 text-sm text-gray-900"
              />
            </div>

            {/* Bridge Protocol Dropdown */}
            <div className="flex items-center gap-2 w-full md:w-auto">
              <Filter className="w-4 h-4 text-gray-500" />
              <select
                value={filters.bridgeProtocol}
                onChange={(e) => applyFilterChanges({ bridgeProtocol: e.target.value })}
                className="w-full md:w-auto px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 text-sm text-gray-800 font-medium bg-white"
              >
                <option value="All">All Bridge Protocols</option>
                <option value="Stargate">Stargate</option>
                <option value="Hop Protocol">Hop Protocol</option>
                <option value="Synapse">Synapse</option>
                <option value="Wormhole">Wormhole</option>
                <option value="Across">Across</option>
              </select>

              {/* Source Chain Dropdown */}
              <select
                value={filters.sourceChain}
                onChange={(e) => applyFilterChanges({ sourceChain: e.target.value })}
                className="w-full md:w-auto px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 text-sm text-gray-800 font-medium bg-white"
              >
                <option value="All">All Source Chains</option>
                <option value="Ethereum">Ethereum</option>
                <option value="Arbitrum">Arbitrum</option>
                <option value="Optimism">Optimism</option>
                <option value="Solana">Solana</option>
                <option value="Polygon">Polygon</option>
              </select>
            </div>
          </div>
        </div>

        {/* Routes Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-xl text-gray-900 flex items-center gap-2">
              <Network className="w-6 h-6 text-cyan-600" />
              Monitored Bridge Liquidity Routes ({routes.length})
            </h2>
          </div>

          {routes.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-gray-100">
              <Layers className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h3 className="text-gray-800 font-semibold text-lg">No bridge routes found</h3>
              <p className="text-gray-500 text-sm mt-1">Try broadening your search or chain filters.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
              {routes.map((r) => (
                <CrossChainBridgeCard
                  key={r.id}
                  route={r}
                  onBridgeClick={(selected) => setSelectedRoute(selected)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Transfer Audit Timeline */}
        <BridgeTransferTimeline transfers={transfers} />

        {/* Bridge Transfer Modal */}
        {selectedRoute && (
          <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative animate-in fade-in zoom-in duration-200">
              <button
                onClick={() => setSelectedRoute(null)}
                className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>

              {isTransferSuccess ? (
                <div className="text-center py-8 space-y-3">
                  <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto animate-bounce" />
                  <h3 className="text-2xl font-bold text-gray-900">Transfer Relayed!</h3>
                  <p className="text-sm text-gray-600">
                    Relayed {transferAmount} {transferToken} from {selectedRoute.sourceChain} to {selectedRoute.targetChain} via {selectedRoute.bridgeProtocol}.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleTransferSubmit} className="space-y-5">
                  <div>
                    <h3 className="font-bold text-gray-900 text-xl">{selectedRoute.sourceChain} ➔ {selectedRoute.targetChain}</h3>
                    <p className="text-xs text-cyan-600 font-semibold mt-1">
                      Protocol: {selectedRoute.bridgeProtocol} (Est. Latency: ~{selectedRoute.estimatedTransferTimeMinutes} mins)
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Transfer Token Symbol</label>
                      <input
                        type="text"
                        required
                        value={transferToken}
                        onChange={(e) => setTransferToken(e.target.value.toUpperCase())}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Transfer Amount ($)</label>
                      <input
                        type="number"
                        required
                        min={10}
                        value={transferAmount}
                        onChange={(e) => setTransferAmount(Number(e.target.value))}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-3 rounded-xl shadow-md transition-colors text-sm flex items-center justify-center gap-2"
                  >
                    <Network className="w-4 h-4" />
                    Confirm & Relay Cross-Chain Transfer
                  </button>
                </form>
              )}
            </div>
          </div>
        )}

        {/* Create Route Modal */}
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
                <h3 className="text-2xl font-bold text-gray-900">Register Bridge Route</h3>
                <p className="text-xs text-gray-500 mt-1">Configure cross-chain liquidity and relayer telemetry parameters.</p>
              </div>

              <form onSubmit={handleCreateSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Source Chain</label>
                    <select
                      value={newSourceChain}
                      onChange={(e) => setNewSourceChain(e.target.value as any)}
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20 bg-white"
                    >
                      <option value="Ethereum">Ethereum</option>
                      <option value="Arbitrum">Arbitrum</option>
                      <option value="Optimism">Optimism</option>
                      <option value="Solana">Solana</option>
                      <option value="Polygon">Polygon</option>
                      <option value="Avalanche">Avalanche</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Target Chain</label>
                    <select
                      value={newTargetChain}
                      onChange={(e) => setNewTargetChain(e.target.value as any)}
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20 bg-white"
                    >
                      <option value="Ethereum">Ethereum</option>
                      <option value="Arbitrum">Arbitrum</option>
                      <option value="Optimism">Optimism</option>
                      <option value="Solana">Solana</option>
                      <option value="Polygon">Polygon</option>
                      <option value="Avalanche">Avalanche</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Bridge Protocol</label>
                    <select
                      value={newBridgeProtocol}
                      onChange={(e) => setNewBridgeProtocol(e.target.value as any)}
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20 bg-white"
                    >
                      <option value="Stargate">Stargate</option>
                      <option value="Hop Protocol">Hop Protocol</option>
                      <option value="Synapse">Synapse</option>
                      <option value="Wormhole">Wormhole</option>
                      <option value="Across">Across</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Supported Tokens (comma-separated)</label>
                    <input
                      type="text"
                      required
                      placeholder="USDC, ETH"
                      value={newTokens}
                      onChange={(e) => setNewTokens(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Bridge TVL Liquidity ($)</label>
                    <input
                      type="number"
                      required
                      min={100000}
                      value={newLiquidity}
                      onChange={(e) => setNewLiquidity(Number(e.target.value))}
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Est. Transfer Time (mins)</label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={newTime}
                      onChange={(e) => setNewTime(Number(e.target.value))}
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Protocol Fee %</label>
                    <input
                      type="number"
                      required
                      step="0.01"
                      min={0}
                      value={newFee}
                      onChange={(e) => setNewFee(Number(e.target.value))}
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Gas Cost ($)</label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={newGas}
                      onChange={(e) => setNewGas(Number(e.target.value))}
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Security Score</label>
                    <input
                      type="number"
                      required
                      min={0}
                      max={100}
                      value={newSecurity}
                      onChange={(e) => setNewSecurity(Number(e.target.value))}
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-3 rounded-xl shadow-md transition-colors text-sm"
                >
                  Register Bridge Route
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
