'use client';

import React, { useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  ShieldCheck,
  ShieldAlert,
  RotateCcw,
  Zap,
  ArrowRight,
  Database,
  Layers,
  Lock,
  Coins,
  RefreshCw,
  FileCheck,
} from 'lucide-react';
import {
  DomainOperationCategory,
  DomainOperationState,
  DomainOperationResult,
  AuthContext,
  executeDomainOperation,
  globalIdempotencyStore,
  TerminalErrorState,
} from '@/lib/domain/domainOperationState';

const CATEGORIES: { id: DomainOperationCategory; label: string; description: string }[] = [
  { id: 'arbitrage', label: 'Flash-Loan / Arbitrage', description: 'Cross-DEX atomic arbitrage execution' },
  { id: 'bridge', label: 'Cross-Chain Bridge', description: 'Multi-chain asset relay and lock-and-mint' },
  { id: 'custody', label: 'Custody Withdrawal', description: 'Institutional multi-sig vault withdrawal' },
  { id: 'rwa', label: 'RWA Proof-of-Reserve', description: 'Real-World Asset oracle reserve attestation' },
  { id: 'yield', label: 'Yield Distribution', description: 'DeFi vault yield settlement and payout' },
  { id: 'validator', label: 'Validator Rewards', description: 'Staking validator reward distribution' },
];

