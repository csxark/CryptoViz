'use client';

import React, { useState } from 'react';
import {
  CryptoCustodyServiceHandler,
} from '../../lib/CryptoCustodyService';
import {
  CustodyVault,
  CustodyWithdrawalApproval,
  CustodyFilterOptions,
} from '../../lib/CryptoCustodyModel';
import { InstitutionalCustodyVaultCard } from '../../components/custody/InstitutionalCustodyVaultCard';
import { CustodyApprovalTimeline } from '../../components/custody/CustodyApprovalTimeline';
import {
  Lock,
  Search,
  Filter,
  PlusCircle,
  Sparkles,
  CheckCircle2,
  X,
  ShieldCheck,
  Building,
} from 'lucide-react';

export default function CryptoCustodyComplianceDashboardPage() {
  const [vaults, setVaults] = useState<CustodyVault[]>(() =>
    CryptoCustodyServiceHandler.fetchCustodyVaults()
  );
  const [approvals, setApprovals] = useState<CustodyWithdrawalApproval[]>(() =>
    CryptoCustodyServiceHandler.fetchApprovalHistory()
  );

  const [filters, setFilters] = useState<CustodyFilterOptions>({
    custodianProvider: 'All',
    vaultAssetType: 'All',
    amlComplianceStatus: 'All',
    searchQuery: '',
  });

  const [selectedVault, setSelectedVault] = useState<CustodyVault | null>(null);
  const [destinationAddr, setDestinationAddr] = useState<string>('0x7a81...44b9');
  const [assetSym, setAssetSym] = useState<string>('USDC');
  const [withdrawAmt, setWithdrawAmt] = useState<number>(2500000);
  const [isWithdrawSuccess, setIsWithdrawSuccess] = useState<boolean>(false);

  // Register Vault Modal State
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [newName, setNewName] = useState<string>('');
  const [newCustodian, setNewCustodian] = useState<'Fireblocks' | 'BitGo' | 'Coinbase Custody' | 'Anchorage Digital' | 'Ledger Enterprise'>('Fireblocks');
  const [newThreshold, setNewThreshold] = useState<string>('3-of-5 MPC');
  const [newStorageType, setNewStorageType] = useState<'Cold Storage' | 'MPC Warm Vault' | 'Institutional Staking' | 'Settlement Collateral'>('Cold Storage');
  const [newBalance, setNewBalance] = useState<number>(50000000);
  const [newAssets, setNewAssets] = useState<string>('BTC, ETH');
  const [newTimelock, setNewTimelock] = useState<number>(24);

  const applyFilterChanges = (updatedFilters: Partial<CustodyFilterOptions>) => {
    const nextFilters = { ...filters, ...updatedFilters };
    setFilters(nextFilters);
    setVaults(CryptoCustodyServiceHandler.fetchCustodyVaults(nextFilters));
  };

  const handleWithdrawSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVault) return;

    CryptoCustodyServiceHandler.submitWithdrawalRequest(
      selectedVault.id,
      destinationAddr,
      assetSym,
      withdrawAmt
    );

    setApprovals(CryptoCustodyServiceHandler.fetchApprovalHistory());
    setIsWithdrawSuccess(true);
    setTimeout(() => {
      setIsWithdrawSuccess(false);
      setSelectedVault(null);
    }, 1800);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    CryptoCustodyServiceHandler.registerNewVault({
      vaultName: newName,
      custodianProvider: newCustodian,
      signatoryThreshold: newThreshold,
      vaultAssetType: newStorageType,
      totalBalanceUsd: newBalance,
      primaryAssets: newAssets.split(',').map((s) => s.trim().toUpperCase()),
      amlComplianceStatus: 'verified',
      timelockDelayHours: newTimelock,
    });

    setVaults(CryptoCustodyServiceHandler.fetchCustodyVaults(filters));
    setShowCreateModal(false);
    setNewName('');
  };

  return (
    <div className="min-h-screen bg-gray-50/50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-zinc-900 rounded-3xl p-8 sm:p-10 text-white shadow-xl relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 bg-emerald-500/20 backdrop-blur-md border border-emerald-400/30 px-3.5 py-1.5 rounded-full text-xs font-semibold text-emerald-200">
              <Sparkles className="w-4 h-4 text-emerald-300" />
              Institutional MPC Multisig & AML Compliance Vault Engine
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight">
              Institutional Custody Vault & Compliance Suite
            </h1>
            <p className="text-gray-300 text-base sm:text-lg leading-relaxed">
              Manage Fireblocks and BitGo institutional cold vaults, track MPC signatory thresholds, monitor AML sanction compliance, and enforce timelock policies.
            </p>
            <div className="pt-2 flex flex-wrap gap-4 items-center">
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-white text-slate-950 font-bold px-6 py-3 rounded-xl shadow-lg hover:bg-gray-100 transition-all flex items-center gap-2 text-sm"
              >
                <PlusCircle className="w-5 h-5 text-slate-900" />
                Register Institutional Vault
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
                placeholder="Search by vault name, custodian provider (Fireblocks, BitGo), or asset symbols..."
                value={filters.searchQuery}
                onChange={(e) => applyFilterChanges({ searchQuery: e.target.value })}
                className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:border-slate-600 text-sm text-gray-900"
              />
            </div>

            {/* Custodian Provider Dropdown */}
            <div className="flex items-center gap-2 w-full md:w-auto">
              <Filter className="w-4 h-4 text-gray-500" />
              <select
                value={filters.custodianProvider}
                onChange={(e) => applyFilterChanges({ custodianProvider: e.target.value })}
                className="w-full md:w-auto px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-slate-500/20 text-sm text-gray-800 font-medium bg-white"
              >
                <option value="All">All Custodian Providers</option>
                <option value="Fireblocks">Fireblocks</option>
                <option value="BitGo">BitGo</option>
                <option value="Coinbase Custody">Coinbase Custody</option>
                <option value="Anchorage Digital">Anchorage Digital</option>
                <option value="Ledger Enterprise">Ledger Enterprise</option>
              </select>

              {/* Storage Type Dropdown */}
              <select
                value={filters.vaultAssetType}
                onChange={(e) => applyFilterChanges({ vaultAssetType: e.target.value })}
                className="w-full md:w-auto px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-slate-500/20 text-sm text-gray-800 font-medium bg-white"
              >
                <option value="All">All Storage Types</option>
                <option value="Cold Storage">Cold Storage</option>
                <option value="MPC Warm Vault">MPC Warm Vault</option>
                <option value="Institutional Staking">Institutional Staking</option>
                <option value="Settlement Collateral">Settlement Collateral</option>
              </select>
            </div>
          </div>
        </div>

        {/* Vaults Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-xl text-gray-900 flex items-center gap-2">
              <Lock className="w-6 h-6 text-slate-900" />
              Institutional Vault Reserves ({vaults.length})
            </h2>
          </div>

          {vaults.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-gray-100">
              <Building className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h3 className="text-gray-800 font-semibold text-lg">No custody vaults found</h3>
              <p className="text-gray-500 text-sm mt-1">Try broadening your search or custodian filters.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
              {vaults.map((v) => (
                <InstitutionalCustodyVaultCard
                  key={v.id}
                  vault={v}
                  onWithdrawClick={(selected) => setSelectedVault(selected)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Audit Log Timeline */}
        <CustodyApprovalTimeline approvals={approvals} />

        {/* Withdrawal Modal */}
        {selectedVault && (
          <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative animate-in fade-in zoom-in duration-200">
              <button
                onClick={() => setSelectedVault(null)}
                className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>

              {isWithdrawSuccess ? (
                <div className="text-center py-8 space-y-3">
                  <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto animate-bounce" />
                  <h3 className="text-2xl font-bold text-gray-900">Withdrawal Request Relayed!</h3>
                  <p className="text-sm text-gray-600">
                    Request for ${withdrawAmt.toLocaleString()} ({assetSym}) submitted to {selectedVault.custodianProvider} MPC signatories.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleWithdrawSubmit} className="space-y-5">
                  <div>
                    <h3 className="font-bold text-gray-900 text-xl">{selectedVault.vaultName}</h3>
                    <p className="text-xs text-slate-600 font-semibold mt-1">
                      Custodian: {selectedVault.custodianProvider} ({selectedVault.signatoryThreshold})
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Destination Address</label>
                      <input
                        type="text"
                        required
                        value={destinationAddr}
                        onChange={(e) => setDestinationAddr(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500/20 font-mono"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Asset Symbol</label>
                        <input
                          type="text"
                          required
                          value={assetSym}
                          onChange={(e) => setAssetSym(e.target.value.toUpperCase())}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500/20"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Requested Amount ($)</label>
                        <input
                          type="number"
                          required
                          min={1000}
                          value={withdrawAmt}
                          onChange={(e) => setWithdrawAmt(Number(e.target.value))}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500/20"
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-xl shadow-md transition-colors text-sm flex items-center justify-center gap-2"
                  >
                    <Lock className="w-4 h-4 text-emerald-400" />
                    Submit Request to MPC Signatories
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
                <h3 className="text-2xl font-bold text-gray-900">Register Institutional Vault</h3>
                <p className="text-xs text-gray-500 mt-1">Configure custodian provider, MPC threshold, and timelock policies.</p>
              </div>

              <form onSubmit={handleCreateSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Vault Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Institutional Treasury Cold Vault #1"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500/20"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Custodian Provider</label>
                    <select
                      value={newCustodian}
                      onChange={(e) => setNewCustodian(e.target.value as any)}
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500/20 bg-white"
                    >
                      <option value="Fireblocks">Fireblocks</option>
                      <option value="BitGo">BitGo</option>
                      <option value="Coinbase Custody">Coinbase Custody</option>
                      <option value="Anchorage Digital">Anchorage Digital</option>
                      <option value="Ledger Enterprise">Ledger Enterprise</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Signatory Scheme</label>
                    <input
                      type="text"
                      required
                      placeholder="3-of-5 MPC"
                      value={newThreshold}
                      onChange={(e) => setNewThreshold(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500/20"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Storage Type</label>
                    <select
                      value={newStorageType}
                      onChange={(e) => setNewStorageType(e.target.value as any)}
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500/20 bg-white"
                    >
                      <option value="Cold Storage">Cold Storage</option>
                      <option value="MPC Warm Vault">MPC Warm Vault</option>
                      <option value="Institutional Staking">Institutional Staking</option>
                      <option value="Settlement Collateral">Settlement Collateral</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Vault Balance ($)</label>
                    <input
                      type="number"
                      required
                      min={100000}
                      value={newBalance}
                      onChange={(e) => setNewBalance(Number(e.target.value))}
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500/20"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Primary Assets (comma-separated)</label>
                    <input
                      type="text"
                      required
                      placeholder="BTC, ETH, USDC"
                      value={newAssets}
                      onChange={(e) => setNewAssets(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Timelock Delay (Hours)</label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={newTimelock}
                      onChange={(e) => setNewTimelock(Number(e.target.value))}
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500/20"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-xl shadow-md transition-colors text-sm"
                >
                  Register Custody Vault
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
