'use client';

import React from 'react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend
} from 'recharts';

interface GasChartProps {
    data: any[];
    chains: string[];
}

export const GasHeatmapChart: React.FC<GasChartProps> = ({ data, chains }) => {
    const colors = ['#f43f5e', '#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#06b6d4', '#ec4899', '#6366f1'];

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-slate-900 border border-slate-700 p-3 rounded-lg shadow-xl backdrop-blur-md">
                    <p className="text-white font-bold mb-2">Hour: <span className="text-slate-300 font-mono">{label}</span></p>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                        {payload.map((p: any, i: number) => (
                            <p key={i} className="text-xs font-bold font-mono flex items-center justify-between gap-3" style={{ color: p.color }}>
                                <span>{p.name}:</span>
                                <span>{p.value} gwei</span>
                            </p>
                        ))}
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="w-full h-[400px] bg-slate-900/60 backdrop-blur-xl border border-white/5 shadow-2xl rounded-3xl p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-fuchsia-500/10 rounded-full blur-[60px] pointer-events-none" />

            <h3 className="text-lg font-bold text-white mb-6 relative z-10 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-fuchsia-500 shadow-[0_0_10px_rgba(217,70,239,1)]"></span>
                24H Historical Network Congestion (GWEI)
            </h3>

            <ResponsiveContainer width="100%" height="90%" className="relative z-10">
                <LineChart data={data} margin={{ top: 0, right: 30, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={true} horizontal={true} />
                    <XAxis dataKey="hour" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                    <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 10 }} width={30} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: '12px', fontWeight: 'bold', paddingTop: '10px' }} />
                    {chains.map((chain, index) => (
                        <Line
                            key={chain}
                            type="monotone"
                            dataKey={chain}
                            stroke={colors[index % colors.length]}
                            strokeWidth={2}
                            dot={false}
                            activeDot={{ r: 5 }}
                        />
                    ))}
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
};