export default function DomainOperationVisualizer() {
  const [selectedCategory, setSelectedCategory] = useState<DomainOperationCategory>('arbitrage');
  const [isSimulationMode, setIsSimulationMode] = useState<boolean>(false);
  const [userRole, setUserRole] = useState<'admin' | 'operator' | 'user' | 'guest'>('admin');
  const [idempotencyKey, setIdempotencyKey] = useState<string>('idempotency-key-001');
  const [simulateFailure, setSimulateFailure] = useState<TerminalErrorState | 'NONE'>('NONE');
  const [omitEvidence, setOmitEvidence] = useState<boolean>(false);

  const [loading, setLoading] = useState<boolean>(false);
  const [currentResult, setCurrentResult] = useState<DomainOperationResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const getPayloadForCategory = (cat: DomainOperationCategory) => {
    switch (cat) {
      case 'arbitrage':
        return { amountEth: 50, dexA: 'Uniswap_v3', dexB: 'Sushiswap', minProfitEth: 0.45 };
      case 'bridge':
        return { sourceChain: 'Ethereum', targetChain: 'Arbitrum', amount: 10, token: 'USDC' };
      case 'custody':
        return { asset: 'BTC', amount: 2.5, destinationAddress: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F' };
      case 'rwa':
        return { assetId: 'rwa_gold_vault_01', custodian: 'Paxos', expectedReserveUsd: 15000000 };
      case 'yield':
        return { poolId: 'steth_yield_pool', totalDistributionUsd: 250000 };
      case 'validator':
        return { validatorAddress: '0x89205A3A3b2A69De6Dbf7f01EDf3010b57f48300', rewardAmountGwei: 450000000 };
    }
  };

  const handleRunOperation = async () => {
    setLoading(true);
    setErrorMsg(null);

    const authContext: AuthContext = {
      userId: 'usr_sec_99',
      role: userRole,
      permissions: userRole === 'admin' ? ['*'] : userRole === 'operator' ? [`domain:${selectedCategory}:write`] : [],
    };

    const payload = getPayloadForCategory(selectedCategory);

    try {
      const res = await executeDomainOperation(
        {
          category: selectedCategory,
          operationName: `Execute ${selectedCategory.toUpperCase()} Operation`,
          payload,
          idempotencyKey,
          isSimulation: isSimulationMode,
        },
        {
          authContext,
          simulateFailureState: simulateFailure === 'NONE' ? undefined : simulateFailure,
          overrideEvidence: omitEvidence ? undefined : undefined,
        }
      );
      setCurrentResult(res);
    } catch (err: any) {
      setErrorMsg(err.message || 'Operation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleClearIdempotency = () => {
    globalIdempotencyStore.clear();
    setCurrentResult(null);
    setErrorMsg(null);
  };

  const getStepBadgeClass = (stepState: DomainOperationState, activeState?: DomainOperationState) => {
    if (activeState === stepState) return 'bg-teal-500/20 text-teal-400 border-teal-500/50';
    return 'bg-zinc-800/50 text-zinc-400 border-zinc-700/50';
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 p-6 bg-zinc-950 text-zinc-100 rounded-xl border border-zinc-800 shadow-2xl">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-zinc-800">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-white tracking-tight">
              Domain Operation State Engine
            </h2>
            <span className="text-xs px-2.5 py-1 rounded-full font-mono bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              #1315 State Safety
            </span>
          </div>
          <p className="text-sm text-zinc-400 mt-1">
            Eliminates fabricated execution & settlement state using a 6-stage verified state machine, idempotency guards, and simulation isolation.
          </p>
        </div>

        {/* Simulation / Production Mode Toggle */}
        <div className="flex items-center gap-3 p-1.5 bg-zinc-900 rounded-lg border border-zinc-800">
          <button
            onClick={() => setIsSimulationMode(false)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              !isSimulationMode
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Production Verified Mode
          </button>
          <button
            onClick={() => setIsSimulationMode(true)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              isSimulationMode
                ? 'bg-amber-600 text-white shadow-md'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Educational Simulation Mode
          </button>
        </div>
      </div>

      {/* Category Selection Bar */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => {
              setSelectedCategory(cat.id);
              setCurrentResult(null);
              setErrorMsg(null);
            }}
            className={`p-3 rounded-lg text-left transition-all border ${
              selectedCategory === cat.id
                ? 'bg-teal-950/40 border-teal-500 text-white'
                : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:border-zinc-700'
            }`}
          >
            <div className="text-xs font-semibold truncate">{cat.label}</div>
            <div className="text-[10px] text-zinc-500 mt-1 line-clamp-1">{cat.description}</div>
          </button>
        ))}
      </div>

      {/* Configuration & Trigger Controls */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-zinc-900/50 rounded-lg border border-zinc-800">
        <div>
          <label className="block text-xs text-zinc-400 mb-1 font-medium">User Role (Authorization)</label>
          <select
            value={userRole}
            onChange={(e) => setUserRole(e.target.value as any)}
            className="w-full bg-zinc-950 border border-zinc-700 rounded-md px-3 py-1.5 text-xs text-white focus:ring-1 focus:ring-teal-500"
          >
            <option value="admin">Admin (Full Rights)</option>
            <option value="operator">Operator (Category Rights)</option>
            <option value="user">User (Standard)</option>
            <option value="guest">Guest (Unauthorized)</option>
          </select>
        </div>

        <div>
          <label className="block text-xs text-zinc-400 mb-1 font-medium">Idempotency Key</label>
          <input
            type="text"
            value={idempotencyKey}
            onChange={(e) => setIdempotencyKey(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-700 rounded-md px-3 py-1.5 text-xs font-mono text-white focus:ring-1 focus:ring-teal-500"
          />
        </div>

        <div>
          <label className="block text-xs text-zinc-400 mb-1 font-medium">Simulate Terminal Failure State</label>
          <select
            value={simulateFailure}
            onChange={(e) => setSimulateFailure(e.target.value as any)}
            className="w-full bg-zinc-950 border border-zinc-700 rounded-md px-3 py-1.5 text-xs text-white focus:ring-1 focus:ring-teal-500"
          >
            <option value="NONE">None (Happy Path)</option>
            <option value="REJECTED">REJECTED (Authorization/Validation)</option>
            <option value="FAILED">FAILED (Execution Error)</option>
            <option value="EXPIRED">EXPIRED (Pending Timeout)</option>
            <option value="CANCELLED">CANCELLED (User Abort)</option>
          </select>
        </div>

        <div className="flex items-end gap-2">
          <button
            onClick={handleRunOperation}
            disabled={loading}
            className="flex-1 bg-teal-600 hover:bg-teal-500 text-white font-semibold py-1.5 px-4 rounded-md text-xs transition-all flex items-center justify-center gap-2"
          >
            {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
            Execute Operation
          </button>
          <button
            onClick={handleClearIdempotency}
            title="Reset Idempotency Store"
            className="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-md text-xs"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* State Machine Transition Pipeline */}
      <div className="p-4 bg-zinc-900/40 rounded-lg border border-zinc-800 space-y-3">
        <div className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
          State Transition Pipeline Lifecycle
        </div>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
          {(['REQUESTED', 'VALIDATING', 'SUBMITTED_PENDING', 'EXTERNALLY_VERIFIED', 'PERSISTED', 'COMPLETED'] as PrimaryOperationState[]).map(
            (s, idx) => {
              const isActive = currentResult?.state === s;
              const isPast =
                currentResult &&
                currentResult.stateHistory.some((h) => h.state === s);

              return (
                <div
                  key={s}
                  className={`p-3 rounded-lg border flex flex-col items-center text-center transition-all ${
                    isActive
                      ? 'bg-teal-950/60 border-teal-500 text-teal-300 shadow-md shadow-teal-950'
                      : isPast
                      ? 'bg-emerald-950/30 border-emerald-800/50 text-emerald-400'
                      : 'bg-zinc-950 border-zinc-800 text-zinc-600'
                  }`}
                >
                  <div className="text-[10px] text-zinc-500 mb-1 font-mono">Stage 0{idx + 1}</div>
                  <div className="text-xs font-bold font-mono">{s}</div>
                </div>
              );
            }
          )}
        </div>
      </div>

      {/* Result & Evidence Inspector */}
      {errorMsg && (
        <div className="p-4 bg-red-950/40 border border-red-800 rounded-lg flex items-center gap-3 text-red-300 text-xs">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 text-red-400" />
          <div>{errorMsg}</div>
        </div>
      )}

      {currentResult && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          {/* Operation Status & State History */}
          <div className="p-4 bg-zinc-900/60 rounded-lg border border-zinc-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-300">Execution Outcome</span>
              <span
                className={`text-xs px-2.5 py-0.5 rounded-full font-mono font-bold ${
                  currentResult.state === 'COMPLETED'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : currentResult.state === 'REJECTED' || currentResult.state === 'FAILED'
                    ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                    : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                }`}
              >
                {currentResult.state}
              </span>
            </div>

            <div className="space-y-1.5 font-mono text-xs">
              <div className="flex justify-between text-zinc-400">
                <span>Operation ID:</span>
                <span className="text-zinc-200">{currentResult.id}</span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Idempotency Key:</span>
                <span className="text-zinc-200">{currentResult.idempotencyKey}</span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Mode:</span>
                <span className={currentResult.isSimulation ? 'text-amber-400' : 'text-emerald-400'}>
                  {currentResult.isSimulation ? 'Educational Simulation (simulation-*)' : 'Production Verified'}
                </span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Durable Persisted:</span>
                <span className="text-zinc-200">{currentResult.durablePersisted ? 'TRUE' : 'FALSE'}</span>
              </div>
            </div>

            {currentResult.error && (
              <div className="p-2.5 bg-red-950/30 border border-red-900 rounded text-red-300 text-xs">
                <strong>Error Cause:</strong> {currentResult.error}
              </div>
            )}

            <div className="pt-2 border-t border-zinc-800">
              <div className="text-[11px] font-semibold text-zinc-400 mb-2">State History Audit Trail</div>
              <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                {currentResult.stateHistory.map((h, i) => (
                  <div key={i} className="text-[11px] font-mono flex items-center justify-between text-zinc-400">
                    <span className="text-teal-400">{h.state}</span>
                    <span className="text-zinc-500 text-[10px]">{h.note}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Cryptographic Evidence & Attestation Inspector */}
          <div className="p-4 bg-zinc-900/60 rounded-lg border border-zinc-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-300">Verified Evidence & Receipts</span>
              <FileCheck className="w-4 h-4 text-teal-400" />
            </div>

            {currentResult.evidence ? (
              <div className="space-y-2 text-xs font-mono text-zinc-300 bg-zinc-950 p-3 rounded border border-zinc-800 overflow-x-auto">
                {currentResult.evidence.txHash && (
                  <div>
                    <span className="text-zinc-500">Transaction Hash: </span>
                    <span className="text-emerald-400">{currentResult.evidence.txHash}</span>
                  </div>
                )}
                {currentResult.evidence.sourceChainTx && (
                  <div>
                    <span className="text-zinc-500">Source Chain Tx: </span>
                    <span className="text-emerald-400">{currentResult.evidence.sourceChainTx}</span>
                  </div>
                )}
                {currentResult.evidence.targetChainTx && (
                  <div>
                    <span className="text-zinc-500">Target Chain Tx: </span>
                    <span className="text-emerald-400">{currentResult.evidence.targetChainTx}</span>
                  </div>
                )}
                {currentResult.evidence.oracleAttestationHash && (
                  <div>
                    <span className="text-zinc-500">Oracle Attestation: </span>
                    <span className="text-emerald-400">{currentResult.evidence.oracleAttestationHash}</span>
                  </div>
                )}
                {currentResult.evidence.proofOfReserveProof && (
                  <div>
                    <span className="text-zinc-500">Proof-of-Reserve: </span>
                    <span className="text-emerald-400">{currentResult.evidence.proofOfReserveProof}</span>
                  </div>
                )}
                {currentResult.evidence.settlementTxHash && (
                  <div>
                    <span className="text-zinc-500">Settlement Tx: </span>
                    <span className="text-emerald-400">{currentResult.evidence.settlementTxHash}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 bg-zinc-950 rounded border border-zinc-800 text-center text-zinc-500 text-xs">
                No external evidence recorded for this state.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
