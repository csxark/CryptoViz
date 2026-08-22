'use client';

import React from 'react';
import { ProtocolData } from '@/lib/mock/screenerData';
import { SortDirection, SortField } from '@/hooks/useScreenerAnalytics';
import { ChevronUp, ChevronDown, CheckCircle2, AlertTriangle, XCircle, ShieldAlert } from 'lucide-react';

interface AssetDataTableProps {
    data: ProtocolData[];
    sortField: SortField;
    sortDirection: SortDirection;
    onSort: (field: SortField) => void;
}

const Sparkline = ({ data }: { data: number[] }) => {
    if (!data || data.length === 0) return null;
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1; // prevent divide by zero

    const width = 100;
    const height = 30;

    const points = data.map((val, i) => {
        const x = (i / (data.length - 1)) * width;
        const y = height - ((val - min) / range) * height;
        return `${x},${y}`;
    }).join(' ');

    const isPositive = data[data.length - 1] >= data[0];
    const strokeColor = isPositive ? '#10b981' : '#ef4444'; // emerald-500 or red-500

    return (
        <svg width={width} height={height} className="overflow-visible">
            <polyline
                fill="none"
                stroke={strokeColor}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={points}
            />
        </svg>
    );
};

export const AssetDataTable: React.FC<AssetDataTableProps> = ({
    data,
    sortField,
    sortDirection,
    onSort
}) => {
    const formatCurrency = (val: number) => {
        if (val >= 1e9) return `$${(val / 1e9).toFixed(2)}B`;
        if (val >= 1e6) return `$${(val / 1e6).toFixed(2)}M`;
        return `$${val.toFixed(2)}`;
    };

    const SortIcon = ({ field }: { field: SortField }) => {
        if (sortField !== field) return <div className="w-4 h-4 opacity-0 group-hover:opacity-30 transition-opacity"><ChevronDown size={16} /></div>;
        return sortDirection === 'asc' ? <ChevronUp size={16} className="text-blue-400" /> : <ChevronDown size={16} className="text-blue-400" />;
    };

    const headers: { label: string; key: SortField; align?: 'left' | 'right' | 'center' }[] = [
        { label: 'Asset', key: 'name', align: 'left' },
        { label: 'Category', key: 'category', align: 'left' },
        { label: 'TVL', key: 'tvl', align: 'right' },
        { label: 'Yield (APY)', key: 'yieldPercentage', align: 'right' },
        { label: 'Sentiment', key: 'sentimentScore', align: 'center' },
        { label: 'Risk & Audit', key: 'riskLevel', align: 'center' },
        { label: '7D Trend', key: null, align: 'center' } // non-sortable
    ];

    return (
        <div className="w-full bg-slate-900/40 backdrop-blur-md rounded-3xl border border-white/5 border-t-white/10 shadow-2xl overflow-hidden mt-6">
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs uppercase bg-slate-950/50 text-slate-400 border-b border-white/5">
                        <tr>
                            {headers.map((header, idx) => (
                                <th
                                    key={idx}
                                    className={`px-6 py-4 font-semibold tracking-wider ${header.key ? 'cursor-pointer group hover:bg-white/5 transition-colors' : ''} ${header.align === 'right' ? 'text-right' : header.align === 'center' ? 'text-center' : 'text-left'
                                        }`}
                                    onClick={() => header.key && onSort(header.key)}
                                >
                                    <div className={`flex items-center gap-1 ${header.align === 'right' ? 'justify-end' : header.align === 'center' ? 'justify-center' : 'justify-start'
                                        }`}>
                                        {header.label}
                                        {header.key && <SortIcon field={header.key} />}
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {data.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                                    No protocols match the current filters.
                                </td>
                            </tr>
                        ) : (
                            data.map((protocol) => (
                                <tr key={protocol.id} className="hover:bg-white/[0.02] transition-colors group">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-600/20 flex items-center justify-center border border-white/10 group-hover:border-blue-500/50 transition-colors">
                                                <span className="font-bold text-white text-xs">{protocol.symbol.substring(0, 2)}</span>
                                            </div>
                                            <div>
                                                <div className="font-bold text-slate-100">{protocol.name}</div>
                                                <div className="text-xs text-slate-500">{protocol.symbol}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="px-2.5 py-1 text-xs rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                                            {protocol.category}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right font-medium text-slate-200">
                                        {formatCurrency(protocol.tvl)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-emerald-400 font-semibold bg-emerald-400/5">
                                        {protocol.yieldPercentage.toFixed(2)}%
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                        <div className="flex flex-col items-center">
                                            <div className="w-full bg-slate-800 rounded-full h-2 mb-1 overflow-hidden mt-1 max-w-[80px]">
                                                <div
                                                    className="bg-gradient-to-r from-red-500 via-amber-400 to-emerald-500 h-2 rounded-full"
                                                    style={{ width: `${protocol.sentimentScore}%` }}
                                                ></div>
                                            </div>
                                            <span className="text-xs text-slate-400">{protocol.sentimentScore}/100</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                        <div className="flex items-center justify-center gap-2">
                                            {protocol.auditStatus === 'Audited' ? <CheckCircle2 className="text-emerald-500" size={16} />
                                                : protocol.auditStatus === 'Partial' ? <AlertTriangle className="text-amber-500" size={16} />
                                                    : <XCircle className="text-slate-500" size={16} />}
                                            <span className={`text-xs font-semibold px-2 py-0.5 rounded ${protocol.riskLevel === 'Low' ? 'bg-emerald-500/10 text-emerald-400'
                                                    : protocol.riskLevel === 'Medium' ? 'bg-blue-500/10 text-blue-400'
                                                        : protocol.riskLevel === 'High' ? 'bg-amber-500/10 text-amber-400'
                                                            : 'bg-red-500/10 text-red-500'
                                                }`}>
                                                {protocol.riskLevel}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex justify-center">
                                            <Sparkline data={protocol.sparkline} />
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
            <div className="px-6 py-4 border-t border-white/5 bg-slate-950/30 text-xs text-slate-500 flex justify-between items-center">
                <span>Showing {data.length} protocols</span>
                <span>Data is simulated for demonstration</span>
            </div>
        </div>
    );
};
