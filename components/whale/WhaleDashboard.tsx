'use client';

import React from 'react';
import { useSmartMoney } from '@/hooks/useSmartMoney';
import { mockWhaleTransactions } from '@/lib/mock/whaleData';
import { NetworkFlowChart } from './NetworkFlowChart';
import { TransactionFeed } from './TransactionFeed';
import { Activity, Zap, ShieldAlert, ArrowDownRight, ArrowUpRight } from 'lucide-react';
import clsx from 'clsx';

export const WhaleDashboard = () => {
    const {
        filteredFeed,
        stats,
        assetFlowData,
        minVolumeUSD,
        setMinVolumeUSD,
        assetFilter,
        setAssetFilter,
        labelFilter,
        setLabelFilter,
        availableAssets
    } = useSmartMoney(mockWhaleTransactions);

    const formatCurrency = (val: number) => {
        if (Math.abs(val) >= 1e9) return `$${(Math.abs(val) / 1e9).toFixed(2)}B`;
        if (Math.abs(val) >= 1e6) return `$${(Math.abs(val) / 1e6).toFixed(2)}M`;
        return `$${Math.abs(val).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
    };

    return (
        <div className="w-full max-w-7xl mx-auto py-8">
            {/* Header and Controls */}
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-6 mb-10 pb-8 border-b border-white/5">
                <div>
                    <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-blue-500 to-purple-600 mb-2">
                        Smart Money & Whale Tracker
                    </h1>
                    <p className="text-slate-400 max-w-xl">Deep surveillance of high-net-worth wallets, institutional exchange flows, and algorithmic risk identification.</p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="col-span-2 md:col-span-1">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Min Value (USD)</label>
                        <select
                            value={minVolumeUSD}
                            onChange={(e) => setMinVolumeUSD(Number(e.target.value))}
                            className="w-full bg-slate-900/60 border border-white/10 text-white rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 text-sm font-bold shadow-inner"
                        >
                            <option value={0}>Any Size</option>
                            <option value={1000000}>$1M+</option>
                            <option value={5000000}>$5M+</option>
                            <option value={10000000}>$10M+</option>
                            <option value={50000000}>$50M+ (Mega)</option>
                        </select>
                    </div>

                    <div className="col-span-2 md:col-span-1">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Target Asset</label>
                        <select
                            value={assetFilter}
                            onChange={(e) => setAssetFilter(e.target.value)}
                            className="w-full bg-slate-900/60 border border-white/10 text-white rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 text-sm font-bold shadow-inner"
                        >
                            <option value="ALL">All Assets</option>
                            {availableAssets.map(a => <option key={a} value={a}>{a}</option>)}
                        </select>
                    </div>

                    <div className="col-span-2 md:col-span-2">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Entity Profile</label>
                        <select
                            value={labelFilter}
                            onChange={(e) => setLabelFilter(e.target.value)}
                            className="w-full bg-slate-900/60 border border-white/10 text-white rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-amber-500 text-sm font-bold shadow-inner"
                        >
                            <option value="ALL">All Entities</option>
                            <option value="Smart Money">Smart Money (High Conviction)</option>
                            <option value="Fund">Institution / Fund</option>
                            <option value="Exchange">Exchange Wallets</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* KPI Overviews */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {[
                    { title: 'Global Tracked Vol', val: formatCurrency(stats.totalVolume), icon: Activity, color: 'blue', sub: `${filteredFeed.length} Transactions` },
                    { title: 'Net Exchange Flow', val: `${stats.netFlow > 0 ? '+' : '-'}${formatCurrency(Math.abs(stats.netFlow))}`, icon: stats.netFlow > 0 ? ArrowDownRight : ArrowUpRight, color: stats.netFlow > 0 ? 'rose' : 'emerald', sub: stats.netFlow > 0 ? 'Net Sell Pressure' : 'Net Buy Pressure' },
                    { title: 'Smart Dominance', val: `${stats.smartMoneyDominance.toFixed(1)}%`, icon: Zap, color: 'amber', sub: 'Of Total Volume' },
                    { title: 'High-Risk Alerts', val: stats.highestRiskAlerts.toString(), icon: ShieldAlert, color: 'purple', sub: 'Suspicious Routing' }
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

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                <NetworkFlowChart assetFlowData={assetFlowData} />
                <TransactionFeed feed={filteredFeed} />
            </div>

        </div>
    );
};
