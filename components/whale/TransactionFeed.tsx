'use client';

import React from 'react';
import { WhaleTransaction } from '@/lib/mock/whaleData';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowDownRight, ArrowUpRight, Repeat, Cpu, AlertTriangle, ShieldCheck } from 'lucide-react';
import clsx from 'clsx';

interface TransactionFeedProps {
    feed: WhaleTransaction[];
}

export const TransactionFeed: React.FC<TransactionFeedProps> = ({ feed }) => {
    const formatCurrency = (val: number) => {
        if (val >= 1e9) return `$${(val / 1e9).toFixed(2)}B`;
        if (val >= 1e6) return `$${(val / 1e6).toFixed(2)}M`;
        return `$${val.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
    };

    // Take top 50 to avoid rendering 1000s in animation container
    const displayFeed = feed.slice(0, 50);

    const getFlowUI = (tx: WhaleTransaction) => {
        switch (tx.direction) {
            case 'INFLOW': return { icon: ArrowDownRight, color: 'text-rose-400', label: 'to Exchange' };
            case 'OUTFLOW': return { icon: ArrowUpRight, color: 'text-emerald-400', label: 'from Exchange' };
            case 'BRIDGE': return { icon: Cpu, color: 'text-purple-400', label: 'Bridge' };
            case 'SWAP': return { icon: Repeat, color: 'text-blue-400', label: 'DEX Swap' };
        }
    };

    const getLabelUI = (label?: string) => {
        switch (label) {
            case 'Smart Money': return 'bg-amber-500/10 text-amber-500 border border-amber-500/20';
            case 'Exchange': return 'bg-blue-500/10 text-blue-400 border border-blue-500/20';
            case 'Fund': return 'bg-purple-500/10 text-purple-400 border border-purple-500/20';
            default: return 'bg-slate-800 text-slate-400 border border-slate-700';
        }
    };

    return (
        <div className="w-full bg-slate-900/60 backdrop-blur-xl border border-white/5 rounded-3xl overflow-hidden shadow-2xl flex flex-col h-[600px]">
            <div className="p-6 border-b border-white/5 bg-slate-950/40 shrink-0">
                <h3 className="text-xl font-black text-white font-mono flex items-center gap-2">
                    <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
                    </span>
                    Live Whale Surveillance
                </h3>
                <p className="text-sm text-slate-500 mt-1">Real-time massive transactions detected across networks.</p>
            </div>

            <div className="flex-1 overflow-y-auto w-full p-4 space-y-3 custom-scrollbar">
                <AnimatePresence>
                    {displayFeed.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-slate-500">No transactions match filters.</div>
                    ) : (
                        displayFeed.map((tx) => {
                            const { icon: Icon, color, label } = getFlowUI(tx);
                            const labelClasses = getLabelUI(tx.walletLabel);

                            return (
                                <motion.div
                                    key={tx.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="bg-slate-900 border border-white/5 rounded-2xl p-4 hover:bg-slate-800/80 transition-colors shadow-lg group relative overflow-hidden"
                                >
                                    {tx.amountUSD > 50000000 && (
                                        <div className="absolute inset-0 bg-gradient-to-r from-rose-500/5 to-transparent pointer-events-none" />
                                    )}

                                    <div className="flex items-start justify-between relative z-10">
                                        <div className="flex items-start gap-4">
                                            <div className={clsx("p-3 rounded-2xl shrink-0 border border-white/5", `bg-slate-950/50 ${color}`)}>
                                                <Icon size={20} />
                                            </div>

                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-white font-bold font-mono text-sm group-hover:text-blue-400 transition-colors cursor-pointer">
                                                        {tx.wallet}
                                                    </span>
                                                    <span className={clsx("px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider", labelClasses)}>
                                                        {tx.walletLabel || 'Unknown'}
                                                    </span>
                                                </div>

                                                <div className="flex items-center gap-3 text-xs text-slate-400">
                                                    <span className={clsx("font-bold", color)}>{tx.direction} {label}</span>
                                                    {tx.destination && <span>→ <span className="text-slate-300 font-medium">{tx.destination}</span></span>}
                                                    <span>{new Date(tx.timestamp).toLocaleString()}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="text-right">
                                            <div className="text-lg font-black text-white">{formatCurrency(tx.amountUSD)}</div>
                                            <div className="text-xs text-slate-400 font-bold mb-1">{tx.asset}</div>

                                            {tx.riskScore > 85 ? (
                                                <div className="flex items-center justify-end gap-1 text-[10px] text-rose-500 uppercase font-bold">
                                                    <AlertTriangle size={12} /> High Risk ({tx.riskScore})
                                                </div>
                                            ) : (
                                                <div className="flex items-center justify-end gap-1 text-[10px] text-emerald-500 uppercase font-bold">
                                                    <ShieldCheck size={12} /> Clear ({tx.riskScore})
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })
                    )}
                </AnimatePresence>
            </div>

        </div>
    );
};
