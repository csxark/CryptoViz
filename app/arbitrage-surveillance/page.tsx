'use client';

import React, { useState, useEffect, useRef } from 'react';
import { CryptoArbitrageServiceHandler } from '../../lib/CryptoArbitrageService';
import {
  FlashLoanArbitrageOpportunity,
  ArbitrageSimulationRecord,
  ArbitrageFilterOptions,
} from '../../lib/CryptoArbitrageModel';
import { ArbitrageOpportunityCard } from '../../components/arbitrage/ArbitrageOpportunityCard';
import { ArbitrageExecutionTimeline } from '../../components/arbitrage/ArbitrageExecutionTimeline';
import {
  Zap,
  Search,
  Filter,
  PlusCircle,
  Sparkles,
  CheckCircle2,
  XCircle,
  X,
  ShieldCheck,
  Activity,
  AlertOctagon,
} from 'lucide-react';

export default function CryptoArbitrageSurveillanceDashboardPage() {
  const [opportunities, setOpportunities] = useState<FlashLoanArbitrageOpportunity[]>([]);
  const [records, setRecords] = useState<ArbitrageSimulationRecord[]>([]);

  const [filters, setFilters] = useState<ArbitrageFilterOptions>({
    borrowAsset: 'All',
    executionRisk: 'All',
    searchQuery: '',
    statusFilter: 'All',
  });

  const [selectedOpportunity, setSelectedOpportunity] = useState<FlashLoanArbitrageOpportunity | null>(null);
  const [simulationResult, setSimulationResult] = useState<ArbitrageSimulationRecord | null>(null);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);

  // Custom Simulation Parameters input state
  const [customTradeAmount, setCustomTradeAmount] = useState<string>('');
  const [customMaxSlippage, setCustomMaxSlippage] = useState<string>('1.5');
  const [customMaxGas, setCustomMaxGas] = useState<string>('1000');
  const [customMinProfit, setCustomMinProfit] = useState<string>('100');

  // Register Modal State
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [newPair, setNewPair] = useState<string>('WETH / USDT');
  const [newSourceDex, setNewSourceDex] = useState<string>('Uniswap V3');
  const [newTargetDex, setNewTargetDex] = useState<string>('Balancer');
  const [newBorrowAsset, setNewBorrowAsset] = useState<string>('WETH');
  const [newLoanAmount, setNewLoanAmount] = useState<string>('300000');
  const [newGrossProfit, setNewGrossProfit] = useState<string>('3500');
  const [newGasFee, setNewGasFee] = useState<string>('450');
  const [newMaxSlippage, setNewMaxSlippage] = useState<string>('1.5');
  const [newLiquidity, setNewLiquidity] = useState<string>('800000');
  const [newRisk, setNewRisk] = useState<'low' | 'moderate' | 'high' | 'extreme'>('low');

  // Accessibility Focus Trap Refs
  const execModalRef = useRef<HTMLDivElement>(null);
  const createModalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setOpportunities(CryptoArbitrageServiceHandler.fetchOpportunities(filters));
    setRecords(CryptoArbitrageServiceHandler.fetchExecutionRecords());
  }, []);

  const applyFilterChanges = (updatedFilters: Partial<ArbitrageFilterOptions>) => {
    const nextFilters = { ...filters, ...updatedFilters };
    setFilters(nextFilters);
    setOpportunities(CryptoArbitrageServiceHandler.fetchOpportunities(nextFilters));
  };

  const handleSelectOpportunity = (opp: FlashLoanArbitrageOpportunity) => {
    setSelectedOpportunity(opp);
    setCustomTradeAmount(opp.loanAmountUsd.toString());
    setCustomMaxSlippage((opp.maxSlippageTolerancePercentage ?? 1.5).toString());
    setCustomMaxGas((opp.maxGasFeeLimitUsd ?? opp.estimatedGasFeeUsd * 1.5).toString());
    setCustomMinProfit((opp.minNetProfitRequirementUsd ?? 100).toString());
    setSimulationResult(null);
  };

  const handleRunSimulationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOpportunity) return;

    setIsSimulating(true);

    const parsedTradeAmount = parseFloat(customTradeAmount);
    const parsedMaxSlippage = parseFloat(customMaxSlippage);
    const parsedMaxGas = parseFloat(customMaxGas);
    const parsedMinProfit = parseFloat(customMinProfit);

    setTimeout(() => {
      const record = CryptoArbitrageServiceHandler.executeArbitrageSimulation(selectedOpportunity.id, {
        tradeAmountUsd: parsedTradeAmount,
        maxAllowedSlippagePercent: parsedMaxSlippage,
        maxAllowedGasFeeUsd: parsedMaxGas,
        minRequiredProfitUsd: parsedMinProfit,
      });

      setSimulationResult(record);
      setOpportunities(CryptoArbitrageServiceHandler.fetchOpportunities(filters));
      setRecords(CryptoArbitrageServiceHandler.fetchExecutionRecords());
      setIsSimulating(false);
    }, 600);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const loanAmount = parseFloat(newLoanAmount);
    const grossProfit = parseFloat(newGrossProfit);
    const gasFee = parseFloat(newGasFee);
    const maxSlippage = parseFloat(newMaxSlippage);
    const liquidity = parseFloat(newLiquidity);

    if (
      !Number.isFinite(loanAmount) ||
      !Number.isFinite(grossProfit) ||
      !Number.isFinite(gasFee) ||
      !Number.isFinite(maxSlippage) ||
      !Number.isFinite(liquidity)
    ) {
      alert('Please enter valid numerical values for simulation parameters.');
      return;
    }

    const netProfit = grossProfit - gasFee;
    const margin = Number(((netProfit / loanAmount) * 100).toFixed(2));

    CryptoArbitrageServiceHandler.registerNewOpportunity({
      tokenPair: newPair,
      sourceDex: newSourceDex,
      targetDex: newTargetDex,
      borrowAsset: newBorrowAsset,
      loanAmountUsd: loanAmount,
      expectedGrossProfitUsd: grossProfit,
      estimatedGasFeeUsd: gasFee,
      netProfitUsd: netProfit,
      profitMarginPercentage: margin,
      executionRisk: newRisk,
      maxSlippageTolerancePercentage: maxSlippage,
      availableLiquidityUsd: liquidity,
    });

    setOpportunities(CryptoArbitrageServiceHandler.fetchOpportunities(filters));
    setShowCreateModal(false);
  };

  return (
    <div className="min-h-screen bg-gray-50/50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Paper-Trading Simulation Mode Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-amber-950 to-slate-900 rounded-3xl p-8 sm:p-10 text-white shadow-xl relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 bg-amber-500/20 backdrop-blur-md border border-amber-400/30 px-3.5 py-1.5 rounded-full text-xs font-semibold text-amber-200">
              <ShieldCheck className="w-4 h-4 text-amber-300" />
              Isolated Paper-Trading & Deterministic Simulation Engine
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight">
              Crypto Flash Loan Arbitrage Simulation Suite
            </h1>
            <p className="text-amber-200/90 text-base sm:text-lg leading-relaxed">
              Safely model cross-DEX arbitrage opportunities with an explicit deterministic simulation lifecycle.
              Evaluates slippage, liquidity constraints, gas overheads, and idempotency with complete isolation from real execution.
            </p>
            <div className="pt-2 flex flex-wrap gap-4 items-center">
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-white text-slate-950 font-bold px-6 py-3 rounded-xl shadow-lg hover:bg-amber-50 transition-all flex items-center gap-2 text-sm"
              >
                <PlusCircle className="w-5 h-5 text-amber-600" />
                Register Simulation Radar Node
              </button>
            </div>
          </div>
        </div>

        {/* Disclaimer Alert */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3 text-xs text-amber-900">
          <AlertOctagon className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">SIMULATION / PAPER TRADING MODE ONLY: </span>
            This suite operates exclusively in a simulated paper-trading environment. Identifiers carry the prefix{' '}
            <code className="bg-amber-100 px-1 py-0.5 rounded text-amber-950 font-mono font-bold">SIM-&lt;UUID&gt;</code>{' '}
            and will never interact with real blockchain accounts or trigger real financial transactions.
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
                placeholder="Search by token pair (WETH/DAI), source DEX (Uniswap V3), or target DEX..."
                value={filters.searchQuery}
                onChange={(e) => applyFilterChanges({ searchQuery: e.target.value })}
                className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 text-sm text-gray-900"
              />
            </div>

            {/* Borrow Asset Dropdown */}
            <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
              <Filter className="w-4 h-4 text-gray-500" />
              <select
                value={filters.borrowAsset}
                onChange={(e) => applyFilterChanges({ borrowAsset: e.target.value })}
                className="px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 text-sm text-gray-800 font-medium bg-white"
              >
                <option value="All">All Borrow Assets</option>
                <option value="WETH">WETH</option>
                <option value="USDC">USDC</option>
                <option value="USDT">USDT</option>
                <option value="WBTC">WBTC</option>
              </select>

              {/* Execution Risk Dropdown */}
              <select
                value={filters.executionRisk}
                onChange={(e) => applyFilterChanges({ executionRisk: e.target.value })}
                className="px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 text-sm text-gray-800 font-medium bg-white"
              >
                <option value="All">All Risk Profiles</option>
                <option value="low font-semibold">Low Risk</option>
                <option value="moderate">Moderate Risk</option>
                <option value="high">High Risk</option>
                <option value="extreme">Extreme Risk</option>
              </select>

              {/* Status Lifecycle Filter */}
              <select
                value={filters.statusFilter || 'All'}
                onChange={(e) => applyFilterChanges({ statusFilter: e.target.value })}
                className="px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 text-sm text-gray-800 font-medium bg-white"
              >
                <option value="All">All Simulation States</option>
                <option value="DETECTED">DETECTED</option>
                <option value="SIMULATING">SIMULATING</option>
                <option value="SIMULATED_SUCCESS">SIMULATED_SUCCESS</option>
                <option value="SIMULATED_REVERT">SIMULATED_REVERT</option>
              </select>
            </div>
          </div>
        </div>

        {/* Opportunities Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-xl text-gray-900 flex items-center gap-2">
              <Zap className="w-6 h-6 text-amber-600" />
              Surveillance Opportunities & Simulation Targets ({opportunities.length})
            </h2>
          </div>

          {opportunities.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-gray-100">
              <Activity className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h3 className="text-gray-800 font-semibold text-lg">No simulation targets found</h3>
              <p className="text-gray-500 text-sm mt-1">Try broadening your search or asset filters.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
              {opportunities.map((o) => (
                <ArbitrageOpportunityCard
                  key={o.id}
                  opportunity={o}
                  onExecuteClick={handleSelectOpportunity}
                />
              ))}
            </div>
          )}
        </div>

        {/* Audit Log Timeline */}
        <ArbitrageExecutionTimeline records={records} />

        {/* Simulation Execution Modal */}
        {selectedOpportunity && (
          <div
            className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="sim-modal-title"
          >
            <div
              ref={execModalRef}
              className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative animate-in fade-in zoom-in duration-200"
            >
              <button
                onClick={() => setSelectedOpportunity(null)}
                aria-label="Close Simulation Modal"
                className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>

              {simulationResult ? (
                <div className="text-center py-6 space-y-4">
                  {simulationResult.status === 'SIMULATED_SUCCESS' ? (
                    <>
                      <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto" />
                      <h3 className="text-2xl font-bold text-gray-900">SIMULATED_SUCCESS</h3>
                      <p className="text-sm text-gray-600">
                        Deterministic simulation verified profit of +${simulationResult.simulatedNetProfitUsd.toLocaleString()} USD.
                      </p>
                      <div className="bg-emerald-50 p-3 rounded-xl font-mono text-xs text-emerald-800">
                        Simulation ID: {simulationResult.simulationIdentifier}
                      </div>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-16 h-16 text-red-500 mx-auto" />
                      <h3 className="text-2xl font-bold text-gray-900">SIMULATED_REVERT</h3>
                      <p className="text-sm text-red-600 font-semibold">
                        Revert Reason: {simulationResult.failureReason || 'EXECUTION_CONSTRAINT_FAILED'}
                      </p>
                      <div className="bg-red-50 p-3 rounded-xl font-mono text-xs text-red-800">
                        Simulation ID: {simulationResult.simulationIdentifier}
                      </div>
                    </>
                  )}
                  <button
                    onClick={() => setSelectedOpportunity(null)}
                    className="w-full bg-slate-900 text-white font-bold py-3 rounded-xl hover:bg-slate-800 text-sm"
                  >
                    Return to Surveillance Suite
                  </button>
                </div>
              ) : (
                <form onSubmit={handleRunSimulationSubmit} className="space-y-5">
                  <div>
                    <span className="text-xs font-bold text-amber-600 uppercase tracking-wider">
                      Paper Trading Engine
                    </span>
                    <h3 id="sim-modal-title" className="font-bold text-gray-900 text-xl">
                      {selectedOpportunity.tokenPair}
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Route: {selectedOpportunity.sourceDex} ➔ {selectedOpportunity.targetDex}
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Trade Loan Amount ($ USD)
                      </label>
                      <input
                        type="text"
                        value={customTradeAmount}
                        onChange={(e) => setCustomTradeAmount(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Max Slippage %</label>
                        <input
                          type="text"
                          value={customMaxSlippage}
                          onChange={(e) => setCustomMaxSlippage(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-xl border border-gray-200 text-xs focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Max Gas ($)</label>
                        <input
                          type="text"
                          value={customMaxGas}
                          onChange={(e) => setCustomMaxGas(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-xl border border-gray-200 text-xs focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Min Profit ($)</label>
                        <input
                          type="text"
                          value={customMinProfit}
                          onChange={(e) => setCustomMinProfit(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-xl border border-gray-200 text-xs focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSimulating}
                    className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold py-3 rounded-xl shadow-md transition-colors text-sm flex items-center justify-center gap-2"
                  >
                    <Zap className="w-4 h-4 fill-slate-950" />
                    {isSimulating ? 'Evaluating Simulation Engine...' : 'Run Deterministic Simulation'}
                  </button>
                </form>
              )}
            </div>
          </div>
        )}

        {/* Create Radar Modal */}
        {showCreateModal && (
          <div
            className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-modal-title"
          >
            <div ref={createModalRef} className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative">
              <button
                onClick={() => setShowCreateModal(false)}
                aria-label="Close Registration Modal"
                className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="mb-6">
                <h3 id="create-modal-title" className="text-2xl font-bold text-gray-900">
                  Register Simulation Radar Node
                </h3>
                <p className="text-xs text-gray-500 mt-1">Configure DEX surveillance parameters and flash loan thresholds.</p>
              </div>

              <form onSubmit={handleCreateSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Token Pair</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. WETH / DAI"
                    value={newPair}
                    onChange={(e) => setNewPair(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Source DEX</label>
                    <input
                      type="text"
                      required
                      placeholder="Uniswap V3"
                      value={newSourceDex}
                      onChange={(e) => setNewSourceDex(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Target DEX</label>
                    <input
                      type="text"
                      required
                      placeholder="Sushiswap"
                      value={newTargetDex}
                      onChange={(e) => setNewTargetDex(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Borrow Asset</label>
                    <input
                      type="text"
                      required
                      placeholder="WETH"
                      value={newBorrowAsset}
                      onChange={(e) => setNewBorrowAsset(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Loan Amount ($)</label>
                    <input
                      type="text"
                      required
                      value={newLoanAmount}
                      onChange={(e) => setNewLoanAmount(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Gross Profit ($)</label>
                    <input
                      type="text"
                      required
                      value={newGrossProfit}
                      onChange={(e) => setNewGrossProfit(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Gas Fee ($)</label>
                    <input
                      type="text"
                      required
                      value={newGasFee}
                      onChange={(e) => setNewGasFee(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Risk Profile</label>
                    <select
                      value={newRisk}
                      onChange={(e) =>
                        setNewRisk(e.target.value as 'low' | 'moderate' | 'high' | 'extreme')
                      }
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 bg-white"
                    >
                      <option value="low">Low</option>
                      <option value="moderate">Moderate</option>
                      <option value="high">High</option>
                      <option value="extreme">Extreme</option>
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold py-3 rounded-xl shadow-md transition-colors text-sm"
                >
                  Register Simulation Radar Node
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
