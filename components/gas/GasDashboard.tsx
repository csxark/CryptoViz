'use client';

import React from 'react';
import { useGasOptimizer } from '@/hooks/useGasOptimizer';
import { staticGasNetworks, staticBridgeMatrix } from '@/lib/mock/gasData';
import { GasHeatmapChart } from './GasHeatmapChart';
import { BridgeMatrixTable } from './BridgeMatrixTable';
import { Network, Zap, CheckCircle, Navigation, ArrowRightLeft } from 'lucide-react';
import clsx from 'clsx';

export const GasDashboard = () => {
    const {
        networks,
        routes,
        stats,
        historicalGas,
        sourceFilter,
        setSourceFilter,
        targetFilter,
        setTargetFilter,
        maxFee,
        setMaxFee,
        availableChains
    } = useGasOptimizer(staticGasNetworks, staticBridgeMatrix);

    return (
        <div className="w-full max-w-7xl mx-auto py-8">
            {/* Header */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 mb-10 pb-8 border-b border-white/5">
                <div>
                    <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-500 via-purple-500 to-indigo-600 mb-2">
                        Multi-Chain Omniverse Radar
                    </h1>
                    <p className="text-slate-400 max-w-xl">Deep structural analysis of cross-chain throughput, gas economies, and optimal pathway bridging algorithms.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full lg:w-auto">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Origin Chain</label>
                        <select
                            value={sourceFilter}
                            onChange={(e) => setSourceFilter(e.target.value)}
                            className="w-full bg-slate-900/60 border border-white/10 text-white rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-fuchsia-500 text-sm font-bold shadow-inner"
                        >
                            <option value="ALL">Any Source</option>
                            {availableChains.map(c => <option key={`src-${c}`} value={c}>{c}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Target Canvas</label>
                        <select
                            value={targetFilter}
                            onChange={(e) => setTargetFilter(e.target.value)}
                            className="w-full bg-slate-900/60 border border-white/10 text-white rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-purple-500 text-sm font-bold shadow-inner"
                        >
                            <option value="ALL">Any Canvas</option>
                            {availableChains.map(c => <option key={`tgt-${c}`} value={c}>{c}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 text-rose-400">Tolerance Ceiling</label>
                        <div className="flex items-center gap-2">
                            <input
                                type="range"
                                min="1" max="100"
                                value={maxFee}
                                onChange={(e) => setMaxFee(Number(e.target.value))}
                                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                            />
                            <span className="text-white font-bold font-mono text-sm shrink-0 w-12">${maxFee}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* KPI Overviews */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {[
                    { title: 'Optimized Routing', val: stats.bestRoute ? `$${stats.bestRoute.feeUSD}` : 'N/A', icon: Navigation, color: 'fuchsia', sub: stats.bestRoute ? `Via ${stats.bestRoute.bridgeName}` : 'Select direct path' },
                    { title: 'L1 Base Baseline', val: `$${stats.l1AvgSwap.toFixed(2)}`, icon: Network, color: 'rose', sub: 'Average VM Swap' },
                    { title: 'Rollup Efficiency', val: `$${stats.l2AvgSwap.toFixed(3)}`, icon: Zap, color: 'indigo', sub: 'Average VM Swap' },
                    { title: 'Optimal Canvas', val: stats.cheapestNetwork, icon: CheckCircle, color: 'emerald', sub: 'Lowest global swap fee' }
                ].map((kpi, i) => {
                    const Icon = kpi.icon;
                    return (
                        <div key={i} className={clsx(
                            "p-6 rounded-3xl border border-white/5 backdrop-blur-xl shadow-2xl relative overflow-hidden group transition-all",
                            `bg-${kpi.color}-500/5 hover:bg-${kpi.color}-500/10 hover:-translate-y-1`
                        )}>
                            <div className={`absolute -right-10 -top-10 w-28 h-28 bg-${kpi.color}-500/20 rounded-full blur-[40px] group-hover:bg-${kpi.color}-500/30 transition-colors`}></div>
                            <div className="relative z-10">
                                <div className={`p-2.5 rounded-xl bg-${kpi.color}-500/10 text-${kpi.color}-400 inline-block mb-3 border border-${kpi.color}-500/20`}>
                                    <Icon size={20} />
                                </div>
                                <h4 className="text-3xl font-black text-white">{kpi.val}</h4>
                                <p className="text-sm font-bold text-slate-400 mt-2 tracking-wide uppercase">{kpi.title}</p>
                                <div className="w-full h-px bg-white/10 my-3"></div>
                                <p className={`text-xs font-bold text-${kpi.color}-500/80`}>{kpi.sub}</p>
                            </div>
                        </div>
                    )
                })}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-8">
                <GasHeatmapChart data={historicalGas} chains={availableChains} />
                <BridgeMatrixTable routes={routes} />
            </div>

            {/* Network Cost Ledger */}
            <div className="w-full bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
                <div className="p-6 border-b border-white/5 bg-slate-950/40 flex items-center justify-between">
                    <h3 className="text-lg font-black text-white font-mono flex items-center gap-2">
                        <ArrowRightLeft className="text-blue-500" /> Chain Baseline Cost Metrics
                    </h3>
                    <span className="text-xs text-slate-500 uppercase tracking-widest font-bold hidden md:block">Real-time GWEI indexing</span>
                </div>
                <div className="overflow-x-auto grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8 divide-x divide-y divide-white/5">
                    {networks.map(n => (
                        <div key={n.id} className="p-4 hover:bg-white/[0.02] transition-colors relative group">
                            <div className="text-xs text-slate-500 font-bold uppercase mb-1">{n.name}</div>
                            <div className="text-xl font-black text-white mb-2">{n.currentGasGwei} <span className="text-[10px] text-slate-600">GWEI</span></div>
                            <div className="text-xs font-medium text-slate-400 flex justify-between">Swap <span>${n.swapCostUSD}</span></div>
                            <div className="text-xs font-medium text-slate-400 flex justify-between">Transfer <span>${n.transferCostUSD}</span></div>
                            {n.type === 'L1' && <div className="absolute top-0 right-0 w-8 h-8 bg-rose-500/10 blur-[10px] rounded-full pointer-events-none" />}
                        </div>
                    ))}
                </div>
            </div>

        </div>
    );
};
