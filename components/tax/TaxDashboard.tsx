'use client';

import React from 'react';
import { useTaxAuditor } from '@/hooks/useTaxAuditor';
import { mockTaxLedger } from '@/lib/mock/taxData';
import { TaxCharts } from './TaxCharts';
import { TransactionTable } from './TransactionTable';
import { ShieldAlert, TrendingDown, TrendingUp, AlertTriangle, Wallet } from 'lucide-react';
import clsx from 'clsx';

export const TaxDashboard = () => {
    const {
        filteredLedger,
        capitalGains,
        stats,
        yearFilter,
        setYearFilter,
        assetFilter,
        setAssetFilter,
        availableAssets
    } = useTaxAuditor(mockTaxLedger);

    return (
        <div className="w-full max-w-7xl mx-auto py-8">
            <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-white/5 pb-8">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-br from-rose-400 to-orange-500">
                            DeFi Tax Engine <sup className="text-sm bg-rose-500/20 text-rose-400 px-2 py-0.5 rounded-full uppercase tracking-widest font-bold">Audit</sup>
                        </h1>
                    </div>
                    <p className="text-slate-400 max-w-2xl">
                        Automatically track taxable events across wallets. Calculates FIFO-based capital gains, tracks income from airdrops, and estimates year-end liability.
                    </p>
                </div>

                <div className="flex items-center gap-4 bg-slate-900/50 p-2 rounded-2xl border border-white/5 shadow-inner">
                    <select
                        value={yearFilter}
                        onChange={(e) => setYearFilter(e.target.value)}
                        className="bg-slate-800 text-white border-none rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-rose-500 text-sm font-bold"
                    >
                        <option value="ALL">All Years</option>
                        <option value="2023">2023</option>
                        <option value="2022">2022</option>
                    </select>

                    <select
                        value={assetFilter}
                        onChange={(e) => setAssetFilter(e.target.value)}
                        className="bg-slate-800 text-white border-none rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-rose-500 text-sm font-bold min-w-[120px]"
                    >
                        <option value="ALL">All Assets</option>
                        {availableAssets.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {[
                    { title: 'Taxable Events', val: stats.totalTaxableEvents, icon: AlertTriangle, color: 'amber' },
                    { title: 'Net Capital Gains', val: `$${stats.netCapitalGains.toFixed(2)}`, icon: stats.netCapitalGains >= 0 ? TrendingUp : TrendingDown, color: stats.netCapitalGains >= 0 ? 'emerald' : 'rose' },
                    { title: 'Staking/Airdrop Income', val: `$${stats.incomeFromStaking.toFixed(2)}`, icon: Wallet, color: 'blue' },
                    { title: 'Gas Fees & Costs (Deductible)', val: `$${(stats.totalFeesPaid * 2000).toFixed(2)}`, icon: ShieldAlert, color: 'purple' } // mock assuming fee in ETH at $2k
                ].map((kpi, i) => {
                    const Icon = kpi.icon;
                    return (
                        <div key={i} className={clsx(
                            "p-6 rounded-3xl border border-white/5 backdrop-blur-md shadow-2xl relative overflow-hidden group",
                            `bg-${kpi.color}-500/5 hover:bg-${kpi.color}-500/10 transition-colors`
                        )}>
                            <div className={`absolute -right-6 -top-6 w-24 h-24 bg-${kpi.color}-500/20 rounded-full blur-[30px] group-hover:scale-150 transition-transform`}></div>
                            <div className="relative z-10">
                                <Icon size={24} className={`text-${kpi.color}-400 mb-4`} />
                                <h4 className={`text-3xl font-black text-white`}>{kpi.val}</h4>
                                <p className="text-sm font-medium text-slate-400 mt-2">{kpi.title}</p>
                            </div>
                        </div>
                    )
                })}
            </div>

            <TaxCharts stats={stats} capitalGains={capitalGains} />

            <TransactionTable ledger={filteredLedger} />
        </div>
    );
};
