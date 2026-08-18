'use client';

import React, { useState } from 'react';
import {
  CryptoStakingValidatorServiceHandler,
} from '../../lib/CryptoStakingValidatorService';
import {
  StakingValidatorNode,
  ValidatorRewardDistribution,
  ValidatorFilterOptions,
} from '../../lib/CryptoStakingValidatorModel';
import { StakingValidatorCard } from '../../components/validator/StakingValidatorCard';
import { ValidatorRewardTimeline } from '../../components/validator/ValidatorRewardTimeline';
import {
  Server,
  Search,
  Filter,
  PlusCircle,
  Sparkles,
  CheckCircle2,
  X,
  Cpu,
  ShieldCheck,
} from 'lucide-react';

export default function CryptoStakingValidatorDashboardPage() {
  const [validators, setValidators] = useState<StakingValidatorNode[]>(() =>
    CryptoStakingValidatorServiceHandler.fetchValidators()
  );
  const [rewards, setRewards] = useState<ValidatorRewardDistribution[]>(() =>
    CryptoStakingValidatorServiceHandler.fetchRewardDistributions()
  );

  const [filters, setFilters] = useState<ValidatorFilterOptions>({
    network: 'All',
    status: 'All',
    slashingRiskLevel: 'All',
    searchQuery: '',
  });

  const [selectedValidator, setSelectedValidator] = useState<StakingValidatorNode | null>(null);
  const [rewardEpoch, setRewardEpoch] = useState<number>(34121);
  const [rewardTokens, setRewardTokens] = useState<number>(5.2);
  const [isRewardSuccess, setIsRewardSuccess] = useState<boolean>(false);

  // Register Validator Modal State
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [newName, setNewName] = useState<string>('');
  const [newNetwork, setNewNetwork] = useState<'Ethereum 2.0' | 'Solana' | 'Cosmos Hub' | 'Polkadot' | 'Avalanche'>('Ethereum 2.0');
  const [newPubkey, setNewPubkey] = useState<string>('');
  const [newStakedTokens, setNewStakedTokens] = useState<number>(10000);
  const [newStakedUsd, setNewStakedUsd] = useState<number>(29000000);
  const [newCommission, setNewCommission] = useState<number>(5.0);
  const [newUptime, setNewUptime] = useState<number>(99.9);
  const [newAttestation, setNewAttestation] = useState<number>(99.5);
  const [newSlashingRisk, setNewSlashingRisk] = useState<'low' | 'moderate' | 'high'>('low');

  const applyFilterChanges = (updatedFilters: Partial<ValidatorFilterOptions>) => {
    const nextFilters = { ...filters, ...updatedFilters };
    setFilters(nextFilters);
    setValidators(CryptoStakingValidatorServiceHandler.fetchValidators(nextFilters));
  };

  const handleRewardSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedValidator) return;

    CryptoStakingValidatorServiceHandler.executeEpochRewardPayout(
      selectedValidator.id,
      rewardEpoch,
      rewardTokens
    );

    setRewards(CryptoStakingValidatorServiceHandler.fetchRewardDistributions());
    setIsRewardSuccess(true);
    setTimeout(() => {
      setIsRewardSuccess(false);
      setSelectedValidator(null);
    }, 1800);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    CryptoStakingValidatorServiceHandler.registerNewValidator({
      validatorName: newName,
      network: newNetwork,
      publicKey: newPubkey,
      totalStakedTokens: newStakedTokens,
      totalStakedUsd: newStakedUsd,
      validatorCommissionPercentage: newCommission,
      uptimePercentage: newUptime,
      attestationEfficiencyPercentage: newAttestation,
      slashingRiskLevel: newSlashingRisk,
    });

    setValidators(CryptoStakingValidatorServiceHandler.fetchValidators(filters));
    setShowCreateModal(false);
    setNewName('');
    setNewPubkey('');
  };

  return (
    <div className="min-h-screen bg-gray-50/50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-slate-950 via-indigo-950 to-blue-950 rounded-3xl p-8 sm:p-10 text-white shadow-xl relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 bg-indigo-500/20 backdrop-blur-md border border-indigo-400/30 px-3.5 py-1.5 rounded-full text-xs font-semibold text-indigo-200">
              <Sparkles className="w-4 h-4 text-indigo-300" />
              Proof-of-Stake Validator Health & Epoch Telemetry Engine
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight">
              Crypto Staking Validator Telemetry Suite
            </h1>
            <p className="text-indigo-200 text-base sm:text-lg leading-relaxed">
              Monitor PoS validator uptime reliability, attestation efficiency, slashing risk indices, total staked capital, and automated epoch reward distributions.
            </p>
            <div className="pt-2 flex flex-wrap gap-4 items-center">
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-white text-slate-950 font-bold px-6 py-3 rounded-xl shadow-lg hover:bg-indigo-50 transition-all flex items-center gap-2 text-sm"
              >
                <PlusCircle className="w-5 h-5 text-indigo-600" />
                Register Validator Node
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
                placeholder="Search by validator name, public key, or network (Ethereum, Solana)..."
                value={filters.searchQuery}
                onChange={(e) => applyFilterChanges({ searchQuery: e.target.value })}
                className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-sm text-gray-900"
              />
            </div>

            {/* Network Dropdown */}
            <div className="flex items-center gap-2 w-full md:w-auto">
              <Filter className="w-4 h-4 text-gray-500" />
              <select
                value={filters.network}
                onChange={(e) => applyFilterChanges({ network: e.target.value })}
                className="w-full md:w-auto px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm text-gray-800 font-medium bg-white"
              >
                <option value="All">All PoS Networks</option>
                <option value="Ethereum 2.0">Ethereum 2.0</option>
                <option value="Solana">Solana</option>
                <option value="Cosmos Hub">Cosmos Hub</option>
                <option value="Polkadot">Polkadot</option>
                <option value="Avalanche">Avalanche</option>
              </select>

              {/* Slashing Risk Dropdown */}
              <select
                value={filters.slashingRiskLevel}
                onChange={(e) => applyFilterChanges({ slashingRiskLevel: e.target.value })}
                className="w-full md:w-auto px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm text-gray-800 font-medium bg-white"
              >
                <option value="All">All Slashing Risks</option>
                <option value="low">Low Risk</option>
                <option value="moderate">Moderate Risk</option>
                <option value="high">High Risk</option>
              </select>
            </div>
          </div>
        </div>

        {/* Validators Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-xl text-gray-900 flex items-center gap-2">
              <Server className="w-6 h-6 text-indigo-600" />
              Active Validator Nodes ({validators.length})
            </h2>
          </div>

          {validators.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-gray-100">
              <ShieldCheck className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h3 className="text-gray-800 font-semibold text-lg">No validators found</h3>
              <p className="text-gray-500 text-sm mt-1">Try broadening your search or network filters.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
              {validators.map((v) => (
                <StakingValidatorCard
                  key={v.id}
                  validator={v}
                  onRewardClick={(selected) => setSelectedValidator(selected)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Reward Audit Timeline */}
        <ValidatorRewardTimeline rewards={rewards} />

        {/* Payout Modal */}
        {selectedValidator && (
          <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative animate-in fade-in zoom-in duration-200">
              <button
                onClick={() => setSelectedValidator(null)}
                className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>

              {isRewardSuccess ? (
                <div className="text-center py-8 space-y-3">
                  <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto animate-bounce" />
                  <h3 className="text-2xl font-bold text-gray-900">Epoch Rewards Distributed!</h3>
                  <p className="text-sm text-gray-600">
                    Distributed {rewardTokens} native tokens to stakers of {selectedValidator.validatorName} (Epoch #{rewardEpoch}).
                  </p>
                </div>
              ) : (
                <form onSubmit={handleRewardSubmit} className="space-y-5">
                  <div>
                    <h3 className="font-bold text-gray-900 text-xl">{selectedValidator.validatorName}</h3>
                    <p className="text-xs text-indigo-600 font-semibold mt-1">
                      Network: {selectedValidator.network} (Commission: {selectedValidator.validatorCommissionPercentage}%)
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Epoch Number</label>
                      <input
                        type="number"
                        required
                        value={rewardEpoch}
                        onChange={(e) => setRewardEpoch(Number(e.target.value))}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Total Epoch Reward Tokens</label>
                      <input
                        type="number"
                        required
                        step="0.1"
                        min={0.1}
                        value={rewardTokens}
                        onChange={(e) => setRewardTokens(Number(e.target.value))}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl shadow-md transition-colors text-sm flex items-center justify-center gap-2"
                  >
                    <Cpu className="w-4 h-4" />
                    Distribute Epoch Staking Payout
                  </button>
                </form>
              )}
            </div>
          </div>
        )}

        {/* Create Node Modal */}
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
                <h3 className="text-2xl font-bold text-gray-900">Register Validator Node</h3>
                <p className="text-xs text-gray-500 mt-1">Register PoS validator node for uptime & slashing telemetry.</p>
              </div>

              <form onSubmit={handleCreateSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Validator Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Lido Ethereum Sentinel #42"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">PoS Network</label>
                    <select
                      value={newNetwork}
                      onChange={(e) => setNewNetwork(e.target.value as any)}
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-white"
                    >
                      <option value="Ethereum 2.0">Ethereum 2.0</option>
                      <option value="Solana">Solana</option>
                      <option value="Cosmos Hub">Cosmos Hub</option>
                      <option value="Polkadot">Polkadot</option>
                      <option value="Avalanche">Avalanche</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Validator Public Key</label>
                    <input
                      type="text"
                      required
                      placeholder="0x8f91...b420"
                      value={newPubkey}
                      onChange={(e) => setNewPubkey(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Total Staked Tokens</label>
                    <input
                      type="number"
                      required
                      min={100}
                      value={newStakedTokens}
                      onChange={(e) => setNewStakedTokens(Number(e.target.value))}
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Total Staked ($)</label>
                    <input
                      type="number"
                      required
                      min={10000}
                      value={newStakedUsd}
                      onChange={(e) => setNewStakedUsd(Number(e.target.value))}
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Commission %</label>
                    <input
                      type="number"
                      required
                      step="0.1"
                      min={0}
                      max={100}
                      value={newCommission}
                      onChange={(e) => setNewCommission(Number(e.target.value))}
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Uptime %</label>
                    <input
                      type="number"
                      required
                      step="0.01"
                      min={0}
                      max={100}
                      value={newUptime}
                      onChange={(e) => setNewUptime(Number(e.target.value))}
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Slashing Risk</label>
                    <select
                      value={newSlashingRisk}
                      onChange={(e) => setNewSlashingRisk(e.target.value as any)}
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-white"
                    >
                      <option value="low">Low Risk</option>
                      <option value="moderate">Moderate Risk</option>
                      <option value="high">High Risk</option>
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl shadow-md transition-colors text-sm"
                >
                  Register Validator Telemetry Node
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
