'use client';

import React, { useState } from 'react';
import { TaxTransaction } from '@/lib/mock/taxData';
import { ArrowDownRight, ArrowUpRight, Droplets, Gift, ArrowRightLeft, Cpu } from 'lucide-react';
import clsx from 'clsx';

interface TransactionTableProps {
    ledger: TaxTransaction[];
}

export const TransactionTable: React.FC<TransactionTableProps> = ({ ledger }) => {
    const [page, setPage] = useState(1);
    const itemsPerPage = 8;
    const totalPages = Math.ceil(ledger.length / itemsPerPage);

    const displayData = ledger.slice((page - 1) * itemsPerPage, page * itemsPerPage);

    const getTxStyles = (type: string) => {
        switch (type) {
            case 'BUY': return { icon: ArrowDownRight, color: 'text-emerald-400', bg: 'bg-emerald-400/10' };
            case 'SELL': return { icon: ArrowUpRight, color: 'text-rose-400', bg: 'bg-rose-400/10' };
            case 'STAKING_REWARD': return { icon: Droplets, color: 'text-blue-400', bg: 'bg-blue-400/10' };
            case 'AIRDROP': return { icon: Gift, color: 'text-purple-400', bg: 'bg-purple-400/10' };
            case 'TRANSFER_IN': return { icon: ArrowRightLeft, color: 'text-slate-300', bg: 'bg-slate-700' };
            case 'TRANSFER_OUT': return { icon: ArrowRightLeft, color: 'text-slate-400', bg: 'bg-slate-800' };
            default: return { icon: Cpu, color: 'text-slate-400', bg: 'bg-slate-800' };
        }
    };

    return (
        <div className="w-full bg-slate-900/60 backdrop-blur-xl border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-white/5 flex justify-between items-center">
                <h3 className="text-xl font-bold text-white font-mono">Ledger History</h3>
                <div className="text-sm text-slate-400 bg-slate-950/50 px-3 py-1 rounded-lg border border-white/5">
                    Taxable Events Marked <span className="text-rose-400 ml-1">●</span>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-300">
                    <thead className="text-xs uppercase bg-slate-950/40 text-slate-500 font-mono">
                        <tr>
                            <th className="px-6 py-4">Transaction hash</th>
                            <th className="px-6 py-4">Date</th>
                            <th className="px-6 py-4">Type</th>
                            <th className="px-6 py-4 text-right">Amount</th>
                            <th className="px-6 py-4 text-right">Price</th>
                            <th className="px-6 py-4 text-right">Fee (ETH)</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {displayData.map(tx => {
                            const { icon: Icon, color, bg } = getTxStyles(tx.type);
                            return (
                                <tr key={tx.id} className="hover:bg-white/[0.02] transition-colors group">
                                    <td className="px-6 py-4 font-mono text-xs">
                                        <div className="flex items-center gap-2">
                                            {tx.isTaxable && <div className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.8)]" title="Taxable Event"></div>}
                                            {!tx.isTaxable && <div className="w-2 h-2 rounded-full bg-transparent"></div>}
                                            <span className="text-blue-400 group-hover:text-blue-300 transition-colors cursor-pointer">{tx.txHash.substring(0, 10)}...</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-slate-400">{new Date(tx.timestamp).toLocaleString()}</td>
                                    <td className="px-6 py-4">
                                        <span className={clsx("px-2.5 py-1 text-xs rounded-lg flex w-fit items-center gap-1.5 font-bold", bg, color)}>
                                            <Icon size={14} />
                                            {tx.type}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <span className="font-bold text-white">{tx.amount}</span> <span className="text-slate-500 text-xs">{tx.asset}</span>
                                    </td>
                                    <td className="px-6 py-4 text-right text-emerald-400 font-medium">
                                        ${tx.priceAtExecution.toFixed(2)}
                                    </td>
                                    <td className="px-6 py-4 text-right text-orange-300/80">
                                        {tx.feeAmount.toFixed(4)}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <div className="px-6 py-4 bg-slate-950/40 border-t border-white/5 flex items-center justify-between">
                <span className="text-sm text-slate-500">Showing page {page} of {totalPages}</span>
                <div className="flex gap-2">
                    <button
                        disabled={page === 1}
                        onClick={() => setPage(p => p - 1)}
                        className="px-4 py-2 text-sm bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-white transition-colors border border-white/5"
                    >
                        Previous
                    </button>
                    <button
                        disabled={page === totalPages}
                        onClick={() => setPage(p => p + 1)}
                        className="px-4 py-2 text-sm bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-white transition-colors border border-white/5"
                    >
                        Next
                    </button>
                </div>
            </div>
        </div>
    );
};
