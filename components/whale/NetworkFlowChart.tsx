'use client';

import React from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
    Cell
} from 'recharts';

interface NetworkFlowChartProps {
    assetFlowData: { asset: string, inflow: number, outflow: number }[];
}

export const NetworkFlowChart: React.FC<NetworkFlowChartProps> = ({ assetFlowData }) => {
    const formatCurrency = (val: number) => {
        if (val >= 1e9) return `$${(val / 1e9).toFixed(2)}B`;
        if (val >= 1e6) return `$${(val / 1e6).toFixed(2)}M`;
        return `$${val.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
    };

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-slate-900 border border-slate-700 p-3 rounded-lg shadow-xl backdrop-blur-md">
                    <p className="text-white font-bold mb-2">{label}</p>
                    {payload.map((p: any, i: number) => (
                        <p key={i} className={`text-sm ${p.name === 'inflow' ? 'text-blue-400' : 'text-purple-400'}`}>
                            {p.name.toUpperCase()}: <span className="font-bold">{formatCurrency(p.value)}</span>
                        </p>
                    ))}
                </div>
            );
        }
        return null;
    };

    if (assetFlowData.length === 0) {
        return (
            <div className="w-full h-80 flex items-center justify-center bg-slate-900/40 rounded-3xl border border-white/5">
                <p className="text-slate-500">Insufficient flow data for criteria</p>
            </div>
        );
    }

    return (
        <div className="w-full h-[400px] bg-slate-900/40 backdrop-blur-xl border border-white/5 shadow-2xl rounded-3xl p-6 relative overflow-hidden">
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-blue-500/10 rounded-full blur-[60px]" />

            <h3 className="text-lg font-bold text-white mb-6 relative z-10 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,1)]"></span>
                Exchange Asset Flow Profile
            </h3>

            <ResponsiveContainer width="100%" height="90%" className="relative z-10">
                <BarChart layout="vertical" data={assetFlowData} margin={{ top: 0, right: 30, left: 20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={true} vertical={false} />
                    <XAxis type="number" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} tickFormatter={formatCurrency} />
                    <YAxis dataKey="asset" type="category" stroke="#94a3b8" tick={{ fill: '#e2e8f0', fontWeight: 'bold' }} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                    <Legend />
                    <Bar dataKey="inflow" name="Exchange Inflow (Sell Pressure)" stackId="a" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={24} />
                    <Bar dataKey="outflow" name="Exchange Outflow (Buy Pressure)" stackId="a" fill="#a855f7" radius={[0, 4, 4, 0]} barSize={24} />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};
