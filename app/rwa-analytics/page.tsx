'use client';

import React, { useState } from 'react';
import {
  CryptoRwaServiceHandler,
} from '../../lib/CryptoRwaService';
import {
  RwaAssetToken,
  RwaDistributionPayout,
  RwaFilterOptions,
} from '../../lib/CryptoRwaModel';
import { RwaAssetCard } from '../../components/rwa/RwaAssetCard';
import { RwaDistributionTimeline } from '../../components/rwa/RwaDistributionTimeline';
import {
  Building2,
  Search,
  Filter,
  PlusCircle,
  Sparkles,
  CheckCircle2,
  X,
  TrendingUp,
  ShieldCheck,
  Coins,
} from 'lucide-react';

export default function CryptoRwaTokenizationDashboardPage() {
  const [assets, setAssets] = useState<RwaAssetToken[]>(() =>
    CryptoRwaServiceHandler.fetchAssets()
  );
  const [distributions, setDistributions] = useState<RwaDistributionPayout[]>(() =>
    CryptoRwaServiceHandler.fetchDistributionHistory()
  );

  const [filters, setFilters] = useState<RwaFilterOptions>({
    assetCategory: 'All',
    underlyingCustodian: 'All',
    proofOfReserveStatus: 'All',
    searchQuery: '',
  });

  const [selectedAsset, setSelectedAsset] = useState<RwaAssetToken | null>(null);
  const [payoutEpoch, setPayoutEpoch] = useState<number>(19);
  const [payoutYieldUsd, setPayoutYieldUsd] = useState<number>(120000);
  const [isDistributeSuccess, setIsDistributeSuccess] = useState<boolean>(false);

  // Register RWA Asset Modal State
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [newName, setNewName] = useState<string>('');
  const [newCategory, setNewCategory] = useState<'Treasury Bills' | 'Real Estate' | 'Private Credit' | 'Precious Metals' | 'Carbon Credits'>('Treasury Bills');
  const [newSymbol, setNewSymbol] = useState<string>('');
  const [newCustodian, setNewCustodian] = useState<'Ondo Finance' | 'Centrifuge' | 'Paxos' | 'Maple Finance' | 'Tangible'>('Ondo Finance');
  const [newValuation, setNewValuation] = useState<number>(100000000);
  const [newYield, setNewYield] = useState<number>(5.5);
  const [newCollateral, setNewCollateral] = useState<number>(105);

  const applyFilterChanges = (updatedFilters: Partial<RwaFilterOptions>) => {
    const nextFilters = { ...filters, ...updatedFilters };
    setFilters(nextFilters);
    setAssets(CryptoRwaServiceHandler.fetchAssets(nextFilters));
  };

  const handleDistributeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAsset) return;

    CryptoRwaServiceHandler.executeYieldPayout(
      selectedAsset.id,
      payoutEpoch,
      payoutYieldUsd
    );

    setDistributions(CryptoRwaServiceHandler.fetchDistributionHistory());
    setIsDistributeSuccess(true);
    setTimeout(() => {
      setIsDistributeSuccess(false);
      setSelectedAsset(null);
    }, 1800);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    CryptoRwaServiceHandler.registerNewAsset({
      assetName: newName,
      assetCategory: newCategory,
      tokenSymbol: newSymbol,
      underlyingCustodian: newCustodian,
      tokenizedValuationUsd: newValuation,
      annualizedYieldPercentage: newYield,
      proofOfReserveStatus: 'verified-on-chain',
      collateralRatioPercentage: newCollateral,
    });

    setAssets(CryptoRwaServiceHandler.fetchAssets(filters));
    setShowCreateModal(false);
    setNewName('');
    setNewSymbol('');
  };

  return (
    <div className="min-h-screen bg-gray-50/50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Hero Banner */}
        <div className="bg-gradient-to-r from-amber-950 via-yellow-950 to-stone-900 rounded-3xl p-8 sm:p-10 text-white shadow-xl relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 bg-amber-500/20 backdrop-blur-md border border-amber-400/30 px-3.5 py-1.5 rounded-full text-xs font-semibold text-amber-200">
              <Sparkles className="w-4 h-4 text-amber-300" />
              Real-World Asset Tokenization & Chainlink PoR Engine
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight">
              Real-World Asset (RWA) Tokenization Analytics Suite
            </h1>
            <p className="text-amber-200 text-base sm:text-lg leading-relaxed">
              Track tokenized US Treasuries, commercial real estate pools, and private credit vaults across Ondo, Centrifuge, and Paxos with live Proof-of-Reserve attestations.
            </p>
            <div className="pt-2 flex flex-wrap gap-4 items-center">
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-white text-slate-950 font-bold px-6 py-3 rounded-xl shadow-lg hover:bg-amber-50 transition-all flex items-center gap-2 text-sm"
              >
                <PlusCircle className="w-5 h-5 text-amber-700" />
                Register Tokenized RWA Asset
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
                placeholder="Search by asset name, ticker (OUSG), custodian (Ondo, Paxos), or asset category..."
                value={filters.searchQuery}
                onChange={(e) => applyFilterChanges({ searchQuery: e.target.value })}
                className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 text-sm text-gray-900"
              />
            </div>

            {/* Category Dropdown */}
            <div className="flex items-center gap-2 w-full md:w-auto">
              <Filter className="w-4 h-4 text-gray-500" />
              <select
                value={filters.assetCategory}
                onChange={(e) => applyFilterChanges({ assetCategory: e.target.value })}
                className="w-full md:w-auto px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 text-sm text-gray-800 font-medium bg-white"
              >
                <option value="All">All RWA Categories</option>
                <option value="Treasury Bills">Treasury Bills</option>
                <option value="Real Estate">Real Estate</option>
                <option value="Private Credit">Private Credit</option>
                <option value="Precious Metals">Precious Metals</option>
                <option value="Carbon Credits">Carbon Credits</option>
              </select>

              {/* Custodian Dropdown */}
              <select
                value={filters.underlyingCustodian}
                onChange={(e) => applyFilterChanges({ underlyingCustodian: e.target.value })}
                className="w-full md:w-auto px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 text-sm text-gray-800 font-medium bg-white"
              >
                <option value="All">All Custodians</option>
                <option value="Ondo Finance">Ondo Finance</option>
                <option value="Centrifuge">Centrifuge</option>
                <option value="Paxos">Paxos</option>
                <option value="Maple Finance">Maple Finance</option>
                <option value="Tangible">Tangible</option>
              </select>
            </div>
          </div>
        </div>

        {/* Assets Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-xl text-gray-900 flex items-center gap-2">
              <Building2 className="w-6 h-6 text-amber-700" />
              Monitored RWA Token Assets ({assets.length})
            </h2>
          </div>

          {assets.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-gray-100">
              <Coins className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h3 className="text-gray-800 font-semibold text-lg">No tokenized assets found</h3>
              <p className="text-gray-500 text-sm mt-1">Try broadening your search or category filters.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
              {assets.map((a) => (
                <RwaAssetCard
                  key={a.id}
                  asset={a}
                  onDistributeClick={(selected) => setSelectedAsset(selected)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Distribution Audit Timeline */}
        <RwaDistributionTimeline distributions={distributions} />

        {/* Yield Payout Modal */}
        {selectedAsset && (
          <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative animate-in fade-in zoom-in duration-200">
              <button
                onClick={() => setSelectedAsset(null)}
                className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>

              {isDistributeSuccess ? (
                <div className="text-center py-8 space-y-3">
                  <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto animate-bounce" />
                  <h3 className="text-2xl font-bold text-gray-900">Yield Payout Distributed!</h3>
                  <p className="text-sm text-gray-600">
                    Distributed ${payoutYieldUsd.toLocaleString()} yield harvest to holders of {selectedAsset.tokenSymbol} (Epoch #{payoutEpoch}).
                  </p>
                </div>
              ) : (
                <form onSubmit={handleDistributeSubmit} className="space-y-5">
                  <div>
                    <h3 className="font-bold text-gray-900 text-xl">{selectedAsset.assetName}</h3>
                    <p className="text-xs text-amber-700 font-semibold mt-1">
                      Custodian: {selectedAsset.underlyingCustodian} (Yield: +{selectedAsset.annualizedYieldPercentage}% APY)
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Epoch / Distribution Period Number</label>
                      <input
                        type="number"
                        required
                        value={payoutEpoch}
                        onChange={(e) => setPayoutEpoch(Number(e.target.value))}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Total Distribution Yield ($ USD)</label>
                      <input
                        type="number"
                        required
                        min={1000}
                        value={payoutYieldUsd}
                        onChange={(e) => setPayoutYieldUsd(Number(e.target.value))}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 rounded-xl shadow-md transition-colors text-sm flex items-center justify-center gap-2"
                  >
                    <TrendingUp className="w-4 h-4" />
                    Trigger Chainlink Oracle Yield Distribution
                  </button>
                </form>
              )}
            </div>
          </div>
        )}

        {/* Create Asset Modal */}
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
                <h3 className="text-2xl font-bold text-gray-900">Register Tokenized RWA Asset</h3>
                <p className="text-xs text-gray-500 mt-1">Register real-world collateral vault with Proof-of-Reserve parameters.</p>
              </div>

              <form onSubmit={handleCreateSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Asset Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. US Short-Term Treasury Bill Vault"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Category</label>
                    <select
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value as any)}
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 bg-white"
                    >
                      <option value="Treasury Bills">Treasury Bills</option>
                      <option value="Real Estate">Real Estate</option>
                      <option value="Private Credit">Private Credit</option>
                      <option value="Precious Metals">Precious Metals</option>
                      <option value="Carbon Credits">Carbon Credits</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Token Ticker</label>
                    <input
                      type="text"
                      required
                      placeholder="OUSG"
                      value={newSymbol}
                      onChange={(e) => setNewSymbol(e.target.value.toUpperCase())}
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Underlying Custodian</label>
                    <select
                      value={newCustodian}
                      onChange={(e) => setNewCustodian(e.target.value as any)}
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 bg-white"
                    >
                      <option value="Ondo Finance">Ondo Finance</option>
                      <option value="Centrifuge">Centrifuge</option>
                      <option value="Paxos">Paxos</option>
                      <option value="Maple Finance">Maple Finance</option>
                      <option value="Tangible">Tangible</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Tokenized Valuation ($)</label>
                    <input
                      type="number"
                      required
                      min={100000}
                      value={newValuation}
                      onChange={(e) => setNewValuation(Number(e.target.value))}
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Annual Yield % (APY)</label>
                    <input
                      type="number"
                      required
                      step="0.1"
                      min={0}
                      value={newYield}
                      onChange={(e) => setNewYield(Number(e.target.value))}
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Collateral Ratio %</label>
                    <input
                      type="number"
                      required
                      min={100}
                      value={newCollateral}
                      onChange={(e) => setNewCollateral(Number(e.target.value))}
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 rounded-xl shadow-md transition-colors text-sm"
                >
                  Register Tokenized RWA Vault
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
