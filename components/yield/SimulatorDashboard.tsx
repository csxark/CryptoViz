'use client';

import React from 'react';
import { useYieldSimulator } from '@/hooks/useYieldSimulator';
import { mockPools } from '@/lib/mock/yieldData';
import { ImpermanentLossChart } from './ImpermanentLossChart';
import { StrategyTable } from './StrategyTable';
import { Calculator, TrendingUp, TrendingDown, DollarSign, Activity } from 'lucide-react';
import clsx from 'clsx';

export const SimulatorDashboard = () => {
    const {
        pools,
        selectedPool,
        setSelectedPoolId,
        simState,
        setSimState,
        simulatorResults,
        ilCurveData
    } = useYieldSimulator(mockPools);

    if (!selectedPool || !simulatorResults) return null;

    return (
        <div className="w-full max-w-7xl mx-auto py-8">
            {/* Header */}
            <div className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-white/5 pb-8">
                <div>
                    <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-500 to-blue-600 mb-2">
                        DeFi Yield & LP Simulator
                    </h1>
                    <p className="text-slate-400 max-w-2xl">
                        Model impermanent loss, auto-compounded yields, and overall ROI across multiple liquidity pools. Adjust parameters to stress-test your LP position.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 mb-8">
                {/* Left Column: Table & Config */}
                <div className="xl:col-span-7 flex flex-col gap-8">

                    <StrategyTable
                        pools={pools}
                        selectedId={selectedPool.id}
                        onSelectPool={setSelectedPoolId}
                    />

                    {/* Simulator Inputs */}
                    <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-white/5 p-6 rounded-3xl shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/10 rounded-full blur-[50px] pointer-events-none" />
                        <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                            <Calculator className="text-blue-400" /> Stress Test Module: <span className="text-emerald-400">{selectedPool.pair}</span>
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Initial Deposit (USD)</label>
                                <div className="relative">
                                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                                    <input
                                        type="number"
                                        value={simState.initialInvestment}
                                        onChange={(e) => setSimState(s => ({ ...s, initialInvestment: Number(e.target.value) }))}
                                        className="w-full bg-slate-950/50 border border-white/10 text-white rounded-xl pl-9 pr-4 py-3 focus:ring-2 focus:ring-emerald-500 text-lg font-bold shadow-inner"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Staking Duration (Days)</label>
                                <input
                                    type="number"
                                    value={simState.daysStaked}
                                    onChange={(e) => setSimState(s => ({ ...s, daysStaked: Number(e.target.value) }))}
                                    className="w-full bg-slate-950/50 border border-white/10 text-white rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 text-lg font-bold shadow-inner"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{selectedPool.token0} Price Change (%)</label>
                                <input
                                    type="number"
                                    value={simState.token0PriceChangePct}
                                    onChange={(e) => setSimState(s => ({ ...s, token0PriceChangePct: Number(e.target.value) }))}
                                    className="w-full bg-slate-950/50 border border-white/10 text-white rounded-xl px-4 py-3 focus:ring-2 focus:ring-teal-500 text-lg font-bold shadow-inner"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{selectedPool.token1} Price Change (%)</label>
                                <input
                                    type="number"
                                    value={simState.token1PriceChangePct}
                                    onChange={(e) => setSimState(s => ({ ...s, token1PriceChangePct: Number(e.target.value) }))}
                                    className="w-full bg-slate-950/50 border border-white/10 text-white rounded-xl px-4 py-3 focus:ring-2 focus:ring-purple-500 text-lg font-bold shadow-inner"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Results & Chart */}
                <div className="xl:col-span-5 flex flex-col gap-8">

                    {/* Results Card */}
                    <div className="bg-slate-900 border border-emerald-500/20 rounded-3xl p-6 shadow-[0_0_40px_rgba(16,185,129,0.05)] relative overflow-hidden">
                        <h3 className="text-xl font-bold text-white mb-6 border-b border-white/5 pb-4">Simulation Results</h3>

                        <div className="space-y-6">
                            <div className="flex justify-between items-end">
                                <div>
                                    <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Impermanent Loss</p>
                                    <p className="text-3xl font-black text-rose-500 mt-1">{simulatorResults.impermanentLossPct.toFixed(2)}%</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm text-slate-400">USD Value</p>
                                    <p className="text-lg font-bold text-rose-400">-${Math.abs(simulatorResults.impermanentLossUSD).toFixed(2)}</p>
                                </div>
                            </div>

                            <div className="w-full h-px bg-white/5"></div>

                            <div className="flex justify-between items-end">
                                <div>
                                    <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Yield Earned</p>
                                    <p className="text-3xl font-black text-emerald-400 mt-1">${simulatorResults.yieldEarned.toFixed(2)}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm text-slate-400">APY / Daily</p>
                                    <p className="text-sm font-bold text-emerald-500">{selectedPool.totalApy}% / {simulatorResults.dailyRate.toFixed(3)}%</p>
                                </div>
                            </div>

                            <div className="w-full h-px bg-white/5"></div>

                            <div className="bg-slate-950/50 rounded-2xl p-6 border border-white/5 mt-4">
                                <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2 text-center">Net Projected Profit</p>
                                <p className={clsx(
                                    "text-5xl font-black text-center",
                                    simulatorResults.netProfit >= 0 ? "text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400" : "text-rose-500"
                                )}>
                                    {simulatorResults.netProfit >= 0 ? '+' : '-'}${Math.abs(simulatorResults.netProfit).toFixed(2)}
                                </p>
                                <div className="flex justify-center mt-3">
                                    <span className={clsx(
                                        "px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1",
                                        simulatorResults.netRoi >= 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-500"
                                    )}>
                                        {simulatorResults.netRoi >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                                        {simulatorResults.netRoi.toFixed(2)}% ROI
                                    </span>
                                </div>
                            </div>

                        </div>
                    </div>

                    <ImpermanentLossChart data={ilCurveData} />

                </div>
            </div>
        </div>
    );
};
