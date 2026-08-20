'use client';

import React, { useState } from 'react';
import { CryptoBridgeServiceHandler } from '../../lib/CryptoBridgeService';
import { CrossChainBridgeRoute, BridgeTransferAuditRecord, BridgeFilterOptions } from '../../lib/CryptoBridgeModel';
import { BridgeRouteCardTile } from '../../components/bridge/BridgeRouteCardTile';
import { BridgeTransferAuditList } from '../../components/bridge/BridgeTransferAuditList';
import { ArrowRightLeft, ShieldCheck, Search, Filter, PlusCircle, Zap, Clock, X, CheckCircle2 } from 'lucide-react';

export default function CrossChainBridgeAnalyticsDashboardPage() {
  const [routes, setRoutes] = useState<CrossChainBridgeRoute[]>(() =>
    CryptoBridgeServiceHandler.fetchRoutes()
  );
  const [records, setRecords] = useState<BridgeTransferAuditRecord[]>(() =>
    CryptoBridgeServiceHandler.fetchTransferRecords()
  );

  const [filters, setFilters] = useState<BridgeFilterOptions>({
    sourceChain: 'All',
    targetChain: 'All',
    bridgeProtocol: 'All',
    searchQuery: '',
  });

  const [selectedRoute, setSelectedRoute] = useState<CrossChainBridgeRoute | null>(null);
  const [transferAmount, setTransferAmount] = useState<number>(10000);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);

  // Form State
  const [newBridgeName, setNewBridgeName] = useState<string>('LayerZero Omnichain Pool');
  const [newSource, setNewSource] = useState<string>('Avalanche C-Chain');
  const [newTarget, setNewTarget] = useState<string>('Arbitrum One');
  const [newToken, setNewToken] = useState<string>('USDC');
  const [newProtocol, setNewProtocol] = useState<'LayerZero' | 'Stargate' | 'Wormhole' | 'Hop Protocol' | 'Arbitrum Bridge'>('LayerZero');
  const [newLiquidity, setNewLiquidity] = useState<number>(35000000);
  const [newFee, setNewFee] = useState<number>(3.50);
  const [newLatency, setNewLatency] = useState<number>(3);

  const applyFilterChanges = (updated: Partial<BridgeFilterOptions>) => {
    const next = { ...filters, ...updated };
    setFilters(next);
    setRoutes(CryptoBridgeServiceHandler.fetchRoutes(next));
  };

  const handleExecuteTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoute) return;

    CryptoBridgeServiceHandler.executeBridgeTransfer(selectedRoute.id, transferAmount);
    setRecords(CryptoBridgeServiceHandler.fetchTransferRecords());
    setIsSuccess(true);
    setTimeout(() => {
      setIsSuccess(false);
      setSelectedRoute(null);
    }, 1800);
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    CryptoBridgeServiceHandler.registerNewRoute({
      bridgeName: newBridgeName,
      sourceChain: newSource,
      targetChain: newTarget,
      tokenSymbol: newToken,
      bridgeProtocol: newProtocol,
      poolLiquidityUsd: newLiquidity,
      estimatedFeeUsd: newFee,
      estimatedLatencyMinutes: newLatency,
      slippageTolerancePercentage: 0.05,
      securityRating: 'AAA+',
    });

    setRoutes(CryptoBridgeServiceHandler.fetchRoutes(filters));
    setShowCreateModal(false);
  };

  return (
    <div className="min-h-screen bg-gray-50/50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header Hero Banner */}
        <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 rounded-3xl p-8 sm:p-10 text-white shadow-xl relative overflow-hidden">
          <div className="relative z-10 max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 bg-blue-500/20 backdrop-blur-md border border-blue-400/30 px-3.5 py-1.5 rounded-full text-xs font-semibold text-blue-200">
              <ArrowRightLeft className="w-4 h-4 text-blue-300" />
              Cross-Chain Liquidity & Optimal Routing Radar
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight">
              Cross-Chain Bridge Liquidity & Route Optimizing Suite
            </h1>
            <p className="text-blue-200 text-base sm:text-lg leading-relaxed">
              Compare cross-chain bridge routes (LayerZero, Stargate, Wormhole), calculate gas costs and latency, and optimize cross-chain liquidity transfers with minimum slippage.
            </p>
            <div className="pt-2">
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-white text-slate-950 font-bold px-6 py-3 rounded-xl shadow-lg hover:bg-blue-50 transition-all flex items-center gap-2 text-sm"
              >
                <PlusCircle className="w-5 h-5 text-blue-600" />
                Register Bridge Route Node
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
              placeholder="Search by bridge name (Stargate, Wormhole) or asset symbol (USDC, ETH)..."
              value={filters.searchQuery}
              onChange={(e) => applyFilterChanges({ searchQuery: e.target.value })}
              className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm text-gray-900"
            />
          </div>

          <div className="flex gap-2 w-full md:w-auto">
            <select
              value={filters.bridgeProtocol}
              onChange={(e) => applyFilterChanges({ bridgeProtocol: e.target.value })}
              className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-800 font-medium bg-white"
            >
              <option value="All">All Bridge Protocols</option>
              <option value="LayerZero">LayerZero</option>
              <option value="Stargate">Stargate</option>
              <option value="Wormhole">Wormhole</option>
              <option value="Hop Protocol">Hop Protocol</option>
            </select>
          </div>
        </div>

        {/* Routes Grid */}
        <div className="space-y-4">
          <h2 className="font-bold text-xl text-gray-900 flex items-center gap-2">
            <Zap className="w-6 h-6 text-blue-600" />
            Optimized Cross-Chain Routes ({routes.length})
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {routes.map((r) => (
              <BridgeRouteCardTile key={r.id} route={r} onSelect={(selected) => setSelectedRoute(selected)} />
            ))}
          </div>
        </div>

        {/* Transfer Audit List */}
        <BridgeTransferAuditList records={records} />

        {/* Execution Modal */}
        {selectedRoute && (
          <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative">
              <button
                onClick={() => setSelectedRoute(null)}
                className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>

              {isSuccess ? (
                <div className="text-center py-8 space-y-3">
                  <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto animate-bounce" />
                  <h3 className="text-2xl font-bold text-gray-900">Bridge Transfer Initiated!</h3>
                  <p className="text-sm text-gray-600">
                    Transferred ${transferAmount.toLocaleString()} {selectedRoute.tokenSymbol} via {selectedRoute.bridgeName}.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleExecuteTransfer} className="space-y-4 text-xs">
                  <div>
                    <h3 className="font-bold text-gray-900 text-xl">{selectedRoute.bridgeName}</h3>
                    <p className="text-xs text-blue-600 font-semibold mt-0.5">
                      Route: {selectedRoute.sourceChain} ➔ {selectedRoute.targetChain}
                    </p>
                  </div>

                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Transfer Amount ($ USD)</label>
                    <input
                      type="number"
                      required
                      min={100}
                      value={transferAmount}
                      onChange={(e) => setTransferAmount(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl shadow-md transition-colors text-sm"
                  >
                    Confirm & Execute Cross-Chain Transfer
                  </button>
                </form>
              )}
            </div>
          </div>
        )}

        {/* Register Route Modal */}
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
                <h3 className="text-2xl font-bold text-gray-900">Register Bridge Route Node</h3>
                <p className="text-xs text-gray-500">Configure cross-chain liquidity pool and fee estimates.</p>
              </div>

              <form onSubmit={handleRegisterSubmit} className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Bridge Pool Name</label>
                  <input
                    type="text"
                    required
                    value={newBridgeName}
                    onChange={(e) => setNewBridgeName(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Source Chain</label>
                    <input
                      type="text"
                      required
                      value={newSource}
                      onChange={(e) => setNewSource(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Target Chain</label>
                    <input
                      type="text"
                      required
                      value={newTarget}
                      onChange={(e) => setNewTarget(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Token</label>
                    <input
                      type="text"
                      required
                      value={newToken}
                      onChange={(e) => setNewToken(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Est. Gas ($)</label>
                    <input
                      type="number"
                      required
                      value={newFee}
                      onChange={(e) => setNewFee(Number(e.target.value))}
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Latency (Mins)</label>
                    <input
                      type="number"
                      required
                      value={newLatency}
                      onChange={(e) => setNewLatency(Number(e.target.value))}
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl shadow-md transition-colors text-sm"
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
