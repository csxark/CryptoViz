'use client';

import React from 'react';
import { BridgeRoute } from '@/lib/mock/gasData';
import { ShieldAlert, ShieldCheck, Clock, Zap } from 'lucide-react';
import clsx from 'clsx';

interface BridgeMatrixTableProps {
    routes: BridgeRoute[];
}

export const BridgeMatrixTable: React.FC<BridgeMatrixTableProps> = ({ routes }) => {
    if (routes.length === 0) {
        return (
            <div className="w-full h-80 flex items-center justify-center bg-slate-900/40 rounded-3xl border border-white/5">
                <p className="text-slate-500">No optimized paths found matching criteria</p>
            </div>
        );
    }

    const getSecurityIcon = (rating: string) => {
        switch (rating) {
            case 'High': return <ShieldCheck size={14} className="text-emerald-500" />;
            case 'Medium': return <Zap size={14} className="text-amber-500" />;
            case 'Low': return <ShieldAlert size={14} className="text-rose-500" />;
        }
    };

    return (
        <div className="w-full bg-slate-900/60 backdrop-blur-xl border border-white/5 rounded-3xl overflow-hidden shadow-2xl h-[500px] flex flex-col">
            <div className="p-6 border-b border-white/5 bg-slate-950/40 shrink-0">
                <h3 className="text-xl font-black text-white font-mono flex items-center gap-2">
                    Interoperability Aggregator Matrix
                </h3>
            </div>

            <div className="overflow-y-auto flex-1 custom-scrollbar p-2">
                <table className="w-full text-left text-sm text-slate-300">
                    <thead className="text-xs uppercase text-slate-500 font-mono sticky top-0 bg-slate-900/95 backdrop-blur-md z-10">
                        <tr>
                            <th className="px-4 py-3">Vector Space</th>
                            <th className="px-4 py-3">Router Hub</th>
                            <th className="px-4 py-3 text-center">Security Rating</th>
                            <th className="px-4 py-3 text-right">Est. Conclude</th>
                            <th className="px-4 py-3 text-right">Agg. Cost (USD)</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {routes.map(r => (
                            <tr
                                key={r.id}
                                className="transition-colors hover:bg-white/[0.02]"
                            >
                                <td className="px-4 py-3 font-mono">
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-slate-300">{r.sourceChain}</span>
                                        <span className="text-slate-500">→</span>
                                        <span className="font-bold text-blue-400">{r.targetChain}</span>
                                    </div>
                                </td>
                                <td className="px-4 py-3 font-bold text-xs uppercase tracking-widest text-[#a855f7]">
                                    {r.bridgeName}
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex justify-center items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-950 border border-white/5 text-[10px] uppercase font-bold tracking-widest">
                                        {getSecurityIcon(r.securityRating)}
                                        <span className={clsx(
                                            r.securityRating === 'High' && 'text-emerald-500',
                                            r.securityRating === 'Medium' && 'text-amber-500',
                                            r.securityRating === 'Low' && 'text-rose-500'
                                        )}>
                                            {r.securityRating}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-4 py-3 text-right font-mono text-slate-400">
                                    <div className="flex items-center justify-end gap-1">
                                        <Clock size={12} className="text-slate-500" />
                                        ~{r.estimatedTimeMin} min
                                    </div>
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <span className="font-black text-rose-400 font-mono">
                                        ${r.feeUSD.toFixed(2)}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
