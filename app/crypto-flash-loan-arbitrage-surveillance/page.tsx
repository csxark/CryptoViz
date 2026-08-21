'use client';

import React, { useState, useEffect } from 'react';
import { FlashLoanArbitrageSurveillanceServiceHandler } from '../../lib/CryptoFlashLoanArbitrageService';
import {
  FlashLoanArbitrageSurveillanceOpportunity,
  FlashLoanArbitrageAuditRecord,
  ArbitrageSurveillanceFilterOptions,
  FlashLoanProtocol,
} from '../../lib/CryptoFlashLoanArbitrageModel';
import { CryptoFlashLoanArbitrageCard } from '../../components/arbitrage/CryptoFlashLoanArbitrageCard';
import { CryptoFlashLoanArbitrageTimeline } from '../../components/arbitrage/CryptoFlashLoanArbitrageTimeline';
import {
  Zap,
  Search,
  Filter,
  PlusCircle,
  ShieldCheck,
  Activity,
  X,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

export default function CryptoFlashLoanArbitrageSurveillancePage() {
  const [opportunities, setOpportunities] = useState<FlashLoanArbitrageSurveillanceOpportunity[]>([]);
  const [records, setRecords] = useState<FlashLoanArbitrageAuditRecord[]>([]);

  const [filters, setFilters] = useState<ArbitrageSurveillanceFilterOptions>({
    borrowAsset: 'All',
    executionRisk: 'All',
    flashLoanProtocol: 'All',
    statusFilter: 'All',
    searchQuery: '',
  });

  const [selectedOpportunity, setSelectedOpportunity] = useState<FlashLoanArbitrageSurveillanceOpportunity | null>(null);
  const [simulationResult, setSimulationResult] = useState<FlashLoanArbitrageAuditRecord | null>(null);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);

  // Custom simulation input parameters
  const [customTradeAmount, setCustomTradeAmount] = useState<string>('');
  const [customMaxSlippage, setCustomMaxSlippage] = useState<string>('1.5');
  const [customMaxGas, setCustomMaxGas] = useState<string>('1500');
  const [customMinProfit, setCustomMinProfit] = useState<string>('1000');

  // Register Modal State
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [newPair, setNewPair] = useState<string>('WETH / DAI');
  const [newProtocol, setNewProtocol] = useState<FlashLoanProtocol>('Aave V3');
  const [newSourceDex, setNewSourceDex] = useState<string>('Uniswap V3');
  const [newTargetDex, setNewTargetDex] = useState<string>('Sushiswap');
  const [newBorrowAsset, setNewBorrowAsset] = useState<string>('WETH');
  const [newLoanAmount, setNewLoanAmount] = useState<string>('500000');
  const [newGrossProfit, setNewGrossProfit] = useState<string>('5000');
  const [newGasFee, setNewGasFee] = useState<string>('600');
  const [newFlashFee, setNewFlashFee] = useState<string>('250');
  const [newMaxSlippage, setNewMaxSlippage] = useState<string>('1.2');
  const [newLiquidity, setNewLiquidity] = useState<string>('1500000');
  const [newRisk, setNewRisk] = useState<'low' | 'moderate' | 'high' | 'extreme'>('low');

  useEffect(() => {
    setOpportunities(FlashLoanArbitrageSurveillanceServiceHandler.fetchOpportunities(filters));
    setRecords(FlashLoanArbitrageSurveillanceServiceHandler.fetchAuditRecords());
  }, []);

  const applyFilterChanges = (updatedFilters: Partial<ArbitrageSurveillanceFilterOptions>) => {
    const nextFilters = { ...filters, ...updatedFilters };
    setFilters(nextFilters);
    setOpportunities(FlashLoanArbitrageSurveillanceServiceHandler.fetchOpportunities(nextFilters));
  };

  const handleSelectOpportunity = (opp: FlashLoanArbitrageSurveillanceOpportunity) => {
    setSelectedOpportunity(opp);
    setCustomTradeAmount(opp.borrowAmountUsd.toString());
    setCustomMaxSlippage(opp.maxAllowedSlippagePercent.toString());
    setCustomMaxGas(opp.maxAllowedGasFeeUsd.toString());
    setCustomMinProfit(opp.minRequiredProfitUsd.toString());
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
      const record = FlashLoanArbitrageSurveillanceServiceHandler.executeArbitrageSimulation(selectedOpportunity.id, {
        tradeAmountUsd: parsedTradeAmount,
        maxAllowedSlippagePercent: parsedMaxSlippage,
        maxAllowedGasFeeUsd: parsedMaxGas,
        minRequiredProfitUsd: parsedMinProfit,
      });

      setSimulationResult(record);
      setOpportunities(FlashLoanArbitrageSurveillanceServiceHandler.fetchOpportunities(filters));
      setRecords(FlashLoanArbitrageSurveillanceServiceHandler.fetchAuditRecords());
      setIsSimulating(false);
    }, 600);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const loanAmount = parseFloat(newLoanAmount);
    const grossProfit = parseFloat(newGrossProfit);
    const gasFee = parseFloat(newGasFee);
    const flashFee = parseFloat(newFlashFee);
    const maxSlippage = parseFloat(newMaxSlippage);
    const liquidity = parseFloat(newLiquidity);

    if (
      !Number.isFinite(loanAmount) ||
      !Number.isFinite(grossProfit) ||
      !Number.isFinite(gasFee) ||
      !Number.isFinite(flashFee) ||
      !Number.isFinite(maxSlippage) ||
      !Number.isFinite(liquidity)
    ) {
      alert('Please enter valid numerical values for simulation parameters.');
      return;
    }

    const netProfit = grossProfit - gasFee - flashFee;
    const margin = Number(((netProfit / loanAmount) * 100).toFixed(2));

    FlashLoanArbitrageSurveillanceServiceHandler.registerNewOpportunity({
      tokenPair: newPair,
      flashLoanProtocol: newProtocol,
      sourceDex: newSourceDex,
      targetDex: newTargetDex,
      borrowAsset: newBorrowAsset,
      borrowAmountUsd: loanAmount,
      expectedGrossProfitUsd: grossProfit,
      estimatedGasFeeUsd: gasFee,
      estimatedFlashFeeUsd: flashFee,
      routes: [
        { step: 1, dexName: newSourceDex, poolPair: newPair, feeTierPercent: 0.05, expectedSlippagePercent: maxSlippage / 2 },
        { step: 2, dexName: newTargetDex, poolPair: newPair, feeTierPercent: 0.3, expectedSlippagePercent: maxSlippage / 2 },
      ],
      netProfitUsd: netProfit,
      profitMarginPercentage: margin,
      executionRisk: newRisk,
      maxAllowedSlippagePercent: maxSlippage,
      actualSlippagePercent: Number((maxSlippage * 0.4).toFixed(2)),
      availableLiquidityUsd: liquidity,
      maxAllowedGasFeeUsd: gasFee * 1.5,
      minRequiredProfitUsd: 500,
    });

    setOpportunities(FlashLoanArbitrageSurveillanceServiceHandler.fetchOpportunities(filters));
    setShowCreateModal(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-10 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header Hero Section */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950/40 rounded-3xl p-8 sm:p-10 border border-slate-800 shadow-2xl relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 px-3.5 py-1.5 rounded-full text-xs font-bold text-amber-300">
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              Flash Loan Cross-DEX Arbitrage Surveillance Engine
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white">
              Flash Loan Arbitrage Surveillance Suite
            </h1>
            <p className="text-slate-300 text-base sm:text-lg leading-relaxed">
              Monitor multi-hop DEX liquidity discrepancies, evaluate uncollateralized flash loan execution vectors,
              and verify gas-optimized profitability limits in real time.
            </p>
            <div className="pt-2 flex flex-wrap gap-4 items-center">
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black px-6 py-3 rounded-2xl shadow-lg shadow-amber-500/20 transition-all flex items-center gap-2 text-sm"
              >
                <PlusCircle className="w-5 h-5 fill-current" />
                Register Arbitrage Radar Node
              </button>
            </div>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            {/* Search Input */}
            <div className="relative flex-1 w-full">
              <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by token pair, source DEX, or flash loan protocol (e.g. Aave V3, WETH/DAI)..."
                value={filters.searchQuery}
                onChange={(e) => applyFilterChanges({ searchQuery: e.target.value })}
                className="w-full pl-12 pr-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50 text-sm"
              />
            </div>

            {/* Dropdown Filters */}
            <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={filters.borrowAsset}
                onChange={(e) => applyFilterChanges({ borrowAsset: e.target.value })}
                className="px-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-slate-200 text-sm font-semibold focus:outline-none focus:border-amber-500/50"
              >
                <option value="All">All Borrow Assets</option>
                <option value="WETH">WETH</option>
                <option value="USDC">USDC</option>
                <option value="USDT">USDT</option>
                <option value="WBTC">WBTC</option>
              </select>

              <select
                value={filters.flashLoanProtocol}
                onChange={(e) => applyFilterChanges({ flashLoanProtocol: e.target.value })}
                className="px-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-slate-200 text-sm font-semibold focus:outline-none focus:border-amber-500/50"
              >
                <option value="All">All Flash Protocols</option>
                <option value="Aave V3">Aave V3</option>
                <option value="MakerDAO">MakerDAO</option>
                <option value="Euler">Euler</option>
                <option value="Uniswap V3 Flash">Uniswap V3 Flash</option>
              </select>

              <select
                value={filters.executionRisk}
                onChange={(e) => applyFilterChanges({ executionRisk: e.target.value })}
                className="px-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-slate-200 text-sm font-semibold focus:outline-none focus:border-amber-500/50"
              >
                <option value="All">All Risk Profiles</option>
                <option value="low">Low Risk</option>
                <option value="moderate">Moderate Risk</option>
                <option value="high">High Risk</option>
                <option value="extreme">Extreme Risk</option>
              </select>
            </div>
          </div>
        </div>

        {/* Opportunity Surveillance Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-extrabold text-2xl text-white flex items-center gap-2 tracking-tight">
              <Zap className="w-6 h-6 text-amber-400 fill-amber-400" />
              Active Arbitrage Radar Opportunities ({opportunities.length})
            </h2>
          </div>

          {opportunities.length === 0 ? (
            <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-12 text-center">
              <Activity className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <h3 className="text-white font-bold text-lg">No active arbitrage targets found</h3>
              <p className="text-slate-400 text-sm mt-1">Try resetting your filter parameters or search term.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {opportunities.map((opp) => (
                <CryptoFlashLoanArbitrageCard
                  key={opp.id}
                  opportunity={opp}
                  onExecuteClick={handleSelectOpportunity}
                />
              ))}
            </div>
          )}
        </div>

        {/* Audit Timeline */}
        <CryptoFlashLoanArbitrageTimeline records={records} />

        {/* Execution Modal */}
        {selectedOpportunity && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative">
              <button
                onClick={() => setSelectedOpportunity(null)}
                className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-xl bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>

              {simulationResult ? (
                <div className="text-center py-6 space-y-4">
                  {simulationResult.status === 'EXECUTED_SUCCESS' ? (
                    <>
                      <CheckCircle2 className="w-16 h-16 text-emerald-400 mx-auto" />
                      <h3 className="text-2xl font-black text-white">EXECUTED_SUCCESS</h3>
                      <p className="text-sm text-slate-300">
                        Arbitrage simulation succeeded! Net profit: +${simulationResult.netProfitUsd.toLocaleString()} USD.
                      </p>
                      <div className="bg-slate-950 p-3 rounded-2xl font-mono text-xs text-emerald-400 border border-slate-800">
                        Tx Hash: {simulationResult.executionTxHash}
                      </div>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-16 h-16 text-rose-500 mx-auto" />
                      <h3 className="text-2xl font-black text-white">EXECUTED_REVERT</h3>
                      <p className="text-sm text-rose-400 font-semibold">
                        Revert Reason: {simulationResult.failureReason || 'CONSTRAINT_FAILED'}
                      </p>
                      <div className="bg-slate-950 p-3 rounded-2xl font-mono text-xs text-rose-400 border border-slate-800">
                        Tx Hash: {simulationResult.executionTxHash}
                      </div>
                    </>
                  )}
                  <button
                    onClick={() => setSelectedOpportunity(null)}
                    className="w-full bg-slate-800 text-white font-bold py-3 rounded-2xl hover:bg-slate-700 text-sm"
                  >
                    Return to Radar Suite
                  </button>
                </div>
              ) : (
                <form onSubmit={handleRunSimulationSubmit} className="space-y-5">
                  <div>
                    <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                      Flash Loan Engine
                    </span>
                    <h3 className="font-black text-white text-2xl">
                      {selectedOpportunity.tokenPair}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Protocol: {selectedOpportunity.flashLoanProtocol} | Route: {selectedOpportunity.sourceDex} ➔ {selectedOpportunity.targetDex}
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">
                        Flash Loan Borrow Amount ($ USD)
                      </label>
                      <input
                        type="text"
                        value={customTradeAmount}
                        onChange={(e) => setCustomTradeAmount(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-amber-500/50"
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1">Max Slippage %</label>
                        <input
                          type="text"
                          value={customMaxSlippage}
                          onChange={(e) => setCustomMaxSlippage(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1">Max Gas ($)</label>
                        <input
                          type="text"
                          value={customMaxGas}
                          onChange={(e) => setCustomMaxGas(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1">Min Profit ($)</label>
                        <input
                          type="text"
                          value={customMinProfit}
                          onChange={(e) => setCustomMinProfit(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs"
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSimulating}
                    className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold py-3.5 rounded-2xl shadow-lg transition-all text-sm flex items-center justify-center gap-2"
                  >
                    <Zap className="w-4 h-4 fill-slate-950" />
                    {isSimulating ? 'Simulating Flash Loan Arbitrage...' : 'Simulate & Execute Flash Loan'}
                  </button>
                </form>
              )}
            </div>
          </div>
        )}

        {/* Register Node Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative">
              <button
                onClick={() => setShowCreateModal(false)}
                className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-xl bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="mb-6">
                <h3 className="text-2xl font-black text-white">Register Arbitrage Radar Node</h3>
                <p className="text-xs text-slate-400 mt-1">Configure multi-hop route surveillance and flash liquidity thresholds.</p>
              </div>

              <form onSubmit={handleCreateSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Token Pair</label>
                    <input
                      type="text"
                      required
                      value={newPair}
                      onChange={(e) => setNewPair(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Flash Protocol</label>
                    <select
                      value={newProtocol}
                      onChange={(e) => setNewProtocol(e.target.value as FlashLoanProtocol)}
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm"
                    >
                      <option value="Aave V3">Aave V3</option>
                      <option value="MakerDAO">MakerDAO</option>
                      <option value="Euler">Euler</option>
                      <option value="Uniswap V3 Flash">Uniswap V3 Flash</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Source DEX</label>
                    <input
                      type="text"
                      required
                      value={newSourceDex}
                      onChange={(e) => setNewSourceDex(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Target DEX</label>
                    <input
                      type="text"
                      required
                      value={newTargetDex}
                      onChange={(e) => setNewTargetDex(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Borrow Asset</label>
                    <input
                      type="text"
                      required
                      value={newBorrowAsset}
                      onChange={(e) => setNewBorrowAsset(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Loan Amount ($)</label>
                    <input
                      type="text"
                      required
                      value={newLoanAmount}
                      onChange={(e) => setNewLoanAmount(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Gross Profit ($)</label>
                    <input
                      type="text"
                      required
                      value={newGrossProfit}
                      onChange={(e) => setNewGrossProfit(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Gas Fee ($)</label>
                    <input
                      type="text"
                      required
                      value={newGasFee}
                      onChange={(e) => setNewGasFee(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Risk Profile</label>
                    <select
                      value={newRisk}
                      onChange={(e) => setNewRisk(e.target.value as 'low' | 'moderate' | 'high' | 'extreme')}
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm"
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
                  className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black py-3.5 rounded-2xl shadow-lg transition-colors text-sm"
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
