'use client';

import React, { useState } from 'react';
import { CryptoCustodyServiceHandler } from '../../lib/CryptoCustodyService';
import { CustodyVault, GovernanceAuthorizationRequest, CustodyFilterOptions } from '../../lib/CryptoCustodyModel';
import { CustodyVaultCardTile } from '../../components/custody/CustodyVaultCardTile';
import { GovernanceAuthorizationList } from '../../components/custody/GovernanceAuthorizationList';
import { ShieldCheck, Lock, Search, Filter, PlusCircle, Building2, Key, Award, X } from 'lucide-react';

export default function CustodyVaultComplianceDashboardPage() {
  const [vaults, setVaults] = useState<CustodyVault[]>(() =>
    CryptoCustodyServiceHandler.fetchVaults()
  );
  const [requests, setRequests] = useState<GovernanceAuthorizationRequest[]>(() =>
    CryptoCustodyServiceHandler.fetchAuthorizationRequests()
  );

  const [filters, setFilters] = useState<CustodyFilterOptions>({
    storageType: 'All',
    institutionTier: 'All',
    searchQuery: '',
  });

  const [selectedVault, setSelectedVault] = useState<CustodyVault | null>(null);
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);

  // Form State
  const [newVaultName, setNewVaultName] = useState<string>('Fortress MPC Custody');
  const [newTier, setNewTier] = useState<'Tier 1 Prime' | 'Enterprise' | 'Hedge Fund' | 'Sovereign'>('Enterprise');
  const [newStorage, setNewStorage] = useState<'Cold Storage (HSM)' | 'MPC Multi-Sig' | 'Warm Treasury'>('MPC Multi-Sig');
  const [newAum, setNewAum] = useState<number>(25000000);
  const [newSignersReq, setNewSignersReq] = useState<number>(3);
  const [newSignersTot, setNewSignersTot] = useState<number>(5);
  const [newCustodian, setNewCustodian] = useState<string>('Anchorage Digital');

  const applyFilterChanges = (updatedFilters: Partial<CustodyFilterOptions>) => {
    const next = { ...filters, ...updatedFilters };
    setFilters(next);
    setVaults(CryptoCustodyServiceHandler.fetchVaults(next));
  };

  const handleSignRequest = (requestId: string) => {
    CryptoCustodyServiceHandler.signGovernanceRequest(requestId);
    setRequests(CryptoCustodyServiceHandler.fetchAuthorizationRequests());
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    CryptoCustodyServiceHandler.registerNewVault({
      vaultName: newVaultName,
      institutionTier: newTier,
      storageType: newStorage,
      totalAumUsd: newAum,
      signersRequired: newSignersReq,
      signersTotal: newSignersTot,
      custodianPartner: newCustodian,
      primaryAssets: [{ asset: 'USDC', balanceUsd: newAum }],
      status: 'active-compliant',
    });

    setVaults(CryptoCustodyServiceHandler.fetchVaults(filters));
    setShowCreateModal(false);
  };

  return (
    <div className="min-h-screen bg-gray-50/50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header Hero Banner */}
        <div className="bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-900 rounded-3xl p-8 sm:p-10 text-white shadow-xl relative overflow-hidden">
          <div className="relative z-10 max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 bg-indigo-500/20 backdrop-blur-md border border-indigo-400/30 px-3.5 py-1.5 rounded-full text-xs font-semibold text-indigo-200">
              <ShieldCheck className="w-4 h-4 text-indigo-300" />
              Institutional Asset Safety & Multi-Sig Threshold Overwatch
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight">
              Institutional Custody Vault Compliance & Governance Engine
            </h1>
            <p className="text-indigo-200 text-base sm:text-lg leading-relaxed">
              Inspect multi-sig cold/hot vault reserves, verify cryptographic proof-of-reserves, and authorize multi-signature asset transfer requests across institutional custodians.
            </p>
            <div className="pt-2">
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-white text-slate-950 font-bold px-6 py-3 rounded-xl shadow-lg hover:bg-indigo-50 transition-all flex items-center gap-2 text-sm"
              >
                <PlusCircle className="w-5 h-5 text-indigo-600" />
                Register Institutional Vault
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
              placeholder="Search vaults by name or custodian partner (e.g. BitGo, Fireblocks)..."
              value={filters.searchQuery}
              onChange={(e) => applyFilterChanges({ searchQuery: e.target.value })}
              className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm text-gray-900"
            />
          </div>

          <div className="flex gap-2 w-full md:w-auto">
            <select
              value={filters.storageType}
              onChange={(e) => applyFilterChanges({ storageType: e.target.value })}
              className="px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none text-sm text-gray-800 font-medium bg-white"
            >
              <option value="All">All Storage Architectures</option>
              <option value="Cold Storage (HSM)">Cold Storage (HSM)</option>
              <option value="MPC Multi-Sig">MPC Multi-Sig</option>
              <option value="Warm Treasury">Warm Treasury</option>
            </select>

            <select
              value={filters.institutionTier}
              onChange={(e) => applyFilterChanges({ institutionTier: e.target.value })}
              className="px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none text-sm text-gray-800 font-medium bg-white"
            >
              <option value="All">All Institution Tiers</option>
              <option value="Tier 1 Prime">Tier 1 Prime</option>
              <option value="Enterprise">Enterprise</option>
              <option value="Hedge Fund">Hedge Fund</option>
              <option value="Sovereign">Sovereign</option>
            </select>
          </div>
        </div>

        {/* Vaults Grid */}
        <div className="space-y-4">
          <h2 className="font-bold text-xl text-gray-900 flex items-center gap-2">
            <Building2 className="w-6 h-6 text-indigo-600" />
            Institutional Custody Vaults ({vaults.length})
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {vaults.map((v) => (
              <CustodyVaultCardTile key={v.id} vault={v} onSelect={(val) => setSelectedVault(val)} />
            ))}
          </div>
        </div>

        {/* Authorization Requests List */}
        <GovernanceAuthorizationList requests={requests} onSign={handleSignRequest} />

        {/* Audit Modal */}
        {selectedVault && (
          <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative space-y-4">
              <button
                onClick={() => setSelectedVault(null)}
                className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>

              <h3 className="text-xl font-bold text-gray-900">{selectedVault.vaultName} Audit Report</h3>
              <div className="p-4 bg-gray-50 rounded-2xl space-y-2 text-xs font-mono">
                <div>Custodian: <strong>{selectedVault.custodianPartner}</strong></div>
                <div>Storage: <strong>{selectedVault.storageType}</strong></div>
                <div>Proof of Reserves: <strong className="text-emerald-600">Cryptographically Verified ✓</strong></div>
                <div>Threshold Signers: <strong>{selectedVault.signersRequired} / {selectedVault.signersTotal} Active</strong></div>
                <div>Compliance Score: <strong>{selectedVault.complianceScore} / 100</strong></div>
              </div>
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
                <h3 className="text-2xl font-bold text-gray-900">Register Custody Vault</h3>
                <p className="text-xs text-gray-500">Configure institutional storage tier and multi-sig threshold.</p>
              </div>

              <form onSubmit={handleRegisterSubmit} className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Vault Name</label>
                  <input
                    type="text"
                    required
                    value={newVaultName}
                    onChange={(e) => setNewVaultName(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Institution Tier</label>
                    <select
                      value={newTier}
                      onChange={(e) => setNewTier(e.target.value as any)}
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm bg-white"
                    >
                      <option value="Tier 1 Prime">Tier 1 Prime</option>
                      <option value="Enterprise">Enterprise</option>
                      <option value="Hedge Fund">Hedge Fund</option>
                      <option value="Sovereign">Sovereign</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Storage Type</label>
                    <select
                      value={newStorage}
                      onChange={(e) => setNewStorage(e.target.value as any)}
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm bg-white"
                    >
                      <option value="Cold Storage (HSM)">Cold Storage (HSM)</option>
                      <option value="MPC Multi-Sig">MPC Multi-Sig</option>
                      <option value="Warm Treasury">Warm Treasury</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">AUM ($)</label>
                    <input
                      type="number"
                      required
                      min={1000000}
                      value={newAum}
                      onChange={(e) => setNewAum(Number(e.target.value))}
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Signers Req.</label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={newSignersReq}
                      onChange={(e) => setNewSignersReq(Number(e.target.value))}
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Signers Total</label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={newSignersTot}
                      onChange={(e) => setNewSignersTot(Number(e.target.value))}
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Custodian Partner</label>
                  <input
                    type="text"
                    required
                    value={newCustodian}
                    onChange={(e) => setNewCustodian(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl shadow-md transition-colors text-sm"
                >
                  Register Vault Node
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
