'use client';

import React from 'react';
import { LiquidityPool } from '@/lib/mock/yieldData';
import { ShieldCheck, Target, Zap, AlertTriangle } from 'lucide-react';

interface StrategyTableProps {
    pools: LiquidityPool[];
    onSelectPool: (id: string) => void;
    selectedId: string;
}

export const StrategyTable: React.FC<StrategyTableProps> = ({ pools, onSelectPool, selectedId }) => {
    const getRiskIcon = (rating: string) => {
        switch (rating) {
            case 'Low': return <ShieldCheck size={16} className="text-emerald-500" />;
            case 'Medium': return <Target size={16} className="text-blue-500" />;
            case 'High': return <Zap size={16} className="text-amber-500" />;
            case 'Degen': return <AlertTriangle size={16} className="text-rose-500" />;
        }
    };

    const getRiskColor = (rating: string) => {
        switch (rating) {
            case 'Low': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
            case 'Medium': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
            case 'High': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
            case 'Degen': return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
        }
    };

    return (
        <div className="w-full bg-slate-900/60 backdrop-blur-xl border border-white/5 rounded-3xl overflow-hidden shadow-2xl h-[500px] flex flex-col">
            <div className="p-6 border-b border-white/5 bg-slate-950/40 shrink-0">
                <h3 className="text-xl font-black text-white font-mono">Available Liquidity Vaults</h3>
            </div>

            <div className="overflow-y-auto flex-1 custom-scrollbar p-2">
                <table className="w-full text-left text-sm text-slate-300">
                    <thead className="text-xs uppercase text-slate-500 font-mono sticky top-0 bg-slate-900/95 backdrop-blur-md z-10">
                        <tr>
                            <th className="px-4 py-3">Pool / Protocol</th>
                            <th className="px-4 py-3">Type</th>
                            <th className="px-4 py-3 text-right">TVL</th>
                            <th className="px-4 py-3 text-right">Total APY</th>
                            <th className="px-4 py-3 text-center">Risk</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {pools.map(pool => (
                            <tr
                                key={pool.id}
                                onClick={() => onSelectPool(pool.id)}
                                className={`transition-colors cursor-pointer group ${selectedId === pool.id ? 'bg-blue-500/10' : 'hover:bg-white/[0.02]'}`}
                            >
                                <td className="px-4 py-3 font-mono">
                                    <div className="flex items-center gap-3">
                                        <div className="font-bold text-white">{pool.pair}</div>
                                        <div className="text-[10px] text-slate-500 bg-slate-800 px-2 py-0.5 rounded">{pool.protocol}</div>
                                    </div>
                                </td>
                                <td className="px-4 py-3 text-slate-400 text-xs">
                                    {pool.type}
                                </td>
                                <td className="px-4 py-3 text-right text-slate-300 font-medium">
                                    ${(pool.tvl / 1e6).toFixed(1)}M
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <span className="font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-lg">
                                        {pool.totalApy.toFixed(2)}%
                                    </span>
                                </td>
                                <td className="px-4 py-3">
                                    <div className={`flex items-center justify-center gap-1.5 px-2 py-1 rounded-lg border text-xs font-bold uppercase ${getRiskColor(pool.riskRating)}`}>
                                        {getRiskIcon(pool.riskRating)}
                                        {pool.riskRating}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
